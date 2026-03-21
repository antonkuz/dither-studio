// Elements
const fileInput = document.getElementById('fileInput');
const chooseFileBtn = document.getElementById('chooseFileBtn');
const ditheredImage = document.getElementById('ditheredImage');
const webcamBtn = document.getElementById('webcamBtn');
const exampleBtn = document.getElementById('exampleBtn');
const stepSelect = document.getElementById('step');
const stepValue = document.getElementById('stepValue');
const brightnessSlider = document.getElementById('brightness');
const brightnessValue = document.getElementById('brightnessValue');
const dropZone = document.getElementById('dropZone');
const colorPicker = document.getElementById('colorPicker');
const customColor = document.getElementById('customColor');
const customColorHex = document.getElementById('customColorHex');
const clearBtn = document.getElementById('clearBtn');
const compareBtn = document.getElementById('compareBtn');
const downloadBtn = document.getElementById('downloadBtn');

// Current loaded image data URL
let currentImageSrc = null;
let isDefaultImage = false;

// Before/after comparison state
let originalDisplaySrc = null;
let currentDitheredSrc = null;

// Video state (shared between webcam and uploaded video)
let activeVideo = null;
let webcamStream = null;
let videoRunning = false;
let lastFrameTime = 0;
const TARGET_FPS = 12;
const FRAME_INTERVAL = 1000 / TARGET_FPS;

// Toggle between drop zone and image display
function showImageState() {
    dropZone.classList.add('hidden');
    clearBtn.classList.remove('hidden');
    clearBtn.textContent = isDefaultImage ? 'Use Your Own' : 'Reset';
}

function showDropState() {
    dropZone.classList.remove('hidden');
    clearBtn.classList.add('hidden');
    compareBtn.classList.add('hidden');
    downloadBtn.classList.add('hidden');
    currentImageSrc = null;
    originalDisplaySrc = null;
    currentDitheredSrc = null;
    ditheredImage.src = '';
    ditheredImage.hidden = true;
    stopVideo();
}

clearBtn.addEventListener('click', showDropState);

// Choose File button triggers hidden file input
chooseFileBtn.addEventListener('click', () => fileInput.click());

// Example Image button
exampleBtn.addEventListener('click', () => loadImageFromUrl('fishka.jpeg'));

// Custom color input
customColor.addEventListener('input', () => {
    const hex = customColor.value;
    customColorHex.textContent = hex;
    // Deselect preset swatches and apply custom color
    const radios = colorPicker.querySelectorAll('input[type="radio"]');
    radios.forEach(r => r.checked = false);
    if (currentImageSrc) applyDither();
});

// Stop any running video
function stopVideo() {
    videoRunning = false;
    if (webcamStream) {
        webcamStream.getTracks().forEach(track => track.stop());
        webcamStream = null;
    }
    if (activeVideo) {
        activeVideo.pause();
        activeVideo = null;
    }
    webcamBtn.querySelector('.btn-label').textContent = 'Use Webcam';
}

// Webcam toggle
webcamBtn.addEventListener('click', async () => {
    if (videoRunning && webcamStream) {
        stopVideo();
    } else {
        stopVideo(); // Stop any uploaded video first
        isDefaultImage = false;
        try {
            webcamStream = await navigator.mediaDevices.getUserMedia({ video: true });
            activeVideo = document.createElement('video');
            activeVideo.srcObject = webcamStream;
            activeVideo.play();

            activeVideo.onloadedmetadata = () => {
                videoRunning = true;
                compareBtn.classList.add('hidden');
                downloadBtn.classList.add('hidden');
                webcamBtn.querySelector('.btn-label').textContent = 'Stop Webcam';
                showImageState();
                processVideoFrame();
            };
        } catch (err) {
            alert('Could not access webcam: ' + err.message);
        }
    }
});

// Load uploaded video
function loadVideo(file) {
    isDefaultImage = false;
    stopVideo(); // Stop any running video

    const url = URL.createObjectURL(file);
    activeVideo = document.createElement('video');
    activeVideo.src = url;
    activeVideo.loop = true;
    activeVideo.muted = true;
    activeVideo.play();

    activeVideo.onloadedmetadata = () => {
        videoRunning = true;
        compareBtn.classList.add('hidden');
        downloadBtn.classList.add('hidden');
        showImageState();
        processVideoFrame();
    };
}

