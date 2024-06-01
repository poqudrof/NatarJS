import { FFT } from './fft.js';

const video = document.getElementById('video');
const constraints = { video: true };
const fpsDisplay = document.getElementById('fps');
const canvasOutput = document.getElementById('canvasOutput');
const contextOutput = canvasOutput.getContext('2d');

let images = [];
const maxImages = 1024;
let startTime = null;
let computedFPS = 60; // Default FPS, will be updated


// List of all frequencies that we can compute: 
// for each id between 0 and maxImages
const frequencies = [];
for (let id = 0; id < maxImages; id++) {
  const freq = id / maxImages * computedFPS;
  frequencies.push(freq);
}
console.log('List of frequencies:', frequencies);

// the step between each frequency 
console.log('Step between each frequency:', computedFPS / maxImages);


navigator.mediaDevices.getUserMedia(constraints)
    .then(stream => {
        video.srcObject = stream;
        captureFrames();
    })
    .catch(err => {
        console.error('Error accessing webcam: ', err);
    });

function captureFrames() {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d', { willReadFrequently: true });
    canvas.width = video.width;
    canvas.height = video.height;

    startTime = performance.now();
    let frameCount = 0;


    function capture() {
        if (images.length < maxImages) {
            context.drawImage(video, 0, 0, canvas.width, canvas.height);
            const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
            images.push(imageData);

            console.log('# images ', images.length);
            frameCount++;

            let currentTime = performance.now();
            let elapsedTime = (currentTime - startTime) / 1000;  // Convert to seconds
            computedFPS = frameCount / elapsedTime;
            fpsDisplay.textContent = `FPS: ${computedFPS.toFixed(2)}`;

            requestAnimationFrame(capture);
        } else {
            processImages();
        }
    }

    capture();
}

function processImages() {
    const width = images[0].width;
    const height = images[0].height;

    const frequencyMap = contextOutput.createImageData(width, height);
    for (let r = 0; r < height; r++) {
        for (let c = 0; c < width; c++) {
            let pixelSeries = [];
            for (let k = 0; k < images.length; k++) {
                const index = (r * width + c) * 4;
                const gray = 0.299 * images[k].data[index] + 0.587 * images[k].data[index + 1] + 0.114 * images[k].data[index + 2];
                pixelSeries.push(gray / 255.0);
            }

            //console.log('pixelSeries', pixelSeries);
          
            let fft = new FFT(pixelSeries.length, 60 );
            fft.forward(pixelSeries);

            fft.calculateSpectrum();

            if(c == 0 && r == 0){
              console.log('fft', fft.spectrum);
            }
           
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
            

            if(maxVal > 0.10){
              console.log('freq found ', freq, 'maxVal', maxVal);
            }
            let color  = getColorFromFrequency(freq, maxVal);
          

            const index = (r * width + c) * 4;
            frequencyMap.data[index] = color[0];     // R
            frequencyMap.data[index + 1] = color[1]; // G
            frequencyMap.data[index + 2] = color[2]; // B
            frequencyMap.data[index + 3] = 255;      // A
        }
    }

    contextOutput.putImageData(frequencyMap, 0, 0);
}

function getColorFromFrequency(freq, amplitude) {
    const maxAmplitude = 1;
    const minAmplitude = 0.10;

    // console.log('freq', freq, 'amplitude', amplitude);

    if (amplitude < minAmplitude || freq < 0.9 || freq > 4.1 ) {
         return [0, 0, 0]; // Black for low amplitude
    }

    // Normalize amplitude and frequency
    let normAmplitude = Math.min(1, amplitude / maxAmplitude);
    let normFrequency = Math.min(1, (freq-0.9) / (4-0.9)); // Assuming max frequency of 30 Hz

    let red =  normFrequency * 255;
    let blue = (1 - normFrequency) * 255;
    let green = amplitude * 5 * 255;

    return [blue, green, red];
}
