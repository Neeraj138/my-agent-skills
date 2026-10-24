"""Independent clarity check: transcribe with local Whisper (not ElevenLabs) and compute word error rate
against the script, plus speaking rate and loudness. usage: asr_check.py reference.txt a.mp3 [b.mp3 ...]"""
import sys, re, json, subprocess
import numpy as np
from faster_whisper import WhisperModel
def norm(s): return re.sub(r'[^a-z0-9 ]+', ' ', s.lower()).split()
def wer(r, h):
    a, b = norm(r), norm(h); d = [[i] + [0] * len(b) for i in range(len(a) + 1)]
    for j in range(1, len(b) + 1): d[0][j] = j
    for i in range(1, len(a) + 1):
        for j in range(1, len(b) + 1): d[i][j] = min(d[i-1][j] + 1, d[i][j-1] + 1, d[i-1][j-1] + (a[i-1] != b[j-1]))
    return d[len(a)][len(b)] / len(a)
def lufs(f):
    o = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', f, '-af', 'loudnorm=print_format=json', '-f', 'null', '-'], capture_output=True, text=True).stderr
    j = json.loads(o[o.rindex('{'):o.rindex('}') + 1]); return float(j['input_i'])
ref = open(sys.argv[1]).read()
m = WhisperModel('small.en', device='cpu', compute_type='int8')
for f in sys.argv[2:]:
    pcm = subprocess.run(['ffmpeg', '-v', 'error', '-i', f, '-f', 'f32le', '-ac', '1', '-ar', '16000', '-'], capture_output=True).stdout
    segs, info = m.transcribe(np.frombuffer(pcm, np.float32), word_timestamps=True)
    segs = list(segs); hyp = ' '.join(s.text for s in segs)
    words = [w for s in segs for w in s.words]; speech = words[-1].end - words[0].start
    # pauses: gaps > 0.25 s between words
    gaps = [b.start - a.end for a, b in zip(words, words[1:]) if b.start - a.end > 0.25]
    print(json.dumps({'file': f.split('/')[-1], 'wer': round(wer(ref, hyp), 3), 'words_per_sec': round(len(words) / speech, 2),
                      'pauses>0.25s': len(gaps), 'lufs': round(lufs(f), 1), 'transcript': hyp.strip()}))
