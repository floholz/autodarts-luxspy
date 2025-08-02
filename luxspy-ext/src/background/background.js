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

// Handle messages from content script and forward to popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'luxspyEvent') {
        // Broadcast the event to all popups
        chrome.runtime.sendMessage(message).catch(error => {
            // Ignore connection errors when no popup is listening
            if (error.message.includes('Receiving end does not exist')) {
                // This is expected when no popup is open
                return;
            }
            console.error('LuxSpy: Error broadcasting message:', error);
        });
    }
});