# Narration and video production

## Reuse the working engine

Inspect the existing project before choosing a renderer. The established sketchanim JavaScript engine, a deterministic Cairo/vector pipeline, or an existing SVG/canvas renderer can all fit this style. Prefer the project's working approach over a speculative rewrite.

In a sketchanim project, useful discovery landmarks are `engine/sketchanim.js`, `render.mjs`, `scenes/index.js`, `tools/voice.mjs`, and a local sketch-explainer skill or reference directory. Read their current APIs and one working scene. Use the actual local entrypoints; do not assume a machine-specific absolute path, package version, or command flag.

For new animation, define state as a pure function of time. Avoid cumulative per-frame mutation, wall-clock timers, and nondeterministic particle loops. A still at time t must match the exported frame at t. Preserve this property through camera changes and transitions.

## Voice and timing

Honor the requested provider. For a local voice request, look for an existing Kokoro installation, models, voices, or other working local TTS before installing another stack. Use existing shared models read-only and put task outputs in the task folder.

For ElevenLabs or another hosted provider, use configured credentials without printing or committing them. Check current available voices/capabilities and use the authorized scope; do not hard-code historical account limits, blocked features, or a pasted key into the skill. Narration authorization does not authorize unrelated onboarding, purchases, or external publishing.

Maintain separate canonical narration and spoken aliases. Acronyms can be pronounced differently in context, including a final A turning into an article; test the whole phrase. Listen to representative clips, difficult names, numbers, and acronyms before a large batch. Use local ASR as a screening aid when available, and inspect the original audio when the transcript is uncertain.

Obtain timings from the actual generated audio. Word alignment is useful where available; deterministic sentence clips also work. Cache clips against spoken text, voice, model, and speed. Rebuild timings after changing audio, inserted gaps, or playback rate. Keep the visible spelling conventional while using provider-specific pronunciation aliases in speech.

Calibrate toward the user's reference using speech rate, silence, beat holds, and the time needed for the most difficult example. Keep enough dwell for the first explanation. Do not compress four useful operations into two seconds because they technically fit one spoken sentence; distribute the visual work across adjacent compatible lines or revise the narration.

## Render checks

Use the requested dimensions and frame rate. Inspect native frames and the actual resized viewing target. Render bounded, resumable sections for long work where supported, limiting encoder concurrency to the machine's capacity.

Cache keys should include canonical script, actual timeline, scene code and imported helpers, renderer settings, and font/assets that affect pixels. Never reuse an old render after changing a shared visual component. For gated productions, record the approved visual revision and invalidate approval when relevant visuals change.

Before delivery:

- Probe dimensions, frame rate, duration, audio presence, and expected stream formats.
- Decode the complete video and audio to detect corrupt output.
- Inspect frames around joins, every important cue, and the densest states.
- Listen for pronunciation, clipped sentence boundaries, missing lines, and distracting silence. ASR alone does not certify sound quality.
- Measure loudness and true peak. For a typical spoken web video, roughly −16 to −14 LUFS and below −1 dBTP are useful targets unless the project specifies otherwise.
- Compare final frame times and subtitle cues to the final audio. If the user requests a speed change, update audio, video, timing metadata, and subtitles together.
- Verify that the delivered file corresponds to the current approved design. Archive or label superseded drafts; follow explicit deletion requests within the authorized task scope.

Deliver the requested MP4 or illustration, with a clean cover and optional SRT/source notes when useful or requested. Keep rendering notes, citations, and review labels outside the video unless the viewer needs them. A local watch page can organize a series, but does not substitute for the requested video files. Upload only when requested and authorized.
