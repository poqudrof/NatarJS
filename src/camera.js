let currentStream = null;
let isDrawing = false;
let cameraWidth = 640; // Default width
let cameraHeight = 480; // Default height
let opticalCenterX = 0;
let opticalCenterY = 0;
let focalLength = 500;

export function setupCamera(cameraSelect, resolutionSelect, focalLengthSlider, videoElement, startWebcamCallback) {
    focalLengthSlider.addEventListener('input', function () {
        focalLength = this.value;
        document.getElementById('focalText').textContent = focalLength;
    });

    document.getElementById('start-camera').addEventListener('click', startWebcam);
    document.getElementById('stop-camera').addEventListener('click', stopCamera);

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

        cameraWidth = width;
        cameraHeight = height;
        opticalCenterX = width / 2;
        opticalCenterY = height / 2;

        document.getElementById('focalText').textContent = focalLengthSlider.value;

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
            requestAnimationFrame(startWebcamCallback);
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
        // applyTransformInCSS(null);
        document.getElementById('decoded-qrcode').textContent = 'Marker Data: N/A';
    }

    document.addEventListener('DOMContentLoaded', getCameras);

    return {
        getCameraWidth: () => cameraWidth,
        getCameraHeight: () => cameraHeight,
        getOpticalCenterX: () => opticalCenterX,
        getOpticalCenterY: () => opticalCenterY,
        getFocalLength: () => focalLength,
        isDrawing: () => isDrawing
    };
}
