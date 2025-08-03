// LuxSpy Popup Script

// Main page elements
const statusContent = document.getElementById('status-content');
const refreshBtn = document.getElementById('refresh-btn');
const clearLogsBtn = document.getElementById('clear-logs-btn');
const updateIndicator = document.getElementById('update-indicator');
const loggedInPlayerElement = document.getElementById('logged-in-player');
const pauseIcon = document.getElementById('pause-icon');

// Settings page elements
const settingsIcon = document.getElementById('settings-icon');
const backIcon = document.getElementById('back-icon');
const mainPage = document.getElementById('main-page');
const settingsPage = document.getElementById('settings-page');
const serverAddressInput = document.getElementById('server-address');
const saveSettingsBtn = document.getElementById('save-settings-btn');
const testConnectionBtn = document.getElementById('test-connection-btn');

// Function to get current tab and check if it's an AutoDarts match page
async function getCurrentTab() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    return tab;
}

// Function to check if the current page is an AutoDarts page
function isAutoDartsPage(url) {
    return url && url.startsWith('https://play.autodarts.io/');
}

// Function to check if the current page is an AutoDarts match
function isAutoDartsMatchPage(url) {
    return url && url.match(/^https:\/\/play\.autodarts\.io\/matches\/[a-f0-9-]+$/);
}

