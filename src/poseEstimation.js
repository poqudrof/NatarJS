import { OneEuroFilter } from "./oneEuroFilter";

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


// Pas sûr que ça fonctionne...
function calibrateCamera(points3D, points2D) {
    // Example data
    // 3D points (X, Y, Z)
    // let points3D = [
    //   [1, 2, 3],
    //   [4, 5, 6],
    //   [7, 8, 9],
    //   [10, 11, 12]
    // ];

    // // Corresponding 2D points (x, y)
    // let points2D = [
    //   [100, 150],
    //   [200, 250],
    //   [300, 350],
    //   [400, 450]
    // ];

    // Number of points
    let numPoints = points3D.length;

    // Form the matrices A and b
    let A = [];
    let b = [];
    for (let i = 0; i < numPoints; i++) {
      let [X, Y, Z] = points3D[i];
      let [x, y] = points2D[i];
      A.push([X / Z]);
      A.push([Y / Z]);
      b.push(x);
      b.push(y);
    }

    // Convert arrays to OpenCV matrices
    let matA = cv.matFromArray(2 * numPoints, 1, cv.CV_32F, A.flat());
    let matB = cv.matFromArray(2 * numPoints, 1, cv.CV_32F, b);

    // Solve for the focal length using least squares
    let matF = new cv.Mat();
    cv.solve(matA, matB, matF, cv.DECOMP_SVD);

    // Output the focal length
    console.log('Focal Length:', matF.data32F[0]);

    // Clean up
    matA.delete();
    matB.delete();
    matF.delete();
  }

let useFiltering = true;

// Create an array of OneEuroFilter instances for x, y, and z coordinates and rotation matrix elements
const freq = 30; // Example frequency, adjust as needed
const mincutoff = 1.0;
const beta = 0.0;
const dcutoff = 1.0;

// Filters for translation (x, y, z)
const translationFilters = [
  new OneEuroFilter(freq, mincutoff, beta, dcutoff), // For x
  new OneEuroFilter(freq, mincutoff, beta, dcutoff), // For y
  new OneEuroFilter(freq, mincutoff, beta, dcutoff)  // For z
];

// Filters for rotation matrix elements (9 elements in a 3x3 matrix)
const rotationFilters = Array.from({ length: 9 }, () => new OneEuroFilter(freq, mincutoff, beta, dcutoff));



