import { mkdir, copyFile, readFile, writeFile, readdir } from "node:fs/promises";
import path from "node:path";
import { probeAudioDuration } from "./audio.js";

export const ALLOWED_CONTENT_TYPES = new Set(["main", "intro", "ad", "music", "note"]);

export function buildEpisode({ id, title, sourceType = "mp3", sourceUrl = "", level = "G5-G6", duration }) {
  if (!id || !/^[a-z0-9][a-z0-9-]*$/.test(id)) {
    throw new Error("Episode id must use lowercase letters, numbers, and hyphens.");
  }

  if (!title || title.trim().length === 0) {
    throw new Error("Episode title is required.");
  }

  if (!Number.isFinite(duration) || duration <= 0) {
    throw new Error("Episode duration must be greater than 0.");
  }

  return {
    schemaVersion: 1,
    id,
    title: title.trim(),
    sourceType,
    sourceUrl,
    audioFile: "audio/original.mp3",
    duration,
    level,
    status: "imported",
    segments: []
  };
}

export function validateEpisode(episode) {
  const errors = [];

  if (episode.schemaVersion !== 1) errors.push("schemaVersion must be 1");
  if (!episode.id) errors.push("id is required");
  if (!episode.title) errors.push("title is required");
  if (episode.sourceType !== "mp3") errors.push("sourceType must be mp3 for MVP");
  if (episode.audioFile !== "audio/original.mp3") errors.push("audioFile must be audio/original.mp3");
  if (!Number.isFinite(episode.duration) || episode.duration <= 0) errors.push("duration must be greater than 0");
  if (!episode.level) errors.push("level is required");
  if (!["imported", "transcribed", "reviewed", "ready"].includes(episode.status)) errors.push("status is invalid");
  if (!Array.isArray(episode.segments)) errors.push("segments must be an array");

  if (Array.isArray(episode.segments)) {
    for (const segment of episode.segments) {
      if (!segment.id) errors.push("segment id is required");
      if (!ALLOWED_CONTENT_TYPES.has(segment.contentType)) {
        errors.push(`segment ${segment.id || "(missing id)"} has invalid contentType`);
      }
      if (segment.enabledForPractice !== true && segment.enabledForPractice !== false) {
        errors.push(`segment ${segment.id || "(missing id)"} enabledForPractice must be boolean`);
      }
    }
  }

  return errors;
}

export async function createEpisodeFromMp3({ repoRoot, id, title, audioPath, sourceUrl = "", level = "G5-G6" }) {
  const episodeDir = path.join(repoRoot, "data", "episodes", id);
  const audioDir = path.join(episodeDir, "audio");
  const targetAudioPath = path.join(audioDir, "original.mp3");
  const episodeJsonPath = path.join(episodeDir, "episode.json");

  const duration = await probeAudioDuration(audioPath);
  const episode = buildEpisode({
    id,
    title,
    sourceType: "mp3",
    sourceUrl,
    level,
    duration
  });

  await mkdir(audioDir, { recursive: true });
  await copyFile(audioPath, targetAudioPath);
  await writeFile(episodeJsonPath, `${JSON.stringify(episode, null, 2)}\n`, "utf8");

  return { episode, episodeJsonPath, targetAudioPath };
}

export async function readEpisode(episodeJsonPath) {
  const raw = await readFile(episodeJsonPath, "utf8");
  return JSON.parse(raw);
}

export async function listEpisodeJsonPaths(repoRoot) {
  const episodesRoot = path.join(repoRoot, "data", "episodes");
  let entries = [];
  try {
    entries = await readdir(episodesRoot, { withFileTypes: true });
  } catch {
    return [];
  }

  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(episodesRoot, entry.name, "episode.json"));
}
