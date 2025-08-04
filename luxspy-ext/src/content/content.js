// LuxSpy Content Script - Monitor AutoDarts events

console.log('LuxSpy: Content script loaded on AutoDarts page');



// Global pause state
let isPaused = false;

// Function to get current player name
function getCurrentPlayerName() {
    return evaluateSelector(CONFIG.SELECTORS.PLAYER_NAME);
}

// Function to get current player number (1 or 2)
function getCurrentPlayerNumber() {
    const playerName = getCurrentPlayerName();
    if (!playerName) return null;
    
    // Try to find player in the player list to determine their number
    const playerNames = evaluateSelectorAll(CONFIG.SELECTORS.ALL_PLAYER_NAMES);
    for (let i = 0; i < playerNames.length; i++) {
        if (playerNames[i] === playerName) {
            return i + 1; // Player numbers are 1-based
        }
    }
    
    return null;
}

// Function to get game state
function getGameState() {
    if (evaluateSelector(CONFIG.SELECTORS.READY_STATE)) {
        return 'ready';
    } else if (evaluateSelector(CONFIG.SELECTORS.TAKEOUT_STATE)) {
        return 'takeout';
    } else if (evaluateSelector(CONFIG.SELECTORS.ERROR_STATE)) {
        return 'error';
    } else {
        return 'idle';
    }
}

// Function to get logged-in player name (from navigation image alt)
function getLoggedInPlayerName() {
    return evaluateSelector(CONFIG.SELECTORS.NAVIGATION_IMG);
}

// Function to check if current player is in navigation
function isCurrentPlayerInNavigation() {
    const currentPlayerName = getCurrentPlayerName();
    const loggedInPlayerName = getLoggedInPlayerName();
    
    if (!currentPlayerName || !loggedInPlayerName) {
        return false;
    }
    
    return loggedInPlayerName === currentPlayerName;
}

// Function to send event to LuxSpy server via background script
async function sendEventToServer(eventData) {
    try {
        // Send message to background script to handle the server request
        const response = await chrome.runtime.sendMessage({
            action: 'luxspyEvent',
            data: eventData
        });
        
        if (response && response.success) {
            console.log('LuxSpy: Event sent to server successfully:', response.data);
        } else if (response && !response.success) {
            console.error('LuxSpy: Server request failed:', response.error);
        }
    } catch (error) {
        console.error('LuxSpy: Failed to send event to background script:', error);
    }
}

// Function to check if we're on a match page
function isMatchPage() {
    return window.location.href.match(/^https:\/\/play\.autodarts\.io\/matches\/[a-f0-9-]+$/);
}

// Function to get all players in the current match
function getAllPlayersInMatch() {    
    try {
        const players = evaluateSelectorAll(CONFIG.SELECTORS.ALL_PLAYER_NAMES);
        
        // If we found players, return them
        if (players.length > 0) {
            return players;
        }
        
        // Fallback: try to get players from the current active player context
        const currentPlayerName = getCurrentPlayerName();
        if (currentPlayerName) {
            // For now, we'll assume there are 2 players in a match
            // This is a simplified approach - in a real implementation,
            // you'd want to scan the DOM more thoroughly
            return [
                { name: currentPlayerName, number: getCurrentPlayerNumber() || 1 },
                { name: 'Unknown Player', number: 2 } // Placeholder for second player
            ];
        }
        
    } catch (error) {
        console.error('LuxSpy: Error getting players in match:', error);
    }
    
    return [];
}

// Function to load pause state from storage
function loadPauseState() {
    return new Promise((resolve) => {
        chrome.storage.local.get(['isPaused'], (result) => {
            isPaused = result.isPaused || false;
            console.log(`LuxSpy: Monitoring ${isPaused ? 'paused' : 'active'}`);
            resolve();
        });
    });
}

