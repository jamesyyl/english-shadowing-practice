# Data Model

## Episode

```json
{
  "schemaVersion": 1,
  "id": "sample-episode-001",
  "title": "Sample Episode",
  "sourceType": "mp3",
  "sourceUrl": "",
  "audioFile": "audio/original.mp3",
  "duration": 0,
  "level": "G5-G6",
  "ttsProvider": "openai",
  "ttsModel": "gpt-4o-mini-tts",
  "ttsVoice": "coral",
  "status": "imported",
  "segments": []
}
```

`sourceType` can be:

- `mp3`: original MP3 plus sentence start/end times.
- `text`: pasted or file-based English transcript.
- `srt` / `youtube-srt`: externally generated subtitle file imported into sentence segments.

Text and SRT episodes do not need a single `audioFile`; each enabled segment can point to its own generated MP3.

## Segment

```json
{
  "id": "seg-001",
  "startTime": 0.0,
  "endTime": 4.2,
  "text": "Today we are going to learn about butterflies.",
  "translationHint": "",
  "keywords": [],
  "phraseNotes": [],
  "wordTimings": [],
  "audioFile": "audio/sentences/seg-001.mp3",
  "sourceStartTime": 0.0,
  "sourceEndTime": 4.2,
  "enabledForPractice": true,
  "contentType": "main"
}
```

Playback resolution:

- If `segment.audioFile` exists, the practice app plays that per-sentence MP3 directly.
- Otherwise it falls back to `episode.audioFile` with `segment.startTime` / `segment.endTime`.

Allowed `contentType` values:

- `main`: clean English content for intensive listening and shadowing.
- `intro`: opening, greeting, or framing content.
- `ad`: ad or sponsorship content.
- `music`: music or non-speech audio.
- `note`: parent / teacher note, not part of clean English practice text.

## Progress

```json
{
  "episodeId": "sample-episode-001",
  "stage": "shadowing",
  "currentSegmentId": "seg-012",
  "listened": true,
  "intensiveCompletedIds": [],
  "shadowedIds": [],
  "difficultSegmentIds": [],
  "replayCounts": {},
  "updatedAt": "2026-07-03"
}
```

The browser MVP stores progress in `localStorage` with the key:

```text
english-shadowing-progress:<episode-id>
```
