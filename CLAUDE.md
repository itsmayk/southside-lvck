# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Marketing site + early storefront for **SouthSide**, a clothing drop by the brand **LVCK**. Plain static HTML/CSS/JS — no build step, no bundler, no framework. The only Node dependency (`stripe`) is used exclusively by the serverless function in `api/`.

## Deployment (no build/test commands — this is the workflow)

There is no lint/build/test suite. The only "command" is deploying:

```
git push          # auto-deploys to both GitHub Pages and Vercel (Vercel is linked via its GitHub App)
vercel --prod      # manual deploy to Vercel if you need it outside of a git push
```

- **GitHub Pages**: serves the static files as-is (branch `master`, root path). Cannot run `api/`, so `shop.html`'s stock check silently fails there — it's a fallback mirror, not the primary storefront host.
- **Vercel**: same files, plus it executes `api/stock.js` as a serverless function. This is the host that matters for anything Stripe-related. Project is already linked (`.vercel/project.json`); env vars (`STRIPE_SECRET_KEY`) are set in the Vercel dashboard, not in this repo.

## index.html is not normal HTML — read this before editing it

`index.html` is a self-contained exported "artifact" bundle, not hand-written markup. Structure:

1. A small real `<head>`/`<body>` at the top of the file (title, OG/meta tags, a loading placeholder) — this part is normal HTML and safe to edit directly.
2. A giant `<script>` containing the *entire* actual page (the `<x-dc><helmet>...` block with the logo animation, copy, register form, socials) as **one escaped JS string literal**. Inside that string, newlines are literal `\n` characters, quotes are `\"`, and closing tags are written `</div>` etc. — this is text, not real HTML, until the bootstrap script parses and mounts it at runtime.
3. A custom pseudo-JSX templating syntax lives inside that string: `ref=\"{{ someRef }}\"`, `sc-camel-on-submit=\"{{ onRegister }}\"`, `<sc-if value=\"{{ registered }}\">`. Don't "fix" these — they're consumed by the bundler's own mini compiler, not real HTML/React.

**Consequence:** the Edit tool's exact-string matching frequently fails on this file because of the escaping. The reliable way to change anything inside the giant string is a small throwaway Node script that does `fs.readFileSync` → `String.prototype.indexOf`/slice → `fs.writeFileSync`, matching the *escaped* form of the target text (e.g. search for `\\"` and `\\u002F`, not `"` and `/`). This has been the working pattern for every copy/style/logic change made so far — don't fight it with the Edit tool.

The animation itself is a scroll-jacked class component (`this.raf = requestAnimationFrame(tick)` loop reading `window.scrollY` against a `height: 440vh` container) that morphs an old logo into a new one, then reveals a "register" block (title, date, rotating trilingual phrase, email form, socials) as the user scrolls further. `componentDidMount` is the single place all of that per-frame logic lives.

The rotating trilingual phrase (`#ss-phrase`) is driven by a **second, separate** `<script>` at the very end of `<body>` — deliberately decoupled vanilla JS (not part of the bundle's own component/ref system) so it doesn't have to fight the custom templating engine. It re-queries `document.getElementById("ss-phrase")` on every cycle rather than caching the node, and uses a `transitionend` listener (not a fixed `setTimeout` fade) — both were fixes for real bugs (a stale/replaced DOM reference, and iOS timing drift between the JS timer and the CSS opacity transition). Keep that pattern if you touch it.

## Other pages

- `shop.html` — reads `shop-config.json` (product/size/price/Stripe Payment Link per SKU) client-side, renders buy buttons, then calls `/api/stock` to gray out sizes that are sold out. Plain HTML, no templating quirks — safe to edit normally.
- `social-instagram.html` — a language-picker (EN/ES/PT) that the main page's Instagram link routes through, since LVCK runs separate region-specific Instagram accounts (`@lvck.us` / `@lvck.es` / `@lvck.br`).
- `index-simple-backup.html` — the original, much simpler coming-soon page, kept only as a reference/fallback; not linked from anywhere live.

## Stripe integration (test mode)

- `shop-config.json` is the source of truth for the storefront: one entry per product+size with its `paymentLinkId` and checkout `url`.
- Stock control has no custom backend/database: each Stripe Payment Link was created with `restrictions.completed_sessions.limit` set to that size's stock count. Stripe itself flips the link's `active` field to `false` once the limit is hit.
- `api/stock.js` just retrieves each Payment Link and reports its `active` boolean, keyed by `slug`. That's the entire "inventory system."
- The one-off script that created the products/prices/Payment Links via the Stripe API lives in a **separate** local folder, `SouthSide-LVCK-Stripe-Setup` (not part of this repo, not committed anywhere) — re-run/adapt it there if the catalog changes, don't recreate that logic here.

## Assets

- `logo-w.png` / `og-image.png` — brand logo and the Open Graph share-preview image (logo composited onto the site's dark background, since the raw logo PNG is white-on-transparent and invisible on most link-preview surfaces).
- `fonts/AngerStyles.ttf`, `fonts/WrathStyles.ttf` — custom local webfonts loaded via `@font-face`, used for the "South Side" header. Google Fonts (Playfair Display, Cinzel, Saira Stencil, Times New Roman) are used elsewhere via `<link>` tags in the real `<head>`.
