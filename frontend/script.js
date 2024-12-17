const canvas = document.getElementById('whiteboard');
const ctx = canvas.getContext('2d');
let socket;
let isDrawing = false;
let prevX = 0, prevY = 0;
let currentColor = document.getElementById('colorSelector').value;
let lineWidth = document.getElementById('lineWidth').value;
let roomId = null;

// Drawing State
let currentTool = 'brush';
let currentShape = null;
let drawingStates = [];
let currentStateIndex = -1;
let startX = 0, startY = 0;

// Room Management Functions
function createRoom() {
    roomId = Math.random().toString(36).substring(2, 10);
    startWhiteboard();
}

function joinRoom() {
    const input = document.getElementById('joinRoomInput');
    roomId = input.value.trim();
    if (!roomId) {
        alert('Please enter a room code');
        return;
    }
    startWhiteboard();
}

function startWhiteboard() {
    document.getElementById('landingPage').style.display = 'none';
    document.getElementById('whiteboardPage').style.display = 'block';
    document.getElementById('roomId').innerText = roomId;
    connectWebSocket();
}

function leaveRoom() {
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

// Tool Selection
document.querySelectorAll('.tool-button[data-tool]').forEach(button => {
    button.addEventListener('click', (e) => {
        document.querySelectorAll('.tool-button').forEach(b => b.classList.remove('active'));
        button.classList.add('active');
        currentTool = button.dataset.tool;
        currentShape = null;
    });
});

document.querySelectorAll('.tool-button[data-shape]').forEach(button => {
    button.addEventListener('click', (e) => {
        document.querySelectorAll('.tool-button').forEach(b => b.classList.remove('active'));
        button.classList.add('active');
        currentShape = button.dataset.shape;
        currentTool = 'shape';
    });
});

// History Management
function saveState() {
    const state = canvas.toDataURL();
    drawingStates = drawingStates.slice(0, currentStateIndex + 1);
    drawingStates.push(state);
    currentStateIndex++;
    updateHistoryButtons();
}

function updateHistoryButtons() {
    document.getElementById('undoButton').disabled = currentStateIndex < 0;
    document.getElementById('redoButton').disabled = currentStateIndex >= drawingStates.length - 1;
}

document.getElementById('undoButton').addEventListener('click', () => {
    if (currentStateIndex > 0) {
        currentStateIndex--;
        loadState(drawingStates[currentStateIndex]);
        updateHistoryButtons();
    }
});

document.getElementById('redoButton').addEventListener('click', () => {
    if (currentStateIndex < drawingStates.length - 1) {
        currentStateIndex++;
        loadState(drawingStates[currentStateIndex]);
        updateHistoryButtons();
    }
});

function loadState(state) {
    const img = new Image();
    img.src = state;
    img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
    };
}

// Drawing Functions
function startDrawing(e) {
    isDrawing = true;
    [startX, startY] = [e.offsetX, e.offsetY];
    [prevX, prevY] = [startX, startY];

    if (currentTool === 'shape') {
        // Create a copy of the canvas for shape preview
        saveState();
    }
}

function draw(x1, y1, x2, y2, width = 2, color = 'black', tool = 'brush') {
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (tool === 'eraser') {
        ctx.strokeStyle = 'white';
        ctx.lineWidth = width * 2;
    }

    if (tool === 'shape') {
        // Load the previous state for shape preview
        if (currentStateIndex >= 0) {
            loadState(drawingStates[currentStateIndex]);
        } else {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }

        switch (currentShape) {
            case 'rectangle':
                ctx.strokeRect(startX, startY, x2 - startX, y2 - startY);
                break;
            case 'circle':
                const radius = Math.sqrt(Math.pow(x2 - startX, 2) + Math.pow(y2 - startY, 2));
                ctx.beginPath();
                ctx.arc(startX, startY, radius, 0, Math.PI * 2);
                ctx.stroke();
                break;
            case 'line':
                ctx.beginPath();
                ctx.moveTo(startX, startY);
                ctx.lineTo(x2, y2);
                ctx.stroke();
                break;
            case 'arrow':
                drawArrow(startX, startY, x2, y2);
                break;
        }
    } else {
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
    }
    ctx.closePath();
}

function drawArrow(fromX, fromY, toX, toY) {
    const headLength = 20;
    const angle = Math.atan2(toY - fromY, toX - fromX);
    
    ctx.beginPath();
    ctx.moveTo(fromX, fromY);
    ctx.lineTo(toX, toY);
    
    ctx.lineTo(toX - headLength * Math.cos(angle - Math.PI / 6), toY - headLength * Math.sin(angle - Math.PI / 6));
    ctx.moveTo(toX, toY);
    ctx.lineTo(toX - headLength * Math.cos(angle + Math.PI / 6), toY - headLength * Math.sin(angle + Math.PI / 6));
    
    ctx.stroke();
    ctx.closePath();
}

// Mouse Events for Drawing
canvas.addEventListener('mousedown', startDrawing);

canvas.addEventListener('mousemove', (e) => {
    if (!isDrawing) return;
    const x = e.offsetX;
    const y = e.offsetY;

    if (currentTool === 'shape') {
        draw(prevX, prevY, x, y, lineWidth, currentColor, 'shape');
    } else {
        draw(prevX, prevY, x, y, lineWidth, currentColor, currentTool);
        sendBinaryMessage(prevX, prevY, x, y, lineWidth, currentColor, currentTool);
        [prevX, prevY] = [x, y];
    }
});

