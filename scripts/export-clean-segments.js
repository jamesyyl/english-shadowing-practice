#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getCleanEnglishSegments } from "../backend/src/asr.js";
import { readEpisode } from "../backend/src/episode.js";

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

if (!args.episodeId) {
  console.error("Usage: node scripts/export-clean-segments.js --episodeId bedtime-old-woman-shoe [--output data/episodes/.../clean-segments.json]");
  process.exit(1);
}

const episodeJsonPath = path.join(repoRoot, "data", "episodes", args.episodeId, "episode.json");
const outputPath = path.resolve(
  repoRoot,
  args.output || path.join("data", "episodes", args.episodeId, "clean-segments.json")
);
const episode = await readEpisode(episodeJsonPath);
const cleanEnglishSegments = getCleanEnglishSegments(episode);

await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(
  outputPath,
  `${JSON.stringify(
    {
      episodeId: episode.id,
      title: episode.title,
      audioFile: episode.audioFile,
      segmentCount: cleanEnglishSegments.length,
      segments: cleanEnglishSegments
    },
    null,
    2
  )}\n`,
  "utf8"
);

console.log(JSON.stringify({
  episodeId: episode.id,
  cleanEnglishSegments: cleanEnglishSegments.length,
  output: path.relative(repoRoot, outputPath).replaceAll("\\", "/")
}, null, 2));
