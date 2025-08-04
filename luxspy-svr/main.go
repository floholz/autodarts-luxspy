package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net"
	"net/http"
	"os"
	"time"
)

// EventData represents the structure of events from the Chrome extension
type EventData struct {
	Timestamp          string `json:"timestamp"`
	PlayerName         string `json:"playerName"`
	PlayerNumber       *int   `json:"playerNumber"`
	GameState          string `json:"gameState"`
	PlayerInNavigation bool   `json:"playerInNavigation"`
	LoggedInPlayerName string `json:"loggedInPlayerName"`
	ShouldFocus        bool   `json:"shouldFocus"`
	URL                string `json:"url"`
}

// LuxSpyEvent represents the complete event structure from the extension
type LuxSpyEvent struct {
	Action string    `json:"action"`
	Data   EventData `json:"data"`
}

// LEDController handles communication with the LED strip
type LEDController struct {
	IP string
}

// LED colors based on game state
var (
	ColorRed    = []byte{0xFF, 0x00, 0x00} // Red for errors
	ColorGreen  = []byte{0x00, 0xFF, 0x00} // Green for player 1 ready
	ColorPurple = []byte{0xFF, 0x00, 0xFF} // Purple/Pink for player 2 ready
	ColorYellow = []byte{0xFF, 0xC8, 0x00} // Yellow for takeout
	ColorOff    = []byte{0x00, 0x00, 0x00} // Off/black
	ColorWhite  = []byte{0xFF, 0xFF, 0xFF} // White for unknown/error states
)

// NewLEDController creates a new LED controller instance
func NewLEDController(ip string) *LEDController {
	return &LEDController{IP: ip}
}

// sendCommand sends a command to the LED strip with automatic checksum calculation
func (lc *LEDController) sendCommand(payload []byte) error {
	conn, err := net.DialTimeout("tcp", lc.IP+":5577", 2*time.Second)
	if err != nil {
		return fmt.Errorf("failed to connect to LED strip: %w", err)
	}
	defer conn.Close()

	// Add checksum
	command := lc.addChecksum(payload)

	_, err = conn.Write(command)
	if err != nil {
		return fmt.Errorf("failed to send command: %w", err)
	}

	return nil
}

// addChecksum calculates and appends the checksum to the command
func (lc *LEDController) addChecksum(cmd []byte) []byte {
	sum := byte(0)
	for _, b := range cmd {
		sum += b
	}
	return append(cmd, sum)
}

// SetRGBColor sets the LED strip to a specific RGB color
func (lc *LEDController) SetRGBColor(r, g, b byte) error {
	// Format: 0x31 R G B 0x00 0x0f 0x0f
	command := []byte{0x31, r, g, b, 0x00, 0x0f, 0x0f}
	return lc.sendCommand(command)
}

// TurnOn turns on the LED strip
func (lc *LEDController) TurnOn() error {
	command := []byte{0x71, 0x23, 0x0f}
	return lc.sendCommand(command)
}

// TurnOff turns off the LED strip
func (lc *LEDController) TurnOff() error {
	command := []byte{0x71, 0x24, 0x0f}
	return lc.sendCommand(command)
}

// SetColorByState sets the LED color based on game state, player number, and focus status
func (lc *LEDController) SetColorByState(gameState string, playerNumber *int, shouldFocus bool) error {
	var color []byte

	switch gameState {
	case "ready":
		if shouldFocus {
			color = ColorGreen
			log.Printf("Setting LED to GREEN (focused player ready)")
		} else {
			color = ColorPurple
			log.Printf("Setting LED to PURPLE (unfocused player ready)")
		}
	case "takeout":
		color = ColorYellow
		log.Printf("Setting LED to YELLOW (takeout state)")
	case "idle":
		color = ColorOff
		log.Printf("Setting LED to OFF (idle state)")
	case "error":
		color = ColorRed
		log.Printf("Setting LED to RED (error state)")
	default:
		color = ColorWhite
		log.Printf("Setting LED to WHITE (unknown/error state: %s)", gameState)
	}

	return lc.SetRGBColor(color[0], color[1], color[2])
}

// Server represents the web server
type Server struct {
	ledController *LEDController
	port          string
}

// NewServer creates a new server instance
func NewServer(ledIP, port string) *Server {
	return &Server{
		ledController: NewLEDController(ledIP),
		port:          port,
	}
}

// handleLuxSpyEvent handles incoming events from the Chrome extension
func (s *Server) handleLuxSpyEvent(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Parse the incoming event
	var event LuxSpyEvent
	if err := json.NewDecoder(r.Body).Decode(&event); err != nil {
		log.Printf("Error decoding event: %v", err)
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}

	// Log the received event
	log.Printf("Received LuxSpy event: %+v", event.Data)

	// Set LED color based on game state, player number, and focus status
	// Always control LED - focused players get green, unfocused players get purple
	if err := s.ledController.SetColorByState(event.Data.GameState, event.Data.PlayerNumber, event.Data.ShouldFocus); err != nil {
		log.Printf("Error setting LED color: %v", err)
		http.Error(w, "Failed to control LED", http.StatusInternalServerError)
		return
	}

	// Send success response
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{
		"status":  "success",
		"message": fmt.Sprintf("LED set to %s state", event.Data.GameState),
	})
}

