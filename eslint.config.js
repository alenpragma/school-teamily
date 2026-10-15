/* ==========================================================================
   eslint.config.js — flat config (ESLint 9+)
   --------------------------------------------------------------------------
   The codebase is plain, dependency-free JavaScript in two environments:

     scripts/*.js          Node (CommonJS) — the build and quality gate
     src/assets/js/*.js    Browser (classic scripts, no bundler)

   So the config declares BOTH sets of globals and keeps the rule set to the
   recommended baseline plus a few correctness rules. It is intentionally
   light: this is a static site, not an application, and the goal is to catch
   real mistakes (unused vars, accidental globals, unreachable code) without
   burying the developer in style opinions — Prettier owns formatting.
   ========================================================================== */
'use strict';

const js = require('@eslint/js');

module.exports = [
  {
    ignores: ['dist/**', 'node_modules/**', 'src/data/**', 'public/**']
  },

  js.configs.recommended,

  /* ---- Node: build + check + serve scripts ---- */
  {
    files: ['scripts/**/*.js', 'eslint.config.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'commonjs',
      globals: {
        require: 'readonly',
        module: 'writable',
        exports: 'writable',
        process: 'readonly',
        console: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        Buffer: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly'
      }
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'no-undef': 'error',
      eqeqeq: ['warn', 'smart'],
      'no-var': 'off'
    }
  },

  /* ---- Browser: the shipped runtime ---- */
  {
    files: ['src/assets/js/**/*.js'],
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: 'script',
      globals: {
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
        location: 'readonly',
        fetch: 'readonly',
        console: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        requestAnimationFrame: 'readonly',
        IntersectionObserver: 'readonly',
        MutationObserver: 'readonly',
        CustomEvent: 'readonly',
        URLSearchParams: 'readonly',
        FormData: 'readonly',
        Image: 'readonly',
        getComputedStyle: 'readonly',
        matchMedia: 'readonly',
        history: 'readonly',
        localStorage: 'readonly',
        sessionStorage: 'readonly',
        tawk: 'readonly',
        Tawk_API: 'writable'
      }
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'no-undef': 'error',
      'no-implicit-globals': 'off',
      'no-var': 'off'
    }
  }
];
