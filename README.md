# English Shadowing Practice

Local-first proof of concept for turning one English MP3, pasted text, or SRT transcript into a listening, intensive listening, and shadowing practice flow for children.

## MVP Scope

- Import one local MP3 episode.
- Store episode metadata as JSON.
- Probe audio duration with `ffprobe`.
- Generate ASR output locally and import it into episode JSON.
- Review transcript segments locally, mark clean English practice content, and export `clean-segments.json`.
- Import pasted text or externally generated SRT subtitles, split them into complete English sentences, and generate one local MP3 per sentence.
- Run the child-facing listening, intensive listening, and shadowing app from the static data.

Not in the first pass:

- YouTube import.
- Direct YouTube download or browser automation.
- Cloud sync or accounts.
- GitHub Actions ASR / data generation automation.
- AI pronunciation scoring.
- Full subtitle editor with merge/delete operations.

## Architecture Decision

The first version is a local content-production tool plus a static practice app. API keys stay local; GitHub Pages only receives generated JSON and MP3 files.

```text
Local production
MP3 -> ASR output -> episode JSON -> clean English segments
Text/SRT -> sentence segments -> per-sentence TTS MP3 -> clean English segments

GitHub Pages practice app
Static HTML/CSS/JS -> reads generated JSON and MP3 files
```

GitHub Actions could eventually automate the production pipeline, but it is intentionally out of scope for now. The immediate goal is to make the local pipeline reliable first.

## Requirements

- Node.js 22+
- ffmpeg / ffprobe available on `PATH`
- Python 3.11+ for local ASR tooling
- `OPENAI_API_KEY` for OpenAI TTS generation, optional. If it is missing, `scripts/generate-tts.js --provider auto` falls back to Google Translate TTS.

ASR setup notes are in:

```text
docs/asr-setup.md
```

## Quick Start

```powershell
npm install
npm test
```

Import a local MP3:

```powershell
node scripts/create-episode.js --id sample-episode-001 --title "Sample Episode" --audio "samples/sample.mp3" --level "G5-G6"
node scripts/verify-episodes.js
```

The generated episode lives at:

```text
data/episodes/<episode-id>/episode.json
```

Import a plain text transcript:

```powershell
node scripts/import-text.js --episodeId my-text-episode --title "My Text Episode" --input "samples/transcript.txt"
```

Import an externally generated SRT file:

```powershell
node scripts/import-srt.js --episodeId youtube-shadowing-steps --title "Shadowing Practice Steps" --input ".\跟讀練習 4 大步驟,每天 15 分鐘讓口說進步快一倍【聽故事｜學英文】.srt" --sourceUrl "https://www.youtube.com/watch?v=dWQDFgQqPAE"
```

Generate one MP3 per enabled sentence:

```powershell
$env:OPENAI_API_KEY="sk-..."
node scripts/generate-tts.js --episodeId youtube-shadowing-steps --provider openai --model gpt-4o-mini-tts --voice coral
```

If OpenAI TTS is unavailable, use the fallback provider:

```powershell
node scripts/generate-tts.js --episodeId youtube-shadowing-steps --provider google
```

Then export static practice data:

```powershell
node scripts/export-clean-segments.js --episodeId youtube-shadowing-steps
node scripts/verify-episodes.js
```

Import Whisper-style ASR JSON after transcription:

```powershell
python scripts/transcribe-openai-whisper.py --audio "samples/bedtimestories_06_anonymous_128kb.mp3" --output "samples/asr/bedtime-old-woman-shoe.whisper.json" --model tiny.en
node scripts/import-whisper-json.js --episodeId sample-episode-001 --input "samples/asr/whisper.json"
```

Apply a manual segment review:

```powershell
node scripts/apply-segment-review.js --episodeId bedtime-old-woman-shoe --review "data/episodes/bedtime-old-woman-shoe/review.json"
node scripts/export-clean-segments.js --episodeId bedtime-old-woman-shoe
```

The current sample review disables LibriVox intro / ending metadata, splits the mixed title + first sentence segment, and merges the first broken story sentence so `clean-segments.json` starts with a complete sentence.

Run the local review and practice server:

```powershell
npm run review
```

Then open the production review workbench:

```text
http://127.0.0.1:5177
```

The review workbench can load the sample episode, play the full audio, play a selected segment range, edit segment text, change `contentType`, enable or disable practice use, add Chinese hints / keyword notes, split a segment, save back to `episode.json`, and export `clean-segments.json`.

Open the child practice app:

```text
http://127.0.0.1:5177/practice
http://127.0.0.1:5177/practice?episode=bedtime-old-woman-shoe
```

The practice app reads `clean-segments.json` and MP3 files directly from `data/`, so the same files can be served by GitHub Pages as static assets. It supports whole-episode listening with understanding hints, clean-English intensive listening, shadowing self-check, difficult sentence marking, replay counts, and resume state in `localStorage`.

## GitHub Pages

Live app:

```text
https://jamesyyl.github.io/english-shadowing-practice/
```

The repository is ready for branch-based GitHub Pages from the repository root:

```text
index.html -> frontend/practice.html
frontend/practice.html -> ../data/episodes/youtube-shadowing-steps/clean-segments.json
frontend/practice.html -> ../data/episodes/youtube-shadowing-steps/audio/sentences/*.mp3
```

Pages is configured to publish from `main` / repository root. The public practice URL opens the child-facing practice app first.

## Data Flow

```text
MP3
→ episode metadata
→ ASR transcript
→ sentence timeline
→ clean English segments
→ local review UI
→ static listening / intensive listening / shadowing UI

Text or SRT
→ sentence segments
→ per-sentence TTS MP3
→ clean English segments
→ static listening / intensive listening / shadowing UI
```

The current implementation covers both the original MP3 / ASR proof of concept and the lower-friction Text/SRT + TTS pipeline. Generated data remains local until committed and pushed.

Current ASR note: `openai-whisper tiny.en` is working for the proof-of-concept sample. The generated Whisper JSON is imported into `data/episodes/bedtime-old-woman-shoe/episode.json`; the reviewed clean segment export currently contains 101 practice segments.

Current TTS note: `youtube-shadowing-steps` was imported from the root SRT sample and generated as 545 per-sentence MP3 files. Because `OPENAI_API_KEY` was not set in the local environment, generation used the Google Translate fallback provider.
