/**
 * 2026 Scalable Image Converter - Core Logic
 * Focus: No-lag browser-native processing
 */

// Load Cropper.js dynamically for clean architecture
const cropperScript = document.createElement('script');
cropperScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.5.13/cropper.min.js';
document.head.appendChild(cropperScript);

const cropperLink = document.createElement('link');
cropperLink.rel = 'stylesheet';
cropperLink.href = 'https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.5.13/cropper.min.css';
document.head.appendChild(cropperLink);

const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const processingView = document.getElementById('processing-view');
const previewGrid = document.getElementById('preview-grid');
const qualitySlider = document.getElementById('quality-slider');
const qualityVal = document.getElementById('quality-val');
const downloadAllBtn = document.getElementById('download-all');
const downloadZipBtn = document.getElementById('download-zip');

let filesArray = [];
let convertedBlobs = []; // Store converted blobs for ZIP
const MIN_KB = 10;
const MAX_KB = 100;
let maxDimension = 1920; // Default to Hero

// Dimension Preset Handlers
const presetButtons = document.querySelectorAll('.global-controls .btn-preset');
presetButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        presetButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        maxDimension = parseInt(btn.dataset.maxdim) || 0;
    });
});

// Event Listeners
qualitySlider.addEventListener('input', (e) => {
    qualityVal.textContent = e.target.value;
});

// Drag & Drop Handling
['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, preventDefaults, false);
});

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

['dragenter', 'dragover'].forEach(eventName => {
    dropZone.addEventListener(eventName, () => dropZone.classList.add('drag-over'), false);
});

['dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, () => dropZone.classList.remove('drag-over'), false);
});

dropZone.addEventListener('drop', handleDrop, false);
fileInput.addEventListener('change', handleFilesChoice, false);

function handleDrop(e) {
    const dt = e.dataTransfer;
    const files = dt.files;
    handleFiles(files);
}

function handleFilesChoice(e) {
    handleFiles(this.files);
}

function handleFiles(files) {
    const newFiles = Array.from(files).filter(file => file.type.startsWith('image/'));
    filesArray = [...filesArray, ...newFiles];

    if (filesArray.length > 0) {
        dropZone.classList.add('hidden');
        processingView.classList.remove('hidden');
        renderPreviews();
    }
}

async function renderPreviews() {
    previewGrid.innerHTML = '';
    for (let i = 0; i < filesArray.length; i++) {
        const file = filesArray[i];
        const card = createCard(file, i);
        previewGrid.appendChild(card);
    }
}

function createCard(file, index) {
    const card = document.createElement('div');
    card.className = 'image-card';

    const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
    const url = URL.createObjectURL(file);

    const suggestion = getAISuggestion(file);

    card.innerHTML = `
        <div class="thumb-container">
            <img src="${url}" alt="preview" id="preview-img-${index}">
            <div class="ai-badge" id="ai-badge-${index}">${suggestion.text}</div>
        </div>
        <div class="card-info">
            <div class="file-name">${file.name}</div>
            <div class="file-stats">
                <span>Original: ${sizeMB} MB</span>
                <span class="webp-size" id="webp-size-${index}">Suggest: ${suggestion.quality}%</span>
            </div>
        </div>
        <div class="card-actions">
            <button class="btn-mini enhance-btn" id="enhance-btn-${index}" onclick="toggleEnhance(${index})">✨ Enhance</button>
            <button class="btn-mini" onclick="cropImage(${index})">Crop</button>
            <button class="btn-mini danger" onclick="removeFile(${index})">Remove</button>
        </div>
    `;

    // Auto-set quality if it's the only image or for global preference
    if (filesArray.length === 1) {
        qualitySlider.value = suggestion.quality;
        qualityVal.textContent = suggestion.quality;
    }

    return card;
}

// AI Engine
function getAISuggestion(file) {
    const size = file.size / 1024; // KB
    if (size > 5000) return { quality: 75, text: "High Res: Heavy Compression" };
    if (size > 2000) return { quality: 82, text: "Balanced Optima" };
    if (size > 1000) return { quality: 88, text: "HD Quality Focus" };
    return { quality: 92, text: "Light Optimization" };
}

let enhancedStates = {};

