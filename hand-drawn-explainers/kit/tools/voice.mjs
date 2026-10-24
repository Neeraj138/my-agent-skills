// ElevenLabs helpers: TTS with character timestamps (for syncing animation), and STT (for a clarity check).
// Reads ELEVENLABS_API_KEY from .env. Never prints the key.
//   node tools/voice.mjs tts <voiceId> <textFile> <outBase> [speed]   -> outBase.mp3 + outBase.json (word timings)
//   node tools/voice.mjs stt <audioFile> <referenceTextFile>          -> transcript + word error rate
//   node tools/voice.mjs audition <textFile> <voiceId,...>            -> per-voice WER (via STT) and words/sec
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const env = Object.fromEntries(readFileSync(path.join(root, '.env'), 'utf8').split('\n').filter((l) => l.includes('=')).map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]));
const KEY = env.ELEVENLABS_API_KEY;
const API = 'https://api.elevenlabs.io/v1';

export async function tts(voiceId, text, outBase, speed = 0.92, model = 'eleven_multilingual_v2') {
  const r = await fetch(`${API}/text-to-speech/${voiceId}/with-timestamps?output_format=mp3_44100_128`, {
    method: 'POST', headers: { 'xi-api-key': KEY, 'content-type': 'application/json' },
    body: JSON.stringify({ text, model_id: model, voice_settings: { stability: 0.55, similarity_boost: 0.75, style: 0.1, use_speaker_boost: true, speed } }),
  });
  if (!r.ok) throw new Error(`tts ${r.status}: ${(await r.text()).slice(0, 300)}`);
  const j = await r.json();
  mkdirSync(path.dirname(outBase), { recursive: true });
  writeFileSync(outBase + '.mp3', Buffer.from(j.audio_base64, 'base64'));
  const a = j.alignment;
  // characters -> words with start/end seconds
  const words = []; let cur = null;
  a.characters.forEach((ch, i) => {
    if (/\s/.test(ch)) { if (cur) { words.push(cur); cur = null; } return; }
    if (!cur) cur = { w: '', start: a.character_start_times_seconds[i], end: 0 };
    cur.w += ch; cur.end = a.character_end_times_seconds[i];
  });
  if (cur) words.push(cur);
  // <break time="0.8s" /> tags come back as characters; drop them
  for (let i = words.length - 1; i >= 0; i--) if (/^<break|^time=|^\/>$/.test(words[i].w) || /\/>$/.test(words[i].w) && words[i].w.includes('"')) words.splice(i, 1);
  const data = JSON.stringify({ text, voiceId, speed, model, words }, null, 1);
  writeFileSync(outBase + '.json', data);
  // browser-loadable copy for scenes (file:// pages can't fetch JSON)
  writeFileSync(outBase + '.js', `window.VO = window.VO || {}; window.VO[${JSON.stringify(path.basename(outBase))}] = ${data};\n`);
  return words;
}

export async function stt(file) {
  const fd = new FormData();
  fd.append('model_id', 'scribe_v1');
  fd.append('file', new Blob([readFileSync(file)]), path.basename(file));
  const r = await fetch(`${API}/speech-to-text`, { method: 'POST', headers: { 'xi-api-key': KEY }, body: fd });
  if (!r.ok) throw new Error(`stt ${r.status}: ${(await r.text()).slice(0, 300)}`);
  return (await r.json()).text;
}

const norm = (s) => s.toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').split(/\s+/).filter(Boolean);
export function wer(ref, hyp) {
  const a = norm(ref), b = norm(hyp);
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++)
    d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length] / a.length;
}
const [cmd, ...args] = process.argv.slice(2);
if (cmd === 'tts') {
  const words = await tts(args[0], readFileSync(args[1], 'utf8').trim(), args[2], args[3] ? +args[3] : 0.92);
  console.log(`wrote ${args[2]}.mp3 (${words.length} words, ${words[words.length - 1].end.toFixed(2)}s)`);
} else if (cmd === 'stt') {
  const hyp = await stt(args[0]);
  console.log(hyp); if (args[1]) console.log('WER', wer(readFileSync(args[1], 'utf8'), hyp).toFixed(3));
} else if (cmd === 'audition') {
  const text = readFileSync(args[0], 'utf8').trim();
  for (const v of args[1].split(',')) {
    const base = path.join(root, 'out', 'voice', 'audition_' + v);
    try {
      const words = await tts(v, text, base);
      const dur = words[words.length - 1].end - words[0].start;
      const hyp = await stt(base + '.mp3');
      console.log(JSON.stringify({ voice: v, wer: +wer(text, hyp).toFixed(3), words_per_sec: +(words.length / dur).toFixed(2), seconds: +dur.toFixed(2), transcript: hyp }));
    } catch (e) { console.log(JSON.stringify({ voice: v, error: e.message })); }
  }
}
