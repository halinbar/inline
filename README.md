# Inline - LLM Text Corrector Browser Extension

A browser extension that uses various LLM providers to correct spelling and grammatical errors in text inputs across the web.

## Features

- **Multiple LLM Providers**: Support for OpenAI, Anthropic (Claude), Google (Gemini), Mistral AI, Cohere, and Perplexity
- **Keyboard Shortcut**: Cmd+Ctrl+Shift+T - fixed and not configurable (Mac only)
- **Model Selection**: Automatically fetches available models from your selected provider
- **Persistent Settings**: Settings are saved and synced across all tabs and windows
- **Smart Input Detection**: Works with text inputs, textareas, and contenteditable elements

## Installation

1. **Create Icon Files** (optional but recommended):
   - Create three icon files: `icon16.png`, `icon48.png`, and `icon128.png`
   - Or temporarily comment out the "icons" section in `manifest.json` to test without icons
   - See `ICONS.md` for more details

2. Open Chrome/Edge and navigate to `chrome://extensions/` (or `edge://extensions/` for Edge)
3. Enable "Developer mode" in the top right
4. Click "Load unpacked"
5. Select the folder containing this extension

## Setup

1. Click the extension icon in your browser toolbar
2. Select your preferred LLM provider
3. Enter your API key for that provider
4. Click "Refresh Models" to load available models
5. Select a model from the dropdown
6. Click "Save Settings"

## Usage

1. Navigate to any webpage with text inputs
2. Click in any text input, textarea, or contenteditable field
3. Type or paste your text
4. Press your keyboard shortcut: **Cmd+Ctrl+Shift+T**
5. The text will be automatically corrected using your selected LLM provider

## Supported Providers

- **OpenAI**: GPT-4, GPT-4 Turbo, GPT-3.5 Turbo
- **Anthropic**: Claude 3.5 Sonnet, Claude 3 Opus, Claude 3 Sonnet, Claude 3 Haiku
- **Google**: Gemini Pro, Gemini Pro Vision
- **Mistral AI**: Mistral Large, Mistral Medium, Mistral Small
- **Cohere**: Command, Command Light
- **Perplexity**: Llama 3.1 Sonar models

## Privacy

- All API requests are made directly from your browser to the LLM provider
- API keys are stored locally in your browser's sync storage
- No data is sent to any third-party servers except the LLM provider you choose

## Requirements

- Mac OS
- Chrome/Edge browser (Manifest V3 compatible)
- Valid API key for your chosen LLM provider

## Notes

- The extension requires internet connectivity to make API requests
- API usage will count against your provider's rate limits and billing
- Some providers may have different model availability based on your account tier

