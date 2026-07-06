import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { validateEpisode } from "./episode.js";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function sanitizeText(text) {
  return String(text || "").replace(/\s+/g, " ").trim();
}

function splitGoogleChunks(text) {
  const words = sanitizeText(text).split(" ");
  const chunks = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > 180 && current) {
      chunks.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

async function fetchWithRetry(url, options, retries = 2) {
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const response = await fetch(url, options);
      if (!response.ok) {
        const detail = await response.text().catch(() => "");
        throw new Error(`${response.status} ${response.statusText}${detail ? `: ${detail.slice(0, 240)}` : ""}`);
      }
      return Buffer.from(await response.arrayBuffer());
    } catch (error) {
      lastError = error;
      if (attempt < retries) await sleep(750 * (attempt + 1));
    }
  }
  throw lastError;
}

async function synthesizeOpenAi({ text, model, voice, format }) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is required for OpenAI TTS.");
  return fetchWithRetry("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      voice,
      input: text,
      response_format: format
    })
  });
}

async function synthesizeGoogleTranslate({ text, language }) {
  const chunks = splitGoogleChunks(text);
  const buffers = [];
  for (const chunk of chunks) {
    const url = new URL("https://translate.google.com/translate_tts");
    url.searchParams.set("ie", "UTF-8");
    url.searchParams.set("client", "tw-ob");
    url.searchParams.set("tl", language);
    url.searchParams.set("q", chunk);
    buffers.push(await fetchWithRetry(url, {
      headers: {
        "User-Agent": "Mozilla/5.0"
      }
    }));
    await sleep(150);
  }
  return Buffer.concat(buffers);
}

export async function generateTtsForEpisode({
  repoRoot,
  episode,
  episodeId,
  provider = "auto",
  model = "gpt-4o-mini-tts",
  voice = "coral",
  language = "en",
  format = "mp3",
  force = false
}) {
  const resolvedProvider = provider === "auto" ? (process.env.OPENAI_API_KEY ? "openai" : "google") : provider;
  if (!["openai", "google"].includes(resolvedProvider)) {
    throw new Error("provider must be auto, openai, or google");
  }

  const audioDir = path.join(repoRoot, "data", "episodes", episodeId, "audio", "sentences");
  await mkdir(audioDir, { recursive: true });

  let generated = 0;
  let skipped = 0;

  for (const segment of episode.segments) {
    if (!segment.enabledForPractice || segment.contentType !== "main") continue;
    const text = sanitizeText(segment.text);
    if (!text) continue;

    const relativeAudioFile = `audio/sentences/${segment.id}.${format}`;
    const targetPath = path.join(repoRoot, "data", "episodes", episodeId, relativeAudioFile);
    segment.audioFile = relativeAudioFile;

    if (!force) {
      try {
        await readFile(targetPath);
        skipped += 1;
        continue;
      } catch {
        // Generate missing file.
      }
    }

    const audio =
      resolvedProvider === "openai"
        ? await synthesizeOpenAi({ text, model, voice, format })
        : await synthesizeGoogleTranslate({ text, language });
    await writeFile(targetPath, audio);
    generated += 1;
  }

  episode.ttsProvider = resolvedProvider === "openai" ? "openai" : "google-translate";
  episode.ttsModel = resolvedProvider === "openai" ? model : "translate_tts";
  episode.ttsVoice = resolvedProvider === "openai" ? voice : language;
  episode.status = "ready";

  const errors = validateEpisode(episode);
  if (errors.length > 0) throw new Error(`Episode validation failed:\n${errors.join("\n")}`);

  return {
    episode,
    provider: episode.ttsProvider,
    generated,
    skipped,
    totalSegments: episode.segments.filter((segment) => segment.enabledForPractice && segment.contentType === "main").length
  };
}