// Function to show a message
function showMessage(message, options = {}) {
    const { type = 'success', target = null, onShow, onClose } = options;
    
    // Remove existing messages
    const existingMessages = document.querySelectorAll('.message');
    existingMessages.forEach(msg => msg.remove());
    
    // Create new message
    const messageElement = document.createElement('div');
    messageElement.className = `message ${type}`;
    messageElement.textContent = message;
    
    // If target element is specified, insert after it, otherwise add to current page
    if (target) {
        target.parentNode.insertBefore(messageElement, target.nextSibling);
    } else {
        const currentPage = document.querySelector('.page.active');
        currentPage.appendChild(messageElement);
    }
    
    // Call onShow callback if provided
    if (onShow) {
        onShow(messageElement);
    }
    
    // Auto-remove after 3 seconds
    setTimeout(() => {
        // Call onClose callback if provided
        messageElement.remove();
        if (onClose) {
            onClose(target);
        }
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

// Function to toggle pause state
async function togglePause() {
    const tab = await getCurrentTab();
    if (!tab || !isAutoDartsPage(tab.url)) {
        showMessage('Not on an AutoDarts page', { type: 'error' });
        return;
    }

    try {
        // Get current pause state
        const result = await chrome.storage.local.get(['isPaused']);
        const isPaused = !result.isPaused; // Toggle the state
        
        // Save new pause state
        await chrome.storage.local.set({ isPaused: isPaused });
        
        // Update UI
        updatePauseIcon(isPaused);
        
        // Send pause command to content script
        await chrome.tabs.sendMessage(tab.id, { 
            action: 'setPauseState', 
            isPaused: isPaused 
        });
        
        // Show feedback message
        showMessage(`Monitoring ${isPaused ? 'paused' : 'resumed'}`, { type: 'success' });
        
        // Refresh status display to show updated state
        await updateStatus();
        
    } catch (error) {
        console.error('LuxSpy: Failed to toggle pause state:', error);
        showMessage('Failed to toggle pause state', { type: 'error' });
    }
}

// Function to update pause icon appearance
function updatePauseIcon(isPaused) {
    const pauseSvg = pauseIcon.querySelector('.pause-svg');
    const playSvg = pauseIcon.querySelector('.play-svg');
    
    if (isPaused) {
        pauseIcon.classList.add('paused');
        pauseIcon.title = 'Resume monitoring';
        pauseSvg.style.display = 'none';
        playSvg.style.display = 'block';
    } else {
        pauseIcon.classList.remove('paused');
        pauseIcon.title = 'Pause monitoring';
        pauseSvg.style.display = 'block';
        playSvg.style.display = 'none';
    }
}

// Function to load pause state
function loadPauseState() {
    chrome.storage.local.get(['isPaused'], (result) => {
        const isPaused = result.isPaused || false;
        updatePauseIcon(isPaused);
    });
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
    
    // Build status content based on whether we're on a match page
    let statusItems = [
        `<div class="status-item">
            <strong>Page Type:</strong> ${data.isMatchPage ? 'Match Page' : 'AutoDarts Page'}
        </div>`
    ];
    
    // Add pause status if paused
    if (data.isPaused) {
        statusItems.push(
            `<div class="status-item">
                <strong>Status:</strong> <span class="state-paused">PAUSED</span>
            </div>`
        );
    }
    
    if (data.isMatchPage) {
        statusItems.push(
            `<div class="status-item">
                <strong>Active Player:</strong> ${playerInfo}
            </div>`,
            `<div class="status-item">
                <strong>Game State:</strong> <span class="state-${data.gameState}">${data.gameState}</span>
            </div>`,
            `<div class="status-item">
                <strong>Player Focus:</strong> ${data.shouldFocus ? 'Green (Focused)' : 'Purple (Unfocused)'}
            </div>`
        );
    } else {
        statusItems.push(
            `<div class="status-item">
                <strong>Status:</strong> <span class="state-idle">Monitoring AutoDarts site</span>
            </div>`
        );
    }
    
    statusItems.push(
        `<div class="status-item">
            <strong>Current URL:</strong> ${data.url}
        </div>`,
        `<div class="status-item">
            <strong>Last Updated:</strong> ${data.timestamp}
        </div>`
    );
    
    statusContent.innerHTML = statusItems.join('');
}

// Function to update status display
async function updateStatus() {
    const tab = await getCurrentTab();
    
    if (!tab) {
        statusContent.innerHTML = '<p class="error">No active tab found</p>';
        loggedInPlayerElement.innerHTML = '<span>👤 No tab</span>';
        return;
    }
    
    if (!isAutoDartsPage(tab.url)) {
        statusContent.innerHTML = `
            <p class="warning">Not on an AutoDarts page</p>
            <p>Current URL: ${tab.url || 'Unknown'}</p>
            <p>Navigate to play.autodarts.io to start monitoring</p>
        `;
        loggedInPlayerElement.innerHTML = '<span>👤 Not on AutoDarts</span>';
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



// Function to save all settings
function saveSettings() {
    const serverAddress = serverAddressInput.value.trim();
    
    chrome.storage.local.set({
        serverAddress: serverAddress
    }, () => {
        showMessage('Settings saved successfully!', {});
        console.log('LuxSpy: Settings saved');
    });
}

// Function to load all settings
function loadSettings() {
    chrome.storage.local.get(['serverAddress'], (result) => {
        serverAddressInput.value = result.serverAddress || 'http://localhost:3181';
    });
}

// Function to test server connection
async function testConnection() {
    const serverAddress = serverAddressInput.value.trim();
    if (!serverAddress) {
        showMessage('Please enter a server address', { type: 'error', target: testConnectionBtn });
        return;
    }
    
    // Show loading message immediately
    testConnectionBtn.classList.add('hidden');
    showMessage('Testing connection...', { type: 'loading', target: testConnectionBtn });
    
    const onClose = () => {
        testConnectionBtn.classList.remove('hidden');
    }

    try {
        const response = await fetch(`${serverAddress}/health`);
        if (response.ok) {
            const data = await response.json();
            showMessage(`Connection successful! Server: ${data.service}`, { type: 'success', target: testConnectionBtn, onClose: onClose });
        } else {
            showMessage(`Server responded with status: ${response.status}`, { type: 'error', target: testConnectionBtn, onClose: onClose });
        }
    } catch (error) {
        showMessage(`Connection failed: ${error.message}`, { type: 'error', target: testConnectionBtn, onClose: onClose });
    }
}

// Function to clear console logs
async function clearConsoleLogs() {
    const tab = await getCurrentTab();
    if (tab && isAutoDartsPage(tab.url)) {
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

// Pause functionality
pauseIcon.addEventListener('click', togglePause);

// Main page event listeners
refreshBtn.addEventListener('click', updateStatus);
clearLogsBtn.addEventListener('click', clearConsoleLogs);

// Settings page event listeners
saveSettingsBtn.addEventListener('click', saveSettings);
testConnectionBtn.addEventListener('click', testConnection);



// Initial setup
loadSettings();
loadPauseState();
updateStatus();