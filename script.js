// Elements
const fileInput = document.getElementById('fileInput');
const originalImage = document.getElementById('originalImage');
const ditheredImage = document.getElementById('ditheredImage');
const ditherBtn = document.getElementById('ditherBtn');
const webcamBtn = document.getElementById('webcamBtn');
const stepSelect = document.getElementById('step');
const brightnessSlider = document.getElementById('brightness');
const dropZone = document.getElementById('dropZone');
const colorPicker = document.getElementById('colorPicker');
const copyBtn = document.getElementById('copyBtn');

copyBtn.addEventListener('click', () => {
    const json = JSON.stringify({ step: +stepSelect.value, brightness: +brightnessSlider.value });
    navigator.clipboard.writeText(json);
    const orig = copyBtn.textContent;
    copyBtn.textContent = 'Copied!';
    setTimeout(() => copyBtn.textContent = orig, 1000);
});

// Current loaded image data URL
let currentImageSrc = null;

// Video state (shared between webcam and uploaded video)
let activeVideo = null;
let webcamStream = null;
let videoRunning = false;
let lastFrameTime = 0;
const TARGET_FPS = 12;
const FRAME_INTERVAL = 1000 / TARGET_FPS;

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
    webcamBtn.textContent = 'Use Webcam';
}

// Webcam toggle
webcamBtn.addEventListener('click', async () => {
    if (videoRunning && webcamStream) {
        stopVideo();
    } else {
        stopVideo(); // Stop any uploaded video first
        try {
            webcamStream = await navigator.mediaDevices.getUserMedia({ video: true });
            activeVideo = document.createElement('video');
            activeVideo.srcObject = webcamStream;
            activeVideo.play();
            
            activeVideo.onloadedmetadata = () => {
                videoRunning = true;
                webcamBtn.textContent = 'Stop Webcam';
                processVideoFrame();
            };
        } catch (err) {
            alert('Could not access webcam: ' + err.message);
        }
    }
});

// Load uploaded video
function loadVideo(file) {
    stopVideo(); // Stop any running video
    
    const url = URL.createObjectURL(file);
    activeVideo = document.createElement('video');
    activeVideo.src = url;
    activeVideo.loop = true;
    activeVideo.muted = true;
    activeVideo.play();
    
    activeVideo.onloadedmetadata = () => {
        videoRunning = true;
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
        canvas.width = activeVideo.videoWidth;
        canvas.height = activeVideo.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(activeVideo, 0, 0);
        
        // Show original frame
        originalImage.src = canvas.toDataURL();
        
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
    }
    
    requestAnimationFrame(processVideoFrame);
}

// Build palette from selected checkboxes
function getSelectedPalette() {
    const checkboxes = colorPicker.querySelectorAll('input[type="checkbox"]:checked');
    const palette = [];
    checkboxes.forEach(cb => {
        const rgb = cb.dataset.color.split(',').map(Number);
        palette.push(rgb);
    });
    // Fallback to black & white if nothing selected
    return palette.length >= 2 ? palette : [[0, 0, 0], [255, 255, 255]];
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
    const reader = new FileReader();
    reader.onload = (e) => {
        currentImageSrc = e.target.result;
        originalImage.src = currentImageSrc;
        // Auto-apply dithering when image is loaded
        originalImage.onload = () => {
            applyDither();
        };
    };
    reader.readAsDataURL(file);
}

// Apply dithering
function applyDither() {
    if (!currentImageSrc) {
        alert('Please load an image first!');
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
        canvas.width = tempImg.width;
        canvas.height = tempImg.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(tempImg, 0, 0);

        // Get image data
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

        // Apply dithering
        ditherImageData(imageData, options);

        // Put dithered data back
        ctx.putImageData(imageData, 0, 0);

        // Update dithered image display
        ditheredImage.src = canvas.toDataURL();
    };
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

// Apply dither button
ditherBtn.addEventListener('click', applyDither);

// Re-apply when options change
stepSelect.addEventListener('input', () => {
    if (currentImageSrc) applyDither();
});
brightnessSlider.addEventListener('input', () => {
    if (currentImageSrc) applyDither();
});
colorPicker.addEventListener('change', () => {
    if (currentImageSrc) applyDither();
});
