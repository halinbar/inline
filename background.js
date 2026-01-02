console.log('[Inline Background] Service worker initialized');

// Function to reload content scripts in all tabs
function reloadContentScripts(reason = 'service_worker_started') {
  console.log('[Inline Background] Reloading content scripts in all tabs', {
    reason: reason
  });
  
  chrome.tabs.query({}, (tabs) => {
    console.log('[Inline Background] Notifying all tabs to reload content scripts', {
      totalTabs: tabs.length,
      reason: reason
    });
    
    let successCount = 0;
    let errorCount = 0;
    
    tabs.forEach(tab => {
      // Send reload message to content script
      chrome.tabs.sendMessage(tab.id, {
        type: 'extensionInstalled',
        reason: reason
      }).then(() => {
        successCount++;
        console.log('[Inline Background] Successfully notified tab to reload', {
          tabId: tab.id,
          url: tab.url
        });
      }).catch((err) => {
        errorCount++;
        // Ignore errors for tabs without content script (this is expected)
        if (err.message && !err.message.includes('Could not establish connection')) {
          console.warn('[Inline Background] Failed to notify tab', {
            tabId: tab.id,
            url: tab.url,
            error: err.message
          });
        }
      });
    });
    
    // Log summary after a short delay
    setTimeout(() => {
      console.log('[Inline Background] Content script reload summary', {
        totalTabs: tabs.length,
        successful: successCount,
        errors: errorCount,
        reason: reason
      });
    }, 500);
  });
}

// Reload content scripts when extension is installed, updated, or reinstalled
chrome.runtime.onInstalled.addListener((details) => {
  console.log('[Inline Background] Extension installed/updated', {
    reason: details.reason,
    previousVersion: details.previousVersion
  });
  
  reloadContentScripts(details.reason);
});

// Also reload content scripts when service worker starts (covers developer reloads)
// This ensures content scripts reload even when extension is reloaded in developer mode
reloadContentScripts('service_worker_started');

// Prompts dictionary
const PROMPTS = {
  fix_language: "Correct the spelling and grammar in the following text without changing its meaning or tone. Return ONLY the corrected text with no additional commentary, explanations, or phrases like \"here is\" or \"corrected text:\".\n\n",
  rephrase_as_friendly_and_professional: "Rephrase the following text in a friendly yet professional manner. Return ONLY the corrected text with no additional commentary, explanations, or phrases like \"here is\" or \"corrected text:\".\n\n"
};

