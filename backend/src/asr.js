import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { readEpisode, validateEpisode } from "./episode.js";

function normalizeText(text) {
  return String(text || "").replace(/\s+/g, " ").trim();
}

function normalizeWordTiming(word) {
  return {
    word: normalizeText(word.word),
    startTime: Number(word.start ?? word.startTime),
    endTime: Number(word.end ?? word.endTime)
  };
}

export function segmentsFromWhisperJson(whisperJson) {
  if (!Array.isArray(whisperJson?.segments)) {
    throw new Error("Whisper JSON must contain a segments array.");
  }

  return whisperJson.segments
    .map((segment, index) => {
      const text = normalizeText(segment.text);
      return {
        id: `seg-${String(index + 1).padStart(3, "0")}`,
        startTime: Number(segment.start),
        endTime: Number(segment.end),
        text,
        translationHint: "",
        keywords: [],
        phraseNotes: [],
        wordTimings: Array.isArray(segment.words) ? segment.words.map(normalizeWordTiming) : [],
        enabledForPractice: text.length > 0,
        contentType: "main"
      };
    })
    .filter((segment) => segment.text.length > 0);
}

export function getCleanEnglishSegments(episode) {
  return episode.segments.filter((segment) => segment.enabledForPractice && segment.contentType === "main");
}

export async function importWhisperJson({ repoRoot, episodeId, whisperJsonPath }) {
  const episodeJsonPath = path.join(repoRoot, "data", "episodes", episodeId, "episode.json");
  const asrDir = path.join(repoRoot, "data", "episodes", episodeId, "asr");
  const raw = await readFile(whisperJsonPath, "utf8");
  const whisperJson = JSON.parse(raw);
  const episode = await readEpisode(episodeJsonPath);

  episode.segments = segmentsFromWhisperJson(whisperJson);
  episode.status = "transcribed";

  const errors = validateEpisode(episode);
  if (errors.length > 0) {
    throw new Error(`Episode validation failed:\n${errors.join("\n")}`);
  }

  await mkdir(asrDir, { recursive: true });
  await writeFile(path.join(asrDir, "whisper.json"), `${JSON.stringify(whisperJson, null, 2)}\n`, "utf8");
  await writeFile(episodeJsonPath, `${JSON.stringify(episode, null, 2)}\n`, "utf8");

  return { episode, cleanEnglishSegments: getCleanEnglishSegments(episode) };
}
