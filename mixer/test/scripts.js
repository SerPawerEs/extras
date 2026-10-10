
const busqueda = document.getElementById("busqueda");
const botonBuscar = document.getElementById("buscar");
const resultados = document.getElementById("resultados");
const estado = document.getElementById("estado");
const reproductor = document.getElementById("reproductor");
const titulo = document.getElementById("titulo");
const preview = document.getElementById("preview");

let ultimaBusqueda = "";

botonBuscar.addEventListener("click", buscar);
busqueda.addEventListener("keydown", e => {
    if (e.key === "Enter") buscar();
});

async function buscar() {
    const texto = busqueda.value.trim();

    if (!texto) return;

    // Evita interpretar texto normal como URL
    let url;

    try {
        url = new URL(texto);
    } catch {
        url = null;
    }

    if (url && ["http:", "https:"].includes(url.protocol)) {
        reproducirEnlace(url);
        return;
    }

    await buscarCanciones(texto);
}

// Reconoce enlaces compartidos
function reproducirEnlace(url) {
    const host = url.hostname.toLowerCase();
    const path = url.pathname;
    const params = url.searchParams;

    detenerPreview();
    resultados.replaceChildren();
    reproductor.replaceChildren();

    // Spotify
    if (
        host === "open.spotify.com" ||
        host === "www.open.spotify.com"
    ) {
        const partes = path.split("/").filter(Boolean);
        const tipos = ["track", "album", "playlist", "artist", "show", "episode"];

        const indice = partes.findIndex(p => tipos.includes(p));

        if (indice === -1 || !partes[indice + 1]) {
            estado.textContent =
                "No pude identificar el contenido de Spotify. Pega un enlace de una canción, álbum o playlist.";
            return;
        }

        const tipo = partes[indice];
        const id = partes[indice + 1];

        const iframe = document.createElement("iframe");
        iframe.src = `https://open.spotify.com/embed/${tipo}/${encodeURIComponent(id)}`;
        iframe.width = "350";
        iframe.height = tipo === "track" ? "152" : "352";
        iframe.style.border = "0";
        iframe.allow = "autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture";
        iframe.allowFullscreen = true;

        reproductor.appendChild(iframe);

        titulo.textContent = "Contenido de Spotify";
        estado.textContent =
            "Si Spotify permite la reproducción, podrás escucharla aquí.";
        return;
    }

    // YouTube y YouTube Music
    if (
        host === "youtube.com" ||
        host === "www.youtube.com" ||
        host === "music.youtube.com" ||
        host === "m.youtube.com" ||
        host === "youtu.be" ||
        host === "www.youtube.com"
    ) {
        let videoId = "";

        if (host === "youtu.be" || host === "www.youtu.be") {
            videoId = path.split("/").filter(Boolean)[0] || "";
        } else {
            videoId = params.get("v") || "";

            if (!videoId && path.startsWith("/shorts/")) {
                videoId = path.split("/")[2] || "";
            }

            if (!videoId && path.startsWith("/embed/")) {
                videoId = path.split("/")[2] || "";
            }
        }

        // También admite enlaces de playlists
        const playlistId = params.get("list");

        if (videoId && /^[\w-]{11}$/.test(videoId)) {
            const iframe = document.createElement("iframe");
            iframe.src =
                "https://www.youtube.com/embed/" +
                encodeURIComponent(videoId) +
                (playlistId ? "?list=" + encodeURIComponent(playlistId) : "");

            iframe.width = "350";
            iframe.height = "200";
            iframe.allow =
                "autoplay; encrypted-media; picture-in-picture; fullscreen";
            iframe.allowFullscreen = true;

            reproductor.appendChild(iframe);
            titulo.textContent = "Reproduciendo desde YouTube";
            estado.textContent =
                "Usa los controles del reproductor para escuchar la canción.";
            return;
        }

        if (playlistId) {
            const iframe = document.createElement("iframe");
            iframe.src =
                "https://www.youtube.com/embed/videoseries?list=" +
                encodeURIComponent(playlistId);
            iframe.width = "350";
            iframe.height = "200";
            iframe.allow = "autoplay; encrypted-media; picture-in-picture";
            iframe.allowFullscreen = true;

            reproductor.appendChild(iframe);
            titulo.textContent = "Playlist de YouTube";
            estado.textContent = "Playlist cargada.";
            return;
        }

        estado.textContent =
            "No pude extraer una canción de ese enlace. Prueba con el enlace directo de un video.";
        return;
    }

    estado.textContent =
        "Enlace no reconocido. Pega un enlace de Spotify o YouTube Music.";
}

