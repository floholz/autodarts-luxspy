// LuxSpy Content Script - Monitor AutoDarts match page events

console.log('LuxSpy: Content script loaded on AutoDarts match page');

// Function to get current player name
function getCurrentPlayerName() {
    const playerElement = document.querySelector(CONFIG.SELECTORS.PLAYER_NAME);
    return playerElement?.innerText || null;
}

// Function to get game state
function getGameState() {
    if (document.querySelector(CONFIG.SELECTORS.READY_STATE)) {
        return 'ready';
    } else if (document.querySelector(CONFIG.SELECTORS.TAKEOUT_STATE)) {
        return 'takeout';
    } else {
        return 'idle';
    }
}

// Function to check if current player is in navigation
function isCurrentPlayerInNavigation() {
    const currentPlayerName = getCurrentPlayerName();
    const navigationImg = document.querySelector(CONFIG.SELECTORS.NAVIGATION_IMG);
    
    if (!currentPlayerName || !navigationImg) {
        return false;
    }
    
    return navigationImg.alt === currentPlayerName;
}

// Function to send event to LuxSpy server
async function sendEventToServer(eventData) {
    const serverUrl = `${CONFIG.SERVER_URL}/api/event`;
    
    try {
        const response = await fetch(serverUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: 'luxspyEvent',
                data: eventData
            })
        });
        
        if (response.ok) {
            const result = await response.json();
            console.log('LuxSpy: Event sent to server successfully:', result);
        } else {
            console.error('LuxSpy: Server responded with error:', response.status, response.statusText);
        }
    } catch (error) {
        console.error('LuxSpy: Failed to send event to server:', error);
    }
}

// Function to log all monitored data
function logMonitoredData() {
    const playerName = getCurrentPlayerName();
    const gameState = getGameState();
    const playerInNav = isCurrentPlayerInNavigation();
    
    const eventData = {
        timestamp: new Date().toISOString(),
        playerName: playerName,
        gameState: gameState,
        playerInNavigation: playerInNav,
        url: window.location.href
    };
    
    console.log('LuxSpy Event:', eventData);
    
    // Broadcast event to any listening popups
    chrome.runtime.sendMessage({
        action: 'luxspyEvent',
        data: eventData
    }).catch(error => {
        // Ignore connection errors when no popup is open
        if (error.message.includes('Receiving end does not exist')) {
            // This is expected when no popup is listening
            return;
        }
        console.error('LuxSpy: Error sending message:', error);
    });

    // Send event to LuxSpy server
    sendEventToServer(eventData);
}

// Initial log
logMonitoredData();

// Set up MutationObserver to watch for DOM changes
const observer = new MutationObserver((mutations) => {
    let shouldLog = false;
    
    mutations.forEach((mutation) => {
        // Check if any of our monitored elements were affected
        if (mutation.type === 'childList' || mutation.type === 'attributes') {
            const target = mutation.target;
            
            // Check if the mutation affects any of our monitored selectors
            if (target.matches?.('.ad-ext-player-active *> .ad-ext-player-name') ||
                target.matches?.('div.css-aiihgx') ||
                target.matches?.('div.css-3nk254') ||
                target.matches?.('.navigation *> img') ||
                target.closest?.('.ad-ext-player-active') ||
                target.closest?.('.navigation')) {
                shouldLog = true;
            }
        }
    });
    
    if (shouldLog) {
        // Debounce the logging to avoid excessive console output
        clearTimeout(window.luxspyLogTimeout);
        window.luxspyLogTimeout = setTimeout(logMonitoredData, CONFIG.DEBOUNCE_DELAY);
    }
});

// Start observing the document
observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['class', 'innerText', 'alt']
});

// Also log on page visibility changes (when user switches tabs)
document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
        logMonitoredData();
    }
});

// Handle messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'getStatus') {
        const playerName = getCurrentPlayerName();
        const gameState = getGameState();
        const playerInNav = isCurrentPlayerInNavigation();
        
        sendResponse({
            success: true,
            data: {
                playerName: playerName,
                gameState: gameState,
                playerInNavigation: playerInNav,
                url: window.location.href,
                timestamp: new Date().toISOString()
            }
        });
    } else if (request.action === 'clearLogs') {
        console.clear();
        console.log('LuxSpy: Console logs cleared');
        sendResponse({ success: true });
    }
    
    return true; // Keep the message channel open for async response
});

// Log when the script is unloaded
window.addEventListener('beforeunload', () => {
    console.log('LuxSpy: Content script unloading');
    observer.disconnect();
});