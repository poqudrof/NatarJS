import jsQR from 'jsqr';
import { estimatePose3D, estimatePose3DFromMultipleMarkers, 
          calibrateCamera,
          serializeTransformationMatrix, deserializeTransformationMatrix, 
          applyTransformInCSS, calculatePerspectiveWrap,
          drawCVImage, detectArucoMarkers } from './src/poseEstimation';
import { drawLine, drawRectangle, drawAxes, createRectangle2D } from './src/drawing';
import { setupCamera } from './src/camera';
import { signInWithGoogle, signOutGoogle, auth, onAuthStateChanged, db, getDoc, setDoc, doc } from './src/firebase';


const videoElement = document.getElementById('webcam');
const canvasElement = document.getElementById('canvas');
const canvasContext = canvasElement.getContext('2d', { willReadFrequently: true });

const cameraSelect = document.getElementById('camera-select');
const resolutionSelect = document.getElementById('resolution-select');
const markerTypeSelect = document.getElementById('marker-type-select');
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

let logged_user;
let markerPositions;

onAuthStateChanged(auth, (user) => {
  if (user) {
      logged_user = user;
      getDoc(doc(db, 'users', logged_user.uid)).then((doc) => { markerPositions = doc.data().markerList; });
  } } );

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
        let markers;
        if (markerTypeSelect.value === 'aruco') {
            try {
                markers = detectArucoMarkers(srcOpenCV, imageData);
            } catch (error) {
                console.error('Error detecting Aruco markers.', error);
                requestAnimationFrame(tick);
                return;
            }
        } else {
            marker = detectQRCode(imageData);
        }

        if (markers) {
          handleMultiMarker(markers, srcOpenCV, imageData);
        } else {
          decodedQRCodeElement.textContent = 'Marker Data: N/A';
        }

        // if (marker) {
        //     handleMarker(marker, srcOpenCV, imageData);
        // } else {
        //     decodedQRCodeElement.textContent = 'Marker Data: N/A';
        // }
    }
    requestAnimationFrame(tick);
}

let rotationMatrixSave = null;
let markersSave = [];

const savePoseButton = document.getElementById('save-pose');
if (savePoseButton) {
  savePoseButton.addEventListener('click', async () => {
    const user = auth.currentUser;
    if (user) {
      try {        
        const pose = serializeTransformationMatrix(rotationMatrixSave);
        await setDoc(doc(db, 'users', user.uid), { poseMatrix: pose }, { merge: true });
        console.log('Pose saved successfully');
      } catch (error) {
        console.error('Error saving pose:', error);
      }
    } else {
      console.log('No user is signed in');
    }
  });
}

//<button id="calib-cam">CalibrateCamera</button>
const calibrateCamButton = document.getElementById('calib-cam');
if (calibrateCamButton) {
  calibrateCamButton.addEventListener('click', async () => {
    // Add your calibration logic here

    calibrateCamera();
  });
}



function handleMultiMarker(markers, srcOpenCV, imageData) {

  let markerIds = [];
  markers.forEach(marker => {
    const location = marker.location;
    const topLeft = location.topLeftCorner;
    const topRight = location.topRightCorner;
    const bottomRight = location.bottomRightCorner;
    const bottomLeft = location.bottomLeftCorner;

    drawLine(canvasContext, topLeft, topRight, '#FF3B58');
    drawLine(canvasContext, topRight, bottomRight, '#FF3B58');
    drawLine(canvasContext, bottomRight, bottomLeft, '#FF3B58');
    drawLine(canvasContext, bottomLeft, topLeft, '#FF3B58');

    markerIds.push(marker.id);
  });

  decodedQRCodeElement.textContent = `Marker Data: ${markerIds}`;

  const rotationMatrix = estimatePose3DFromMultipleMarkers(camera.getFocalLength(), 
                                                          markers, markerPositions,
                                                          canvasElement.width, canvasElement.height);
  rotationMatrixSave = rotationMatrix;


  markersSave = markers;
  // if rotationMatrix is null, then we don't have enough markers to estimate pose
  if (!rotationMatrix) {
    srcOpenCV.delete();
    return;
  }

    // <div id="distance">Distance: N/A</div>
  const distanceElement = document.getElementById('distance');
  const distance = rotationMatrix.data64F[11];
  distanceElement.textContent = `Distance: ${distance.toFixed(2)} mm`;
  
  // Now the Corners need to be computed... 

  // 1. Déterminer les coordonnées du rectangle dans l'espace 3D
  const rectangle3DPaper = [
    { x: 0, y: 0, z: 0 },
    { x: 297, y: 0, z: 0 },
    { x: 297, y: 210, z: 0 },
    { x: 0, y: 210, z: 0 }
  ];
    
  const paper2D = createRectangle2D(rectangle3DPaper, rotationMatrix, camera.getFocalLength(), camera.getOpticalCenterX(), camera.getOpticalCenterY());

  applyTransformInCSS(paper2D[0], paper2D[1], paper2D[2], paper2D[3]);

  // 1. Déterminer les coordonnées du rectangle dans l'espace 3D
  const rectangle3D = [
    { x: 0, y: 0, z: 0 },
    { x: 100, y: 0, z: 0 },
    { x: 100, y: 100, z: 0 },
    { x: 0, y: 100, z: 0 }
  ];

  const rectangle2D = createRectangle2D(rectangle3D, rotationMatrix, camera.getFocalLength(), camera.getOpticalCenterX(), camera.getOpticalCenterY());

  drawRectangle(rectangle2D, canvasContext);
  drawAxes(canvasContext, rotationMatrix, camera.getFocalLength(), camera.getOpticalCenterX(), camera.getOpticalCenterY());

  let { dst, width, height } = calculatePerspectiveWrap(srcOpenCV, rectangle2D);
  drawCVImage(dst, width, height);
  dst.delete();

  srcOpenCV.delete();
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

    decodedQRCodeElement.textContent = `Marker Data: ${marker.data}`;

    const rotationMatrix = estimatePose3D(camera.getFocalLength(), 40, topLeft, topRight, bottomRight, bottomLeft, canvasElement.width, canvasElement.height);

    applyTransformInCSS(topLeft, topRight, bottomRight, bottomLeft);

    drawRectangle(canvasContext, rotationMatrix, camera.getFocalLength(), camera.getOpticalCenterX(), camera.getOpticalCenterY());
    drawAxes(canvasContext, rotationMatrix, camera.getFocalLength(), camera.getOpticalCenterX(), camera.getOpticalCenterY());

    const rectangle3D = [
      { x: 0, y: 0, z: 0 },
      { x: 100, y: 0, z: 0 },
      { x: 100, y: 100, z: 0 },
      { x: 0, y: 100, z: 0 }
    ];
  
    const rectangle2D = createRectangle2D(rectangle3D, rotationMatrix, camera.getFocalLength(), camera.getOpticalCenterX(), camera.getOpticalCenterY());

    let { dst, width, height } = calculatePerspectiveWrap(srcOpenCV, rectangle2D);
    drawCVImage(dst, width, height);
    dst.delete();

    srcOpenCV.delete();
}

