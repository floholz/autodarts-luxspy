# LuxSpy Go Server

A Go web server that receives events from the LuxSpy Chrome extension and controls an LED strip based on AutoDarts game states.

## Features

- **Web Server**: HTTP server that listens for events from the Chrome extension
- **LED Control**: Controls RGB LED strips via TCP protocol
- **Game State Mapping**: Maps AutoDarts game states to LED colors
- **Health Monitoring**: Health check endpoint for monitoring
- **Manual Control**: API endpoints for manual LED control

## LED Color Mapping

| Game State | Focus Status | LED Color | Description |
|------------|--------------|-----------|-------------|
| `ready`    | Focused      | Green     | Focused player is ready to throw |
| `ready`    | Unfocused    | Purple    | Unfocused player is ready to throw |
| `takeout`  | Any          | Yellow    | Player needs to take out |
| `idle`     | Any          | Off       | No active game state |
| `error`    | Any          | Red       | Any errors or unknown states |

**Focus Logic:**
- If the logged-in player is in the match: they get green, other player gets purple
- If the logged-in player is not in the match (watch mode): first player gets green, second player gets purple

## Installation

1. Ensure you have Go 1.23+ installed
2. Navigate to the server directory:
   ```bash
   cd luxspy-svr
   ```
3. Run the server:
   ```bash
   go run main.go
   ```

## Configuration

The server can be configured using environment variables:

- `LED_IP`: IP address of the LED strip (default: `192.168.0.59`)
- `PORT`: Server port (default: `8080`)

Example:
```bash
export LED_IP=192.168.1.100
export PORT=9000
go run main.go
```

## API Endpoints

### POST `/api/event`
Receives events from the Chrome extension and controls the LED strip.

**Request Body:**
```json
{
  "action": "luxspyEvent",
  "data": {
    "timestamp": "2024-01-01T12:00:00Z",
    "playerName": "Player1",
    "gameState": "ready",
    "playerInNavigation": true,
    "url": "https://play.autodarts.io/matches/123"
  }
}
```

**Response:**
```json
{
  "status": "success",
  "message": "LED set to ready state"
}
```

### GET `/health`
Health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "service": "luxspy-server",
  "led_ip": "192.168.0.59"
}
```

### POST `/api/led`
Manual LED control endpoint.

**Request Body:**
```json
{
  "action": "on|off|red|green|purple|yellow"
}
```

**Response:**
```json
{
  "status": "success",
  "action": "on"
}
```

## LED Protocol

The server communicates with LED strips using the following protocol:

| Command | Bytes (before checksum) | Description |
|---------|------------------------|-------------|
| Turn on | `0x71 0x23 0x0f` | Turn on LED strip |
| Turn off | `0x71 0x24 0x0f` | Turn off LED strip |
| Set RGB | `0x31 R G B 0x00 0x0f 0x0f` | Set RGB color |
| Set white | `0x31 0x00 0x00 0x00 W 0x0f 0x0f` | Set white only |
| Query | `0x81 0x8a 0x8b` | Query status |

The checksum is calculated as the sum of all previous bytes, modulo 256.

## Testing

You can test the server using curl:

```bash
# Test health endpoint
curl http://localhost:8080/health

# Test manual LED control
curl -X POST http://localhost:8080/api/led \
  -H "Content-Type: application/json" \
  -d '{"action": "purple"}'

# Test event endpoint
curl -X POST http://localhost:8080/api/event \
  -H "Content-Type: application/json" \
  -d '{
    "action": "luxspyEvent",
    "data": {
      "timestamp": "2024-01-01T12:00:00Z",
      "playerName": "TestPlayer",
      "gameState": "ready",
      "playerInNavigation": true,
      "url": "https://play.autodarts.io/matches/test"
    }
  }'
```

## Integration with Chrome Extension

The Chrome extension automatically sends events to the server when:

1. The extension is loaded on an AutoDarts match page
2. DOM changes are detected that affect the monitored elements
3. The server is running and accessible at the configured URL

## Troubleshooting

### Common Issues

1. **Connection refused**: Ensure the LED strip is powered on and accessible at the configured IP
2. **Server won't start**: Check if the port is already in use
3. **Events not received**: Verify the Chrome extension is configured with the correct server URL

### Logs

The server provides detailed logging for:
- Server startup and configuration
- Received events
- LED control commands
- Error conditions

## Development

### Project Structure

```
luxspy-svr/
├── main.go      # Main server implementation
├── go.mod       # Go module definition
└── README.md    # This file
```

### Building

```bash
go build -o luxspy-server main.go
./luxspy-server
```

### Dependencies

The server uses only Go standard library packages:
- `encoding/json`: JSON handling
- `fmt`: String formatting
- `log`: Logging
- `net`: TCP communication
- `net/http`: HTTP server
- `os`: Environment variables
- `time`: Time handling 