// Busca títulos en el catálogo musical de Apple
async function buscarCanciones(texto) {
    if (texto === ultimaBusqueda && resultados.children.length) return;
    ultimaBusqueda = texto;

    detenerPreview();
    reproductor.replaceChildren();
    resultados.replaceChildren();

    titulo.textContent = "Reproductor";
    estado.textContent = "Buscando canciones en Internet...";

    try {
        const endpoint =
            "https://itunes.apple.com/search?term=" +
            encodeURIComponent(texto) +
            "&entity=song&limit=20";

        const respuesta = await fetch(endpoint);

        if (!respuesta.ok) {
            throw new Error("El catálogo respondió con un error.");
        }

        const datos = await respuesta.json();

        if (!datos.results || datos.results.length === 0) {
            estado.textContent = "No se encontraron canciones.";
            return;
        }

        estado.textContent =
            `Se encontraron ${datos.results.length} resultados.`;

        datos.results.forEach(cancion => {
            const contenedor = document.createElement("div");
            const boton = document.createElement("button");
            const enlaceSpotify = document.createElement("a");
            const enlaceYoutube = document.createElement("a");

            contenedor.style.margin = "10px 0";

            boton.textContent =
                `${cancion.trackName} — ${cancion.artistName} ▶`;

            boton.addEventListener("click", () => {
                reproducirPreview(cancion);
            });

            enlaceSpotify.textContent = " Buscar en Spotify";
            enlaceSpotify.href =
                "https://open.spotify.com/search/" +
                encodeURIComponent(
                    cancion.trackName + " " + cancion.artistName
                );
            enlaceSpotify.target = "_blank";
            enlaceSpotify.rel = "noopener noreferrer";

            enlaceYoutube.textContent = " Buscar en YouTube Music";
            enlaceYoutube.href =
                "https://music.youtube.com/search?q=" +
                encodeURIComponent(
                    cancion.trackName + " " + cancion.artistName
                );
            enlaceYoutube.target = "_blank";
            enlaceYoutube.rel = "noopener noreferrer";

            contenedor.append(
                boton,
                document.createElement("br"),
                enlaceSpotify,
                document.createElement("br"),
                enlaceYoutube
            );

            resultados.appendChild(contenedor);
        });

    } catch (error) {
        console.error(error);

        estado.textContent =
            "No se pudo consultar el catálogo. Comprueba tu conexión a Internet o abre la página mediante un navegador compatible.";
    }
}

function reproducirPreview(cancion) {
    if (!cancion.previewUrl) {
        estado.textContent =
            "Esta canción no tiene vista previa disponible. Usa los enlaces para abrirla en Spotify o YouTube Music.";
        return;
    }

    reproductor.replaceChildren();
    preview.style.display = "block";
    preview.src = cancion.previewUrl;
    preview.load();

    titulo.textContent =
        cancion.trackName + " — " + cancion.artistName;

    estado.textContent =
        "Reproduciendo vista previa del catálogo musical.";

    preview.play().catch(() => {
        estado.textContent =
            "Pulsa reproducir en los controles de audio.";
    });
}

function detenerPreview() {
    preview.pause();
    preview.removeAttribute("src");
    preview.load();
    preview.style.display = "none";
}
