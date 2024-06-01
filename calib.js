const { set } = require("firebase/database");

const grid = document.querySelector('.grid');
const minFrequencySlider = document.getElementById('min-frequency-slider');
const minFrequencyValue = document.getElementById('min-frequency-value');
const frequencyDiffSlider = document.getElementById('frequency-diff-slider');
const frequencyDiffValue = document.getElementById('frequency-diff-value');
const circleSizeSlider = document.getElementById('circle-size-slider');
const circleSizeValue = document.getElementById('circle-size-value');
const fpsSelect = document.getElementById('fps-select');
const sliderContainer = document.querySelector('.slider-container');
const toggleSlidersButton = document.getElementById('toggle-sliders-button');
const fullscreenButton = document.getElementById('fullscreen-button');

// Function to create the grid of circles
function createGrid() {
    grid.innerHTML = '';
    const minFrequency = parseFloat(minFrequencySlider.value);
    const frequencyDiff = parseFloat(frequencyDiffSlider.value);
    const circleSize = parseInt(circleSizeSlider.value);

    for (let i = 0; i < 8; i++) {
        for (let j = 0; j < 8; j++) {
            const cercle = document.createElement('div');
            cercle.classList.add('cercle');
            const frequency = minFrequency + (i * 8 + j) * frequencyDiff;
            const period = 1 / frequency;
            cercle.style.animationDuration = `${period}s`;
            cercle.style.width = `${circleSize}px`;
            cercle.style.height = `${circleSize}px`;
            grid.appendChild(cercle);
        }
    }
}

// Update slider values
function updateValues() {
    minFrequencyValue.textContent = minFrequencySlider.value;
    frequencyDiffValue.textContent = frequencyDiffSlider.value;
    circleSizeValue.textContent = circleSizeSlider.value;

    const minFrequency = parseFloat(minFrequencySlider.value);
    const totalTime = 3 * 1000 / minFrequency;

    const totalTimeDisplay = document.getElementById('total-time');
    totalTimeDisplay.textContent = (totalTime / 1000).toFixed(2) + ' s';

    const fps = parseInt(fpsSelect.value);
    const imageCount = Math.ceil(totalTime / 1000 * fps);
    const imageCountDisplay = document.getElementById('image-count');
    imageCountDisplay.textContent = imageCount;

    const frequencyDiff = parseFloat(frequencyDiffSlider.value);
    const circleSize = parseInt(circleSizeSlider.value);

    let nCircles = 8 * 8;

    const lastDotIndex = nCircles - 1;
    const lastDotFrequency = minFrequency + lastDotIndex * frequencyDiff;

    const blinkCount = Math.floor(totalTime / (1 / lastDotFrequency) / 1000);
    const blinkCountDisplay = document.getElementById('blink-count');

    const blinkDuration = 1 / lastDotFrequency;
    blinkCountDisplay.textContent = blinkDuration.toFixed(2) + ' s';

    const frameTime = 1000 / fps;
    const frameTimeDisplay = document.getElementById('frame-time-text');
    frameTimeDisplay.textContent = frameTime.toFixed(2) + ' ms';

    createGrid();
    logCircleCenters();  // Log circle centers after updating the grid
}

// Function to log the center of each circle
function logCircleCenters() {
    const circles = document.querySelectorAll('.cercle');
    const centers = [];
    const pixelRatio = window.devicePixelRatio || 1;
    circles.forEach(cercle => {
        const rect = cercle.getBoundingClientRect();
        const centerX = (rect.left + rect.width / 2) * pixelRatio;
        const centerY = (rect.top + rect.height / 2) * pixelRatio;
        centers.push({ x: centerX, y: centerY });
    });
    console.log(centers);
    // For demonstration, displaying the centers in the console
}

// Function to toggle the visibility of the sliders
function toggleSliders() {
    if (sliderContainer.style.display === 'none') {
        sliderContainer.style.display = 'flex';
    } else {
        sliderContainer.style.display = 'none';
    }
}

// Function to make the browser fullscreen
function makeFullscreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen();

        setTimeout(() => {
            logCircleCenters();
        }, 1000);
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        }
    }
}

minFrequencySlider.addEventListener('input', updateValues);
frequencyDiffSlider.addEventListener('input', updateValues);
circleSizeSlider.addEventListener('input', updateValues);
fpsSelect.addEventListener('change', updateValues);
toggleSlidersButton.addEventListener('click', toggleSliders);
fullscreenButton.addEventListener('click', makeFullscreen);

// Initialize the grid when the document is loaded
document.addEventListener('DOMContentLoaded', () => {
    createGrid();
    logCircleCenters();  // Log circle centers after initializing the grid
});
