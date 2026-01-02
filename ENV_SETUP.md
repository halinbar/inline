# Environment Variables Setup

This extension uses a `.env` file to store the default Anthropic API key locally.

## Setup

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and add your Anthropic API key:
   ```
   ANTHROPIC_API_KEY=your_actual_api_key_here
   ```

## Using the API Key

To load the API key from `.env` into the extension:

1. Run the update script:
   ```bash
   node update-api-key.js
   ```

   This will automatically read `ANTHROPIC_API_KEY` from `.env` and update `popup.js`.

2. The script updates `DEFAULT_API_KEYS.anthropic` in `popup.js` with the value from `.env`

## Important Notes

- The `.env` file is gitignored and will **not** be committed to the repository
- Browser extensions cannot directly load `.env` files at runtime
- The `update-api-key.js` script must be run to sync the `.env` value to the code
- **Never commit** `popup.js` with a real API key - always use an empty string for production

## For Production

Never commit API keys to the repository. Users should enter their own API keys through the extension's popup interface.

