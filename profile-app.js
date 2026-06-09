/**
 * 2026 Profile Converter - Header & Icon Optimizer
 * Handles Header Image (4096×2304) and Developer Icon (512×512)
 */

const cropperScript = document.createElement('script');
cropperScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.5.13/cropper.min.js';
document.head.appendChild(cropperScript);

const cropperLink = document.createElement('link');
cropperLink.rel = 'stylesheet';
cropperLink.href = 'https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.5.13/cropper.min.css';
document.head.appendChild(cropperLink);

// Tab Management
const tabButtons = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');

tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        const tabName = btn.dataset.tab;
        
        // Update active tab button
        tabButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        // Update active tab content
        tabContents.forEach(content => content.classList.remove('active'));
        document.getElementById(`${tabName}-tab`).classList.add('active');
    });
});

// ============================================
// HEADER IMAGE CONVERTER (4096×2304)
// ============================================

const headerDropZone = document.getElementById('drop-zone-header');
const headerFileInput = document.getElementById('file-input-header');
const headerProcessingView = document.getElementById('processing-view-header');
const headerPreviewGrid = document.getElementById('preview-grid-header');
const headerQualitySlider = document.getElementById('quality-slider-header');
const headerQualityVal = document.getElementById('quality-val-header');
const headerDownloadBtn = document.getElementById('download-header');
const headerResetBtn = document.getElementById('reset-header');

const HEADER_WIDTH = 4096;
const HEADER_HEIGHT = 2304;
const MAX_FILE_SIZE = 1024 * 1024; // 1 MB
let headerFile = null;
let headerFormat = 'jpeg';

// Tab format selector for header
document.getElementById('header-tab').querySelectorAll('.format-group .btn-preset').forEach(btn => {
    btn.addEventListener('click', () => {
        document.getElementById('header-tab').querySelectorAll('.format-group .btn-preset').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        headerFormat = btn.dataset.format;
    });
});

headerQualitySlider.addEventListener('input', (e) => {
    headerQualityVal.textContent = e.target.value;
});

// Drag & Drop
['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    headerDropZone.addEventListener(eventName, preventDefaults, false);
});

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

['dragenter', 'dragover'].forEach(eventName => {
    headerDropZone.addEventListener(eventName, () => headerDropZone.classList.add('drag-over'), false);
});

['dragleave', 'drop'].forEach(eventName => {
    headerDropZone.addEventListener(eventName, () => headerDropZone.classList.remove('drag-over'), false);
});

headerDropZone.addEventListener('drop', (e) => {
    const files = e.dataTransfer.files;
    handleHeaderFile(files[0]);
}, false);

headerFileInput.addEventListener('change', (e) => {
    handleHeaderFile(e.target.files[0]);
});

function handleHeaderFile(file) {
    if (!file) return;
    
    // Validate file
    if (!['image/jpeg', 'image/png'].includes(file.type)) {
        alert('Please upload JPEG or PNG file only');
        return;
    }
    
    if (file.size > MAX_FILE_SIZE) {
        alert('File size exceeds 1 MB limit');
        return;
    }
    
    headerFile = file;
    headerDropZone.classList.add('hidden');
    headerProcessingView.classList.remove('hidden');
    renderHeaderPreview();
}

function renderHeaderPreview() {
    headerPreviewGrid.innerHTML = '';
    
    if (!headerFile) return;
    
    const url = URL.createObjectURL(headerFile);
    const card = document.createElement('div');
    card.className = 'image-card';
    
    const sizeMB = (headerFile.size / (1024 * 1024)).toFixed(2);
    
    card.innerHTML = `
        <div class="thumb-container">
            <img src="${url}" alt="preview" class="preview-img" id="header-preview">
            <div class="ai-badge">Header: 4096×2304</div>
        </div>
        <div class="card-info">
            <div class="file-name">${headerFile.name}</div>
            <div class="file-stats">
                <span>Size: ${sizeMB} MB</span>
                <span>Format: ${headerFile.type}</span>
            </div>
        </div>
        <div class="card-actions">
            <button class="btn-mini" onclick="cropHeaderImage()">🎯 Crop</button>
            <button class="btn-mini danger" onclick="resetHeader()">Remove</button>
        </div>
    `;
    
    headerPreviewGrid.appendChild(card);
}

window.cropHeaderImage = () => {
    const img = new Image();
    img.onload = () => {
        showCropModal(img, 'header', 4096 / 2304);
    };
    img.src = URL.createObjectURL(headerFile);
};

