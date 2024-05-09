import jsQR from 'jsqr';
import { estimatePose3D, applyTransform } from './poseEstimation';
import { loadMarkerLinks, activateMarkerAction } from './markerHandler';

const videoElement = document.getElementById('webcam');
const canvasElement = document.getElementById('canvas');
const canvasContext = canvasElement.getContext('2d', { willReadFrequently: true });
const focalLength = 300; // Assume focal length of the webcam is 300
const markerSize = 40; // Marker size in mm
let currentStream = null;
let isDrawing = false;

const cameraSelect = document.getElementById('camera-select');
const resolutionSelect = document.getElementById('resolution-select');
const markerTypeSelect = document.getElementById('marker-type-select');
const startCameraButton = document.getElementById('start-camera');
const stopCameraButton = document.getElementById('stop-camera');
const decodedQRCodeElement = document.getElementById('decoded-qrcode');

async function getCameras() {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const videoDevices = devices.filter(device => device.kind === 'videoinput');

    videoDevices.forEach((device, index) => {
        const option = document.createElement('option');
        option.value = device.deviceId;
        option.text = device.label || `Camera ${index + 1}`;
        cameraSelect.appendChild(option);
    });
}

async function startWebcam() {
    const resolution = resolutionSelect.value.split('x');
    const width = parseInt(resolution[0]);
    const height = parseInt(resolution[1]);

    const constraints = {
        video: {
            deviceId: cameraSelect.value ? { exact: cameraSelect.value } : undefined,
            width: { ideal: width },
            height: { ideal: height },
            facingMode: 'environment'
        }
    };

    if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop());
    }

    try {
        currentStream = await navigator.mediaDevices.getUserMedia(constraints);
        videoElement.srcObject = currentStream;
        videoElement.play();
        isDrawing = true;
        requestAnimationFrame(tick);
    } catch (err) {
        console.error('Error accessing webcam: ', err);
    }
}

function stopCamera() {
  if (currentStream) {
      currentStream.getTracks().forEach(track => track.stop());
      currentStream = null;
      isDrawing = false;
  }
  applyTransform(null);
  decodedQRCodeElement.textContent = 'Marker Data: N/A';
}

function drawLine(begin, end, color) {
  canvasContext.beginPath();
  canvasContext.lineWidth = 4;
  canvasContext.strokeStyle = color;
  canvasContext.moveTo(begin.x, begin.y);
  canvasContext.lineTo(end.x, end.y);
  canvasContext.stroke();
  
}



function detectArucoMarkers(imageData) {
  const src = cv.matFromImageData(imageData);
  const gray = new cv.Mat();
  cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);

  // Create the Aruco detector with parameters
  const dictionary = cv.getPredefinedDictionary(cv.DICT_6X6_250);
  const detectorParameters = new cv.aruco_DetectorParameters();
  const refineParameters = new cv.aruco_RefineParameters(10, 3, true);
  const detector = new cv.aruco_ArucoDetector(dictionary, detectorParameters, refineParameters);

  // Detect Aruco markers
  const corners = new cv.MatVector();
  const ids = new cv.Mat();
  detector.detectMarkers(gray, corners, ids);

  if (ids.rows > 0) {
      // Draw the detected Aruco markers' contours
      //cv.aruco_drawDetectedMarkers(src, corners, ids);

      const markerCorners = corners.get(0).data32F;
      return {
          data: ids.data32S[0].toString(),
          location: {
              topLeftCorner: { x: markerCorners[0], y: markerCorners[1] },
              topRightCorner: { x: markerCorners[2], y: markerCorners[3] },
              bottomRightCorner: { x: markerCorners[4], y: markerCorners[5] },
              bottomLeftCorner: { x: markerCorners[6], y: markerCorners[7] }
          }
      };
  }

  src.delete();
  gray.delete();
  corners.delete();
  ids.delete();
  detectorParameters.delete();
  refineParameters.delete();
  detector.delete();
  dictionary.delete();

  return null;
}



function detectQRCode(imageData) {
    const qrCode = jsQR(imageData.data, imageData.width, imageData.height);

    if (qrCode) {
        return {
            data: qrCode.data,
            location: qrCode.location
        };
    }

    return null;
}
function tick() {

  if (isDrawing && videoElement.readyState === videoElement.HAVE_ENOUGH_DATA) {
      // Draw the webcam frame on the canvas
      canvasElement.height = videoElement.videoHeight;
      canvasElement.width = videoElement.videoWidth;
      canvasContext.drawImage(videoElement, 0, 0, canvasElement.width, canvasElement.height);
      const imageData = canvasContext.getImageData(0, 0, canvasElement.width, canvasElement.height);

      let marker;
      if (markerTypeSelect.value === 'aruco') {
          marker = detectArucoMarkers(imageData);
      } else {
          marker = detectQRCode(imageData);
      }

      if (marker) {
          
          const location = marker.location;
          const topLeft = location.topLeftCorner;
          const topRight = location.topRightCorner;
          const bottomRight = location.bottomRightCorner;
          const bottomLeft = location.bottomLeftCorner;

          drawLine(topLeft, topRight, '#FF3B58');
          drawLine(topRight, bottomRight, '#FF3B58');
          drawLine(bottomRight, bottomLeft, '#FF3B58');
          drawLine(bottomLeft, topLeft, '#FF3B58');

          // print marker data 
          console.log("marker: ",marker.data);

          const rotationMatrix = estimatePose3D(focalLength, markerSize, topLeft, topRight, bottomRight, bottomLeft, canvasElement.width, canvasElement.height);
          applyTransform(rotationMatrix);
          activateMarkerAction(marker.data);
          decodedQRCodeElement.textContent = `Marker Data: ${marker.data}`;
      } else {
          applyTransform(null);
          decodedQRCodeElement.textContent = 'Marker Data: N/A';
      }
  }
  requestAnimationFrame(tick);
}



document.addEventListener('DOMContentLoaded', getCameras);
document.addEventListener('DOMContentLoaded', async () => {
  await loadMarkerLinks();
});

startCameraButton.addEventListener('click', startWebcam);
stopCameraButton.addEventListener('click', stopCamera);