// Function to log all monitored data
function logMonitoredData() {
    const loggedInPlayerName = getLoggedInPlayerName();
    const isMatch = isMatchPage();
    
    // If paused, only get logged-in player info and don't send server requests
    if (isPaused) {
        const eventData = {
            timestamp: new Date().toISOString(),
            playerName: null,
            playerNumber: null,
            gameState: 'paused',
            playerInNavigation: false,
            loggedInPlayerName: loggedInPlayerName,
            shouldFocus: false,
            url: window.location.href,
            isMatchPage: isMatch,
            isPaused: true
        };
        
        console.log('LuxSpy Event (PAUSED):', eventData);
        
        // Still broadcast to popup but don't send to server
        chrome.runtime.sendMessage({
            action: 'luxspyEvent',
            data: eventData
        }).catch(error => {
            // Ignore connection errors when no popup is open
            if (error.message.includes('Receiving end does not exist')) {
                return;
            }
            console.error('LuxSpy: Error sending message:', error);
        });
        
        return;
    }
    
    // Only get match-specific data if we're on a match page
    const playerName = isMatch ? getCurrentPlayerName() : null;
    const playerNumber = isMatch ? getCurrentPlayerNumber() : null;
    const gameState = isMatch ? getGameState() : 'idle';
    const playerInNav = isMatch ? isCurrentPlayerInNavigation() : false;
    
    // Implement simplified focus logic
    let shouldFocus = false;
    
    if (isMatch && playerName) {
        // Get all players in the match to determine focus
        const allPlayers = getAllPlayersInMatch();
        
        if (allPlayers.length > 0) {
            // Check if logged-in player is in the match
            const loggedInPlayerInMatch = allPlayers.some(player => player === loggedInPlayerName);
            
            if (loggedInPlayerInMatch) {
                // Logged-in player is in the match: focus on them (green), others get purple
                shouldFocus = loggedInPlayerName === playerName;
            } else {
                // Logged-in player not in match (watch mode): first player gets green, second gets purple
                shouldFocus = playerName === allPlayers[0];
            }
        }
    }
    
    const eventData = {
        timestamp: new Date().toISOString(),
        playerName: playerName,
        playerNumber: playerNumber,
        gameState: gameState,
        playerInNavigation: playerInNav,
        loggedInPlayerName: loggedInPlayerName,
        shouldFocus: shouldFocus,
        url: window.location.href,
        isMatchPage: isMatch
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

    // Send event to server - turn off LEDs if not on match page
    if (isMatch) {
        sendEventToServer(eventData);
    } else {
        // Send idle event to turn off LEDs when not on match page
        const idleEventData = {
            ...eventData,
            gameState: 'idle',
            shouldFocus: false
        };
        sendEventToServer(idleEventData);
    }    
}

// Initial setup
(async () => {
    await loadPauseState();
    logMonitoredData();
})();

// Set up MutationObserver to watch for DOM changes
const observer = new MutationObserver((mutations) => {
    let shouldLog = false;
    
    mutations.forEach((mutation) => {
        // Check if any of our monitored elements were affected
        if (mutation.type === 'childList' || mutation.type === 'attributes') {
            const target = mutation.target;
            
            // Always log if navigation image changes (logged-in player)
            if (target.matches?.(CONFIG.SELECTORS.NAVIGATION_IMG.selector)) {
                shouldLog = true;
            }
            
            // Only log match-specific changes if we're on a match page
            if (isMatchPage()) {
                if (target.matches?.(CONFIG.SELECTORS.PLAYER_NAME.selector) ||
                    target.matches?.(CONFIG.SELECTORS.READY_STATE.selector) ||
                    target.matches?.(CONFIG.SELECTORS.TAKEOUT_STATE.selector) ||
                    target.closest?.(CONFIG.SELECTORS.ACTIVE_PLAYER_CONTAINER.selector)) {
                    shouldLog = true;
                }
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
    if (request.action === 'setPauseState') {
        isPaused = request.isPaused;
        console.log(`LuxSpy: Monitoring ${isPaused ? 'paused' : 'resumed'}`);
        sendResponse({ success: true });
    } else if (request.action === 'getStatus') {
        const loggedInPlayerName = getLoggedInPlayerName();
        const isMatch = isMatchPage();
        
        // Only get match-specific data if we're on a match page
        const playerName = isMatch ? getCurrentPlayerName() : null;
        const gameState = isMatch ? getGameState() : 'idle';
        const playerInNav = isMatch ? isCurrentPlayerInNavigation() : false;
        
        // Implement simplified focus logic for status
        let shouldFocus = false;
        
        if (isMatch && playerName) {
            const allPlayers = getAllPlayersInMatch();
            
            if (allPlayers.length > 0) {
                const loggedInPlayerInMatch = allPlayers.some(player => player.name === loggedInPlayerName);
                
                if (loggedInPlayerInMatch) {
                    shouldFocus = loggedInPlayerName === playerName;
                } else {
                    shouldFocus = playerName === allPlayers[0].name;
                }
            }
        }
        
        sendResponse({
            success: true,
            data: {
                playerName: playerName,
                gameState: gameState,
                playerInNavigation: playerInNav,
                loggedInPlayerName: loggedInPlayerName,
                shouldFocus: shouldFocus,
                url: window.location.href,
                timestamp: new Date().toISOString(),
                isMatchPage: isMatch,
                isPaused: isPaused
            }
        });
        
        return true; // Keep the message channel open for async response
    } else if (request.action === 'clearLogs') {
        console.clear();
        console.log('LuxSpy: Console logs cleared');
        sendResponse({ success: true });
    } else if (request.action === 'getPlayers') {
        // Only get players if we're on a match page
        if (isMatchPage()) {
            const playerNames = evaluateSelectorAll(CONFIG.SELECTORS.ALL_PLAYER_NAMES);
            const players = playerNames.map((name, index) => ({
                name: name,
                number: index + 1
            }));
            
            sendResponse({
                success: true,
                players: players
            });
        } else {
            sendResponse({
                success: false,
                message: 'Not on a match page'
            });
        }
    }
    
    return true; // Keep the message channel open for async response
});

// Log when the script is unloaded
window.addEventListener('beforeunload', () => {
    console.log('LuxSpy: Content script unloading');
    observer.disconnect();
});