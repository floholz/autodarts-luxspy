# LuxSpy Chrome Extension

A Chrome extension that monitors and analyzes DOM events on AutoDarts match pages (`https://play.autodarts.io/matches/:match_uuid`).

## Features

- **Real-time Monitoring**: Continuously monitors DOM changes on AutoDarts match pages
- **Event Detection**: Tracks player names, game states, and navigation status
- **Smart Focus Logic**: Automatically determines LED colors based on logged-in player presence
- **Server Communication**: Sends events to Go server for LED control
- **Status Popup**: Shows current monitoring status and server configuration
- **Console Logging**: Logs all detected events to the browser console
- **State Testing**: Built-in UI controls for testing board states
- **Settings Management**: Configurable server URL and connection settings

## Monitored Elements

The extension monitors these DOM elements:

1. **Current Player**: `.ad-ext-player-active *> .ad-ext-player-name`
2. **Game State**: 
   - `div.css-aiihgx` → "ready"
   - `div.css-3nk254` → "takeout" 
   - Neither present → "idle"
3. **Navigation Status**: Checks if current player matches `.navigation *> img` alt text

## Installation

1. Clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the `luxspy-extension` folder
5. The extension will appear in your extensions list

## Usage

1. Navigate to any AutoDarts page: `https://play.autodarts.io/*`
2. The extension will automatically start monitoring
3. **On Match Pages**: Watch the LED strip change colors based on game state:
   - **Green**: Focused player is ready to throw
   - **Purple**: Unfocused player is ready to throw
   - **Yellow**: Someone needs to take out
   - **Off**: Waiting for next turn
4. **On Other Pages**: The extension tracks the logged-in player but doesn't control LEDs
5. Click the extension icon to view current status and configure server settings

## Development

The extension is built using Manifest V3 and includes:

- **Content Script**: Monitors DOM changes and logs events
- **Background Script**: Handles extension lifecycle
- **Popup**: Shows current monitoring status
- **Manifest**: Configuration and permissions

## 🚀 **CI/CD & Publishing**

### Automated Publishing

This extension is automatically built and published via GitHub Actions:

- **Workflow**: `.github/workflows/extension-build.yml`
- **Trigger**: Changes to `luxspy-extension/**` files on main branch
- **Actions**:
  - Reads version from `manifest.json`
  - Builds extension package (ZIP file)
  - Publishes to Chrome Web Store
  - Creates GitHub release with download
- **Extension ID**: `hbhedlfdnkhgdhgbgggdoklgkkanjilk`

### Version Management

- **Manual**: Version is managed in `manifest.json` (single source of truth)
- **Publishing**: Automatically publishes when version is updated and pushed to main
- **Downloads**: Available via GitHub releases for manual installation

### Installation Options

1. **Chrome Web Store** (Recommended): Automatically updated via CI/CD
2. **GitHub Releases**: Download ZIP file and load unpacked
3. **Development**: Load unpacked from source directory

## Project Structure

```
luxspy-extension/
├── manifest.json          # Extension configuration (version managed here)
├── src/
│   ├── background/        # Background script
│   ├── content/          # Content script and styles
│   ├── popup/            # Popup interface
│   └── config.js         # Configuration file
├── images/               # Extension icons
└── assets/              # Static assets
```

## Future Enhancements

- Add configuration options for monitoring preferences
- Implement event filtering and aggregation
- Add visual indicators on the match page
- Export functionality for event data