window.toggleEnhance = (index) => {
    enhancedStates[index] = !enhancedStates[index];
    const btn = document.getElementById(`enhance-btn-${index}`);
    const img = document.getElementById(`preview-img-${index}`);

    if (enhancedStates[index]) {
        btn.classList.add('active');
        img.style.filter = "brightness(1.1) contrast(1.1) saturate(1.2) sharpness(1.1)";
        img.dataset.enhanced = "true";
    } else {
        btn.classList.remove('active');
        img.style.filter = "none";
        delete img.dataset.enhanced;
    }
};

function removeFile(index) {
    filesArray.splice(index, 1);
    if (filesArray.length === 0) {
        dropZone.classList.remove('hidden');
        processingView.classList.add('hidden');
    }
    renderPreviews();
}

// Pixel Machine: Advanced Convolution Sharpening
function applySharpening(ctx, width, height) {
    const weights = [0, -1, 0, -1, 5, -1, 0, -1, 0];
    const side = Math.round(Math.sqrt(weights.length));
    const halfSide = Math.floor(side / 2);
    const src = ctx.getImageData(0, 0, width, height).data;
    const output = ctx.createImageData(width, height);
    const dst = output.data;

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const sy = y;
            const sx = x;
            const dstOff = (y * width + x) * 4;
            let r = 0, g = 0, b = 0;

            for (let cy = 0; cy < side; cy++) {
                for (let cx = 0; cx < side; cx++) {
                    const scy = sy + cy - halfSide;
                    const scx = sx + cx - halfSide;
                    if (scy >= 0 && scy < height && scx >= 0 && scx < width) {
                        const srcOff = (scy * width + scx) * 4;
                        const wt = weights[cy * side + cx];
                        r += src[srcOff] * wt;
                        g += src[srcOff + 1] * wt;
                        b += src[srcOff + 2] * wt;
                    }
                }
            }
            // Clamp values to 0-255 range
            dst[dstOff] = Math.max(0, Math.min(255, r));
            dst[dstOff + 1] = Math.max(0, Math.min(255, g));
            dst[dstOff + 2] = Math.max(0, Math.min(255, b));
            dst[dstOff + 3] = src[dstOff + 3]; // Alpha
        }
    }
    ctx.putImageData(output, 0, 0);
}

// Optimization & Conversion Logic
async function convertToWebP(file, quality, isEnhanced, targetKB = true) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = async () => {
            let currentScale = 1.0;
            let bestBlob = null;

            // Limit excessive resolution but keep it "HD" (e.g., max 2560px)
            if (img.width > 2560 || img.height > 2560) {
                currentScale = 2560 / Math.max(img.width, img.height);
            }

            // Outer loop for scaling if quality binary search fails
            for (let sAttempt = 0; sAttempt < 4; sAttempt++) {
                let minQ = 0.05;
                let maxQ = 0.95;
                let qAttempts = 0;

                while (qAttempts < 6) {
                    const currentQuality = (minQ + maxQ) / 2;
                    const canvas = document.createElement('canvas');
                    canvas.width = img.width * currentScale;
                    canvas.height = img.height * currentScale;
                    const ctx = canvas.getContext('2d');

                    // Use high-quality browser-native smoothing
                    ctx.imageSmoothingEnabled = true;
                    ctx.imageSmoothingQuality = 'high';

                    if (isEnhanced) {
                        ctx.filter = "brightness(1.05) contrast(1.15) saturate(1.15)";
                    }
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

                    const blob = await new Promise(r => canvas.toBlob(r, 'image/webp', currentQuality));
                    const sizeKB = blob.size / 1024;

                    if (sizeKB > MAX_KB) {
                        maxQ = currentQuality;
                        bestBlob = blob; // Keep it as fallback
                    } else if (sizeKB < MIN_KB && currentQuality < 0.98) {
                        minQ = currentQuality;
                        bestBlob = blob;
                    } else {
                        bestBlob = blob;
                        return resolve(bestBlob); // Perfect!
                    }
                    qAttempts++;
                }

                // If still too big after binary search, drop scale and try again
                if (bestBlob && bestBlob.size / 1024 > MAX_KB) {
                    currentScale *= 0.7;
                } else {
                    break;
                }
            }
            resolve(bestBlob);
        };
        img.src = URL.createObjectURL(file);
    });
}

