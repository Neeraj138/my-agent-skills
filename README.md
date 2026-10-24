# my-agent-skills

Personal agent skills. Each skill lives in its own directory with a `SKILL.md` (YAML frontmatter: `name`, `description`) and optional `scripts/`.

| Skill | Description |
| --- | --- |
| [media-text](media-text/SKILL.md) | Verbatim OCR from images and speech transcription from audio/video via Gemini Flash Lite. |
| [visual-explainers](visual-explainers/SKILL.md) | Animated explainers (bento pages, X/LinkedIn posters, blog figures, GIF/MP4) in a named design style (Play for now), with a storyboard step, an automated audit, and an adversarial critic subagent. |
| [hand-drawn-explainers](hand-drawn-explainers/SKILL.md) | Hand-drawn, Excalidraw-style explainers on any subject (9:16 reels, 16:9 videos, GIFs, slide decks, posters) at 60 fps. The agent asks for audience depth, format, voice and subtitles before building. Ships a bundled animation engine, ElevenLabs or offline Kokoro voice, and fresh-eyes reviews. |

## Install

With the [skills CLI](https://github.com/vercel-labs/skills) (works for Claude Code, Codex, Gemini CLI, Cursor and other agents):

```bash
npx skills add Neeraj138/my-agent-skills --list                                   # see the skills in this repo
npx skills add Neeraj138/my-agent-skills --skill hand-drawn-explainers             # one skill, into the current project
npx skills add Neeraj138/my-agent-skills --skill hand-drawn-explainers -g          # globally (user level)
npx skills add Neeraj138/my-agent-skills --skill hand-drawn-explainers -a codex    # for a specific agent
npx skills add Neeraj138/my-agent-skills --skill '*'                               # all skills
```

Or copy a skill's folder into your agent's skills directory (e.g. `.claude/skills/<name>/`).

`hand-drawn-explainers` then needs a working project once: `bash <skill-folder>/kit/setup.sh <project-dir>` (node ≥ 18, ffmpeg, Python 3.12 or `uv`). The skill tells the agent to do this itself.