function estimatePose3DFromMultipleMarkers(focalLength, detectedMarkers, markersJSON, imageWidth, imageHeight) {
  // Initialize arrays for object points and image points
  let objectPoints = [];
  let imagePoints = [];
 
  // Loop through each marker and add its points to the arrays
  detectedMarkers.forEach(marker => {

    const matchingMarker = markersJSON.find(jsonMarker => {
      const number = parseInt(jsonMarker.id.match(/\d+/)[0]);
      return number === marker.id;
    });
    
    if (!matchingMarker) {
      return;
    }
  
    const location = marker.location;
    const topLeft = location.topLeftCorner;
    const topRight = location.topRightCorner;
    const bottomRight = location.bottomRightCorner;
    const bottomLeft = location.bottomLeftCorner;

    // 3D object points (marker corners in the marker's coordinate system)
    // Using JSON data for marker size and coordinates
    const objPts = [
      matchingMarker.topLeft.x, matchingMarker.topLeft.y, 0,
      matchingMarker.topRight.x, matchingMarker.topRight.y, 0,
      matchingMarker.bottomRight.x, matchingMarker.bottomRight.y, 0,
      matchingMarker.bottomLeft.x, matchingMarker.bottomLeft.y, 0
    ];
    objectPoints = objectPoints.concat(objPts);

    // 2D image points (marker corners in the image)
    const imgPts = [
      topLeft.x, topLeft.y,
      topRight.x, topRight.y,
      bottomRight.x, bottomRight.y,
      bottomLeft.x, bottomLeft.y
    ];
    imagePoints = imagePoints.concat(imgPts);
  });

  // If we don't have enough markers, return null
  if (objectPoints.length < 12 || imagePoints.length < 8) {
    return null;
  }

  // Convert arrays to OpenCV Mats
  const objectPointsMat = cv.matFromArray(objectPoints.length / 3, 1, cv.CV_32FC3, objectPoints);
  const imagePointsMat = cv.matFromArray(imagePoints.length / 2, 1, cv.CV_32FC2, imagePoints);

  // Camera matrix
  const cameraMatrix = cv.matFromArray(3, 3, cv.CV_64F, [
    focalLength, 0, imageWidth / 2,
    0, focalLength, imageHeight / 2,
    0, 0, 1
  ]);

  const distCoeffs = cv.Mat.zeros(4, 1, cv.CV_64F);
  const rvec = new cv.Mat();
  const tvec = new cv.Mat();

  // Solve PnP to estimate the pose
  cv.solvePnP(objectPointsMat, imagePointsMat, cameraMatrix, distCoeffs, rvec, tvec);

  const rotationMatrix = new cv.Mat();
  cv.Rodrigues(rvec, rotationMatrix);

  let transformationMatrix;

  if(useFiltering) {
    const timestamp = Date.now() / 1000; // Example timestamp in seconds

    // Apply filters to each coordinate of the position
    const filteredPosition = {
      x: translationFilters[0].filter( tvec.data64F[0], timestamp),
      y: translationFilters[1].filter( tvec.data64F[1], timestamp),
      z: translationFilters[2].filter( tvec.data64F[2], timestamp)
    };
    

    let rotationMatrixData = [rotationMatrix.data64F[0], rotationMatrix.data64F[1], rotationMatrix.data64F[2],
                              rotationMatrix.data64F[3], rotationMatrix.data64F[4], rotationMatrix.data64F[5],
                              rotationMatrix.data64F[6], rotationMatrix.data64F[7], rotationMatrix.data64F[8]]
    // Apply filters to each element of the rotation matrix
    const filteredRotationMatrixData = rotationMatrixData.map((value, index) => 
      rotationFilters[index].filter(value, timestamp)
    );
    
    // Combine filtered rotation matrix and translation vector into a 4x4 transformation matrix
    transformationMatrix = cv.matFromArray(4, 4, cv.CV_64F, [
      filteredRotationMatrixData[0], filteredRotationMatrixData[1], filteredRotationMatrixData[2], filteredPosition.x,
      filteredRotationMatrixData[3], filteredRotationMatrixData[4], filteredRotationMatrixData[5], filteredPosition.y,
      filteredRotationMatrixData[6], filteredRotationMatrixData[7], filteredRotationMatrixData[8], filteredPosition.z,
      0, 0, 0, 1
    ]);
  
  }else {
    // Combine rotation matrix and translation vector into 4x4 matrix
    transformationMatrix = cv.matFromArray(4, 4, cv.CV_64F, [
      rotationMatrix.data64F[0], rotationMatrix.data64F[1], rotationMatrix.data64F[2], tvec.data64F[0],
      rotationMatrix.data64F[3], rotationMatrix.data64F[4], rotationMatrix.data64F[5], tvec.data64F[1],
      rotationMatrix.data64F[6], rotationMatrix.data64F[7], rotationMatrix.data64F[8], tvec.data64F[2],
      0, 0, 0, 1
    ]);
  }

  rvec.delete();
  tvec.delete();
  rotationMatrix.delete();
  cameraMatrix.delete();
  distCoeffs.delete();
  objectPointsMat.delete();
  imagePointsMat.delete();
  return transformationMatrix;
}

// Function to serialize the transformation matrix to JSON
function serializeTransformationMatrix(matrix) {
  const array = [];
  for (let i = 0; i < matrix.rows; i++) {
    for (let j = 0; j < matrix.cols; j++) {
      array.push(matrix.doubleAt(i, j));
    }
  }
  return JSON.stringify(array);
}

// Function to deserialize the transformation matrix from JSON
function deserializeTransformationMatrix(json) {
  const array = JSON.parse(json);
  return cv.matFromArray(4, 4, cv.CV_64F, array);
}

// Function to deserialize the transformation matrix from JSON
function deserializeTransformationMatrix3x3(json) {
  const array = JSON.parse(json);
  return cv.matFromArray(3, 3, cv.CV_64F, array);
}


