// Default keyboard shortcuts for each function
const DEFAULT_SHORTCUTS = {
  fix_language: ['Meta', 'Control', 'Shift', 'T'],
  rephrase_as_friendly_and_professional: ['Meta', 'Control', 'Shift', 'R']
};

// Provider configurations
const PROVIDERS = {
  // Free Providers
  'cohere-free': {
    name: 'Cohere',
    apiBase: 'https://api.cohere.ai/v1',
    modelsEndpoint: '/models',
    chatEndpoint: '/generate',
    isFree: true,
    headers: () => ({
      'Content-Type': 'application/json'
    })
  },
  'google-free': {
    name: 'Google Gemini',
    apiBase: 'https://generativelanguage.googleapis.com/v1beta',
    modelsEndpoint: '/models',
    chatEndpoint: '/models/{model}:generateContent',
    isFree: true,
    headers: () => ({
      'Content-Type': 'application/json'
    })
  },
  'groq': {
    name: 'Groq',
    apiBase: 'https://api.groq.com/openai/v1',
    modelsEndpoint: '/models',
    chatEndpoint: '/chat/completions',
    isFree: true,
    headers: () => ({
      'Content-Type': 'application/json'
    })
  },
  'huggingface': {
    name: 'Hugging Face',
    apiBase: 'https://api-inference.huggingface.co',
    modelsEndpoint: '/models',
    chatEndpoint: '/models/{model}',
    isFree: true,
    headers: () => ({
      'Content-Type': 'application/json'
    })
  },
  'together': {
    name: 'Together AI',
    apiBase: 'https://api.together.xyz/v1',
    modelsEndpoint: '/models',
    chatEndpoint: '/chat/completions',
    isFree: true,
    headers: () => ({
      'Content-Type': 'application/json'
    })
  },
  // Paid Providers
  anthropic: {
    name: 'Anthropic (Claude)',
    apiBase: 'https://api.anthropic.com/v1',
    modelsEndpoint: '/messages',
    chatEndpoint: '/messages',
    isFree: false,
    headers: (apiKey) => ({
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
      'Content-Type': 'application/json'
    })
  },
  mistral: {
    name: 'Mistral AI',
    apiBase: 'https://api.mistral.ai/v1',
    modelsEndpoint: '/models',
    chatEndpoint: '/chat/completions',
    isFree: false,
    headers: (apiKey) => ({
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    })
  },
  openai: {
    name: 'OpenAI',
    apiBase: 'https://api.openai.com/v1',
    modelsEndpoint: '/models',
    chatEndpoint: '/chat/completions',
    isFree: false,
    headers: (apiKey) => ({
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    })
  },
  perplexity: {
    name: 'Perplexity',
    apiBase: 'https://api.perplexity.ai',
    modelsEndpoint: '/models',
    chatEndpoint: '/chat/completions',
    isFree: false,
    headers: (apiKey) => ({
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    })
  }
};

// Default models for each provider
// Models are ordered with cheapest/smallest models LAST (they will be used as defaults)
const DEFAULT_MODELS = {
  'cohere-free': ['command', 'command-light'], // command-light is cheaper
  'google-free': ['gemini-pro-vision', 'gemini-pro'], // gemini-pro is cheaper
  'groq': ['llama-3-70b-8192', 'mixtral-8x7b-32768', 'gemma-7b-it'], // gemma-7b-it is smallest/cheapest
  'huggingface': ['mistralai/Mistral-7B-Instruct-v0.1', 'meta-llama/Llama-2-7b-chat-hf'], // Llama-2-7b is smaller
  'together': ['mistralai/Mixtral-8x7B-Instruct-v0.1', 'meta-llama/Llama-2-70b-chat-hf'], // Llama-2-70b is cheaper
  openai: ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo'], // gpt-3.5-turbo is cheapest
  anthropic: ['claude-3-5-sonnet-20241022', 'claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307'], // haiku is cheapest
  mistral: ['mistral-large-latest', 'mistral-medium-latest', 'mistral-small-latest'], // small is cheapest
  perplexity: ['llama-3.1-sonar-large-128k-online', 'llama-3.1-sonar-small-128k-online'] // small is cheaper
};

