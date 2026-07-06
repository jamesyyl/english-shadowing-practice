const state = {
  episodes: [],
  episode: null,
  selectedId: null,
  filter: ""
};

const els = {
  episodeSelect: document.querySelector("#episode-select"),
  statusLabel: document.querySelector("#status-label"),
  segmentCount: document.querySelector("#segment-count"),
  cleanCount: document.querySelector("#clean-count"),
  importMode: document.querySelector("#import-mode"),
  importId: document.querySelector("#import-id"),
  importTitle: document.querySelector("#import-title"),
  importSource: document.querySelector("#import-source"),
  importContent: document.querySelector("#import-content"),
  createEpisode: document.querySelector("#create-episode"),
  ttsProvider: document.querySelector("#tts-provider"),
  ttsVoice: document.querySelector("#tts-voice"),
  ttsModel: document.querySelector("#tts-model"),
  ttsForce: document.querySelector("#tts-force"),
  generateTts: document.querySelector("#generate-tts"),
  exportAfterTts: document.querySelector("#export-after-tts"),
  segments: document.querySelector("#segments"),
  filter: document.querySelector("#filter-input"),
  exportClean: document.querySelector("#export-clean"),
  audio: document.querySelector("#audio"),
  playSegment: document.querySelector("#play-segment"),
  form: document.querySelector("#segment-form"),
  id: document.querySelector("#segment-id"),
  start: document.querySelector("#segment-start"),
  end: document.querySelector("#segment-end"),
  text: document.querySelector("#segment-text"),
  type: document.querySelector("#segment-type"),
  enabled: document.querySelector("#segment-enabled"),
  hint: document.querySelector("#segment-hint"),
  keywords: document.querySelector("#segment-keywords"),
  phrases: document.querySelector("#segment-phrases"),
  splitTime: document.querySelector("#split-time"),
  splitIdA: document.querySelector("#split-id-a"),
  splitIdB: document.querySelector("#split-id-b"),
  splitTextA: document.querySelector("#split-text-a"),
  splitTextB: document.querySelector("#split-text-b"),
  applySplit: document.querySelector("#apply-split"),
  mergeNext: document.querySelector("#merge-next"),
  message: document.querySelector("#message")
};

function showMessage(message) {
  els.message.textContent = message;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: options.body ? { "content-type": "application/json" } : undefined,
    ...options
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || "Request failed");
  return payload;
}

function selectedSegment() {
  return state.episode?.segments.find((segment) => segment.id === state.selectedId) || null;
}

function renderMetrics(cleanSegmentCount) {
  els.statusLabel.textContent = state.episode?.status || "-";
  els.segmentCount.textContent = state.episode?.segments.length ?? "-";
  els.cleanCount.textContent = cleanSegmentCount ?? state.episode?.segments.filter((segment) => segment.enabledForPractice && segment.contentType === "main").length ?? "-";
}

function renderEpisodes() {
  els.episodeSelect.innerHTML = state.episodes
    .map((episode) => `<option value="${escapeHtml(episode.id)}">${escapeHtml(episode.title)}</option>`)
    .join("");
}

function renderSegments() {
  const filter = state.filter.trim().toLowerCase();
  const rows = state.episode.segments.filter((segment) => {
    if (!filter) return true;
    return `${segment.id} ${segment.text} ${segment.contentType}`.toLowerCase().includes(filter);
  });

  els.segments.innerHTML = rows
    .map((segment) => {
      const active = segment.id === state.selectedId ? " active" : "";
      const off = !segment.enabledForPractice ? " off" : "";
      return `
        <button class="segment-row${active}" data-id="${escapeHtml(segment.id)}">
          <span class="id">${escapeHtml(segment.id)}</span>
          <span class="copy">${escapeHtml(segment.text)}</span>
          <span class="pill${off}">${escapeHtml(segment.contentType)}${segment.enabledForPractice ? "" : " off"}</span>
        </button>
      `;
    })
    .join("");
}

