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

# E2E tests (all)
npm run test:e2e

# E2E smoke (local/file checks)
npm run test:e2e:smoke

# E2E full (browser/network scenarios)
npm run test:e2e:full
```


### Quality Gates

The default quality pipeline runs the following checks in CI:

- `npm run type-check`
- `npm run lint:ci` (fails on warnings)
- `npm test`
- `npm run test:e2e:smoke`

Full browser E2E (`npm run test:e2e:full`) is executed in nightly workflow and publishes Playwright artifacts.


### Configure Git remote (`origin`)

If this environment has no configured remote, set it once with:

```bash
# option 1
scripts/setup-origin.sh https://github.com/<user>/<repo>.git

# option 2
GIT_REMOTE_URL=https://github.com/<user>/<repo>.git scripts/setup-origin.sh
```

Then push your branch:

```bash
git push -u origin work
```

To push the active branch in one command after setting `origin`:

```bash
scripts/push-current-branch.sh
```

### Windows helper scripts

Root-level Windows batch scripts were consolidated to reduce duplication and conflicting behavior.
Use only the maintained scripts below:

- `UPDATE_ALL.bat` — update dependencies, rebuild extension/server, start server.
- `START_SERVER.bat` — build (if needed) and start server with health verification.
- `RESTART_SERVER.bat` — restart running server process on port `3001`.
- `CHECK_SERVER.bat` — quick port/health check (`http://localhost:3001/health`).
- `RUN.bat` — one-click local startup flow for server + extension reload instructions.
- `MONITOR_EXTENSION.bat` — guided browser/server log monitoring.
- `TEST_EXTENSION_WORKING.bat` — browser-side validation checklist.
- `OPEN_EXTENSION_SETTINGS.bat` — opens `chrome://extensions/` and setup hints.
- `rebuild.bat` — rebuild extension artifacts in `dist/`.

If you previously relied on older BAT files, migrate to this list.

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