function projectPointToPlane(imagePoint, cam, transformationMatrix) {

  // Extract camera parameters
  let { width, height, cx, cy, fx, fy } = cam;

  // Convert image point to normalized image coordinates
  const rayDirectionMat = cv.matFromArray(3, 1, cv.CV_64F, [
      (imagePoint.x - cx) / fx,
      (imagePoint.y - cy) / fy,
      1.0
  ]);

  const rayDirection = [rayDirectionMat.data64F[0], rayDirectionMat.data64F[1], rayDirectionMat.data64F[2]];

    // Extract the 3x3 rotation matrix from the transformation matrix
    const rvecMat = new cv.Mat(3, 3, cv.CV_64F);
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        rvecMat.data64F[i * 3 + j] = transformationMatrix.data64F[i * 4 + j];
      }
    }
    
    // Extract the translation vector from the transformation matrix
    const tvecMat = new cv.Mat(3, 1, cv.CV_64F);
    for (let i = 0; i < 3; i++) {
      tvecMat.data64F[i] = transformationMatrix.data64F[i * 4 + 3];
    }

    // Convert rotation vector to rotation matrix
    let R = rvecMat;
   // cv.Rodrigues(rvecMat, R);

    // Invert the transformation from marker to camera
    let R_inv = new cv.Mat();
    cv.transpose(R, R_inv);
    let tvec_inv = new cv.Mat();

    cv.gemm(R_inv, tvecMat, -1, new cv.Mat(), 0, tvec_inv, cv.GEMM_1_T);

    // Plane normal is the third column of the rotation matrix (in marker coordinates)
    let planeNormal = new cv.Mat();
    cv.gemm(R_inv, cv.matFromArray(3, 1, cv.CV_64FC1, [0, 0, 1]), 1, new cv.Mat(), 0, planeNormal);

    // Calculate the intersection of the ray with the plane
    let tvec_inv_arr = tvec_inv.data64F;
    let planeNormal_arr = planeNormal.data64F;
    let rayOrigin = [0, 0, 0]; // Camera origin in camera coordinates

    let t = - (tvec_inv_arr[0] * planeNormal_arr[0] +
               tvec_inv_arr[1] * planeNormal_arr[1] +
               tvec_inv_arr[2] * planeNormal_arr[2]) /
            (rayDirection[0] * planeNormal_arr[0] +
             rayDirection[1] * planeNormal_arr[1] +
             rayDirection[2] * planeNormal_arr[2]);

    let intersection = [
        rayOrigin[0] + t * rayDirection[0],
        rayOrigin[1] + t * rayDirection[1],
        rayOrigin[2] + t * rayDirection[2]
    ];

    // Convert intersection to cvMat Vector
    let intersectionMat = cv.matFromArray(3, 1, cv.CV_64FC1, intersection);

    // Convert camera point to marker coordinates
    let markerPointMat = new cv.Mat();
    cv.gemm(R_inv, intersectionMat, 1, tvec_inv, 1, markerPointMat);

    // Extract the resulting marker point coordinates
    let markerPoint = [markerPointMat.data64F[0], markerPointMat.data64F[1], markerPointMat.data64F[2]];

    // Cleanup
    rayDirectionMat.delete();
    rvecMat.delete();
    tvecMat.delete();
    // R.delete();
    R_inv.delete();
    tvec_inv.delete();
    planeNormal.delete();
    intersectionMat.delete();
    markerPointMat.delete();
  
    return markerPoint;
}

// Example usage
// const imagePoint = { x: 320, y: 240 }; // Example image point
//const projectedPoint3D = projectPointToPlane(imagePoint, cameraMatrix, transformationMatrix);
//console.log('Projected 3D Point:', projectedPoint3D);


// https://math.stackexchange.com/questions/296794/finding-the-transform-matrix-from-4-projected-points-with-javascript
// https://jsfiddle.net/zbh98nLv/

function adj(m) { // Compute the adjugate of m
  return [
    m[4]*m[8]-m[5]*m[7], m[2]*m[7]-m[1]*m[8], m[1]*m[5]-m[2]*m[4],
    m[5]*m[6]-m[3]*m[8], m[0]*m[8]-m[2]*m[6], m[2]*m[3]-m[0]*m[5],
    m[3]*m[7]-m[4]*m[6], m[1]*m[6]-m[0]*m[7], m[0]*m[4]-m[1]*m[3]
  ];
}
function multmm(a, b) { // multiply two matrices
  var c = Array(9);
  for (var i = 0; i != 3; ++i) {
    for (var j = 0; j != 3; ++j) {
      var cij = 0;
      for (var k = 0; k != 3; ++k) {
        cij += a[3*i + k]*b[3*k + j];
      }
      c[3*i + j] = cij;
    }
  }
  return c;
}
function multmv(m, v) { // multiply matrix and vector
  return [
    m[0]*v[0] + m[1]*v[1] + m[2]*v[2],
    m[3]*v[0] + m[4]*v[1] + m[5]*v[2],
    m[6]*v[0] + m[7]*v[1] + m[8]*v[2]
  ];
}
function pdbg(m, v) {
  var r = multmv(m, v);
  return r + " (" + r[0]/r[2] + ", " + r[1]/r[2] + ")";
}
function basisToPoints(x1, y1, x2, y2, x3, y3, x4, y4) {
  var m = [
    x1, x2, x3,
    y1, y2, y3,
     1,  1,  1
  ];
  var v = multmv(adj(m), [x4, y4, 1]);
  return multmm(m, [
    v[0], 0, 0,
    0, v[1], 0,
    0, 0, v[2]
  ]);
}
function general2DProjection(
  x1s, y1s, x1d, y1d,
  x2s, y2s, x2d, y2d,
  x3s, y3s, x3d, y3d,
  x4s, y4s, x4d, y4d
) {
  var s = basisToPoints(x1s, y1s, x2s, y2s, x3s, y3s, x4s, y4s);
  var d = basisToPoints(x1d, y1d, x2d, y2d, x3d, y3d, x4d, y4d);
  return multmm(d, adj(s));
}
function project(m, x, y) {
  var v = multmv(m, [x, y, 1]);
  return [v[0]/v[2], v[1]/v[2]];
}

