"""Fish Audio voiceover + voice cloning. Same outputs as `voice.mjs tts` and `voice_local.py`
(<out>.mp3, <out>.json word timings, <out>.js for a scene's `requires`), so scenes don't care which engine was used.

  research/.venv/bin/python tools/voice_fish.py tts <textFile> <outBase> --voice <modelId> [--speed 1.0] [--model s2.1-pro-free]
  research/.venv/bin/python tools/voice_fish.py clone "<title>" <audio> [<audio> ...] [--clean]
  research/.venv/bin/python tools/voice_fish.py voices                       # your cloned voices (id, title, state)
  research/.venv/bin/python tools/voice_fish.py tts <textFile> <outBase> --refs clip01.mp3 clip08.mp3   # instant clone

- Free tier: API model creation is blocked (HTTP 403 "creation limit 0/0"). Either create the voice in the
  fish.audio web app and pass its id with --voice, or use instant cloning: --refs (or FISH_REFS=path,path in
  .env) sends 1-3 reference clips with each request (msgpack). `clone --keep DIR --dry-run` cuts the clips.

- Key: FISH_API_KEY in ROOT/.env (never printed). Voice id: --voice, else FISH_VOICE_ID in ROOT/.env.
- Fish returns audio only, no timings. The text is split on <break time="Xs" /> tags; each segment is
  synthesised on its own, edge silence is trimmed, the break becomes a real pause, and Whisper word
  timestamps are mapped back onto the script words (same alignment as voice_local.py).
- Segments are cached in out/voice/.fish_cache/ by (text, voice, model, speed), so editing one line
  only regenerates that line.
- clone: long recordings are cut at Whisper segment boundaries into ~18 s clips (longer if needed to
  fit Fish's 20-clip limit), from full-quality audio, loudness-normalised, with transcripts, then sent to POST /model as a private, instantly usable voice. Prints the voice id.
"""
import argparse, hashlib, json, os, subprocess, sys, tempfile, urllib.request, urllib.error, uuid
from pathlib import Path
import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
from voice_local import segments, align  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
API = 'https://api.fish.audio'
SR = 44100


def env():
    p = ROOT / '.env'
    kv = {}
    if p.exists():
        for line in p.read_text().splitlines():
            if '=' in line and not line.lstrip().startswith('#'):
                k, v = line.split('=', 1)
                kv[k.strip()] = v.strip()
    return kv


def key():
    k = os.environ.get('FISH_API_KEY') or env().get('FISH_API_KEY')
    if not k:
        sys.exit('FISH_API_KEY missing: add a line FISH_API_KEY=... to ' + str(ROOT / '.env'))
    return k


def request(method, path, body=None, headers=None, timeout=180):
    req = urllib.request.Request(API + path, data=body, method=method,
                                 headers={'Authorization': 'Bearer ' + key(), **(headers or {})})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return r.read()
    except urllib.error.HTTPError as e:
        sys.exit(f'Fish API {method} {path} -> HTTP {e.code}: {e.read()[:300].decode(errors="replace")}')


def decode(path_or_bytes, sr=SR):
    """Any audio -> mono float32 at `sr` via ffmpeg."""
    src = '-' if isinstance(path_or_bytes, (bytes, bytearray)) else str(path_or_bytes)
    p = subprocess.run(['ffmpeg', '-v', 'error', '-i', src, '-ac', '1', '-ar', str(sr), '-f', 'f32le', '-'],
                       input=path_or_bytes if src == '-' else None, capture_output=True)
    if p.returncode:
        sys.exit('ffmpeg decode failed: ' + p.stderr.decode()[:200])
    return np.frombuffer(p.stdout, np.float32).copy()


