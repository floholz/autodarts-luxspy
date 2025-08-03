// Note: Content scripts don't support ES6 modules, so we only use global functions
// These utility functions are primarily for background scripts and popup

/**
 * Read data from the defined storage area.
 *
 * @param {string} key Storage key
 * @param {string?} area The storage area, the data should be saved to. If no area is supplied, 'local' will be used.
 * @return {Promise<*|null>} Data from storage area
 */
function readStorage(key, area = 'local') {
    if (!(area === 'local' || area === 'sync' || area === 'session' || area === 'managed')) {
        console.error("Invalid storage area! Possible values are: 'local', 'sync', 'session' and 'managed'.")
        return null;
    }

    return chrome.storage[area].get([key]).then(data => data[key]);
}

/**
 * Write data to the defined storage area.
 *
 * @param {string} key Storage key
 * @param {*} data Data to be stored
 * @param {string?} area The storage area, the data should be saved to. If no area is supplied, 'local' will be used.
 */
function writeStorage(key, data, area = 'local') {
    if (!(area === 'local' || area === 'sync' || area === 'session' || area === 'managed')) {
        console.error("Invalid storage area! Possible values are: 'local', 'sync', 'session' and 'managed'.")
        return;
    }

    chrome.storage[area].set({[key]: data});
}

/**
 * Callback function for {@link addStorageChangeListener}.
 *
 * @callback storageChangeListenerCallback
 * @param {*} oldValue
 * @param {*} newValue
 * @param {string} key
 * @param {string?} storage
 * @return {void}
 */
/**
 * Registers a listener for storage changes affecting the provided key.
 * By providing a storage area, the listener can be limited to this area.
 *
 * @param {string} key
 * @param {storageChangeListenerCallback} callback
 * @param {string?} area The storage area, to listen for changes. If no area is supplied, the listener will check for any area.
 */
function addStorageChangeListener(key, callback, area = null) {
    if (!(area === 'local' || area === 'sync' || area === 'session' || area === 'managed' || area === null)) {
        console.error("Invalid storage area! Possible values are: 'local', 'sync', 'session' and 'managed'.")
        return;
    }

    chrome.storage.onChanged.addListener((changes, sArea) => {
        if (area === null || area === sArea) {
            for (let [changedKey, { oldValue, newValue }] of Object.entries(changes)) {
                if (changedKey === key) {
                    callback(oldValue, newValue, key, area);
                }
            }
        }
    });
}

/**
 * Sends a single message to event listeners within this extension.
 *
 * @param {string} key Message key
 * @param {*} message Message data
 * @return {Promise<*>} Message response
 */
function sendMessage(key, message) {
    const data = {}
    data[key] = message;
    return chrome.runtime.sendMessage(data);
}

/**
 * @external MessageSender
 * @see https://developer.chrome.com/docs/extensions/reference/api/runtime#type-MessageSender
 */
/**
 * Callback function for {@link addMessageListener}.
 *
 * @callback messageListenerCallback
 * @param {*} message
 * @param {MessageSender} sender
 * @return {Promise<*>}
 */
/**
 * Register a listener for messages within this extension.
 *
 * @param {string} key Message key
 * @param {messageListenerCallback} callback Callback function for message events
 */
function addMessageListener(key, callback) {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message[key]) {
            callback(message[key], sender).then(sendResponse);
        }
    });
}

function strRepeat(string, repeat) {
    let result = string;
    for (let i = 1; i < repeat; i++) {
        result += string;
    }
    return result;
}

/**
 * Evaluates a selector and extracts data from the first matching element.
 *
 * @param {SelectorEvaluator} selectorEvaluator - The selector configuration object
 * @param {Document|Element} [source=document] - The source element to search within
 * @return {string|Element|null} The extracted data, element, or null if no element is found
 */
function evaluateSelector(selectorEvaluator, source = document) {
    const element = source.querySelector(selectorEvaluator.selector);
    if (!element) return null;
    
    // If no evaluator specified, return the element itself
    if (!selectorEvaluator.evaluator) return element;
    
    // If evaluator is a string, treat it as a property name
    if (typeof selectorEvaluator.evaluator === 'string') {
        return element[selectorEvaluator.evaluator];
    }
    
    // If evaluator is a function, call it with the element
    if (typeof selectorEvaluator.evaluator === 'function') {
        return selectorEvaluator.evaluator(element);
    }
    
    return null;
}

/**
 * Evaluates a selector and extracts data from all matching elements.
 *
 * @param {SelectorEvaluator} selectorEvaluator - The selector configuration object
 * @param {Document|Element} [source=document] - The source element to search within
 * @return {Array<string|Element>} Array of extracted data or elements
 */
function evaluateSelectorAll(selectorEvaluator, source = document) {
    const elements = source.querySelectorAll(selectorEvaluator.selector);
    return Array.from(elements).map(element => {
        // Create a temporary source context for each element
        const tempSource = { querySelector: () => element };
        return evaluateSelector(selectorEvaluator, tempSource);
    });
}

// Make functions available globally for content scripts
if (typeof window !== 'undefined') {
    window.evaluateSelector = evaluateSelector;
    window.evaluateSelectorAll = evaluateSelectorAll;
    window.readStorage = readStorage;
    window.writeStorage = writeStorage;
    window.addStorageChangeListener = addStorageChangeListener;
    window.sendMessage = sendMessage;
    window.addMessageListener = addMessageListener;
    window.strRepeat = strRepeat;
}