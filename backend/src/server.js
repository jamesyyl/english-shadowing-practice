import http from "node:http";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getCleanEnglishSegments } from "./asr.js";
import { listEpisodeJsonPaths, readEpisode, validateEpisode } from "./episode.js";
import { buildTextEpisode, segmentsFromSrt, segmentsFromText } from "./text-segments.js";
import { generateTtsForEpisode } from "./tts.js";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const frontendRoot = path.join(repoRoot, "frontend");
const dataRoot = path.join(repoRoot, "data");
const port = Number(process.env.PORT || 5177);

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".mp3": "audio/mpeg"
};

function sendJson(response, status, payload) {
  response.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(payload, null, 2));
}

function readRequestBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";
    request.setEncoding("utf8");
    request.on("data", (chunk) => {
      body += chunk;
      if (body.length > 5_000_000) {
        reject(new Error("Request body too large."));
        request.destroy();
      }
    });
    request.on("end", () => resolve(body ? JSON.parse(body) : {}));
    request.on("error", reject);
  });
}

function getEpisodePath(episodeId) {
  return path.join(repoRoot, "data", "episodes", episodeId, "episode.json");
}

function getAudioPath(episodeId, audioFile = "audio/original.mp3") {
  return path.join(repoRoot, "data", "episodes", episodeId, audioFile);
}

async function writeEpisode(episodeId, episode) {
  const errors = validateEpisode(episode);
  if (errors.length > 0) {
    throw new Error(`Episode validation failed:\n${errors.join("\n")}`);
  }
  await writeFile(getEpisodePath(episodeId), `${JSON.stringify(episode, null, 2)}\n`, "utf8");
}

async function createImportedEpisode({ episodeId, title, sourceType, sourceUrl = "", level = "G5-G6", segments }) {
  const episode = buildTextEpisode({
    id: episodeId,
    title,
    sourceType,
    sourceUrl,
    level,
    segments
  });
  const episodeDir = path.join(repoRoot, "data", "episodes", episodeId);
  await mkdir(episodeDir, { recursive: true });
  await writeEpisode(episodeId, episode);
  return episode;
}

async function listEpisodes() {
  const episodePaths = await listEpisodeJsonPaths(repoRoot);
  const episodes = [];
  for (const episodePath of episodePaths) {
    const episode = await readEpisode(episodePath);
    const cleanCount = getCleanEnglishSegments(episode).length;
    episodes.push({
      id: episode.id,
      title: episode.title,
      status: episode.status,
      duration: episode.duration,
      segmentCount: episode.segments.length,
      cleanSegmentCount: cleanCount
    });
  }
  return episodes;
}

function updateSegment(episode, segmentId, patch) {
  const segment = episode.segments.find((candidate) => candidate.id === segmentId);
  if (!segment) throw new Error(`Segment not found: ${segmentId}`);

  if (patch.contentType !== undefined) segment.contentType = patch.contentType;
  if (patch.enabledForPractice !== undefined) segment.enabledForPractice = Boolean(patch.enabledForPractice);
  if (patch.text !== undefined) segment.text = String(patch.text).trim();
  if (patch.translationHint !== undefined) segment.translationHint = String(patch.translationHint).trim();
  if (patch.keywords !== undefined) segment.keywords = patch.keywords;
  if (patch.phraseNotes !== undefined) segment.phraseNotes = patch.phraseNotes;
  episode.status = "reviewed";
}

