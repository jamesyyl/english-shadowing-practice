#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getCleanEnglishSegments } from "../backend/src/asr.js";
import { listEpisodeJsonPaths, readEpisode } from "../backend/src/episode.js";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const episodePaths = await listEpisodeJsonPaths(repoRoot);
const episodes = [];

for (const episodePath of episodePaths) {
  const episode = await readEpisode(episodePath);
  episodes.push({
    id: episode.id,
    title: episode.title,
    sourceType: episode.sourceType,
    status: episode.status,
    segmentCount: episode.segments.length,
    cleanSegmentCount: getCleanEnglishSegments(episode).length,
    ttsProvider: episode.ttsProvider || ""
  });
}

episodes.sort((a, b) => a.title.localeCompare(b.title));

const outputPath = path.join(repoRoot, "data", "episodes", "index.json");
await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify({ episodes }, null, 2)}\n`, "utf8");

console.log(JSON.stringify({
  episodes: episodes.length,
  output: path.relative(repoRoot, outputPath).replaceAll("\\", "/")
}, null, 2));
