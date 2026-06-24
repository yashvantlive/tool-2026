document.addEventListener('DOMContentLoaded', () => {
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const processingView = document.getElementById('processing-view');
    const origImg = document.getElementById('orig-img');
    const newImg = document.getElementById('new-img');
    const origSizeBadge = document.getElementById('orig-size');
    const newSizeBadge = document.getElementById('new-size');
    const targetKbInput = document.getElementById('target-kb');
    const gaugeFill = document.getElementById('gauge-fill');
    const gaugeTargetLabel = document.getElementById('gauge-target-label');
    const statusMessage = document.getElementById('status-message');
    const convertBtn = document.getElementById('convert-btn');
    const downloadBtn = document.getElementById('download-btn');
    const resetBtn = document.getElementById('reset-btn');
    const presets = document.querySelectorAll('.preset-group:not(#format-presets) .btn-preset');
    const formatPresets = document.querySelectorAll('#format-presets .btn-preset');
    const targetFormatIndicator = document.getElementById('target-format-indicator');

    let loadedImage = null;
    let originalBytes = 0;
    let convertedBlob = null;
    let selectedFormat = 'jpg'; // Default format
    let convertedFilename = 'converted.jpg';

    // Precompute CRC32 Table for PNG chunk padding
    const crcTable = [];
    for (let n = 0; n < 256; n++) {
        let c = n;
        for (let k = 0; k < 8; k++) {
            c = ((c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1));
        }
        crcTable[n] = c;
    }

    function crc32(uint8Array) {
        let c = 0xFFFFFFFF;
        for (let i = 0; i < uint8Array.length; i++) {
            c = crcTable[(c ^ uint8Array[i]) & 0xFF] ^ (c >>> 8);
        }
        return (c ^ 0xFFFFFFFF) >>> 0;
    }

    // Format selection
    formatPresets.forEach(preset => {
        preset.addEventListener('click', () => {
            formatPresets.forEach(p => p.classList.remove('active'));
            preset.classList.add('active');
            selectedFormat = preset.dataset.format;
            
            // Update UI elements based on format
            const upperFormat = selectedFormat.toUpperCase();
            targetFormatIndicator.innerHTML = `<span class="pulse-dot"></span>Output: Exact Size ${upperFormat}`;
            downloadBtn.textContent = `Download ${upperFormat}`;
            downloadBtn.style.color = selectedFormat === 'jpg' ? 'var(--accent-green)' : (selectedFormat === 'png' ? '#00f2ff' : '#a855f7');
            downloadBtn.style.borderColor = selectedFormat === 'jpg' ? 'rgba(0, 255, 136, 0.3)' : (selectedFormat === 'png' ? 'rgba(0, 242, 255, 0.3)' : 'rgba(168, 85, 247, 0.3)');
            downloadBtn.style.background = selectedFormat === 'jpg' ? 'rgba(0, 255, 136, 0.15)' : (selectedFormat === 'png' ? 'rgba(0, 242, 255, 0.15)' : 'rgba(168, 85, 247, 0.15)');

            // Trigger reconvert automatically if image is loaded to give premium instant feel
            if (loadedImage) {
                convertImage();
            }
        });
    });

    // Preset selection
    presets.forEach(preset => {
        preset.addEventListener('click', () => {
            presets.forEach(p => p.classList.remove('active'));
            preset.classList.add('active');
            targetKbInput.value = preset.dataset.v;
            gaugeTargetLabel.textContent = `Target: ${preset.dataset.v} KB`;
            if (loadedImage) {
                convertImage();
            }
        });
    });

    // Sync input field to presets
    targetKbInput.addEventListener('input', () => {
        const val = targetKbInput.value;
        gaugeTargetLabel.textContent = `Target: ${val} KB`;
        presets.forEach(p => {
            if (p.dataset.v === val) {
                p.classList.add('active');
            } else {
                p.classList.remove('active');
            }
        });
    });

    // Drag and drop event handlers
    dropZone.addEventListener('click', () => fileInput.click());

    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, (e) => {
            e.preventDefault();
            dropZone.classList.add('drag-over');
        }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, (e) => {
            e.preventDefault();
            dropZone.classList.remove('drag-over');
        }, false);
    });

    dropZone.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        const files = dt.files;
        if (files.length > 0) {
            handleFile(files[0]);
        }
    });

    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFile(e.target.files[0]);
        }
    });

    function handleFile(file) {
        if (!file.type.startsWith('image/')) {
            showStatus('⚠️ Please select a valid image file.', 'error');
            return;
        }

        originalBytes = file.size;
        const url = URL.createObjectURL(file);
        const imgElement = new Image();
        
        showStatus('⚡ Loading image...', '');

        imgElement.onload = () => {
            loadedImage = imgElement;
            origImg.src = url;
            origSizeBadge.textContent = formatKB(originalBytes);
            
            // Reset converted image preview
            newImg.src = '';
            newSizeBadge.textContent = '—';
            convertedBlob = null;
            downloadBtn.disabled = true;
            gaugeFill.style.width = '0%';

            // Show processing view, hide dropzone
            dropZone.classList.add('hidden');
            processingView.classList.remove('hidden');
            
            showStatus(`✨ Loaded successfully (${imgElement.naturalWidth}×${imgElement.naturalHeight}px). Set target size and click Convert!`, 'success');
            
            // Auto convert on load
            convertImage();
        };

        imgElement.onerror = () => {
            showStatus('⚠️ Failed to load image. Try another file.', 'error');
        };

        imgElement.src = url;
    }

    function formatKB(bytes) {
        return (bytes / 1024).toFixed(2) + ' KB';
    }

    function showStatus(text, type) {
        statusMessage.className = 'status-message';
        if (type) statusMessage.classList.add(type);
        statusMessage.innerHTML = `<span>${text}</span>`;
    }

    function canvasToBlob(canvas, format, quality) {
        return new Promise(resolve => {
            let mimeType = 'image/jpeg';
            if (format === 'png') mimeType = 'image/png';
            else if (format === 'webp') mimeType = 'image/webp';

            canvas.toBlob(blob => resolve(blob), mimeType, quality);
        });
    }

    async function findQualityBlob(canvas, format, maxBytes) {
        // PNG is lossless, so quality parameter doesn't affect it. We handle it separately by resolution.
        if (format === 'png') {
            return await canvasToBlob(canvas, 'png');
        }

        let hiBlob = await canvasToBlob(canvas, format, 1.0);
        if (hiBlob.size <= maxBytes) return hiBlob;

        let lo = 0.02, hi = 1.0;
        let loBlob = await canvasToBlob(canvas, format, lo);
        if (loBlob.size > maxBytes) return null; // Even lowest quality is too large

        let best = loBlob;
        for (let i = 0; i < 9; i++) {
            const mid = (lo + hi) / 2;
            const midBlob = await canvasToBlob(canvas, format, mid);
            if (midBlob.size <= maxBytes) {
                best = midBlob;
                lo = mid;
            } else {
                hi = mid;
            }
        }
        return best;
    }

    async function compressToTarget(img, format, targetBytes) {
        // Minimum padding overheads: JPEG: 4, PNG: 12, WEBP: 10
        const paddingOverhead = format === 'jpeg' || format === 'jpg' ? 4 : (format === 'png' ? 12 : 10);
        const maxBytes = targetBytes - paddingOverhead;
        
        let scale = 1.0;
        let attempts = 0;
        
        while (attempts < 25) {
            const w = Math.max(1, Math.round(img.naturalWidth * scale));
            const h = Math.max(1, Math.round(img.naturalHeight * scale));
            const canvas = document.createElement('canvas');
            canvas.width = w; 
            canvas.height = h;
            const ctx = canvas.getContext('2d');
            
            if (format !== 'png') {
                ctx.fillStyle = '#ffffff'; // White background for transparent areas in JPG/WEBP
                ctx.fillRect(0, 0, w, h);
            }
            ctx.drawImage(img, 0, 0, w, h);

            const blob = await findQualityBlob(canvas, format, maxBytes);
            if (blob && blob.size <= maxBytes) {
                return blob;
            }

            if (w <= 8 || h <= 8) break;
            scale *= 0.85; // Scale down resolution if compression alone isn't enough
            attempts++;
        }
        throw new Error(`Target size is too small for a usable ${format.toUpperCase()} image. Please choose a larger target size.`);
    }

    // Pads JPEG to the exact byte size using non-destructive COM segments
    function padJpegToExactSize(arrayBuffer, targetBytes) {
        const bytes = new Uint8Array(arrayBuffer);
        let diff = targetBytes - bytes.length;
        if (diff < 4) return bytes;

        const segments = [];
        let remaining = diff;
        while (remaining > 0) {
            let chunk = Math.min(remaining, 65537);
            if (remaining - chunk > 0 && remaining - chunk < 4) {
                chunk -= 4;
            }
            segments.push(chunk);
            remaining -= chunk;
        }

        let totalPad = segments.reduce((a, b) => a + b, 0);
        const padded = new Uint8Array(bytes.length + totalPad);

        padded[0] = bytes[0];
        padded[1] = bytes[1];
        let offset = 2;

        for (const segTotal of segments) {
            const dataLength = segTotal - 4;
            const lengthField = 2 + dataLength;
            padded[offset++] = 0xFF;
            padded[offset++] = 0xFE; // COM marker
            padded[offset++] = (lengthField >> 8) & 0xFF;
            padded[offset++] = lengthField & 0xFF;
            for (let i = 0; i < dataLength; i++) {
                padded[offset++] = 0x00;
            }
        }

        padded.set(bytes.subarray(2), offset);
        return padded;
    }

    // Pads PNG to the exact byte size using a custom safe private chunk before IEND
    function padPngToExactSize(arrayBuffer, targetBytes) {
        const bytes = new Uint8Array(arrayBuffer);
        let diff = targetBytes - bytes.length;
        if (diff < 12) return bytes; // Minimum PNG chunk size is 12 bytes

        const dataLength = diff - 12;
        const chunkBytes = new Uint8Array(12 + dataLength);

        // Chunk Length (Big-Endian)
        chunkBytes[0] = (dataLength >> 24) & 0xFF;
        chunkBytes[1] = (dataLength >> 16) & 0xFF;
        chunkBytes[2] = (dataLength >> 8) & 0xFF;
        chunkBytes[3] = dataLength & 0xFF;

        // Chunk Type: 'pAdD' (private, safe-to-copy chunk)
        chunkBytes[4] = 0x70; // p
        chunkBytes[5] = 0x41; // A
        chunkBytes[6] = 0x64; // d
        chunkBytes[7] = 0x44; // D

        // Chunk Data: fill with 0x00
        for (let i = 0; i < dataLength; i++) {
            chunkBytes[8 + i] = 0x00;
        }

        // Calculate CRC over Chunk Type + Chunk Data
        const crcInput = chunkBytes.subarray(4, 8 + dataLength);
        const calculatedCrc = crc32(crcInput);

        // Chunk CRC (Big-Endian)
        const crcOffset = 8 + dataLength;
        chunkBytes[crcOffset] = (calculatedCrc >> 24) & 0xFF;
        chunkBytes[crcOffset + 1] = (calculatedCrc >> 16) & 0xFF;
        chunkBytes[crcOffset + 2] = (calculatedCrc >> 8) & 0xFF;
        chunkBytes[crcOffset + 3] = calculatedCrc & 0xFF;

        // Insert chunk right before the 12-byte IEND chunk at the end of PNG
        const padded = new Uint8Array(bytes.length + chunkBytes.length);
        const iendOffset = bytes.length - 12;

        padded.set(bytes.subarray(0, iendOffset), 0);
        padded.set(chunkBytes, iendOffset);
        padded.set(bytes.subarray(iendOffset), iendOffset + chunkBytes.length);

        return padded;
    }

    // Pads WEBP (RIFF) container with a custom unknown chunk
    function padWebpToExactSize(arrayBuffer, targetBytes) {
        const bytes = new Uint8Array(arrayBuffer);
        let diff = targetBytes - bytes.length;
        if (diff < 8) return bytes; // Minimum WebP chunk size is 8 bytes

        // WebP chunks must be aligned to even sizes.
        // If diff is even: payload size = diff - 8 (even). Total bytes = 8 + payload.
        // If diff is odd: payload size = diff - 9 (even, so 1 byte padding will be appended). Total bytes = 8 + payload + 1 = diff.
        let payloadSize = 0;
        let padByteNeeded = false;

        if (diff % 2 === 0) {
            payloadSize = diff - 8;
        } else {
            payloadSize = diff - 9;
            padByteNeeded = true;
        }

        const chunkOverhead = 8;
        const totalChunkBytes = chunkOverhead + payloadSize + (padByteNeeded ? 1 : 0);
        const chunkBytes = new Uint8Array(totalChunkBytes);

        // Chunk FourCC: 'PAD '
        chunkBytes[0] = 0x50; // P
        chunkBytes[1] = 0x41; // A
        chunkBytes[2] = 0x44; // D
        chunkBytes[3] = 0x20; // space

        // Chunk Size: 32-bit Little-Endian
        chunkBytes[4] = payloadSize & 0xFF;
        chunkBytes[5] = (payloadSize >> 8) & 0xFF;
        chunkBytes[6] = (payloadSize >> 16) & 0xFF;
        chunkBytes[7] = (payloadSize >> 24) & 0xFF;

        // Fill payload with 0x00
        for (let i = 0; i < payloadSize; i++) {
            chunkBytes[8 + i] = 0x00;
        }
        if (padByteNeeded) {
            chunkBytes[8 + payloadSize] = 0x00; // Even alignment pad byte
        }

        // Append chunk to the end of the WebP file
        const padded = new Uint8Array(bytes.length + totalChunkBytes);
        padded.set(bytes, 0);
        padded.set(chunkBytes, bytes.length);

        // Update the RIFF total size field at bytes 4-7 (32-bit Little-Endian = newFileSize - 8)
        const newRiffSize = targetBytes - 8;
        padded[4] = newRiffSize & 0xFF;
        padded[5] = (newRiffSize >> 8) & 0xFF;
        padded[6] = (newRiffSize >> 16) & 0xFF;
        padded[7] = (newRiffSize >> 24) & 0xFF;

        return padded;
    }

    // Core conversion orchestrator
    async function convertImage() {
        if (!loadedImage) return;

        const targetKB = parseFloat(targetKbInput.value);
        if (!targetKB || targetKB <= 0) {
            showStatus('⚠️ Please enter a valid target size (greater than 0).', 'error');
            return;
        }

        const targetBytes = Math.round(targetKB * 1024);
        convertBtn.disabled = true;
        showStatus(`⚙️ Converting to Exact ${selectedFormat.toUpperCase()} size...`, '');

        try {
            const blob = await compressToTarget(loadedImage, selectedFormat, targetBytes);
            const arrayBuffer = await blob.arrayBuffer();
            
            let finalBytes;
            if (selectedFormat === 'png') {
                finalBytes = padPngToExactSize(arrayBuffer, targetBytes);
            } else if (selectedFormat === 'webp') {
                finalBytes = padWebpToExactSize(arrayBuffer, targetBytes);
            } else {
                finalBytes = padJpegToExactSize(arrayBuffer, targetBytes);
            }
            
            convertedBlob = new Blob([finalBytes], { type: selectedFormat === 'png' ? 'image/png' : (selectedFormat === 'webp' ? 'image/webp' : 'image/jpeg') });
            const finalUrl = URL.createObjectURL(convertedBlob);

            newImg.src = finalUrl;
            newSizeBadge.textContent = formatKB(convertedBlob.size);
            
            convertedFilename = `converted_${targetKB}kb.${selectedFormat}`;
            downloadBtn.disabled = false;

            // Gauge calculations
            const achievedKB = (convertedBlob.size / 1024).toFixed(2);
            gaugeTargetLabel.textContent = `Target: ${targetKB} KB → Achieved: ${achievedKB} KB`;
            const pct = Math.min(100, (convertedBlob.size / targetBytes) * 100);
            gaugeFill.style.width = pct + '%';

            const exact = convertedBlob.size === targetBytes;
            if (exact) {
                showStatus(`🎉 Successful! Exactly ${targetKB} KB achieved (${convertedBlob.size} bytes) in ${selectedFormat.toUpperCase()} format.`, 'success');
            } else {
                showStatus(`🎉 Done! Nearest size achieved: ${formatKB(convertedBlob.size)} (Format: ${selectedFormat.toUpperCase()}).`, 'success');
            }
        } catch (err) {
            showStatus(`⚠️ ${err.message || 'An error occurred during conversion.'}`, 'error');
        } finally {
            convertBtn.disabled = false;
        }
    }

    // Bind event
    convertBtn.addEventListener('click', convertImage);

    // Download Action
    downloadBtn.addEventListener('click', () => {
        if (!convertedBlob) return;

        const url = URL.createObjectURL(convertedBlob);
        const tempLink = document.createElement('a');
        tempLink.href = url;
        tempLink.download = convertedFilename;
        document.body.appendChild(tempLink);
        tempLink.click();
        document.body.removeChild(tempLink);
        
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    });

    // Reset / Clear Action
    resetBtn.addEventListener('click', () => {
        loadedImage = null;
        originalBytes = 0;
        convertedBlob = null;
        
        fileInput.value = '';
        origImg.src = '';
        newImg.src = '';
        origSizeBadge.textContent = '—';
        newSizeBadge.textContent = '—';
        gaugeFill.style.width = '0%';
        
        downloadBtn.disabled = true;
        processingView.classList.add('hidden');
        dropZone.classList.remove('hidden');
        
        showStatus('⚡ Ready to convert. Choose your target size, format and click Convert.', '');
    });
});
