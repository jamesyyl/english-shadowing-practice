# Manual Acceptance

## Episode Import

- A local MP3 can be imported with `scripts/create-episode.js`.
- The audio file is copied into `data/episodes/<id>/audio/original.mp3`.
- `data/episodes/<id>/episode.json` is created.
- `duration` is greater than 0.
- `npm run verify` passes.

## Clean English Segment Rule

When transcript and segment editing are implemented:

- Intensive listening uses only `contentType=main` and `enabledForPractice=true`.
- Shadowing uses the same clean English segment list as intensive listening.
- Chinese explanations, parent notes, UI text, ads, and music are excluded from clean English segments.

For the current LibriVox sample:

- `seg-001` through `seg-006` are intro metadata and are disabled.
- The original mixed `seg-007` is split into disabled `seg-007-title` and practice `seg-007`.
- `seg-109` is the ending metadata and is disabled.
- `clean-segments.json` contains 102 practice segments.
- The first clean segment is `seg-007`: `There was once a little goblin woman who had`.

## Local Review UI

- `npm run review` starts the local review workbench at `http://127.0.0.1:5177`.
- The episode list loads `bedtime-old-woman-shoe`.
- The workbench shows 110 total segments and 102 practice segments.
- The segment list can be filtered and restored.
- The editor can show segment id, start / end time, text, `contentType`, practice enabled state, Chinese hint, keywords, and phrase notes.
- The audio control loads `/api/episodes/bedtime-old-woman-shoe/audio`.
- `Play segment` plays the selected segment range.
- Saving a segment writes to `episode.json`.
- `Export` writes `data/episodes/bedtime-old-woman-shoe/clean-segments.json` and reports 102 segments.

## Child Practice UI

- `npm run practice` starts the same local server and exposes `http://127.0.0.1:5177/practice`.
- The practice UI loads `data/episodes/bedtime-old-woman-shoe/clean-segments.json`.
- The practice UI shows the episode title and 102 clean English practice segments.
- The audio control loads `data/episodes/bedtime-old-woman-shoe/audio/original.mp3` and reports a duration of about 7:31.
- Stage 1 supports whole-episode listening and Chinese understanding hints.
- Completing Stage 1 moves the UI into Stage 2.
- Stage 2 shows only clean English segment text, current sentence count, previous / next controls, replay, and slower playback.
- Stage 3 uses the same clean English segment list and supports replay, `我跟讀了`, `太難了`, and summary counts.
- Progress is saved in `localStorage` under `english-shadowing-progress:<episode-id>`.
- The layout has no horizontal overflow at a 390px mobile viewport.

## GitHub Pages Static Path

- Live app: `https://jamesyyl.github.io/english-shadowing-practice/`.
- `index.html` exists at the repository root and redirects to `frontend/practice.html`.
- `frontend/practice.html` uses relative `practice.css` and `practice.js` paths.
- The practice JavaScript can load `../data/episodes/bedtime-old-woman-shoe/clean-segments.json` when served from GitHub Pages.
- `data/episodes/bedtime-old-woman-shoe/audio/original.mp3` is not ignored by Git and can be published as a static asset.
- Live Pages verification loaded 102 segments, the 7:31 MP3, and no browser console errors.
