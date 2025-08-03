// LuxSpy Popup Script

// Main page elements
const statusContent = document.getElementById('status-content');
const refreshBtn = document.getElementById('refresh-btn');
const clearLogsBtn = document.getElementById('clear-logs-btn');
const updateIndicator = document.getElementById('update-indicator');
const loggedInPlayerElement = document.getElementById('logged-in-player');

// Settings page elements
const settingsIcon = document.getElementById('settings-icon');
const backIcon = document.getElementById('back-icon');
const mainPage = document.getElementById('main-page');
const settingsPage = document.getElementById('settings-page');
const serverAddressInput = document.getElementById('server-address');
const focusModeSelect = document.getElementById('focus-mode-select');
const playerSelection = document.getElementById('player-selection');
const playerSelect = document.getElementById('player-select');
const saveSettingsBtn = document.getElementById('save-settings-btn');
const testConnectionBtn = document.getElementById('test-connection-btn');

// Function to get current tab and check if it's an AutoDarts match page
async function getCurrentTab() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    return tab;
}

// Function to check if the current page is an AutoDarts match
function isAutoDartsMatchPage(url) {
    return url && url.match(/^https:\/\/play\.autodarts\.io\/matches\/[a-f0-9-]+$/);
}

// Function to show a message
function showMessage(message, type = 'success') {
    // Remove existing messages
    const existingMessages = document.querySelectorAll('.message');
    existingMessages.forEach(msg => msg.remove());
    
    // Create new message
    const messageElement = document.createElement('div');
    messageElement.className = `message ${type}`;
    messageElement.textContent = message;
    
    // Add to current page
    const currentPage = document.querySelector('.page.active');
    currentPage.appendChild(messageElement);
    
    // Auto-remove after 3 seconds
    setTimeout(() => {
        messageElement.remove();
    }, 3000);
}

// Function to switch between pages
function switchPage(pageId) {
    // Hide all pages
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    
    // Show target page
    document.getElementById(pageId).classList.add('active');
}

// Function to update status display with data
function updateStatusDisplay(data) {
    // Update logged-in player in header
    if (data.loggedInPlayerName) {
        loggedInPlayerElement.innerHTML = `<span>👤 ${data.loggedInPlayerName}</span>`;
    } else {
        loggedInPlayerElement.innerHTML = `<span>👤 Not logged in</span>`;
    }
    
    // Combine player name and number
    const playerInfo = data.playerName && data.playerNumber 
        ? `${data.playerName} (Player ${data.playerNumber})`
        : data.playerName || 'Not found';
    
    statusContent.innerHTML = `
        <div class="status-item">
            <strong>Active Player:</strong> ${playerInfo}
        </div>
        <div class="status-item">
            <strong>Game State:</strong> <span class="state-${data.gameState}">${data.gameState}</span>
        </div>
        <div class="status-item">
            <strong>Focus Mode:</strong> ${data.focusMode || 'auto'}
        </div>
        <div class="status-item">
            <strong>Should Focus:</strong> ${data.shouldFocus ? 'Yes' : 'No'}
        </div>
        <div class="status-item">
            <strong>Match URL:</strong> ${data.url}
        </div>
        <div class="status-item">
            <strong>Last Updated:</strong> ${data.timestamp}
        </div>
    `;
}

// Function to update status display
async function updateStatus() {
    const tab = await getCurrentTab();
    
    if (!tab) {
        statusContent.innerHTML = '<p class="error">No active tab found</p>';
        loggedInPlayerElement.innerHTML = '<span>👤 No tab</span>';
        return;
    }
    
    if (!isAutoDartsMatchPage(tab.url)) {
        statusContent.innerHTML = `
            <p class="warning">Not on an AutoDarts match page</p>
            <p>Current URL: ${tab.url || 'Unknown'}</p>
            <p>Navigate to a match page to start monitoring</p>
        `;
        loggedInPlayerElement.innerHTML = '<span>👤 Not on match page</span>';
        return;
    }
    
    // Try to get status from content script
    try {
        const response = await chrome.tabs.sendMessage(tab.id, { action: 'getStatus' });
        if (response && response.success) {
            updateStatusDisplay(response.data);
        } else {
            statusContent.innerHTML = '<p class="error">Failed to get status from page</p>';
        }
    } catch (error) {
        statusContent.innerHTML = `
            <p class="error">Content script not responding</p>
            <p>Try refreshing the page</p>
        `;
        loggedInPlayerElement.innerHTML = '<span>👤 Script error</span>';
    }
}

