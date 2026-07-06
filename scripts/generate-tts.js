#!/usr/bin/env node
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readEpisode } from "../backend/src/episode.js";
import { generateTtsForEpisode } from "../backend/src/tts.js";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];
    if (!key?.startsWith("--")) throw new Error(`Invalid argument near ${key || "(end)"}`);
    const next = argv[index + 1];
    if (next === undefined || next.startsWith("--")) {
      args[key.slice(2)] = true;
    } else {
      args[key.slice(2)] = next;
      index += 1;
    }
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));
if (!args.episodeId) {
  console.error("Usage: node scripts/generate-tts.js --episodeId my-episode [--provider auto|openai|google] [--model gpt-4o-mini-tts] [--voice coral] [--language en] [--force]");
  process.exit(1);
}

const episodeJsonPath = path.join(repoRoot, "data", "episodes", args.episodeId, "episode.json");
const episode = await readEpisode(episodeJsonPath);
const result = await generateTtsForEpisode({
  repoRoot,
  episode,
  episodeId: args.episodeId,
  provider: args.provider || "auto",
  model: args.model || "gpt-4o-mini-tts",
  voice: args.voice || "coral",
  language: args.language || "en",
  format: args.format || "mp3",
  force: Boolean(args.force)
});

await writeFile(episodeJsonPath, `${JSON.stringify(result.episode, null, 2)}\n`, "utf8");

console.log(JSON.stringify({
  episodeId: result.episode.id,
  provider: result.provider,
  generated: result.generated,
  skipped: result.skipped,
  totalSegments: result.totalSegments
}, null, 2));
