# Haki

**Willpower before execution.**

A local-only Manifest V3 extension that puts your own rules between you and your trading platform. Vanilla HTML, CSS and JavaScript. No backend, account, runtime dependencies, external fonts, telemetry, or build step needed to install.

## Install now

1. Open `chrome://extensions` in Google Chrome.
2. Enable **Developer mode**, choose **Load unpacked**, and select this folder (the one containing `manifest.json`).
3. Complete onboarding: edit your rules, enable trading websites and accept each site's access request, then choose a reminder frequency.
4. Optionally select **Start each new tab with my rules**.
5. Pin Haki in the extension menu. Open or reload a protected trading page.

For distribution, use `dist/haki-1.0.0.zip`. Extract it before using Load unpacked. The ZIP itself is suitable for Chrome Web Store submission; publication still requires the store listing, a hosted privacy-policy URL, and Google's review.

The `hakitrade.com` landing page is in [website/index.html](website/index.html). `dist/hakitrade-site.zip` contains the ready-to-host site and a working extension download. See [website/README.md](website/README.md) for preview/deployment instructions. Payments and hosting are not configured.

## What is included

- First-run onboarding, 1–20 editable/reorderable rules (up to 200 characters each).
- Verified built-ins: Tradovate, TopstepX, TradeSea and TradingView (`www.tradingview.com`). HTTPS custom websites with exact hostname matching.
- An early blocking layer, isolated accessible checklist, live progress and a quiet success transition.
- Every new/reloaded trading page, every 1/2/3/4/6/8/12 hours, or once per local calendar day.
- Compact popup with protection status, rule/platform counts, management links, **Show Haki Now**, pause confirmation and five-second emergency access.
- Settings, corrupt-data recovery, local backup before repair/reset and optional-permission cleanup on custom-site removal.
- Optional new-tab ritual with your rules, inline editing and a local reflection checklist. It never suppresses the trading gate.
- Two fictional example ad cards in the new tab's lower corners. Hidden by default; preview them from **Settings → New tab → Preview with example ads**, or the preview control on the new-tab page. No ad service, real sponsor link, tracking, or network request is involved.

## Behavior to know

- A full reload starts a new page context. SPA route changes do not repeatedly show Haki.
- Interval and daily confirmations apply across enabled sites. A gate already on screen still requires its own confirmation.
- Haki checks time-based reminders on page entry and when settings are changed; it does not suddenly gate a platform mid-session when a timer expires.
- Rules on an existing gate remain its original snapshot. If rules change before confirmation, Haki asks you to repair/review rather than confirming an outdated checklist. Reload or choose **Show Haki Now** for the updated rules.
- Enabling a site registers its early content script immediately. Reload already-open pages for automatic protection from their first moment, or use **Show Haki Now**.
- Bypass applies only to the current page and does not update global confirmation. Reloading can show Haki again. Hold with a primary pointer button or with Space/Enter; early release cancels.
- Pause releases existing gates and unregisters the early script. Browser site-access controls and uninstall also remain available.
- Only exact HTTPS hosts are protected. Add subdomains individually. HTTP, localhost, private/internal suffixes, IP literals and nonstandard URL ports are rejected.
- This is a voluntary ritual, not a tamper-proof lock or order-management tool. It does not pause trading systems, cancel orders, or guarantee risk management.

## Optional new tab

Chrome's new-tab override is declared at installation, so Chrome may ask to keep this change even though Haki's preference starts off. With the feature off, the override immediately opens `chrome://new-tab-page/`, Chrome's built-in page. It cannot restore another extension's override. With it on, new tabs show Haki. Preview works without enabling the preference.

New-tab overrides do not apply to incognito windows. Native-new-tab fallback and interactions with other Chromium browsers or new-tab extensions should be checked before claiming compatibility. See [TESTING.md](TESTING.md).

## Permissions and architecture

| Permission | Purpose |
| --- | --- |
| `storage` | Rules, preferences and confirmation timestamps in `chrome.storage.local`. |
| `scripting` | Register persistent `document_start` CSS and scripts for enabled sites; inject a manual gate on an already-open permitted site; emergency recovery. |
| Optional `https://*/*` declaration | Allows a user to choose arbitrary HTTPS trading hosts. Haki requests only `https://the-exact-host/*` when that host is enabled. No blanket access request is made. |

No `tabs`, `activeTab`, browsing-history, network interception, or remote-code permission is requested. The `chrome.tabs` methods used do not require the `tabs` permission; URLs are available only for hosts the user granted. The service worker serializes writes and modifies individual top-level fields to avoid overwriting concurrent edits and confirmations.

Content CSS hides the page body before it renders while the content script opens a native top-layer dialog in Shadow DOM. The modal makes the underlying page inert; early event guards keep Haki keyboard and pointer input out of platform shortcuts. All guards and scroll restrictions are removed on dismissal. The stylesheet is embedded locally in `content/gate-style.js` so there are no asynchronous resource fetches before rendering the gate.

Storage follows schema version 1 in `shared/constants.js`, adding `newTabSettings: { enabled, showExampleAds }`. No individual checkbox state is saved. `recoveryBackup`, when present, contains one local copy of pre-repair/pre-reset settings. Uninstall clears extension storage. The source of truth for rules/domain validation is `shared/storage.js`/`shared/domains.js`; `shouldPrompt()` in `shared/utils.js` is the only frequency engine.

## Development and validation

Node 22+ and Python 3 are sufficient. No install command is needed.

```sh
npm test                 # Core, storage and worker regression tests
npm run check           # Manifest, syntax, assets and CSP checks
npm run assets          # Regenerate checked-in gate CSS bundle and PNG icons
node tests/browser.test.mjs  # Isolated real Chrome integration, no brokerage connection
npm run package         # Reproducible runtime-only ZIP and SHA-256
node tests/site.test.mjs # Desktop/mobile landing page and actual download verification
```

The browser harness uses Node's built-in WebSocket and Chrome DevTools Protocol. It defaults to macOS Google Chrome; set `HAKI_BROWSER` to a compatible browser executable elsewhere. It creates an isolated temporary profile, grants test site permissions through Chrome's extension-management UI API, and fulfills platform navigation with local HTML fixtures. No real orders, credentials, or brokerage pages are used. Browser debugging must support `Extensions.loadUnpacked` and `--enable-unsafe-extension-debugging` (the development harness may require a newer browser than the extension's Chrome 111 minimum).

Generated screenshots/results are in `test-results/`; release output is in `dist/`. Both are Git-ignored. `DEBUG` is false; production does not log user/page data. See [IMPLEMENTATION.md](IMPLEMENTATION.md) for verified hostname sources and architecture decisions, [PRIVACY.md](PRIVACY.md) for privacy, and [STORE_LISTING.md](STORE_LISTING.md) for submission copy.
