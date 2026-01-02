// Track active text inputs and textareas
let activeInputs = new Map();
let requestIdCounter = 0;
let spinnerElements = new Map(); // Track spinner elements by input element

// Load settings and initialize
let settings = null;

// Default shortcuts
const DEFAULT_SHORTCUTS = {
  fix_language: ['Meta', 'Control', 'Shift', 'T'],
  rephrase_as_friendly_and_professional: ['Meta', 'Control', 'Shift', 'R']
};
let shortcutKeys = {
  fix_language: [...DEFAULT_SHORTCUTS.fix_language],
  rephrase_as_friendly_and_professional: [...DEFAULT_SHORTCUTS.rephrase_as_friendly_and_professional]
};

async function loadSettings() {
  const result = await chrome.storage.sync.get(['provider', 'model', 'shortcuts']);
  
  // Get provider-specific API key
  const provider = result.provider;
  let apiKey = '';
  if (provider) {
    const apiKeyKey = `apiKey_${provider}`;
    const apiKeyResult = await chrome.storage.sync.get([apiKeyKey]);
    apiKey = apiKeyResult[apiKeyKey] || '';
  }
  
  settings = {
    provider: result.provider,
    apiKey: apiKey,
    model: result.model
  };
  
  // Load shortcuts from storage with default fallback
  if (result.shortcuts && typeof result.shortcuts === 'object') {
    shortcutKeys = {
      fix_language: result.shortcuts.fix_language || [...DEFAULT_SHORTCUTS.fix_language],
      rephrase_as_friendly_and_professional: result.shortcuts.rephrase_as_friendly_and_professional || [...DEFAULT_SHORTCUTS.rephrase_as_friendly_and_professional]
    };
  } else if (result.shortcut && Array.isArray(result.shortcut) && result.shortcut.length > 0) {
    // Migrate old single shortcut
    shortcutKeys.fix_language = result.shortcut;
  }
  
  console.log('[Inline Content] Loaded settings', {
    shortcuts: {
      fix_language: shortcutKeys.fix_language.join('+'),
      rephrase: shortcutKeys.rephrase_as_friendly_and_professional.join('+')
    },
    provider: settings.provider,
    hasApiKey: !!settings.apiKey,
    hasModel: !!settings.model
  });
}

// Inject spinner styles
function injectSpinnerStyles() {
  if (document.getElementById('inline-spinner-styles')) {
    return; // Styles already injected
  }
  
  const style = document.createElement('style');
  style.id = 'inline-spinner-styles';
  style.textContent = `
    .inline-spinner-container {
      position: absolute;
      top: 8px;
      right: 8px;
      z-index: 10000;
      pointer-events: none;
    }
    
    .inline-spinner {
      width: 20px;
      height: 20px;
      border: 3px solid rgba(0, 0, 0, 0.1);
      border-top-color: #007bff;
      border-radius: 50%;
      animation: inline-spin 0.8s linear infinite;
    }
    
    @keyframes inline-spin {
      to { transform: rotate(360deg); }
    }
    
    /* Ensure parent input has relative positioning for spinner */
    .inline-input-with-spinner {
      position: relative;
    }
  `;
  document.head.appendChild(style);
}

// Show spinner on an input element
function showSpinner(element) {
  // Remove existing spinner if any
  hideSpinner(element);
  
  // Inject styles if not already done
  injectSpinnerStyles();
  
  // Ensure element has relative positioning
  const computedStyle = window.getComputedStyle(element);
  if (computedStyle.position === 'static') {
    element.classList.add('inline-input-with-spinner');
    element.style.position = 'relative';
  }
  
  // Create spinner container
  const spinnerContainer = document.createElement('div');
  spinnerContainer.className = 'inline-spinner-container';
  
  const spinner = document.createElement('div');
  spinner.className = 'inline-spinner';
  
  spinnerContainer.appendChild(spinner);
  element.appendChild(spinnerContainer);
  
  // Store reference
  spinnerElements.set(element, spinnerContainer);
}

// Hide spinner from an input element
function hideSpinner(element) {
  const spinnerContainer = spinnerElements.get(element);
  if (spinnerContainer && spinnerContainer.parentNode) {
    spinnerContainer.parentNode.removeChild(spinnerContainer);
    spinnerElements.delete(element);
  }
  
  // Clean up positioning class if we added it
  if (element.classList.contains('inline-input-with-spinner')) {
    element.classList.remove('inline-input-with-spinner');
    // Only remove position if we set it (check if it was static before)
    const computedStyle = window.getComputedStyle(element);
    if (computedStyle.position === 'relative') {
      // Check if there's an inline style we set
      if (element.style.position === 'relative') {
        element.style.position = '';
      }
    }
  }
}

