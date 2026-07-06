#!/usr/bin/env node
import path from "node:path";
import { fileURLToPath } from "node:url";
import { applyReviewFile } from "../backend/src/review.js";

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

if (!args.episodeId || !args.review) {
  console.error('Usage: node scripts/apply-segment-review.js --episodeId bedtime-old-woman-shoe --review "data/episodes/bedtime-old-woman-shoe/review.json"');
  process.exit(1);
}

const result = await applyReviewFile({
  repoRoot,
  episodeId: args.episodeId,
  reviewPath: path.resolve(repoRoot, args.review)
});

console.log(JSON.stringify({
  episodeId: result.episode.id,
  status: result.episode.status,
  segments: result.episode.segments.length,
  cleanEnglishSegments: result.cleanEnglishSegments.length
}, null, 2));
