const defaultEpisodeId = "youtube-shadowing-steps";
const requestedEpisodeId = new URLSearchParams(window.location.search).get("episode") || defaultEpisodeId;

const fallbackFocus = {
  summary:
    "先聽完整內容，抓住主題、關鍵步驟和重複出現的英文表達。第二階段再逐句精聽，第三階段跟著音訊開口 shadowing。",
  chips: ["main idea", "key steps", "phrases", "rhythm", "shadowing", "review"]
};

const state = {
  stage: "listen",
  episodeId: requestedEpisodeId,
  episodeOptions: [],
  episode: null,
  segments: [],
  dataBase: "",
  currentIndex: 0,
  listenSequenceIndex: 0,
  progress: {
    stage: "listen",
    currentSegmentId: "",
    listened: false,
    intensiveCompletedIds: [],
    shadowedIds: [],
    difficultIds: [],
    replayCounts: {},
    updatedAt: ""
  },
  stopHandler: null
};

const els = {
  title: document.querySelector("#episode-title"),
  episodeSelect: document.querySelector("#episode-select"),
  stageLabel: document.querySelector("#stage-label"),
  overallProgress: document.querySelector("#overall-progress"),
  audio: document.querySelector("#episode-audio"),
  currentTime: document.querySelector("#current-time"),
  duration: document.querySelector("#duration"),
  tabs: document.querySelectorAll(".stage-tab"),
  panels: {
    listen: document.querySelector("#listen-panel"),
    intensive: document.querySelector("#intensive-panel"),
    shadowing: document.querySelector("#shadowing-panel")
  },
  summary: document.querySelector("#episode-summary"),
  chips: document.querySelector("#focus-chips"),
  listenPercent: document.querySelector("#listen-percent"),
  markListened: document.querySelector("#mark-listened"),
  intensiveList: document.querySelector("#intensive-list"),
  intensiveCount: document.querySelector("#intensive-count"),
  intensiveRange: document.querySelector("#intensive-range"),
  intensiveText: document.querySelector("#intensive-text"),
  intensiveHint: document.querySelector("#intensive-hint"),
  prevIntensive: document.querySelector("#prev-intensive"),
  playIntensive: document.querySelector("#play-intensive"),
  replayIntensive: document.querySelector("#replay-intensive"),
  nextIntensive: document.querySelector("#next-intensive"),
  playbackRate: document.querySelector("#playback-rate"),
  rateLabel: document.querySelector("#rate-label"),
  shadowingCount: document.querySelector("#shadowing-count"),
  shadowingStatus: document.querySelector("#shadowing-status"),
  shadowingText: document.querySelector("#shadowing-text"),
  shadowingHint: document.querySelector("#shadowing-hint"),
  prevShadowing: document.querySelector("#prev-shadowing"),
  playShadowing: document.querySelector("#play-shadowing"),
  shadowingRepeat: document.querySelector("#shadowing-repeat"),
  nextShadowing: document.querySelector("#next-shadowing"),
  markSpoken: document.querySelector("#mark-spoken"),
  markDifficult: document.querySelector("#mark-difficult"),
  intensiveDone: document.querySelector("#intensive-done"),
  shadowingDone: document.querySelector("#shadowing-done"),
  difficultCount: document.querySelector("#difficult-count"),
  replayCount: document.querySelector("#replay-count"),
  completionNote: document.querySelector("#completion-note"),
  resetProgress: document.querySelector("#reset-progress"),
  message: document.querySelector("#status-message")
};

function progressKey() {
  return `english-shadowing-progress:${state.episodeId}`;
}

function emptyProgress() {
  return {
    stage: "listen",
    currentSegmentId: "",
    listened: false,
    intensiveCompletedIds: [],
    shadowedIds: [],
    difficultIds: [],
    replayCounts: {},
    updatedAt: ""
  };
}

function unique(items) {
  return [...new Set(items)];
}

