
const busqueda = document.getElementById("busqueda");
const botonBuscar = document.getElementById("buscar");
const estado = document.getElementById("estado");
const reproductor = document.getElementById("reproductor");
const titulo = document.getElementById("titulo");
const preview = document.getElementById("preview");

botonBuscar.addEventListener("click", procesarEntrada);

busqueda.addEventListener("keydown", e => {
    if (e.key === "Enter") {
        procesarEntrada();
    }
});

function procesarEntrada() {
    const texto = busqueda.value.trim();

    if (!texto) {
        estado.textContent = "Pega un enlace de YouTube o Spotify.";
        return;
    }

    let url;

    try {
        url = new URL(texto);
    } catch {
        estado.textContent = "El enlace no es válido.";
        return;
    }

    if (!["https:", "http:"].includes(url.protocol)) {
        estado.textContent = "Protocolo de enlace no válido.";
        return;
    }

    procesarEnlace(url);
}

function procesarEnlace(url) {
    const host = url.hostname.toLowerCase();
    const path = url.pathname;
    const params = url.searchParams;

    limpiarReproductor();

    // Spotify
    if (
        host === "open.spotify.com" ||
        host === "www.open.spotify.com"
    ) {
        const partes = path.split("/").filter(Boolean);

        const tipos = [
            "track",
            "album",
            "playlist",
            "artist",
            "show",
            "episode"
        ];

        const indice = partes.findIndex(parte =>
            tipos.includes(parte)
        );

        if (indice === -1 || !partes[indice + 1]) {
            estado.textContent =
                "Enlace de Spotify no reconocido.";
            return;
        }

        const tipo = partes[indice];
        const id = partes[indice + 1];

        const iframe = document.createElement("iframe");

        iframe.src =
            "https://open.spotify.com/embed/" +
            tipo + "/" + encodeURIComponent(id);

        iframe.width = "350";
        iframe.height = tipo === "track" ? "152" : "352";
        iframe.style.border = "0";
        iframe.allow =
            "autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture";
        iframe.allowFullscreen = true;
        iframe.loading = "lazy";

        reproductor.appendChild(iframe);

        titulo.textContent = "Contenido de Spotify";
        estado.textContent =
            "Enlace cargado. La reproducción depende de Spotify.";

        return;
    }

    // YouTube y YouTube Music
    const dominiosYouTube = [
        "youtube.com",
        "www.youtube.com",
        "music.youtube.com",
        "m.youtube.com"
    ];

    let id = "";

    if (
        host === "youtu.be" ||
        host === "www.youtu.be"
    ) {
        id = path.split("/").filter(Boolean)[0] || "";

    } else if (dominiosYouTube.includes(host)) {
        id = params.get("v") || "";

        if (!id && path.startsWith("/shorts/")) {
            id = path.split("/")[2] || "";
        }

        if (!id && path.startsWith("/embed/")) {
            id = path.split("/")[2] || "";
        }

        if (!id && path.startsWith("/live/")) {
            id = path.split("/")[2] || "";
        }
    }

    if (id && /^[\w-]{11}$/.test(id)) {
        reproducirYouTube(id);
        return;
    }

    estado.textContent =
        "Enlace no reconocido. Pega un enlace directo de una canción o video de YouTube, YouTube Music o Spotify.";
}

function reproducirYouTube(id) {
    const iframe = document.createElement("iframe");

    iframe.src =
        "https://www.youtube.com/embed/" +
        encodeURIComponent(id) +
        "?autoplay=1";

    iframe.width = "560";
    iframe.height = "315";
    iframe.title = "Reproductor de YouTube";
    iframe.allow =
        "autoplay; encrypted-media; picture-in-picture; fullscreen";
    iframe.allowFullscreen = true;
    iframe.loading = "lazy";

    reproductor.appendChild(iframe);

    titulo.textContent = "Reproduciendo desde YouTube";
    estado.textContent =
        "Video cargado. Si permite reproducción incrustada, podrás escucharlo aquí.";
}

function limpiarReproductor() {
    reproductor.replaceChildren();

    if (preview) {
        preview.pause();
        preview.removeAttribute("src");
        preview.load();
        preview.style.display = "none";
    }

    titulo.textContent = "Reproductor";
}