function transform2d(elt, x1, y1, x2, y2, x3, y3, x4, y4) {
  var w = elt.offsetWidth, h = elt.offsetHeight;
  var t = general2DProjection
    (0, 0, x1, y1, w, 0, x2, y2, 0, h, x3, y3, w, h, x4, y4);
  for(i = 0; i != 9; ++i) t[i] = t[i]/t[8];
  t = [t[0], t[3], 0, t[6],
       t[1], t[4], 0, t[7],
       0   , 0   , 1, 0   ,
       t[2], t[5], 0, t[8]];
  t = "matrix3d(" + t.join(", ") + ")";
  elt.style["-webkit-transform"] = t;
  elt.style["-moz-transform"] = t;
  elt.style["-o-transform"] = t;
  elt.style.transform = t;
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



// Find transform from 4 points
function applyTransformInCSS(topLeft, topRight, bottomRight, bottomLeft) {
    const qrCodeElement = document.getElementById('qrcode');

    corners = [topLeft.x, topLeft.y, 
                topRight.x, topRight.y, 
                 bottomLeft.x, bottomLeft.y, 
                 bottomRight.x, bottomRight.y]; 

  transform2d(qrCodeElement, 
    corners[0], corners[1], 
    corners[2], corners[3],
    corners[4], corners[5],
    corners[6], corners[7]);

    //   for (var i = 0; i != 8; i += 2) {
    //     var elt = document.getElementById("marker" + i);
    //     elt.style.left = corners[i] + "px";
    //     elt.style.top = corners[i + 1] + "px";
    //   }
    // }

     // qrCodeElement.style.transform = transform;
  
}


// dst must be deleted after use 
function calculatePerspectiveWrap(srcOpenCV, rectangle2D) {
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

  warpMat.delete();
  srcTri.delete();
  dstTri.delete();

  return { dst, width, height };
}


function drawCVImage(dst, width, height) {
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


  let markers = [];

  for (let i = 0; i < ids.rows; i++) {
    const markerId = ids.intAt(i, 0);
    const markerCorners = corners.get(i).data32F;

    markers.push({
      id: markerId,
      location: {
        topLeftCorner: { x: markerCorners[0], y: markerCorners[1] },
        topRightCorner: { x: markerCorners[2], y: markerCorners[3] },
        bottomRightCorner: { x: markerCorners[4], y: markerCorners[5] },
        bottomLeftCorner: { x: markerCorners[6], y: markerCorners[7] }
      }
    });
  }

  // Clean up
  gray.delete();
  corners.delete();
  ids.delete();
  detectorParameters.delete();
  refineParameters.delete();
  detector.delete();
  dictionary.delete();

  return markers;
}


  // Function to apply homography to a point
function applyHomography(H, point) {

  let pointMat = cv.matFromArray(3, 1, cv.CV_64F, point);
  let transformedPointMat = new cv.Mat();

  res = cv.gemm(H, pointMat, 1, new cv.Mat(), 0, transformedPointMat);
  console.log("Building pointMat", transformedPointMat.data64F[0], transformedPointMat.data64F[1], transformedPointMat.data64F[2])
  let w = transformedPointMat.data64F[2];
  let x = transformedPointMat.data64F[0] / w;
  let y = transformedPointMat.data64F[1] / w;

  pointMat.delete();
  transformedPointMat.delete();
  return [x, y];
}


// Export the functions 
export { estimatePose3D, calibrateCamera, estimatePose3DFromMultipleMarkers,
  serializeTransformationMatrix, deserializeTransformationMatrix,
  deserializeTransformationMatrix3x3, applyHomography,
   applyTransform, projectPointToPlane, 
   applyTransformInCSS, calculatePerspectiveWrap,
   drawCVImage, detectArucoMarkers};