# QR Code Pose Estimation with Webcam and OpenCV.js

This project demonstrates real-time 3D pose estimation of a QR code using a webcam, `jsQR`, and `opencv.js`. The goal is to detect the QR code, estimate its 3D pose relative to the camera, and apply a 3D CSS transformation.

## Features
- Real-time QR code detection from a webcam
- 3D pose estimation using OpenCV's Perspective-n-Point (PnP) algorithm
- Visualization using a 3D CSS transformation

## Prerequisites
- Node.js (version 14 or later)
- NPM (Node Package Manager)

## Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/qr-code-pose-estimation.git
    ```
2. Change directory to the project folder:
    ``` bash 
      cd qr-code-pose-estimation
    ```

## Install the dependencies:
 ```bash
npm install
 ```

## Usage
### Development
To start a development server:

``` bash
npm run start
``` 

This will open the project in your default browser.

Start json-server 
```bash 
json-server --port 5000  markerLinks.json
```

Start the json editor UI
```bash
 yarn manage
```

Build a pdf from the json editor UI
```bash
ruby tracks.rb
```


### Production
To create a production build:

``` bash
npm run build
```

This will generate the optimized output in the dist folder.

To serve the production build, use a simple HTTP server or include the build files in your preferred web server.

### Testing
To manually test the pose estimation:

Point your webcam at a QR code with known dimensions (e.g., a square of 40mm wide).
Adjust the focal length or QR code dimensions in the code if needed.

## Project Structure

``` bash
project/
│
├── public/
│   └── index.html
├── src/
│   └── main.js
├── .babelrc
└── package.json
```

## Configuration
### Camera Calibration:
The project assumes a focal length of 300 and an optical center at the center of the image.
You can change the focalLength variable and adjust the position of the optical center in the main.js file:
``` javascript
const focalLength = 300;
```

### QR Code Size:
The project assumes that the QR code is a square of 40mm wide.
You can modify the markerSize variable in main.js if using a different size:
```javascript

const markerSize = 40;
```

## Code Explanation

### index.html
Contains the structure and styling for the webcam feed, canvas, and 3D CSS transformation.
main.js
Uses jsQR for QR code detection and opencv.js for pose estimation.

1. QR Code Detection:
Detects the QR code using jsQR and extracts corner points.
2. 3D Pose Estimation:
Corresponds detected QR code corners to 3D points.
Estimates the pose using OpenCV's PnP algorithm.
3. Applies a 3D CSS transformation.


## Issue solving 


### Problem: parcel watch error: 

Expected content key 2d39cdf7c618ab5b to exist. Solution: `rm -rf .parcel-cache`.

Currently in Parcel github issue tracker: https://github.com/parcel-bundler/parcel/issues/8874 

## Acknowledgements

* ChatGPT
* jsQR
* opencv.js
* Parcel

## Licence
MIT License

