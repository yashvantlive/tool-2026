/**
 * 2026 Icons Generator - Core Logic
 * High-performance browser-native icon processing
 */

const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const processingView = document.getElementById('processing-view');
const previewGrid = document.getElementById('icons-preview-grid');
const downloadBtn = document.getElementById('download-zip');
const statusText = document.getElementById('status-text');
const optionCards = document.querySelectorAll('.option-card');

let sourceFile = null;
let currentPlatform = 'all';

const ICON_CONFIG = {
    web: [
        { name: 'favicon-16x16.png', size: 16 },
        { name: 'favicon-32x32.png', size: 32 },
        { name: 'apple-touch-icon.png', size: 180 },
        { name: 'android-chrome-192x192.png', size: 192 },
        { name: 'android-chrome-512x512.png', size: 512 }
    ],
    mobile: [
        { name: 'ios-icon-60x60.png', size: 60 },
        { name: 'ios-icon-120x120.png', size: 120 },
        { name: 'ios-icon-180x180.png', size: 180 },
        { name: 'android-icon-48x48.png', size: 48 },
        { name: 'android-icon-96x96.png', size: 96 },
        { name: 'android-icon-144x144.png', size: 144 },
        { name: 'android-icon-192x192.png', size: 192 }
    ]
};

// Event Listeners
optionCards.forEach(card => {
    card.addEventListener('click', () => {
        optionCards.forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        currentPlatform = card.dataset.platform;
        if (sourceFile) generatePreviews();
    });
});

dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('drag-over');
});

dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('drag-over');
});

dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    handleFile(e.dataTransfer.files[0]);
});

fileInput.addEventListener('change', (e) => {
    handleFile(e.target.files[0]);
});

function handleFile(file) {
    if (!file || !file.type.startsWith('image/')) return;
    sourceFile = file;
    dropZone.classList.add('hidden');
    processingView.classList.remove('hidden');
    generatePreviews();
}

async function generatePreviews() {
    previewGrid.innerHTML = '';
    const platforms = currentPlatform === 'all' ? ['web', 'mobile'] : [currentPlatform];
    const configs = platforms.flatMap(p => ICON_CONFIG[p]);

    statusText.textContent = `Generating ${configs.length} icons...`;

    for (const config of configs) {
        const blob = await resizeImage(sourceFile, config.size);
        const url = URL.createObjectURL(blob);

        const card = document.createElement('div');
        card.className = 'icon-preview-card';
        card.innerHTML = `
            <img src="${url}" alt="${config.name}">
            <div class="icon-size-label">${config.size}x${config.size}</div>
            <div class="icon-size-label" style="font-size: 0.6rem;">${config.name}</div>
        `;
        previewGrid.appendChild(card);
    }
    statusText.textContent = 'All icons generated. Ready for download.';
}

function resizeImage(file, size) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = size;
            canvas.height = size;
            const ctx = canvas.getContext('2d');

            // Draw image centered and scaled (assuming square input or fit-to-square)
            const minDim = Math.min(img.width, img.height);
            const sx = (img.width - minDim) / 2;
            const sy = (img.height - minDim) / 2;

            ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, size, size);

            canvas.toBlob((blob) => resolve(blob), 'image/png');
        };
        img.src = URL.createObjectURL(file);
    });
}

downloadBtn.addEventListener('click', async () => {
    if (!sourceFile) return;

    downloadBtn.disabled = true;
    downloadBtn.textContent = 'Bundling ZIP...';

    const zip = new JSZip();
    const platforms = currentPlatform === 'all' ? ['web', 'mobile'] : [currentPlatform];
    const configs = platforms.flatMap(p => ICON_CONFIG[p]);

    for (const config of configs) {
        const blob = await resizeImage(sourceFile, config.size);
        zip.file(`icons/${config.name}`, blob);
    }

    const content = await zip.generateAsync({ type: 'blob' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(content);
    link.download = 'icon_bundle_2026.zip';
    link.click();

    downloadBtn.disabled = false;
    downloadBtn.textContent = 'Generate & Download ZIP';
});