// DOM elements
const providerSelect = document.getElementById('providerSelect');
const apiKeyInput = document.getElementById('apiKey');
const toggleKeyBtn = document.getElementById('toggleKey');
const modelSelect = document.getElementById('model');
const refreshModelsBtn = document.getElementById('refreshModels');
const shortcutFixLanguageInput = document.getElementById('shortcutFixLanguage');
const clearShortcutFixLanguageBtn = document.getElementById('clearShortcutFixLanguage');
const shortcutRephraseInput = document.getElementById('shortcutRephrase');
const clearShortcutRephraseBtn = document.getElementById('clearShortcutRephrase');
const saveBtn = document.getElementById('save');
const statusDiv = document.getElementById('status');

let shortcutKeys = {
  fix_language: [...DEFAULT_SHORTCUTS.fix_language],
  rephrase_as_friendly_and_professional: [...DEFAULT_SHORTCUTS.rephrase_as_friendly_and_professional]
};

// Default values
const DEFAULT_PROVIDER = 'google-free'; // Free provider by default
const DEFAULT_API_KEYS = {
  anthropic: '', // Users should enter their own API key (use update-api-key.js script to load from .env for local dev)
  openai: '',
  mistral: '',
  perplexity: ''
};

// Helper function to get API key storage key for a provider
function getApiKeyStorageKey(provider) {
  return `apiKey_${provider}`;
}

// Load saved settings
async function loadSettings() {
  const provider = providerSelect.value || DEFAULT_PROVIDER;
  
  // Get all settings including provider-specific API keys and function shortcuts
  const allKeys = ['provider', 'model', 'shortcuts'];
  // Add API key keys for all providers
  const allProviders = Object.keys(PROVIDERS);
  allProviders.forEach(p => allKeys.push(getApiKeyStorageKey(p)));
  
  const result = await chrome.storage.sync.get(allKeys);
  
  // Set provider with default fallback
  providerSelect.value = result.provider || DEFAULT_PROVIDER;
  const currentProvider = providerSelect.value;
  
  // Load API key for current provider
  const apiKeyKey = getApiKeyStorageKey(currentProvider);
  const savedApiKey = result[apiKeyKey];
  const defaultApiKey = DEFAULT_API_KEYS[currentProvider] || '';
  // Use saved API key if it exists and is not empty, otherwise use default
  // Check if savedApiKey is undefined, null, or empty string
  if (savedApiKey !== undefined && savedApiKey !== null && savedApiKey.trim() !== '') {
    apiKeyInput.value = savedApiKey;
  } else {
    apiKeyInput.value = defaultApiKey;
    // If we're using the default and it's not empty, save it
    if (defaultApiKey && defaultApiKey.trim() !== '') {
      const settingsToSave = {};
      settingsToSave[apiKeyKey] = defaultApiKey;
      await chrome.storage.sync.set(settingsToSave);
    }
  }
  
  // Model will be set in loadModels() - it will use the cheapest (last) model as default
  
  // Load shortcuts with default fallback
  if (result.shortcuts && typeof result.shortcuts === 'object') {
    shortcutKeys = {
      fix_language: result.shortcuts.fix_language || [...DEFAULT_SHORTCUTS.fix_language],
      rephrase_as_friendly_and_professional: result.shortcuts.rephrase_as_friendly_and_professional || [...DEFAULT_SHORTCUTS.rephrase_as_friendly_and_professional]
    };
  } else if (result.shortcut && Array.isArray(result.shortcut) && result.shortcut.length > 0) {
    // Migrate old single shortcut if it exists
    shortcutKeys.fix_language = result.shortcut;
  }
  updateShortcutDisplay();
  
  // If no settings were saved, save the defaults
  if (!result.provider || !result.shortcuts) {
    const defaultSettings = {
      provider: DEFAULT_PROVIDER,
      shortcuts: shortcutKeys
    };
    
    // Set default API keys for all providers (only if not already set)
    const allProviders = Object.keys(PROVIDERS);
    allProviders.forEach(p => {
      const key = getApiKeyStorageKey(p);
      if (result[key] === undefined) {
        defaultSettings[key] = DEFAULT_API_KEYS[p] || '';
      }
    });
    
    await chrome.storage.sync.set(defaultSettings);
  }
  
  // Always show API key section for all providers
  const apiKeySection = apiKeyInput.closest('.section');
  apiKeySection.style.display = 'block';
  apiKeyInput.placeholder = 'Enter your API key';
  apiKeyInput.disabled = false;
  
  // Load models for current provider
  await loadModels();
}

