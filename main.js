import jsQR from 'jsqr';
import { estimatePose3D, applyTransformInCSS, calculatePerspectiveWrap, drawCVImage, detectArucoMarkers } from './poseEstimation';
import { loadMarkerLinks, activateMarkerAction } from './spotifyMarkerHandler';
import { drawLine, drawRectangle, drawAxes, createRectangle2D } from './drawing';
import { setupCamera } from './camera';

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

document.addEventListener('DOMContentLoaded', async () => {
    await loadMarkerLinks();
});