// Generate unique ID for input elements
function getInputId(element) {
  if (!element.dataset.inlineId) {
    element.dataset.inlineId = `inline-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
  return element.dataset.inlineId;
}

// Check if element is a text input
function isTextInput(element) {
  if (!element) return false;
  const tagName = element.tagName.toLowerCase();
  const type = element.type ? element.type.toLowerCase() : '';
  
  return (
    tagName === 'textarea' ||
    (tagName === 'input' && (
      type === 'text' ||
      type === 'email' ||
      type === 'password' ||
      type === 'search' ||
      type === 'tel' ||
      type === 'url' ||
      type === '' ||
      element.isContentEditable
    ))
  );
}

// Find all text inputs on the page
function findTextInputs() {
  const inputs = Array.from(document.querySelectorAll('input, textarea'));
  const contentEditable = Array.from(document.querySelectorAll('[contenteditable="true"]'));
  return [...inputs, ...contentEditable].filter(isTextInput);
}

// Get text from input element
function getInputText(element) {
  if (element.isContentEditable) {
    return element.innerText || element.textContent || '';
  }
  return element.value || '';
}

// Set text in input element
function setInputText(element, text) {
  if (element.isContentEditable) {
    element.innerText = text;
    element.textContent = text;
    // Trigger input event
    element.dispatchEvent(new Event('input', { bubbles: true }));
  } else {
    element.value = text;
    // Trigger input event
    element.dispatchEvent(new Event('input', { bubbles: true }));
  }
}

// Check which shortcut was pressed and return the function type
function getShortcutFunction(e) {
  const pressedKeys = [];
  
  if (e.metaKey) pressedKeys.push('Meta');
  if (e.ctrlKey) pressedKeys.push('Control');
  if (e.shiftKey) pressedKeys.push('Shift');
  
  // Add the main key if it's not a modifier
  const mainKey = e.key;
  if (mainKey !== 'Meta' && mainKey !== 'Control' && mainKey !== 'Shift') {
    pressedKeys.push(mainKey.length === 1 ? mainKey.toUpperCase() : mainKey);
  }
  
  // Check each shortcut
  for (const [functionType, keys] of Object.entries(shortcutKeys)) {
    if (pressedKeys.length === keys.length) {
      const matches = keys.every(key => pressedKeys.includes(key)) && 
                      pressedKeys.every(key => keys.includes(key));
      if (matches) {
        console.log('[Inline Content] ✅ Keyboard shortcut matched', {
          functionType: functionType,
          expected: keys.join('+'),
          actual: pressedKeys.join('+')
        });
        return functionType;
      }
    }
  }
  
  return null;
}

// Handle keyboard shortcut
async function handleShortcut(e) {
  const functionType = getShortcutFunction(e);
  if (!functionType) return;
  
  const shortcutPressed = shortcutKeys[functionType].join('+');
  console.log('[Inline Content] Keyboard shortcut activated', {
    functionType: functionType,
    shortcut: shortcutPressed,
    url: window.location.href,
    activeElement: document.activeElement?.tagName,
    activeElementType: document.activeElement?.type,
    activeElementId: document.activeElement?.id,
    activeElementClass: document.activeElement?.className
  });
  
  // Notify background script immediately that shortcut was activated
  chrome.runtime.sendMessage({
    type: 'shortcutActivated',
    url: window.location.href,
    activeElementInfo: {
      tagName: document.activeElement?.tagName,
      type: document.activeElement?.type,
      id: document.activeElement?.id,
      className: document.activeElement?.className,
      isContentEditable: document.activeElement?.isContentEditable
    }
  }).catch(err => {
    console.warn('[Inline Content] Failed to notify background of shortcut activation', err);
  });
  
  const activeElement = document.activeElement;
  
  // Check if active element is a text input
  if (!isTextInput(activeElement)) {
    console.log('[Inline Content] Shortcut activated but no relevant input found', {
      shortcut: shortcutPressed,
      activeElement: activeElement?.tagName,
      activeElementType: activeElement?.type,
      reason: 'Element is not a text input, textarea, or contenteditable'
    });
    
    // Notify background
    chrome.runtime.sendMessage({
      type: 'shortcutNoInput',
      url: window.location.href,
      reason: 'Element is not a text input, textarea, or contenteditable',
      activeElementInfo: {
        tagName: activeElement?.tagName,
        type: activeElement?.type
      }
    }).catch(() => {});
    
    return;
  }
  
  const text = getInputText(activeElement);
  
  // Check if input has text
  if (!text || text.trim().length === 0) {
    console.log('[Inline Content] Shortcut activated but input is empty', {
      shortcut: shortcutPressed,
      inputType: activeElement.tagName,
      hasValue: !!text,
      valueLength: text?.length || 0
    });
    
    // Notify background
    chrome.runtime.sendMessage({
      type: 'shortcutNoInput',
      url: window.location.href,
      reason: 'Input field is empty',
      activeElementInfo: {
        tagName: activeElement.tagName,
        type: activeElement.type
      }
    }).catch(() => {});
    
    return;
  }
  
  e.preventDefault();
  e.stopPropagation();
  
  // Check if settings are configured
  // All providers require API keys
  if (!settings || !settings.provider || !settings.apiKey || !settings.model) {
    console.warn('[Inline Content] Shortcut activated but settings not configured', {
      shortcut: shortcutPressed,
      hasSettings: !!settings,
      hasProvider: !!settings?.provider,
      provider: settings?.provider,
      hasApiKey: !!settings?.apiKey,
      hasModel: !!settings?.model
    });
    
    // Notify background
    chrome.runtime.sendMessage({
      type: 'shortcutNoInput',
      url: window.location.href,
      reason: 'Settings not configured',
      settingsStatus: {
        hasSettings: !!settings,
        hasProvider: !!settings?.provider,
        hasApiKey: !!settings?.apiKey,
        hasModel: !!settings?.model
      }
    }).catch(() => {});
    
    return;
  }
  
  const inputId = getInputId(activeElement);
  const requestId = `req-${Date.now()}-${++requestIdCounter}`;
  
  console.log('[Inline Content] Processing text correction request', {
    requestId,
    functionType: functionType,
    shortcut: shortcutPressed,
    inputId,
    inputType: activeElement.tagName,
    textLength: text.length,
    textPreview: text.substring(0, 50) + (text.length > 50 ? '...' : ''),
    provider: settings.provider,
    model: settings.model
  });
  
  // Save request info locally
  activeInputs.set(requestId, {
    inputId,
    element: activeElement,
    originalText: text,
    timestamp: Date.now()
  });
  
  // Show spinner
  showSpinner(activeElement);
  
  // Send request to background script
  // Note: We don't wait for a response here - the result comes via onMessage listener
  chrome.runtime.sendMessage({
    type: 'correctText',
    provider: settings.provider,
    apiKey: settings.apiKey,
    model: settings.model,
    text: text,
    functionType: functionType,
    requestId: requestId,
    inputId: inputId,
    url: window.location.href
  }, (response) => {
    // Handle immediate errors only (like connection issues)
    // Note: "The message port closed before a response was received" is expected
    // because we return false from the background handler. The actual response comes via onMessage.
    if (chrome.runtime.lastError) {
      const errorMessage = chrome.runtime.lastError.message || String(chrome.runtime.lastError);
      
      // "Message port closed" is expected - the background returns false and sends response via onMessage
      if (errorMessage.includes('message port closed') || errorMessage.includes('port closed')) {
        console.log('[Inline Content] Correction request sent (port closed is expected)', {
          requestId: String(requestId),
          note: 'Response will come via onMessage listener'
        });
        return; // Don't delete the request - response is coming via onMessage
      }
      
      // Real connection errors
      console.error('[Inline Content] Error sending correction request', {
        requestId: String(requestId),
        error: errorMessage,
        errorObject: chrome.runtime.lastError,
        hasRequestInfo: activeInputs.has(requestId)
      });
      // Clean up the request only on real errors
      const requestInfo = activeInputs.get(requestId);
      if (requestInfo && requestInfo.element) {
        hideSpinner(requestInfo.element);
      }
      activeInputs.delete(requestId);
      return;
    }
    
    // If there's an immediate error response (like unknown provider)
    if (response && response.error) {
      const errorMessage = typeof response.error === 'string' ? response.error : JSON.stringify(response.error);
      console.error('[Inline Content] Immediate error response', {
        requestId: String(requestId),
        error: errorMessage,
        errorObject: response.error,
        fullResponse: response,
        hasRequestInfo: activeInputs.has(requestId)
      });
      const requestInfo = activeInputs.get(requestId);
      if (requestInfo && requestInfo.element) {
        hideSpinner(requestInfo.element);
      }
      activeInputs.delete(requestId);
      return;
    }
    
    // Success - request was received (actual result comes via onMessage)
    console.log('[Inline Content] Correction request sent successfully', {
      requestId
    });
  });
}

// Listen for responses from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'textCorrectionError') {
    const { requestId, error } = message;
    console.error('[Inline Content] Received error from background', {
      requestId,
      error
    });
    
    const requestInfo = activeInputs.get(requestId);
    if (requestInfo) {
      if (requestInfo.element) {
        hideSpinner(requestInfo.element);
      }
      activeInputs.delete(requestId);
    }
    return false; // Synchronous handler, no async response needed
  }
  
  if (message.type === 'textCorrected') {
    const { requestId, correctedText } = message;
    const requestIdStr = String(requestId);
    
    console.log('[Inline Content] Received corrected text from background', {
      requestId: requestIdStr,
      requestIdType: typeof requestId,
      correctedTextLength: correctedText ? correctedText.length : 0,
      correctedPreview: correctedText ? correctedText.substring(0, 50) + (correctedText.length > 50 ? '...' : '') : 'null',
      activeRequestsCount: activeInputs.size,
      activeRequestIds: Array.from(activeInputs.keys()).map(id => String(id))
    });
    
    // Try to find request by string comparison as well
    let requestInfo = activeInputs.get(requestId);
    if (!requestInfo && requestIdStr) {
      // Try finding by string comparison
      for (const [reqId, reqInfo] of activeInputs.entries()) {
        if (String(reqId) === requestIdStr) {
          requestInfo = reqInfo;
          console.log('[Inline Content] Found request by string comparison', {
            originalRequestId: requestId,
            foundRequestId: reqId
          });
          break;
        }
      }
    }
    
    if (!requestInfo) {
      console.warn('[Inline Content] Received correction but no matching request found', {
        requestId: requestIdStr,
        requestIdType: typeof requestId,
        activeRequestsCount: activeInputs.size,
        activeRequestIds: Array.from(activeInputs.keys()).map(id => ({ id: String(id), type: typeof id }))
      });
      // Hide spinner if we can find the element by checking all active requests
      for (const [reqId, reqInfo] of activeInputs.entries()) {
        if (reqInfo && reqInfo.element) {
          hideSpinner(reqInfo.element);
        }
      }
      return false; // Synchronous handler, no async response needed
    }
    
    if (!requestInfo.element) {
      console.warn('[Inline Content] Request info exists but element is missing', {
        requestId,
        inputId: requestInfo.inputId
      });
      activeInputs.delete(requestId);
      return false; // Synchronous handler, no async response needed
    }
    
    // Verify the element still exists and is the same
    const currentId = getInputId(requestInfo.element);
    if (currentId === requestInfo.inputId) {
      // Hide spinner before updating text
      hideSpinner(requestInfo.element);
      
      const originalText = requestInfo.originalText;
      console.log('[Inline Content] Applying corrected text to input', {
        requestId,
        originalLength: originalText.length,
        correctedLength: correctedText.length,
        inputId: requestInfo.inputId
      });
      
      setInputText(requestInfo.element, correctedText);
      activeInputs.delete(requestId);
      
      console.log('[Inline Content] Text correction completed successfully', {
        requestId,
        originalPreview: originalText.substring(0, 30) + '...',
        correctedPreview: correctedText.substring(0, 30) + '...'
      });
    } else {
      console.warn('[Inline Content] Input element ID mismatch, not applying correction', {
        requestId,
        expectedId: requestInfo.inputId,
        currentId: currentId
      });
      // Hide spinner even if element ID doesn't match
      if (requestInfo.element) {
        hideSpinner(requestInfo.element);
      }
      activeInputs.delete(requestId);
    }
    return false; // Synchronous handler, no async response needed
  }
  
  if (message.type === 'settingsUpdated') {
    console.log('[Inline Content] Settings updated, reloading...');
    loadSettings();
    return false; // Synchronous handler, no async response needed
  }
  
  if (message.type === 'extensionInstalled') {
    console.log('[Inline Content] Extension installed/updated, reloading content script', {
      reason: message.reason
    });
    // Reload settings and reinitialize
    loadSettings();
    return false; // Synchronous handler, no async response needed
  }
  
  return false; // Default: synchronous handler
});

// Monitor for new inputs added dynamically
const observer = new MutationObserver(() => {
  // Just ensure we can find inputs when needed
});

observer.observe(document.body, {
  childList: true,
  subtree: true
});

// Initialize - Content script launched
console.log('[Inline Content] 🚀 Content script launched', {
  url: window.location.href,
  defaultShortcuts: {
    fix_language: DEFAULT_SHORTCUTS.fix_language.join('+'),
    rephrase: DEFAULT_SHORTCUTS.rephrase_as_friendly_and_professional.join('+')
  },
  platform: 'Mac',
  timestamp: new Date().toISOString()
});
loadSettings();

// Listen for keyboard events
document.addEventListener('keydown', handleShortcut, true);

// Also listen for storage changes to update settings
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'sync') {
    loadSettings();
  }
});