window.resetHeader = () => {
    headerFile = null;
    headerDropZone.classList.remove('hidden');
    headerProcessingView.classList.add('hidden');
    headerPreviewGrid.innerHTML = '';
};

headerDownloadBtn.addEventListener('click', async () => {
    if (!headerFile) return;
    
    headerDownloadBtn.textContent = 'Processing...';
    headerDownloadBtn.disabled = true;
    
    try {
        const quality = parseInt(headerQualitySlider.value);
        const blob = await convertImageToSize(headerFile, HEADER_WIDTH, HEADER_HEIGHT, quality, headerFormat);
        
        const fileName = `${headerFile.name.split('.')[0]}_header.${headerFormat}`;
        downloadFile(blob, fileName);
        
        headerDownloadBtn.textContent = `✓ Downloaded (${(blob.size / 1024).toFixed(1)} KB)`;
        setTimeout(() => {
            headerDownloadBtn.textContent = 'Convert & Download';
            headerDownloadBtn.disabled = false;
        }, 3000);
    } catch (error) {
        alert('Error converting image: ' + error.message);
        headerDownloadBtn.textContent = 'Convert & Download';
        headerDownloadBtn.disabled = false;
    }
});

headerResetBtn.addEventListener('click', () => {
    resetHeader();
});

// ============================================
// ICON IMAGE CONVERTER (512×512)
// ============================================

const iconDropZone = document.getElementById('drop-zone-icon');
const iconFileInput = document.getElementById('file-input-icon');
const iconProcessingView = document.getElementById('processing-view-icon');
const iconPreviewGrid = document.getElementById('preview-grid-icon');
const iconQualitySlider = document.getElementById('quality-slider-icon');
const iconQualityVal = document.getElementById('quality-val-icon');
const iconDownloadBtn = document.getElementById('download-icon');
const iconResetBtn = document.getElementById('reset-icon');

const ICON_SIZE = 512;
let iconFile = null;
let iconFormat = 'jpeg'; // Always JPEG for Google Play

iconQualitySlider.addEventListener('input', (e) => {
    iconQualityVal.textContent = e.target.value;
});

// Drag & Drop
['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    iconDropZone.addEventListener(eventName, preventDefaults, false);
});

['dragenter', 'dragover'].forEach(eventName => {
    iconDropZone.addEventListener(eventName, () => iconDropZone.classList.add('drag-over'), false);
});

['dragleave', 'drop'].forEach(eventName => {
    iconDropZone.addEventListener(eventName, () => iconDropZone.classList.remove('drag-over'), false);
});

iconDropZone.addEventListener('drop', (e) => {
    const files = e.dataTransfer.files;
    handleIconFile(files[0]);
}, false);

iconFileInput.addEventListener('change', (e) => {
    handleIconFile(e.target.files[0]);
});

function handleIconFile(file) {
    if (!file) return;
    
    if (!['image/jpeg', 'image/png'].includes(file.type)) {
        alert('Please upload JPEG or PNG file only');
        return;
    }
    
    if (file.size > MAX_FILE_SIZE) {
        alert('File size exceeds 1 MB limit');
        return;
    }
    
    iconFile = file;
    iconDropZone.classList.add('hidden');
    iconProcessingView.classList.remove('hidden');
    renderIconPreview();
}

function renderIconPreview() {
    iconPreviewGrid.innerHTML = '';
    
    if (!iconFile) return;
    
    const url = URL.createObjectURL(iconFile);
    const card = document.createElement('div');
    card.className = 'image-card';
    
    const sizeMB = (iconFile.size / (1024 * 1024)).toFixed(2);
    
    card.innerHTML = `
        <div class="thumb-container">
            <img src="${url}" alt="preview" class="preview-img" id="icon-preview" style="border-radius: 12px;">
            <div class="ai-badge">Icon: 512×512 (→ JPEG)</div>
        </div>
        <div class="card-info">
            <div class="file-name">${iconFile.name}</div>
            <div class="file-stats">
                <span>Size: ${sizeMB} MB</span>
                <span>Output: JPEG 24-bit</span>
            </div>
        </div>
        <div class="card-actions">
            <button class="btn-mini" onclick="cropIconImage()">🎯 Crop</button>
            <button class="btn-mini danger" onclick="resetIcon()">Remove</button>
        </div>
    `;
    
    iconPreviewGrid.appendChild(card);
}

window.cropIconImage = () => {
    const img = new Image();
    img.onload = () => {
        showCropModal(img, 'icon', 1); // 1:1 ratio
    };
    img.src = URL.createObjectURL(iconFile);
};

