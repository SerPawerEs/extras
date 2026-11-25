const INSTANCIAS = [
  'https://pipedapi.kavin.rocks',
  'https://vid.puffyan.us'
];

async function buscarVideoId(termino) {
  for (const base of INSTANCIAS) {
    try {
      const res = await fetch(`${base}/search?q=${encodeURIComponent(termino)}&filter=videos`);
      if (!res.ok) continue;
      const data = await res.json();
      const items = Array.isArray(data) ? data : data.items;
      if (!Array.isArray(items)) continue;

      for (const v of items) {
        const id = v.url
          ? v.url.split('v=')[1]?.split('&')[0]
          : v.videoId;
        if (id && id.length === 11) return id;
      }
    } catch (_) {}
  }
  return null;
}

function renderPlayer(videoId, host = 'www.youtube.com') {
  document.getElementById('reproductor').innerHTML = `
    <iframe
      width="560"
      height="315"
      src="https://${host}/embed/${videoId}?autoplay=1"
      allow="autoplay; encrypted-media; picture-in-picture"
      frameborder="0"
      allowfullscreen>
    </iframe>
    <div>
      <button onclick="renderPlayer('${videoId}', 'www.youtube-nocookie.com')">Probar embed alternativo</button>
      <a href="https://www.youtube.com/watch?v=${videoId}" target="_blank" rel="noopener">Abrir en YouTube</a>
    </div>
  `;
}

document.getElementById('btnBuscar').addEventListener('click', async () => {
  const query = document.getElementById('busqueda').value.trim();
  const contenedor = document.getElementById('resultados');
  const reproductor = document.getElementById('reproductor');
  contenedor.innerHTML = '';

  if (!query) return;

  const url = `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&media=music&entity=song&limit=10`;
  const res = await fetch(url);
  const data = await res.json();

  data.results.forEach(item => {
    const btn = document.createElement('button');
    btn.textContent = `${item.trackName} - ${item.artistName}`;
    btn.onclick = async () => {
      reproductor.textContent = 'Buscando video...';
      const videoId = await buscarVideoId(`${item.trackName} ${item.artistName}`);
      if (!videoId) {
        reproductor.textContent = 'No se encontró video o las instancias de búsqueda bloquearon la petición.';
        return;
      }
      renderPlayer(videoId);
    };

    const div = document.createElement('div');
    div.appendChild(btn);
    contenedor.appendChild(div);
  });
});