function splitSegment(episode, segmentId, splitSegments) {
  const index = episode.segments.findIndex((candidate) => candidate.id === segmentId);
  if (index === -1) throw new Error(`Segment not found: ${segmentId}`);
  if (!Array.isArray(splitSegments) || splitSegments.length < 2) {
    throw new Error("splitSegments must contain at least two segments.");
  }

  const original = episode.segments[index];
  const replacements = splitSegments.map((segment) => {
    const next = {
      ...original,
      ...segment,
      startTime: Number(segment.startTime),
      endTime: Number(segment.endTime),
      text: String(segment.text || "").trim(),
      translationHint: String(segment.translationHint || ""),
      keywords: Array.isArray(segment.keywords) ? segment.keywords : [],
      phraseNotes: Array.isArray(segment.phraseNotes) ? segment.phraseNotes : [],
      wordTimings: Array.isArray(segment.wordTimings) ? segment.wordTimings : []
    };
    if (!next.id) throw new Error("Split segment id is required.");
    if (!Number.isFinite(next.startTime) || !Number.isFinite(next.endTime) || next.startTime >= next.endTime) {
      throw new Error(`Invalid time range for split segment ${next.id}.`);
    }
    if (!next.text) throw new Error(`Split segment ${next.id} text is required.`);
    return next;
  });

  episode.segments.splice(index, 1, ...replacements);
  episode.status = "reviewed";
}

function mergeWithNextSegment(episode, segmentId) {
  const index = episode.segments.findIndex((candidate) => candidate.id === segmentId);
  if (index === -1) throw new Error(`Segment not found: ${segmentId}`);
  if (index >= episode.segments.length - 1) throw new Error(`Segment ${segmentId} has no next segment to merge.`);

  const current = episode.segments[index];
  const next = episode.segments[index + 1];
  const mergedText = `${current.text || ""} ${next.text || ""}`.replace(/\s+([,.!?;:])/g, "$1").replace(/\s+/g, " ").trim();
  if (!mergedText) throw new Error("Merged text is empty.");

  const merged = {
    ...current,
    endTime: Number(next.endTime),
    text: mergedText,
    translationHint: [current.translationHint, next.translationHint].filter(Boolean).join("\n"),
    keywords: [...new Set([...(current.keywords || []), ...(next.keywords || [])])],
    phraseNotes: [...(current.phraseNotes || []), ...(next.phraseNotes || [])],
    wordTimings: [...(current.wordTimings || []), ...(next.wordTimings || [])]
  };

  if (!Number.isFinite(merged.startTime) || !Number.isFinite(merged.endTime) || merged.startTime >= merged.endTime) {
    throw new Error(`Invalid merged time range for ${segmentId}.`);
  }

  episode.segments.splice(index, 2, merged);
  episode.status = "reviewed";
}

async function exportCleanSegments(episodeId, episode) {
  const cleanSegments = getCleanEnglishSegments(episode);
  const outputPath = path.join(repoRoot, "data", "episodes", episodeId, "clean-segments.json");
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(
    outputPath,
    `${JSON.stringify(
      {
        episodeId: episode.id,
        title: episode.title,
        sourceType: episode.sourceType,
        sourceUrl: episode.sourceUrl || "",
        audioFile: episode.audioFile,
        ttsProvider: episode.ttsProvider || "",
        ttsModel: episode.ttsModel || "",
        ttsVoice: episode.ttsVoice || "",
        segmentCount: cleanSegments.length,
        segments: cleanSegments
      },
      null,
      2
    )}\n`,
    "utf8"
  );
  return { output: path.relative(repoRoot, outputPath).replaceAll("\\", "/"), segmentCount: cleanSegments.length };
}

async function serveFile(response, root, relativePath) {
  const filePath = path.join(root, relativePath);
  const resolved = path.resolve(filePath);
  if (!resolved.startsWith(root) || !existsSync(resolved)) {
    sendJson(response, 404, { error: "Not found" });
    return;
  }
  const ext = path.extname(resolved);
  response.writeHead(200, { "content-type": contentTypes[ext] || "application/octet-stream" });
  response.end(await readFile(resolved));
}

async function serveStatic(request, response, pathname) {
  if (pathname.startsWith("/data/")) {
    await serveFile(response, dataRoot, pathname.replace(/^\/data\/?/, ""));
    return;
  }

  let relativePath = pathname.replace(/^\/+/, "");
  if (pathname === "/") relativePath = "review.html";
  if (pathname === "/practice") relativePath = "practice.html";
  await serveFile(response, frontendRoot, relativePath);
}

