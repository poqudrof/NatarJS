
import { auth, db, signInWithGoogle, signOutGoogle, onAuthStateChanged, setDoc, getDoc, doc } from './src/firebase';

// <script async src="https://docs.opencv.org/4.x/opencv.js"></script>

// import { cv } from 'opencv.js';

import { estimatePose3D, estimatePose3DFromMultipleMarkers, 
  serializeTransformationMatrix, deserializeTransformationMatrix, 
  projectPointToPlane, applyHomography,
  applyTransformInCSS, calculatePerspectiveWrap,
  drawCVImage, detectArucoMarkers } from './src/poseEstimation';


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

    // console.log("circle... ", x, y, frequency)

    fftCenters.forEach(center => {
      const freqDiff = Math.abs(frequency - center.freq);
      //console.log("center... ", center.x, center.y, center.freq)
      // console.log("diff... ", freqDiff)
      if (freqDiff < 0.05) {

        // TODO: Matching not working well. 
        // Projecting not working well either. 

        let cameraPoint = {x: center.x, y: center.y};
        //console.log("cameraPoint... ", cameraPoint)
        const worldPoint = projectPointToPlane(cameraPoint, cam, transformationMatrix);
        //console.log("worldPoint... ", worldPoint)

        matches.push({
          projectorPoint: { x, y, frequency },
          cameraPoint: { x: center.x, y: center.y, freq: center.freq },
          worldPoint, 
          freqDiff
        });

      }
    });
  });

  console.log(matches);

  findHomography(matches)
}

function findHomography(matches) {
  let objectPointsData = [];
  let imagePointsData = [];

  matches.forEach(match => {

    objectPointsData.push(match.worldPoint.x, match.worldPoint.y, match.worldPoint.z);
    imagePointsData.push(match.cameraPoint.x, match.cameraPoint.y);

    //console.log("Object Point: ", match.worldPoint.x, match.worldPoint.y, match.worldPoint.z);
    //console.log("Image Point: ", match.cameraPoint.x, match.cameraPoint.y);
  });


    // Creating the objectPoints and imagePoints matrices
  let objectPoints = cv.matFromArray(matches.length, 1, cv.CV_32FC3, objectPointsData);
  let imagePoints = cv.matFromArray(matches.length, 1, cv.CV_32FC2, imagePointsData);

  // Compute the homography matrix
  let H = cv.findHomography(objectPoints, imagePoints);
  console.log("Homography Matrix:\n", H.data64F);

  let p = { x: matches[0].worldPoint.x, y: matches[0].worldPoint.y, z: matches[0].worldPoint.z };

  // Example point on the 3D plane
  // let point3D = [0.5, 0.5, -300];
  console.log("3D Point:\n", p);
  let point3D = [p.x, p.y, p.z]; 
  let point2D = applyHomography(H, point3D);
  console.log("Transformed 2D Point:\n", point2D);

  let circle = document.getElementById('circle1');

  console.log(point2D, point2D.y)
  circle.style.left = point2D[0] + 'px';
  circle.style.top = point2D[1] + 'px';
  

  console.log("3D Point:\n", p);
  point3D = [p.x - 0.2, p.y, p.z]; 
  point2D = applyHomography(H, point3D);
  console.log("Transformed 2D Point:\n", point2D);
  circle = document.getElementById('circle2');

  console.log(point2D, point2D.y)
  circle.style.left = point2D[0] + 'px';
  circle.style.top = point2D[1] + 'px';
  
  // Example: Setting the circle at position (100, 150)


  const pose = serializeTransformationMatrix(H);
  setDoc(doc(db, 'users', logged_user.uid), { tableHomography: pose }, { merge: true });
  console.log('TableHomography saved successfully');

  // Cleanup
  objectPoints.delete();
  imagePoints.delete();
  H.delete();
}