// handleHealthCheck provides a health check endpoint
func (s *Server) handleHealthCheck(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{
		"status":  "healthy",
		"service": "luxspy-server",
		"led_ip":  s.ledController.IP,
	})
}

// handleLEDControl provides manual LED control endpoints
func (s *Server) handleLEDControl(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var request struct {
		Action string `json:"action"`
		Color  string `json:"color,omitempty"`
	}

	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}

	var err error
	switch request.Action {
	case "on":
		err = s.ledController.TurnOn()
	case "off":
		err = s.ledController.TurnOff()
	case "red":
		err = s.ledController.SetRGBColor(ColorRed[0], ColorRed[1], ColorRed[2])
	case "green":
		err = s.ledController.SetRGBColor(ColorGreen[0], ColorGreen[1], ColorGreen[2])
	case "purple":
		err = s.ledController.SetRGBColor(ColorPurple[0], ColorPurple[1], ColorPurple[2])
	case "yellow":
		err = s.ledController.SetRGBColor(ColorYellow[0], ColorYellow[1], ColorYellow[2])
	default:
		http.Error(w, "Invalid action", http.StatusBadRequest)
		return
	}

	if err != nil {
		log.Printf("Error controlling LED: %v", err)
		http.Error(w, "Failed to control LED", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{
		"status": "success",
		"action": request.Action,
	})
}

// handleTestState provides a test endpoint to set the board to a specific state
func (s *Server) handleTestState(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var request struct {
		GameState    string `json:"gameState"`
		PlayerNumber *int   `json:"playerNumber,omitempty"`
		ShouldFocus  bool   `json:"shouldFocus"`
	}

	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}

	// Validate game state
	validStates := map[string]bool{
		"ready":   true,
		"takeout": true,
		"idle":    true,
		"error":   true,
	}
	if !validStates[request.GameState] {
		http.Error(w, "Invalid game state. Must be one of: ready, takeout, idle, error", http.StatusBadRequest)
		return
	}

	// Set LED color based on test state
	if err := s.ledController.SetColorByState(request.GameState, request.PlayerNumber, request.ShouldFocus); err != nil {
		log.Printf("Error setting test state: %v", err)
		http.Error(w, "Failed to set test state", http.StatusInternalServerError)
		return
	}

	log.Printf("Test state set: gameState=%s, playerNumber=%v, shouldFocus=%t",
		request.GameState, request.PlayerNumber, request.ShouldFocus)

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"status":       "success",
		"gameState":    request.GameState,
		"playerNumber": request.PlayerNumber,
		"shouldFocus":  request.ShouldFocus,
		"message":      fmt.Sprintf("Board set to %s state", request.GameState),
	})
}

// corsMiddleware adds CORS headers to all responses
func corsMiddleware(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// Set CORS headers
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

		// Handle preflight requests
		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		// Call the next handler
		next(w, r)
	}
}

// Start starts the web server
func (s *Server) Start() error {
	// Set up routes with CORS middleware
	http.HandleFunc("/api/event", corsMiddleware(s.handleLuxSpyEvent))
	http.HandleFunc("/health", corsMiddleware(s.handleHealthCheck))
	http.HandleFunc("/api/led", corsMiddleware(s.handleLEDControl))
	http.HandleFunc("/api/test-state", corsMiddleware(s.handleTestState))

	// Catch-all route for 404s
	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		// Set CORS headers for 404 responses too
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		http.NotFound(w, r)
	})

	log.Printf("Starting LuxSpy server on port %s", s.port)
	log.Printf("LED strip IP: %s", s.ledController.IP)
	log.Printf("Available endpoints:")
	log.Printf("  POST /api/event     - Receive events from Chrome extension")
	log.Printf("  GET  /health        - Health check")
	log.Printf("  POST /api/led       - Manual LED control")
	log.Printf("  POST /api/test-state - Test board state")

	return http.ListenAndServe(":"+s.port, nil)
}

func main() {
	// Get configuration from environment variables or use defaults
	ledIP := getEnv("LED_IP", "192.168.0.59")
	port := getEnv("PORT", "3181")

	// Create and start server
	server := NewServer(ledIP, port)

	log.Printf("LuxSpy Server starting...")
	log.Printf("LED IP: %s", ledIP)
	log.Printf("Port: %s", port)

	if err := server.Start(); err != nil {
		log.Fatalf("Server failed to start: %v", err)
	}
}

// getEnv gets an environment variable or returns a default value
func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