window.resetIcon = () => {
    iconFile = null;
    iconDropZone.classList.remove('hidden');
    iconProcessingView.classList.add('hidden');
    iconPreviewGrid.innerHTML = '';
};

iconDownloadBtn.addEventListener('click', async () => {
    if (!iconFile) return;
    
    iconDownloadBtn.textContent = 'Processing...';
    iconDownloadBtn.disabled = true;
    
    try {
        const quality = parseInt(iconQualitySlider.value);
        
        // For Google Play Console: Force JPEG (removes any transparency/alpha)
        const useFormat = 'jpeg'; // Always JPEG for Google Play 24-bit requirement
        const blob = await convertImageToSize(iconFile, ICON_SIZE, ICON_SIZE, quality, useFormat);
        
        const fileName = `${iconFile.name.split('.')[0]}_icon.jpg`;
        downloadFile(blob, fileName);
        
        iconDownloadBtn.textContent = `✓ Downloaded (${(blob.size / 1024).toFixed(1)} KB)`;
        setTimeout(() => {
            iconDownloadBtn.textContent = 'Convert & Download';
            iconDownloadBtn.disabled = false;
        }, 3000);
    } catch (error) {
        alert('Error converting image: ' + error.message);
        iconDownloadBtn.textContent = 'Convert & Download';
        iconDownloadBtn.disabled = false;
    }
});

iconResetBtn.addEventListener('click', () => {
    resetIcon();
});

// ============================================
// SHARED UTILITIES
// ============================================

function convertImageToSize(file, targetWidth, targetHeight, quality, format) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = targetWidth;
            canvas.height = targetHeight;
            
            const ctx = canvas.getContext('2d');
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            
            // Fill with white background (for transparency conversion)
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // Calculate scaling to fit image in canvas (letterbox style)
            const scale = Math.min(targetWidth / img.width, targetHeight / img.height);
            const scaledWidth = img.width * scale;
            const scaledHeight = img.height * scale;
            const x = (targetWidth - scaledWidth) / 2;
            const y = (targetHeight - scaledHeight) / 2;
            
            ctx.drawImage(img, x, y, scaledWidth, scaledHeight);
            
            // Export to desired format with Google Play optimization
            const mimeType = format === 'png' ? 'image/png' : 'image/jpeg';
            
            // For JPEG: Use higher quality for Google Play compliance
            const qualityValue = format === 'png' ? undefined : Math.min(quality / 100, 0.95);
            
            canvas.toBlob((blob) => {
                // Validate file size
                if (blob.size > MAX_FILE_SIZE) {
                    reject(new Error('File size exceeds 1 MB limit'));
                } else {
                    resolve(blob);
                }
            }, mimeType, qualityValue);
        };
        
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = URL.createObjectURL(file);
    });
}

function downloadFile(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

function showCropModal(img, type, ratio) {
    const modal = document.getElementById('crop-modal');
    const cropWrapper = document.getElementById('crop-wrapper');
    const applyBtn = document.getElementById('apply-crop');
    const cancelBtn = document.getElementById('cancel-crop');
    
    cropWrapper.innerHTML = `<img id="crop-image" src="${img.src}" style="max-width: 100%; max-height: 400px;">`;
    
    let cropper = null;
    
    // Wait for Cropper.js to load
    const checkCropper = setInterval(() => {
        if (typeof Cropper !== 'undefined') {
            clearInterval(checkCropper);
            
            const cropImage = document.getElementById('crop-image');
            cropper = new Cropper(cropImage, {
                aspectRatio: ratio,
                autoCropArea: 1,
                responsive: true,
                restore: true,
                guides: true,
                center: true,
                highlight: true,
                cropBoxMovable: true,
                cropBoxResizable: true,
                toggleDragModeOnDblclick: true,
            });
            
            modal.classList.remove('hidden');
        }
    }, 100);
    
    applyBtn.onclick = () => {
        if (cropper) {
            const canvas = cropper.getCroppedCanvas();
            const blob = canvas.toDataURL();
            
            // Update the appropriate preview
            if (type === 'header') {
                headerFile = dataURLtoFile(blob, headerFile.name);
                renderHeaderPreview();
            } else {
                iconFile = dataURLtoFile(blob, iconFile.name);
                renderIconPreview();
            }
            
            modal.classList.add('hidden');
            cropper.destroy();
        }
    };
    
    cancelBtn.onclick = () => {
        modal.classList.add('hidden');
        cropper.destroy();
    };
}

function dataURLtoFile(dataurl, filename) {
    const arr = dataurl.split(',');
    const mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mime });
}
