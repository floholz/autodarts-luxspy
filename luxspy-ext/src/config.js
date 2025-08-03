/**
 * @typedef {Object} SelectorEvaluator
 * @property {string} selector - The CSS selector string to find elements in the DOM
 * @property {string|function} [evaluator] - How to extract data from the matched element:
 *   - `string`: Property name to access (e.g., 'innerText', 'alt', 'src')
 *   - `function`: Custom function that takes the element and returns the desired value
 *   - `undefined` (omitted): Return the element itself
 */

/**
 * LuxSpy Configuration
 * 
 * Contains all configuration settings for the LuxSpy extension including
 * server settings, monitoring parameters, and DOM selectors with their evaluators.
 */
const CONFIG = {
    // Server configuration
    SERVER_URL: 'http://localhost:8080',
    
    // Monitoring configuration
    DEBOUNCE_DELAY: 100, // milliseconds
    
    // DOM selectors with evaluators
    SELECTORS: {
        /** @type {SelectorEvaluator} Player name selector - extracts innerText from active player */
        PLAYER_NAME: {
            selector: '.ad-ext-player-active *> .ad-ext-player-name', 
            evaluator: 'innerText'
        },
        /** @type {SelectorEvaluator} Ready state selector - returns element if exists */
        READY_STATE: {
            selector: 'div.css-aiihgx'
        },
        /** @type {SelectorEvaluator} Takeout state selector - returns element if exists */
        TAKEOUT_STATE: {
            selector: 'div.css-3nk254'
        },
        /** @type {SelectorEvaluator} Navigation image selector - extracts alt text */
        NAVIGATION_IMG: {
            selector: '.navigation *> img', 
            evaluator: 'alt'
        },
        /** @type {SelectorEvaluator} All player names selector - for getting player list */
        ALL_PLAYER_NAMES: {
            selector: '.ad-ext-player-name',
            evaluator: 'innerText'
        },
        /** @type {SelectorEvaluator} Active player container - for existence checks */
        ACTIVE_PLAYER_CONTAINER: {
            selector: '.ad-ext-player-active'
        }
    }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
} 