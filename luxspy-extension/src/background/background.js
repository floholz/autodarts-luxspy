// LuxSpy Background Script

console.log('LuxSpy: Background script loaded');

// Handle extension installation
chrome.runtime.onInstalled.addListener(({reason}) => {
    if (reason === 'install') {
        console.log('LuxSpy: Extension installed');
    } else if (reason === 'update') {
        console.log('LuxSpy: Extension updated');
    }
});

// Handle extension startup
chrome.runtime.onStartup.addListener(() => {
    console.log('LuxSpy: Extension started');
});

// Function to send event to LuxSpy server
async function sendEventToServer(eventData) {
    try {
        // Get server URL from storage, fallback to config
        const result = await chrome.storage.local.get(['serverAddress']);
        const serverUrl = result.serverAddress || 'http://localhost:3181';
        const fullUrl = `${serverUrl}/api/event`;
        
        const response = await fetch(fullUrl, {
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
            return { success: true, data: result };
        } else {
            throw new Error(`Server responded with ${response.status}: ${response.statusText}`);
        }
    } catch (error) {
        console.error('LuxSpy: Failed to send event to server:', error);
        return { success: false, error: error.message };
    }
}

// Function to test server connection
async function testServerConnection(serverUrl) {
    try {
        const fullUrl = `${serverUrl}/health`;
        const response = await fetch(fullUrl);
        
        if (response.ok) {
            const data = await response.json();
            return { success: true, data: data };
        } else {
            throw new Error(`Server responded with ${response.status}: ${response.statusText}`);
        }
    } catch (error) {
        console.error('LuxSpy: Failed to test server connection:', error);
        return { success: false, error: error.message };
    }
}

// Function to send test state to server
async function sendTestState(serverUrl, gameState, shouldFocus) {
    try {
        const fullUrl = `${serverUrl}/api/test-state`;
        const response = await fetch(fullUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                gameState: gameState,
                shouldFocus: shouldFocus
            })
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log('LuxSpy: Test state sent successfully:', data);
            return { success: true, data: data };
        } else {
            const errorText = await response.text();
            throw new Error(`Server responded with ${response.status}: ${errorText}`);
        }
    } catch (error) {
        console.error('LuxSpy: Failed to send test state:', error);
        return { success: false, error: error.message };
    }
}

// Handle messages from content script and forward to popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'luxspyEvent') {
        // Send event to server
        sendEventToServer(message.data).then(result => {
            // Send response back to content script
            sendResponse(result);
        });
        
        // Broadcast the event to all popups
        chrome.runtime.sendMessage(message).catch(error => {
            // Ignore connection errors when no popup is listening
            if (error.message.includes('Receiving end does not exist')) {
                // This is expected when no popup is open
                return;
            }
            console.error('LuxSpy: Error broadcasting message:', error);
        });
        
        // Return true to indicate we'll send a response asynchronously
        return true;
    } else if (message.action === 'testConnection') {
        // Test server connection
        testServerConnection(message.serverUrl).then(result => {
            sendResponse(result);
        });
        
        // Return true to indicate we'll send a response asynchronously
        return true;
    } else if (message.action === 'testState') {
        // Send test state to server
        sendTestState(message.serverUrl, message.gameState, message.shouldFocus).then(result => {
            sendResponse(result);
        });
        
        // Return true to indicate we'll send a response asynchronously
        return true;
    }
});