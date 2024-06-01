const grid = document.querySelector('.grid');
const minFrequencySlider = document.getElementById('min-frequency-slider');
const minFrequencyValue = document.getElementById('min-frequency-value');
const frequencyDiffSlider = document.getElementById('frequency-diff-slider');
const frequencyDiffValue = document.getElementById('frequency-diff-value');
const circleSizeSlider = document.getElementById('circle-size-slider');
const circleSizeValue = document.getElementById('circle-size-value');
const fpsSelect = document.getElementById('fps-select');

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


    const frameTime = 1000 / fps;
    const frameTimeDisplay = document.getElementById('frame-time-text');
    frameTimeDisplay.textContent = frameTime.toFixed(2) + ' ms';


    const blinkCount = Math.floor(totalTime / (1 / lastDotFrequency) / 1000);
    const blinkCountDisplay = document.getElementById('blink-count');

    const blinkDuration = 1 / lastDotFrequency;
    
    if (blinkDuration * 100 < frameTime) {
      blinkCountDisplay.style.color = 'red';
    } else {
      blinkCountDisplay.style.color = 'black';
    }
    blinkCountDisplay.textContent = blinkDuration.toFixed(2) + ' s';

    createGrid();
}

minFrequencySlider.addEventListener('input', updateValues);
frequencyDiffSlider.addEventListener('input', updateValues);
circleSizeSlider.addEventListener('input', updateValues);
fpsSelect.addEventListener('change', updateValues);

// Initialize the grid when the document is loaded
document.addEventListener('DOMContentLoaded', () => {
    createGrid();
});
