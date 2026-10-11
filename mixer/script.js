let ytAPIReady = false;

if (window.YT && window.YT.Player) {
    ytAPIReady = true;
} else {
    window.onYouTubeIframeAPIReady = function() {
        ytAPIReady = true;
    };
}

document.addEventListener('DOMContentLoaded', () => {
    console.log("v1.5")
    const settingsBtn = document.getElementById('settingsBtn');
    const settingsModal = document.getElementById('settingsModal');
    const closeSettingsModal = document.getElementById('closeSettingsModal');
    const closeSettingsIconBtn = document.getElementById('closeSettingsIconBtn');
    const playlistModeToggle = document.getElementById('playlistModeToggle');

    const helpBtn = document.getElementById('helpBtn');
    const helpModal = document.getElementById('helpModal');
    const closeModal = document.getElementById('closeModal');

    if (settingsBtn) {
        settingsBtn.addEventListener('click', () => settingsModal.classList.add('active'));
    }
    if (closeSettingsModal) {
        closeSettingsModal.addEventListener('click', () => settingsModal.classList.remove('active'));
    }
    if (closeSettingsIconBtn) {
        closeSettingsIconBtn.addEventListener('click', () => settingsModal.classList.remove('active'));
    }
    if (settingsModal) {
        settingsModal.addEventListener('click', (e) => {
            if (e.target === settingsModal) settingsModal.classList.remove('active');
        });
    }

    if (helpBtn) {
        helpBtn.addEventListener('click', () => helpModal.classList.add('active'));
    }
    if (closeModal) {
        closeModal.addEventListener('click', () => helpModal.classList.remove('active'));
    }
    if (helpModal) {
        helpModal.addEventListener('click', (e) => {
            if (e.target === helpModal) helpModal.classList.remove('active');
        });
    }

    const masterPlayPauseBtn = document.getElementById('masterPlayPauseBtn');
    const masterIcon = document.getElementById('masterIcon');
    const crossfadeToggle = document.getElementById('crossfadeToggle');
    const transitionCenterBtn = document.getElementById('transitionCenterBtn');

    let deckLeftInstance = null;
    let deckRightInstance = null;
    let playlistModeActive = false;

    const pipedInstances = [
        'https://pipedapi.kavin.rocks',
        'https://api.piped.private.coffee',
        'https://pipedapi.mha.fi'
    ];

    const setupDeck = (side) => {
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
            if (ytPlayer && typeof ytPlayer.setVolume === 'function') {
                ytPlayer.setVolume(value * 100);
            }
        };

        const isPlaying = () => {
            if (mode === 'youtube' && ytPlayer && typeof ytPlayer.getPlayerState === 'function') {
                return ytPlayer.getPlayerState() === YT.PlayerState.PLAYING;
            }
            return false;
        };

        const togglePlay = () => {
            if (mode === 'youtube' && ytPlayer && typeof ytPlayer.getPlayerState === 'function') {
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
            if (ytPlayer && typeof ytPlayer.setPlaybackRate === 'function') {
                ytPlayer.setPlaybackRate(rate);
            }
        });

        const checkCrossfade = (currentTime, duration) => {
            if (playlistModeActive) return;
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

        seekInput.addEventListener('mousedown', () => isDraggingSeek = true);
        seekInput.addEventListener('touchstart', () => isDraggingSeek = true);

        seekInput.addEventListener('input', (e) => {
            const val = parseFloat(e.target.value);
            if (ytPlayer && ytPlayer.getDuration) {
                currentTimeEl.textContent = formatTime((val / 100) * ytPlayer.getDuration());
            }
        });

        seekInput.addEventListener('change', (e) => {
            const val = parseFloat(e.target.value);
            if (ytPlayer && ytPlayer.seekTo) {
                const targetTime = (val / 100) * ytPlayer.getDuration();
                ytPlayer.seekTo(targetTime, true);
            }
            isDraggingSeek = false;
        });

        back10Btn.addEventListener('click', () => jumpTime(-10));
        fwd10Btn.addEventListener('click', () => jumpTime(10));

        function jumpTime(seconds) {
            if (ytPlayer && ytPlayer.getCurrentTime && ytPlayer.seekTo) {
                const cur = ytPlayer.getCurrentTime();
                const dur = ytPlayer.getDuration() || 0;
                ytPlayer.seekTo(Math.max(0, Math.min(dur, cur + seconds)), true);
            }
        }

        prevBtn.addEventListener('click', () => {
            const currentTime = getCurrentTime();
            if (currentTime > 3) {
                if (ytPlayer && ytPlayer.seekTo) ytPlayer.seekTo(0, true);
            }
        });

        nextBtn.addEventListener('click', () => {
            const duration = getDuration();
            if (duration > 3) {
                if (ytPlayer && ytPlayer.seekTo) ytPlayer.seekTo(duration - 3.5, true);
            }
        });

        let searchTimeout = null;

        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                const query = searchInput.value.trim();
                
                if (query.includes('youtube.com') || query.includes('youtu.be') || query.includes('music.youtube.com')) {
                    searchResults.classList.remove('active');
                    initYouTubeWithRetry(query, false, 0);
                    return;
                }

                if (!query || !searchResults.classList.contains('active')) return;

                const firstItem = searchResults.querySelector('.search-item');
                if (firstItem) {
                    firstItem.click();
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

            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(async () => {
                let ytData = null;
                for (let api of pipedInstances) {
                    try {
                        const response = await fetch(`${api}/search?q=${encodeURIComponent(query)}&filter=music_songs`);
                        if (response.ok) {
                            ytData = await response.json();
                            break;
                        }
                    } catch (err) {
                        continue;
                    }
                }

                searchResults.innerHTML = '';
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
                                <p>YouTube Music</p>
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

        function ensureTrackPlayback(youtubeUrl) {
            if (!youtubeUrl) return;

            if (currentYoutubeUrl === youtubeUrl && ytPlayer && typeof ytPlayer.playVideo === 'function') {
                ytPlayer.playVideo();
                playIcon.classList.replace('fa-play', 'fa-pause');
                vinyl.classList.add('spinning');
                updateMasterState();
                updateCenterButtonState();
            } else {
                initYouTubeWithRetry(youtubeUrl, true, 0);
            }
        }

        function jumpMinusOneSecond() {
            jumpTime(-1);
        }

        function getCurrentTime() {
            if (mode === 'youtube' && ytPlayer && typeof ytPlayer.getCurrentTime === 'function') return ytPlayer.getCurrentTime();
            return 0;
        }

        function getDuration() {
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
                alert("Enlace no válido.");
                return;
            }

            clearProgressInterval();
            mode = 'youtube';
            currentYoutubeUrl = url;

            ytContainerEl.classList.add('active');
            trackTitle.textContent = "YouTube Music";
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
                            } else if (event.data === YT.PlayerState.PAUSED) {
                                playIcon.classList.replace('fa-pause', 'fa-play');
                                vinyl.classList.remove('spinning');
                            } else if (event.data === YT.PlayerState.ENDED) {
                                // Al finalizar el audio (100%), se posiciona en 0s y se frena
                                event.target.seekTo(0, true);
                                event.target.pauseVideo();
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
            getYtPlayer: () => ytPlayer,
            getCurrentYoutubeUrl: () => currentYoutubeUrl,
            isPlaying,
            getCurrentTime,
            getDuration,
            ensureTrackPlayback,
            setVolumeLevel,
            jumpTime,
            jumpMinusOneSecond,
            updateVolumeUI,
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

        let targetYtUrl = incomingDeck.getCurrentYoutubeUrl();
        if (!targetYtUrl) {
            targetYtUrl = outgoingDeck.getCurrentYoutubeUrl();
        }

        if (targetYtUrl) {
            incomingDeck.ensureTrackPlayback(targetYtUrl);
        }

        let steps = 50;
        let stepTime = 5000 / steps;
        let currentStep = 0;

        let outVolStart = (outgoingDeck.getYtPlayer() && outgoingDeck.getYtPlayer().getVolume ? outgoingDeck.getYtPlayer().getVolume() / 100 : 1);
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
                const yt = outgoingDeck.getYtPlayer();
                if (yt && typeof yt.pauseVideo === 'function') yt.pauseVideo();
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
                if (deckLeftInstance.getCurrentYoutubeUrl()) deckLeftInstance.togglePlay();
                if (deckRightInstance.getCurrentYoutubeUrl()) deckRightInstance.togglePlay();
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

    /* ========================================================
       SISTEMA DE PLAYLIST, PANEL LATERAL Y REPRODUCCIÓN CONTINUA
       ======================================================== */

    const playlistDrawerToggle = document.getElementById('playlistDrawerToggle');
    const playlistToggleIcon = document.getElementById('playlistToggleIcon');
    const drawerBackdrop = document.getElementById('drawerBackdrop');
    const playlistDrawer = document.getElementById('playlistDrawer');
    const closeDrawerBtn = document.getElementById('closeDrawerBtn');

    const drawerSearchInput = document.getElementById('drawerSearchInput');
    const drawerSearchResults = document.getElementById('drawerSearchResults');

    const playlistCount = document.getElementById('playlistCount');
    const clearPlaylistBtn = document.getElementById('clearPlaylistBtn');
    const playlistEmpty = document.getElementById('playlistEmpty');
    const playlistList = document.getElementById('playlistList');

    const drawerPlaylistControls = document.getElementById('drawerPlaylistControls');
    const playlistCurrentTrack = document.getElementById('playlistCurrentTrack');
    const playlistCurrentTime = document.getElementById('playlistCurrentTime');
    const playlistDuration = document.getElementById('playlistDuration');
    const playlistSeek = document.getElementById('playlistSeek');
    const playlistPrevBtn = document.getElementById('playlistPrevBtn');
    const playlistPlayPauseBtn = document.getElementById('playlistPlayPauseBtn');
    const playlistPlayIcon = document.getElementById('playlistPlayIcon');
    const playlistNextBtn = document.getElementById('playlistNextBtn');

    // Estado de la Playlist
    let playlist = [];
    try {
        const saved = localStorage.getItem('dj_studio_playlist');
        if (saved) playlist = JSON.parse(saved);
    } catch(e) {
        playlist = [];
    }

    let playlistCurrentIndex = 0;
    let currentPlayingDeckSide = 'Left'; // Alterna entre 'Left' y 'Right'
    let playlistTransitioning = false;
    let playlistFadeInterval = null;
    let playlistProgressInterval = null;
    let isDraggingPlaylistSeek = false;

    function savePlaylist() {
        try {
            localStorage.setItem('dj_studio_playlist', JSON.stringify(playlist));
        } catch(e) {}
    }

    // Funciones de apertura / cierre del drawer
    function openPlaylistDrawer() {
        playlistDrawer.classList.add('open');
        drawerBackdrop.classList.add('active');
        playlistDrawerToggle.classList.add('drawer-open');
        document.body.classList.add('drawer-open');
    }

    function closePlaylistDrawer() {
        playlistDrawer.classList.remove('open');
        drawerBackdrop.classList.remove('active');
        playlistDrawerToggle.classList.remove('drawer-open');
        document.body.classList.remove('drawer-open');
        if (drawerSearchResults) drawerSearchResults.classList.remove('active');
    }

    function togglePlaylistDrawer() {
        if (playlistDrawer.classList.contains('open')) {
            closePlaylistDrawer();
        } else {
            openPlaylistDrawer();
        }
    }

    if (playlistDrawerToggle) playlistDrawerToggle.addEventListener('click', togglePlaylistDrawer);
    if (closeDrawerBtn) closeDrawerBtn.addEventListener('click', closePlaylistDrawer);
    if (drawerBackdrop) drawerBackdrop.addEventListener('click', closePlaylistDrawer);

    // Helpers de YouTube
    function isYouTubeUrl(url) {
        if (!url || typeof url !== 'string') return false;
        return url.includes('youtube.com') || url.includes('youtu.be') || url.includes('music.youtube.com');
    }

    function extractVideoId(url) {
        let videoId = "";
        if (url.includes('v=')) {
            videoId = url.split('v=')[1]?.split('&')[0];
        } else if (url.includes('youtu.be/')) {
            videoId = url.split('youtu.be/')[1]?.split('?')[0];
        } else if (url.includes('embed/')) {
            videoId = url.split('embed/')[1]?.split('?')[0];
        }
        return videoId || "dQw4w9WgXcQ";
    }

    // Búsqueda en el Drawer (YouTube Music / Piped)
    let drawerSearchTimeout = null;

    if (drawerSearchInput) {
        drawerSearchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                const query = drawerSearchInput.value.trim();
                if (isYouTubeUrl(query)) {
                    const vid = extractVideoId(query);
                    addSongToPlaylist({
                        title: 'Canción de YouTube',
                        artist: `ID: ${vid}`,
                        url: query,
                        thumbnail: `https://img.youtube.com/vi/${vid}/hqdefault.jpg`
                    });
                    drawerSearchInput.value = '';
                    drawerSearchResults.classList.remove('active');
                    return;
                }
                const firstResult = drawerSearchResults.querySelector('.search-item');
                if (firstResult) firstResult.click();
            }
        });

        drawerSearchInput.addEventListener('input', (e) => {
            const query = e.target.value.trim();
            if (query === "") {
                drawerSearchResults.classList.remove('active');
                drawerSearchResults.innerHTML = '';
                return;
            }

            if (isYouTubeUrl(query)) {
                const vid = extractVideoId(query);
                addSongToPlaylist({
                    title: 'Canción de YouTube',
                    artist: `ID: ${vid}`,
                    url: query,
                    thumbnail: `https://img.youtube.com/vi/${vid}/hqdefault.jpg`
                });
                drawerSearchInput.value = '';
                drawerSearchResults.classList.remove('active');
                return;
            }

            clearTimeout(drawerSearchTimeout);
            drawerSearchTimeout = setTimeout(async () => {
                let ytData = null;
                for (let api of pipedInstances) {
                    try {
                        const response = await fetch(`${api}/search?q=${encodeURIComponent(query)}&filter=music_songs`);
                        if (response.ok) {
                            ytData = await response.json();
                            break;
                        }
                    } catch (err) {
                        continue;
                    }
                }

                drawerSearchResults.innerHTML = '';
                if (ytData && ytData.items && ytData.items.length > 0) {
                    ytData.items.slice(0, 6).forEach(item => {
                        const videoId = item.url ? item.url.split('v=')[1] : null;
                        if (!videoId) return;
                        const urlVideo = `https://www.youtube.com/watch?v=${videoId}`;

                        const itemEl = document.createElement('div');
                        itemEl.className = 'search-item';
                        itemEl.innerHTML = `
                            <img src="${item.thumbnail}" width="50" height="38" style="border-radius:4px; vertical-align:middle; object-fit:cover;">
                            <div class="search-item-info" style="margin-left: 10px; flex: 1; overflow: hidden;">
                                <h4 style="font-size:0.85rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${item.title}</h4>
                                <p style="font-size:0.75rem; color:var(--text-muted);">${item.uploaderName || 'YouTube Music'}</p>
                            </div>
                            <span style="color:var(--accent); font-size:1.1rem; padding: 0 4px;" title="Agregar a la lista"><i class="fa-solid fa-plus"></i></span>
                        `;
                        itemEl.addEventListener('click', () => {
                            addSongToPlaylist({
                                title: item.title,
                                artist: item.uploaderName || 'YouTube Music',
                                url: urlVideo,
                                thumbnail: item.thumbnail
                            });
                            drawerSearchInput.value = '';
                            drawerSearchResults.classList.remove('active');
                            drawerSearchResults.innerHTML = '';
                        });
                        drawerSearchResults.appendChild(itemEl);
                    });
                    drawerSearchResults.classList.add('active');
                } else {
                    drawerSearchResults.classList.remove('active');
                }
            }, 350);
        });
    }

    document.addEventListener('click', (e) => {
        if (drawerSearchInput && drawerSearchResults) {
            if (!drawerSearchInput.contains(e.target) && !drawerSearchResults.contains(e.target)) {
                drawerSearchResults.classList.remove('active');
            }
        }
    });

    // Gestión y renderizado de la Playlist
    function addSongToPlaylist(song) {
        playlist.push(song);
        savePlaylist();
        renderPlaylist();

        // Si el modo playlist está activo pero no había ninguna canción reproduciéndose
        if (playlistModeActive && playlist.length === 1) {
            startPlaylistTrack(0, 'Left', true);
        }
    }

    function removeSongFromPlaylist(index) {
        const wasPlayingThis = playlistModeActive && playlistCurrentIndex === index;
        playlist.splice(index, 1);
        savePlaylist();

        if (playlist.length === 0) {
            playlistCurrentIndex = 0;
            if (playlistModeActive) {
                if (deckLeftInstance.isPlaying()) deckLeftInstance.togglePlay();
                if (deckRightInstance.isPlaying()) deckRightInstance.togglePlay();
                playlistCurrentTrack.textContent = "Playlist vacía";
            }
        } else if (wasPlayingThis) {
            playlistCurrentIndex = playlistCurrentIndex % playlist.length;
            if (playlistModeActive) {
                startPlaylistTrack(playlistCurrentIndex, currentPlayingDeckSide, false);
            }
        } else if (playlistCurrentIndex >= playlist.length) {
            playlistCurrentIndex = 0;
        }

        renderPlaylist();
    }

    if (clearPlaylistBtn) {
        clearPlaylistBtn.addEventListener('click', () => {
            if (playlist.length === 0) return;
            if (confirm("¿Vaciar todas las canciones de la playlist?")) {
                playlist = [];
                savePlaylist();
                if (playlistModeActive) {
                    if (deckLeftInstance.isPlaying()) deckLeftInstance.togglePlay();
                    if (deckRightInstance.isPlaying()) deckRightInstance.togglePlay();
                    playlistCurrentTrack.textContent = "Playlist vacía";
                }
                renderPlaylist();
            }
        });
    }

    const sharePlaylistBtn = document.getElementById('sharePlaylistBtn');
    let toastTimeout = null;

    function showToast(message, icon = 'fa-check') {
        const toast = document.getElementById('toastNotification');
        if (!toast) return;
        toast.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${message}</span>`;
        toast.classList.add('show');
        clearTimeout(toastTimeout);
        toastTimeout = setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }

    // Compartir Playlist (Web Share API / Enlace Copiado con datos URL)
    if (sharePlaylistBtn) {
        sharePlaylistBtn.addEventListener('click', async () => {
            if (playlist.length === 0) {
                showToast("Agrega canciones antes de compartir tu playlist.", "fa-circle-info");
                return;
            }

            try {
                // Minificar lista para generar un enlace ligero
                const compact = playlist.map(s => ({
                    t: s.title,
                    a: s.artist,
                    u: s.url,
                    m: s.thumbnail
                }));

                const encodedData = encodeURIComponent(btoa(unescape(encodeURIComponent(JSON.stringify(compact)))));
                const shareUrl = `${window.location.origin}${window.location.pathname}?playlist=${encodedData}`;

                if (navigator.share) {
                    try {
                        await navigator.share({
                            title: 'Playlist - Dual Player Music Studio',
                            text: `¡Te comparto esta playlist con ${playlist.length} canciones!`,
                            url: shareUrl
                        });
                        showToast("¡Playlist compartida exitosamente!", "fa-share-nodes");
                        return;
                    } catch(err) {
                        if (err.name === 'AbortError') return;
                    }
                }

                // Fallback: Copiar al portapapeles
                await navigator.clipboard.writeText(shareUrl);
                showToast("¡Enlace de playlist copiado al portapapeles!", "fa-link");
            } catch(e) {
                console.error("Error al compartir:", e);
                showToast("No se pudo generar el enlace para compartir.", "fa-triangle-exclamation");
            }
        });
    }

    // Detectar e importar playlist compartida desde la URL al cargar
    function checkImportSharedPlaylist() {
        try {
            const urlParams = new URLSearchParams(window.location.search);
            const sharedParam = urlParams.get('playlist');
            if (!sharedParam) return;

            const jsonStr = decodeURIComponent(escape(atob(decodeURIComponent(sharedParam))));
            const imported = JSON.parse(jsonStr);

            if (Array.isArray(imported) && imported.length > 0) {
                const newSongs = imported.map(s => ({
                    title: s.t || s.title || 'Canción',
                    artist: s.a || s.artist || 'YouTube Music',
                    url: s.u || s.url,
                    thumbnail: s.m || s.thumbnail || `https://img.youtube.com/vi/${extractVideoId(s.u || s.url)}/hqdefault.jpg`
                }));

                if (playlist.length > 0) {
                    const shouldMerge = confirm(`Se ha compartido una playlist con ${newSongs.length} canciones.\n¿Deseas agregar estas canciones a tu playlist existente? (Aceptar = Agregar, Cancelar = Reemplazar)`);
                    if (shouldMerge) {
                        playlist = [...playlist, ...newSongs];
                    } else {
                        playlist = newSongs;
                    }
                } else {
                    playlist = newSongs;
                }

                savePlaylist();
                renderPlaylist();
                openPlaylistDrawer();
                showToast(`¡Se cargaron ${newSongs.length} canciones compartidas!`, "fa-folder-plus");

                // Limpiar parámetro URL para evitar re-importación al refrescar
                window.history.replaceState({}, document.title, window.location.pathname);
            }
        } catch(e) {
            console.error("Error al importar playlist:", e);
        }
    }

    // Drag & Drop para modificar el orden de la Playlist
    let draggedItemIndex = null;

    function setupDragAndDrop(card, idx) {
        card.setAttribute('draggable', 'true');

        // Eventos HTML5 Drag (Desktop)
        card.addEventListener('dragstart', (e) => {
            draggedItemIndex = idx;
            card.classList.add('is-dragging');
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', idx);
        });

        card.addEventListener('dragend', () => {
            card.classList.remove('is-dragging');
            document.querySelectorAll('.playlist-card').forEach(c => c.classList.remove('drag-over-top', 'drag-over-bottom'));
            draggedItemIndex = null;
        });

        card.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            if (draggedItemIndex === null || draggedItemIndex === idx) return;

            const rect = card.getBoundingClientRect();
            const relY = e.clientY - rect.top;
            if (relY < rect.height / 2) {
                card.classList.add('drag-over-top');
                card.classList.remove('drag-over-bottom');
            } else {
                card.classList.add('drag-over-bottom');
                card.classList.remove('drag-over-top');
            }
        });

        card.addEventListener('dragleave', () => {
            card.classList.remove('drag-over-top', 'drag-over-bottom');
        });

        card.addEventListener('drop', (e) => {
            e.preventDefault();
            card.classList.remove('drag-over-top', 'drag-over-bottom');
            if (draggedItemIndex === null || draggedItemIndex === idx) return;

            reorderPlaylist(draggedItemIndex, idx);
            draggedItemIndex = null;
        });

        // Soporte Touch Drag (Móvil / Pantalla Táctil)
        const handle = card.querySelector('.drag-handle');
        if (handle) {
            handle.addEventListener('touchstart', (e) => {
                draggedItemIndex = idx;
                card.classList.add('is-dragging');
            }, { passive: true });

            handle.addEventListener('touchmove', (e) => {
                const touch = e.touches[0];
                const elem = document.elementFromPoint(touch.clientX, touch.clientY);
                const overCard = elem ? elem.closest('.playlist-card') : null;

                document.querySelectorAll('.playlist-card').forEach(c => c.classList.remove('drag-over-top', 'drag-over-bottom'));
                if (overCard && overCard !== card) {
                    const rect = overCard.getBoundingClientRect();
                    if (touch.clientY < rect.top + rect.height / 2) {
                        overCard.classList.add('drag-over-top');
                    } else {
                        overCard.classList.add('drag-over-bottom');
                    }
                }
            }, { passive: true });

            handle.addEventListener('touchend', (e) => {
                card.classList.remove('is-dragging');
                const touch = e.changedTouches[0];
                const elem = document.elementFromPoint(touch.clientX, touch.clientY);
                const overCard = elem ? elem.closest('.playlist-card') : null;
                document.querySelectorAll('.playlist-card').forEach(c => c.classList.remove('drag-over-top', 'drag-over-bottom'));

                if (overCard && overCard !== card) {
                    const targetIdx = parseInt(overCard.dataset.index);
                    if (!isNaN(targetIdx) && draggedItemIndex !== null && targetIdx !== draggedItemIndex) {
                        reorderPlaylist(draggedItemIndex, targetIdx);
                    }
                }
                draggedItemIndex = null;
            });
        }
    }

    function reorderPlaylist(fromIdx, toIdx) {
        if (fromIdx < 0 || fromIdx >= playlist.length || toIdx < 0 || toIdx >= playlist.length) return;

        const currentSong = playlistModeActive && playlist[playlistCurrentIndex] ? playlist[playlistCurrentIndex] : null;

        const [item] = playlist.splice(fromIdx, 1);
        playlist.splice(toIdx, 0, item);

        // Mantener la sincronización con la canción que está tocando
        if (currentSong) {
            const newIdx = playlist.indexOf(currentSong);
            if (newIdx !== -1) playlistCurrentIndex = newIdx;
        }

        savePlaylist();
        renderPlaylist();
        showToast("Orden de la playlist actualizado", "fa-arrows-up-down");
    }

    function renderPlaylist() {
        if (!playlistCount || !playlistEmpty || !playlistList) return;
        playlistCount.textContent = playlist.length;

        if (playlist.length === 0) {
            playlistEmpty.style.display = 'block';
            playlistList.innerHTML = '';
            return;
        }

        playlistEmpty.style.display = 'none';
        playlistList.innerHTML = '';

        playlist.forEach((song, idx) => {
            const isPlayingThis = playlistModeActive && playlistCurrentIndex === idx;
            const card = document.createElement('div');
            card.className = `playlist-card ${isPlayingThis ? 'is-playing' : ''}`;
            card.dataset.index = idx;

            card.innerHTML = `
                <div class="drag-handle" title="Mantén y arrastra para cambiar el orden">
                    <i class="fa-solid fa-grip-vertical"></i>
                </div>
                <img src="${song.thumbnail || 'https://via.placeholder.com/46'}" class="playlist-thumb" alt="Carátula" draggable="false">
                <div class="playlist-card-content">
                    <h4 class="playlist-card-title" title="${song.title}">
                        ${isPlayingThis ? '<i class="fa-solid fa-volume-high" style="color:#10b981; margin-right:5px;"></i>' : ''}
                        ${song.title}
                    </h4>
                    <p class="playlist-card-artist">${song.artist || 'YouTube Music'}</p>
                    <div class="playlist-deck-actions">
                        <button class="deck-btn-target left" data-deck="Left" title="Colocar en Deck Izquierdo (sin reproducir)">
                            <i class="fa-solid fa-arrow-left"></i> Deck Izq
                        </button>
                        <button class="deck-btn-target right" data-deck="Right" title="Colocar en Deck Derecho (sin reproducir)">
                            Deck Der <i class="fa-solid fa-arrow-right"></i>
                        </button>
                    </div>
                </div>
                <button class="playlist-remove-btn" data-remove="${idx}" title="Quitar de la lista">
                    <i class="fa-solid fa-trash-can"></i>
                </button>
            `;

            // Configurar funcionalidad de arrastrar
            setupDragAndDrop(card, idx);

            // Colocar en Deck Izquierdo (sin reproducir de inmediato)
            card.querySelector('.deck-btn-target.left').addEventListener('click', (e) => {
                e.stopPropagation();
                loadSongDirectlyIntoDeck('Left', song);
            });

            // Colocar en Deck Derecho (sin reproducir de inmediato)
            card.querySelector('.deck-btn-target.right').addEventListener('click', (e) => {
                e.stopPropagation();
                loadSongDirectlyIntoDeck('Right', song);
            });

            // Quitar canción
            card.querySelector('.playlist-remove-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                removeSongFromPlaylist(idx);
            });

            // Clic en la tarjeta
            card.addEventListener('click', (e) => {
                if (e.target.closest('button') || e.target.closest('.drag-handle')) return;
                if (playlistModeActive) {
                    startPlaylistTrack(idx, currentPlayingDeckSide, false);
                } else {
                    const leftPlaying = deckLeftInstance.isPlaying();
                    const targetSide = leftPlaying ? 'Right' : 'Left';
                    loadSongDirectlyIntoDeck(targetSide, song);
                }
            });

            playlistList.appendChild(card);
        });
    }

    // Coloca la canción en el deck sin reproducirla inmediatamente (autoPlay = false)
    function loadSongDirectlyIntoDeck(side, song) {
        if (playlistModeActive) {
            playlistModeToggle.checked = false;
            disablePlaylistMode();
        }
        const searchInput = document.getElementById(`searchInput${side}`);
        if (searchInput) searchInput.value = song.url;
        const targetDeck = side === 'Left' ? deckLeftInstance : deckRightInstance;
        
        // autoPlay = false para colocarla en pausa
        targetDeck.initYouTubeWithRetry(song.url, false, 0);
        showToast(`Canción colocada en Deck ${side === 'Left' ? 'Izquierdo' : 'Derecho'} (Pausa)`, side === 'Left' ? 'fa-arrow-left' : 'fa-arrow-right');
    }

    // Inicializar renderizado de playlist guardada e importar compartida si existe
    renderPlaylist();
    checkImportSharedPlaylist();

    /* ========================================================
       MOTOR DE REPRODUCCIÓN EN MODO PLAYLIST (TRANSICIONES 5s)
       ======================================================== */

    if (playlistModeToggle) {
        playlistModeToggle.addEventListener('change', (e) => {
            if (e.target.checked) {
                enablePlaylistMode();
            } else {
                disablePlaylistMode();
            }
        });
    }

    function enablePlaylistMode() {
        playlistModeActive = true;
        drawerPlaylistControls.classList.add('active');

        // Detener inmediatamente cualquier canción que esté sonando en los decks
        if (deckLeftInstance.isPlaying()) {
            const ytL = deckLeftInstance.getYtPlayer();
            if (ytL && typeof ytL.pauseVideo === 'function') ytL.pauseVideo();
        }
        if (deckRightInstance.isPlaying()) {
            const ytR = deckRightInstance.getYtPlayer();
            if (ytR && typeof ytR.pauseVideo === 'function') ytR.pauseVideo();
        }

        if (playlist.length === 0) {
            playlistCurrentTrack.textContent = "Agrega canciones para reproducir";
            openPlaylistDrawer();
            return;
        }

        playlistCurrentIndex = 0;
        currentPlayingDeckSide = 'Left';
        startPlaylistTrack(playlistCurrentIndex, 'Left', true);
        startPlaylistProgressWatcher();
    }

    function disablePlaylistMode() {
        playlistModeActive = false;
        drawerPlaylistControls.classList.remove('active');
        if (playlistFadeInterval) {
            clearInterval(playlistFadeInterval);
            playlistFadeInterval = null;
        }
        if (playlistProgressInterval) {
            clearInterval(playlistProgressInterval);
            playlistProgressInterval = null;
        }
        playlistTransitioning = false;
        renderPlaylist();
    }

    function startPlaylistTrack(index, side, withIntroFade = true) {
        if (index < 0 || index >= playlist.length) return;
        playlistCurrentIndex = index;
        currentPlayingDeckSide = side;

        const track = playlist[index];
        playlistCurrentTrack.textContent = track.title;
        playlistPlayIcon.className = 'fa-solid fa-pause';
        renderPlaylist();

        const targetDeck = side === 'Left' ? deckLeftInstance : deckRightInstance;
        const otherDeck = side === 'Left' ? deckRightInstance : deckLeftInstance;

        // Asegurarse de que el otro deck esté en pausa
        const otherYt = otherDeck.getYtPlayer();
        if (otherYt && typeof otherYt.pauseVideo === 'function') {
            otherYt.pauseVideo();
        }

        const targetSearch = document.getElementById(`searchInput${side}`);
        if (targetSearch) targetSearch.value = track.url;

        if (withIntroFade) {
            // Intro de 5 segundos: empieza en volumen 0 y asciende a 1
            targetDeck.setVolumeLevel(0);
            targetDeck.initYouTubeWithRetry(track.url, true, 0);

            if (playlistFadeInterval) clearInterval(playlistFadeInterval);
            let steps = 50;
            let stepTime = 5000 / steps;
            let currentStep = 0;
            playlistFadeInterval = setInterval(() => {
                currentStep++;
                let vol = Math.min(1, currentStep / steps);
                targetDeck.setVolumeLevel(vol);
                if (currentStep >= steps) {
                    clearInterval(playlistFadeInterval);
                    playlistFadeInterval = null;
                }
            }, stepTime);
        } else {
            targetDeck.setVolumeLevel(1);
            targetDeck.initYouTubeWithRetry(track.url, true, 0);
        }
    }

    function transitionToNextPlaylistTrack() {
        if (playlistTransitioning || playlist.length === 0) return;
        if (playlist.length === 1) {
            // Una sola canción en la playlist: reiniciar con intro de 5s
            startPlaylistTrack(0, currentPlayingDeckSide, true);
            return;
        }

        playlistTransitioning = true;
        const nextIndex = (playlistCurrentIndex + 1) % playlist.length;
        const nextSide = currentPlayingDeckSide === 'Left' ? 'Right' : 'Left';

        const outgoingDeck = currentPlayingDeckSide === 'Left' ? deckLeftInstance : deckRightInstance;
        const incomingDeck = nextSide === 'Left' ? deckLeftInstance : deckRightInstance;
        const nextTrack = playlist[nextIndex];

        playlistCurrentTrack.textContent = nextTrack.title;
        const nextSearch = document.getElementById(`searchInput${nextSide}`);
        if (nextSearch) nextSearch.value = nextTrack.url;

        // La canción entrante arranca en volumen 0
        incomingDeck.setVolumeLevel(0);
        incomingDeck.initYouTubeWithRetry(nextTrack.url, true, 0);

        if (playlistFadeInterval) clearInterval(playlistFadeInterval);
        let steps = 50;
        let stepTime = 5000 / steps; // 5 segundos exactos
        let currentStep = 0;
        let outVolStart = 1;
        let inVolTarget = 1;

        playlistFadeInterval = setInterval(() => {
            currentStep++;
            let progress = currentStep / steps;

            // Outro de 5 segundos para la saliente
            let newOutVol = Math.max(0, outVolStart * (1 - progress));
            outgoingDeck.setVolumeLevel(newOutVol);

            // Intro de 5 segundos para la entrante
            let newInVol = Math.min(1, inVolTarget * progress);
            incomingDeck.setVolumeLevel(newInVol);

            if (currentStep >= steps) {
                clearInterval(playlistFadeInterval);
                playlistFadeInterval = null;

                const ytOut = outgoingDeck.getYtPlayer();
                if (ytOut && typeof ytOut.pauseVideo === 'function') ytOut.pauseVideo();
                outgoingDeck.setVolumeLevel(1);

                playlistTransitioning = false;
                currentPlayingDeckSide = nextSide;
                playlistCurrentIndex = nextIndex;
                renderPlaylist();
            }
        }, stepTime);
    }

    function startPlaylistProgressWatcher() {
        if (playlistProgressInterval) clearInterval(playlistProgressInterval);
        playlistProgressInterval = setInterval(() => {
            if (!playlistModeActive) return;

            const activeDeck = currentPlayingDeckSide === 'Left' ? deckLeftInstance : deckRightInstance;
            if (!activeDeck) return;

            const cur = activeDeck.getCurrentTime ? activeDeck.getCurrentTime() : 0;
            const dur = activeDeck.getDuration ? activeDeck.getDuration() : 0;

            playlistCurrentTime.textContent = formatTime(cur);
            playlistDuration.textContent = formatTime(dur);

            if (!isDraggingPlaylistSeek && dur > 0) {
                playlistSeek.value = (cur / dur) * 100;
            }

            if (activeDeck.isPlaying()) {
                playlistPlayIcon.className = 'fa-solid fa-pause';
            } else {
                playlistPlayIcon.className = 'fa-solid fa-play';
            }

            // Outro automático de 5 segundos
            if (dur > 8 && (dur - cur) <= 5 && !playlistTransitioning) {
                transitionToNextPlaylistTrack();
            }
        }, 500);
    }

    // Controles de Playback de la Playlist
    if (playlistPlayPauseBtn) {
        playlistPlayPauseBtn.addEventListener('click', () => {
            const activeDeck = currentPlayingDeckSide === 'Left' ? deckLeftInstance : deckRightInstance;
            if (activeDeck) {
                activeDeck.togglePlay();
            }
        });
    }

    if (playlistNextBtn) {
        playlistNextBtn.addEventListener('click', () => {
            transitionToNextPlaylistTrack();
        });
    }

    if (playlistPrevBtn) {
        playlistPrevBtn.addEventListener('click', () => {
            const activeDeck = currentPlayingDeckSide === 'Left' ? deckLeftInstance : deckRightInstance;
            const cur = activeDeck ? activeDeck.getCurrentTime() : 0;
            if (cur > 4) {
                const yt = activeDeck.getYtPlayer();
                if (yt && typeof yt.seekTo === 'function') yt.seekTo(0, true);
            } else {
                if (playlist.length > 1) {
                    const prevIndex = (playlistCurrentIndex - 1 + playlist.length) % playlist.length;
                    startPlaylistTrack(prevIndex, currentPlayingDeckSide, true);
                }
            }
        });
    }

    if (playlistSeek) {
        playlistSeek.addEventListener('mousedown', () => isDraggingPlaylistSeek = true);
        playlistSeek.addEventListener('touchstart', () => isDraggingPlaylistSeek = true);
        playlistSeek.addEventListener('input', (e) => {
            const val = parseFloat(e.target.value);
            const activeDeck = currentPlayingDeckSide === 'Left' ? deckLeftInstance : deckRightInstance;
            const dur = activeDeck && activeDeck.getDuration ? activeDeck.getDuration() : 0;
            playlistCurrentTime.textContent = formatTime((val / 100) * dur);
        });
        playlistSeek.addEventListener('change', (e) => {
            const val = parseFloat(e.target.value);
            const activeDeck = currentPlayingDeckSide === 'Left' ? deckLeftInstance : deckRightInstance;
            const dur = activeDeck && activeDeck.getDuration ? activeDeck.getDuration() : 0;
            const yt = activeDeck ? activeDeck.getYtPlayer() : null;
            if (yt && typeof yt.seekTo === 'function') {
                yt.seekTo((val / 100) * dur, true);
            }
            isDraggingPlaylistSeek = false;
        });
    }

    // Tecla Escape para cerrar drawer y modales
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closePlaylistDrawer();
            if (settingsModal) settingsModal.classList.remove('active');
            if (helpModal) helpModal.classList.remove('active');
        }
    });
});