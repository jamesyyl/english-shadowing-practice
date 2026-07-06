# TODO

## Current Batch

- [x] Create repo skeleton.
- [x] Add episode JSON data model.
- [x] Add local MP3 import script.
- [x] Add ffprobe-based verification.
- [x] Choose and save a 6 to 10 minute MP3 / podcast proof-of-concept sample.
- [x] Validate the sample with `create-episode.js`.
- [x] Add Whisper JSON import boundary for ASR output.

## Completed Pipeline Batch

- [x] Retry model download after switching Clash node / HTTPS egress.
- [x] Choose ASR route for local proof of concept: `openai-whisper tiny.en`.
- [x] Generate transcript from the sample MP3 with `scripts/transcribe-openai-whisper.py`.
- [x] Convert ASR output into sentence-level segments.
- [x] Mark clean English `main` segments for the LibriVox sample.
- [x] Split mixed title / story segment `seg-007`.
- [x] Export clean English segments for future intensive listening / shadowing UI.
- [x] Add a simple review UI for episode JSON.
- [x] Add segment split / edit controls to the review UI.
- [x] Verify review UI API, filter behavior, export behavior, and reversible save.

## Completed Practice UI Batch

- [x] Build the child-facing episode home screen.
- [x] Build stage 1: whole-episode listening with understanding hints.
- [x] Build stage 2: clean-English intensive listening.
- [x] Build stage 3: shadowing self-check flow.
- [x] Add `localStorage` progress for resume / completion state.
- [x] Verify desktop and 390px mobile layout smoke checks.

## Next Batch

- [x] Harden static asset paths and README for GitHub Pages publishing.
- [x] Add root `index.html` for Pages.
- [x] Commit and push the repo to GitHub.
- [x] Enable GitHub Pages from the repository root.
- [x] Verify live Pages app loads the clean segments and the MP3.

## Completed Text / SRT + TTS Batch

- [x] Add a text import script that splits pasted or file-based English text into complete practice sentences.
- [x] Add an SRT import script that parses cues, merges cue text into complete sentences, and preserves `sourceStartTime` / `sourceEndTime`.
- [x] Extend the segment data model so practice segments can use per-sentence `audioFile` MP3s while keeping the current original-MP3 `startTime` / `endTime` fallback.
- [x] Add an OpenAI TTS generation script that reads episode segments, generates one MP3 per enabled sentence, supports `OPENAI_API_KEY`, skips existing files, and can resume after failures.
- [x] Keep Google Translate TTS as a fallback provider if OpenAI TTS is unavailable.
- [x] Update the practice player so segments with `audioFile` play the per-sentence MP3 directly.
- [x] Add verification for generated static assets: every enabled sentence has text, every `audioFile` exists, and Pages-relative paths resolve.
- [x] Run the existing root SRT sample as the first proof of concept.
- [x] Update README with text import, SRT import, TTS generation, local secret handling, and GitHub Pages publishing flow.
- [x] Commit and push generated static data after local verification so GitHub Pages can serve it.

## Later

- [ ] Consider GitHub Actions automation only after the local production pipeline is stable.
