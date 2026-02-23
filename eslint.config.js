import js from '@eslint/js';
import typescript from '@typescript-eslint/eslint-plugin';
import typescriptParser from '@typescript-eslint/parser';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import prettier from 'eslint-config-prettier';

export default [
  js.configs.recommended,
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        chrome: 'readonly',
        browser: 'readonly',
        window: 'readonly',
        document: 'readonly',
        console: 'readonly',
        process: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        fetch: 'readonly',
        URLSearchParams: 'readonly',
        URL: 'readonly',
        btoa: 'readonly',
        atob: 'readonly',
        HTMLElement: 'readonly',
        HTMLImageElement: 'readonly',
        HTMLInputElement: 'readonly',
        HTMLTextAreaElement: 'readonly',
        HTMLIFrameElement: 'readonly',
        HTMLScriptElement: 'readonly',
        HTMLCanvasElement: 'readonly',
        HTMLImageElement: 'readonly',
        Element: 'readonly',
        Image: 'readonly',
        ImageData: 'readonly',
        Response: 'readonly',
        AbortController: 'readonly',
        MutationObserver: 'readonly',
        Event: 'readonly',
        MouseEvent: 'readonly',
        ScrollBehavior: 'readonly',
        ScrollLogicalPosition: 'readonly',
        Document: 'readonly',
        performance: 'readonly',
        alert: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': typescript,
      react,
      'react-hooks': reactHooks,
    },
    rules: {
      ...typescript.configs.recommended.rules,
      ...react.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      'no-console': ['warn', { allow: ['warn', 'error', 'debug', 'info'] }],
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
  },
  prettier,
  {
    ignores: ['node_modules/**', 'dist/**', '*.config.js'],
  },
];
