// LuxSpy Popup Script

const statusContent = document.getElementById('status-content');
const refreshBtn = document.getElementById('refresh-btn');
const clearLogsBtn = document.getElementById('clear-logs-btn');

// Function to get current tab and check if it's an AutoDarts match page
async function getCurrentTab() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    return tab;
}

// Function to check if the current page is an AutoDarts match
function isAutoDartsMatchPage(url) {
    return url && url.match(/^https:\/\/play\.autodarts\.io\/matches\/[a-f0-9-]+$/);
}

// Function to update status display
async function updateStatus() {
    const tab = await getCurrentTab();
    
    if (!tab) {
        statusContent.innerHTML = '<p class="error">No active tab found</p>';
        return;
    }
    
    if (!isAutoDartsMatchPage(tab.url)) {
        statusContent.innerHTML = `
            <p class="warning">Not on an AutoDarts match page</p>
            <p>Current URL: ${tab.url || 'Unknown'}</p>
            <p>Navigate to a match page to start monitoring</p>
        `;
        return;
    }
    
    // Try to get status from content script
    try {
        const response = await chrome.tabs.sendMessage(tab.id, { action: 'getStatus' });
        if (response && response.success) {
            statusContent.innerHTML = `
                <div class="status-item">
                    <strong>Player Name:</strong> ${response.data.playerName || 'Not found'}
                </div>
                <div class="status-item">
                    <strong>Game State:</strong> <span class="state-${response.data.gameState}">${response.data.gameState}</span>
                </div>
                <div class="status-item">
                    <strong>Player in Navigation:</strong> ${response.data.playerInNavigation ? 'Yes' : 'No'}
                </div>
                <div class="status-item">
                    <strong>Match URL:</strong> ${response.data.url}
                </div>
                <div class="status-item">
                    <strong>Last Updated:</strong> ${response.data.timestamp}
                </div>
            `;
        } else {
            statusContent.innerHTML = '<p class="error">Failed to get status from page</p>';
        }
    } catch (error) {
        statusContent.innerHTML = `
            <p class="error">Content script not responding</p>
            <p>Try refreshing the page</p>
        `;
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

// Event listeners
refreshBtn.addEventListener('click', updateStatus);
clearLogsBtn.addEventListener('click', clearConsoleLogs);

// Initial status update
updateStatus();