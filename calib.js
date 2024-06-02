const { set } = require("firebase/database");
import { signInWithGoogle, signOutGoogle, auth, onAuthStateChanged, db, getDoc, setDoc, doc } from './src/firebase';

document.getElementById('google-signin-button').addEventListener('click', () => {
  signInWithGoogle();
});

document.getElementById('google-signout-button').addEventListener('click', () => {
  signOutGoogle();
});

let signed_in_user = null;

onAuthStateChanged(auth, (user) => {
  if (user) {
      signed_in_user = user;
      document.getElementById('google-signin-button').style.display = 'none';
      document.getElementById('google-signout-button').style.display = 'block';
      document.getElementById('user-name').innerText = `Welcome, ${user.displayName}`;
  } else {
      document.getElementById('google-signin-button').style.display = 'block';
      document.getElementById('google-signout-button').style.display = 'none';
      document.getElementById('user-name').innerText = '';
      signed_in_user = null;
  }
});

        

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
const circleSpacingSlider = document.getElementById('circle-spacing-slider'); 

// Function to create the grid of circles
function createGrid() {
    grid.innerHTML = '';
    const minFrequency = parseFloat(minFrequencySlider.value);
    const frequencyDiff = parseFloat(frequencyDiffSlider.value);
    const circleSize = parseInt(circleSizeSlider.value);


  //   <div>
  //   <label for="circle-spacing-slider">Circle Spacing: <span id="circle-spacing-value">50</span> px</label>
  //   <input type="range" id="circle-spacing-slider" min="10" max="100" step="1" value="50">
  // </div>
    const circleSpacing = parseInt(circleSpacingSlider.value);
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        const cercle = document.createElement('div');
        cercle.classList.add('cercle');
        const frequency = minFrequency + (i * 4 + j) * frequencyDiff;

        console.log("circle #", i * 4 + j, "frequency: ", frequency)
        const period = 1 / frequency;
        cercle.style.animationDuration = `${period}s`;
        cercle.style.width = `${circleSize}px`;
        cercle.style.height = `${circleSize}px`;
        cercle.style.margin = `${circleSpacing}px`;
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

    let nCircles = 4 * 4;

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
    // logCircleCenters();  // Log circle centers after updating the grid
}


// <button id="save-button">Save</button>
document.getElementById('save-button').addEventListener('click', logCircleCenters);


// Function to log the center of each circle along with the frequency
async function logCircleCenters() {
  const circles = document.querySelectorAll('.cercle');
  const centers = [];
  const pixelRatio = window.devicePixelRatio || 1;
  const minFrequency = parseFloat(minFrequencySlider.value);
  const frequencyDiff = parseFloat(frequencyDiffSlider.value);

  circles.forEach((cercle, index) => {
      const rect = cercle.getBoundingClientRect();
      const centerX = (rect.left + rect.width / 2) * pixelRatio;
      const centerY = (rect.top + rect.height / 2) * pixelRatio;
      const frequency = minFrequency + index * frequencyDiff;
      centers.push({ x: centerX, y: centerY, frequency: frequency });
  });

  await setDoc(doc(db, 'users', signed_in_user.uid), { blinkingCircles: centers }, { merge: true });

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

        // setTimeout(() => {
        //     logCircleCenters();
        // }, 1000);
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
circleSpacingSlider.addEventListener("input", updateValues);

// Initialize the grid when the document is loaded
document.addEventListener('DOMContentLoaded', () => {
    createGrid();
});
