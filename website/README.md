# hakitrade.com landing page

Static HTML/CSS/JavaScript, local images and a real extension ZIP download. No payment integration, backend, cookies, or analytics code.

## GitHub Pages

The live landing page is https://abrahamkeleta.github.io/haki/website/. GitHub Pages publishes `main` from the repository root; it does not run the extension packaging script. The relative download links work under this project path and when `website/` is a standalone document root.

1. After extension changes, run `npm run package`. It builds `dist/haki-1.0.0.zip`, copies the runtime-only ZIP to `website/downloads/`, and creates `dist/hakitrade-site.zip`.
2. Run `npm run check:download` to verify the downloadable ZIP matches the runtime source. Commit `website/downloads/haki-1.0.0.zip` with the source changes: this file must remain tracked for branch-based Pages publishing.
3. After an authorized push to `main` and a successful Pages build, verify `https://abrahamkeleta.github.io/haki/website/downloads/haki-1.0.0.zip` returns the ZIP. Download, extract, and Load unpacked in Chrome or Brave.

## Link previews

`index.html` includes Open Graph metadata and an X `summary_large_image` card. Both use the checked-in `assets/social-preview.png` (1200 × 630), rendered from the original Haki artwork by `npm run site:social`. That optional artwork command uses an isolated headless Chrome profile; ordinary packaging has no browser dependency.

After editing the artwork, regenerate and commit the PNG. Run `node tests/site.test.mjs` and `HAKI_SITE_PREFIX=/haki/website node tests/site.test.mjs` to check links, downloads, metadata, and the image at both deployment paths. Preview metadata is present directly in HTML for crawlers; it does not depend on JavaScript. Platforms decide when to refresh their cached previews.

## Other static hosts

Upload the contents of `website/` (or extract `dist/hakitrade-site.zip`) and use that folder as the document root. When moving to a custom domain, update the canonical URLs in `index.html` and `privacy.html`, plus the absolute Open Graph and X URLs in `index.html`, to match the deployed domain. For a future Web Store release, replace download links with the actual listing URL and update the installation instructions.

Local preview: `python3 -m http.server 8080 --directory website`, then visit `http://localhost:8080`. Clipboard copying works on localhost/HTTPS and has a text fallback.

The supported-platform names scroll left continuously, with no dots or separators. Hover or focus the strip to pause, or use its Pause/Resume control. Reduced-motion preferences produce a static wrapping list. Without JavaScript, the single list can be scrolled horizontally.

Platform markup is generated from `shared/constants.js` by `npm run site:platforms`, also run automatically by `npm run package`. `npm run check` rejects an out-of-date list. The website remains standalone: no extension modules or runtime fetches are needed.
