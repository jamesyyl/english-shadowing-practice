#!/usr/bin/env node
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createEpisodeFromMp3 } from "../backend/src/episode.js";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key?.startsWith("--") || value === undefined) {
      throw new Error(`Invalid argument near ${key || "(end)"}`);
    }
    args[key.slice(2)] = value;
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));

if (!args.id || !args.title || !args.audio) {
  console.error('Usage: node scripts/create-episode.js --id sample-episode-001 --title "Sample Episode" --audio "samples/sample.mp3" [--level "G5-G6"] [--sourceUrl "https://..."]');
  process.exit(1);
}

const result = await createEpisodeFromMp3({
  repoRoot,
  id: args.id,
  title: args.title,
  audioPath: path.resolve(repoRoot, args.audio),
  sourceUrl: args.sourceUrl || "",
  level: args.level || "G5-G6"
});

console.log(JSON.stringify({
  id: result.episode.id,
  duration: result.episode.duration,
  episodeJsonPath: path.relative(repoRoot, result.episodeJsonPath).replaceAll("\\", "/")
}, null, 2));
