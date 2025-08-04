# LuxSpy

A comprehensive monitoring system for AutoDarts match pages that combines a Chrome extension for real-time DOM event monitoring and a Go server for LED strip control based on game states.

## Overview

LuxSpy is designed to monitor and analyze DOM events on AutoDarts pages (`https://play.autodarts.io/*`) and provide real-time visual feedback through LED strip control. The system consists of two main components:

- **Chrome Extension** (`luxspy-extension/`): Monitors DOM changes in real-time and detects player states
- **Go Server** (`luxspy-server/`): Processes events and controls RGB LED strips via TCP protocol

## Features

### 🎯 **Real-time Game State Monitoring**
- Monitors AutoDarts pages automatically (match pages and general site)
- Detects player names, game states, and navigation status
- Identifies which player is currently active (Player 1 or Player 2)
- Always tracks logged-in player from any AutoDarts page

### 🎨 **Smart LED Control**
- **Focused Player Ready** → 🟢 Green LED (logged-in player or first player in watch mode)
- **Unfocused Player Ready** → 🟣 Purple LED (other player or second player in watch mode)
- **Takeout Required** → 🟡 Yellow LED
- **Idle State** → ⚫ LED Off
- **Error State** → 🔴 Red LED

### 🎯 **Smart Focus Control**
- **If logged-in player is in the match**: They get green color, other player gets purple
- **If logged-in player is not in the match (watch mode)**: First player gets green, second player gets purple
- **Consistent colors throughout the match**, even when players switch sides

### 🔧 **Smart Integration**
- Automatic event detection and LED control
- Real-time popup status updates
- Manual LED control via API
- Health monitoring and debugging tools
- Background script handles HTTP requests to avoid mixed content issues

## Project Structure

```
autodarts-luxspy/
├── luxspy-extension/    # Chrome extension
│   ├── manifest.json    # Extension configuration
│   ├── src/
│   │   ├── background/  # Background script
│   │   ├── content/     # Content script and styles
│   │   ├── popup/       # Popup interface
│   │   └── config.js    # Configuration file
│   ├── images/          # Extension icons
│   └── assets/          # Static assets
├── luxspy-server/       # Go server
│   ├── main.go          # Server implementation
│   ├── go.mod           # Go module definition
│   └── README.md        # Server documentation
└── README.md           # This file
```

## Chrome Extension (`luxspy-extension/`)

### Features

- **Real-time Monitoring**: Continuously monitors DOM changes on AutoDarts match pages
- **Player Detection**: Identifies current player and their position (Player 1/2)
- **Event Detection**: Tracks player names, game states, and navigation status
- **Server Communication**: Sends events to Go server for LED control
- **Live Popup Updates**: Real-time status display with visual feedback
- **Smart Targeting**: Only activates on AutoDarts match pages

### Monitored Elements

The extension monitors these DOM elements:

1. **Current Player**: `.ad-ext-player-active *> .ad-ext-player-name` (match pages only)
2. **Player Number**: Determined by position in player list (match pages only)
3. **Game State**: 
   - `div.css-aiihgx` → "ready" (match pages only)
   - `div.css-3nk254` → "takeout" (match pages only)
   - Neither present → "idle"
4. **Logged-in Player**: `.navigation *> img` alt text (all AutoDarts pages)
5. **Focus Control**: Automatic focus based on logged-in player presence in match

### Installation

1. Clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the `luxspy-extension` folder
5. The extension will appear in your extensions list

### Usage

1. Navigate to any AutoDarts page: `https://play.autodarts.io/*`
2. The extension will automatically start monitoring
3. **On Match Pages**: Watch the LED strip change colors based on game state:
   - **Green**: Focused player is ready to throw
   - **Purple**: Unfocused player is ready to throw
   - **Yellow**: Someone needs to take out
   - **Off**: Waiting for next turn
4. **On Other Pages**: The extension tracks the logged-in player but doesn't control LEDs
5. Click the extension icon to view current status and server configuration

## Go Server (`luxspy-server/`)

### Features

- **HTTP Web Server**: Listens for events from Chrome extension
- **LED Strip Control**: Controls RGB LED strips via TCP protocol
- **Player-Specific Colors**: Maps game states and players to LED colors
- **Health Monitoring**: Health check endpoint for monitoring
- **Manual Control**: API endpoints for manual LED control

### LED Color Mapping

| Game State | Focus Status | LED Color | Description |
|------------|--------------|-----------|-------------|
| `ready`    | Focused      | Green     | Focused player is ready to throw |
| `ready`    | Unfocused    | Purple    | Unfocused player is ready to throw |
| `takeout`  | Any          | Yellow    | Player needs to take out |
| `idle`     | Any          | Off       | No active game state |
| `error`    | Any          | Red       | Any errors or unknown states |

### Installation

1. Ensure you have Go 1.23+ installed
2. Navigate to the server directory:
   ```bash
   cd luxspy-server
   ```
