# Validation record

September 27, 2026. Local macOS testing; isolated headless browser profiles with no brokerage credentials.

## Automated results

| Check | Result |
| --- | --- |
| `npm test` | 25 core and service-worker tests passed |
| `npm run check` | Manifest, 14 runtime JS files, HTML/CSP, icons and generated stylesheet passed |
| `node tests/browser.test.mjs` | 21 integration checks passed in Google Chrome 153.0.8010.49, including TradingView, no uncaught extension/fixture errors |
| Previous browser suite with `HAKI_BROWSER` pointing at Brave | 20 checks passed in Brave's Chromium 149.0.7827.115 before adding TradingView, no uncaught extension/fixture errors; the new TradingView check was run in Chrome |
| `node tests/site.test.mjs` | Landing page links, exact ZIP download, desktop/mobile layout, address-copy control, reduced motion, privacy page and absence of third-party resources passed |

Chrome/Brave browser results and screenshots are under `test-results/` and `test-results/brave/` (generated, not committed). Desktop landing page was tested at 1440 px and mobile at 390 px. The new-tab page was also tested at 390 px with no horizontal overflow.

## Coverage

- Installation opens onboarding; setup requires valid rules and at least one permitted website. Updates do not reopen completed onboarding.
- Exact HTTPS hostname normalization; malformed URLs, IPs, private suffixes and impersonating domains are rejected. Permission denial is checked at the worker boundary and by simulating a denied request in the real UI. The real browser grant path is also exercised. Removal releases custom-site permissions; startup/revocation reconciles missing grants.
- TradingView is available in new and existing installations without changing existing rules or enabled sites. A previously custom `www.tradingview.com` entry becomes built-in without duplication and retains its enabled preference. Chrome verifies exact-host registration and the unchecked gate after access is granted.
- Rule trimming, zero/blank/overlong/21-rule rejection, unique identifiers, ordering, one rule and twenty long rules. Inline new-tab edits propagate to stored trading rules.
- Persistent document-start registration; initial body hidden or modal already present when the fixture's first inline script runs. Full-viewport modal survives aggressive host CSS.
- Unchecked initial checklist, disabled ready button, all-rules confirmation, success/dismissal, restored pointer/keyboard interaction.
- Manual insertion on a page loaded before protection was enabled supplies its own scroll lock. Removing a stale host releases old event guards and scrolling. Native-new-tab fallback titles were separately verified in Chrome and Brave.
- Space and Enter toggle, forward/backward Tab wrap, programmatic focus escape prevention, Escape suppression and reduced-motion CSS. Platform keyboard listeners receive no gate keystrokes.
- Independent tabs/reloads, no SPA repeat, manual gate reset, interval boundaries/global suppression, local-calendar daily behavior and clock rollback.
- Intentional popup pause, immediate release on pause, re-registration on resume, five-second worker-verified bypass and rejection of short holds.
- Corrupt/zero-rule repair UI and preservation of original data in a local recovery copy. Concurrent worker writes preserve confirmation and edits. Reset retains a recovery copy and releases permissions.
- Native Chrome new-tab fallback without recursion; enabled override; preview without opting in; fictional example ads; new-tab checkmarks never write trading confirmation.
- Browser restart retains local rules and preferences. The DevTools `Extensions.loadUnpacked` debug install is session-only, so the harness reattaches the extension and re-grants test hosts after restart, then verifies registration. This is explicitly different from a normal developer-mode install.
- Landing page manual-install instructions and download URL point to a byte-identical release ZIP. There is no payment flow, remote asset or telemetry dependency.

## Manual release checks still needed

These were not claimed as completed by automation:

1. Normal visible Chrome **Load unpacked** install/restart and the native optional-host/new-tab permission dialogs. The automated denial test simulates the permission API's false result rather than controlling Chrome's native consent dialog.
2. Open each authenticated production trading platform in a safe test/demo account and confirm layout, login redirects and broker-specific keyboard behavior. Automated platform pages use locally fulfilled fixtures at the exact HTTPS hostnames, not authenticated live brokerage interfaces. Never place an order to test Haki.
3. VoiceOver/NVDA or another real screen-reader review, 200% zoom, high-contrast mode and touchscreen five-second bypass. Automated keyboard/ARIA coverage is not a full assistive-technology certification.
4. Edge, Arc, Firefox and Safari are untested. Do not advertise compatibility with them. Incognito new tabs cannot be overridden by Chrome extensions.
5. Chrome Web Store human review, developer contact details, public privacy-policy hosting and final screenshot dimension requirements. Package creation is not store approval.
6. Deploy the static website, configure `hakitrade.com`/HTTPS, add hosting-specific disclosures as appropriate, and recheck the deployed download. No DNS or hosting changes were made.

## Reproduce

```sh
npm test
npm run check
node tests/browser.test.mjs
HAKI_BROWSER='/Applications/Brave Browser.app/Contents/MacOS/Brave Browser' \
  HAKI_TEST_OUTPUT=test-results/brave node tests/browser.test.mjs
npm run package
node tests/site.test.mjs
```

Tests use temporary browser profiles and synthetic HTML fixtures. The test harness uses Chrome's extension-management API to grant only the fixture hostnames. Runtime code does not contain test APIs, remote requests, fixture HTML or testing dependencies.
