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
  "status": "imported",
  "segments": []
}
```

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
  "enabledForPractice": true,
  "contentType": "main"
}
```

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