canvas.addEventListener('mouseup', () => {
    if (isDrawing) {
        isDrawing = false;
        if (currentTool === 'shape') {
            // Save the final shape
            saveState();
            // Send the shape data
            sendBinaryMessage(startX, startY, prevX, prevY, lineWidth, currentColor, 'shape', currentShape);
        }
    }
});

canvas.addEventListener('mouseout', () => {
    isDrawing = false;
});

// Update line width display
document.getElementById('lineWidth').addEventListener('input', (e) => {
    document.getElementById('lineWidthValue').textContent = e.target.value;
    lineWidth = e.target.value;
});

// Canvas Setup
function setupCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    ctx.fillStyle = '#1e293b'; // Dark background
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    saveState();
}

// Clear canvas with dark background
document.getElementById('clearCanvas').addEventListener('click', () => {
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    saveState();
});

// Make canvas responsive
window.addEventListener('resize', () => {
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    tempCtx.drawImage(canvas, 0, 0);
    
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(tempCanvas, 0, 0);
});

// Initialize canvas
window.addEventListener('load', () => {
    setupCanvas();
    
    // Set initial color to white for better visibility on dark background
    currentColor = '#ffffff';
    document.getElementById('colorSelector').value = currentColor;
});

// WebSocket Events
window.addEventListener('online', () => {
    if (roomId) connectWebSocket();
});
window.addEventListener('offline', () => console.log('You are offline'));

// Toolbar Events
document.getElementById('colorSelector').addEventListener('change', (e) => currentColor = e.target.value);

document.getElementById('downloadCanvas').addEventListener('click', () => {
    const link = document.createElement('a');
    link.download = 'whiteboard.png';
    link.href = canvas.toDataURL();
    link.click();
});

// Send Binary Message
function sendBinaryMessage(x1, y1, x2, y2, lWidth, color, tool = 'brush', shape = null) {
    if (!socket || socket.readyState !== WebSocket.OPEN) return;
    
    const encoder = new TextEncoder();
    const colorBytes = encoder.encode(color);
    const toolBytes = encoder.encode(tool);
    const shapeBytes = shape ? encoder.encode(shape) : new Uint8Array(0);
    
    // Optimize buffer size: use 16-bit for coordinates instead of 32-bit
    // Most screens are under 65535px in either dimension
    const buffer = new ArrayBuffer(
        8 + // coordinates (2 bytes each = 8 bytes total)
        1 + // line width (1 byte)
        1 + colorBytes.length + // color length + color
        1 + toolBytes.length + // tool length + tool
        1 + shapeBytes.length // shape length + shape
    );
    
    const view = new DataView(buffer);
    let offset = 0;

    // Write coordinates as 16-bit integers
    view.setUint16(offset, Math.round(x1), true); offset += 2;
    view.setUint16(offset, Math.round(y1), true); offset += 2;
    view.setUint16(offset, Math.round(x2), true); offset += 2;
    view.setUint16(offset, Math.round(y2), true); offset += 2;
    
    // Write line width
    view.setUint8(offset, lWidth); offset += 1;
    
    // Write color
    view.setUint8(offset, colorBytes.length); offset += 1;
    for (let i = 0; i < colorBytes.length; i++) {
        view.setUint8(offset + i, colorBytes[i]);
    }
    offset += colorBytes.length;
    
    // Write tool
    view.setUint8(offset, toolBytes.length); offset += 1;
    for (let i = 0; i < toolBytes.length; i++) {
        view.setUint8(offset + i, toolBytes[i]);
    }
    offset += toolBytes.length;
    
    // Write shape
    view.setUint8(offset, shapeBytes.length); offset += 1;
    for (let i = 0; i < shapeBytes.length; i++) {
        view.setUint8(offset + i, shapeBytes[i]);
    }

    socket.send(buffer);
}

// WebSocket Connection
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
            buffer.arrayBuffer().then((arrayBuffer) => {
                const view = new DataView(arrayBuffer);
                let offset = 0;

                // Read coordinates as 16-bit integers
                const x1 = view.getUint16(offset, true); offset += 2;
                const y1 = view.getUint16(offset, true); offset += 2;
                const x2 = view.getUint16(offset, true); offset += 2;
                const y2 = view.getUint16(offset, true); offset += 2;
                
                // Read line width
                const lWidth = view.getUint8(offset); offset += 1;
                
                // Read color
                const colorLength = view.getUint8(offset); offset += 1;
                let color = '';
                for (let i = 0; i < colorLength; i++) {
                    color += String.fromCharCode(view.getUint8(offset + i));
                }
                offset += colorLength;
                
                // Read tool
                const toolLength = view.getUint8(offset); offset += 1;
                let tool = '';
                for (let i = 0; i < toolLength; i++) {
                    tool += String.fromCharCode(view.getUint8(offset + i));
                }
                offset += toolLength;
                
                // Read shape
                const shapeLength = view.getUint8(offset); offset += 1;
                let shape = '';
                if (shapeLength > 0) {
                    for (let i = 0; i < shapeLength; i++) {
                        shape += String.fromCharCode(view.getUint8(offset + i));
                    }
                }

                // Draw received data
                if (tool === 'shape' && shape) {
                    currentShape = shape;
                    draw(x1, y1, x2, y2, lWidth, color, tool);
                    currentShape = null;
                } else {
                    draw(x1, y1, x2, y2, lWidth, color, tool);
                }
                
                // Save state after receiving data
                saveState();
            }).catch(err => console.error('Failed to process binary data:', err));
        }
    };
}
