# Universal CAPTCHA Solver Extension

**Copyright (c) 2024 PANKOV SERGEY VLADIMIROVICH. All rights reserved.**

A powerful browser extension that automatically detects and solves various types of CAPTCHAs including reCAPTCHA (v2/v3), hCaptcha, Cloudflare Turnstile, and image CAPTCHAs.

## Features

- **Universal Detection**: Automatically detects multiple CAPTCHA types
  - reCAPTCHA v2
  - reCAPTCHA v3
  - hCaptcha
  - Cloudflare Turnstile
  - Image CAPTCHAs

- **Automatic Solving**: Automatically solves detected CAPTCHAs in the background
- **Invisible Mode**: Option to hide CAPTCHA UI during solving
- **Multiple API Providers**: Support for 2Captcha, AntiCaptcha, CapSolver, and custom APIs
- **Human-like Behavior**: Simulates human interactions with mouse movements and delays
- **Statistics Tracking**: Track solved CAPTCHAs and errors
- **Whitelist/Blacklist**: Control which sites the extension works on

## Development

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

This will build the extension in watch mode. Load the `dist` folder as an unpacked extension in Chrome.

### Production Build

```bash
npm run build
```

### Testing

```bash
# Unit tests
npm test

# E2E tests
npm run test:e2e
```

### Linting

```bash
# Check for linting errors
npm run lint

# Fix linting errors
npm run lint:fix

# Format code
npm run format
```

## Project Structure

```
captcha-solver-extension/
├── public/              # Static files (manifest, icons, HTML)
├── src/
│   ├── background/     # Service worker
│   ├── content/        # Content scripts
│   ├── popup/          # Popup UI
│   ├── options/        # Options page
│   └── shared/         # Shared utilities, types, constants
├── tests/              # Test files
└── dist/               # Build output
```

## License

UNLICENSED - Copyright (c) 2024 PANKOV SERGEY VLADIMIROVICH. All rights reserved.

This software is proprietary and confidential. Unauthorized copying, modification, distribution, or use of this software, via any medium, is strictly prohibited.
