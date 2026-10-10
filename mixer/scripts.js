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

    // Biblioteca de canciones cargada desde JSON
    let localLibrary = [];

    // Cargar la lista de canciones desde songs.json
    async function loadSongsJSON() {
        try {
            const response = await fetch('songs.json');
            if (response.ok) {
                localLibrary = await response.json();
            } else {
                console.warn('No se encontró songs.json, usando lista por defecto.');
            }
        } catch (error) {
            console.error('Error cargando songs.json:', error);
        }
    }

    loadSongsJSON();

    // Setup Deck (Izquierdo / Derecho)
    const setupDeck = (side) => {
        let audio = document.getElementById(`audio${side}`);
        const audioWrapper = document.getElementById(`audioWrapper${side}`);
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
            if (!audio || !audio.src) return;
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
            if (audio) audio.volume = val;
            volVal.textContent = `${Math.round(val * 100)}%`;
        });

        // Control de Velocidad independiente
        speedSelect.addEventListener('change', (e) => {
            if (audio) audio.playbackRate = parseFloat(e.target.value);
        });

        // Eventos de audio nativo
        const setupAudioListeners = (targetAudio) => {
            targetAudio.addEventListener('timeupdate', () => {
                if (!isDraggingSeek && targetAudio.duration) {
                    const progress = (targetAudio.currentTime / targetAudio.duration) * 100;
                    seekInput.value = progress;
                    currentTimeEl.textContent = formatTime(targetAudio.currentTime);
                }
            });

            targetAudio.addEventListener('loadedmetadata', () => {
                durationEl.textContent = formatTime(targetAudio.duration);
            });

            targetAudio.addEventListener('ended', () => {
                playIcon.classList.replace('fa-pause', 'fa-play');
                vinyl.classList.remove('spinning');
                updateMasterState();
            });
        };

        if (audio) setupAudioListeners(audio);

        seekInput.addEventListener('mousedown', () => isDraggingSeek = true);
        seekInput.addEventListener('touchstart', () => isDraggingSeek = true);

        seekInput.addEventListener('input', (e) => {
            if (audio && audio.duration) {
                const time = (parseFloat(e.target.value) / 100) * audio.duration;
                currentTimeEl.textContent = formatTime(time);
            }
        });

        seekInput.addEventListener('change', (e) => {
            if (audio && audio.duration) {
                audio.currentTime = (parseFloat(e.target.value) / 100) * audio.duration;
            }
            isDraggingSeek = false;
        });

        // Evento del Buscador
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.trim();
            
            if (query === "") {
                searchResults.classList.remove('active');
                searchResults.innerHTML = '';
                return;
            }

            // Filtrar canciones de songs.json
            const filtered = localLibrary.filter(song => song.toLowerCase().includes(query.toLowerCase()));
            
            searchResults.innerHTML = '';
            if (filtered.length > 0) {
                filtered.forEach(filename => {
                    const cleanName = filename.replace(/\.[^/.]+$/, ""); // Quita la extensión (.mp3, .wav, etc.)
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
                        if (!document.getElementById(`audio${side}`)) {
                            audioWrapper.innerHTML = `<audio id="audio${side}" crossorigin="anonymous"></audio>`;
                            audio = document.getElementById(`audio${side}`);
                            setupAudioListeners(audio);
                        }

                        audio.src = `songs/${filename}`;
                        audio.load();
                        trackTitle.textContent = cleanName;
                        trackArtist.textContent = "Canción Local";
                        searchResults.classList.remove('active');
                        searchInput.value = cleanName;

                        audio.play().then(() => {
                            playIcon.classList.replace('fa-play', 'fa-pause');
                            vinyl.classList.add('spinning');
                            updateMasterState();
                        }).catch(err => console.log("Play error:", err));
                    });
                    searchResults.appendChild(item);
                });
                searchResults.classList.add('active');
            } else {
                searchResults.innerHTML = '<div style="padding:15px; text-align:center; color:var(--text-muted)">No se encontró en "songs.json"</div>';
                searchResults.classList.add('active');
            }
        });

        document.addEventListener('click', (e) => {
            if (!searchInput.contains(e.target) && !searchResults.contains(e.target)) {
                searchResults.classList.remove('active');
            }
        });

        return {
            get audio() { return audio; },
            playBtn,
            playIcon,
            vinyl,
            togglePlay
        };
    };

    const deckLeft = setupDeck('Left');
    const deckRight = setupDeck('Right');

    // Master Control
    let preMasterStates = { left: false, right: false };

    masterPlayPauseBtn.addEventListener('click', toggleMasterPlayPause);

    function toggleMasterPlayPause() {
        const leftActive = deckLeft.audio && !deckLeft.audio.paused;
        const rightActive = deckRight.audio && !deckRight.audio.paused;

        if (leftActive || rightActive) {
            preMasterStates.left = leftActive;
            preMasterStates.right = rightActive;

            if (leftActive) deckLeft.togglePlay();
            if (rightActive) deckRight.togglePlay();
        } else {
            if (preMasterStates.left && deckLeft.audio && deckLeft.audio.src) deckLeft.togglePlay();
            if (preMasterStates.right && deckRight.audio && deckRight.audio.src) deckRight.togglePlay();
            
            if (!preMasterStates.left && !preMasterStates.right) {
                if (deckLeft.audio && deckLeft.audio.src) deckLeft.togglePlay();
                if (deckRight.audio && deckRight.audio.src) deckRight.togglePlay();
            }
        }
        updateMasterState();
    }

    function updateMasterState() {
        const leftPlaying = deckLeft.audio && !deckLeft.audio.paused && deckLeft.audio.src;
        const rightPlaying = deckRight.audio && !deckRight.audio.paused && deckRight.audio.src;
        
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

    // Atajos de teclado
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