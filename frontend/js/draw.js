import { appState } from './stateManager.js';

export function draw(ctx, tool, startX, startY, x2, y2, color, width) {
  switch (tool) {
    case 'brush':
      drawBrush(ctx, startX, startY, x2, y2, color, width);
      break;
    case 'eraser':
      drawEraser(ctx, startX, startY, x2, y2, width);
      break;
    case 'shape':
      const { currentShape } = appState.getState();
      if (currentShape === 'rectangle') drawRectangle(ctx, startX, startY, x2, y2, color, width);
      else if (currentShape === 'circle') drawCircle(ctx, startX, startY, x2, y2, color, width);
      else if (currentShape === 'arrow') drawArrow(ctx, startX, startY, x2, y2, color, width);
      break;
    default:
      console.error(`Unknown tool: ${tool}`);
  }
}

function drawBrush(ctx, x1, y1, x2, y2, color, width) {
  ctx.beginPath();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.closePath();
}

function drawEraser(ctx, x1, y1, x2, y2, eraserSize) {
  drawBrush(ctx, x1, y1, x2, y2, 'white', eraserSize * 2);
}

function drawRectangle(ctx, startX, startY, x2, y2, color, width) {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.strokeRect(startX, startY, x2 - startX, y2 - startY);
}

function drawCircle(ctx, startX, startY, x2, y2, color, width) {
  const radius = Math.sqrt((x2 - startX) ** 2 + (y2 - startY) ** 2);
  ctx.beginPath();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.arc(startX, startY, radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.closePath();
}

function drawArrow(ctx, startX, startY, x2, y2, color, width) {
  const headLength = 20;
  const angle = Math.atan2(y2 - startY, x2 - startX);

  ctx.beginPath();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.moveTo(startX, startY);
  ctx.lineTo(x2, y2);

  ctx.lineTo(x2 - headLength * Math.cos(angle - Math.PI / 6), y2 - headLength * Math.sin(angle - Math.PI / 6));
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - headLength * Math.cos(angle + Math.PI / 6), y2 - headLength * Math.sin(angle + Math.PI / 6));
  
  ctx.stroke();
  ctx.closePath();
}
