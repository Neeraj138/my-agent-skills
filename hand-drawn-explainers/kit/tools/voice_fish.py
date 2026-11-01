"""Fish Audio voiceover + voice cloning. Same outputs as `voice.mjs tts` and `voice_local.py`
(<out>.mp3, <out>.json word timings, <out>.js for a scene's `requires`), so scenes don't care which engine was used.

  research/.venv/bin/python tools/voice_fish.py tts <textFile> <outBase> --voice <modelId> [--speed 1.0] [--model s2.1-pro-free]
  research/.venv/bin/python tools/voice_fish.py clone "<title>" <audio> [<audio> ...] [--clean]
  research/.venv/bin/python tools/voice_fish.py voices                       # your cloned voices (id, title, state)

- Key: FISH_API_KEY in ROOT/.env (never printed). Voice id: --voice, else FISH_VOICE_ID in ROOT/.env.
- Fish returns audio only, no timings. The text is split on <break time="Xs" /> tags; each segment is
  synthesised on its own, edge silence is trimmed, the break becomes a real pause, and Whisper word
  timestamps are mapped back onto the script words (same alignment as voice_local.py).
- Segments are cached in out/voice/.fish_cache/ by (text, voice, model, speed), so editing one line
  only regenerates that line.
- clone: long recordings are cut at Whisper segment boundaries into 10–28 s clips (max 20) with their
  transcripts, then sent to POST /model as a private, instantly usable voice. Prints the voice id.
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


def synth(text, voice, model, speed, temperature, top_p):
    body = {'text': text, 'format': 'mp3', 'mp3_bitrate': 192, 'sample_rate': SR, 'latency': 'normal',
            'normalize': True, 'language': 'en', 'temperature': temperature, 'top_p': top_p,
            'prosody': {'speed': speed, 'normalize_loudness': True}}
    if voice:
        body['reference_id'] = voice
    return request('POST', '/v1/tts', json.dumps(body).encode(),
                   {'Content-Type': 'application/json', 'model': model})


def cmd_tts(o):
    voice = o.voice or env().get('FISH_VOICE_ID')
    if not voice:
        print('warning: no --voice / FISH_VOICE_ID; Fish picks a default voice', file=sys.stderr)
    text = Path(o.text).read_text().strip()
    cache = ROOT / 'out' / 'voice' / '.fish_cache'
    cache.mkdir(parents=True, exist_ok=True)
    from faster_whisper import WhisperModel
    asr = WhisperModel('small.en', device='cpu', compute_type='int8')

    audio, words, t = [np.zeros(int(0.15 * SR), np.float32)], [], 0.15
    for seg, pause in segments(text):
        h = hashlib.sha1(json.dumps([seg, voice, o.model, o.speed, o.temperature, o.top_p]).encode()).hexdigest()[:16]
        f = cache / (h + '.mp3')
        if not f.exists():
            f.write_bytes(synth(seg, voice, o.model, o.speed, o.temperature, o.top_p))
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


def clips_from(paths, lo=10.0, target=18.0, hi=28.0, cap=20):
    """Cut recordings into lo–hi s clips at Whisper segment boundaries -> [(wav bytes, transcript)]."""
    from faster_whisper import WhisperModel
    asr = WhisperModel('small.en', device='cpu', compute_type='int8')
    out = []
    for path in paths:
        pcm = decode(path, 16000)
        segs, _ = asr.transcribe(pcm, language='en', vad_filter=True)
        cur, a, e = [], None, None
        def flush():
            out.append((pcm[int(a * 16000): int(e * 16000)], ' '.join(cur)))
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
    out = [c for c in out if len(c[0]) >= 5 * 16000][:cap]  # Fish allows at most 20 clips
    wavs = []
    for pcm, txt in out:
        with tempfile.NamedTemporaryFile(suffix='.wav') as tf:
            subprocess.run(['ffmpeg', '-y', '-v', 'error', '-f', 'f32le', '-ar', '16000', '-ac', '1', '-i', '-',
                            '-ar', '44100', tf.name], input=pcm.astype(np.float32).tobytes(), check=True)
            wavs.append((Path(tf.name).read_bytes(), txt))
    return wavs


def cmd_clone(o):
    clips = clips_from(o.audio)
    if not clips:
        sys.exit('no usable speech found in the recordings')
    total = sum((len(b) - 44) / (2 * 44100) for b, _ in clips)
    print(f'{len(clips)} clips, {total:.0f}s of speech', file=sys.stderr)
    b = uuid.uuid4().hex
    parts = []
    def field(name, value):
        parts.append(f'--{b}\r\nContent-Disposition: form-data; name="{name}"\r\n\r\n{value}\r\n'.encode())
    for k, v in [('type', 'tts'), ('title', o.title), ('train_mode', 'fast'), ('visibility', 'private'),
                 ('enhance_audio_quality', 'false' if o.clean else 'true')]:
        field(k, v)
    for i, (wav, txt) in enumerate(clips):
        parts.append(f'--{b}\r\nContent-Disposition: form-data; name="voices"; filename="clip{i:02d}.wav"\r\n'
                     f'Content-Type: audio/wav\r\n\r\n'.encode() + wav + b'\r\n')
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
    t.add_argument('--speed', type=float, default=1.0)
    t.add_argument('--temperature', type=float, default=0.7); t.add_argument('--top-p', type=float, default=0.7)
    c = sub.add_parser('clone')
    c.add_argument('title'); c.add_argument('audio', nargs='+')
    c.add_argument('--clean', action='store_true', help='studio-clean audio: skip Fish noise enhancement')
    sub.add_parser('voices')
    o = ap.parse_args()
    {'tts': cmd_tts, 'clone': cmd_clone, 'voices': cmd_voices}[o.cmd](o)


if __name__ == '__main__':
    main()
