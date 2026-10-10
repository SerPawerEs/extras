
const busqueda = document.getElementById("busqueda");
const botonBuscar = document.getElementById("buscar");
const resultados = document.getElementById("resultados");
const estado = document.getElementById("estado");
const reproductor = document.getElementById("reproductor");
const titulo = document.getElementById("titulo");
const preview = document.getElementById("preview");

// Instancias públicas: pueden cambiar o dejar de funcionar.
const INSTANCIAS = [
    "https://inv.nadeko.net",
    "https://yewtu.be",
    "https://invidious.nerdvpn.de"
];

botonBuscar.addEventListener("click", buscar);

busqueda.addEventListener("keydown", e => {
    if (e.key === "Enter") buscar();
});

async function buscar() {
    const texto = busqueda.value.trim();
    if (!texto) return;

    let url;
    try {
        url = new URL(texto);
    } catch {
        url = null;
    }

    if (url && ["http:", "https:"].includes(url.protocol)) {
        procesarEnlace(url);
        return;
    }

    await buscarVideos(texto);
}

async function buscarVideos(texto) {
    limpiar();
    estado.textContent = "Buscando canciones en Internet...";

    let videos = [];
    let ultimoError;

    for (const instancia of INSTANCIAS) {
        try {
            const endpoint = instancia +
                "/api/v1/search?q=" +
                encodeURIComponent(texto) +
                "&type=video";

            const respuesta = await fetch(endpoint);

            if (!respuesta.ok) {
                throw new Error("Instancia no disponible");
            }

            const datos = await respuesta.json();

            if (!Array.isArray(datos)) {
                throw new Error("Respuesta no válida");
            }

            videos = datos.filter(video =>
                video.videoId && video.title
            );

            if (videos.length) break;

        } catch (error) {
            ultimoError = error;
        }
    }

    if (!videos.length) {
        estado.textContent =
            "No fue posible obtener resultados. Las instancias públicas pueden estar caídas o bloquear las peticiones del navegador.";

        console.warn(ultimoError);

        const enlace = document.createElement("a");
        enlace.href =
            "https://www.youtube.com/results?search_query=" +
            encodeURIComponent(texto);

        enlace.target = "_blank";
        enlace.rel = "noopener noreferrer";
        enlace.textContent = "Buscar directamente en YouTube";

        resultados.appendChild(enlace);
        return;
    }

    estado.textContent = `Resultados encontrados: ${videos.length}`;

    videos.slice(0, 15).forEach(video => {
        const fila = document.createElement("div");
        const boton = document.createElement("button");
        const canal = document.createElement("p");

        fila.style.margin = "12px 0";

        boton.textContent = "▶ " + video.title;
        canal.textContent = video.author || "";

        boton.addEventListener("click", () => {
            reproducir(video.videoId, video.title);
        });

        fila.append(boton, canal);
        resultados.appendChild(fila);
    });
}

function reproducir(id, nombre) {
    limpiarReproductor();

    const iframe = document.createElement("iframe");
    iframe.src =
        "https://www.youtube.com/embed/" +
        encodeURIComponent(id) +
        "?autoplay=1";

    iframe.width = "560";
    iframe.height = "315";
    iframe.title = nombre;
    iframe.allow =
        "autoplay; encrypted-media; picture-in-picture; fullscreen";
    iframe.allowFullscreen = true;

    reproductor.appendChild(iframe);
    titulo.textContent = nombre;
    estado.textContent =
        "Video cargado. Si permite reproducción incrustada, podrás escucharlo completo.";
}

function procesarEnlace(url) {
    const host = url.hostname.toLowerCase();
    const path = url.pathname;
    const params = url.searchParams;

    limpiar();

    if (host === "open.spotify.com") {
        const partes = path.split("/").filter(Boolean);
        const tipos = [
            "track", "album", "playlist", "artist", "show", "episode"
        ];
        const indice = partes.findIndex(p => tipos.includes(p));

        if (indice === -1 || !partes[indice + 1]) {
            estado.textContent = "Enlace de Spotify no reconocido.";
            return;
        }

        limpiarReproductor();

        const iframe = document.createElement("iframe");
        iframe.src =
            "https://open.spotify.com/embed/" +
            partes[indice] + "/" +
            encodeURIComponent(partes[indice + 1]);

        iframe.width = "350";
        iframe.height = "152";
        iframe.style.border = "0";
        iframe.allow = "autoplay; clipboard-write; encrypted-media";

        reproductor.appendChild(iframe);
        titulo.textContent = "Spotify";
        estado.textContent =
            "Spotify controla la disponibilidad de la reproducción.";
        return;
    }

    let id = "";

    if (host === "youtu.be") {
        id = path.split("/").filter(Boolean)[0] || "";
    } else if (
        host === "youtube.com" ||
        host === "www.youtube.com" ||
        host === "music.youtube.com" ||
        host === "m.youtube.com"
    ) {
        id = params.get("v") || "";

        if (!id && path.startsWith("/shorts/")) {
            id = path.split("/")[2] || "";
        }

        if (!id && path.startsWith("/embed/")) {
            id = path.split("/")[2] || "";
        }
    }

    if (id && /^[\w-]{11}$/.test(id)) {
        reproducir(id, "Video de YouTube");
        return;
    }

    estado.textContent =
        "Enlace no reconocido. Pega un enlace de YouTube o Spotify.";
}

function limpiarReproductor() {
    reproductor.replaceChildren();

    preview.pause();
    preview.removeAttribute("src");
    preview.load();
    preview.style.display = "none";
}

function limpiar() {
    resultados.replaceChildren();
    limpiarReproductor();
    titulo.textContent = "Reproductor";
}
