import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { getCleanEnglishSegments } from "./asr.js";
import { ALLOWED_CONTENT_TYPES, readEpisode, validateEpisode } from "./episode.js";

function assertSegmentPatch(segmentId, patch) {
  if (!segmentId) {
    throw new Error("Review patch segment id is required.");
  }

  if (patch.splitInto !== undefined) {
    if (!Array.isArray(patch.splitInto) || patch.splitInto.length < 2) {
      throw new Error(`splitInto for ${segmentId} must contain at least two segments.`);
    }

    for (const splitSegment of patch.splitInto) {
      assertSegmentPatch(splitSegment.id || segmentId, splitSegment);
    }
  }

  if (patch.contentType !== undefined && !ALLOWED_CONTENT_TYPES.has(patch.contentType)) {
    throw new Error(`Invalid contentType for ${segmentId}: ${patch.contentType}`);
  }

  if (patch.enabledForPractice !== undefined && typeof patch.enabledForPractice !== "boolean") {
    throw new Error(`enabledForPractice for ${segmentId} must be boolean.`);
  }
}

function applyFields(segment, patch) {
  if (patch.contentType !== undefined) segment.contentType = patch.contentType;
  if (patch.enabledForPractice !== undefined) segment.enabledForPractice = patch.enabledForPractice;
  if (patch.text !== undefined) segment.text = String(patch.text).trim();
  if (patch.translationHint !== undefined) segment.translationHint = String(patch.translationHint).trim();
  if (patch.keywords !== undefined) segment.keywords = patch.keywords;
  if (patch.phraseNotes !== undefined) segment.phraseNotes = patch.phraseNotes;
  return segment;
}

function buildSplitSegment(originalSegment, splitPatch) {
  const splitSegment = {
    ...originalSegment,
    id: splitPatch.id,
    startTime: Number(splitPatch.startTime),
    endTime: Number(splitPatch.endTime),
    text: String(splitPatch.text || "").trim(),
    translationHint: "",
    keywords: [],
    phraseNotes: [],
    wordTimings: []
  };

  if (!splitSegment.id) {
    throw new Error("Split segment id is required.");
  }
  if (!Number.isFinite(splitSegment.startTime) || !Number.isFinite(splitSegment.endTime)) {
    throw new Error(`Split segment ${splitSegment.id} must include numeric startTime and endTime.`);
  }
  if (splitSegment.startTime >= splitSegment.endTime) {
    throw new Error(`Split segment ${splitSegment.id} startTime must be before endTime.`);
  }
  if (!splitSegment.text) {
    throw new Error(`Split segment ${splitSegment.id} text is required.`);
  }

  return applyFields(splitSegment, splitPatch);
}

export function applyReviewPatch(episode, reviewPatch) {
  const patches = reviewPatch?.segments || {};

  for (const [segmentId, patch] of Object.entries(patches)) {
    assertSegmentPatch(segmentId, patch);
    const segmentIndex = episode.segments.findIndex((candidate) => candidate.id === segmentId);
    const segment = episode.segments[segmentIndex];
    if (!segment) {
      throw new Error(`Segment not found: ${segmentId}`);
    }

    if (patch.splitInto) {
      const splitSegments = patch.splitInto.map((splitPatch) => buildSplitSegment(segment, splitPatch));
      episode.segments.splice(segmentIndex, 1, ...splitSegments);
    } else {
      applyFields(segment, patch);
    }
  }

  episode.status = "reviewed";
  return episode;
}

export async function applyReviewFile({ repoRoot, episodeId, reviewPath }) {
  const episodeJsonPath = path.join(repoRoot, "data", "episodes", episodeId, "episode.json");
  const episode = await readEpisode(episodeJsonPath);
  const rawPatch = await readFile(reviewPath, "utf8");
  const reviewPatch = JSON.parse(rawPatch);
  const reviewedEpisode = applyReviewPatch(episode, reviewPatch);
  const errors = validateEpisode(reviewedEpisode);

  if (errors.length > 0) {
    throw new Error(`Episode validation failed:\n${errors.join("\n")}`);
  }

  await writeFile(episodeJsonPath, `${JSON.stringify(reviewedEpisode, null, 2)}\n`, "utf8");

  return {
    episode: reviewedEpisode,
    cleanEnglishSegments: getCleanEnglishSegments(reviewedEpisode)
  };
}
