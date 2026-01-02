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

## Important Notes

- The `.env` file is gitignored and will **not** be committed to the repository
- Browser extensions cannot directly load `.env` files at runtime
- To use the API key from `.env` in the extension:
  1. Manually copy the value from `.env` to `popup.js` in the `DEFAULT_API_KEYS.anthropic` field for local development
  2. Or use a build script to inject it during development

## For Production

Never commit API keys to the repository. Users should enter their own API keys through the extension's popup interface.

