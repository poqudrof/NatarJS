
import { auth, db, signInWithGoogle, signOutGoogle, onAuthStateChanged, setDoc, getDoc, doc } from './firebase';

let logged_user;
let currentStream = null;

onAuthStateChanged(auth, (user) => {
  if (user) {
      logged_user = user;
  } else {
      logged_user = null;
  }
});


async function startFirebaseWebcam(videoElement) {
  try {
      const cameraConfigDoc = await getDoc(doc(db, 'users', logged_user.uid));
      if (cameraConfigDoc.exists()) {
          const userConfig = cameraConfigDoc.data().cameraConfig;
    
          const resolution = userConfig.resolution.split('x');
          const width = parseInt(resolution[0]);
          const height = parseInt(resolution[1]);

          cameraWidth = width;
          cameraHeight = height;
          opticalCenterX = width / 2;
          opticalCenterY = height / 2;
          focalLength = userConfig.focalLength;

          console.log("Loading camera with resolution: ", width, height)
          console.log("Optical center: ", opticalCenterX, opticalCenterY)
          console.log("Focal length: ", focalLength)
          console.log("device id: ", userConfig.camera)
          const constraints = {
              video: {
                  deviceId: userConfig.camera ? { exact: userConfig.camera } : undefined,
                  width: { ideal: width },
                  height: { ideal: height },
                  facingMode: 'environment'
              }
          };

          if (currentStream) {
              currentStream.getTracks().forEach(track => track.stop());
          }

          currentStream = await navigator.mediaDevices.getUserMedia(constraints);

          videoElement.width = width;
          videoElement.height = height;
          videoElement.srcObject = currentStream;
          videoElement.play();
          isDrawing = true;
          return { width, height }
          // requestAnimationFrame(startWebcamCallback);
      } else {
          console.error('No camera configuration found in Firebase.');
      }
  } catch (err) {
      console.error('Error accessing Firebase camera configuration: ', err);
  }
}

function stopCamera() {
  if (currentStream) {
      currentStream.getTracks().forEach(track => track.stop());
      currentStream = null;
      isDrawing = false;
  }
}

export { startFirebaseWebcam, stopCamera };