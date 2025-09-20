import { FFT } from './fft.js';
import { signInWithGoogle, signOutGoogle, auth, onAuthStateChanged, db, getDoc, setDoc, doc } from './src/firebase';

import { startFirebaseWebcam, stopCamera } from './src/camFire.js';

const video = document.getElementById('video');
const constraints = { video: true };
const fpsDisplay = document.getElementById('fpsValue');
const frameCountDisplay = document.getElementById('frameCountValue');

const startButton = document.getElementById('startButton');
const stopButton = document.getElementById('stopButton');
const averageFPSDisplay = document.getElementById('averageFPSValue');

let images = [];
const maxImages = 512;
let startTime = null;
let frameCount = 0;
let recording = false;

let logged_user;

// Working with  1Hz, p 0.4Hz Step, 512 frames

let canvasOutput;
let contextOutput;

document.getElementById('google-signin-button').addEventListener('click', () => {
  signInWithGoogle();
});

document.getElementById('google-signout-button').addEventListener('click', () => {
  signOutGoogle();
});

onAuthStateChanged(auth, (user) => {
  if (user) {
      logged_user = user;
      document.getElementById('google-signin-button').style.display = 'none';
      document.getElementById('google-signout-button').style.display = 'block';
      document.getElementById('user-name').innerText = `Welcome, ${user.displayName}`;
      startFirebaseWebcam(video).then((res) => {
        width = res.width;
        height = res.height;

        // Create a canvas element
        const canvasOutput = document.createElement('canvas');

        console.log("Setting canvas... ", width, height)
        canvasOutput.width = width;
        canvasOutput.height = height;

        // Optionally, set the styles for the canvasOutput
        canvasOutput.style.width = `${width}px`;
        canvasOutput.style.height = `${height}px`;

        // Append the canvasOutput to the body
        contextOutput = canvasOutput.getContext('2d');
        document.body.appendChild(canvasOutput);
      });

  } else {
      document.getElementById('google-signin-button').style.display = 'block';
      document.getElementById('google-signout-button').style.display = 'none';
      document.getElementById('user-name').innerText = '';
      logged_user = null;
  }
});


startButton.addEventListener('click', startRecording);
stopButton.addEventListener('click', stopRecording);
// Use startWebcam instead 
// Load user Data nda load webcam 
// startWebcam()

// navigator.mediaDevices.getUserMedia(constraints)
//     .then(stream => {
//         video.srcObject = stream;
//     })
//     .catch(err => {
//         console.error('Error accessing webcam: ', err);
//     });

function startRecording() {
    recording = true;
    startButton.disabled = true;
    stopButton.disabled = false;
    images = [];
    frameCount = 0;
    startTime = performance.now();
    requestAnimationFrame(captureFrames);
}

function stopRecording() {
    recording = false;
    startButton.disabled = false;
    stopButton.disabled = true;
    const elapsedTime = (performance.now() - startTime) / 1000; // seconds
    const averageFPS = frameCount / elapsedTime;
    averageFPSDisplay.textContent = averageFPS.toFixed(2);
    processImages();
}

function captureFrames() {
    if (!recording) return;

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d', { willReadFrequently: true });
    canvas.width = video.width;
    canvas.height = video.height;

    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    images.push(imageData);
    frameCount++;
    frameCountDisplay.textContent = frameCount;

    const currentTime = performance.now();
    const elapsedTime = (currentTime - startTime) / 1000; // Convert to seconds
    const currentFPS = frameCount / elapsedTime;
    fpsDisplay.textContent = currentFPS.toFixed(2);
    computedFPS = currentFPS; // Update computedFPS using currentFPS

    if (images.length < maxImages) {
        requestAnimationFrame(captureFrames);
    } else {
        stopRecording();
    }
}

