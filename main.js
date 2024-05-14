import jsQR from 'jsqr';
import { estimatePose3D, applyTransformInCSS } from './poseEstimation';
import { loadMarkerLinks, activateMarkerAction } from './markerHandler';

const videoElement = document.getElementById('webcam');
const canvasElement = document.getElementById('canvas');
const canvasContext = canvasElement.getContext('2d', { willReadFrequently: true });
let focalLength = 300; // Assume focal length of the webcam is 300
const markerSize = 40; // Marker size in mm
let currentStream = null;
let isDrawing = false;

const cameraSelect = document.getElementById('camera-select');
const resolutionSelect = document.getElementById('resolution-select');
const markerTypeSelect = document.getElementById('marker-type-select');
const startCameraButton = document.getElementById('start-camera');
const stopCameraButton = document.getElementById('stop-camera');
const decodedQRCodeElement = document.getElementById('decoded-qrcode');

const focalLengthSlider = document.getElementById('focalLength');

focalLengthSlider.addEventListener('input', function() {
    focalLength = this.value;
    // update focalText 
    document.getElementById('focalText').textContent = focalLength;

    // setPerspective(cameraWidth, focalLength); // Mettre à jour la perspective 

});

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

let opticalCenterX = 0; // Initialisez avec la valeur appropriée
let opticalCenterY = 0; // Initialisez avec la valeur appropriée


let cameraWidth = 640; // Largeur de la caméra en pixels
let cameraHeight = 480; // Hauteur de la caméra en pixels

