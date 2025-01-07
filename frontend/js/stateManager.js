export class StateManager {
  constructor({ initialState = {} }) {
    this.state = initialState;
    this.listeners = [];
    console.log("initial state:", this.state);
  }

  getState() {
    console.log(this.state);
    return this.state;
  }

  setState(updater) {
    const prevState = {...this.state};
    this.state = {...this.state, ...updater(this.state) };
    this.listeners.forEach((listener) => listener(this.state, prevState));
  }

  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }
}

export const appState = new StateManager({initialState: {
    isDrawing: false,
    currentTool: 'brush',
    currentColor: '#1e293b',
    lineWidth: 5,
    canvasDimensions: { width: window.innerWidth, height: window.innerHeight },
    startX: 0,
    startY: 0,
    prevX: 0,
    prevY: 0,
    drawingStates: [],
    currentStateIndex: -1,
  }
});