function renderEditor() {
  const segment = selectedSegment();
  if (!segment) return;

  els.id.value = segment.id;
  els.start.value = segment.startTime;
  els.end.value = segment.endTime;
  els.text.value = segment.text;
  els.type.value = segment.contentType;
  els.enabled.checked = segment.enabledForPractice;
  els.hint.value = segment.translationHint || "";
  els.keywords.value = (segment.keywords || []).join(", ");
  els.phrases.value = (segment.phraseNotes || []).join("\n");

  const midpoint = ((Number(segment.startTime) + Number(segment.endTime)) / 2).toFixed(2);
  els.splitTime.value = midpoint;
  els.splitIdA.value = `${segment.id}-a`;
  els.splitIdB.value = segment.id;
  const text = segment.text || "";
  const commaIndex = text.indexOf(",");
  const splitIndex = commaIndex > -1 ? commaIndex + 1 : Math.ceil(text.length / 2);
  els.splitTextA.value = text.slice(0, splitIndex).trim();
  els.splitTextB.value = text.slice(splitIndex).trim();
}

async function loadEpisode(episodeId) {
  const payload = await api(`/api/episodes/${episodeId}`);
  state.episode = payload.episode;
  state.selectedId = state.episode.segments[0]?.id || null;
  els.audio.src = state.episode.audioFile ? `/api/episodes/${episodeId}/audio` : "";
  renderMetrics(payload.cleanSegmentCount);
  renderSegments();
  renderEditor();
}

async function loadEpisodes() {
  const payload = await api("/api/episodes");
  state.episodes = payload.episodes;
  renderEpisodes();
  if (state.episodes[0]) {
    await loadEpisode(state.episodes[0].id);
  }
}

function segmentPayloadFromForm() {
  return {
    text: els.text.value,
    contentType: els.type.value,
    enabledForPractice: els.enabled.checked,
    translationHint: els.hint.value,
    keywords: els.keywords.value.split(",").map((item) => item.trim()).filter(Boolean),
    phraseNotes: els.phrases.value.split("\n").map((item) => item.trim()).filter(Boolean)
  };
}

async function saveSelectedSegment(event) {
  event.preventDefault();
  const episodeId = state.episode.id;
  const segmentId = state.selectedId;
  const payload = await api(`/api/episodes/${episodeId}/segments/${segmentId}`, {
    method: "PATCH",
    body: JSON.stringify(segmentPayloadFromForm())
  });
  state.episode = payload.episode;
  renderMetrics(payload.cleanSegmentCount);
  renderSegments();
  renderEditor();
  showMessage(`Saved ${segmentId}`);
}

function playSelectedSegment() {
  const segment = selectedSegment();
  if (!segment) return;
  if (segment.audioFile) {
    els.audio.src = `/data/episodes/${state.episode.id}/${segment.audioFile}`;
    els.audio.currentTime = 0;
    els.audio.play();
    return;
  }
  els.audio.currentTime = segment.startTime;
  els.audio.play();
  const stopAt = segment.endTime;
  const stop = () => {
    if (els.audio.currentTime >= stopAt) {
      els.audio.pause();
      els.audio.removeEventListener("timeupdate", stop);
    }
  };
  els.audio.addEventListener("timeupdate", stop);
}