async function route(request, response) {
  const url = new URL(request.url, `http://${request.headers.host}`);
  const parts = url.pathname.split("/").filter(Boolean);

  try {
    if (url.pathname === "/api/episodes" && request.method === "GET") {
      sendJson(response, 200, { episodes: await listEpisodes() });
      return;
    }

    if (url.pathname === "/api/import/text" && request.method === "POST") {
      const body = await readRequestBody(request);
      const episode = await createImportedEpisode({
        episodeId: body.episodeId,
        title: body.title,
        sourceType: "text",
        sourceUrl: body.sourceUrl || "",
        level: body.level || "G5-G6",
        segments: segmentsFromText(body.text || "")
      });
      sendJson(response, 200, { episode, cleanSegmentCount: getCleanEnglishSegments(episode).length });
      return;
    }

    if (url.pathname === "/api/import/srt" && request.method === "POST") {
      const body = await readRequestBody(request);
      const episode = await createImportedEpisode({
        episodeId: body.episodeId,
        title: body.title,
        sourceType: "youtube-srt",
        sourceUrl: body.sourceUrl || "",
        level: body.level || "G5-G6",
        segments: segmentsFromSrt(body.srt || "")
      });
      sendJson(response, 200, { episode, cleanSegmentCount: getCleanEnglishSegments(episode).length });
      return;
    }

    if (parts[0] === "api" && parts[1] === "episodes" && parts[2]) {
      const episodeId = parts[2];
      const episode = await readEpisode(getEpisodePath(episodeId));

      if (parts.length === 3 && request.method === "GET") {
        sendJson(response, 200, { episode, cleanSegmentCount: getCleanEnglishSegments(episode).length });
        return;
      }

      if (parts[3] === "segments" && parts[4] && request.method === "PATCH") {
        updateSegment(episode, parts[4], await readRequestBody(request));
        await writeEpisode(episodeId, episode);
        sendJson(response, 200, { episode, cleanSegmentCount: getCleanEnglishSegments(episode).length });
        return;
      }

      if (parts[3] === "segments" && parts[4] && parts[5] === "split" && request.method === "POST") {
        const body = await readRequestBody(request);
        splitSegment(episode, parts[4], body.segments);
        await writeEpisode(episodeId, episode);
        sendJson(response, 200, { episode, cleanSegmentCount: getCleanEnglishSegments(episode).length });
        return;
      }

      if (parts[3] === "segments" && parts[4] && parts[5] === "merge-next" && request.method === "POST") {
        mergeWithNextSegment(episode, parts[4]);
        await writeEpisode(episodeId, episode);
        sendJson(response, 200, { episode, cleanSegmentCount: getCleanEnglishSegments(episode).length });
        return;
      }

      if (parts[3] === "export-clean" && request.method === "POST") {
        const result = await exportCleanSegments(episodeId, episode);
        sendJson(response, 200, result);
        return;
      }

      if (parts[3] === "generate-tts" && request.method === "POST") {
        const body = await readRequestBody(request);
        const result = await generateTtsForEpisode({
          repoRoot,
          episode,
          episodeId,
          provider: body.provider || "auto",
          model: body.model || "gpt-4o-mini-tts",
          voice: body.voice || "coral",
          language: body.language || "en",
          force: Boolean(body.force)
        });
        await writeEpisode(episodeId, result.episode);
        sendJson(response, 200, {
          episode: result.episode,
          cleanSegmentCount: getCleanEnglishSegments(result.episode).length,
          provider: result.provider,
          generated: result.generated,
          skipped: result.skipped,
          totalSegments: result.totalSegments
        });
        return;
      }

      if (parts[3] === "audio" && request.method === "GET") {
        const audioPath = getAudioPath(episodeId, episode.audioFile);
        response.writeHead(200, { "content-type": "audio/mpeg" });
        response.end(await readFile(audioPath));
        return;
      }
    }

    await serveStatic(request, response, url.pathname);
  } catch (error) {
    sendJson(response, 500, { error: error.message });
  }
}

const server = http.createServer((request, response) => {
  route(request, response);
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Review UI running at http://127.0.0.1:${port}`);
  console.log(`Practice UI running at http://127.0.0.1:${port}/practice`);
});
