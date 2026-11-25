const pipedInstances = [
  'https://pipedapi.leptons.xyz',
  'https://pipedapi.nosebs.ru',
  'https://api.piped.private.coffee',
  'https://pipedapi.adminforge.de',
  'https://piped-api.privacy.com.de',
  'https://api.piped.yt'
];

let player = null;
let pendingSongId = null;

window.onYouTubeIframeAPIReady = function () {
  player = new YT.Player('player', {
    height: '315',
    width: '560',
    playerVars: { autoplay: 1, playsinline: 1 },
    events: {
      onReady: (e) => {
        if (pendingSongId) {
          e.target.loadVideoById(pendingSongId);
          pendingSongId = null;
        }
      }
    }
  });
};

function extractVideoId(url) {
  if (!url) return '';
  const match = String(url).match(/(?:v=|youtu\.be\/|\/watch\/|\/embed\/)([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : '';
}

function playSong(videoId) {
  if (!videoId) return;
  if (player && typeof player.loadVideoById === 'function') {
    player.loadVideoById(videoId);
  } else {
    pendingSongId = videoId;
  }
}

async function performSearch(query) {
  const resultsEl = document.getElementById('resultados');
  resultsEl.innerHTML = '';

  let data = null;
  for (const api of pipedInstances) {
    try {
      const res = await fetch(`${api}/search?q=${encodeURIComponent(query)}&filter=music_songs`);
      if (res.ok) {
        data = await res.json();
        break;
      }
    } catch (_) {}
  }

  if (!data || !Array.isArray(data.items)) return;

  data.items.forEach(item => {
    const vid = extractVideoId(item.url);
    if (!vid) return;

    const btn = document.createElement('button');
    btn.textContent = `${item.title} - ${item.uploaderName || 'YouTube Music'}`;
    btn.onclick = () => {
      playSong(vid);
      resultsEl.innerHTML = '';
    };

    const div = document.createElement('div');
    div.appendChild(btn);
    resultsEl.appendChild(div);
  });
}

document.getElementById('busqueda').addEventListener('input', (e) => {
  const query = e.target.value.trim();
  if (!query) {
    document.getElementById('resultados').innerHTML = '';
    return;
  }
  performSearch(query);
});