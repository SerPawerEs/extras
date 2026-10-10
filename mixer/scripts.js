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

    // Lista simulada / escaneable de canciones locales en la carpeta "songs/"
    // (Puedes agregar más nombres de archivos físicos reales que coloques en la carpeta songs)
    const localLibrary = [
        "cancion_ejemplo_1.mp3",
        "demo_audio.mp3",
        "beat_lofi.wav"
    ];

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
        let isExternalEmbed = false;

        // Play / Pausa individual
        const togglePlay = () => {
            if (isExternalEmbed) return; // Los embeds externos manejan su propia reproducción
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
            if (!isExternalEmbed && audio) audio.volume = val;
            volVal.textContent = `${Math.round(val * 100)}%`;
        });

        // Control de Velocidad independiente
        speedSelect.addEventListener('change', (e) => {
            if (!isExternalEmbed && audio) audio.playbackRate = parseFloat(e.target.value);
        });

        // Actualizar barra de tiempo y progreso (solo audio nativo)
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

        setupAudioListeners(audio);

        seekInput.addEventListener('mousedown', () => isDraggingSeek = true);
        seekInput.addEventListener('touchstart', () => isDraggingSeek = true);

        seekInput.addEventListener('input', (e) => {
            if (!isExternalEmbed && audio.duration) {
                const time = (parseFloat(e.target.value) / 100) * audio.duration;
                currentTimeEl.textContent = formatTime(time);
            }
        });

        seekInput.addEventListener('change', (e) => {
            if (!isExternalEmbed && audio.duration) {
                audio.currentTime = (parseFloat(e.target.value) / 100) * audio.duration;
            }
            isDraggingSeek = false;
        });

        // Detector de escritura en buscador / Links externos
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.trim();
            
            if (query === "") {
                searchResults.classList.remove('active');
                searchResults.innerHTML = '';
                return;
            }

            // Validar si pegaron un Link de Spotify o YouTube / YouTube Music
            if (query.startsWith('http://') || query.startsWith('https://')) {
                searchResults.classList.remove('active');
                handleExternalLink(query, side, trackTitle, trackArtist, audioWrapper, vinyl, playIcon);
                return;
            }

            // Filtrar biblioteca local de la carpeta "songs/"
            const filtered = localLibrary.filter(song => song.toLowerCase().includes(query.toLowerCase()));
            
            searchResults.innerHTML = '';
            if (filtered.length > 0) {
                filtered.forEach(filename => {
                    const cleanName = filename.replace(/\.[^/.]+$/, ""); // Quitar extensión .mp3 o .wav
                    const item = document.createElement('div');
                    item.className = 'search-item';
                    item.innerHTML = `
                        <i class="fa-solid fa-music"></i>
                        <div class="search-item-info">
                            <h4>${cleanName}</h4>
                            <p>Carpeta songs/</p>
                        </div>
                    `;
                    item.addEventListener('click', () => {
                        isExternalEmbed = false;
                        // Restaurar elemento <audio> nativo si antes había un iframe
                        if (!document.getElementById(`audio${side}`)) {
                            audioWrapper.innerHTML = `<audio id="audio${side}" crossorigin="anonymous"></audio>`;
                            audio = document.getElementById(`audio${side}`);
                            setupAudioListeners(audio);
                        }

                        audio.src = `songs/${filename}`;
                        audio.load();
                        trackTitle.textContent = cleanName;
                        trackArtist.textContent = "Reproducción Local";
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
                searchResults.innerHTML = '<div style="padding:15px; text-align:center; color:var(--text-muted)">No hay coincidencias en "songs/" (o pega un link válido)</div>';
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
            get isExternal() { return isExternalEmbed; },
            playBtn,
            playIcon,
            vinyl,
            togglePlay
        };
    };

    const deckLeft = setupDeck('Left');
    const deckRight = setupDeck('Right');

    // Manejador de Enlaces Externos (YouTube / Spotify)
    function handleExternalLink(url, side, titleEl, artistEl, wrapperEl, vinyl, playIcon) {
        let embedUrl = "";
        let platformName = "";

        if (url.includes('spotify.com')) {
            platformName = "Spotify Embed";
            // Convertir link normal de Spotify a embed iframe
            const trackIdMatch = url.match(/track\/([a-zA-Z0-9]+)/);
            if (trackIdMatch) {
                embedUrl = `https://open.spotify.com/embed/track/${trackIdMatch[1]}?utm_source=generator&theme=0`;
            }
        } else if (url.includes('youtube.com') || url.includes('youtu.be') || url.includes('music.youtube.com')) {
            platformName = "YouTube Music / Video";
            let videoId = "";
            if (url.includes('v=')) {
                videoId = url.split('v=')[1]?.split('&')[0];
            } else if (url.includes('youtu.be/')) {
                videoId = url.split('youtu.be/')[1]?.split('?')[0];
            } else if (url.includes('embed/')) {
                videoId = url.split('embed/')[1]?.split('?')[0];
            }
            if (videoId) {
                embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1`;
            }
        }

        if (embedUrl) {
            titleEl.textContent = "Contenido Externo";
            artistEl.textContent = platformName;
            vinyl.classList.add('spinning');
            playIcon.classList.replace('fa-play', 'fa-pause');

            // Insertar iframe reproductor oficial integrado en la página
            wrapperEl.innerHTML = `<iframe src="${embedUrl}" width="100%" height="80" allow="autoplay; encrypted-media; fullscreen" loading="lazy"></iframe>`;
            updateMasterState();
        } else {
            alert("No se pudo reconocer el formato del enlace de Spotify o YouTube.");
        }
    }

    // Master Play/Pausa (Control Central)
    let preMasterStates = { left: false, right: false };

    masterPlayPauseBtn.addEventListener('click', toggleMasterPlayPause);

    function toggleMasterPlayPause() {
        const leftActive = deckLeft.isExternal ? false : !deckLeft.audio.paused;
        const rightActive = deckRight.isExternal ? false : !deckRight.audio.paused;

        if (leftActive || rightActive) {
            preMasterStates.left = leftActive;
            preMasterStates.right = rightActive;

            if (leftActive) deckLeft.togglePlay();
            if (rightActive) deckRight.togglePlay();
        } else {
            if (preMasterStates.left && deckLeft.audio.src) deckLeft.togglePlay();
            if (preMasterStates.right && deckRight.audio.src) deckRight.togglePlay();
            
            if (!preMasterStates.left && !preMasterStates.right) {
                if (!deckLeft.isExternal && deckLeft.audio.src) deckLeft.togglePlay();
                if (!deckRight.isExternal && deckRight.audio.src) deckRight.togglePlay();
            }
        }
        updateMasterState();
    }

    function updateMasterState() {
        const leftPlaying = !deckLeft.isExternal && !deckLeft.audio.paused && deckLeft.audio.src;
        const rightPlaying = !deckRight.isExternal && !deckRight.audio.paused && deckRight.audio.src;
        
        if (leftPlaying || rightPlaying) {
            masterIcon.classList.replace('fa-play', 'fa-pause');
            masterPlayPauseBtn.style.background = 'linear-gradient(135deg, #ef4444, #dc2626)';
        } else {
            masterIcon.classList.replace('fa-pause', 'fa-play');
            masterPlayPauseBtn.style.background = 'linear-gradient(135deg, #6366f1, #4f46e5)';
        }
    }

    // Utilidad Formato de Tiempo
    function formatTime(seconds) {
        if (isNaN(seconds)) return "0:00";
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