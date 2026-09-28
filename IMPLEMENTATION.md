# Haki V1 implementation

Build the supplied V1 specification as a dependency-free, local-only Manifest V3 extension. Commit each functional layer.

## Milestones

1. Foundation: validated local storage, exact domain normalization, centralized frequency engine and tests.
2. Protection: optional host permissions, persistent document-start registration, isolated accessible gate, confirmation and emergency access.
3. Product: onboarding, rule editor, platform management, frequency settings and popup.
4. Release: browser integration tests, icons, privacy policy, store copy and uploadable ZIP.
5. Added scope: optional new-tab ritual with inline rule editing and two local mock ad cards for Tradeify and Lucid Trading. Ad previews and the new-tab feature are off by default. Arrow links open the companies' websites without Haki click tracking.
6. Added scope: static hakitrade.com landing page, actual extension ZIP download, clear manual-install instructions and a public privacy page. No payment integration or deployment.

## Decisions

- Only `storage` and `scripting` are required. Site access is optional and requested for exact HTTPS hosts. The broad optional declaration permits user-chosen domains but never requests blanket access. The `tabs` permission is unnecessary.
- `scripting` registers persistent content scripts at `document_start`; CSS blocks the initial page before asynchronous storage reads. A native modal dialog in Shadow DOM supplies a top-layer barrier and focus isolation. Emergency access remains available if loading fails.
- Storage writes are serialized in the service worker. Settings updates write individual top-level fields so confirmations cannot overwrite edits.
- Tab mode is document scoped. Interval and daily confirmation are global. An already displayed gate still requires its own intentional confirmation.
- Supplied reference: near-black navy, electric blue, cyan outlines, cool white and a subtle chart grid. Use system typography and restrained glow.
- HTTPS only; exact host matching; no implicit subdomain coverage, local/private hosts or IP literals.
- Existing pages are notified when settings change. New document loads receive the early blocker. Enabling a new site may require a reload for first-paint protection.
- Chrome new-tab overrides are manifest-level. The disabled preference opens `chrome://new-tab-page/` directly to avoid override recursion. This fallback was verified in isolated Chrome 153. It cannot restore another extension's new-tab override. The preview route works without opting in.
- Reading/checking rules in a new tab is reflection only and never updates trading-gate confirmation state. Mock ad cards contain local artwork and direct external links, with no remote assets or advertising SDKs. They do not imply a sponsorship.
- The catalog contains 28 exact hosts, with category filters and search. Fifty custom sites are allowed independently of built-ins. Normalization appends new built-ins disabled, preserves existing selections and promotes custom entries matching a built-in hostname. Legacy lists at the old 50-total limit remain valid across reads and saves.
- The landing-page carousel uses static markup generated from the central catalog during packaging. Two identical groups scroll left seamlessly; the second is hidden from assistive technology. Hover, keyboard focus and a Pause control stop motion. Reduced-motion users see one static, wrapping list. There are no separators between names.

## Verified built-in hosts (2026-09-27)

| Platform | Host | Official source |
| --- | --- | --- |
| Tradovate | `trader.tradovate.com` | https://www.tradovate.com/devices/ |
| TopstepX | `topstepx.com` | https://help.topstep.com/en/articles/14434175-topstepx |
| TradeSea | `app.tradesea.ai` | https://help.tradesea.ai/en/articles/13669445-what-is-tradesea |
| TradingView | `www.tradingview.com` | https://www.tradingview.com/chart/ |

The remaining 24 approved hostnames and primary sources are in [PLATFORM_PROPOSAL.md](PLATFORM_PROPOSAL.md). ProjectX entries are excluded. Regional and broker-specific variants remain individually addable custom hosts. Public hostname verification and local browser fixtures do not establish authenticated platform compatibility; safe-account smoke tests remain release checks.

Browser API references: https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts and https://developer.chrome.com/docs/extensions/reference/api/scripting.

## Validation

Use Node's built-in test runner for core/storage/worker behavior and a real Chromium extension session for UI, document-start blocking, keyboard access, settings and restart persistence. No brokerage account or trading data is needed. Track verified results and remaining manual checks in TESTING.md. Do not claim store approval or untested browser compatibility.
