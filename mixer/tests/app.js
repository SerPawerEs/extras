const musicSearchServers = [
  'https://pipedapi.ducks.party',
  'https://api.piped.private.coffee'
];

const searchInput = document.getElementById('busqueda');
const isLocalFile = window.location.protocol === 'file:';
const results = document.getElementById('resultados');
const searchStatus = document.createElement('p');
searchStatus.setAttribute('role', 'status');
results.before(searchStatus);

const playerStatus = document.createElement('p');
playerStatus.setAttribute('role', 'status');
playerStatus.hidden = true;
document.getElementById('player').after(playerStatus);

let searchTimer;
let activeSearch;
let player;
let playerReady = false;
let playerTimer;
let selectedSong;

function showPlaybackStatus(message, linkToSong = false) {
  playerStatus.textContent = message;
  playerStatus.hidden = !message;

  if (linkToSong) {
    const link = document.createElement('a');
    link.href = `https://music.youtube.com/watch?v=${selectedSong.videoId}`;
    link.target = '_blank';
    link.rel = 'noopener';
    link.textContent = 'Abrir en YouTube Music';
    playerStatus.append(' ', link);
  }
}

function initializePlayer() {
  if (isLocalFile || player || !selectedSong || !window.YT?.Player) return;

  const initialVideoId = selectedSong.videoId;
  player = new window.YT.Player('player', {
    width: 560,
    height: 315,
    videoId: initialVideoId,
    playerVars: { autoplay: 1, playsinline: 1, origin: window.location.origin },
    events: {
      onReady(event) {
        playerReady = true;
        clearTimeout(playerTimer);
        if (selectedSong.videoId !== initialVideoId) {
          event.target.loadVideoById(selectedSong.videoId);
        }
      },
      onStateChange(event) {
        if (event.data === window.YT.PlayerState.PLAYING) showPlaybackStatus('');
      },
      onAutoplayBlocked() {
        showPlaybackStatus('Pulsa el botón de reproducción del reproductor.');
      },
      onError: handlePlaybackError
    }
  });

  const iframe = player.getIframe();
  iframe.style.width = '100%';
  iframe.style.maxWidth = '560px';
  iframe.style.height = 'auto';
  iframe.style.aspectRatio = '16 / 9';
  iframe.style.minHeight = '200px';
  iframe.scrollIntoView({ block: 'nearest' });
}

window.onYouTubeIframeAPIReady = initializePlayer;

function playSong(song) {
  selectedSong?.controller.abort();
  selectedSong = { ...song, controller: new AbortController(), triedMusicVideo: false };
  if (isLocalFile) {
    showPlaybackStatus('Abre esta página desde un servidor web para reproducir aquí.', true);
    return;
  }

  showPlaybackStatus('Cargando canción…');
  if (playerReady) {
    player.loadVideoById(song.videoId);
    return;
  }

  clearTimeout(playerTimer);
  playerTimer = setTimeout(() => {
    showPlaybackStatus('El reproductor de YouTube no respondió.', true);
  }, 12000);
  initializePlayer();
}

function normalizeTitle(title) {
  return title.trim().toLowerCase().replace(/\s*[(\[](?:(?:official )?(?:music )?video|(?:digital )?remaster(?:ed)?)[)\]]$/, '');
}

async function handlePlaybackError(event) {
  clearTimeout(playerTimer);
  const selection = selectedSong;
  const { signal } = selection.controller;

  if (event.data === 153) {
    showPlaybackStatus('YouTube no recibió el origen de esta página.', true);
    return;
  }

  if (selection.artist && !selection.triedMusicVideo) {
    selection.triedMusicVideo = true;
    showPlaybackStatus('Buscando el video musical en YouTube Music…');

    try {
      const title = normalizeTitle(selection.title);
      const artist = selection.artist.toLowerCase();
      const videos = await findSongs(`${selection.title} ${selection.artist}`, 'music_videos', signal);
      if (signal.aborted) return;

      const video = videos.find((item) => item.videoId !== selection.videoId
        && item.artist.toLowerCase() === artist && normalizeTitle(item.title) === title);
      if (video) {
        showPlaybackStatus('Cargando el video musical…');
        event.target.loadVideoById(video.videoId);
        return;
      }
    } catch {
      if (signal.aborted) return;
    }
  }

  showPlaybackStatus('Esta canción no se pudo reproducir aquí.', true);
}

async function findSongs(query, filter, signal) {
  const params = new URLSearchParams({ q: query, filter });

  for (const server of musicSearchServers) {
    try {
      const response = await fetch(`${server}/search?${params}`, {
        signal: AbortSignal.any([signal, AbortSignal.timeout(4000)])
      });
      if (!response.ok) continue;

      const data = await response.json();
      if (!Array.isArray(data?.items)) continue;

      return data.items.flatMap((item) => {
        const videoId = /[?&]v=([\w-]{11})(?:[&#]|$)/.exec(item?.url)?.[1];
        const title = typeof item?.title === 'string' ? item.title.trim() : '';
        const artist = typeof item?.uploaderName === 'string' ? item.uploaderName.trim() : '';
        return videoId && title ? [{ videoId, title, artist }] : [];
      });
    } catch (error) {
      if (signal.aborted) throw error;
      // Si falla esta instancia, prueba la siguiente.
    }
  }

  throw new Error('Los servidores de búsqueda no respondieron.');
}

async function searchSongs(query, signal) {
  searchStatus.textContent = 'Buscando en YouTube Music…';

  try {
    const songs = await findSongs(query, 'music_songs', signal);
    if (signal.aborted) return;

    const list = document.createElement('ul');
    const videoIds = new Set();
    for (const song of songs) {
      if (videoIds.has(song.videoId)) continue;
      videoIds.add(song.videoId);

      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = song.artist
        ? `${song.title} — ${song.artist}`
        : song.title;
      button.addEventListener('click', () => playSong(song));

      const item = document.createElement('li');
      item.append(button);
      list.append(item);
    }

    if (videoIds.size) results.replaceChildren(list);
    searchStatus.textContent = videoIds.size ? '' : 'No se encontraron canciones.';
  } catch {
    if (!signal.aborted) {
      searchStatus.textContent = 'No se pudo buscar en YouTube Music. Intenta de nuevo.';
    }
  }
}

function queueSearch() {
  clearTimeout(searchTimer);
  activeSearch?.abort();
  results.replaceChildren();
  searchStatus.textContent = '';

  const query = searchInput.value.trim();
  if (!query) return;

  activeSearch = new AbortController();
  const { signal } = activeSearch;
  searchTimer = setTimeout(() => searchSongs(query, signal), 400);
}

searchInput.addEventListener('input', (event) => {
  if (!event.isComposing) queueSearch();
});
searchInput.addEventListener('compositionend', queueSearch);
