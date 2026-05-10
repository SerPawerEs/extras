const state = {
  config: null,
  isPlaying: false,
  syncInterval: null,
  triggered: new Set(),
  animationState: null
};

const els = {};

function cacheElements() {
  els.introScreen = document.getElementById('intro-screen');
  els.lyricsScreen = document.getElementById('lyrics-screen');
  els.introPlayBtn = document.getElementById('intro-play-btn');
  els.currentLine = document.getElementById('currentLine');
  els.audio = document.getElementById('audioPlayer');
  els.progressFill = document.getElementById('progressFill');
  els.controlsToggle = document.getElementById('controlsToggle');
  els.controlsModal = document.getElementById('controlsModal');
  els.modalClose = document.getElementById('modalClose');
  els.seekBar = document.getElementById('seekBar');
  els.volumeBar = document.getElementById('volumeBar');
  els.timeDisplay = document.getElementById('timeDisplay');
  els.btnPlayPause = document.getElementById('btnPlayPause');
  els.btnRewind = document.getElementById('btnRewind');
  els.btnForward = document.getElementById('btnForward');
  els.introTitle = document.getElementById('intro-title');
  els.modalTitle = document.getElementById('modal-title');
  els.seekLabel = document.getElementById('seek-label');
  els.volumeLabel = document.getElementById('volume-label');
}

function applyTheme() {
  if (!state.config?.meta?.colors) return;
  const { bg, text, pink, yellow } = state.config.meta.colors;
  document.documentElement.style.setProperty('--bg', bg);
  document.documentElement.style.setProperty('--text', text);
  document.documentElement.style.setProperty('--pink', pink);
  document.documentElement.style.setProperty('--yellow', yellow);
  document.documentElement.style.setProperty('--pink-glow', `${pink}66`);
  document.documentElement.style.setProperty('--yellow-glow', `${yellow}66`);
}

function injectUI() {
  const { meta, ui } = state.config;
  document.title = `${meta.title} — Lyrics Visualizer`;
  document.getElementById('page-title').textContent = document.title;
  els.introTitle.textContent = meta.title;
  els.modalTitle.textContent = ui.controls.modalTitle;
  els.seekLabel.textContent = ui.controls.seekLabel;
  els.volumeLabel.textContent = ui.controls.volumeLabel;
  els.controlsToggle.textContent = ui.controls.toggleLabel;
  els.audio.src = meta.audioSrc;
  els.audio.volume = parseFloat(els.volumeBar.value || 1);
}

// ── TOAST (Una clase, un div por notificación, sin bloqueos) ──
function showToast(msg) {
  const container = document.getElementById('toast-container');
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  container.appendChild(el);
  requestAnimationFrame(() => el.classList.add('show'));
  setTimeout(() => {
    el.classList.remove('show');
    setTimeout(() => el.remove(), 300);
  }, 1600);
}

// ── SYNC UI ──
function syncPlayUI(playing) {
  state.isPlaying = playing;
  els.introPlayBtn.classList.toggle('playing', playing);
  els.btnPlayPause.classList.toggle('playing', playing);
}

// ── PARSER ──
function parseLyricHTML(htmlString) {
  const temp = document.createElement('div');
  temp.innerHTML = htmlString;

  function processNode(node) {
    if (node.nodeType === 3) { // Texto plano
      const text = node.textContent;
      const tokens = text.split(/(\s+)/);
      const frag = document.createDocumentFragment();

      tokens.forEach(token => {
        if (!token) return;
        if (/^\s+$/.test(token)) {
          frag.appendChild(document.createTextNode(token));
        } else {
          const wordSpan = document.createElement('span');
          wordSpan.className = 'word';
          wordSpan.style.whiteSpace = 'nowrap';
          for (const char of token) {
            const letter = document.createElement('span');
            letter.className = 'letter';
            letter.textContent = char;
            wordSpan.appendChild(letter);
          }
          frag.appendChild(wordSpan);
        }
      });
      node.replaceWith(frag);

    } else if (node.nodeType === 1) { // Elemento con estilos
      const classes = [...node.classList];
      [...node.childNodes].forEach(processNode);
      
      // ✅ CORRECCIÓN: Aplicar clases directamente a las LETRAS
      const letters = node.querySelectorAll('.letter');
      letters.forEach(l => classes.forEach(c => l.classList.add(c)));
      
      // Desenrollar el span original
      const parent = node.parentNode;
      while (node.firstChild) parent.insertBefore(node.firstChild, node);
      parent.removeChild(node);
    }
  }

  [...temp.childNodes].forEach(processNode);
  return temp.innerHTML;
}