async function splitSelectedSegment() {
  const segment = selectedSegment();
  if (!segment) return;

  const splitTime = Number(els.splitTime.value);
  const payload = {
    segments: [
      {
        id: els.splitIdA.value.trim(),
        startTime: Number(segment.startTime),
        endTime: splitTime,
        text: els.splitTextA.value,
        contentType: "intro",
        enabledForPractice: false
      },
      {
        id: els.splitIdB.value.trim(),
        startTime: splitTime,
        endTime: Number(segment.endTime),
        text: els.splitTextB.value,
        contentType: "main",
        enabledForPractice: true
      }
    ]
  };
  const result = await api(`/api/episodes/${state.episode.id}/segments/${segment.id}/split`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
  state.episode = result.episode;
  state.selectedId = payload.segments[1].id;
  renderMetrics(result.cleanSegmentCount);
  renderSegments();
  renderEditor();
  showMessage(`Split ${segment.id}`);
}

async function mergeSelectedWithNextSegment() {
  const segment = selectedSegment();
  if (!segment) return;

  const result = await api(`/api/episodes/${state.episode.id}/segments/${segment.id}/merge-next`, {
    method: "POST",
    body: "{}"
  });
  state.episode = result.episode;
  state.selectedId = segment.id;
  renderMetrics(result.cleanSegmentCount);
  renderSegments();
  renderEditor();
  showMessage(`Merged ${segment.id} with next segment`);
}

async function exportCleanSegments() {
  const result = await api(`/api/episodes/${state.episode.id}/export-clean`, { method: "POST", body: "{}" });
  showMessage(`Exported ${result.segmentCount} segments to ${result.output}`);
}

async function createEpisodeFromImport() {
  const mode = els.importMode.value;
  const episodeId = els.importId.value.trim();
  const title = els.importTitle.value.trim();
  const sourceUrl = els.importSource.value.trim();
  const content = els.importContent.value;
  const endpoint = mode === "srt" ? "/api/import/srt" : "/api/import/text";
  const body = mode === "srt"
    ? { episodeId, title, sourceUrl, srt: content }
    : { episodeId, title, sourceUrl, text: content };

  if (!episodeId || !title || !content.trim()) {
    throw new Error("Episode id, title, and content are required.");
  }

  showMessage(`Creating ${episodeId}...`);
  await api(endpoint, { method: "POST", body: JSON.stringify(body) });
  await loadEpisodes();
  els.episodeSelect.value = episodeId;
  await loadEpisode(episodeId);
  showMessage(`Created ${episodeId}. Review sentences, then generate TTS.`);
}

async function generateTtsForSelectedEpisode() {
  if (!state.episode) return;
  showMessage(`Generating TTS for ${state.episode.id}. This can take several minutes...`);
  const result = await api(`/api/episodes/${state.episode.id}/generate-tts`, {
    method: "POST",
    body: JSON.stringify({
      provider: els.ttsProvider.value,
      voice: els.ttsVoice.value.trim() || "coral",
      model: els.ttsModel.value.trim() || "gpt-4o-mini-tts",
      force: els.ttsForce.checked
    })
  });
  state.episode = result.episode;
  renderMetrics(result.cleanSegmentCount);
  renderSegments();
  renderEditor();
  showMessage(`TTS complete: ${result.generated} generated, ${result.skipped} skipped, provider ${result.provider}.`);
}

els.episodeSelect.addEventListener("change", () => loadEpisode(els.episodeSelect.value).catch((error) => showMessage(error.message)));
els.filter.addEventListener("input", () => {
  state.filter = els.filter.value;
  renderSegments();
});
els.segments.addEventListener("click", (event) => {
  const button = event.target.closest("[data-id]");
  if (!button) return;
  state.selectedId = button.dataset.id;
  renderSegments();
  renderEditor();
});
els.form.addEventListener("submit", (event) => saveSelectedSegment(event).catch((error) => showMessage(error.message)));
els.playSegment.addEventListener("click", playSelectedSegment);
els.applySplit.addEventListener("click", () => splitSelectedSegment().catch((error) => showMessage(error.message)));
els.mergeNext.addEventListener("click", () => mergeSelectedWithNextSegment().catch((error) => showMessage(error.message)));
els.exportClean.addEventListener("click", () => exportCleanSegments().catch((error) => showMessage(error.message)));
els.createEpisode.addEventListener("click", () => createEpisodeFromImport().catch((error) => showMessage(error.message)));
els.generateTts.addEventListener("click", () => generateTtsForSelectedEpisode().catch((error) => showMessage(error.message)));
els.exportAfterTts.addEventListener("click", () => exportCleanSegments().catch((error) => showMessage(error.message)));

loadEpisodes().catch((error) => showMessage(error.message));
