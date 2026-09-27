# Haki V1 implementation

Build the supplied V1 specification as a dependency-free, local-only Manifest V3 extension. Commit each functional layer.

## Milestones

1. Foundation: validated local storage, exact domain normalization, centralized frequency engine and tests.
2. Protection: optional host permissions, persistent document-start registration, isolated accessible gate, confirmation and emergency access.
3. Product: onboarding, rule editor, platform management, frequency settings and popup.
4. Release: browser integration tests, icons, privacy policy, store copy and uploadable ZIP.

## Decisions

- Only `storage` and `scripting` are required. Site access is optional and requested for exact HTTPS hosts. The broad optional declaration permits user-chosen domains but never requests blanket access. The `tabs` permission is unnecessary.
- `scripting` registers persistent content scripts at `document_start`; CSS blocks the initial page before asynchronous storage reads. A native modal dialog in Shadow DOM supplies a top-layer barrier and focus isolation. Emergency access remains available if loading fails.
- Storage writes are serialized in the service worker. Settings updates write individual top-level fields so confirmations cannot overwrite edits.
- Tab mode is document scoped. Interval and daily confirmation are global. An already displayed gate still requires its own intentional confirmation.
- No design reference image was attached. Use charcoal, warm ivory and restrained gold with system typography.
- HTTPS only; exact host matching; no implicit subdomain coverage, local/private hosts or IP literals.
- Existing pages are notified when settings change. New document loads receive the early blocker. Enabling a new site may require a reload for first-paint protection.

## Verified built-in hosts (2026-09-27)

| Platform | Host | Official source |
| --- | --- | --- |
| Tradovate | `trader.tradovate.com` | https://www.tradovate.com/devices/ |
| TopstepX | `topstepx.com` | https://help.topstep.com/en/articles/14434175-topstepx |
| TradeSea | `app.tradesea.ai` | https://help.tradesea.ai/en/articles/13669445-what-is-tradesea |

Browser API references: https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts and https://developer.chrome.com/docs/extensions/reference/api/scripting.

## Validation

Use Node's built-in test runner for core/storage/worker behavior and a real Chromium extension session for UI, document-start blocking, keyboard access, settings and restart persistence. No brokerage account or trading data is needed. Track verified results and remaining manual checks in TESTING.md. Do not claim store approval or untested browser compatibility.