async function processImages() {
    const width = images[0].width;
    const height = images[0].height;

    console.log("Processing images... ", width, height) 
    // TODO: This must have the same size as the camera... 
    const frequencyMap = contextOutput.createImageData(width, height);
    const significantFrequencies = [];

    for (let r = 0; r < height; r++) {
        console.log("Processing row... ", r)
        for (let c = 0; c < width; c++) {
            let pixelSeries = [];
            for (let k = 0; k < images.length; k++) {
                const index = (r * width + c) * 4;
                const gray = 0.299 * images[k].data[index] + 0.587 * images[k].data[index + 1] + 0.114 * images[k].data[index + 2];
                pixelSeries.push(gray / 255.0);
            }

            let fft = new FFT(pixelSeries.length, computedFPS);
            fft.forward(pixelSeries);
            fft.calculateSpectrum();

            let magnitudes = fft.spectrum;

            let maxIdx = 0;
            let maxVal = 0;
            for (let i = 4; i < magnitudes.length; i++) {
                if (magnitudes[i] > maxVal) {
                    maxVal = magnitudes[i];
                    maxIdx = i;
                }
            }

            let freq = maxIdx / maxImages * computedFPS;  // Use computed FPS
            const simpleColor = getSimpleColorFromFrequency(freq, maxVal);
            // console.log("Simple color... ", simpleColor)
            contextOutput.fillStyle = `rgb(${simpleColor[0]}, ${simpleColor[1]}, ${simpleColor[2]})`;
            contextOutput.fillRect(c, r, 1, 1);

            if (maxVal > 0.10) {
                significantFrequencies.push({ x: c, y: r, frequency: freq, amplitude: maxVal });
            }

            let color = getColorFromFrequency(freq, maxVal);

            const index = (r * width + c) * 4;
            frequencyMap.data[index] = color[0];     // R
            frequencyMap.data[index + 1] = color[1]; // G
            frequencyMap.data[index + 2] = color[2]; // B
            frequencyMap.data[index + 3] = 255;      // A
        }
    }


    contextOutput.putImageData(frequencyMap, 0, 0);

        const frequencies = significantFrequencies.map(frequency => frequency.frequency);
        const uniqueFrequencies = [...new Set(frequencies)];

        const centers = uniqueFrequencies.map(freq => {
            const filteredFrequencies = significantFrequencies.filter(frequency => frequency.frequency === freq);
            const center = calculateCenter(filteredFrequencies, freq);
            return center;
        });

        drawCenters(centers);

    if (significantFrequencies.length > 0) {
        await saveCentersToFirestore(centers);
    } else {
         console.log('No significant frequencies found');
    }
}

async function saveCentersToFirestore(centers) {
  await setDoc(doc(db, 'users', logged_user.uid), { fftCenters: centers }, { merge: true });
}


function getColorFromFrequency(freq, amplitude) {
    const maxAmplitude = 1;
    const minAmplitude = 0.10;

    if (amplitude < minAmplitude) {
        return [0, 0, 0]; // Black for low amplitude
    }

    // Normalize amplitude and frequency
    let normAmplitude = Math.min(1, amplitude / maxAmplitude);
    let normFrequency = Math.min(1, (freq) / (5)); // Assuming max frequency of 30 Hz

    let red = normFrequency * 255;
    let blue = (1 - normFrequency) * 255;
    let green = amplitude * 5 * 255;

    return [blue, green, red];
}


function getSimpleColorFromFrequency(freq, amplitude) {
  const maxFrequency = 30;
  const minAmplitude = 0.10;

  // Normalize frequency
  let normFrequency = freq / maxFrequency;
  let red = normFrequency * 255;

  let blue = (1 - normFrequency) * 255;
  let green = 0;
  return [blue, green, red];

}


 

function calculateCenter(points, freq) {
    let sumX = 0;
    let sumY = 0;
    let count = 0;

    points.forEach(point => {
        sumX += point.x;
        sumY += point.y;
        count++;
    });

    return { freq, x: sumX / count, y: sumY / count };
}

function drawCenters(centers) {
    centers.forEach(center => {
        contextOutput.beginPath();
        contextOutput.arc(center.x, center.y, 5, 0, 2 * Math.PI); // Draw a small circle
        contextOutput.fillStyle = 'red';
        contextOutput.fill();
        contextOutput.font = '12px Arial';
        contextOutput.fillText(center.freq.toFixed(2) + ' Hz', center.x + 7, center.y - 7); // Display the frequency
        contextOutput.closePath();
    });
}



