
function estimatePose3D(focalLength, markerSize, topLeft, topRight, bottomRight, bottomLeft, imageWidth, imageHeight) {
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


// Export the functions 
export { estimatePose3D, applyTransform };