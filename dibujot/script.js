// Initialize Lucide Icons
lucide.createIcons();

// Lightbox Functions
function openLightbox(src, caption) {
    const lightbox = document.getElementById('lightbox');
    const img = document.getElementById('lightbox-img');
    const cap = document.getElementById('lightbox-caption');
    
    img.src = src;
    cap.innerText = caption;
    
    lightbox.classList.remove('hidden');
    setTimeout(() => {
        lightbox.classList.remove('opacity-0');
    }, 10);
}

function closeLightbox() {
    const lightbox = document.getElementById('lightbox');
    lightbox.classList.add('opacity-0');
    setTimeout(() => {
        lightbox.classList.add('hidden');
    }, 300);
}

// Financial Tabs Switcher
function switchFinTab(tab) {
    const cronoBtn = document.getElementById('fin-tab-crono');
    const nomBtn = document.getElementById('fin-tab-nom');
    const cronoContent = document.getElementById('fin-content-cronograma');
    const nomContent = document.getElementById('fin-content-nomina');

    if (tab === 'cronograma') {
        cronoBtn.className = "px-4 py-2 rounded-xl text-xs font-mono uppercase tracking-wider bg-tech-cyan text-black font-bold";
        nomBtn.className = "px-4 py-2 rounded-xl text-xs font-mono uppercase tracking-wider bg-slate-900 text-slate-400 hover:text-white";
        cronoContent.classList.remove('hidden');
        nomContent.classList.add('hidden');
    } else {
        nomBtn.className = "px-4 py-2 rounded-xl text-xs font-mono uppercase tracking-wider bg-tech-cyan text-black font-bold";
        cronoBtn.className = "px-4 py-2 rounded-xl text-xs font-mono uppercase tracking-wider bg-slate-900 text-slate-400 hover:text-white";
        nomContent.classList.remove('hidden');
        cronoContent.classList.add('hidden');
    }
}

// Calculator Interactive Slider Logic
function updateCalculator(val) {
    const baseCost = 2125000000;
    const price = parseFloat(val);
    const profit = price - baseCost;
    const roi = ((profit / baseCost) * 100).toFixed(2);

    document.getElementById('range-val').innerText = '$' + (price / 1000000).toLocaleString() + 'M';
    document.getElementById('calc-profit').innerText = '$' + profit.toLocaleString('es-CO');
    document.getElementById('calc-roi').innerText = roi + '%';
}

// ESC Key to close lightbox
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') closeLightbox();
});