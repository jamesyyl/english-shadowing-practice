# English Shadowing Practice

Local-first proof of concept for turning one English MP3 / podcast episode into a listening, intensive listening, and shadowing practice flow for children.

## MVP Scope

- Import one local MP3 episode.
- Store episode metadata as JSON.
- Probe audio duration with `ffprobe`.
- Generate ASR output locally and import it into episode JSON.
- Review transcript segments locally, mark clean English practice content, and export `clean-segments.json`.
- Run the child-facing listening, intensive listening, and shadowing app from the static data.

Not in the first pass:

- YouTube import.
- Cloud sync or accounts.
- GitHub Actions ASR / data generation automation.
- AI pronunciation scoring.
- Full subtitle editor with merge/delete operations.

## Architecture Decision

The first version is a local content-production tool plus a static practice app.

```text
Local production
MP3 -> ASR output -> episode JSON -> clean English segments

GitHub Pages practice app
Static HTML/CSS/JS -> reads generated JSON and MP3
```

GitHub Actions could eventually automate the production pipeline, but it is intentionally out of scope for now. The immediate goal is to make the local pipeline reliable first.

## Requirements

- Node.js 22+
- ffmpeg / ffprobe available on `PATH`
- Python 3.11+ for local ASR tooling

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

The current sample review disables LibriVox intro / ending metadata and splits the mixed title + first sentence segment so `clean-segments.json` starts with story text.

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
```

The practice app reads `clean-segments.json` and the MP3 directly from `data/`, so the same files can be served by GitHub Pages as static assets. It supports whole-episode listening with understanding hints, clean-English intensive listening, shadowing self-check, difficult sentence marking, replay counts, and resume state in `localStorage`.

## GitHub Pages

The repository is ready for branch-based GitHub Pages from the repository root:

```text
index.html -> frontend/practice.html
frontend/practice.html -> ../data/episodes/bedtime-old-woman-shoe/clean-segments.json
frontend/practice.html -> ../data/episodes/bedtime-old-woman-shoe/audio/original.mp3
```

After pushing to GitHub, configure Pages to publish from `main` / repository root. The public practice URL will open the child-facing practice app first.

## Data Flow

```text
MP3
→ episode metadata
→ ASR transcript
→ sentence timeline
→ clean English segments
→ local review UI
→ static listening / intensive listening / shadowing UI
```

The current implementation covers the local production pipeline and the first static child-facing three-stage practice UI. The next milestone is publishing the repository through GitHub Pages.

Current ASR note: `openai-whisper tiny.en` is working for the proof-of-concept sample. The generated Whisper JSON is imported into `data/episodes/bedtime-old-woman-shoe/episode.json`; the reviewed clean segment export currently contains 102 practice segments.