// Process video frames (shared between webcam and uploaded video)
function processVideoFrame(timestamp = 0) {
    if (!videoRunning || !activeVideo) return;

    // Limit frame rate
    if (timestamp - lastFrameTime >= FRAME_INTERVAL) {
        lastFrameTime = timestamp;

        const canvas = document.createElement('canvas');
        const { width: vw, height: vh } = constrainToViewport(activeVideo.videoWidth, activeVideo.videoHeight);
        canvas.width = vw;
        canvas.height = vh;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(activeVideo, 0, 0, vw, vh);

        // Apply dithering
        const options = {
            step: parseInt(stepSelect.value),
            palette: getSelectedPalette(),
            brightness: parseInt(brightnessSlider.value) * 12
        };

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        ditherImageData(imageData, options);
        ctx.putImageData(imageData, 0, 0);
        ditheredImage.src = canvas.toDataURL();
        ditheredImage.hidden = false;
        showImageState();
    }

    requestAnimationFrame(processVideoFrame);
}

function getSelectedPalette() {
    const selected = colorPicker.querySelector('input[type="radio"]:checked');
    if (selected) {
        const color = selected.dataset.color.split(',').map(Number);
        return [[0, 0, 0], color];
    }
    // Use custom color if no preset is selected
    const hex = customColor.value;
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return [[0, 0, 0], [r, g, b]];
}

// Handle file selection
fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        if (file.type.startsWith('video/')) {
            loadVideo(file);
        } else {
            stopVideo();
            loadImage(file);
        }
    }
});

// Drag and drop
dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
});

dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('dragover');
});

dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    const file = e.dataTransfer.files[0];
    if (file) {
        if (file.type.startsWith('video/')) {
            loadVideo(file);
        } else if (file.type.startsWith('image/')) {
            stopVideo();
            loadImage(file);
        }
    }
});

// Load image from file
function loadImage(file) {
    isDefaultImage = false;
    const reader = new FileReader();
    reader.onload = (e) => {
        currentImageSrc = e.target.result;
        applyDither();
    };
    reader.readAsDataURL(file);
}

// Apply dithering
function applyDither() {
    if (!currentImageSrc) {
        return;
    }

    const options = {
        step: parseInt(stepSelect.value),
        palette: getSelectedPalette(),
        brightness: parseInt(brightnessSlider.value) * 12
    };

    // Create a temporary image for dithering
    const tempImg = new Image();
    tempImg.crossOrigin = 'anonymous';
    tempImg.src = currentImageSrc;

    tempImg.onload = () => {
        // Create a canvas to draw the image
        const canvas = document.createElement('canvas');
        const { width: iw, height: ih } = constrainToViewport(tempImg.width, tempImg.height);
        canvas.width = iw;
        canvas.height = ih;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(tempImg, 0, 0, iw, ih);

        // Capture original (constrained) before dithering
        originalDisplaySrc = canvas.toDataURL();

        // Get image data
        const imageData = ctx.getImageData(0, 0, iw, ih);

        // Apply dithering
        ditherImageData(imageData, options);

        // Put dithered data back
        ctx.putImageData(imageData, 0, 0);

        // Update dithered image display
        currentDitheredSrc = canvas.toDataURL();
        ditheredImage.src = currentDitheredSrc;
        ditheredImage.hidden = false;
        compareBtn.classList.remove('hidden');
        downloadBtn.classList.remove('hidden');
        showImageState();
    };
}