def trim(pcm, sr=SR, db=-45, keep=0.03):
    """Cut leading/trailing silence so <break> pauses are exact."""
    if not len(pcm):
        return pcm
    hop = int(0.01 * sr)
    frames = np.abs(pcm[: len(pcm) // hop * hop]).reshape(-1, hop).max(1)
    loud = np.where(20 * np.log10(np.maximum(frames, 1e-6)) > db)[0]
    if not len(loud):
        return pcm
    a = max(0, loud[0] * hop - int(keep * sr))
    b = min(len(pcm), (loud[-1] + 1) * hop + int(keep * sr))
    return pcm[a:b]


def packb(o):
    """Minimal MessagePack encoder (Fish needs msgpack to carry reference audio bytes)."""
    import struct
    if o is None: return b'\xc0'
    if o is True: return b'\xc3'
    if o is False: return b'\xc2'
    if isinstance(o, int):
        if 0 <= o < 128: return bytes([o])
        return b'\xd3' + struct.pack('>q', o)
    if isinstance(o, float): return b'\xcb' + struct.pack('>d', o)
    if isinstance(o, str):
        b = o.encode(); n = len(b)
        return (bytes([0xa0 | n]) if n < 32 else b'\xd9' + bytes([n]) if n < 256 else
                b'\xda' + struct.pack('>H', n) if n < 65536 else b'\xdb' + struct.pack('>I', n)) + b
    if isinstance(o, (bytes, bytearray)):
        n = len(o)
        return (b'\xc4' + bytes([n]) if n < 256 else b'\xc5' + struct.pack('>H', n) if n < 65536 else
                b'\xc6' + struct.pack('>I', n)) + bytes(o)
    if isinstance(o, (list, tuple)):
        n = len(o)
        return (bytes([0x90 | n]) if n < 16 else b'\xdc' + struct.pack('>H', n)) + b''.join(packb(x) for x in o)
    if isinstance(o, dict):
        n = len(o)
        return (bytes([0x80 | n]) if n < 16 else b'\xde' + struct.pack('>H', n)) + b''.join(packb(k) + packb(v) for k, v in o.items())
    raise TypeError(type(o))


def load_refs(paths):
    """Instant-clone references: audio files, each with a transcript in a sibling .txt file."""
    refs = []
    for a in paths:
        t = Path(a).with_suffix('.txt')
        if not t.exists():
            sys.exit(f'reference {a} needs its transcript in {t}')
        refs.append({'audio': Path(a).read_bytes(), 'text': t.read_text().strip()})
    return refs


def synth(text, voice, model, speed, temperature, top_p, refs=None):
    body = {'text': text, 'format': 'mp3', 'mp3_bitrate': 192, 'sample_rate': SR, 'latency': 'normal',
            'normalize': True, 'language': 'en', 'temperature': temperature, 'top_p': top_p,
            'prosody': {'speed': speed, 'normalize_loudness': True}}
    if refs:  # instant clone: works on the free tier, where API model creation is 0/0
        body['references'] = refs
        return request('POST', '/v1/tts', packb(body), {'Content-Type': 'application/msgpack', 'model': model})
    if voice:
        body['reference_id'] = voice
    return request('POST', '/v1/tts', json.dumps(body).encode(),
                   {'Content-Type': 'application/json', 'model': model})


def cmd_tts(o):
    voice = o.voice or env().get('FISH_VOICE_ID')
    ref_paths = o.refs or [x for x in env().get('FISH_REFS', '').split(',') if x.strip()]
    refs = load_refs(ref_paths) if ref_paths else None
    if refs:
        voice = 'refs:' + '+'.join(Path(x).stem for x in ref_paths)
    elif not voice:
        print('warning: no --voice / FISH_VOICE_ID; Fish picks a default voice', file=sys.stderr)
    text = Path(o.text).read_text().strip()
    cache = ROOT / 'out' / 'voice' / '.fish_cache'
    cache.mkdir(parents=True, exist_ok=True)
    from faster_whisper import WhisperModel
    asr = WhisperModel('small.en', device='cpu', compute_type='int8')

    audio, words, t = [np.zeros(int(0.15 * SR), np.float32)], [], 0.15
    for seg, pause in segments(text):
        h = hashlib.sha1(json.dumps([seg, voice, o.model, o.speed, o.temperature, o.top_p, [r['text'] for r in refs or []]]).encode()).hexdigest()[:16]
        f = cache / (h + '.mp3')
        if not f.exists():
            f.write_bytes(synth(seg, None if refs else voice, o.model, o.speed, o.temperature, o.top_p, refs))
        pcm = trim(decode(f))
        pcm16 = np.interp(np.arange(0, len(pcm), SR / 16000), np.arange(len(pcm)), pcm).astype(np.float32)
        res, _ = asr.transcribe(pcm16, word_timestamps=True, language='en')
        heard = [{'w': w.word.strip(), 'start': t + w.start, 'end': t + w.end} for s in res for w in s.words]
        dur = len(pcm) / SR
        words += align(seg.split(), heard, t, t + dur)
        audio += [pcm, np.zeros(int(pause * SR), np.float32)]
        t += dur + pause
        print(f'  {dur:5.2f}s  {seg[:70]}', file=sys.stderr)

    out = Path(o.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    wav = np.concatenate(audio)
    p = subprocess.run(['ffmpeg', '-y', '-v', 'error', '-f', 'f32le', '-ar', str(SR), '-ac', '1', '-i', '-',
                        '-codec:a', 'libmp3lame', '-b:a', '192k', str(out) + '.mp3'], input=wav.tobytes())
    if p.returncode:
        sys.exit('ffmpeg encode failed')
    data = json.dumps({'text': text, 'voiceId': 'fish:' + (voice or 'default'), 'speed': o.speed,
                       'model': o.model, 'words': words}, indent=1)
    Path(str(out) + '.json').write_text(data)
    Path(str(out) + '.js').write_text(f'window.VO = window.VO || {{}}; window.VO[{json.dumps(out.name)}] = {data};\n')
    print(f'wrote {out}.mp3 ({len(words)} words, {t:.2f}s)')


def script_words(path):
    """Spoken words of a read-aloud script: drops [notes] and ALL-CAPS header lines."""
    import re
    keep = []
    for line in Path(path).read_text().splitlines():
        line = re.sub(r'\[[^\]]*\]', ' ', line).strip()
        if not line or not re.search(r'[a-z]', line) or set(line) <= set('=-_ '):
            continue
        keep.append(line)
    return ' '.join(keep).split()


def correct(heard, script):
    """Fix ASR mishearings ("shortbot" -> "chatbot") by aligning to the script; keep ad-libs."""
    import difflib, re
    n = lambda w: re.sub(r'[^a-z0-9]', '', w.lower())
    h = heard.split()
    sm = difflib.SequenceMatcher(None, [n(w) for w in h], [n(w) for w in script], autojunk=False)
    out = []
    for op, i1, i2, j1, j2 in sm.get_opcodes():
        if op == 'equal' or (op == 'replace' and max(i2 - i1, j2 - j1) <= 5):
            out += script[j1:j2]
        elif op == 'replace':
            # long mismatch (e.g. clip edge): try the script words right next to the matched text
            k = i2 - i1
            for cand in (script[j2 - k:j2], script[j1:j1 + k]):
                if difflib.SequenceMatcher(None, ' '.join(h[i1:i2]).lower(), ' '.join(cand).lower()).ratio() >= 0.6:
                    out += cand
                    break
            else:
                out += h[i1:i2]
        elif op == 'insert':
            out += h[i1:i2]
    return ' '.join(out)


def clips_from(paths, lo=10.0, target=18.0, hi=28.0, cap=20, keep=None, script=None):
    """Cut recordings into clips at Whisper segment boundaries -> [(wav bytes, transcript)].
    Clips are cut from the full-quality audio (44.1 kHz) and loudness-normalised. Clip length grows
    when needed so the whole recording fits in `cap` clips (Fish accepts at most 20)."""
    from faster_whisper import WhisperModel
    asr = WhisperModel('small.en', device='cpu', compute_type='int8')
    total = sum(len(decode(p, 16000)) / 16000 for p in paths)
    target = max(target, total / cap * 1.1)
    hi = max(hi, target + 8)
    spans = []
    for path in paths:
        pcm = decode(path, 16000)
        segs, _ = asr.transcribe(pcm, language='en', vad_filter=True)
        cur, a, e = [], None, None
        def flush():
            spans.append((path, a, e, ' '.join(cur)))
        for s in segs:
            if cur and s.end - a > hi:  # adding this segment would make the clip too long
                flush(); cur, a = [], None
            if a is None:
                a = s.start
            cur.append(s.text.strip()); e = s.end
            if e - a >= target:
                flush(); cur, a = [], None
        if cur and e - a >= lo:
            flush()
        elif cur and spans and spans[-1][0] == path:  # short tail: join it to the previous clip
            p_, a_, _, t_ = spans.pop()
            spans.append((p_, a_, e, t_ + ' ' + ' '.join(cur)))
    spans = [s for s in spans if s[2] - s[1] >= 5][:cap]
    wavs, full = [], {}
    if keep:
        Path(keep).mkdir(parents=True, exist_ok=True)
    for i, (path, a, e, txt) in enumerate(spans):
        if path not in full:
            full[path] = decode(path, SR)
        pcm = full[path][int(max(0, a - 0.15) * SR): int((e + 0.25) * SR)]
        with tempfile.NamedTemporaryFile(suffix='.mp3') as tf:  # mp3: WAV uploads hit HTTP 413 (~40 MB for 8 min)
            subprocess.run(['ffmpeg', '-y', '-v', 'error', '-f', 'f32le', '-ar', str(SR), '-ac', '1', '-i', '-',
                            '-af', 'loudnorm=I=-18:TP=-2:LRA=11', '-ar', str(SR), '-b:a', '128k', tf.name],
                           input=pcm.astype(np.float32).tobytes(), check=True)
            wav = Path(tf.name).read_bytes()
        if script:
            txt = correct(txt, script)
        wavs.append((wav, txt, len(pcm) / SR))
        if keep:
            Path(keep, f'clip{i:02d}.mp3').write_bytes(wav)
            Path(keep, f'clip{i:02d}.txt').write_text(txt + '\n')
    return wavs


def cmd_clone(o):
    clips = clips_from(o.audio, keep=o.keep, script=script_words(o.script) if o.script else None)
    if not clips:
        sys.exit('no usable speech found in the recordings')
    if o.dry_run:
        print(f'{len(clips)} clips cut (dry run, nothing uploaded)'); return
    total = sum(d for _, _, d in clips)
    print(f'{len(clips)} clips, {total:.0f}s of speech', file=sys.stderr)
    b = uuid.uuid4().hex
    parts = []
    def field(name, value):
        parts.append(f'--{b}\r\nContent-Disposition: form-data; name="{name}"\r\n\r\n{value}\r\n'.encode())
    for k, v in [('type', 'tts'), ('title', o.title), ('train_mode', 'fast'), ('visibility', 'private'),
                 ('enhance_audio_quality', 'false' if o.clean else 'true')]:
        field(k, v)
    for i, (wav, txt, _) in enumerate(clips):
        parts.append(f'--{b}\r\nContent-Disposition: form-data; name="voices"; filename="clip{i:02d}.mp3"\r\n'
                     f'Content-Type: audio/mpeg\r\n\r\n'.encode() + wav + b'\r\n')
        field('texts', txt)
    parts.append(f'--{b}--\r\n'.encode())
    r = json.loads(request('POST', '/model', b''.join(parts), {'Content-Type': f'multipart/form-data; boundary={b}'}, timeout=600))
    print(json.dumps({'id': r.get('_id'), 'title': r.get('title'), 'state': r.get('state')}))
    print(f'Add FISH_VOICE_ID={r.get("_id")} to .env to make it the default voice.', file=sys.stderr)


def cmd_voices(o):
    r = json.loads(request('GET', '/model?self=true&page_size=50'))
    for m in r.get('items', []):
        print(m.get('_id'), m.get('state'), m.get('visibility'), m.get('title'))
    if not r.get('items'):
        print('(no voices yet)')


def main():
    ap = argparse.ArgumentParser()
    sub = ap.add_subparsers(dest='cmd', required=True)
    t = sub.add_parser('tts')
    t.add_argument('text'); t.add_argument('out')
    t.add_argument('--voice'); t.add_argument('--model', default='s2.1-pro-free')
    t.add_argument('--refs', nargs='+', help='instant clone: 1-3 clips of 10-30 s (transcript in <clip>.txt); else FISH_REFS in .env')
    t.add_argument('--speed', type=float, default=1.0)
    t.add_argument('--temperature', type=float, default=0.7); t.add_argument('--top-p', type=float, default=0.7)
    c = sub.add_parser('clone')
    c.add_argument('title'); c.add_argument('audio', nargs='+')
    c.add_argument('--clean', action='store_true', help='studio-clean audio: skip Fish noise enhancement')
    c.add_argument('--keep', help='also save the clips + transcripts to this folder for checking')
    c.add_argument('--script', help='the text that was read aloud: fixes ASR mistakes in the clip transcripts')
    c.add_argument('--dry-run', action='store_true', help='cut and save clips only, do not upload')
    sub.add_parser('voices')
    o = ap.parse_args()
    {'tts': cmd_tts, 'clone': cmd_clone, 'voices': cmd_voices}[o.cmd](o)


if __name__ == '__main__':
    main()
