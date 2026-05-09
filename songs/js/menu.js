async function initMenu() {
  try {
    const res = await fetch('data/songs.json');
    if (!res.ok) throw new Error('Manifest no encontrado');
    const songs = await res.json();
    
    const grid = document.getElementById('song-grid');
    grid.innerHTML = '';
    
    if (!songs.length) {
      grid.innerHTML = '<p class="loading-msg">No hay canciones disponibles.</p>';
      return;
    }

    songs.forEach(song => {
      const card = document.createElement('a');
      card.href = `player.html?song=${song.id}`;
      card.className = 'song-card';
      card.innerHTML = `
        <span class="song-name">${song.title}</span>
        <span class="song-hint">Toca para reproducir</span>
      `;
      grid.appendChild(card);
    });
  } catch (err) {
    console.error('❌ Error cargando menú:', err);
    document.getElementById('song-grid').innerHTML = '<p class="loading-msg">Error: Usa un servidor local (Live Server / python -m http.server)</p>';
  }
}
initMenu();