// API request handlers for different providers
const API_HANDLERS = {
  openai: async (apiKey, model, text) => {
    const url = 'https://api.openai.com/v1/chat/completions';
    const requestBody = {
      model: model,
        messages: [
          {
            role: 'user',
            content: `${prompt}${text}`
          }
        ],
      temperature: 0.3,
      max_tokens: 2000
    };
    const requestHeaders = {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    };
    
    console.log('[Inline Background] 📤 OpenAI API REQUEST DISPATCHED', {
      provider: 'openai',
      url: url,
      method: 'POST',
      model: model,
      textLength: text.length,
      textPreview: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
      headers: { ...requestHeaders, 'Authorization': 'Bearer ***' }, // Hide API key in logs
      body: requestBody,
      timestamp: new Date().toISOString()
    });
    
    const response = await fetch(url, {
      method: 'POST',
      headers: requestHeaders,
      body: JSON.stringify(requestBody)
    });
    
    // Log response received
    const responseHeaders = {};
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });
    
    console.log('[Inline Background] 📥 OpenAI API RESPONSE RECEIVED', {
      provider: 'openai',
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
      ok: response.ok,
      timestamp: new Date().toISOString()
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      const errorMessage = error.error?.message || `API error: ${response.status}`;
      console.error('[Inline Background] ❌ OpenAI API REQUEST FAILED', {
        provider: 'openai',
        status: response.status,
        statusText: response.statusText,
        error: errorMessage,
        errorDetails: error,
        responseBody: error
      });
      throw new Error(errorMessage);
    }
    
    const data = await response.json();
    const correctedText = data.choices[0].message.content.trim();
    console.log('[Inline Background] ✅ OpenAI API REQUEST SUCCEEDED', {
      provider: 'openai',
      model: model,
      responseLength: correctedText.length,
      responsePreview: correctedText.substring(0, 100) + (correctedText.length > 100 ? '...' : ''),
      usage: data.usage,
      responseBody: data,
      timestamp: new Date().toISOString()
    });
    return correctedText;
  },
  
  anthropic: async (apiKey, model, text, prompt) => {
    const url = 'https://api.anthropic.com/v1/messages';
    const requestBody = {
      model: model,
      max_tokens: 2000,
        messages: [
          {
            role: 'user',
            content: `${prompt}${text}`
          }
        ]
    };
    const requestHeaders = {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
      'Content-Type': 'application/json'
    };
    
    console.log('[Inline Background] 📤 Anthropic API REQUEST DISPATCHED', {
      provider: 'anthropic',
      url: url,
      method: 'POST',
      model: model,
      textLength: text.length,
      textPreview: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
      headers: { ...requestHeaders, 'x-api-key': '***' }, // Hide API key in logs
      body: requestBody,
      timestamp: new Date().toISOString()
    });
    
    const response = await fetch(url, {
      method: 'POST',
      headers: requestHeaders,
      body: JSON.stringify(requestBody)
    });
    
    // Log response received
    const responseHeaders = {};
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });
    
    console.log('[Inline Background] 📥 Anthropic API RESPONSE RECEIVED', {
      provider: 'anthropic',
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
      ok: response.ok,
      timestamp: new Date().toISOString()
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      const errorMessage = error.error?.message || `API error: ${response.status}`;
      console.error('[Inline Background] ❌ Anthropic API REQUEST FAILED', {
        provider: 'anthropic',
        status: response.status,
        statusText: response.statusText,
        error: errorMessage,
        errorDetails: error,
        responseBody: error
      });
      throw new Error(errorMessage);
    }
    
    const data = await response.json();
    const correctedText = data.content[0].text.trim();
    console.log('[Inline Background] ✅ Anthropic API REQUEST SUCCEEDED', {
      provider: 'anthropic',
      model: model,
      responseLength: correctedText.length,
      responsePreview: correctedText.substring(0, 100) + (correctedText.length > 100 ? '...' : ''),
      usage: data.usage,
      responseBody: data,
      timestamp: new Date().toISOString()
    });
    return correctedText;
  },
  
  google: async (apiKey, model, text, prompt) => {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const requestBody = {
      contents: [{
        parts: [{
          text: `${prompt}${text}`
        }]
      }],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 2000
      }
    };
    const requestHeaders = {
      'Content-Type': 'application/json'
    };
    
    console.log('[Inline Background] 📤 Google API REQUEST DISPATCHED', {
      provider: 'google',
      url: url.replace(`key=${apiKey}`, 'key=***'), // Hide API key in logs
      method: 'POST',
      model: model,
      textLength: text.length,
      textPreview: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
      headers: requestHeaders,
      body: requestBody,
      timestamp: new Date().toISOString()
    });
    
    const response = await fetch(url, {
      method: 'POST',
      headers: requestHeaders,
      body: JSON.stringify(requestBody)
    });
    
    // Log response received
    const responseHeaders = {};
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });
    
    console.log('[Inline Background] 📥 Google API RESPONSE RECEIVED', {
      provider: 'google',
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
      ok: response.ok,
      timestamp: new Date().toISOString()
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      const errorMessage = error.error?.message || `API error: ${response.status}`;
      console.error('[Inline Background] ❌ Google API REQUEST FAILED', {
        provider: 'google',
        status: response.status,
        statusText: response.statusText,
        error: errorMessage,
        errorDetails: error,
        responseBody: error
      });
      throw new Error(errorMessage);
    }
    
    const data = await response.json();
    const correctedText = data.candidates[0].content.parts[0].text.trim();
    console.log('[Inline Background] ✅ Google API REQUEST SUCCEEDED', {
      provider: 'google',
      model: model,
      responseLength: correctedText.length,
      responsePreview: correctedText.substring(0, 100) + (correctedText.length > 100 ? '...' : ''),
      responseBody: data,
      timestamp: new Date().toISOString()
    });
    return correctedText;
  },
  
  mistral: async (apiKey, model, text, prompt) => {
    const url = 'https://api.mistral.ai/v1/chat/completions';
    const requestBody = {
      model: model,
        messages: [
          {
            role: 'user',
            content: `${prompt}${text}`
          }
        ],
      temperature: 0.3,
      max_tokens: 2000
    };
    const requestHeaders = {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    };
    
    console.log('[Inline Background] 📤 Mistral API REQUEST DISPATCHED', {
      provider: 'mistral',
      url: url,
      method: 'POST',
      model: model,
      textLength: text.length,
      textPreview: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
      headers: { ...requestHeaders, 'Authorization': 'Bearer ***' },
      body: requestBody,
      timestamp: new Date().toISOString()
    });
    
    const response = await fetch(url, {
      method: 'POST',
      headers: requestHeaders,
      body: JSON.stringify(requestBody)
    });
    
    const responseHeaders = {};
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });
    
    console.log('[Inline Background] 📥 Mistral API RESPONSE RECEIVED', {
      provider: 'mistral',
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
      ok: response.ok,
      timestamp: new Date().toISOString()
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      const errorMessage = error.error?.message || `API error: ${response.status}`;
      console.error('[Inline Background] ❌ Mistral API REQUEST FAILED', {
        provider: 'mistral',
        status: response.status,
        statusText: response.statusText,
        error: errorMessage,
        errorDetails: error,
        responseBody: error
      });
      throw new Error(errorMessage);
    }
    
    const data = await response.json();
    const correctedText = data.choices[0].message.content.trim();
    console.log('[Inline Background] ✅ Mistral API REQUEST SUCCEEDED', {
      provider: 'mistral',
      model: model,
      responseLength: correctedText.length,
      responsePreview: correctedText.substring(0, 100) + (correctedText.length > 100 ? '...' : ''),
      usage: data.usage,
      responseBody: data,
      timestamp: new Date().toISOString()
    });
    return correctedText;
  },
  
  cohere: async (apiKey, model, text, prompt) => {
    const url = 'https://api.cohere.ai/v1/generate';
    const requestBody = {
      model: model,
      prompt: `${prompt}${text}`,
      temperature: 0.3,
      max_tokens: 2000
    };
    const requestHeaders = {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    };
    
    console.log('[Inline Background] 📤 Cohere API REQUEST DISPATCHED', {
      provider: 'cohere',
      url: url,
      method: 'POST',
      model: model,
      textLength: text.length,
      textPreview: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
      headers: { ...requestHeaders, 'Authorization': 'Bearer ***' },
      body: requestBody,
      timestamp: new Date().toISOString()
    });
    
    const response = await fetch(url, {
      method: 'POST',
      headers: requestHeaders,
      body: JSON.stringify(requestBody)
    });
    
    const responseHeaders = {};
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });
    
    console.log('[Inline Background] 📥 Cohere API RESPONSE RECEIVED', {
      provider: 'cohere',
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
      ok: response.ok,
      timestamp: new Date().toISOString()
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      const errorMessage = error.error?.message || `API error: ${response.status}`;
      console.error('[Inline Background] ❌ Cohere API REQUEST FAILED', {
        provider: 'cohere',
        status: response.status,
        statusText: response.statusText,
        error: errorMessage,
        errorDetails: error,
        responseBody: error
      });
      throw new Error(errorMessage);
    }
    
    const data = await response.json();
    const correctedText = data.generations[0].text.trim();
    console.log('[Inline Background] ✅ Cohere API REQUEST SUCCEEDED', {
      provider: 'cohere',
      model: model,
      responseLength: correctedText.length,
      responsePreview: correctedText.substring(0, 100) + (correctedText.length > 100 ? '...' : ''),
      responseBody: data,
      timestamp: new Date().toISOString()
    });
    return correctedText;
  },
  
  perplexity: async (apiKey, model, text, prompt) => {
    const url = 'https://api.perplexity.ai/chat/completions';
    const requestBody = {
      model: model,
        messages: [
          {
            role: 'user',
            content: `${prompt}${text}`
          }
        ],
      temperature: 0.3,
      max_tokens: 2000
    };
    const requestHeaders = {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    };
    
    console.log('[Inline Background] 📤 Perplexity API REQUEST DISPATCHED', {
      provider: 'perplexity',
      url: url,
      method: 'POST',
      model: model,
      textLength: text.length,
      textPreview: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
      headers: { ...requestHeaders, 'Authorization': 'Bearer ***' },
      body: requestBody,
      timestamp: new Date().toISOString()
    });
    
    const response = await fetch(url, {
      method: 'POST',
      headers: requestHeaders,
      body: JSON.stringify(requestBody)
    });
    
    const responseHeaders = {};
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });
    
    console.log('[Inline Background] 📥 Perplexity API RESPONSE RECEIVED', {
      provider: 'perplexity',
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
      ok: response.ok,
      timestamp: new Date().toISOString()
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      const errorMessage = error.error?.message || `API error: ${response.status}`;
      console.error('[Inline Background] ❌ Perplexity API REQUEST FAILED', {
        provider: 'perplexity',
        status: response.status,
        statusText: response.statusText,
        error: errorMessage,
        errorDetails: error,
        responseBody: error
      });
      throw new Error(errorMessage);
    }
    
    const data = await response.json();
    const correctedText = data.choices[0].message.content.trim();
    console.log('[Inline Background] ✅ Perplexity API REQUEST SUCCEEDED', {
      provider: 'perplexity',
      model: model,
      responseLength: correctedText.length,
      responsePreview: correctedText.substring(0, 100) + (correctedText.length > 100 ? '...' : ''),
      usage: data.usage,
      responseBody: data,
      timestamp: new Date().toISOString()
    });
    return correctedText;
  },
  
  'cohere-free': async (apiKey, model, text, prompt) => {
    const url = 'https://api.cohere.ai/v1/generate';
    const requestBody = {
      model: model,
      prompt: `${prompt}${text}`,
      temperature: 0.3,
      max_tokens: 2000
    };
    const requestHeaders = {
      'Content-Type': 'application/json'
    };
    
    // Cohere free tier still requires an API key (free tier with API key)
    if (apiKey) {
      requestHeaders['Authorization'] = `Bearer ${apiKey}`;
    }
    
    console.log('[Inline Background] 📤 Cohere (Free) API REQUEST DISPATCHED', {
      provider: 'cohere-free',
      url: url,
      method: 'POST',
      model: model,
      textLength: text.length,
      textPreview: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
      headers: apiKey ? { ...requestHeaders, 'Authorization': 'Bearer ***' } : requestHeaders,
      hasApiKey: !!apiKey,
      body: requestBody,
      timestamp: new Date().toISOString()
    });
    
    const response = await fetch(url, {
      method: 'POST',
      headers: requestHeaders,
      body: JSON.stringify(requestBody)
    });
    
    const responseHeaders = {};
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });
    
    console.log('[Inline Background] 📥 Cohere (Free) API RESPONSE RECEIVED', {
      provider: 'cohere-free',
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
      ok: response.ok,
      timestamp: new Date().toISOString()
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      const errorMessage = error.error?.message || `API error: ${response.status}`;
      console.error('[Inline Background] ❌ Cohere (Free) API REQUEST FAILED', {
        provider: 'cohere-free',
        status: response.status,
        statusText: response.statusText,
        error: errorMessage,
        errorDetails: error,
        responseBody: error
      });
      throw new Error(errorMessage);
    }
    
    const data = await response.json();
    const correctedText = data.generations[0].text.trim();
    console.log('[Inline Background] ✅ Cohere (Free) API REQUEST SUCCEEDED', {
      provider: 'cohere-free',
      model: model,
      responseLength: correctedText.length,
      responsePreview: correctedText.substring(0, 100) + (correctedText.length > 100 ? '...' : ''),
      responseBody: data,
      timestamp: new Date().toISOString()
    });
    return correctedText;
  },
  
  'google-free': async (apiKey, model, text, prompt) => {
    const apiKeyToUse = apiKey || 'YOUR_FREE_API_KEY';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKeyToUse}`;
    const requestBody = {
      contents: [{
        parts: [{
          text: `${prompt}${text}`
        }]
      }],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 2000
      }
    };
    const requestHeaders = {
      'Content-Type': 'application/json'
    };
    
    console.log('[Inline Background] 📤 Google Gemini (Free) API REQUEST DISPATCHED', {
      provider: 'google-free',
      url: url.replace(`key=${apiKeyToUse}`, 'key=***'),
      method: 'POST',
      model: model,
      textLength: text.length,
      textPreview: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
      headers: requestHeaders,
      body: requestBody,
      timestamp: new Date().toISOString()
    });
    
    const response = await fetch(url, {
      method: 'POST',
      headers: requestHeaders,
      body: JSON.stringify(requestBody)
    });
    
    const responseHeaders = {};
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });
    
    console.log('[Inline Background] 📥 Google Gemini (Free) API RESPONSE RECEIVED', {
      provider: 'google-free',
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
      ok: response.ok,
      timestamp: new Date().toISOString()
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      const errorMessage = error.error?.message || `API error: ${response.status}`;
      console.error('[Inline Background] ❌ Google Gemini (Free) API REQUEST FAILED', {
        provider: 'google-free',
        status: response.status,
        statusText: response.statusText,
        error: errorMessage,
        errorDetails: error,
        responseBody: error
      });
      throw new Error(errorMessage);
    }
    
    const data = await response.json();
    const correctedText = data.candidates[0].content.parts[0].text.trim();
    console.log('[Inline Background] ✅ Google Gemini (Free) API REQUEST SUCCEEDED', {
      provider: 'google-free',
      model: model,
      responseLength: correctedText.length,
      responsePreview: correctedText.substring(0, 100) + (correctedText.length > 100 ? '...' : ''),
      responseBody: data,
      timestamp: new Date().toISOString()
    });
    return correctedText;
  },
  
  'groq': async (apiKey, model, text, prompt) => {
    const url = 'https://api.groq.com/openai/v1/chat/completions';
    const apiKeyToUse = apiKey || 'YOUR_FREE_API_KEY';
    const requestBody = {
      model: model,
        messages: [
          {
            role: 'user',
            content: `${prompt}${text}`
          }
        ],
      temperature: 0.3,
      max_tokens: 2000
    };
    const requestHeaders = {
      'Authorization': `Bearer ${apiKeyToUse}`,
      'Content-Type': 'application/json'
    };
    
    console.log('[Inline Background] 📤 Groq API REQUEST DISPATCHED', {
      provider: 'groq',
      url: url,
      method: 'POST',
      model: model,
      textLength: text.length,
      textPreview: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
      headers: { ...requestHeaders, 'Authorization': 'Bearer ***' },
      body: requestBody,
      timestamp: new Date().toISOString()
    });
    
    const response = await fetch(url, {
      method: 'POST',
      headers: requestHeaders,
      body: JSON.stringify(requestBody)
    });
    
    const responseHeaders = {};
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });
    
    console.log('[Inline Background] 📥 Groq API RESPONSE RECEIVED', {
      provider: 'groq',
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
      ok: response.ok,
      timestamp: new Date().toISOString()
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      const errorMessage = error.error?.message || `API error: ${response.status}`;
      console.error('[Inline Background] ❌ Groq API REQUEST FAILED', {
        provider: 'groq',
        status: response.status,
        statusText: response.statusText,
        error: errorMessage,
        errorDetails: error,
        responseBody: error
      });
      throw new Error(errorMessage);
    }
    
    const data = await response.json();
    const correctedText = data.choices[0].message.content.trim();
    console.log('[Inline Background] ✅ Groq API REQUEST SUCCEEDED', {
      provider: 'groq',
      model: model,
      responseLength: correctedText.length,
      responsePreview: correctedText.substring(0, 100) + (correctedText.length > 100 ? '...' : ''),
      usage: data.usage,
      responseBody: data,
      timestamp: new Date().toISOString()
    });
    return correctedText;
  },
  
  'huggingface': async (apiKey, model, text, prompt) => {
    const url = `https://api-inference.huggingface.co/models/${model}`;
    const requestBody = {
        inputs: `${prompt}${text}`,
      parameters: {
        temperature: 0.3,
        max_new_tokens: 2000
      }
    };
    const requestHeaders = {
      'Content-Type': 'application/json'
    };
    if (apiKey) {
      requestHeaders['Authorization'] = `Bearer ${apiKey}`;
    }
    
    console.log('[Inline Background] 📤 Hugging Face API REQUEST DISPATCHED', {
      provider: 'huggingface',
      url: url,
      method: 'POST',
      model: model,
      textLength: text.length,
      textPreview: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
      headers: apiKey ? { ...requestHeaders, 'Authorization': 'Bearer ***' } : requestHeaders,
      body: requestBody,
      timestamp: new Date().toISOString()
    });
    
    const response = await fetch(url, {
      method: 'POST',
      headers: requestHeaders,
      body: JSON.stringify(requestBody)
    });
    
    const responseHeaders = {};
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });
    
    console.log('[Inline Background] 📥 Hugging Face API RESPONSE RECEIVED', {
      provider: 'huggingface',
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
      ok: response.ok,
      timestamp: new Date().toISOString()
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      const errorMessage = error.error || `API error: ${response.status}`;
      console.error('[Inline Background] ❌ Hugging Face API REQUEST FAILED', {
        provider: 'huggingface',
        status: response.status,
        statusText: response.statusText,
        error: errorMessage,
        responseBody: error
      });
      throw new Error(errorMessage);
    }
    
    const data = await response.json();
    // Hugging Face returns array of generated text
    const correctedText = Array.isArray(data) && data[0]?.generated_text 
      ? data[0].generated_text.trim() 
      : (typeof data === 'string' ? data.trim() : JSON.stringify(data));
    console.log('[Inline Background] ✅ Hugging Face API REQUEST SUCCEEDED', {
      provider: 'huggingface',
      model: model,
      responseLength: correctedText.length,
      responsePreview: correctedText.substring(0, 100) + (correctedText.length > 100 ? '...' : ''),
      responseBody: data,
      timestamp: new Date().toISOString()
    });
    return correctedText;
  },
  
  'together': async (apiKey, model, text, prompt) => {
    const url = 'https://api.together.xyz/v1/chat/completions';
    const apiKeyToUse = apiKey || 'YOUR_FREE_API_KEY';
    const requestBody = {
      model: model,
        messages: [
          {
            role: 'user',
            content: `${prompt}${text}`
          }
        ],
      temperature: 0.3,
      max_tokens: 2000
    };
    const requestHeaders = {
      'Authorization': `Bearer ${apiKeyToUse}`,
      'Content-Type': 'application/json'
    };
    
    console.log('[Inline Background] 📤 Together AI API REQUEST DISPATCHED', {
      provider: 'together',
      url: url,
      method: 'POST',
      model: model,
      textLength: text.length,
      textPreview: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
      headers: { ...requestHeaders, 'Authorization': 'Bearer ***' },
      body: requestBody,
      timestamp: new Date().toISOString()
    });
    
    const response = await fetch(url, {
      method: 'POST',
      headers: requestHeaders,
      body: JSON.stringify(requestBody)
    });
    
    const responseHeaders = {};
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });
    
    console.log('[Inline Background] 📥 Together AI API RESPONSE RECEIVED', {
      provider: 'together',
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
      ok: response.ok,
      timestamp: new Date().toISOString()
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      const errorMessage = error.error?.message || `API error: ${response.status}`;
      console.error('[Inline Background] ❌ Together AI API REQUEST FAILED', {
        provider: 'together',
        status: response.status,
        statusText: response.statusText,
        error: errorMessage,
        errorDetails: error,
        responseBody: error
      });
      throw new Error(errorMessage);
    }
    
    const data = await response.json();
    const correctedText = data.choices[0].message.content.trim();
    console.log('[Inline Background] ✅ Together AI API REQUEST SUCCEEDED', {
      provider: 'together',
      model: model,
      responseLength: correctedText.length,
      responsePreview: correctedText.substring(0, 100) + (correctedText.length > 100 ? '...' : ''),
      usage: data.usage,
      responseBody: data,
      timestamp: new Date().toISOString()
    });
    return correctedText;
  }
};