// Function to load players from the match
async function loadPlayers() {
    const tab = await getCurrentTab();
    if (tab && isAutoDartsMatchPage(tab.url)) {
        try {
            const response = await chrome.tabs.sendMessage(tab.id, { action: 'getPlayers' });
            if (response && response.success && response.players) {
                // Clear existing options
                playerSelect.innerHTML = '<option value="">Select Player</option>';
                
                // Add player options
                response.players.forEach(player => {
                    const option = document.createElement('option');
                    option.value = player.name;
                    option.textContent = `${player.name} (Player ${player.number})`;
                    playerSelect.appendChild(option);
                });
            }
        } catch (error) {
            console.error('LuxSpy: Failed to load players:', error);
        }
    }
}

// Function to save all settings
function saveSettings() {
    const serverAddress = serverAddressInput.value.trim();
    const focusMode = focusModeSelect.value;
    const focusedPlayer = playerSelect.value;
    
    chrome.storage.local.set({
        serverAddress: serverAddress,
        focusMode: focusMode,
        focusedPlayer: focusedPlayer
    }, () => {
        showMessage('Settings saved successfully!');
        console.log('LuxSpy: Settings saved');
    });
}

// Function to load all settings
function loadSettings() {
    chrome.storage.local.get(['serverAddress', 'focusMode', 'focusedPlayer'], (result) => {
        serverAddressInput.value = result.serverAddress || 'http://localhost:8080';
        focusModeSelect.value = result.focusMode || 'auto';
        playerSelect.value = result.focusedPlayer || '';
        
        // Show/hide player selection based on mode
        if (result.focusMode === 'manual') {
            playerSelection.style.display = 'block';
        } else {
            playerSelection.style.display = 'none';
        }
    });
}

// Function to test server connection
async function testConnection() {
    const serverAddress = serverAddressInput.value.trim();
    if (!serverAddress) {
        showMessage('Please enter a server address', 'error');
        return;
    }
    
    try {
        const response = await fetch(`${serverAddress}/health`);
        if (response.ok) {
            const data = await response.json();
            showMessage(`Connection successful! Server: ${data.service}`, 'success');
        } else {
            showMessage(`Server responded with status: ${response.status}`, 'error');
        }
    } catch (error) {
        showMessage(`Connection failed: ${error.message}`, 'error');
    }
}

// Function to clear console logs
async function clearConsoleLogs() {
    const tab = await getCurrentTab();
    if (tab && isAutoDartsMatchPage(tab.url)) {
        try {
            await chrome.tabs.sendMessage(tab.id, { action: 'clearLogs' });
            console.log('LuxSpy: Console logs cleared');
        } catch (error) {
            console.error('LuxSpy: Failed to clear logs:', error);
        }
    }
}

// Listen for real-time LuxSpy events
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'luxspyEvent') {
        updateStatusDisplay(message.data);
        
        // Animate the update indicator
        updateIndicator.classList.add('active');
        setTimeout(() => {
            updateIndicator.classList.remove('active');
        }, 1000);
    }
});

// Navigation event listeners
settingsIcon.addEventListener('click', () => {
    switchPage('settings-page');
    loadSettings();
});

backIcon.addEventListener('click', () => {
    switchPage('main-page');
    updateStatus();
});

// Main page event listeners
refreshBtn.addEventListener('click', updateStatus);
clearLogsBtn.addEventListener('click', clearConsoleLogs);

// Settings page event listeners
saveSettingsBtn.addEventListener('click', saveSettings);
testConnectionBtn.addEventListener('click', testConnection);

// Focus control event listeners
focusModeSelect.addEventListener('change', () => {
    if (focusModeSelect.value === 'manual') {
        playerSelection.style.display = 'block';
        loadPlayers(); // Load players when switching to manual mode
    } else {
        playerSelection.style.display = 'none';
    }
    saveSettings();
});

playerSelect.addEventListener('change', saveSettings);

// Initial setup
loadSettings();
updateStatus();