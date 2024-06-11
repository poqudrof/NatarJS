
import { auth, db, signInWithGoogle, signOutGoogle, onAuthStateChanged, setDoc, getDoc, doc } from './src/firebase';

import { estimatePose3D, estimatePose3DFromMultipleMarkers, 
  serializeTransformationMatrix, deserializeTransformationMatrix, 
  projectPointToPlane,
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
      if (freqDiff < 0.1) {

        // TODO: Matching not working well. 
        // Projecting not working well either. 

        let cameraPoint = {x: center.x, y: center.y};
        console.log("cameraPoint... ", cameraPoint)
        const worldPoint = projectPointToPlane(cameraPoint, cam, transformationMatrix);
        console.log("worldPoint... ", worldPoint)

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

    console.log("Object Point: ", match.worldPoint.x, match.worldPoint.y, match.worldPoint.z);
    console.log("Image Point: ", match.cameraPoint.x, match.cameraPoint.y);
  });


    // Creating the objectPoints and imagePoints matrices
  let objectPoints = cv.matFromArray(matches.length, 1, cv.CV_32FC3, objectPointsData);
  let imagePoints = cv.matFromArray(matches.length, 1, cv.CV_32FC2, imagePointsData);

  // Compute the homography matrix
  let H = cv.findHomography(objectPoints, imagePoints);
  console.log("Homography Matrix:\n", H.data64F);

  // Function to apply homography to a point
  function applyHomography(H, point) {
      let pointMat = cv.matFromArray(3, 1, cv.CV_64F, [point[0], point[1], 1.0]);
      let transformedPointMat = new cv.Mat();
      cv.gemm(H, pointMat, 1, new cv.Mat(), 0, transformedPointMat);
      let w = transformedPointMat.data64F[2];
      let x = transformedPointMat.data64F[0] / w;
      let y = transformedPointMat.data64F[1] / w;
      pointMat.delete();
      transformedPointMat.delete();
      return [x, y];
  }

  // Example point on the 3D plane
  let point3D = [0.5, 0.5, 300];
  let point2D = applyHomography(H, point3D);
  console.log("Transformed 2D Point:\n", point2D);

  // Cleanup
  objectPoints.delete();
  imagePoints.delete();
  H.delete();
}