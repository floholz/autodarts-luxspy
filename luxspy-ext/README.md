# LuxSpy Chrome Extension

A Chrome extension that monitors and analyzes DOM events on AutoDarts match pages (`https://play.autodarts.io/matches/:match_uuid`).

## Features

- **Real-time Monitoring**: Continuously monitors DOM changes on AutoDarts match pages
- **Event Detection**: Tracks player names, game states, and navigation status
- **Console Logging**: Logs all detected events to the browser console
- **Status Popup**: Shows current monitoring status in the extension popup

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
4. Click "Load unpacked" and select the `luxspy-ext` folder
5. The extension will appear in your extensions list

## Usage

1. Navigate to an AutoDarts match page: `https://play.autodarts.io/matches/[match-uuid]`
2. The extension will automatically start monitoring
3. Open the browser console to see logged events
4. Click the extension icon to view current status

## Development

The extension is built using Manifest V3 and includes:

- **Content Script**: Monitors DOM changes and logs events
- **Background Script**: Handles extension lifecycle
- **Popup**: Shows current monitoring status
- **Manifest**: Configuration and permissions

## Project Structure

```
luxspy-ext/
├── manifest.json          # Extension configuration
├── src/
│   ├── background/        # Background script
│   ├── content/          # Content script and styles
│   └── popup/            # Popup interface
├── images/               # Extension icons
└── assets/              # Static assets
```

## Future Enhancements

- Send events to a server for further processing
- Add configuration options for monitoring preferences
- Implement event filtering and aggregation
- Add visual indicators on the match page

