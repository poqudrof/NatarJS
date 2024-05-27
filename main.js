import jsQR from 'jsqr';
import { estimatePose3D, applyTransformInCSS, calculatePerspectiveWrap, drawCVImage, detectArucoMarkers } from './src/poseEstimation';
import { drawLine, drawRectangle, drawAxes, createRectangle2D } from './src/drawing';
import { setupCamera } from './src/camera';

import { signInWithGoogle, signOutGoogle, auth, 
         onAuthStateChanged, db, getDoc, setDoc, doc } from './src/firebase';


const videoElement = document.getElementById('webcam');
const canvasElement = document.getElementById('canvas');
const canvasContext = canvasElement.getContext('2d', { willReadFrequently: true });

const cameraSelect = document.getElementById('camera-select');
const resolutionSelect = document.getElementById('resolution-select');
const markerTypeSelect = document.getElementById('marker-type-select');
const startCameraButton = document.getElementById('start-camera');
const stopCameraButton = document.getElementById('stop-camera');
const decodedQRCodeElement = document.getElementById('decoded-qrcode');

const focalLengthSlider = document.getElementById('focalLength');

const camera = setupCamera(cameraSelect, resolutionSelect, focalLengthSlider, videoElement, tick);


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
    if (camera.isDrawing() && videoElement.readyState === videoElement.HAVE_ENOUGH_DATA) {
        canvasElement.height = videoElement.videoHeight;
        canvasElement.width = videoElement.videoWidth;
        canvasContext.drawImage(videoElement, 0, 0, canvasElement.width, canvasElement.height);
        const imageData = canvasContext.getImageData(0, 0, canvasElement.width, canvasElement.height);
        let srcOpenCV;

        try {
            srcOpenCV = cv.matFromImageData(imageData);
        } catch (error) {
            console.error('Error creating OpenCV matrix from image data.', error);
            requestAnimationFrame(tick);
            return;
        }

        let marker;
        if (markerTypeSelect.value === 'aruco') {
            try {
                marker = detectArucoMarkers(srcOpenCV, imageData);
            } catch (error) {
                console.error('Error detecting Aruco markers.', error);
                requestAnimationFrame(tick);
                return;
            }
        } else {
            marker = detectQRCode(imageData);
        }

        if (marker) {
            handleMarker(marker, srcOpenCV, imageData);
        } else {
            decodedQRCodeElement.textContent = 'Marker Data: N/A';
        }
    }
    requestAnimationFrame(tick);
}

function handleMarker(marker, srcOpenCV, imageData) {
    const location = marker.location;
    const topLeft = location.topLeftCorner;
    const topRight = location.topRightCorner;
    const bottomRight = location.bottomRightCorner;
    const bottomLeft = location.bottomLeftCorner;

    drawLine(canvasContext, topLeft, topRight, '#FF3B58');
    drawLine(canvasContext, topRight, bottomRight, '#FF3B58');
    drawLine(canvasContext, bottomRight, bottomLeft, '#FF3B58');
    drawLine(canvasContext, bottomLeft, topLeft, '#FF3B58');

    console.log("marker: ", marker.data);
    decodedQRCodeElement.textContent = `Marker Data: ${marker.data}`;

    const rotationMatrix = estimatePose3D(camera.getFocalLength(), 40, topLeft, topRight, bottomRight, bottomLeft, canvasElement.width, canvasElement.height);

    applyTransformInCSS(topLeft, topRight, bottomRight, bottomLeft);

    drawRectangle(canvasContext, rotationMatrix, camera.getFocalLength(), camera.getOpticalCenterX(), camera.getOpticalCenterY());
    drawAxes(canvasContext, rotationMatrix, camera.getFocalLength(), camera.getOpticalCenterX(), camera.getOpticalCenterY());

    const rectangle2D = createRectangle2D(rotationMatrix, camera.getFocalLength(), camera.getOpticalCenterX(), camera.getOpticalCenterY());

    let { dst, width, height } = calculatePerspectiveWrap(srcOpenCV, rectangle2D);
    drawCVImage(dst, width, height);
    dst.delete();

    srcOpenCV.delete();
}


document.getElementById('google-signin-button').addEventListener('click', () => {
  signInWithGoogle();
});

document.getElementById('google-signout-button').addEventListener('click', () => {
  signOutGoogle();
});

onAuthStateChanged(auth, (user) => {
  if (user) {
      document.getElementById('google-signin-button').style.display = 'none';
      document.getElementById('google-signout-button').style.display = 'block';
      document.getElementById('user-name').innerText = `Welcome, ${user.displayName}`;
  } else {
      document.getElementById('google-signin-button').style.display = 'block';
      document.getElementById('google-signout-button').style.display = 'none';
      document.getElementById('user-name').innerText = '';
  }
});


document.getElementById('save-config').addEventListener('click', async () => {
  const camera = document.getElementById('camera-select').value;
  const resolution = document.getElementById('resolution-select').value;
  const focalLength = document.getElementById('focalLength').value;

  const user = auth.currentUser;

  if (user) {
      const userConfig = {
          camera: camera,
          resolution: resolution,
          focalLength: focalLength
      };

      try {
          await setDoc(doc(db, 'users', user.uid), { cameraConfig: userConfig }, { merge: true });
          console.log('Configuration saved successfully');
      } catch (error) {
          console.error('Error saving configuration:', error);
      }
  } else {
      console.log('No user is signed in');
  }
});

document.getElementById('load-config').addEventListener('click', async () => {
  const user = auth.currentUser;
  if (user) {
    try {
      const docRef = doc(db, 'users', user.uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const userConfig = docSnap.data().cameraConfig;
        document.getElementById('camera-select').value = userConfig.camera;
        document.getElementById('resolution-select').value = userConfig.resolution;
        document.getElementById('focalLength').value = userConfig.focalLength;
        console.log('Configuration loaded successfully');
      } else {
        console.log('No configuration found for the user');
      }
    } catch (error) {
      console.error('Error loading configuration:', error);
    }
  } else {
    console.log('No user is signed in');
  }
});