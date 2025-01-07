import { canvas, ctx } from './script.js';
import { appState } from './stateManager.js';

function saveState() {
  const state = canvas.toDataURL();
  const { drawingStates, currentStateIndex } = appState.getState();
  
  const updatedDrawingStates = drawingStates.slice(0, currentStateIndex + 1);
  
  updatedDrawingStates.push(state);
  
  appState.setState(()=> ({
    drawingStates: updatedDrawingStates,
    currentStateIndex: updatedDrawingStates.length - 1,
  }));

  updateHistoryButtons();
}

function updateHistoryButtons() {
  const { currentStateIndex, drawingStates } = appState.getState();
  document.getElementById('undoButton').disabled = currentStateIndex < 1;
  document.getElementById('redoButton').disabled = currentStateIndex >= drawingStates.length - 1;
}

function loadState(state) {
  const img = new Image();
  img.src = state;
  img.onload = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);
  };
}

export { saveState, updateHistoryButtons, loadState };
