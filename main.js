import jsQR from 'jsqr';

const videoElement = document.getElementById('webcam');
const canvasElement = document.getElementById('canvas');
const canvasContext = canvasElement.getContext('2d');
const focalLength = 300; // Assume focal length of the webcam is 300
const markerSize = 40; // QR code marker is 40mm wide

function startWebcam() {
    navigator.mediaDevices
        .getUserMedia({ video: { facingMode: 'environment' } })
        .then((stream) => {
            videoElement.srcObject = stream;
            videoElement.play();
            requestAnimationFrame(tick);
        })
        .catch((err) => {
            console.error('Error accessing webcam: ', err);
        });
}

function tick() {
    if (videoElement.readyState === videoElement.HAVE_ENOUGH_DATA) {
        canvasElement.height = videoElement.videoHeight;
        canvasElement.width = videoElement.videoWidth;
        canvasContext.drawImage(videoElement, 0, 0, canvasElement.width, canvasElement.height);
        const imageData = canvasContext.getImageData(0, 0, canvasElement.width, canvasElement.height);
        const qrCode = jsQR(imageData.data, imageData.width, imageData.height);

        if (qrCode) {
            console.log('QR Code Data:', qrCode.data);

            const topLeft = qrCode.location.topLeftCorner;
            const topRight = qrCode.location.topRightCorner;
            const bottomRight = qrCode.location.bottomRightCorner;
            const bottomLeft = qrCode.location.bottomLeftCorner;

            // Estimate the 3D transform matrix
            const rotationMatrix = estimatePose3D(topLeft, topRight, bottomRight, bottomLeft, canvasElement.width, canvasElement.height);
           
            applyTransform(rotationMatrix);
        } else {
            applyTransform(null);
        }
    }
    requestAnimationFrame(tick);
}

function estimatePose3D(topLeft, topRight, bottomRight, bottomLeft, imageWidth, imageHeight) {
    const objectPoints = cv.matFromArray(4, 1, cv.CV_32FC3, [
        -markerSize / 2, markerSize / 2, 0,
        markerSize / 2, markerSize / 2, 0,
        markerSize / 2, -markerSize / 2, 0,
        -markerSize / 2, -markerSize / 2, 0
    ]);

    const imagePoints = cv.matFromArray(4, 1, cv.CV_32FC2, [
        topLeft.x, topLeft.y,
        topRight.x, topRight.y,
        bottomRight.x, bottomRight.y,
        bottomLeft.x, bottomLeft.y
    ]);

    const cameraMatrix = cv.matFromArray(3, 3, cv.CV_64F, [
        focalLength, 0, imageWidth / 2,
        0, focalLength, imageHeight / 2,
        0, 0, 1
    ]);

    const distCoeffs = cv.Mat.zeros(4, 1, cv.CV_64F);
    const rvec = new cv.Mat();
    const tvec = new cv.Mat();

    cv.solvePnP(objectPoints, imagePoints, cameraMatrix, distCoeffs, rvec, tvec);

    const rotationMatrix = new cv.Mat();
    cv.Rodrigues(rvec, rotationMatrix);

    // Combine rotation matrix and translation vector into 4x4 matrix
    const transformationMatrix = cv.matFromArray(4, 4, cv.CV_64F, [
        rotationMatrix.data64F[0], rotationMatrix.data64F[1], rotationMatrix.data64F[2], tvec.data64F[0],
        rotationMatrix.data64F[3], rotationMatrix.data64F[4], rotationMatrix.data64F[5], tvec.data64F[1],
        rotationMatrix.data64F[6], rotationMatrix.data64F[7], rotationMatrix.data64F[8], tvec.data64F[2],
        0, 0, 0, 1
    ]);

    rvec.delete();
    tvec.delete();
    rotationMatrix.delete();
    cameraMatrix.delete();
    distCoeffs.delete();
    objectPoints.delete();
    imagePoints.delete();

    return transformationMatrix;
}

function applyTransform(matrix) {
    const qrCodeElement = document.getElementById('qrcode');


 
    if (matrix) {
      console.log('Rotation Matrix:', `matrix3d(
        ${matrix.data64F[0]}, ${matrix.data64F[1]}, ${matrix.data64F[2]}, 0,
        ${matrix.data64F[4]}, ${matrix.data64F[5]}, ${matrix.data64F[6]}, 0,
        ${matrix.data64F[8]}, ${matrix.data64F[9]}, ${matrix.data64F[10]}, 0,
        ${matrix.data64F[3]}, ${matrix.data64F[7]}, ${matrix.data64F[11]}, 1
    )`); 
  
    
        const transform = `matrix3d(
            ${matrix.data64F[0]}, ${matrix.data64F[1]}, ${matrix.data64F[2]}, 0,
            ${matrix.data64F[4]}, ${matrix.data64F[5]}, ${matrix.data64F[6]}, 0,
            ${matrix.data64F[8]}, ${matrix.data64F[9]}, ${matrix.data64F[10]}, 0,
            ${matrix.data64F[3]}, ${matrix.data64F[7]}, ${matrix.data64F[11]}, 1
        )`;

        qrCodeElement.style.transform = transform;
    } else {
        qrCodeElement.style.transform = '';
    }
}

document.addEventListener('DOMContentLoaded', startWebcam);
