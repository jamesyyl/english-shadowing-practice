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
- [ ] Commit and push the repo to GitHub.
- [ ] Enable GitHub Pages from the repository root.

## Later

- [ ] Consider GitHub Actions automation only after the local production pipeline is stable.
