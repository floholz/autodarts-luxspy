// LuxSpy Configuration

const CONFIG = {
    // Server configuration
    SERVER_URL: 'http://localhost:8080',
    
    // Monitoring configuration
    DEBOUNCE_DELAY: 100, // milliseconds
    
    // DOM selectors
    SELECTORS: {
        PLAYER_NAME: '.ad-ext-player-active *> .ad-ext-player-name',
        READY_STATE: 'div.css-aiihgx',
        TAKEOUT_STATE: 'div.css-3nk254',
        NAVIGATION_IMG: '.navigation *> img'
    }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
} 