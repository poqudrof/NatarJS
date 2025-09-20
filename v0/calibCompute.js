
import { auth, db, signInWithGoogle, signOutGoogle, onAuthStateChanged, setDoc, getDoc, doc } from './src/firebase';

// <script async src="https://docs.opencv.org/4.x/opencv.js"></script>

// import { cv } from 'opencv.js';

import { estimatePose3D, estimatePose3DFromMultipleMarkers, 
  serializeTransformationMatrix, deserializeTransformationMatrix, 
  projectPointToPlane, applyHomography,
  applyTransformInCSS, calculatePerspectiveWrap,
  drawCVImage, detectArucoMarkers } from './src/poseEstimation';

// TODO: 
// Nouvelle page avec : 
// Centres + FFT calculés 
// Tracking Aruco, et projection des coins sur la feuille. 

let logged_user;

onAuthStateChanged(auth, (user) => {
  if (user) {
      logged_user = user;
      loadDocs();
  } else {
      logged_user = null;
  }
});




async function loadDocs(){
  const cameraConfigDoc = await getDoc(doc(db, 'users', logged_user.uid));
  
  const data = cameraConfigDoc.data();
  console.log(data);

  
  const matches = [];
  const blinkingCircles = data.blinkingCircles;

  blinkingCircles.forEach((circle, i) => {
    const { x, y } = circle;
    const gridId = `grid-${i}`;
    const gridCircle = document.getElementById(gridId);
    gridCircle.style.left = x + 'px';
    gridCircle.style.top = y + 'px';
  });

  const fftCenters = data.fftCenters;
  const pose = data.poseMatrix; 

  const cameraConfig = data.cameraConfig;
    
  const resolution = cameraConfig.resolution.split('x');
  const width = parseInt(resolution[0]);
  const height = parseInt(resolution[1]);

  cameraWidth = width;
  cameraHeight = height;
  let cx = width / 2;
  let cy = height / 2;
  let fx = parseFloat(cameraConfig.focalLength);
  let fy = parseFloat(cameraConfig.focalLength);
  let cam = { width, height, cx, cy, fx, fy };

  console.log(pose)
  console.log("cam... ", cam)
  const transformationMatrix = deserializeTransformationMatrix(pose);

  blinkingCircles.forEach(circle => {
    const { x, y, frequency } = circle;

    fftCenters.forEach(center => {
      const freqDiff = Math.abs(frequency - center.freq);

      if (freqDiff < 0.05) {

        // TODO: Matching not working well. 
        // Projecting not working well either. 
        
        // Seen by the camera
        let cameraPoint = {x: center.x, y: center.y};
        const paperPoint = projectPointToPlane(cameraPoint, cam, transformationMatrix);
 
        matches.push({
          projectorPoint: { x, y, frequency },
          cameraPoint: { x: center.x, y: center.y, freq: center.freq },
          paperPoint, 
          freqDiff
        });

      }
    });
  });

  console.log(matches);

  findHomography(matches)
}

function findHomography(matches) {
  let originPointsData = [];
  let targetPointsData = [];

  matches.forEach(match => {
    originPointsData.push(match.paperPoint[0], match.paperPoint[1]);
    targetPointsData.push(match.cameraPoint.x, match.cameraPoint.y);
  });

    // Creating the originPoints and targetPoints matrices
  let originPoints = cv.matFromArray(matches.length, 1, cv.CV_32FC2, originPointsData);
  let targetPoints = cv.matFromArray(matches.length, 1, cv.CV_32FC2, targetPointsData);

  // Compute the homography matrix Paper -> Camera ?
  let H = cv.findHomography(originPoints, targetPoints);
  console.log("Homography Matrix:\n", H.data64F);

  let originX = 0;
  let originY = 0;
  let w =  297 /2; 
  let h =  210 /2;

  createCircleAtTransformedPoint(H, originX, originY);
  createCircleAtTransformedPoint(H, originX + w, originY);
  createCircleAtTransformedPoint(H, originX, originY + h);
  createCircleAtTransformedPoint(H, originX + w, originY + h);
 
  const pose = serializeTransformationMatrix(H);
  setDoc(doc(db, 'users', logged_user.uid), { paperToProjection: pose }, { merge: true });
  console.log('TableHomography saved successfully');

  // Cleanup
  targetPoints.delete();
  originPoints.delete();
  H.delete();
}


function createCircleAtTransformedPoint(H, originX, originY) {
  const point3D = [originX, originY, 1]; 
  const point2D = applyHomography(H, point3D);
  const circle = document.createElement('div');
  circle.className = 'circle';
  circle.style.left = point2D[0] + 'px';
  circle.style.top = point2D[1] + 'px';
  document.getElementById('container').appendChild(circle);
}
