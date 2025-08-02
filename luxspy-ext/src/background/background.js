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