// Load models for the selected provider
async function loadModels() {
  const provider = providerSelect.value;
  const apiKey = apiKeyInput.value;
  
  modelSelect.innerHTML = '<option value="">Select a model...</option>';
  
  // When no API key, show default models
  if (!apiKey) {
    const defaultModels = DEFAULT_MODELS[provider] || [];
    defaultModels.forEach(model => {
      const option = document.createElement('option');
      option.value = model;
      option.textContent = model;
      modelSelect.appendChild(option);
    });
    
    // Set default to the last default model (cheapest) if no model is saved or saved model not available
    const result = await chrome.storage.sync.get(['model']);
    if (defaultModels.length > 0) {
      const lastModel = defaultModels[defaultModels.length - 1];
      // Use saved model if it exists in the list, otherwise use cheapest (last)
      if (result.model && defaultModels.includes(result.model)) {
        modelSelect.value = result.model;
      } else {
        // Set to cheapest (last) model
        modelSelect.value = lastModel;
        await chrome.storage.sync.set({ model: lastModel });
        console.log('[Inline Popup] Set default model to cheapest (last in default list)', {
          model: lastModel,
          provider: provider,
          hadSavedModel: !!result.model
        });
      }
    }
    
    // Without API key, just show defaults
    return;
  }
  
  try {
    const models = await fetchModels(provider, apiKey);
    models.forEach(model => {
      const option = document.createElement('option');
      option.value = model;
      option.textContent = model;
      modelSelect.appendChild(option);
    });
    
    // Restore selected model if it exists and is still available, otherwise use the last (cheapest) model as default
    const result = await chrome.storage.sync.get(['model']);
    if (models.length > 0) {
      const lastModel = models[models.length - 1];
      if (result.model && models.includes(result.model)) {
        modelSelect.value = result.model;
      } else {
        // Always set to last (cheapest) model as default if no saved model or saved model not available
        modelSelect.value = lastModel;
        // Save it to storage
        await chrome.storage.sync.set({ model: lastModel });
        console.log('[Inline Popup] Set default model to cheapest (last in list)', {
          model: lastModel,
          totalModels: models.length,
          provider: provider,
          hadSavedModel: !!result.model
        });
      }
    }
  } catch (error) {
    // Silently fallback to default models - don't show error if API key might not be set yet
    console.log('[Inline Popup] Could not fetch models from API, using defaults', {
      provider,
      hasApiKey: !!apiKey,
      error: error.message
    });
    // Fallback to default models
    const defaultModels = DEFAULT_MODELS[provider] || [];
    defaultModels.forEach(model => {
      const option = document.createElement('option');
      option.value = model;
      option.textContent = model;
      modelSelect.appendChild(option);
    });
    
    // Set default to the last default model (cheapest) if no model is saved or saved model not available
    const result = await chrome.storage.sync.get(['model']);
    if (defaultModels.length > 0) {
      const lastModel = defaultModels[defaultModels.length - 1];
      // Use saved model if it exists in the list, otherwise use cheapest (last)
      if (result.model && defaultModels.includes(result.model)) {
        modelSelect.value = result.model;
      } else {
        // Set to cheapest (last) model
        modelSelect.value = lastModel;
        await chrome.storage.sync.set({ model: lastModel });
        console.log('[Inline Popup] Set default model to cheapest (last in default list)', {
          model: lastModel,
          provider: provider
        });
      }
    } else if (!result.model) {
      // No default models and no saved model - this shouldn't happen, but handle it
      console.warn('[Inline Popup] No default models available for provider', { provider });
    }
  }
}

