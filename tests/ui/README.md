# UI screen tests (headless, no live data)

These tests load the **real `index.html`** in a headless browser-like DOM
(jsdom), **stub the Supabase backend** so nothing ever touches your live
database, sign in as each role, and then **click through every screen** in the
sidebar. A test fails if any screen throws an error or renders blank.

They also re-check the security sanitiser (`sanHTML`) against real XSS payloads
and the small helper functions, in a real DOM.

## What they catch
- A bad edit that breaks a screen (white-screen / JavaScript crash).
- A screen that renders nothing.
- A regression that lets stored HTML run a script (XSS).

## Run locally
```bash
cd kala-kuteer-app
npm install      # first time only (installs jsdom)
npm test         # money-logic checks + these UI checks
# or just the UI ones:
npm run test:ui
```

## Safety
`tests/ui/harness.js` replaces the Supabase client with an in-memory stub and
blocks all external network. The tests can read and click the UI but **cannot
read, write, or delete any real student, fee, or payment data.**

## Files
- `harness.js` — boots the app headlessly with the backend stubbed.
- `run-ui.js`  — the checks (screen walk for super-admin / guru / student,
  sanitiser, helpers).