function formatTime(seconds) {
  const safe = Number.isFinite(seconds) ? Math.max(0, seconds) : 0;
  const minutes = Math.floor(safe / 60);
  const rest = Math.floor(safe % 60).toString().padStart(2, "0");
  return `${minutes}:${rest}`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function fetchJson(candidates) {
  let lastError;
  for (const path of candidates) {
    try {
      const response = await fetch(path);
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
      return { path, data: await response.json() };
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

function loadProgress() {
  state.progress = emptyProgress();
  const raw = localStorage.getItem(progressKey());
  if (!raw) return;
  try {
    state.progress = { ...state.progress, ...JSON.parse(raw) };
  } catch {
    localStorage.removeItem(progressKey());
  }
}

function saveProgress() {
  state.progress.stage = state.stage;
  state.progress.currentSegmentId = segment()?.id || "";
  state.progress.updatedAt = new Date().toISOString();
  localStorage.setItem(progressKey(), JSON.stringify(state.progress));
}

function segment() {
  return state.segments[state.currentIndex];
}

function hasSegmentAudio() {
  return state.segments.some((item) => item.audioFile);
}

function audioUrlForSegment(item) {
  if (!item?.audioFile) return "";
  return `${state.dataBase}/${item.audioFile}`;
}

function completionPercent() {
  const total = state.segments.length || 1;
  const listen = state.progress.listened ? 1 : 0;
  const intensive = state.progress.intensiveCompletedIds.length / total;
  const shadowing = state.progress.shadowedIds.length / total;
  return Math.round(((listen + intensive + shadowing) / 3) * 100);
}

function setStage(stage) {
  state.stage = stage;
  els.tabs.forEach((tab) => tab.classList.toggle("active", tab.dataset.stage === stage));
  Object.entries(els.panels).forEach(([key, panel]) => panel.classList.toggle("active", key === stage));
  els.stageLabel.textContent = stage === "listen" ? "Stage 1" : stage === "intensive" ? "Stage 2" : "Stage 3";
  if (stage === "listen") configureListenAudio();
  saveProgress();
  render();
}

function renderOverview() {
  els.title.textContent = state.episode.title;
  els.summary.textContent = state.episode.summary || fallbackFocus.summary;
  const chips = Array.isArray(state.episode.focusChips) && state.episode.focusChips.length > 0
    ? state.episode.focusChips
    : fallbackFocus.chips;
  els.chips.innerHTML = chips.map((chip) => `<span>${escapeHtml(chip)}</span>`).join("");
}

function renderEpisodeOptions() {
  els.episodeSelect.innerHTML = state.episodeOptions
    .map((episode) => `<option value="${escapeHtml(episode.id)}">${escapeHtml(episode.title || episode.id)}</option>`)
    .join("");
  els.episodeSelect.value = state.episodeId;
}

function renderList() {
  els.intensiveList.innerHTML = state.segments
    .map((item, index) => {
      const done = state.progress.intensiveCompletedIds.includes(item.id) ? " done" : "";
      const current = index === state.currentIndex ? " current" : "";
      return `<button class="sentence-jump${done}${current}" data-index="${index}">
        <span>${index + 1}</span>
        ${escapeHtml(item.text)}
      </button>`;
    })
    .join("");
}

function renderSentence() {
  const current = segment();
  if (!current) return;

  const count = `${state.currentIndex + 1} / ${state.segments.length}`;
  const range =
    Number.isFinite(current.sourceStartTime) && Number.isFinite(current.sourceEndTime)
      ? `${formatTime(current.sourceStartTime)} - ${formatTime(current.sourceEndTime)}`
      : Number.isFinite(current.startTime) && Number.isFinite(current.endTime)
        ? `${formatTime(current.startTime)} - ${formatTime(current.endTime)}`
        : "TTS";
  els.intensiveCount.textContent = count;
  els.intensiveRange.textContent = range;
  els.intensiveText.textContent = current.text;
  els.intensiveHint.textContent = current.translationHint || "";
  els.intensiveHint.hidden = !current.translationHint;
  els.shadowingCount.textContent = count;
  els.shadowingText.textContent = current.text;
  els.shadowingHint.textContent = current.translationHint || "";
  els.shadowingHint.hidden = !current.translationHint;
  els.shadowingStatus.textContent = state.progress.shadowedIds.includes(current.id) ? "Done" : "Not done";
  els.markDifficult.classList.toggle("active", state.progress.difficultIds.includes(current.id));
}

function renderStats() {
  const totalReplays = Object.values(state.progress.replayCounts).reduce((sum, value) => sum + value, 0);
  els.intensiveDone.textContent = state.progress.intensiveCompletedIds.length;
  els.shadowingDone.textContent = state.progress.shadowedIds.length;
  els.difficultCount.textContent = state.progress.difficultIds.length;
  els.replayCount.textContent = totalReplays;
  els.overallProgress.textContent = `${completionPercent()}%`;
  els.completionNote.textContent =
    state.progress.shadowedIds.length === state.segments.length ? "本集完成" : "完成所有句子後會在這裡看到結算。";
}

function render() {
  const listenedPercent = state.progress.listened ? 100 : Math.round((els.audio.currentTime / (els.audio.duration || 1)) * 100);
  els.listenPercent.textContent = `${Math.min(100, listenedPercent || 0)}%`;
  renderList();
  renderSentence();
  renderStats();
}

function markCurrentIntensiveDone() {
  const current = segment();
  if (!current) return;
  state.progress.intensiveCompletedIds = unique([...state.progress.intensiveCompletedIds, current.id]);
}

function recordReplay() {
  const current = segment();
  if (!current) return;
  state.progress.replayCounts[current.id] = (state.progress.replayCounts[current.id] || 0) + 1;
}

function clearStopHandler() {
  if (state.stopHandler) {
    els.audio.removeEventListener("timeupdate", state.stopHandler);
    els.audio.removeEventListener("ended", state.stopHandler);
    state.stopHandler = null;
  }
}

function markIntensivePlaybackDone() {
  if (state.stage === "intensive") {
    markCurrentIntensiveDone();
    saveProgress();
    if (state.progress.intensiveCompletedIds.length === state.segments.length) {
      setStage("shadowing");
    } else {
      render();
    }
  }
}

function configureListenAudio() {
  clearStopHandler();
  if (hasSegmentAudio()) {
    const current = state.segments[state.listenSequenceIndex] || state.segments[0];
    if (current) els.audio.src = audioUrlForSegment(current);
  } else if (state.episode?.audioFile && state.dataBase) {
    els.audio.src = `${state.dataBase}/${state.episode.audioFile}`;
  }
}

function playCurrentSegment({ replay = false } = {}) {
  const current = segment();
  if (!current) return;
  clearStopHandler();
  if (replay) recordReplay();
  els.audio.playbackRate = Number(els.playbackRate.value);
  if (current.audioFile) {
    els.audio.src = audioUrlForSegment(current);
    els.audio.currentTime = 0;
    state.stopHandler = () => {
      clearStopHandler();
      markIntensivePlaybackDone();
    };
    els.audio.addEventListener("ended", state.stopHandler);
    els.audio.play();
    return;
  }
  els.audio.currentTime = current.startTime;
  els.audio.play();
  state.stopHandler = () => {
    if (els.audio.currentTime >= current.endTime) {
      els.audio.pause();
      els.audio.removeEventListener("timeupdate", state.stopHandler);
      state.stopHandler = null;
      if (state.stage === "intensive") {
        markIntensivePlaybackDone();
      }
    }
  };
  els.audio.addEventListener("timeupdate", state.stopHandler);
}

function move(delta) {
  state.currentIndex = Math.min(Math.max(state.currentIndex + delta, 0), state.segments.length - 1);
  saveProgress();
  render();
}

function markShadowed() {
  const current = segment();
  if (!current) return;
  state.progress.shadowedIds = unique([...state.progress.shadowedIds, current.id]);
  saveProgress();
  if (state.currentIndex < state.segments.length - 1) state.currentIndex += 1;
  saveProgress();
  render();
}

function toggleDifficult() {
  const current = segment();
  if (!current) return;
  const set = new Set(state.progress.difficultIds);
  if (set.has(current.id)) set.delete(current.id);
  else set.add(current.id);
  state.progress.difficultIds = [...set];
  saveProgress();
  render();
}

function bindEvents() {
  els.tabs.forEach((tab) => tab.addEventListener("click", () => setStage(tab.dataset.stage)));
  els.markListened.addEventListener("click", () => {
    state.progress.listened = true;
    saveProgress();
    setStage("intensive");
  });
  els.intensiveList.addEventListener("click", (event) => {
    const button = event.target.closest("[data-index]");
    if (!button) return;
    state.currentIndex = Number(button.dataset.index);
    saveProgress();
    render();
  });
  els.prevIntensive.addEventListener("click", () => move(-1));
  els.nextIntensive.addEventListener("click", () => move(1));
  els.playIntensive.addEventListener("click", () => playCurrentSegment());
  els.replayIntensive.addEventListener("click", () => playCurrentSegment({ replay: true }));
  els.prevShadowing.addEventListener("click", () => move(-1));
  els.nextShadowing.addEventListener("click", () => move(1));
  els.playShadowing.addEventListener("click", () => playCurrentSegment());
  els.shadowingRepeat.addEventListener("click", () => playCurrentSegment({ replay: true }));
  els.markSpoken.addEventListener("click", markShadowed);
  els.markDifficult.addEventListener("click", toggleDifficult);
  els.playbackRate.addEventListener("input", () => {
    els.audio.playbackRate = Number(els.playbackRate.value);
    els.rateLabel.textContent = `${Number(els.playbackRate.value).toFixed(2)}x`;
  });
  els.audio.addEventListener("timeupdate", () => {
    els.currentTime.textContent = formatTime(els.audio.currentTime);
    if (state.stage === "listen" && !state.progress.listened && !hasSegmentAudio()) {
      const percent = Math.round((els.audio.currentTime / (els.audio.duration || 1)) * 100);
      els.listenPercent.textContent = `${Math.min(100, percent || 0)}%`;
      renderStats();
    }
  });
  els.audio.addEventListener("ended", () => {
    if (state.stage !== "listen" || !hasSegmentAudio() || state.progress.listened) return;
    state.listenSequenceIndex += 1;
    if (state.listenSequenceIndex >= state.segments.length) {
      state.progress.listened = true;
      saveProgress();
      setStage("intensive");
      return;
    }
    els.listenPercent.textContent = `${Math.round((state.listenSequenceIndex / state.segments.length) * 100)}%`;
    configureListenAudio();
    els.audio.play();
  });
  els.audio.addEventListener("loadedmetadata", () => {
    els.duration.textContent = formatTime(els.audio.duration);
    render();
  });
  els.resetProgress.addEventListener("click", () => {
    localStorage.removeItem(progressKey());
    window.location.reload();
  });
  els.episodeSelect.addEventListener("change", () => {
    const nextEpisodeId = els.episodeSelect.value;
    const url = new URL(window.location.href);
    if (nextEpisodeId === defaultEpisodeId) url.searchParams.delete("episode");
    else url.searchParams.set("episode", nextEpisodeId);
    window.history.replaceState({}, "", url);
    loadEpisode(nextEpisodeId).catch((error) => {
      els.message.textContent = error.message;
    });
  });
}

async function loadEpisodeOptions() {
  try {
    const apiEpisodes = await fetchJson(["/api/episodes"]);
    return apiEpisodes.data.episodes;
  } catch {
    const staticIndex = await fetchJson([
      "/data/episodes/index.json",
      "../data/episodes/index.json"
    ]);
    return staticIndex.data.episodes;
  }
}

async function loadEpisode(episodeId) {
  state.episodeId = episodeId;
  state.stage = "listen";
  state.currentIndex = 0;
  state.listenSequenceIndex = 0;
  clearStopHandler();
  els.audio.pause();
  els.currentTime.textContent = "0:00";
  els.duration.textContent = "0:00";
  els.message.textContent = "";
  loadProgress();
  const clean = await fetchJson([
    `/data/episodes/${state.episodeId}/clean-segments.json`,
    `../data/episodes/${state.episodeId}/clean-segments.json`
  ]);
  state.episode = clean.data;
  state.segments = clean.data.segments;
  if (state.progress.currentSegmentId) {
    const savedIndex = state.segments.findIndex((item) => item.id === state.progress.currentSegmentId);
    if (savedIndex >= 0) state.currentIndex = savedIndex;
  }
  state.dataBase = clean.path.startsWith("..") ? `../data/episodes/${state.episodeId}` : `/data/episodes/${state.episodeId}`;
  configureListenAudio();
  renderOverview();
  renderEpisodeOptions();
  setStage(state.progress.stage || "listen");
}

async function init() {
  bindEvents();
  state.episodeOptions = await loadEpisodeOptions();
  if (!state.episodeOptions.some((episode) => episode.id === state.episodeId)) {
    state.episodeId = state.episodeOptions[0]?.id || defaultEpisodeId;
  }
  renderEpisodeOptions();
  await loadEpisode(state.episodeId);
}

init().catch((error) => {
  els.message.textContent = error.message;
});
