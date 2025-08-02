// LuxSpy Popup Script

const statusContent = document.getElementById('status-content');
const refreshBtn = document.getElementById('refresh-btn');
const clearLogsBtn = document.getElementById('clear-logs-btn');
const updateIndicator = document.getElementById('update-indicator');

// Function to get current tab and check if it's an AutoDarts match page
async function getCurrentTab() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    return tab;
}

// Function to check if the current page is an AutoDarts match
function isAutoDartsMatchPage(url) {
    return url && url.match(/^https:\/\/play\.autodarts\.io\/matches\/[a-f0-9-]+$/);
}

// Function to update status display with data
function updateStatusDisplay(data) {
    statusContent.innerHTML = `
        <div class="status-item">
            <strong>Player Name:</strong> ${data.playerName || 'Not found'}
        </div>
        <div class="status-item">
            <strong>Game State:</strong> <span class="state-${data.gameState}">${data.gameState}</span>
        </div>
        <div class="status-item">
            <strong>Player in Navigation:</strong> ${data.playerInNavigation ? 'Yes' : 'No'}
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
            updateStatusDisplay(response.data);
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

// Event listeners
refreshBtn.addEventListener('click', updateStatus);
clearLogsBtn.addEventListener('click', clearConsoleLogs);

// Initial status update
updateStatus();