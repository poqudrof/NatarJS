import { applyTransform } from './poseEstimation';

function createRectangle2D(rectangle3D, rotationMatrix, focalLength, opticalCenterX, opticalCenterY) {

  // 2. Reprojeter les points dans l'espace image
  const rectangle2D = rectangle3D.map(point => {
    const projectedPoint = applyTransform(rotationMatrix, point);
    return {
      x: projectedPoint.x / projectedPoint.z * focalLength + opticalCenterX,
      y: projectedPoint.y / projectedPoint.z * focalLength + opticalCenterY
    };
  });

  return rectangle2D;
}

function drawLine(canvasContext, begin, end, color) {
  canvasContext.beginPath();
  canvasContext.lineWidth = 4;
  canvasContext.strokeStyle = color;
  canvasContext.moveTo(begin.x, begin.y);
  canvasContext.lineTo(end.x, end.y);
  canvasContext.stroke();
}


function drawRectangle(rectangle2D, canvasContext) {

  // Dessiner le rectangle dans l'espace image
  rectangle2D.forEach((point, index) => {
    const nextPoint = rectangle2D[(index + 1) % rectangle2D.length];
    drawLine(canvasContext, point, nextPoint, '#00FF00');
  });
}

function drawAxes(canvasContext, rotationMatrix, focalLength, opticalCenterX, opticalCenterY) {
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

    drawLine(canvasContext,
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
}

// export all these methods 

export { drawLine, createRectangle2D, drawRectangle, drawAxes };