// Scale dimensions down to fit viewport, preserving aspect ratio
function constrainToViewport(width, height) {
    const isMobile = window.innerWidth <= 800;
    const bodyPadding = isMobile ? 16 * 2 : 40 * 2;
    const sidebarWidth = isMobile ? 0 : 320 + 30;
    const headerHeight = 80;
    const availWidth = window.innerWidth - bodyPadding - sidebarWidth;
    const availHeight = window.innerHeight - bodyPadding - headerHeight;
    const scale = Math.min(1, availWidth / width, availHeight / height);
    return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

// Ordered dithering implementation
function ditherImageData(imageData, options) {
    const { width, height, data } = imageData;
    const palette = options.palette;
    const step = options.step;
    const brightness = options.brightness;

    // Find closest color in palette
    function closestColor(r, g, b) {
        let minDist = Infinity;
        let closest = palette[0];
        for (const color of palette) {
            const dist = Math.pow(r - color[0], 2) +
                        Math.pow(g - color[1], 2) +
                        Math.pow(b - color[2], 2);
            if (dist < minDist) {
                minDist = dist;
                closest = color;
            }
        }
        return closest;
    }

    // Ordered dithering matrix (Bayer 4x4)
    const bayerMatrix = [
        [0, 8, 2, 10],
        [12, 4, 14, 6],
        [3, 11, 1, 9],
        [15, 7, 13, 5]
    ];

    for (let y = 0; y < height; y += step) {
        for (let x = 0; x < width; x += step) {
            const i = (y * width + x) * 4;
            const threshold = (bayerMatrix[y % 4][x % 4] / 16 - 0.5) * 128;

            const r = Math.min(255, Math.max(0, data[i] + brightness + threshold));
            const g = Math.min(255, Math.max(0, data[i + 1] + brightness + threshold));
            const b = Math.min(255, Math.max(0, data[i + 2] + brightness + threshold));

            const [nr, ng, nb] = closestColor(r, g, b);

            // Fill the step x step block
            for (let dy = 0; dy < step && y + dy < height; dy++) {
                for (let dx = 0; dx < step && x + dx < width; dx++) {
                    const idx = ((y + dy) * width + (x + dx)) * 4;
                    data[idx] = nr;
                    data[idx + 1] = ng;
                    data[idx + 2] = nb;
                }
            }
        }
    }
}

// Load image from URL
function loadImageFromUrl(url) {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        currentImageSrc = canvas.toDataURL();
        applyDither();
    };
    img.src = url;
}

// Load placeholder image on startup
isDefaultImage = true;
loadImageFromUrl('fishka.jpeg');

// Recommended brightness per step to compensate for darkness
const stepBrightnessMap = { 1: 0, 2: 6, 3: 1, 4: 8, 5: 1, 6: 9, 7: 3, 8: 10 };

// Update slider value displays
function updateSliderValues() {
    stepValue.textContent = stepSelect.value;
    brightnessValue.textContent = ((parseInt(brightnessSlider.value) + 10) * 10) + '%';
}

// Initialize displayed slider values
updateSliderValues();

// Re-apply when options change
stepSelect.addEventListener('input', () => {
    const recommended = stepBrightnessMap[stepSelect.value];
    if (recommended !== undefined) {
        brightnessSlider.value = recommended;
    }
    updateSliderValues();
    if (currentImageSrc) applyDither();
});
brightnessSlider.addEventListener('input', () => {
    updateSliderValues();
    if (currentImageSrc) applyDither();
});
colorPicker.addEventListener('change', () => {
    if (currentImageSrc) applyDither();
});

// Before/after comparison button
function showOriginal() {
    if (originalDisplaySrc) ditheredImage.src = originalDisplaySrc;
}
function showDithered() {
    if (currentDitheredSrc) ditheredImage.src = currentDitheredSrc;
}
compareBtn.addEventListener('mousedown', showOriginal);
compareBtn.addEventListener('touchstart', (e) => { e.preventDefault(); showOriginal(); });
compareBtn.addEventListener('mouseup', showDithered);
compareBtn.addEventListener('mouseleave', showDithered);
compareBtn.addEventListener('touchend', showDithered);
compareBtn.addEventListener('touchcancel', showDithered);

downloadBtn.addEventListener('click', () => {
    if (!currentDitheredSrc) return;
    const link = document.createElement('a');
    const now = new Date();
    const ts = now.toISOString().slice(0, 19).replace(/[:T]/g, '-');
    link.download = `dither-studio-${ts}.png`;
    link.href = currentDitheredSrc;
    link.click();
});
