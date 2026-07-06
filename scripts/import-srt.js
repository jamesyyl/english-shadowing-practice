#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildTextEpisode, segmentsFromSrt } from "../backend/src/text-segments.js";
import { validateEpisode } from "../backend/src/episode.js";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];
    if (!key?.startsWith("--")) throw new Error(`Invalid argument near ${key || "(end)"}`);
    const value = argv[index + 1];
    if (value === undefined || value.startsWith("--")) throw new Error(`Missing value for ${key}`);
    args[key.slice(2)] = value;
    index += 1;
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));
if (!args.episodeId || !args.title || !args.input) {
  console.error("Usage: node scripts/import-srt.js --episodeId my-episode --title \"My Episode\" --input captions.srt [--sourceUrl URL] [--level G5-G6]");
  process.exit(1);
}

const inputPath = path.resolve(repoRoot, args.input);
const srtText = await readFile(inputPath, "utf8");
const segments = segmentsFromSrt(srtText);
const episode = buildTextEpisode({
  id: args.episodeId,
  title: args.title,
  sourceType: "youtube-srt",
  sourceUrl: args.sourceUrl || "",
  level: args.level || "G5-G6",
  segments
});

const errors = validateEpisode(episode);
if (errors.length > 0) throw new Error(`Episode validation failed:\n${errors.join("\n")}`);

const episodeDir = path.join(repoRoot, "data", "episodes", args.episodeId);
await mkdir(episodeDir, { recursive: true });
await writeFile(path.join(episodeDir, "episode.json"), `${JSON.stringify(episode, null, 2)}\n`, "utf8");

console.log(JSON.stringify({
  episodeId: episode.id,
  sourceType: episode.sourceType,
  segments: episode.segments.length,
  output: path.relative(repoRoot, path.join(episodeDir, "episode.json")).replaceAll("\\", "/")
}, null, 2));
