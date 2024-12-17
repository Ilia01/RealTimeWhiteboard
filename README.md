# Real-Time Collaborative Whiteboard

A real-time collaborative whiteboard application built with Go backend and vanilla JavaScript frontend, using WebSocket for live collaboration.

## Features

- Real-time drawing collaboration
- Multiple drawing tools (pen, eraser, shapes)
- Room-based collaboration
- Dark theme UI
- Responsive design
- Undo/Redo functionality

## Tech Stack

### Backend
- Go
- Gorilla WebSocket
- Binary protocol for efficient data transfer

### Frontend
- Vanilla JavaScript
- HTML5 Canvas
- WebSocket API
- Modern CSS with dark theme

## Getting Started

### Prerequisites
- Go 1.16 or higher
- Web browser with WebSocket support

### Running the Backend
```bash
cd backend
go mod download
go run main.go
```

### Running the Frontend
```bash
cd frontend
# Simply open index.html in a web browser
# or serve using a local server
```

## Project Structure

```
.
├── backend/
│   ├── main.go          # Main server file
│   └── go.mod           # Go module file
└── frontend/
    ├── index.html       # Main HTML file
    ├── script.js        # JavaScript logic
    └── styles.css       # Styling
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details
