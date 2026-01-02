#!/usr/bin/env node

/**
 * Script to update popup.js with API key from .env file
 * Usage: node update-api-key.js
 */

const fs = require('fs');
const path = require('path');

// Read .env file
const envPath = path.join(__dirname, '.env');
if (!fs.existsSync(envPath)) {
  console.error('Error: .env file not found. Please create it from .env.example');
  process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf8');
const apiKeyMatch = envContent.match(/ANTHROPIC_API_KEY=(.+)/);
if (!apiKeyMatch) {
  console.error('Error: ANTHROPIC_API_KEY not found in .env file');
  process.exit(1);
}

const apiKey = apiKeyMatch[1].trim();
if (!apiKey || apiKey === 'your_api_key_here') {
  console.error('Error: Please set a valid ANTHROPIC_API_KEY in .env file');
  process.exit(1);
}

// Read popup.js
const popupPath = path.join(__dirname, 'popup.js');
const popupContent = fs.readFileSync(popupPath, 'utf8');

// Update the DEFAULT_API_KEYS.anthropic value
const updatedContent = popupContent.replace(
  /anthropic:\s*['"](.*?)['"],?\s*\/\/.*/,
  `anthropic: '${apiKey}', // Loaded from .env file`
);

if (updatedContent === popupContent) {
  console.error('Error: Could not find anthropic API key field in popup.js');
  process.exit(1);
}

// Write updated content
fs.writeFileSync(popupPath, updatedContent, 'utf8');
console.log('✅ Successfully updated popup.js with API key from .env');
console.log('⚠️  Note: This updates the code file. Make sure .env is gitignored!');