// Fetch models from API
async function fetchModels(provider, apiKey) {
  const providerConfig = PROVIDERS[provider];
  if (!providerConfig) {
    throw new Error('Unknown provider');
  }
  
  // Free providers don't fetch from API, use defaults
  if (providerConfig.isFree) {
    return DEFAULT_MODELS[provider] || [];
  }
  
  try {
    let url = providerConfig.apiBase + providerConfig.modelsEndpoint;
    
    if (provider === 'google-free' || provider === 'google') {
      url += `?key=${apiKey}`;
    }
    
    const headers = providerConfig.headers(apiKey);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: headers
    });
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Parse response based on provider
    if (provider === 'openai' || provider === 'mistral' || provider === 'perplexity') {
      return data.data.map(m => m.id).filter(id => id.includes('gpt') || id.includes('claude') || id.includes('mistral') || id.includes('llama') || id.includes('sonar'));
    } else if (provider === 'anthropic') {
      // Anthropic doesn't have a models endpoint, return defaults
      return DEFAULT_MODELS.anthropic;
    } else if (provider === 'google-free' || provider === 'google') {
      return data.models ? data.models.map(m => m.name.split('/').pop()) : DEFAULT_MODELS['google-free'] || DEFAULT_MODELS.google;
    } else if (provider === 'cohere-free' || provider === 'cohere') {
      return data.models ? data.models.map(m => m.name) : DEFAULT_MODELS['cohere-free'] || DEFAULT_MODELS.cohere;
    }
    
    return DEFAULT_MODELS[provider] || [];
  } catch (error) {
    // Only log if we actually have an API key (user might be configuring)
    if (apiKey) {
      console.log('[Inline Popup] Error fetching models from API, using defaults', {
        provider,
        error: error.message
      });
    }
    // Return default models as fallback
    return DEFAULT_MODELS[provider] || [];
  }
}

// Update shortcut display
function updateShortcutDisplay() {
  shortcutFixLanguageInput.value = shortcutKeys.fix_language.join(' + ');
  shortcutRephraseInput.value = shortcutKeys.rephrase_as_friendly_and_professional.join(' + ');
}

// Handle keyboard shortcut input for Fix Language
shortcutFixLanguageInput.addEventListener('keydown', (e) => {
  e.preventDefault();
  const keys = [];
  
  if (e.metaKey) keys.push('Meta');
  if (e.ctrlKey) keys.push('Control');
  if (e.shiftKey) keys.push('Shift');
  
  const key = e.key;
  if (key !== 'Meta' && key !== 'Control' && key !== 'Shift') {
    keys.push(key.length === 1 ? key.toUpperCase() : key);
  }
  
  shortcutKeys.fix_language = keys;
  updateShortcutDisplay();
});

clearShortcutFixLanguageBtn.addEventListener('click', () => {
  shortcutKeys.fix_language = [...DEFAULT_SHORTCUTS.fix_language];
  updateShortcutDisplay();
});

// Handle keyboard shortcut input for Rephrase
shortcutRephraseInput.addEventListener('keydown', (e) => {
  e.preventDefault();
  const keys = [];
  
  if (e.metaKey) keys.push('Meta');
  if (e.ctrlKey) keys.push('Control');
  if (e.shiftKey) keys.push('Shift');
  
  const key = e.key;
  if (key !== 'Meta' && key !== 'Control' && key !== 'Shift') {
    keys.push(key.length === 1 ? key.toUpperCase() : key);
  }
  
  shortcutKeys.rephrase_as_friendly_and_professional = keys;
  updateShortcutDisplay();
});

clearShortcutRephraseBtn.addEventListener('click', () => {
  shortcutKeys.rephrase_as_friendly_and_professional = [...DEFAULT_SHORTCUTS.rephrase_as_friendly_and_professional];
  updateShortcutDisplay();
});

// Toggle API key visibility
toggleKeyBtn.addEventListener('click', () => {
  if (apiKeyInput.type === 'password') {
    apiKeyInput.type = 'text';
    toggleKeyBtn.textContent = 'Hide';
  } else {
    apiKeyInput.type = 'password';
    toggleKeyBtn.textContent = 'Show';
  }
});


// Refresh models button
refreshModelsBtn.addEventListener('click', async () => {
  showStatus('Loading models...', 'info');
  await loadModels();
  showStatus('Models refreshed', 'success');
  setTimeout(() => hideStatus(), 2000);
});

