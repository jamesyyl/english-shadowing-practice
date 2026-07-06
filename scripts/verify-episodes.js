#!/usr/bin/env node
import path from "node:path";
import { fileURLToPath } from "node:url";
import { access } from "node:fs/promises";
import { listEpisodeJsonPaths, readEpisode, validateEpisode } from "../backend/src/episode.js";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const episodePaths = await listEpisodeJsonPaths(repoRoot);
let failed = false;

for (const episodePath of episodePaths) {
  const episode = await readEpisode(episodePath);
  const errors = validateEpisode(episode);
  const episodeDir = path.dirname(episodePath);
  for (const segment of episode.segments || []) {
    if (!segment.enabledForPractice || segment.contentType !== "main" || !segment.audioFile) continue;
    try {
      await access(path.join(episodeDir, segment.audioFile));
    } catch {
      errors.push(`segment ${segment.id} audioFile is missing: ${segment.audioFile}`);
    }
  }
  if (errors.length > 0) {
    failed = true;
    console.error(`${path.relative(repoRoot, episodePath)}:`);
    for (const error of errors) console.error(`  - ${error}`);
  }
}

if (failed) {
  process.exit(1);
}

console.log(JSON.stringify({ episodes: episodePaths.length, status: "ok" }, null, 2));
