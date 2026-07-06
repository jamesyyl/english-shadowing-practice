function normalizeText(text) {
  return String(text || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\{\\an\d+\}/g, " ")
    .replace(/[ \t\r\n]+/g, " ")
    .trim();
}

function parseTimestamp(value) {
  const match = String(value || "").match(/^(\d{1,2}):(\d{2}):(\d{2})[,.](\d{1,3})$/);
  if (!match) throw new Error(`Invalid SRT timestamp: ${value}`);
  const [, hours, minutes, seconds, millis] = match;
  return (
    Number(hours) * 3600 +
    Number(minutes) * 60 +
    Number(seconds) +
    Number(millis.padEnd(3, "0")) / 1000
  );
}

function terminalIndex(text) {
  for (let index = 0; index < text.length; index += 1) {
    if (!/[.!?]/.test(text[index])) continue;
    let end = index + 1;
    while (end < text.length && /["')\]]/.test(text[end])) end += 1;
    if (end === text.length || /\s/.test(text[end])) return end;
  }
  return -1;
}

export function splitEnglishSentences(text) {
  const normalized = normalizeText(text);
  if (!normalized) return [];

  const sentences = [];
  let buffer = normalized;
  while (buffer.length > 0) {
    const end = terminalIndex(buffer);
    if (end < 0) break;
    const sentence = buffer.slice(0, end).trim();
    if (sentence) sentences.push(sentence);
    buffer = buffer.slice(end).trim();
  }
  if (buffer) sentences.push(buffer);
  return sentences;
}

export function parseSrt(srtText) {
  const blocks = String(srtText || "")
    .replace(/^\uFEFF/, "")
    .split(/\r?\n\s*\r?\n/)
    .map((block) => block.trim())
    .filter(Boolean);

  return blocks.map((block, index) => {
    const lines = block.split(/\r?\n/).map((line) => line.trim());
    const timeIndex = lines.findIndex((line) => line.includes("-->"));
    if (timeIndex < 0) throw new Error(`SRT block ${index + 1} is missing a timestamp line.`);
    const [startRaw, endRaw] = lines[timeIndex].split("-->").map((part) => part.trim().split(/\s+/)[0]);
    const text = normalizeText(lines.slice(timeIndex + 1).join(" "));
    return {
      index: Number(/^\d+$/.test(lines[0]) ? lines[0] : index + 1),
      startTime: parseTimestamp(startRaw),
      endTime: parseTimestamp(endRaw),
      text
    };
  }).filter((cue) => cue.text);
}

function buildSegment({ index, text, sourceStartTime = 0, sourceEndTime = 0 }) {
  return {
    id: `sent-${String(index).padStart(3, "0")}`,
    startTime: sourceStartTime,
    endTime: sourceEndTime,
    sourceStartTime,
    sourceEndTime,
    text,
    translationHint: "",
    keywords: [],
    phraseNotes: [],
    wordTimings: [],
    enabledForPractice: text.length > 0,
    contentType: "main"
  };
}

export function segmentsFromText(text) {
  return splitEnglishSentences(text).map((sentence, index) =>
    buildSegment({ index: index + 1, text: sentence })
  );
}

export function segmentsFromSrt(srtText) {
  const cues = parseSrt(srtText);
  const segments = [];
  let buffer = "";
  let sourceStartTime = null;
  let sourceEndTime = 0;

  for (const cue of cues) {
    if (sourceStartTime === null) sourceStartTime = cue.startTime;
    sourceEndTime = cue.endTime;
    buffer = normalizeText(`${buffer} ${cue.text}`);

    let end = terminalIndex(buffer);
    while (end >= 0) {
      const sentence = buffer.slice(0, end).trim();
      if (sentence) {
        segments.push(buildSegment({
          index: segments.length + 1,
          text: sentence,
          sourceStartTime,
          sourceEndTime
        }));
      }
      buffer = buffer.slice(end).trim();
      sourceStartTime = buffer ? cue.startTime : null;
      end = terminalIndex(buffer);
    }
  }

  if (buffer) {
    segments.push(buildSegment({
      index: segments.length + 1,
      text: buffer,
      sourceStartTime: sourceStartTime ?? 0,
      sourceEndTime
    }));
  }

  return segments;
}

export function buildTextEpisode({ id, title, sourceType, sourceUrl = "", level = "G5-G6", segments }) {
  if (!id || !/^[a-z0-9][a-z0-9-]*$/.test(id)) {
    throw new Error("Episode id must use lowercase letters, numbers, and hyphens.");
  }
  if (!title || title.trim().length === 0) {
    throw new Error("Episode title is required.");
  }
  if (!Array.isArray(segments) || segments.length === 0) {
    throw new Error("At least one segment is required.");
  }

  return {
    schemaVersion: 1,
    id,
    title: title.trim(),
    sourceType,
    sourceUrl,
    duration: Math.max(...segments.map((segment) => Number(segment.sourceEndTime || segment.endTime || 0))),
    level,
    status: "imported",
    segments
  };
}
