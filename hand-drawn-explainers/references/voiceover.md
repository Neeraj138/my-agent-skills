# Voiceover + sync

Two voice engines produce the same files (`<id>.mp3`, `<id>.json` word timings, `<id>.js` for the scene's `requires`), so scenes don't care which one you used.

## Which voice
1. Ask the user (brief, §1 of SKILL.md): ElevenLabs, local, captions-only or silent.
2. ElevenLabs needs `ELEVENLABS_API_KEY` in `ROOT/.env` (git-ignored). Check that it exists without printing it: `grep -c ELEVENLABS_API_KEY .env`. If it's missing, ask the user to add the line themselves. Never ask them to paste a key into chat, and never echo it.
3. No key, quota exhausted, or offline: use the **local** voice. It's free and unlimited, slightly less expressive.

## Script text file
`out/voice/<id>.txt`: spoken text with `<break time="1.0s" />` between beats and 0.3–0.4 s breaks inside a beat. Same syntax for both engines.
- Acronyms with dots ("H. N. S. W.", "I. C. A. M. one"). Hard names spelled phonetically ("P G vector"). Numbers as words.
- Map spoken spellings back to written ones for anything shown on screen: `s.useVoice(id, { display: [['I. C. A. M. one', 'ICAM-1']] })`.

## ElevenLabs
```bash
node tools/voice.mjs tts <voiceId> out/voice/<id>.txt out/voice/<id> 0.92
```
- The free tier allows ~10k characters/month (break tags count) and premade voices only via the API (library voices return HTTP 402). There's no speech-to-text, so clarity is checked locally. Check the remaining quota: `curl -s https://api.elevenlabs.io/v1/user/subscription -H "xi-api-key: $KEY"`.
- Tested voices: Alice `Xb7hH8MSUJpSbSDYk0k2` (default, clear educator, speed 0.92), Matilda `XrExE9yKIg1WjnnlVkGX`, Brian `nPczCjzI2devNBz1zQrb`, Eric `cjVigY5qzO86Huf0OWal` (the last two are faster).
- Get the script reviewed **before** generating, because every regeneration costs credits.

## Local (Kokoro, offline)
```bash
research/.venv/bin/python tools/voice_local.py out/voice/<id>.txt out/voice/<id> --voice af_heart --speed 0.9
research/.venv/bin/python tools/voice_local.py --list          # all voices
```
- Models (`kokoro-v1.0.onnx`, `voices-v1.0.bin`) are read from `$KOKORO_DIR`, falling back to `ROOT/assets/tts/` (where `kit/setup.sh` downloads them from github.com/thewh1teagle/kokoro-onnx releases, tag `model-files-v1.0`).
- Good voices: `af_heart` (warm, default), `af_bella`, `am_michael`, `bf_emma` / `bm_george` (British). At `--speed 0.9`, `af_heart` runs ≈ 2.2 words/s.
- Word timings come from Whisper and are mapped back onto your script words, so `vo.cue('phrase')` uses your spelling.

## Clarity check (both engines)
```bash
sed 's/<break[^>]*>//g' out/voice/<id>.txt > out/voice/<id>_plain.txt
research/.venv/bin/python tools/asr_check.py out/voice/<id>_plain.txt out/voice/<id>.mp3
```
This prints word error rate, words/s and loudness. Differences in number formatting or spelling are fine. A misheard term (e.g. "Nest W" for HNSW) means you should respell it and regenerate.

## Sync in the scene
- `const vo = s.useVoice('<id>', { offset: 0.4, display: [...] })` sets the audio and the duration (end + 2.5 s tail). **Subtitles are off by default.** Turn them on only if the user asked: `subtitles: true` (or an object of overrides such as `{ y, size, maxChars }`), and add `s.scrim()` so they stay readable.
- If the user wants subtitles as a separate file instead: `node tools/srt.mjs out/voice/<id>.json out/<name>.srt --offset 0.4 --map "I. C. A. M. one=ICAM-1"`.
- Start every beat on a cue: `vo.cue('phrase')` (it throws if the phrase isn't found, so fix the phrase rather than guessing a time). Use `vo.cue(phrase, afterSeconds)` for a later repeat and `vo.cueEnd(phrase)` for the end of a phrase.
- Rendering mixes the voice at `audioOffset` and normalises it to about −15 LUFS.

## Without a voice
Captions carry the story: `s.say(text, t0, t1, { hl })`, about one line every 3 s (`templates/reel-captions.js`). Silent pieces (GIFs, posters) rely on the picture plus one short label per beat.
