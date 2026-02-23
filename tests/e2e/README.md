# E2E Tests

**Copyright (c) 2024 PANKOV SERGEY VLADIMIROVICH. All rights reserved.**

## Running E2E Tests

### Prerequisites

1. Build the extension first:
```bash
npm run build
```

2. Install Playwright browsers:
```bash
npx playwright install
```

### Running Tests

```bash
# Run all E2E tests
npm run test:e2e

# Run tests in UI mode
npx playwright test --ui

# Run tests in headed mode (see browser)
npx playwright test --headed
```

## Test Structure

- `captcha-detection.spec.ts` - Tests for CAPTCHA detection on real pages
- `extension-loading.spec.ts` - Tests for extension file structure

## Note

E2E tests require:
- Built extension in `dist/` directory
- Internet connection (for testing on real CAPTCHA demo pages)
- Playwright browsers installed

For testing the extension in Chrome:
1. Build the extension: `npm run build`
2. Load `dist/` folder as unpacked extension in Chrome
3. Navigate to test pages manually
