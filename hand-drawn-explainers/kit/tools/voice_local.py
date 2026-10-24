"""Offline voiceover: Kokoro TTS + Whisper word timings. Same outputs as `voice.mjs tts`
(<out>.mp3, <out>.json with word timings, <out>.js for a scene's `requires`), so scenes don't care which was used.

  research/.venv/bin/python tools/voice_local.py <textFile> <outBase> [--voice af_heart] [--speed 0.9] [--lang en-us]

- <break time="1.0s" /> tags in the text become real silences (same syntax as the ElevenLabs script).
- Word timings: each segment is transcribed with Whisper and its timestamps are mapped back onto the
  *script* words, so `vo.cue('phrase')` matches what you wrote.
- Models: $KOKORO_DIR, else ../ai-kids-videos/tools/tts/models (kokoro-v1.0.onnx + voices-v1.0.bin).
  Download: https://github.com/thewh1teagle/kokoro-onnx/releases (model-files-v1.0).
- Voices: af_heart, af_bella, af_nicole, am_michael, am_fenrir, bf_emma, bm_george, ... (`--list`).
"""
import argparse, difflib, json, os, re, subprocess, sys
from pathlib import Path
import numpy as np

ROOT = Path(__file__).resolve().parent.parent
SR = 24000


def models_dir():
    for d in [os.environ.get('KOKORO_DIR'), ROOT / 'assets/tts', ROOT.parent / 'ai-kids-videos/tools/tts/models']:
        if d and (Path(d) / 'kokoro-v1.0.onnx').exists():
            return Path(d)
    sys.exit('Kokoro model not found: set KOKORO_DIR to a folder with kokoro-v1.0.onnx and voices-v1.0.bin')


def segments(text):
    """Split on <break> tags -> [(segment text, pause seconds after it)]."""
    parts = re.split(r'<break\s+time="([\d.]+)s"\s*/>', text)
    out = []
    for i in range(0, len(parts), 2):
        seg = ' '.join(parts[i].split())
        pause = float(parts[i + 1]) if i + 1 < len(parts) else 0.0
        if seg:
            out.append([seg, pause])
        elif out:
            out[-1][1] += pause
    return out


norm = lambda w: re.sub(r'[^a-z0-9]', '', w.lower())


def align(script_words, heard, t0, t1):
    """Give every script word a start/end from Whisper's words (matched by spelling, gaps interpolated)."""
    a, b = [norm(w) for w in script_words], [norm(h['w']) for h in heard]
    times = [None] * len(a)
    for blk in difflib.SequenceMatcher(None, a, b, autojunk=False).get_matching_blocks():
        for k in range(blk.size):
            times[blk.a + k] = (heard[blk.b + k]['start'], heard[blk.b + k]['end'])
    # fill unmatched words (numbers said as words, names spelled differently) by interpolation
    known = [(i, t) for i, t in enumerate(times) if t]
    for i in range(len(times)):
        if times[i]:
            continue
        prev = max((k for k in known if k[0] < i), default=(-1, (t0, t0)), key=lambda k: k[0])
        nxt = min((k for k in known if k[0] > i), default=(len(times), (t1, t1)), key=lambda k: k[0])
        lo, hi = prev[1][1], nxt[1][0]
        n = nxt[0] - prev[0]
        s = lo + (hi - lo) * (i - prev[0] - 1) / max(n - 1, 1)
        times[i] = (s, s + (hi - lo) / max(n - 1, 1))
    return [{'w': w, 'start': round(s, 3), 'end': round(e, 3)} for w, (s, e) in zip(script_words, times)]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('text', nargs='?'); ap.add_argument('out', nargs='?')
    ap.add_argument('--voice', default='af_heart'); ap.add_argument('--speed', type=float, default=0.9)
    ap.add_argument('--lang', default='en-us'); ap.add_argument('--list', action='store_true')
    o = ap.parse_args()
    import espeakng_loader
    data = Path(espeakng_loader.get_data_path())
    if len(str(data)) > 100:  # espeak-ng silently fails on long data paths (deep project folders): use a short copy
        import shutil
        short = Path.home() / '.cache' / 'espeak-ng-data'
        if not (short / 'phontab').exists():
            shutil.copytree(data, short, dirs_exist_ok=True)
        espeakng_loader.get_data_path = lambda: str(short)
    from kokoro_onnx import Kokoro
    md = models_dir()
    tts = Kokoro(str(md / 'kokoro-v1.0.onnx'), str(md / 'voices-v1.0.bin'))
    if o.list:
        print(' '.join(sorted(tts.get_voices()))); return
    if not (o.text and o.out):
        ap.error('need <textFile> <outBase>')
    text = Path(o.text).read_text().strip()
    from faster_whisper import WhisperModel
    asr = WhisperModel('small.en' if o.lang.startswith('en') else 'small', device='cpu', compute_type='int8')

    audio, words, t = [np.zeros(int(0.15 * SR), np.float32)], [], 0.15
    for seg, pause in segments(text):
        pcm, sr = tts.create(seg, voice=o.voice, speed=o.speed, lang=o.lang)
        pcm = np.asarray(pcm, np.float32)
        assert sr == SR, sr
        heard = []
        pcm16 = np.interp(np.arange(0, len(pcm), SR / 16000), np.arange(len(pcm)), pcm).astype(np.float32)  # Whisper wants 16 kHz
        res, _ = asr.transcribe(pcm16, word_timestamps=True, language=o.lang[:2])
        for s in res:
            heard += [{'w': w.word.strip(), 'start': t + w.start, 'end': t + w.end} for w in s.words]
        dur = len(pcm) / SR
        words += align(seg.split(), heard, t, t + dur)
        audio += [pcm, np.zeros(int(pause * SR), np.float32)]
        t += dur + pause
        print(f'  {dur:5.2f}s  {seg[:70]}', file=sys.stderr)

    out = Path(o.out); out.parent.mkdir(parents=True, exist_ok=True)
    wav = np.concatenate(audio)
    p = subprocess.run(['ffmpeg', '-y', '-v', 'error', '-f', 'f32le', '-ar', str(SR), '-ac', '1', '-i', '-',
                        '-codec:a', 'libmp3lame', '-b:a', '160k', str(out) + '.mp3'], input=wav.tobytes())
    if p.returncode:
        sys.exit('ffmpeg failed')
    data = json.dumps({'text': text, 'voiceId': 'kokoro:' + o.voice, 'speed': o.speed, 'model': 'kokoro-v1.0',
                       'words': words}, indent=1)
    Path(str(out) + '.json').write_text(data)
    Path(str(out) + '.js').write_text(f'window.VO = window.VO || {{}}; window.VO[{json.dumps(out.name)}] = {data};\n')
    print(f'wrote {out}.mp3 ({len(words)} words, {t:.2f}s)')


if __name__ == '__main__':
    main()