// Provider change handler - load provider-specific API key
providerSelect.addEventListener('change', async () => {
  const provider = providerSelect.value;
  
  // Load API key for the selected provider
  const apiKeyKey = getApiKeyStorageKey(provider);
  const result = await chrome.storage.sync.get([apiKeyKey]);
  const savedApiKey = result[apiKeyKey];
  const defaultApiKey = DEFAULT_API_KEYS[provider] || '';
  // Use saved API key if it exists and is not empty, otherwise use default
  // Check if savedApiKey is undefined, null, or empty string
  if (savedApiKey !== undefined && savedApiKey !== null && savedApiKey.trim() !== '') {
    apiKeyInput.value = savedApiKey;
  } else {
    apiKeyInput.value = defaultApiKey;
    // If we're using the default and it's not empty, save it
    if (defaultApiKey && defaultApiKey.trim() !== '') {
      const settingsToSave = {};
      settingsToSave[apiKeyKey] = defaultApiKey;
      await chrome.storage.sync.set(settingsToSave);
    }
  }
  
  // Always show API key section for all providers
  const apiKeySection = apiKeyInput.closest('.section');
  apiKeySection.style.display = 'block';
  apiKeyInput.placeholder = 'Enter your API key';
  apiKeyInput.disabled = false;
  
  await loadModels();
});

// Save settings
saveBtn.addEventListener('click', async () => {
  const provider = providerSelect.value;
  const apiKey = apiKeyInput.value;
  const model = modelSelect.value;
  
  // Require API key for all providers
  if (!apiKey) {
    showStatus('Please enter an API key', 'error');
    return;
  }
  
  if (!model) {
    showStatus('Please select a model', 'error');
    return;
  }
  
  // Validate shortcuts
  if (shortcutKeys.fix_language.length === 0 || shortcutKeys.rephrase_as_friendly_and_professional.length === 0) {
    showStatus('Please set all keyboard shortcuts', 'error');
    return;
  }
  
  // Save settings - store API key per provider
  const settingsToSave = {
    provider,
    model,
    shortcuts: shortcutKeys
  };
  
  // Save API key for the current provider (always save, even if empty)
  const apiKeyKey = getApiKeyStorageKey(provider);
  settingsToSave[apiKeyKey] = apiKey.trim();
  
  await chrome.storage.sync.set(settingsToSave);
  
  console.log('[Inline Popup] Settings saved', {
    provider,
    hasApiKey: !!apiKey,
    model,
    apiKeyKey: apiKeyKey
  });
  
  showStatus('Settings saved successfully!', 'success');
  setTimeout(() => hideStatus(), 2000);
});

// Status messages
function showStatus(message, type) {
  statusDiv.textContent = message;
  statusDiv.className = `status ${type}`;
}

function hideStatus() {
  statusDiv.className = 'status';
  statusDiv.textContent = '';
}

// Initialize collapsible sections
function initCollapsibleSections() {
  const llmProviderHeader = document.getElementById('llmProviderHeader');
  const functionsHeader = document.getElementById('functionsHeader');
  const allSections = document.querySelectorAll('.collapsible-section');
  
  // Toggle LLM Provider section (accordion behavior)
  llmProviderHeader.addEventListener('click', () => {
    const section = llmProviderHeader.closest('.collapsible-section');
    const isCurrentlyCollapsed = section.classList.contains('collapsed');
    
    // Close all sections first
    allSections.forEach(s => s.classList.add('collapsed'));
    
    // If the clicked section was collapsed, open it
    if (isCurrentlyCollapsed) {
      section.classList.remove('collapsed');
    }
  });
  
  // Toggle Functions section (accordion behavior)
  functionsHeader.addEventListener('click', () => {
    const section = functionsHeader.closest('.collapsible-section');
    const isCurrentlyCollapsed = section.classList.contains('collapsed');
    
    // Close all sections first
    allSections.forEach(s => s.classList.add('collapsed'));
    
    // If the clicked section was collapsed, open it
    if (isCurrentlyCollapsed) {
      section.classList.remove('collapsed');
    }
  });
}

// Initialize
initCollapsibleSections();
loadSettings();
