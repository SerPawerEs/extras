document.addEventListener('DOMContentLoaded', () => {
    // Referencias Modal Ayuda
    const helpBtn = document.getElementById('helpBtn');
    const helpModal = document.getElementById('helpModal');
    const closeModal = document.getElementById('closeModal');

    helpBtn.addEventListener('click', () => helpModal.classList.add('active'));
    closeModal.addEventListener('click', () => helpModal.classList.remove('active'));
    helpModal.addEventListener('click', (e) => {
        if (e.target === helpModal) helpModal.classList.remove('active');
    });

    // Master Control Estado Global
    const masterPlayPauseBtn = document.getElementById('masterPlayPauseBtn');
    const masterIcon = document.getElementById('masterIcon');
    let masterPlayingState = false;

    // Setup Deck (Izquierdo / Derecho)
    const setupDeck = (side) => {
        const audio = document.getElementById(`audio${side}`);
        const playBtn = document.getElementById(`play${side}Btn`);
        const playIcon = document.getElementById(`playIcon${side}`);
        const volInput = document.getElementById(`vol${side}`);
        const volVal = document.getElementById(`volVal${side}`);
        const speedSelect = document.getElementById(`speed${side}`);
        const seekInput = document.getElementById(`seek${side}`);
        const currentTimeEl = document.getElementById(`currentTime${side}`);
        const durationEl = document.getElementById(`duration${side}`);
        const searchInput = document.getElementById(`searchInput${side}`);
        const searchResults = document.getElementById(`searchResults${side}`);
        const trackTitle = document.getElementById(`trackTitle${side}`);
        const trackArtist = document.getElementById(`trackArtist${side}`);
        const vinyl = document.getElementById(`vinyl${side}`);

        let isDraggingSeek = false;

        // Play / Pausa individual
        const togglePlay = () => {
            if (!audio.src) return;
            if (audio.paused) {
                audio.play().catch(err => console.log("Play error:", err));
                playIcon.classList.replace('fa-play', 'fa-pause');
                vinyl.classList.add('spinning');
            } else {
                audio.pause();
                playIcon.classList.replace('fa-pause', 'fa-play');
                vinyl.classList.remove('spinning');
            }
            updateMasterState();
        };

        playBtn.addEventListener('click', togglePlay);

        // Control de Volumen independiente
        volInput.addEventListener('input', (e) => {
            const val = parseFloat(e.target.value);
            audio.volume = val;
            volVal.textContent = `${Math.round(val * 100)}%`;
        });

        // Control de Velocidad independiente
        speedSelect.addEventListener('change', (e) => {
            audio.playbackRate = parseFloat(e.target.value);
        });

        // Actualizar barra de tiempo y progreso
        audio.addEventListener('timeupdate', () => {
            if (!isDraggingSeek && audio.duration) {
                const progress = (audio.currentTime / audio.duration) * 100;
                seekInput.value = progress;
                currentTimeEl.textContent = formatTime(audio.currentTime);
            }
        });

        audio.addEventListener('loadedmetadata', () => {
            durationEl.textContent = formatTime(audio.duration);
        });

        seekInput.addEventListener('mousedown', () => isDraggingSeek = true);
        seekInput.addEventListener('touchstart', () => isDraggingSeek = true);

        seekInput.addEventListener('input', (e) => {
            if (audio.duration) {
                const time = (parseFloat(e.target.value) / 100) * audio.duration;
                currentTimeEl.textContent = formatTime(time);
            }
        });

        seekInput.addEventListener('change', (e) => {
            if (audio.duration) {
                audio.currentTime = (parseFloat(e.target.value) / 100) * audio.duration;
            }
            isDraggingSeek = false;
        });

        audio.addEventListener('ended', () => {
            playIcon.classList.replace('fa-pause', 'fa-play');
            vinyl.classList.remove('spinning');
            updateMasterState();
        });

        // Buscador de música (Deezer API con Proxy CORS)
        let searchTimeout;
        searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            const query = e.target.value.trim();
            if (query.length < 2) {
                searchResults.classList.remove('active');
                searchResults.innerHTML = '';
                return;
            }

            searchTimeout = setTimeout(() => {
                searchDeezer(query, searchResults, trackTitle, trackArtist, audio, playIcon, vinyl);
            }, 400);
        });

        // Ocultar resultados al hacer clic fuera
        document.addEventListener('click', (e) => {
            if (!searchInput.contains(e.target) && !searchResults.contains(e.target)) {
                searchResults.classList.remove('active');
            }
        });

        return {
            audio,
            playBtn,
            playIcon,
            vinyl,
            togglePlay
        };
    };

    const deckLeft = setupDeck('Left');
    const deckRight = setupDeck('Right');

    // Función de búsqueda con Deezer vía corsproxy.io
    async function searchDeezer(query, resultsContainer, titleEl, artistEl, audioElement, playIcon, vinyl) {
        try {
            const targetUrl = `https://api.deezer.com/search?q=${encodeURIComponent(query)}&limit=6`;
            const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`;
            
            const res = await fetch(proxyUrl);
            const parsed = await res.json();

            resultsContainer.innerHTML = '';
            if (parsed.data && parsed.data.length > 0) {
                parsed.data.forEach(track => {
                    const item = document.createElement('div');
                    item.className = 'search-item';
                    item.innerHTML = `
                        <img src="${track.album.cover_medium}" alt="cover">
                        <div class="search-item-info">
                            <h4>${track.title}</h4>
                            <p>${track.artist.name}</p>
                        </div>
                    `;
                    item.addEventListener('click', () => {
                        audioElement.src = track.preview; // Preview de 30s de Deezer
                        audioElement.load();
                        titleEl.textContent = track.title;
                        artistEl.textContent = track.artist.name;
                        resultsContainer.classList.remove('active');
                        audioElement.play().then(() => {
                            playIcon.classList.replace('fa-play', 'fa-pause');
                            vinyl.classList.add('spinning');
                            updateMasterState();
                        }).catch(e => console.log("Error al reproducir:", e));
                    });
                    resultsContainer.appendChild(item);
                });
                resultsContainer.classList.add('active');
            } else {
                resultsContainer.innerHTML = '<div style="padding:15px; text-align:center; color:var(--text-muted)">No se encontraron canciones</div>';
                resultsContainer.classList.add('active');
            }
        } catch (e) {
            console.error("Error en búsqueda:", e);
            resultsContainer.innerHTML = '<div style="padding:15px; text-align:center; color:var(--text-muted)">Error al buscar música</div>';
            resultsContainer.classList.add('active');
        }
    }

    // Master Play/Pausa (Control Central)
    let preMasterStates = { left: false, right: false };

    masterPlayPauseBtn.addEventListener('click', toggleMasterPlayPause);

    function toggleMasterPlayPause() {
        const leftPlaying = !deckLeft.audio.paused;
        const rightPlaying = !deckRight.audio.paused;

        if (leftPlaying || rightPlaying) {
            preMasterStates.left = leftPlaying;
            preMasterStates.right = rightPlaying;

            if (leftPlaying) deckLeft.togglePlay();
            if (rightPlaying) deckRight.togglePlay();
        } else {
            if (preMasterStates.left && deckLeft.audio.src) deckLeft.togglePlay();
            if (preMasterStates.right && deckRight.audio.src) deckRight.togglePlay();
            
            if (!preMasterStates.left && !preMasterStates.right) {
                if (deckLeft.audio.src) deckLeft.togglePlay();
                if (deckRight.audio.src) deckRight.togglePlay();
            }
        }
        updateMasterState();
    }

    function updateMasterState() {
        const anyPlaying = (!deckLeft.audio.paused && deckLeft.audio.src) || (!deckRight.audio.paused && deckRight.audio.src);
        if (anyPlaying) {
            masterIcon.classList.replace('fa-play', 'fa-pause');
            masterPlayPauseBtn.style.background = 'linear-gradient(135deg, #ef4444, #dc2626)';
        } else {
            masterIcon.classList.replace('fa-pause', 'fa-play');
            masterPlayPauseBtn.style.background = 'linear-gradient(135deg, #6366f1, #4f46e5)';
        }
    }

    // Utilidad Formato de Tiempo
    function formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    }

    // Accesos Directos por Teclado
    document.addEventListener('keydown', (e) => {
        if (e.target.tagName === 'INPUT') return;

        const key = e.key.toUpperCase();

        if (key === 'Q') {
            deckLeft.togglePlay();
        }
        else if (key === 'P') {
            deckRight.togglePlay();
        }
        else if (e.code === 'Space') {
            e.preventDefault();
            toggleMasterPlayPause();
        }
        else if (key === 'W') {
            const volInput = document.getElementById('volLeft');
            volInput.value = Math.min(1, parseFloat(volInput.value) + 0.05);
            volInput.dispatchEvent(new Event('input'));
        }
        else if (key === 'S') {
            const volInput = document.getElementById('volLeft');
            volInput.value = Math.max(0, parseFloat(volInput.value) - 0.05);
            volInput.dispatchEvent(new Event('input'));
        }
        else if (key === 'O') {
            const volInput = document.getElementById('volRight');
            volInput.value = Math.min(1, parseFloat(volInput.value) + 0.05);
            volInput.dispatchEvent(new Event('input'));
        }
        else if (key === 'L') {
            const volInput = document.getElementById('volRight');
            volInput.value = Math.max(0, parseFloat(volInput.value) - 0.05);
            volInput.dispatchEvent(new Event('input'));
        }
        else if (key === 'E') {
            adjustSpeed('Left', 0.25);
        }
        else if (key === 'D') {
            adjustSpeed('Left', -0.25);
        }
        else if (key === 'I') {
            adjustSpeed('Right', 0.25);
        }
        else if (key === 'K') {
            adjustSpeed('Right', -0.25);
        }
    });

    function adjustSpeed(side, delta) {
        const select = document.getElementById(`speed${side}`);
        let newIndex = select.selectedIndex + (delta > 0 ? 1 : -1);
        if (newIndex >= 0 && newIndex < select.options.length) {
            select.selectedIndex = newIndex;
            select.dispatchEvent(new Event('change'));
        }
    }
});