3. Run the server:
   ```bash
   go run main.go
   ```

### Configuration

The server can be configured using environment variables:

- `LED_IP`: IP address of the LED strip (default: `192.168.0.59`)
- `PORT`: Server port (default: `3181`)

Example:
```bash
export LED_IP=192.168.1.100
export PORT=9000
go run main.go
```

### API Endpoints

- `POST /api/event` - Receives events from Chrome extension
- `GET /health` - Health check endpoint
- `POST /api/led` - Manual LED control

## Event Flow

```
AutoDarts Page → Chrome Extension → Go Server → LED Strip
     ↓                ↓                ↓           ↓
  DOM Changes → Event Detection → Processing → Color Control
```

## Quick Start

### 1. Start the Go Server
```bash
cd luxspy-server
go run main.go
```

### 2. Load Chrome Extension
- Open `chrome://extensions/`
- Enable Developer mode
- Load unpacked: `luxspy-extension/`

### 3. Test the System
- Navigate to any AutoDarts page
- On match pages: Watch the LED strip change colors based on game state
- On other pages: Check that logged-in player is detected
- Check server logs for event processing

## Development Setup

### Prerequisites

- **Chrome Browser**: For extension development and testing
- **Go 1.23+**: For server development
- **RGB LED Strip**: Compatible with TCP protocol (port 5577)
- **Git**: For version control

### Local Development

1. **Extension Development**:
   ```bash
   cd luxspy-extension
   # Make changes to extension files
   # Reload extension in chrome://extensions/
   ```

2. **Server Development**:
   ```bash
   cd luxspy-server
   go run main.go
   ```

### Testing

Test the server using curl:

```bash
# Test health endpoint
curl http://localhost:3181/health

# Test manual LED control
curl -X POST http://localhost:3181/api/led \
  -H "Content-Type: application/json" \
  -d '{"action": "purple"}'

# Test event endpoint
curl -X POST http://localhost:3181/api/event \
  -H "Content-Type: application/json" \
  -d '{
    "action": "luxspyEvent",
    "data": {
      "timestamp": "2024-01-01T12:00:00Z",
      "playerName": "TestPlayer",
      "playerNumber": 1,
      "gameState": "ready",
      "playerInNavigation": true,
      "url": "https://play.autodarts.io/matches/test"
    }
  }'
```

## Configuration

### Extension Configuration

The extension is configured via `luxspy-extension/src/config.js`:

- **Server URL**: `http://localhost:3181` (configurable)
- **Target URLs**: `https://play.autodarts.io/matches/*`
- **Permissions**: `storage`, `tabs`, `http://localhost:3181/*`

### Server Configuration

Server configuration via environment variables:

- `LED_IP`: IP address of the LED strip
- `PORT`: Server port

## Monitoring and Debugging

### Extension Debugging

- **Console Logs**: All events are logged to browser console
- **Popup Status**: Real-time status display in extension popup
- **Developer Tools**: Use Chrome DevTools for debugging

### Server Monitoring

- **Logs**: Structured logging for all events and actions
- **Health Checks**: Endpoint monitoring at `/health`
- **LED Control**: Manual control via `/api/led`

## Troubleshooting

### Common Issues

1. **CORS Errors**: Ensure the Go server is running and CORS is properly configured
2. **LED Connection**: Verify LED strip IP address and network connectivity
3. **Extension Not Working**: Check if the page is an AutoDarts match page
4. **Server Won't Start**: Check if port is already in use
5. **Mixed Content Errors**: The extension uses background scripts to handle HTTP requests, avoiding mixed content issues on HTTPS pages

### LED Protocol

The server communicates with LED strips using TCP protocol:

| Command | Bytes (before checksum) | Description |
|---------|------------------------|-------------|
| Turn on | `0x71 0x23 0x0f` | Turn on LED strip |
| Turn off | `0x71 0x24 0x0f` | Turn off LED strip |
| Set RGB | `0x31 R G B 0x00 0x0f 0x0f` | Set RGB color |
| Query | `0x81 0x8a 0x8b` | Query status |

## Future Enhancements

### Extension Features

- [ ] Configuration options for monitoring preferences
- [ ] Event filtering and aggregation
- [ ] Visual indicators on the match page
- [ ] Export functionality for event data

### Server Features

- [ ] WebSocket support for real-time communication
- [ ] Database integration for event storage
- [ ] Web dashboard for monitoring
- [ ] API authentication and rate limiting
- [ ] Integration with external services

### Integration Features

- [ ] Event replay and analysis tools
- [ ] Automated action triggers
- [ ] Notification system
- [ ] Multiple LED strip support

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

[Add your license information here]

## Support

For issues and questions:

1. Check the existing issues
2. Create a new issue with detailed information
3. Include browser version, extension version, and steps to reproduce

---

**Note**: This project is actively maintained and fully functional for AutoDarts match monitoring and LED control. 