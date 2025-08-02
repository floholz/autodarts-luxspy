# LuxSpy (_wip_)

A comprehensive monitoring system for AutoDarts match pages that combines a Chrome extension for real-time DOM event monitoring and a Go server for event processing and analysis.

## Overview

LuxSpy is designed to monitor and analyze DOM events on AutoDarts match pages (`https://play.autodarts.io/matches/:match_uuid`) and perform actions based on these events. The system consists of two main components:

- **Chrome Extension** (`luxspy-ext/`): Monitors DOM changes in real-time
- **Go Server** (`luxspy-svr/`): Processes events and performs actions

## Project Structure

```
autodarts-luxspy/
├── luxspy-ext/          # Chrome extension
│   ├── manifest.json    # Extension configuration
│   ├── src/
│   │   ├── background/  # Background script
│   │   ├── content/     # Content script and styles
│   │   └── popup/       # Popup interface
│   ├── images/          # Extension icons
│   └── assets/          # Static assets
├── luxspy-svr/          # Go server (future implementation)
└── README.md           # This file
```

## Chrome Extension (`luxspy-ext/`)

### Features

- **Real-time Monitoring**: Continuously monitors DOM changes on AutoDarts match pages
- **Event Detection**: Tracks player names, game states, and navigation status
- **Console Logging**: Logs all detected events to the browser console
- **Live Popup Updates**: Real-time status display with visual feedback
- **Smart Targeting**: Only activates on AutoDarts match pages

### Monitored Elements

The extension monitors these DOM elements:

1. **Current Player**: `.ad-ext-player-active *> .ad-ext-player-name`
2. **Game State**: 
   - `div.css-aiihgx` → "ready"
   - `div.css-3nk254` → "takeout" 
   - Neither present → "idle"
3. **Navigation Status**: Checks if current player matches `.navigation *> img` alt text

### Installation

1. Clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the `luxspy-ext` folder
5. The extension will appear in your extensions list

### Usage

1. Navigate to an AutoDarts match page: `https://play.autodarts.io/matches/[match-uuid]`
2. The extension will automatically start monitoring
3. Open the browser console to see logged events
4. Click the extension icon to view current status and real-time updates

### Development

The extension is built using Manifest V3 and includes:

- **Content Script**: Monitors DOM changes and logs events
- **Background Script**: Handles extension lifecycle and message routing
- **Popup**: Shows current monitoring status with live updates
- **Manifest**: Configuration and permissions

## Go Server (`luxspy-svr/`)

*Note: The Go server component is planned for future implementation.*

### Planned Features

- **Event Processing**: Receive and process events from the Chrome extension
- **Action Execution**: Perform actions based on detected events
- **Data Storage**: Store event history and analytics
- **API Endpoints**: Provide REST API for event management
- **Web Interface**: Dashboard for monitoring and configuration

### Architecture

The server will be designed to:

1. **Receive Events**: Accept events from the Chrome extension via HTTP/WebSocket
2. **Process Logic**: Apply business rules and trigger actions
3. **Store Data**: Persist events and analytics
4. **Provide APIs**: RESTful endpoints for external integration

## Event Flow

```
AutoDarts Page → Chrome Extension → Go Server → Actions
     ↓                ↓                ↓         ↓
  DOM Changes → Event Detection → Processing → Execution
```

## Development Setup

### Prerequisites

- **Chrome Browser**: For extension development and testing
- **Go** (future): For server development
- **Git**: For version control

### Local Development

1. **Extension Development**:
   ```bash
   cd luxspy-ext
   # Make changes to extension files
   # Reload extension in chrome://extensions/
   ```

2. **Server Development** (future):
   ```bash
   cd luxspy-svr
   go mod init luxspy-svr
   go run main.go
   ```

## Configuration

### Extension Configuration

The extension is configured via `luxspy-ext/manifest.json`:

- **Target URLs**: `https://play.autodarts.io/matches/*`
- **Permissions**: `storage`, `tabs`
- **Content Scripts**: Automatically injected on match pages

### Server Configuration (future)

Server configuration will be handled via environment variables and config files.

## Monitoring and Debugging

### Extension Debugging

- **Console Logs**: All events are logged to browser console
- **Popup Status**: Real-time status display in extension popup
- **Developer Tools**: Use Chrome DevTools for debugging

### Server Monitoring (future)

- **Logs**: Structured logging for all events and actions
- **Metrics**: Performance and usage analytics
- **Health Checks**: Endpoint monitoring and alerting

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

- [ ] Direct communication between extension and server
- [ ] Event replay and analysis tools
- [ ] Automated action triggers
- [ ] Notification system

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

**Note**: This project is in active development. The Go server component is planned for future implementation. 