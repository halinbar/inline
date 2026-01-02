# How to Install and Test Your Extension

## Quick Start (No Icons Required)

Since the extension requires icon files but you might not have them yet, here's the easiest way to get started:

### Option 1: Temporarily Remove Icon Requirement

1. Open `manifest.json`
2. Comment out or remove the `"icons"` section (lines 34-38)
3. Save the file

### Option 2: Create Simple Placeholder Icons

You can create simple 16x16, 48x48, and 128x128 pixel PNG files, or use an online tool to generate them.

## Installation Steps

### For Chrome:

1. **Open Chrome Extensions Page**
   - Navigate to `chrome://extensions/`
   - Or go to Menu (⋮) → Extensions → Manage Extensions

2. **Enable Developer Mode**
   - Toggle the "Developer mode" switch in the top-right corner

3. **Load the Extension**
   - Click "Load unpacked" button
   - Navigate to and select the `/Users/inbarhalevi/Documents/Code/textit` folder
   - Click "Select" or "Open"

4. **Verify Installation**
   - You should see "Inline - LLM Text Corrector" in your extensions list
   - The extension icon should appear in your browser toolbar

### For Edge:

1. **Open Edge Extensions Page**
   - Navigate to `edge://extensions/`
   - Or go to Menu (⋯) → Extensions

2. **Enable Developer Mode**
   - Toggle the "Developer mode" switch in the bottom-left corner

3. **Load the Extension**
   - Click "Load unpacked" button
   - Navigate to and select the `/Users/inbarhalevi/Documents/Code/textit` folder
   - Click "Select" or "Open"

## Testing the Extension

### 1. Configure Settings

1. Click the extension icon in your browser toolbar
2. Select a provider (e.g., "OpenAI")
3. Enter your API key
4. Click "Refresh Models" to load available models
5. Select a model from the dropdown
6. (Optional) Customize the keyboard shortcut
7. Click "Save Settings"

### 2. Test Text Correction

1. Open any webpage with a text input (e.g., Google search, a form, or create a simple HTML file)
2. Click in a text input or textarea
3. Type some text with intentional spelling/grammar mistakes, for example:
   ```
   This is a test sentance with some erors.
   ```
4. Press your keyboard shortcut: **Cmd+Ctrl+Shift+T**
5. The text should be replaced with the corrected version

### 3. Test on Different Input Types

Try the extension on:
- Regular `<input type="text">` fields
- `<textarea>` elements
- Contenteditable divs (like in rich text editors)
- Email inputs, search boxes, etc.

## Troubleshooting

### Extension Won't Load

- **Error about icons**: Comment out the icons section in `manifest.json` (lines 34-38)
- **Error about permissions**: Make sure all the host_permissions in manifest.json are correct
- **Check the console**: Open the browser's developer console (F12) and look for errors

### Keyboard Shortcut Not Working

1. Make sure you've saved your settings in the popup
2. Make sure you're focused on a text input when pressing the shortcut
3. Check the browser console for any errors
4. Try a different shortcut combination (some may conflict with browser shortcuts)

### API Requests Failing

1. Verify your API key is correct
2. Check that you have credits/quota with your LLM provider
3. Open the browser console (F12) → Network tab to see API request details
4. Check the background script console: Go to `chrome://extensions/` → Click "service worker" or "background page" link next to your extension

### Settings Not Persisting

- Settings are stored in Chrome's sync storage
- They should persist across browser restarts
- If they don't, check the browser console for storage errors

## Debugging Tips

### View Extension Logs

1. **Content Script Logs**: 
   - Open any webpage
   - Press F12 to open DevTools
   - Check the Console tab for messages from content.js

2. **Background Script Logs**:
   - Go to `chrome://extensions/`
   - Find your extension
   - Click "service worker" or "background page" link
   - This opens a console for background.js

3. **Popup Logs**:
   - Right-click the extension popup
   - Select "Inspect"
   - Check the Console tab

### Reload Extension After Changes

After making code changes:
1. Go to `chrome://extensions/`
2. Find your extension
3. Click the reload icon (↻)
4. Refresh any open web pages to get the updated content script

## Quick Test HTML File

Create a file called `test.html` in your extension folder to test locally:

```html
<!DOCTYPE html>
<html>
<head>
    <title>Inline Test Page</title>
</head>
<body>
    <h1>Inline Extension Test</h1>
    
    <label>Text Input:</label><br>
    <input type="text" id="textInput" style="width: 400px; padding: 10px;" 
           placeholder="Type text here and press Cmd+Shift+F1"><br><br>
    
    <label>Textarea:</label><br>
    <textarea id="textarea" rows="5" cols="50" 
              placeholder="Type text here and press Cmd+Shift+F1"></textarea><br><br>
    
    <label>Content Editable:</label><br>
    <div contenteditable="true" style="border: 1px solid #ccc; padding: 10px; min-height: 50px;"
         placeholder="Type text here and press Cmd+Shift+F1"></div>
</body>
</html>
```

Then open this file in your browser (`file:///Users/inbarhalevi/Documents/Code/textit/test.html`) and test the extension on it.

