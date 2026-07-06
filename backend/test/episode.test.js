import test from "node:test";
import assert from "node:assert/strict";
import { buildEpisode, validateEpisode } from "../src/episode.js";

test("buildEpisode creates MVP episode metadata", () => {
  const episode = buildEpisode({
    id: "sample-episode-001",
    title: "Sample Episode",
    duration: 123.45
  });

  assert.equal(episode.schemaVersion, 1);
  assert.equal(episode.id, "sample-episode-001");
  assert.equal(episode.sourceType, "mp3");
  assert.equal(episode.audioFile, "audio/original.mp3");
  assert.equal(episode.status, "imported");
  assert.deepEqual(episode.segments, []);
});

test("validateEpisode accepts a clean imported episode", () => {
  const episode = buildEpisode({
    id: "sample-episode-001",
    title: "Sample Episode",
    duration: 123.45
  });

  assert.deepEqual(validateEpisode(episode), []);
});

test("validateEpisode rejects invalid segment content type", () => {
  const episode = buildEpisode({
    id: "sample-episode-001",
    title: "Sample Episode",
    duration: 123.45
  });
  episode.segments.push({
    id: "seg-001",
    contentType: "explanation",
    enabledForPractice: true
  });

  assert.match(validateEpisode(episode).join("\n"), /invalid contentType/);
});