downloadAllBtn.addEventListener('click', async () => {
    downloadAllBtn.textContent = 'Processing...';
    downloadAllBtn.disabled = true;
    convertedBlobs = []; // Reset

    const quality = parseInt(qualitySlider.value);

    for (let i = 0; i < filesArray.length; i++) {
        const file = filesArray[i];
        const isEnhanced = enhancedStates[i] || false;
        const originalSize = file.size;

        const webpBlob = await convertToWebP(file, quality, isEnhanced, true);
        convertedBlobs.push({ blob: webpBlob, name: `${file.name.split('.')[0]}_optimized.webp` });

        const link = document.createElement('a');
        link.href = URL.createObjectURL(webpBlob);
        link.download = convertedBlobs[i].name;
        link.click();

        // Update UI with before/after stats
        const sizeLabel = document.getElementById(`webp-size-${i}`);
        if (sizeLabel) {
            const reduction = ((1 - webpBlob.size / originalSize) * 100).toFixed(1);
            sizeLabel.textContent = `${(webpBlob.size / 1024).toFixed(1)} KB (-${reduction}%)`;
            sizeLabel.style.color = "var(--primary)";
        }
    }

    downloadAllBtn.textContent = 'Convert & Download All';
    downloadAllBtn.disabled = false;
});

// ZIP Download Handler
downloadZipBtn.addEventListener('click', async () => {
    if (convertedBlobs.length === 0) {
        alert('Please convert images first!');
        return;
    }

    downloadZipBtn.textContent = 'Creating ZIP...';
    downloadZipBtn.disabled = true;

    const zip = new JSZip();
    convertedBlobs.forEach(item => {
        zip.file(item.name, item.blob);
    });

    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(zipBlob);
    link.download = `optimized_images_${Date.now()}.zip`;
    link.click();

    downloadZipBtn.textContent = '📦 Download as ZIP';
    downloadZipBtn.disabled = false;
});

// Cropping Logic
let cropper = null;
let currentCropIndex = null;
const cropModal = document.getElementById('crop-modal');
const cropWrapper = document.getElementById('crop-wrapper');
const applyCropBtn = document.getElementById('apply-crop');
const cancelCropBtn = document.getElementById('cancel-crop');
const cropPresetButtons = document.querySelectorAll('.crop-header .btn-preset');
let targetResolution = null;

cropPresetButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        cropPresetButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const ratio = parseFloat(btn.dataset.ratio) || NaN;
        const isCircle = btn.dataset.circle === 'true';
        targetResolution = btn.dataset.res || null;

        if (cropper) {
            cropper.setAspectRatio(ratio);
            const cropperEl = cropWrapper.querySelector('.cropper-container');
            if (isCircle) {
                cropperEl.classList.add('cropper-circle');
            } else {
                cropperEl.classList.remove('cropper-circle');
            }
        }
    });
});

window.cropImage = (index) => {
    currentCropIndex = index;
    const file = filesArray[index];
    const url = URL.createObjectURL(file);

    // Reset to Free crop by default
    presetButtons.forEach(b => b.classList.remove('active'));
    const freeBtn = document.querySelector('[data-ratio="NaN"]');
    if (freeBtn) freeBtn.classList.add('active');
    targetResolution = null;

    cropWrapper.innerHTML = `<img src="${url}" id="crop-image" style="max-width: 100%; max-height: 70vh;">`;
    cropModal.classList.remove('hidden');

    const image = document.getElementById('crop-image');
    if (cropper) cropper.destroy();

    cropper = new Cropper(image, {
        aspectRatio: NaN,
        viewMode: 1,
        background: false,
        ready() {
            const cropperEl = cropWrapper.querySelector('.cropper-container');
            if (cropperEl) cropperEl.classList.remove('cropper-circle');
        }
    });
};

applyCropBtn.addEventListener('click', () => {
    let canvasOptions = {};
    if (targetResolution) {
        const [w, h] = targetResolution.split(',').map(Number);
        canvasOptions = { width: w, height: h };
    }
    const canvas = cropper.getCroppedCanvas(canvasOptions);
    canvas.toBlob((blob) => {
        const croppedFile = new File([blob], filesArray[currentCropIndex].name, { type: 'image/webp' });
        filesArray[currentCropIndex] = croppedFile;

        closeCropModal();
        renderPreviews();
    }, 'image/webp', 0.95);
});

cancelCropBtn.addEventListener('click', closeCropModal);

function closeCropModal() {
    cropModal.classList.add('hidden');
    if (cropper) {
        cropper.destroy();
        cropper = null;
    }
}
