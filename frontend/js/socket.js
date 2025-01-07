
import { draw } from './draw.js';
import { saveState } from './history.js';
import { currentColor, currentTool, currentShape, lineWidth, currentStateIndex } from './shared.js';


let socket = null;
function connectWebSocket() {
  const statusEl = document.getElementById('connectionStatus');
  if (socket && socket.readyState === WebSocket.OPEN) return;

  statusEl.className = 'status connecting';
  statusEl.textContent = 'Connecting...';

  socket = new WebSocket(`ws://localhost:8080/ws/${roomId}`);
  
  socket.onopen = () => {
      console.log('Connected to WebSocket');
      statusEl.className = 'status connected';
      statusEl.textContent = 'Connected';
  };
  
  socket.onclose = (e) => {
      console.warn('WebSocket closed:', e.code, e.reason);
      statusEl.className = 'status disconnected';
      statusEl.textContent = 'Disconnected';
      
      if (e.code !== 1000 && roomId) {
          console.log('Reconnecting...');
          setTimeout(connectWebSocket, 2000);
      }
  };

  socket.onmessage = (e) => {
      const buffer = e.data;
      if (buffer instanceof Blob) {
          buffer.arrayBuffer().then(processBinaryMessage).catch(err => console.error('Failed to process binary data:', err));
      }
  };
}

function sendBinaryMessage(x1, y1, x2, y2, lWidth, color, tool = 'brush', shape = null) {
  if (!socket || socket.readyState !== WebSocket.OPEN) return;
  
  const encoder = new TextEncoder();
  const colorBytes = encoder.encode(color);
  const toolBytes = encoder.encode(tool);
  const shapeBytes = shape ? encoder.encode(shape) : new Uint8Array(0);
  
  const buffer = new ArrayBuffer(
      8 + 
      1 + 
      1 + colorBytes.length +
      1 + toolBytes.length + 
      1 + shapeBytes.length 
  );
  
  const view = new DataView(buffer);
  let offset = 0;

  view.setUint16(offset, Math.round(x1), true); offset += 2;
  view.setUint16(offset, Math.round(y1), true); offset += 2;
  view.setUint16(offset, Math.round(x2), true); offset += 2;
  view.setUint16(offset, Math.round(y2), true); offset += 2;
  
  view.setUint8(offset, lWidth); offset += 1;

  view.setUint8(offset, colorBytes.length); offset += 1;
  for (let i = 0; i < colorBytes.length; i++) {
      view.setUint8(offset + i, colorBytes[i]);
  }
  offset += colorBytes.length;

  view.setUint8(offset, toolBytes.length); offset += 1;
  for (let i = 0; i < toolBytes.length; i++) {
      view.setUint8(offset + i, toolBytes[i]);
  }
  offset += toolBytes.length;

  view.setUint8(offset, shapeBytes.length); offset += 1;
  for (let i = 0; i < shapeBytes.length; i++) {
      view.setUint8(offset + i, shapeBytes[i]);
  }

  socket.send(buffer);
}

function processBinaryMessage(arrayBuffer) {
  const view = new DataView(arrayBuffer);
  let offset = 0;

  const x1 = view.getUint16(offset, true); offset += 2;
  const y1 = view.getUint16(offset, true); offset += 2;
  const x2 = view.getUint16(offset, true); offset += 2;
  const y2 = view.getUint16(offset, true); offset += 2;

  const lWidth = view.getUint8(offset); offset += 1;

  const colorLength = view.getUint8(offset); offset += 1;
  let color = '';
  for (let i = 0; i < colorLength; i++) {
      color += String.fromCharCode(view.getUint8(offset + i));
  }
  offset += colorLength;

  const toolLength = view.getUint8(offset); offset += 1;
  let tool = '';
  for (let i = 0; i < toolLength; i++) {
      tool += String.fromCharCode(view.getUint8(offset + i));
  }
  offset += toolLength;

  const shapeLength = view.getUint8(offset); offset += 1;
  let shape = '';
  if (shapeLength > 0) {
      for (let i = 0; i < shapeLength; i++) {
          shape += String.fromCharCode(view.getUint8(offset + i));
      }
  }

  if (tool === 'shape' && shape) {
      currentShape = shape;
      draw(x1, y1, x2, y2, lWidth, color, tool);
      currentShape = null;
  } else {
      draw(x1, y1, x2, y2, lWidth, color, tool);
  }
  
  saveState();
}

export { connectWebSocket, sendBinaryMessage };