// ── CANCELAR ANIMACIÓN ACTIVA ──
function cancelCurrentAnimation() {
  if (state.animationState?.cancel) state.animationState.cancel();
  state.animationState = null;
}

// ── MOTOR DE ANIMACIÓN (Con soporte de cancelación) ──
function animateLine(element, duration) {
  const letters = [...element.querySelectorAll('.letter')];
  if (!letters.length) return Promise.resolve();
  element.classList.add('visible');

  const total = letters.length;
  const gap = duration / total;
  let revealed = 0;
  let startTime = performance.now();
  let pausedDuration = 0;
  let isPaused = false;
  let pauseStartTime = 0;
  let nextTimer = null;
  let cancelled = false;
  let resolve;
  const p = new Promise(r => resolve = r);

  state.animationState = {
    pause: () => {
      if (isPaused) return;
      isPaused = true;
      pauseStartTime = performance.now();
      if (nextTimer) clearTimeout(nextTimer);
    },
    resume: () => {
      if (!isPaused) return;
      pausedDuration += performance.now() - pauseStartTime;
      isPaused = false;
      scheduleNext();
    },
    isPaused: () => isPaused,
    cancel: () => {
      cancelled = true;
      if (nextTimer) clearTimeout(nextTimer);
      resolve();
    }
  };

  function scheduleNext() {
    if (cancelled || isPaused || revealed >= total) {
      if (revealed >= total && !cancelled) { state.animationState = null; resolve(); }
      return;
    }
    const now = performance.now();
    const targetIndex = Math.min(total, Math.floor((now - startTime - pausedDuration) / gap) + 1);
    while (revealed < targetIndex) {
      letters[revealed].classList.add('revealed');
      revealed++;
    }
    if (revealed >= total) {
      state.animationState = null;
      resolve();
      return;
    }
    const elapsed = now - startTime - pausedDuration;
    const timeUntilNext = (revealed * gap) - elapsed;
    nextTimer = setTimeout(scheduleNext, Math.max(16, timeUntilNext));
  }

  scheduleNext();
  return p;
}

function transitionToLyrics() { els.introScreen.classList.add('hidden'); setTimeout(() => els.lyricsScreen.classList.add('active'), 400); }

async function showLine(i) {
  if (!state.config?.lyrics?.[i]) return;
  cancelCurrentAnimation(); // 🔹 Cancela la anterior para evitar reinicios o solapamientos
  const { html, fadeInDuration } = state.config.lyrics[i];
  els.currentLine.classList.remove('visible');
  els.currentLine.querySelectorAll('.letter').forEach(l => l.classList.remove('revealed'));
  await new Promise(r => setTimeout(r, 250));
  els.currentLine.innerHTML = parseLyricHTML(html);
  els.currentLine.classList.remove('visible');
  await animateLine(els.currentLine, fadeInDuration);
}

