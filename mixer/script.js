let ytAPIReady = false;

if (window.YT && window.YT.Player) {
    ytAPIReady = true;
} else {
    window.onYouTubeIframeAPIReady = function() {
        ytAPIReady = true;
    };
}

document.addEventListener('DOMContentLoaded', () => {
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
    const crossfadeToggle = document.getElementById('crossfadeToggle');
    const transitionCenterBtn = document.getElementById('transitionCenterBtn');

    let localLibrary = [];
    let deckLeftInstance = null;
    let deckRightInstance = null;

    const pipedInstances = [
        'https://pipedapi.kavin.rocks',
        'https://api.piped.private.coffee',
        'https://pipedapi.mha.fi'
    ];

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
        
        const back10Btn = document.getElementById(`back10${side}Btn`);
        const fwd10Btn = document.getElementById(`fwd10${side}Btn`);
        const prevBtn = document.getElementById(`prev${side}Btn`);
        const nextBtn = document.getElementById(`next${side}Btn`);

        let isDraggingSeek = false;
        let mode = 'none';
        let ytPlayer = null;
        let progressInterval = null;
        let crossfadeTriggered = false;
        
        let currentSongFilename = null;
        let currentYoutubeUrl = null;

        const clearProgressInterval = () => {
            if (progressInterval) clearInterval(progressInterval);
        };

        const updateVolumeUI = (value) => {
            volInput.value = value;
            volVal.textContent = `${Math.round(value * 100)}%`;
        };

        const setVolumeLevel = (value) => {
            updateVolumeUI(value);
            if (mode === 'local') {
                audio.volume = value;
            } else if (mode === 'youtube' && ytPlayer && typeof ytPlayer.setVolume === 'function') {
                ytPlayer.setVolume(value * 100);
            }
        };

        const isPlaying = () => {
            if (mode === 'local') {
                return !audio.paused && !!audio.src;
            } else if (mode === 'youtube' && ytPlayer && typeof ytPlayer.getPlayerState === 'function') {
                return ytPlayer.getPlayerState() === YT.PlayerState.PLAYING;
            }
            return false;
        };

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
            updateCenterButtonState();
        };

        playBtn.addEventListener('click', togglePlay);

        volInput.addEventListener('input', (e) => {
            setVolumeLevel(parseFloat(e.target.value));
        });

        speedSelect.addEventListener('change', (e) => {
            const rate = parseFloat(e.target.value);
            if (mode === 'local') {
                audio.playbackRate = rate;
            } else if (mode === 'youtube' && ytPlayer && typeof ytPlayer.setPlaybackRate === 'function') {
                ytPlayer.setPlaybackRate(rate);
            }
        });

        const checkCrossfade = (currentTime, duration) => {
            const isCrossfadeActive = crossfadeToggle ? crossfadeToggle.checked : true;
            if (!isCrossfadeActive) return;

            if (!duration || duration <= 5) return;
            const timeLeft = duration - currentTime;

            if (timeLeft <= 5 && !crossfadeTriggered) {
                crossfadeTriggered = true;
                triggerCrossfadeTransition(side);
            } else if (timeLeft > 5) {
                crossfadeTriggered = false;
            }
        };

        audio.addEventListener('timeupdate', () => {
            if (mode === 'local' && !isDraggingSeek && audio.duration) {
                seekInput.value = (audio.currentTime / audio.duration) * 100;
                currentTimeEl.textContent = formatTime(audio.currentTime);
                checkCrossfade(audio.currentTime, audio.duration);
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
                updateCenterButtonState();
            }
        });

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

        back10Btn.addEventListener('click', () => jumpTime(-10));
        fwd10Btn.addEventListener('click', () => jumpTime(10));

        function jumpTime(seconds) {
            if (mode === 'local' && audio.src) {
                audio.currentTime = Math.max(0, Math.min(audio.duration || 0, audio.currentTime + seconds));
            } else if (mode === 'youtube' && ytPlayer && ytPlayer.getCurrentTime && ytPlayer.seekTo) {
                const cur = ytPlayer.getCurrentTime();
                const dur = ytPlayer.getDuration() || 0;
                ytPlayer.seekTo(Math.max(0, Math.min(dur, cur + seconds)), true);
            }
        }

        prevBtn.addEventListener('click', () => {
            const currentTime = getCurrentTime();
            if (currentTime > 3) {
                if (mode === 'local') audio.currentTime = 0;
                else if (ytPlayer && ytPlayer.seekTo) ytPlayer.seekTo(0, true);
            } else {
                changeSongByOffset(-1);
            }
        });

        nextBtn.addEventListener('click', () => {
            const duration = getDuration();
            if (duration > 3) {
                if (mode === 'local') audio.currentTime = duration - 3.5;
                else if (ytPlayer && ytPlayer.seekTo) ytPlayer.seekTo(duration - 3.5, true);
            }
        });

        function changeSongByOffset(offset) {
            if (localLibrary.length === 0 || !currentSongFilename) return;
            let currentIndex = localLibrary.indexOf(currentSongFilename);
            if (currentIndex === -1) currentIndex = 0;
            
            let newIndex = (currentIndex + offset + localLibrary.length) % localLibrary.length;
            let filename = localLibrary[newIndex];
            loadLocalTrack(filename, filename.replace(/\.[^/.]+$/, ""), true);
        }

        // --- BUSCADOR HÍBRIDO (Local + YouTube mediante Piped API) ---
        let searchTimeout = null;

        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                const query = searchInput.value.trim();
                searchResults.classList.remove('active');
                if (query.includes('youtube.com') || query.includes('youtu.be') || query.includes('music.youtube.com')) {
                    initYouTubeWithRetry(query, false, 0);
                    return;
                }
                const filtered = localLibrary.filter(song => song.toLowerCase().includes(query.toLowerCase()));
                if (filtered.length > 0) {
                    const filename = filtered[0];
                    const cleanName = filename.replace(/\.[^/.]+$/, "");
                    loadLocalTrack(filename, cleanName, false);
                    searchInput.value = cleanName;
                }
            }
        });

        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.trim();
            if (query === "") {
                searchResults.classList.remove('active');
                searchResults.innerHTML = '';
                return;
            }

            if (query.includes('youtube.com') || query.includes('youtu.be') || query.includes('music.youtube.com')) {
                searchResults.classList.remove('active');
                initYouTubeWithRetry(query, false, 0);
                return;
            }

            // Mostrar resultados locales primero
            const localFiltered = localLibrary.filter(song => song.toLowerCase().includes(query.toLowerCase()));
            
            searchResults.innerHTML = '';
            let hasResults = false;

            localFiltered.forEach((filename) => {
                hasResults = true;
                const cleanName = filename.replace(/\.[^/.]+$/, "");
                const item = document.createElement('div');
                item.className = 'search-item';
                item.innerHTML = `
                    <i class="fa-solid fa-music"></i>
                    <div class="search-item-info">
                        <h4>${cleanName}</h4>
                        <p>Local: songs/${filename}</p>
                    </div>
                `;
                item.addEventListener('click', () => {
                    loadLocalTrack(filename, cleanName, false);
                    searchResults.classList.remove('active');
                    searchInput.value = cleanName;
                });
                searchResults.appendChild(item);
            });

            if (hasResults) searchResults.classList.add('active');

            // Búsqueda en YouTube con debounce vía Piped API
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(async () => {
                let ytData = null;
                for (let api of pipedInstances) {
                    try {
                        const response = await fetch(`${api}/search?q=${encodeURIComponent(query)}&filter=videos`);
                        if (response.ok) {
                            ytData = await response.json();
                            break;
                        }
                    } catch (err) {
                        continue;
                    }
                }

                if (ytData && ytData.items && ytData.items.length > 0) {
                    ytData.items.slice(0, 5).forEach(item => {
                        const videoId = item.url ? item.url.split('v=')[1] : null;
                        if (!videoId) return;
                        const urlVideo = `https://www.youtube.com/watch?v=${videoId}`;

                        const ytItem = document.createElement('div');
                        ytItem.className = 'search-item';
                        ytItem.innerHTML = `
                            <img src="${item.thumbnail}" width="60" style="border-radius:4px; vertical-align:middle; object-fit:cover; height:45px;">
                            <div class="search-item-info" style="margin-left: 10px;">
                                <h4 style="font-size:0.85rem;">${item.title}</h4>
                                <p>YouTube</p>
                            </div>
                        `;
                        ytItem.addEventListener('click', () => {
                            searchInput.value = urlVideo;
                            initYouTubeWithRetry(urlVideo, false, 0);
                            searchResults.classList.remove('active');
                        });
                        searchResults.appendChild(ytItem);
                    });
                    searchResults.classList.add('active');
                }
            }, 400);
        });

        function loadLocalTrack(filename, cleanName, autoPlay = false, startTime = 0) {
            clearProgressInterval();
            mode = 'local';
            currentSongFilename = filename;
            currentYoutubeUrl = null;
            ytContainerEl.classList.remove('active');
            if (ytPlayer && typeof ytPlayer.destroy === 'function') {
                ytPlayer.destroy();
                ytPlayer = null;
            }

            audio.src = `songs/${filename}`;
            audio.load();
            trackTitle.textContent = cleanName;
            trackArtist.textContent = "Reproductor Local";

            audio.onloadedmetadata = () => {
                if (startTime > 0) audio.currentTime = startTime;
            };

            if (autoPlay) {
                audio.play().then(() => {
                    playIcon.classList.replace('fa-play', 'fa-pause');
                    vinyl.classList.add('spinning');
                    updateMasterState();
                    updateCenterButtonState();
                }).catch(err => console.log(err));
            } else {
                audio.pause();
                playIcon.classList.replace('fa-pause', 'fa-play');
                vinyl.classList.remove('spinning');
                updateMasterState();
                updateCenterButtonState();
            }
        }

        function ensureTrackPlayback(songFilename, youtubeUrl, startTime = 0) {
            if (youtubeUrl) {
                initYouTubeWithRetry(youtubeUrl, true, startTime);
            } else if (songFilename) {
                if (currentSongFilename === songFilename && mode === 'local') {
                    if (audio.paused) {
                        audio.play().then(() => {
                            playIcon.classList.replace('fa-play', 'fa-pause');
                            vinyl.classList.add('spinning');
                            updateMasterState();
                            updateCenterButtonState();
                        }).catch(err => console.log(err));
                    }
                } else {
                    const cleanName = songFilename.replace(/\.[^/.]+$/, "");
                    loadLocalTrack(songFilename, cleanName, true, startTime);
                }
            }
        }

        function jumpMinusOneSecond() {
            jumpTime(-1);
        }

        function getCurrentTime() {
            if (mode === 'local') return audio.currentTime;
            if (mode === 'youtube' && ytPlayer && typeof ytPlayer.getCurrentTime === 'function') return ytPlayer.getCurrentTime();
            return 0;
        }

        function getDuration() {
            if (mode === 'local') return audio.duration || 0;
            if (mode === 'youtube' && ytPlayer && typeof ytPlayer.getDuration === 'function') return ytPlayer.getDuration() || 0;
            return 0;
        }

        function initYouTubeWithRetry(url, autoPlay = false, startTime = 0, retries = 10) {
            if (!ytAPIReady && retries > 0) {
                setTimeout(() => initYouTubeWithRetry(url, autoPlay, startTime, retries - 1), 400);
                return;
            }
            if (!ytAPIReady) {
                forceInjectYouTubeAPI(url, autoPlay, startTime);
                return;
            }
            loadYouTubeTrack(url, autoPlay, startTime);
        }

        function forceInjectYouTubeAPI(url, autoPlay, startTime) {
            if (!document.getElementById('yt-script-inject')) {
                const tag = document.createElement('script');
                tag.id = 'yt-script-inject';
                tag.src = "https://www.youtube.com/iframe_api";
                document.head.appendChild(tag);
            }
            setTimeout(() => {
                ytAPIReady = true;
                loadYouTubeTrack(url, autoPlay, startTime);
            }, 1000);
        }

        function loadYouTubeTrack(url, autoPlay = false, startTime = 0) {
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
            currentSongFilename = null;
            currentYoutubeUrl = url;
            audio.pause();
            audio.src = "";

            ytContainerEl.classList.add('active');
            trackTitle.textContent = "Audio de YouTube";
            trackArtist.textContent = `ID: ${videoId}`;

            if (ytPlayer && typeof ytPlayer.loadVideoById === 'function') {
                ytPlayer.loadVideoById({ 'videoId': videoId, 'startSeconds': startTime });
                if (!autoPlay) ytPlayer.pauseVideo();
            } else {
                ytPlayer = new YT.Player(ytContainerId, {
                    height: '90',
                    width: '100%',
                    videoId: videoId,
                    playerVars: { 'autoplay': autoPlay ? 1 : 0, 'controls': 1, 'start': startTime, 'modestbranding': 1 },
                    events: {
                        'onReady': (event) => {
                            if (autoPlay) {
                                event.target.playVideo();
                                playIcon.classList.replace('fa-play', 'fa-pause');
                                vinyl.classList.add('spinning');
                            } else {
                                event.target.pauseVideo();
                                playIcon.classList.replace('fa-pause', 'fa-play');
                                vinyl.classList.remove('spinning');
                            }
                            event.target.setVolume(volInput.value * 100);
                            updateMasterState();
                            updateCenterButtonState();
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
                            updateCenterButtonState();
                        }
                    }
                });
            }

            progressInterval = setInterval(() => {
                if (mode === 'youtube' && ytPlayer && typeof ytPlayer.getCurrentTime === 'function') {
                    const current = ytPlayer.getCurrentTime() || 0;
                    const duration = ytPlayer.getDuration() || 1;
                    currentTimeEl.textContent = formatTime(current);
                    durationEl.textContent = formatTime(duration);
                    if (!isDraggingSeek) {
                        seekInput.value = (current / duration) * 100;
                    }
                    checkCrossfade(current, duration);
                }
            }, 500);
        }

        document.addEventListener('click', (e) => {
            if (!searchInput.contains(e.target) && !searchResults.contains(e.target)) {
                searchResults.classList.remove('active');
            }
        });

        return {
            getMode: () => mode,
            getAudio: () => audio,
            getYtPlayer: () => ytPlayer,
            getCurrentSongFilename: () => currentSongFilename,
            getCurrentYoutubeUrl: () => currentYoutubeUrl,
            isPlaying,
            getCurrentTime,
            ensureTrackPlayback,
            setVolumeLevel,
            jumpTime,
            jumpMinusOneSecond,
            updateVolumeUI,
            loadLocalTrack,
            initYouTubeWithRetry,
            playBtn,
            playIcon,
            vinyl,
            togglePlay
        };
    };

    deckLeftInstance = setupDeck('Left');
    deckRightInstance = setupDeck('Right');

    function updateCenterButtonState() {
        const leftPlay = deckLeftInstance.isPlaying();
        const rightPlay = deckRightInstance.isPlaying();

        if ((leftPlay && !rightPlay) || (!leftPlay && rightPlay)) {
            transitionCenterBtn.disabled = false;
        } else {
            transitionCenterBtn.disabled = true;
        }
    }

    function executeManualTransition() {
        if (transitionCenterBtn.disabled) return;

        const leftPlay = deckLeftInstance.isPlaying();
        const activeSide = leftPlay ? 'Left' : 'Right';
        triggerCrossfadeTransition(activeSide);
    }

    transitionCenterBtn.addEventListener('click', executeManualTransition);

    function triggerCrossfadeTransition(activeSide) {
        const outgoingDeck = activeSide === 'Left' ? deckLeftInstance : deckRightInstance;
        const incomingDeck = activeSide === 'Left' ? deckRightInstance : deckLeftInstance;

        let targetSong = incomingDeck.getCurrentSongFilename();
        let targetYtUrl = incomingDeck.getCurrentYoutubeUrl();

        if (!targetSong && !targetYtUrl) {
            targetSong = outgoingDeck.getCurrentSongFilename();
            targetYtUrl = outgoingDeck.getCurrentYoutubeUrl();
        }

        if (!targetSong && !targetYtUrl && localLibrary.length > 0) {
            targetSong = localLibrary[0];
        }

        const currentTime = outgoingDeck.getCurrentTime();

        incomingDeck.ensureTrackPlayback(targetSong, targetYtUrl, currentTime);

        let steps = 50;
        let stepTime = 5000 / steps;
        let currentStep = 0;

        let outVolStart = outgoingDeck.getMode() === 'local' ? outgoingDeck.getAudio().volume : (outgoingDeck.getYtPlayer() && outgoingDeck.getYtPlayer().getVolume ? outgoingDeck.getYtPlayer().getVolume() / 100 : 1);
        let inVolTarget = 1;

        incomingDeck.setVolumeLevel(0);

        let fadeInterval = setInterval(() => {
            currentStep++;
            let progress = currentStep / steps;

            let newOutVol = Math.max(0, outVolStart * (1 - progress));
            outgoingDeck.setVolumeLevel(newOutVol);

            let newInVol = Math.min(1, inVolTarget * progress);
            incomingDeck.setVolumeLevel(newInVol);

            if (currentStep >= steps) {
                clearInterval(fadeInterval);
                if (outgoingDeck.getMode() === 'local') {
                    outgoingDeck.getAudio().pause();
                } else if (outgoingDeck.getMode() === 'youtube') {
                    const yt = outgoingDeck.getYtPlayer();
                    if (yt && typeof yt.pauseVideo === 'function') yt.pauseVideo();
                }
                updateCenterButtonState();
            }
        }, stepTime);
    }

    let preMasterStates = { left: false, right: false };

    masterPlayPauseBtn.addEventListener('click', toggleMasterPlayPause);

    function toggleMasterPlayPause() {
        const leftPlaying = deckLeftInstance.isPlaying();
        const rightPlaying = deckRightInstance.isPlaying();

        if (leftPlaying || rightPlaying) {
            preMasterStates.left = leftPlaying;
            preMasterStates.right = rightPlaying;
            if (leftPlaying) deckLeftInstance.togglePlay();
            if (rightPlaying) deckRightInstance.togglePlay();
        } else {
            if (preMasterStates.left) deckLeftInstance.togglePlay();
            if (preMasterStates.right) deckRightInstance.togglePlay();
            if (!preMasterStates.left && !preMasterStates.right) {
                if (deckLeftInstance.getMode() !== 'none') deckLeftInstance.togglePlay();
                if (deckRightInstance.getMode() !== 'none') deckRightInstance.togglePlay();
            }
        }
        updateMasterState();
        updateCenterButtonState();
    }

    function updateMasterState() {
        const leftPlaying = deckLeftInstance.isPlaying();
        const rightPlaying = deckRightInstance.isPlaying();

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

    document.addEventListener('keydown', (e) => {
        if (e.target.tagName === 'INPUT') return;
        const key = e.key.toUpperCase();

        if (key === 'Q') deckLeftInstance.togglePlay();
        else if (key === 'P') deckRightInstance.togglePlay();
        else if (key === 'G') executeManualTransition();
        else if (e.code === 'Space') {
            e.preventDefault();
            toggleMasterPlayPause();
        }
        else if (key === 'Z') deckLeftInstance.jumpMinusOneSecond();
        else if (key === 'M') deckRightInstance.jumpMinusOneSecond();
        else if (key === 'A') deckLeftInstance.jumpTime(-10);
        else if (key === 'F') deckLeftInstance.jumpTime(10);
        else if (key === 'H') deckRightInstance.jumpTime(-10);
        else if (e.key === "'") deckRightInstance.jumpTime(10);
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