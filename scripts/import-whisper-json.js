#!/usr/bin/env node
import path from "node:path";
import { fileURLToPath } from "node:url";
import { importWhisperJson } from "../backend/src/asr.js";

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

if (!args.episodeId || !args.input) {
  console.error('Usage: node scripts/import-whisper-json.js --episodeId bedtime-old-woman-shoe --input "samples/asr/whisper.json"');
  process.exit(1);
}

const result = await importWhisperJson({
  repoRoot,
  episodeId: args.episodeId,
  whisperJsonPath: path.resolve(repoRoot, args.input)
});

console.log(JSON.stringify({
  episodeId: result.episode.id,
  status: result.episode.status,
  segments: result.episode.segments.length,
  cleanEnglishSegments: result.cleanEnglishSegments.length
}, null, 2));