// Handle messages from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[Inline Background] Message received', {
    type: message.type,
    tabId: sender.tab?.id,
    url: sender.tab?.url || message.url
  });
  
  if (message.type === 'shortcutActivated') {
    console.log('[Inline Background] ⚡ KEYBOARD SHORTCUT ACTIVATED', {
      url: message.url || sender.tab?.url,
      tabId: sender.tab?.id,
      activeElement: message.activeElementInfo,
      timestamp: new Date().toISOString()
    });
    sendResponse({ received: true });
    return false; // Synchronous response, don't keep channel open
  }
  
  if (message.type === 'shortcutNoInput') {
    console.log('[Inline Background] ⚠️ Shortcut activated but no relevant input found', {
      url: message.url || sender.tab?.url,
      tabId: sender.tab?.id,
      reason: message.reason,
      activeElementInfo: message.activeElementInfo,
      settingsStatus: message.settingsStatus,
      timestamp: new Date().toISOString()
    });
    sendResponse({ received: true });
    return false; // Synchronous response, don't keep channel open
  }
  
  if (message.type === 'correctText') {
    const { provider, apiKey, model, text, functionType, requestId, inputId, url } = message;
    
    // Get the correct prompt based on function type, default to fix_language
    const promptType = functionType || 'fix_language';
    const prompt = PROMPTS[promptType] || PROMPTS.fix_language;
    
    console.log('[Inline Background] 📝 Text correction request received (after shortcut activation)', {
      requestId,
      inputId,
      provider,
      model,
      functionType: promptType,
      textLength: text.length,
      textPreview: text.substring(0, 50) + (text.length > 50 ? '...' : ''),
      tabId: sender.tab?.id,
      url: url || sender.tab?.url,
      timestamp: new Date().toISOString()
    });
    
    const handler = API_HANDLERS[provider];
    if (!handler) {
      console.error('[Inline Background] Unknown provider requested', {
        provider,
        requestId,
        availableProviders: Object.keys(API_HANDLERS)
      });
      sendResponse({ error: 'Unknown provider' });
      return;
    }
    
    const startTime = Date.now();
    
    // Execute API request (async, use tabs.sendMessage for result, not sendResponse)
    handler(apiKey, model, text, prompt)
      .then(correctedText => {
        const duration = Date.now() - startTime;
        console.log('[Inline Background] Text correction succeeded', {
          requestId,
          provider,
          model,
          originalLength: text.length,
          correctedLength: correctedText.length,
          duration: `${duration}ms`,
          correctedPreview: correctedText.substring(0, 50) + (correctedText.length > 50 ? '...' : '')
        });
        
        // Send response back to content script via tabs.sendMessage
        chrome.tabs.sendMessage(sender.tab.id, {
          type: 'textCorrected',
          requestId: requestId,
          correctedText: correctedText
        }).then(() => {
          console.log('[Inline Background] Successfully sent correction to content script', {
            requestId,
            tabId: sender.tab.id
          });
        }).catch(err => {
          console.error('[Inline Background] Failed to send message to content script', {
            requestId,
            tabId: sender.tab.id,
            error: err.message,
            errorDetails: err
          });
        });
      })
      .catch(error => {
        const duration = Date.now() - startTime;
        console.error('[Inline Background] Text correction failed', {
          requestId,
          provider,
          model,
          duration: `${duration}ms`,
          error: error.message,
          errorStack: error.stack
        });
        
        // Send error back to content script via tabs.sendMessage
        chrome.tabs.sendMessage(sender.tab.id, {
          type: 'textCorrectionError',
          requestId: requestId,
          error: error.message
        }).catch(err => {
          console.error('[Inline Background] Failed to send error message to content script', {
            requestId,
            tabId: sender.tab.id,
            error: err.message
          });
        });
      });
    
    // Don't send response via sendResponse - we use tabs.sendMessage instead
    return false;
  } else {
    console.log('[Inline Background] Unknown message type', {
      type: message.type,
      message
    });
  }
});

