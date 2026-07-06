import test from "node:test";
import assert from "node:assert/strict";
import { applyReviewPatch } from "../src/review.js";

test("applyReviewPatch marks non-practice segments and updates status", () => {
  const episode = {
    status: "transcribed",
    segments: [
      {
        id: "seg-001",
        text: "Intro",
        contentType: "main",
        enabledForPractice: true,
        translationHint: "",
        keywords: [],
        phraseNotes: []
      },
      {
        id: "seg-002",
        text: "Story starts here.",
        contentType: "main",
        enabledForPractice: true,
        translationHint: "",
        keywords: [],
        phraseNotes: []
      }
    ]
  };

  const reviewed = applyReviewPatch(episode, {
    segments: {
      "seg-001": {
        contentType: "intro",
        enabledForPractice: false
      }
    }
  });

  assert.equal(reviewed.status, "reviewed");
  assert.equal(reviewed.segments[0].contentType, "intro");
  assert.equal(reviewed.segments[0].enabledForPractice, false);
  assert.equal(reviewed.segments[1].contentType, "main");
  assert.equal(reviewed.segments[1].enabledForPractice, true);
});

test("applyReviewPatch rejects unknown content type", () => {
  const episode = {
    status: "transcribed",
    segments: [{ id: "seg-001", contentType: "main", enabledForPractice: true }]
  };

  assert.throws(
    () => applyReviewPatch(episode, { segments: { "seg-001": { contentType: "teacher" } } }),
    /Invalid contentType/
  );
});

test("applyReviewPatch splits a mixed segment into intro and main content", () => {
  const episode = {
    status: "transcribed",
    segments: [
      {
        id: "seg-007",
        startTime: 22.92,
        endTime: 29.96,
        text: "Title, there was once a little goblin woman who had",
        contentType: "main",
        enabledForPractice: true,
        translationHint: "",
        keywords: [],
        phraseNotes: [],
        wordTimings: [{ word: "Title", startTime: 22.92, endTime: 23.4 }]
      },
      {
        id: "seg-008",
        startTime: 29.96,
        endTime: 30.96,
        text: "six sons.",
        contentType: "main",
        enabledForPractice: true,
        translationHint: "",
        keywords: [],
        phraseNotes: [],
        wordTimings: []
      }
    ]
  };

  const reviewed = applyReviewPatch(episode, {
    segments: {
      "seg-007": {
        splitInto: [
          {
            id: "seg-007-title",
            startTime: 22.92,
            endTime: 26.2,
            text: "Title.",
            contentType: "intro",
            enabledForPractice: false
          },
          {
            id: "seg-007",
            startTime: 26.2,
            endTime: 29.96,
            text: "There was once a little goblin woman who had",
            contentType: "main",
            enabledForPractice: true
          }
        ]
      }
    }
  });

  assert.equal(reviewed.segments.length, 3);
  assert.equal(reviewed.segments[0].id, "seg-007-title");
  assert.equal(reviewed.segments[0].contentType, "intro");
  assert.equal(reviewed.segments[0].enabledForPractice, false);
  assert.deepEqual(reviewed.segments[0].wordTimings, []);
  assert.equal(reviewed.segments[1].id, "seg-007");
  assert.equal(reviewed.segments[1].text, "There was once a little goblin woman who had");
  assert.equal(reviewed.segments[2].id, "seg-008");
});
