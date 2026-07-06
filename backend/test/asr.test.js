import test from "node:test";
import assert from "node:assert/strict";
import { getCleanEnglishSegments, segmentsFromWhisperJson } from "../src/asr.js";

test("segmentsFromWhisperJson converts whisper segments to episode segments", () => {
  const segments = segmentsFromWhisperJson({
    segments: [
      {
        start: 0,
        end: 2.5,
        text: " Today we listen carefully. ",
        words: [
          { word: "Today", start: 0, end: 0.4 },
          { word: "we", start: 0.4, end: 0.6 }
        ]
      }
    ]
  });

  assert.equal(segments.length, 1);
  assert.equal(segments[0].id, "seg-001");
  assert.equal(segments[0].text, "Today we listen carefully.");
  assert.equal(segments[0].contentType, "main");
  assert.equal(segments[0].enabledForPractice, true);
  assert.deepEqual(segments[0].wordTimings[0], {
    word: "Today",
    startTime: 0,
    endTime: 0.4
  });
});

test("getCleanEnglishSegments returns only enabled main content", () => {
  const episode = {
    segments: [
      { id: "seg-001", contentType: "main", enabledForPractice: true },
      { id: "seg-002", contentType: "ad", enabledForPractice: true },
      { id: "seg-003", contentType: "main", enabledForPractice: false },
      { id: "seg-004", contentType: "note", enabledForPractice: false }
    ]
  };

  assert.deepEqual(getCleanEnglishSegments(episode).map((segment) => segment.id), ["seg-001"]);
});
