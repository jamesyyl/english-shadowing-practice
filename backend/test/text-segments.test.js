import test from "node:test";
import assert from "node:assert/strict";
import { parseSrt, segmentsFromSrt, segmentsFromText, splitEnglishSentences } from "../src/text-segments.js";
import { validateEpisode } from "../src/episode.js";

test("splitEnglishSentences keeps complete English sentences", () => {
  assert.deepEqual(splitEnglishSentences('Hello there. "How are you?" I am fine'), [
    "Hello there.",
    '"How are you?"',
    "I am fine"
  ]);
});

test("parseSrt reads cues and timestamps", () => {
  const cues = parseSrt(`1
00:00:01,000 --> 00:00:02,500
Hello

2
00:00:02,500 --> 00:00:03,000
world.`);

  assert.equal(cues.length, 2);
  assert.equal(cues[0].startTime, 1);
  assert.equal(cues[1].endTime, 3);
});

test("segmentsFromSrt merges cues into complete sentences", () => {
  const segments = segmentsFromSrt(`1
00:00:01,000 --> 00:00:02,000
This is

2
00:00:02,000 --> 00:00:03,000
a full sentence.

3
00:00:03,000 --> 00:00:04,000
Next one!`);

  assert.equal(segments.length, 2);
  assert.equal(segments[0].text, "This is a full sentence.");
  assert.equal(segments[0].sourceStartTime, 1);
  assert.equal(segments[0].sourceEndTime, 3);
  assert.equal(segments[1].text, "Next one!");
});

test("text episodes can validate without a single original audio file", () => {
  const episode = {
    schemaVersion: 1,
    id: "text-sample",
    title: "Text Sample",
    sourceType: "text",
    duration: 0,
    level: "G5-G6",
    status: "imported",
    segments: segmentsFromText("One sentence.")
  };

  assert.deepEqual(validateEpisode(episode), []);
});
