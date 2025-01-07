import { connectWebSocket } from './socket.js';
import { canvas, ctx } from './script.js';
import { appState } from './stateManager.js';

document.getElementById('lineWidth').addEventListener('input', (e) => {
  document.getElementById('lineWidthValue').textContent = e.target.value;
  appState.setState(() => ({ lineWidth: e.target.value }));
});

document.querySelectorAll('.tool-button[data-tool]').forEach(button => {
  button.addEventListener('click', (e) => {
    document.querySelectorAll('.tool-button').forEach(b => b.classList.remove('active'));
    button.classList.add('active');
    appState.setState(() => ({ currentTool: button.dataset.tool, currentShape: null }));
  });
});

document.querySelectorAll('.tool-button[data-shape]').forEach(button => {
  button.addEventListener('click', (e) => {
    document.querySelectorAll('.tool-button').forEach(b => b.classList.remove('active'));
    button.classList.add('active');
    appState.setState(() => ({ currentTool: 'shape', currentShape: button.dataset.shape }));
  });
});

document.getElementById('colorSelector').addEventListener('change', (e) => {
  appState.setState(() => ({ currentColor: e.target.value }));
});

window.addEventListener('resize', () => {
  appState.setState(() => ({
    canvasDimensions: { width: window.innerWidth, height: window.innerHeight }
  }));
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
});

window.addEventListener('online', () => {
  if (roomId) connectWebSocket();
});

window.addEventListener('offline', () => console.log('You are offline'));

document.getElementById('downloadCanvas').addEventListener('click', () => {
  const link = document.createElement('a');
  link.download = 'whiteboard.png';
  link.href = canvas.toDataURL();
  link.click();
});
