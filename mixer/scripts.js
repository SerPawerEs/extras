let ytAPIReady = false;

// Callback global requerida por la API de YouTube
function onYouTubeIframeAPIReady() {
    ytAPIReady = true;
}

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

    const masterPlayPauseBtn = document.getElementById('masterPlayPauseBtn');
    const masterIcon = document.getElementById('masterIcon');

    let localLibrary = [];

    async function loadSongsJSON() {
        try {
            const response = await fetch('songs.json');
            if (response.ok) {
                localLibrary = await response.json();
            }
        } catch (error) {
            console.error('Error cargando songs.json:', error);
        }
    }

    loadSongsJSON();

    // Setup Deck unificado (Audio Local o YouTube API)
    const setupDeck = (side) => {
        const audio = document.getElementById(`audio${side}`);
        const ytContainerId = `ytPlayer${side}`;
        const ytContainerEl = document.getElementById(ytContainerId);
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
        let mode = 'none'; // 'local' o 'youtube'
        let ytPlayer = null;
        let progressInterval = null;

        const clearProgressInterval = () => {
            if (progressInterval) clearInterval(progressInterval);
        };

        // Play / Pausa unificado
        const togglePlay = () => {
            if (mode === 'local') {
                if (!audio.src) return;
                if (audio.paused) {
                    audio.play();
                    playIcon.classList.replace('fa-play', 'fa-pause');
                    vinyl.classList.add('spinning');
                } else {
                    audio.pause();
                    playIcon.classList.replace('fa-pause', 'fa-play');
                    vinyl.classList.remove('spinning');
                }
            } else if (mode === 'youtube' && ytPlayer && typeof ytPlayer.getPlayerState === 'function') {
                const state = ytPlayer.getPlayerState();
                if (state === YT.PlayerState.PLAYING) {
                    ytPlayer.pauseVideo();
                    playIcon.classList.replace('fa-pause', 'fa-play');
                    vinyl.classList.remove('spinning');
                } else {
                    ytPlayer.playVideo();
                    playIcon.classList.replace('fa-play', 'fa-pause');
                    vinyl.classList.add('spinning');
                }
            }
            updateMasterState();
        };

        playBtn.addEventListener('click', togglePlay);

        // Control de Volumen
        volInput.addEventListener('input', (e) => {
            const val = parseFloat(e.target.value);
            volVal.textContent = `${Math.round(val * 100)}%`;
            if (mode === 'local') {
                audio.volume = val;
            } else if (mode === 'youtube' && ytPlayer && typeof ytPlayer.setVolume === 'function') {
                ytPlayer.setVolume(val * 100);
            }
        });

        // Control de Velocidad
        speedSelect.addEventListener('change', (e) => {
            const rate = parseFloat(e.target.value);
            if (mode === 'local') {
                audio.playbackRate = rate;
            } else if (mode === 'youtube' && ytPlayer && typeof ytPlayer.setPlaybackRate === 'function') {
                ytPlayer.setPlaybackRate(rate);
            }
        });

        // Listeners para Audio Local
        audio.addEventListener('timeupdate', () => {
            if (mode === 'local' && !isDraggingSeek && audio.duration) {
                seekInput.value = (audio.currentTime / audio.duration) * 100;
                currentTimeEl.textContent = formatTime(audio.currentTime);
            }
        });
        audio.addEventListener('loadedmetadata', () => {
            if (mode === 'local') durationEl.textContent = formatTime(audio.duration);
        });
        audio.addEventListener('ended', () => {
            if (mode === 'local') {
                playIcon.classList.replace('fa-pause', 'fa-play');
                vinyl.classList.remove('spinning');
                updateMasterState();
            }
        });

        // Barra de progreso interactiva (Seek)
        seekInput.addEventListener('mousedown', () => isDraggingSeek = true);
        seekInput.addEventListener('touchstart', () => isDraggingSeek = true);

        seekInput.addEventListener('input', (e) => {
            const val = parseFloat(e.target.value);
            if (mode === 'local' && audio.duration) {
                currentTimeEl.textContent = formatTime((val / 100) * audio.duration);
            } else if (mode === 'youtube' && ytPlayer && ytPlayer.getDuration) {
                currentTimeEl.textContent = formatTime((val / 100) * ytPlayer.getDuration());
            }
        });

        seekInput.addEventListener('change', (e) => {
            const val = parseFloat(e.target.value);
            if (mode === 'local' && audio.duration) {
                audio.currentTime = (val / 100) * audio.duration;
            } else if (mode === 'youtube' && ytPlayer && ytPlayer.seekTo) {
                const targetTime = (val / 100) * ytPlayer.getDuration();
                ytPlayer.seekTo(targetTime, true);
            }
            isDraggingSeek = false;
        });

        // Buscador y Detección
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.trim();
            if (query === "") {
                searchResults.classList.remove('active');
                searchResults.innerHTML = '';
                return;
            }

            // Detectar Link de YouTube
            if (query.includes('youtube.com') || query.includes('youtu.be') || query.includes('music.youtube.com')) {
                searchResults.classList.remove('active');
                initYouTubeWithRetry(query);
                return;
            }

            // Filtrar canciones de songs.json
            const filtered = localLibrary.filter(song => song.toLowerCase().includes(query.toLowerCase()));
            searchResults.innerHTML = '';
            if (filtered.length > 0) {
                filtered.forEach(filename => {
                    const cleanName = filename.replace(/\.[^/.]+$/, "");
                    const item = document.createElement('div');
                    item.className = 'search-item';
                    item.innerHTML = `
                        <i class="fa-solid fa-music"></i>
                        <div class="search-item-info">
                            <h4>${cleanName}</h4>
                            <p>songs/${filename}</p>
                        </div>
                    `;
                    item.addEventListener('click', () => {
                        loadLocalTrack(filename, cleanName);
                        searchResults.classList.remove('active');
                        searchInput.value = cleanName;
                    });
                    searchResults.appendChild(item);
                });
                searchResults.classList.add('active');
            } else {
                searchResults.innerHTML = '<div style="padding:15px; text-align:center; color:var(--text-muted)">No encontrado (o pega link de YouTube)</div>';
                searchResults.classList.add('active');
            }
        });

        function loadLocalTrack(filename, cleanName) {
            clearProgressInterval();
            mode = 'local';
            ytContainerEl.classList.remove('active');
            if (ytPlayer && typeof ytPlayer.destroy === 'function') {
                ytPlayer.destroy();
                ytPlayer = null;
            }

            audio.src = `songs/${filename}`;
            audio.load();
            trackTitle.textContent = cleanName;
            trackArtist.textContent = "Reproductor Local";

            audio.play().then(() => {
                playIcon.classList.replace('fa-play', 'fa-pause');
                vinyl.classList.add('spinning');
                updateMasterState();
            }).catch(err => console.log(err));
        }

        // Sistema de reintento automático si la API de YouTube toma 1 segundo en cargar
        function initYouTubeWithRetry(url, retries = 5) {
            if (!ytAPIReady && retries > 0) {
                setTimeout(() => initYouTubeWithRetry(url, retries - 1), 300);
                return;
            }
            if (!ytAPIReady) {
                alert("No se pudo conectar con la API de YouTube. Revisa tu conexión a internet.");
                return;
            }
            loadYouTubeTrack(url);
        }

        function loadYouTubeTrack(url) {
            let videoId = "";
            if (url.includes('v=')) {
                videoId = url.split('v=')[1]?.split('&')[0];
            } else if (url.includes('youtu.be/')) {
                videoId = url.split('youtu.be/')[1]?.split('?')[0];
            } else if (url.includes('embed/')) {
                videoId = url.split('embed/')[1]?.split('?')[0];
            }

            if (!videoId) {
                alert("Enlace de YouTube no válido.");
                return;
            }

            clearProgressInterval();
            mode = 'youtube';
            audio.pause();
            audio.src = "";

            ytContainerEl.classList.add('active');
            trackTitle.textContent = "Audio de YouTube";
            trackArtist.textContent = `ID: ${videoId}`;

            if (ytPlayer && typeof ytPlayer.loadVideoById === 'function') {
                ytPlayer.loadVideoById(videoId);
            } else {
                ytPlayer = new YT.Player(ytContainerId, {
                    height: '90',
                    width: '100%',
                    videoId: videoId,
                    playerVars: { 'autoplay': 1, 'controls': 1, 'modestbranding': 1 },
                    events: {
                        'onReady': (event) => {
                            event.target.playVideo();
                            event.target.setVolume(volInput.value * 100);
                            playIcon.classList.replace('fa-play', 'fa-pause');
                            vinyl.classList.add('spinning');
                            updateMasterState();
                        },
                        'onStateChange': (event) => {
                            if (event.data === YT.PlayerState.PLAYING) {
                                playIcon.classList.replace('fa-play', 'fa-pause');
                                vinyl.classList.add('spinning');
                            } else if (event.data === YT.PlayerState.PAUSED || event.data === YT.PlayerState.ENDED) {
                                playIcon.classList.replace('fa-pause', 'fa-play');
                                vinyl.classList.remove('spinning');
                            }
                            updateMasterState();
                        }
                    }
                });
            }

            // Sincronizar barra de progreso para YouTube
            progressInterval = setInterval(() => {
                if (mode === 'youtube' && ytPlayer && typeof ytPlayer.getCurrentTime === 'function') {
                    const current = ytPlayer.getCurrentTime() || 0;
                    const duration = ytPlayer.getDuration() || 1;
                    currentTimeEl.textContent = formatTime(current);
                    durationEl.textContent = formatTime(duration);
                    if (!isDraggingSeek) {
                        seekInput.value = (current / duration) * 100;
                    }
                }
            }, 500);
        }

        document.addEventListener('click', (e) => {
            if (!searchInput.contains(e.target) && !searchResults.contains(e.target)) {
                searchResults.classList.remove('active');
            }
        });

        return {
            get mode() { return mode; },
            get audio() { return audio; },
            get ytPlayer() { return ytPlayer; },
            playBtn,
            playIcon,
            vinyl,
            togglePlay
        };
    };

    const deckLeft = setupDeck('Left');
    const deckRight = setupDeck('Right');

    // Master Control Central
    let preMasterStates = { left: false, right: false };

    masterPlayPauseBtn.addEventListener('click', toggleMasterPlayPause);

    function toggleMasterPlayPause() {
        const leftPlaying = deckLeft.mode === 'local' ? !deckLeft.audio.paused : (deckLeft.ytPlayer && typeof deckLeft.ytPlayer.getPlayerState === 'function' && deckLeft.ytPlayer.getPlayerState() === YT.PlayerState.PLAYING);
        const rightPlaying = deckRight.mode === 'local' ? !deckRight.audio.paused : (deckRight.ytPlayer && typeof deckRight.ytPlayer.getPlayerState === 'function' && deckRight.ytPlayer.getPlayerState() === YT.PlayerState.PLAYING);

        if (leftPlaying || rightPlaying) {
            preMasterStates.left = leftPlaying;
            preMasterStates.right = rightPlaying;
            if (leftPlaying) deckLeft.togglePlay();
            if (rightPlaying) deckRight.togglePlay();
        } else {
            if (preMasterStates.left) deckLeft.togglePlay();
            if (preMasterStates.right) deckRight.togglePlay();
            if (!preMasterStates.left && !preMasterStates.right) {
                if (deckLeft.mode !== 'none') deckLeft.togglePlay();
                if (deckRight.mode !== 'none') deckRight.togglePlay();
            }
        }
        updateMasterState();
    }

    function updateMasterState() {
        const leftPlaying = deckLeft.mode === 'local' ? !deckLeft.audio.paused && deckLeft.audio.src : (deckLeft.ytPlayer && typeof deckLeft.ytPlayer.getPlayerState === 'function' && deckLeft.ytPlayer.getPlayerState() === YT.PlayerState.PLAYING);
        const rightPlaying = deckRight.mode === 'local' ? !deckRight.audio.paused && deckRight.audio.src : (deckRight.ytPlayer && typeof deckRight.ytPlayer.getPlayerState === 'function' && deckRight.ytPlayer.getPlayerState() === YT.PlayerState.PLAYING);

        if (leftPlaying || rightPlaying) {
            masterIcon.classList.replace('fa-play', 'fa-pause');
            masterPlayPauseBtn.style.background = 'linear-gradient(135deg, #ef4444, #dc2626)';
        } else {
            masterIcon.classList.replace('fa-pause', 'fa-play');
            masterPlayPauseBtn.style.background = 'linear-gradient(135deg, #6366f1, #4f46e5)';
        }
    }

    function formatTime(seconds) {
        if (isNaN(seconds)) return "0:00";
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    }

    // Atajos de Teclado
    document.addEventListener('keydown', (e) => {
        if (e.target.tagName === 'INPUT') return;
        const key = e.key.toUpperCase();

        if (key === 'Q') deckLeft.togglePlay();
        else if (key === 'P') deckRight.togglePlay();
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
        else if (key === 'E') adjustSpeed('Left', 0.25);
        else if (key === 'D') adjustSpeed('Left', -0.25);
        else if (key === 'I') adjustSpeed('Right', 0.25);
        else if (key === 'K') adjustSpeed('Right', -0.25);
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