// Notify all tabs when settings change
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'sync') {
    console.log('[Inline Background] Storage changed (sync)', {
      changedKeys: Object.keys(changes),
      changes: changes
    });
    
    chrome.tabs.query({}, (tabs) => {
      console.log('[Inline Background] Notifying tabs of settings update', {
        totalTabs: tabs.length
      });
      
      let successCount = 0;
      let errorCount = 0;
      
      tabs.forEach(tab => {
        chrome.tabs.sendMessage(tab.id, {
          type: 'settingsUpdated'
        }).then(() => {
          successCount++;
          console.log('[Inline Background] Successfully notified tab', {
            tabId: tab.id,
            url: tab.url
          });
        }).catch((err) => {
          errorCount++;
          // Ignore errors for tabs without content script (this is expected)
          if (err.message && !err.message.includes('Could not establish connection')) {
            console.warn('[Inline Background] Failed to notify tab', {
              tabId: tab.id,
              url: tab.url,
              error: err.message
            });
          }
        });
      });
      
      // Log summary after a short delay to allow promises to resolve
      setTimeout(() => {
        console.log('[Inline Background] Settings update notification summary', {
          totalTabs: tabs.length,
          successful: successCount,
          errors: errorCount
        });
      }, 100);
    });
  } else {
    console.log('[Inline Background] Storage changed (non-sync)', {
      area: areaName,
      changedKeys: Object.keys(changes)
    });
  }
});

