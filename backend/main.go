package main

import (
	"bytes"
	"encoding/binary"
	"log"
	"net/http"

	"github.com/gorilla/websocket"
)
var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true // development only
	},
}

var rooms = make(map[string]*Room)

type Room struct {
	Owner *websocket.Conn
	Clients map[*websocket.Conn]bool
	Broadcast chan []byte
}


func main() {
	http.HandleFunc("/ws/", handleConnections)

	log.Println("Server started on :8080")
	err := http.ListenAndServe(":8080", nil)
	if err != nil {
		log.Fatalf("Server failed: %v", err)
	}
}

func handleConnections(w http.ResponseWriter, r *http.Request) {
	roomID := r.URL.Path[len("/ws/"):]

	if roomID == "" {
		log.Fatalf("Room ID required", http.StatusBadRequest)
		return
	}

	if _, exists := rooms[roomID]; !exists {
		rooms[roomID] = &Room{
			Clients: make(map[*websocket.Conn]bool),
			Broadcast: make(chan []byte),
		}
		go handleMessages(rooms[roomID])
	}

	room := rooms[roomID]
	// upgrade http to websocket
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("Websocket upgrade failed: %v", err)
		return
	}
	defer conn.Close()

	if len(room.Clients) == 0{
		room.Owner = conn
		log.Printf("user %v is the owner of room %s", conn.RemoteAddr(), roomID)
	}else{
		log.Printf("user %v joined room %s as a participant", conn.RemoteAddr(), roomID)
	}

	// Register a client
	room.Clients[conn] = true

	// Listen for messages from this client
	for {
		_, message, err := conn.ReadMessage()
		if err != nil {
			if websocket.IsCloseError(err, websocket.CloseGoingAway, websocket.CloseNormalClosure) {
				log.Printf("Client disconnected: %v", err)
			}else{
				log.Printf("Error reading message: %v", err)
			}
			delete(room.Clients, conn)
			break
		}

		// Decode the binary message
		x1, y1, x2, y2, lineWidth, color, err := decodeBinaryMessage(message)
		if err != nil {
			log.Printf("Error decoding binary message: %v", err)
			continue
		}

		// Create the binary message to send to others
		encodedMessage, err := createBinaryMessage(x1, y1, x2, y2, lineWidth, color)
		if err != nil {
			log.Printf("Error creating binary message: %v", err)
			continue
		}

		// Send message to broadcast channel
		if conn == room.Owner{
			room.Broadcast <- encodedMessage
		}
	}
}

func handleMessages(room *Room) {
	for {
		// Grab the next message from the broadcast channel
		msg := <- room.Broadcast

		// Send it to connected clients
		for client := range room.Clients {
			err := client.WriteMessage(websocket.BinaryMessage, msg)
			if err != nil {
				log.Printf("Error broadcasting message: %v", err)
				client.Close()
				delete(room.Clients, client)
			}
		}
	}
}

func decodeBinaryMessage(message []byte) (float32, float32, float32, float32, float32, string, error) {
	// if len(message) < 21 {
	// 	return 0, 0, 0, 0, 0, "", log.Output(2, "Invalid message length")
	// }

	// Decode the float32 values
	x1 := bytesToFloat32(message[0:4])
	y1 := bytesToFloat32(message[4:8])
	x2 := bytesToFloat32(message[8:12])
	y2 := bytesToFloat32(message[12:16])
	lineWidth := bytesToFloat32(message[16:20])

	// Decode the color
	colorLength := message[20]
	color := string(message[21 : 21+colorLength])

	return x1, y1, x2, y2, lineWidth, color, nil
}

func createBinaryMessage(x1, y1, x2, y2, lineWidth float32, color string) ([]byte, error) {
	// convert color to bytes
	colorBytes := []byte(color)
	colorLength := byte(len(colorBytes))

	// create a byte slice
	buffer := make([]byte, 4*4+4+1+colorLength)

	// Write the float32 values into the buffer
	copy(buffer[0:4], float32ToBytes(x1))
	copy(buffer[4:8], float32ToBytes(y1))
	copy(buffer[8:12], float32ToBytes(x2))
	copy(buffer[12:16], float32ToBytes(y2))
	copy(buffer[16:20], float32ToBytes(lineWidth))

	// Set the color length byte
	buffer[20] = colorLength

	// Set the color bytes
	copy(buffer[21:], colorBytes)

	return buffer, nil
}

func float32ToBytes(f float32) []byte {
	buf := new(bytes.Buffer)
	err := binary.Write(buf, binary.LittleEndian, f)
	if err != nil {
		log.Fatalf("binary.Write failed: %v", err)
	}
	return buf.Bytes()
}

func bytesToFloat32(b []byte) float32 {
	buf := bytes.NewReader(b)
	var f float32
	err := binary.Read(buf, binary.LittleEndian, &f)
	if err != nil {
		log.Fatalf("binary.Read failed: %v", err)
	}
	return f
}