async function startWebcam() {
    const resolution = resolutionSelect.value.split('x');
    const width = parseInt(resolution[0]);
    const height = parseInt(resolution[1]);

    cameraWidth = width;
    cameraHeight = height;

    // Mettre à jour le centre optique avec la moitié de la résolution
    opticalCenterX = width / 2;
    opticalCenterY = height / 2;

    document.getElementById('focalText').textContent = focalLength;

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
  applyTransformInCSS(null);
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

function detectArucoMarkers(srcOpenCV, imageData) {
  const src =  srcOpenCV//cv.matFromImageData(imageData);
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

  // src.delete();
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
      let srcOpenCV;
      
      try {
        srcOpenCV = cv.matFromImageData(imageData);
      } catch (error) {
        console.error('Une erreur s\'est produite lors de la création de la matrice OpenCV à partir des données de l\'image.', error);
        requestAnimationFrame(tick);
        return;
      }

      let marker;
      if (markerTypeSelect.value === 'aruco') {
        try {
          marker = detectArucoMarkers(srcOpenCV, imageData);

      } catch (error) {
          console.error('Une erreur s\'est produite lors de la détection des marqueurs Aruco.', error);
          requestAnimationFrame(tick);
          return;
        }
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
          
          applyTransformInCSS(topLeft, topRight, bottomRight, bottomLeft); 

          // Spotify app
          // activateMarkerAction(marker.data);

          // 1. Déterminer les coordonnées du rectangle dans l'espace 3D
          const rectangle3D = [
            { x: -10, y: -10, z: 0 },
            { x: 110, y: -10, z: 0 },
            { x: 110, y: 110, z: 0 },
            { x: -10, y: 110, z: 0 }
          ];

          // 2. Reprojeter les points dans l'espace image
          const rectangle2D = rectangle3D.map(point => {
            const projectedPoint = applyTransform(rotationMatrix, point);
            return {
              x: projectedPoint.x / projectedPoint.z * focalLength + opticalCenterX,
              y: projectedPoint.y / projectedPoint.z * focalLength + opticalCenterY
            };
          });

          // 3. Dessiner le rectangle dans l'espace image
          rectangle2D.forEach((point, index) => {
            const nextPoint = rectangle2D[(index + 1) % rectangle2D.length];
            drawLine(point, nextPoint, '#00FF00');
          });


          // 1. Définir les axes 3D
          const axes3D = [
            { start: { x: 0, y: 0, z: 0 }, end: { x: 50, y: 0, z: 0 }, color: '#FF0000' }, // Axe X en rouge
            { start: { x: 0, y: 0, z: 0 }, end: { x: 0, y: 50, z: 0 }, color: '#00FF00' }, // Axe Y en vert
            { start: { x: 0, y: 0, z: 0 }, end: { x: 0, y: 0, z: 50 }, color: '#0000FF' }  // Axe Z en bleu
          ];

          // 2. Transformer et dessiner les axes
          axes3D.forEach(axis => {
            const start2D = applyTransform(rotationMatrix, axis.start);
            const end2D = applyTransform(rotationMatrix, axis.end);

            drawLine(
              {
                x: start2D.x / start2D.z * focalLength + opticalCenterX,
                y: start2D.y / start2D.z * focalLength + opticalCenterY
              },
              {
                x: end2D.x / end2D.z * focalLength + opticalCenterX,
                y: end2D.y / end2D.z * focalLength + opticalCenterY
              },
              axis.color
            );
          });


          // Définir les points de source et de destination pour la transformation de perspective
          let srcTri = cv.matFromArray(4, 1, cv.CV_32FC2, [rectangle2D[0].x, rectangle2D[0].y,
              rectangle2D[1].x, rectangle2D[1].y,
              rectangle2D[2].x, rectangle2D[2].y, 
              rectangle2D[3].x, rectangle2D[3].y]);
                             
          let width = 200;  // px
          let height = 200; // px
          let dstTri = cv.matFromArray(4, 1, cv.CV_32FC2, [0, 0, width, 0, width, height, 0, height]);

          // Calculer la matrice de transformation de perspective
          let warpMat = cv.getPerspectiveTransform(srcTri, dstTri);

          // Appliquer la transformation de perspective
          let dst = new cv.Mat();
          cv.warpPerspective(srcOpenCV, dst, warpMat, new cv.Size(width, height), cv.INTER_LINEAR, cv.BORDER_CONSTANT, new cv.Scalar());

          // Rechercher l'élément de toile existant
          let outputCanvas = document.getElementById('outputCanvas');

          // Si l'élément de toile n'existe pas, en créer un nouveau
          if (!outputCanvas) {
            outputCanvas = document.createElement('canvas');
            outputCanvas.id = 'outputCanvas';
            document.body.appendChild(outputCanvas);
          }

          // Définir la largeur et la hauteur de la toile
          outputCanvas.width = width;
          outputCanvas.height = height;

          // Convertir la matrice OpenCV en une image de toile et la dessiner dans le coin inférieur droit de la toile
          cv.imshow(outputCanvas, dst);
          // canvasContext.drawImage(outputCanvas, canvasElement.width - width, canvasElement.height - height);

          // Libérer les ressources
          srcOpenCV.delete();
          dst.delete();
          warpMat.delete();
          srcTri.delete();
          dstTri.delete();
          decodedQRCodeElement.textContent = `Marker Data: ${marker.data}`;


      } else {
          // applyTransformInCSS(null);
          decodedQRCodeElement.textContent = 'Marker Data: N/A';
      }
  }
  requestAnimationFrame(tick);
}

function applyTransform(matrix, point) {
  // Créer un vecteur 4D pour le point
  const pointVector = cv.matFromArray(1, 4, cv.CV_64F, [point.x, point.y, point.z, 1]);

  // Transposer le vecteur de points
  const pointVectorT = pointVector.t();

  // Appliquer la transformation
  const transformedVector = new cv.Mat();
  const alpha = 1;
  const beta = 0;
  cv.gemm(matrix, pointVectorT, alpha, new cv.Mat(), beta, transformedVector, 0);

  // Retourner le point transformé
  return {
    x: transformedVector.data64F[0],
    y: transformedVector.data64F[1],
    z: transformedVector.data64F[2]
  };
}

document.addEventListener('DOMContentLoaded', getCameras);
document.addEventListener('DOMContentLoaded', async () => {
  await loadMarkerLinks();
});

startCameraButton.addEventListener('click', startWebcam);
stopCameraButton.addEventListener('click', stopCamera);
