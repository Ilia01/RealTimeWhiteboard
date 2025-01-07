import { connectWebSocket, sendBinaryMessage } from './socket.js';
import { saveState } from './history.js';
import { appState } from './stateManager.js';
import { draw } from './draw.js';

export const canvas = document.getElementById('whiteboard');
export const ctx = canvas.getContext('2d');

let roomId = null;

function setupCanvas() {
  const { canvasDimensions, currentColor } = appState.getState();
  const { width, height } = canvasDimensions;

  canvas.width = width;
  canvas.height = height;
  ctx.fillStyle = currentColor;
  ctx.fillRect(0, 0, width, height);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
}

function getMousePosition(event) {
  const rect = canvas.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  return { x, y };
}

function startWhiteboard() {
  document.getElementById('landingPage').style.display = 'none';
  document.getElementById('whiteboardPage').style.display = 'block';
  document.getElementById('roomId').innerText = roomId;
  connectWebSocket();
}

function createRoom() {
  roomId = Math.floor(Math.random() * 1000000).toString();
  appState.setState(() => ({ roomId }));
  startWhiteboard();
}

function joinRoom() {
  const inputRoomId = document.getElementById('roomIdInput').value;
  roomId = inputRoomId;
  appState.setState(() => ({ roomId }));
  startWhiteboard();
}

function leaveRoom() {
  const socket = appState.getState().socket;
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.close(1000, 'Leaving room');
  }
  document.getElementById('landingPage').style.display = 'block';
  document.getElementById('whiteboardPage').style.display = 'none';
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}


function copyRoomCode() {
  navigator.clipboard.writeText(roomId).then(() => {
    const button = document.querySelector('.copy-button');
    button.textContent = 'Copied!';
    setTimeout(() => {
      button.textContent = 'Copy Code';
    }, 2000);
  });
}

canvas.addEventListener('mousedown', (e) => {
  const { currentTool } = appState.getState();
  appState.setState(() => ({
    isDrawing: true,
    startX: e.offsetX,
    startY: e.offsetY,
  }));

  if (currentTool === 'shape') {
    saveState();
  }
});

canvas.addEventListener('mousemove', (e) => {
    const { isDrawing, currentTool, currentColor, lineWidth, startX, startY } = appState.getState();
    if (!isDrawing) return;
  
    const x = e.offsetX;
    const y = e.offsetY;
  
    draw(ctx, currentTool, startX, startY, x, y, currentColor, lineWidth);
  
    // For tools like 'brush' or 'eraser', update the starting point dynamically
    if (['brush', 'eraser'].includes(currentTool)) {
      appState.setState(() => ({
        startX: x,
        startY: y,
      }));
    }
  });
  

  canvas.addEventListener('mouseup', () => {
    const { currentTool } = appState.getState();
    
    if (currentTool === 'shape') {
      saveState();
    }
  
    appState.setState(() => ({ isDrawing: false }));
  });
  

document.getElementById('createRoomButton').addEventListener('click', createRoom);
document.getElementById('joinRoomButton').addEventListener('click', joinRoom);
document.getElementById('leaveRoomButton').addEventListener('click', leaveRoom);
document.getElementById('copyRoomButton').addEventListener('click', copyRoomCode);

setupCanvas();

export { startWhiteboard, leaveRoom, copyRoomCode, setupCanvas, createRoom, joinRoom };
