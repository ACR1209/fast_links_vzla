# fast-links-vzla

Static link page builder. Fetches PocketBase `links` collection, outputs single self-contained `dist/index.html`.

## Core constraint: ultra-low bundle size

**Every byte counts.** This page loads on slow Venezuelan mobile connections (3G/EDGE, high latency, data caps). The goal is sub-5 KB HTML. Currently ~3 KB.

Rules:
- No npm dependencies. Zero. Use Node built-ins only (`fs`, `http`, `https`, `path`).
- No bundler (webpack, vite, rollup, esbuild). Build is `build.js` — one file, no config.
- No framework (React, Vue, Svelte, Alpine, htmx). Vanilla JS only.
- No external fonts. System font stack only (`-apple-system, BlinkMacSystemFont, ...`).
- No icon libraries. SVG inline max if needed.
- No CSS reset libraries. Write only what the page uses.
- All CSS inlined into `<style>` — zero round trips for styles.
- All JS inlined into `<script>` — zero round trips for scripts.
- Links data baked into `window.__LINKS__` at build time — zero client-side API calls.

## Project layout

```
build.js          # single build script — fetches PB, inlines css+js, writes dist/
template.html     # HTML skeleton with {{placeholders}}
css/styles.css    # all CSS (concatenated + minified at build)
js/app.js         # all JS  (concatenated + minified at build)
dist/index.html   # output — deploy this file only
.env.example      # copy to .env, fill PB_URL etc.
```

## Build

```bash
PB_URL=https://your-pb.example.com node build.js
```

Or with `.env` loaded manually:

```bash
export $(cat .env | xargs) && node build.js
```

## PocketBase schema

Collection: `links`

| field    | type   |
|----------|--------|
| `name`   | text   |
| `target` | url    |

## What NOT to do

- Do not add `node_modules`. If you think you need a package, reconsider.
- Do not split CSS/JS into separate files in `dist/`. Inline everything.
- Do not add a JS framework "just for templating" — string replace in `build.js` is enough.
- Do not add a dev server. Open `dist/index.html` directly in a browser to preview.
- Do not add source maps, polyfills for IE, or PostCSS pipelines.