// ── PLAYBACK ──
function startPlayback() {
  state.triggered.clear();
  transitionToLyrics();
  syncPlayUI(true);
  els.audio.play().catch(console.warn);

  state.syncInterval = setInterval(() => {
    const { currentTime, duration } = els.audio;
    if (duration && isFinite(duration)) {
      els.progressFill.style.width = `${(currentTime/duration)*100}%`;
      els.seekBar.value = (currentTime/duration)*100;
      els.timeDisplay.textContent = `${formatTime(currentTime)} / ${formatTime(duration)}`;
    }
    state.config.lyrics.forEach((_, i) => {
      if (currentTime >= state.config.lyrics[i].time && !state.triggered.has(i)) {
        state.triggered.add(i); showLine(i);
      }
    });
    if (els.audio.ended) stopPlayback();
  }, 100);
}

function stopPlayback() {
  syncPlayUI(false);
  cancelCurrentAnimation(); // 🔹 Limpia timers pendientes
  els.audio.pause();
  clearInterval(state.syncInterval);
}

function togglePlay() {
  if (els.audio.paused) {
    state.animationState?.resume(); // Reanuda si estaba en pausa
    startPlayback();
    showToast('▶ Reproduciendo'); // 🔹 Ahora sí aparece
  } else {
    stopPlayback();
    showToast('⏸ Pausado');
  }
}

function formatTime(s) { return `${Math.floor(s/60)}:${Math.floor(s%60).toString().padStart(2,'0')}`; }

function seek(dir) {
  const step = dir > 0 ? (state.config?.ui?.controls?.forwardSeconds || 10) : (state.config?.ui?.controls?.rewindSeconds || 10);
  els.audio.currentTime += step * dir;
  showToast(dir > 0 ? `⏩ +${step}s` : `⏪ -${step}s`);
}

function changeVol(dir) {
  els.audio.volume = Math.max(0, Math.min(1, els.audio.volume + dir * 0.05));
  els.volumeBar.value = els.audio.volume;
  showToast(`🔊 ${Math.round(els.audio.volume * 100)}%`);
}

// ── CONTROLES & TECLADO ──
function setupControls() {
  els.seekBar.oninput = (e) => { if (els.audio.duration) els.audio.currentTime = (e.target.value/100)*els.audio.duration; };
  els.volumeBar.oninput = (e) => els.audio.volume = parseFloat(e.target.value);
  els.btnRewind.onclick = () => seek(-1);
  els.btnForward.onclick = () => seek(1);
  els.btnPlayPause.onclick = togglePlay;
  els.controlsToggle.onclick = () => els.controlsModal.classList.add('active');
  els.modalClose.onclick = () => els.controlsModal.classList.remove('active');
  els.controlsModal.onclick = (e) => { if(e.target===els.controlsModal) els.controlsModal.classList.remove('active'); };
}

function setupKeyboard() {
  document.onkeydown = (e) => {
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
    switch(e.code) {
      case 'Space': togglePlay(); break;
      case 'ArrowRight': seek(1); break;
      case 'ArrowLeft': seek(-1); break;
      case 'ArrowUp': changeVol(1); break;
      case 'ArrowDown': changeVol(-1); break;
    }
  };
}

function setupEvents() {
  els.introPlayBtn.onclick = togglePlay;
  els.audio.onplay = () => syncPlayUI(true);
  els.audio.onpause = () => syncPlayUI(false);
  els.audio.onended = () => { stopPlayback(); els.progressFill.style.width = '100%'; cancelCurrentAnimation(); };
}

async function loadSong(id) {
  els.introTitle.textContent = 'Cargando...';
  try {
    const res = await fetch(`data/${id}.json`);
    if (!res.ok) throw new Error('No found');
    state.config = await res.json();
    applyTheme(); injectUI(); setupControls(); setupEvents(); setupKeyboard();
    els.introTitle.textContent = state.config.meta.title;
  } catch (e) { els.introTitle.textContent = 'Error: Canción no encontrada'; console.error(e); }
}

async function init() {
  cacheElements();
  const id = new URLSearchParams(window.location.search).get('song');
  if (!id) { window.location.href = 'index.html'; return; }
  await loadSong(id);
}
init();