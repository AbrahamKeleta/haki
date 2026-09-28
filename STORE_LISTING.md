# Chrome Web Store submission draft

**Name:** Haki

**Short description:** Your trading rules before your emotions.

**Category suggestion:** Productivity

## Description

Willpower before execution.

Haki helps traders follow their process by placing their own trading rules in front of them before they enter their trading platforms.

Create your rules, choose your trading websites, and decide how often Haki should remind you. Every rule starts unchecked. Read, check, and continue with intention.

• Write, edit and reorder up to 20 personal trading rules.
• Protect Tradovate, TopstepX, TradeSea, TradingView, or your own HTTPS trading website.
• Choose every new trading tab, every few hours, or once per local day.
• Bring your rules into each new tab with an optional calm reminder page and inline editing.
• Stay in control with a pause option and intentional emergency access.
• Keep your rules in your browser, without an account or backend.

No signals. No strategies. No trade recommendations.

Just your rules, before you trade.

Haki is a behavioral productivity tool for traders. It does not provide financial advice, trading signals, investment recommendations, or risk management guarantees. You remain responsible for your trading decisions.

Haki registers a new-tab replacement. Its in-app setting is optional: when off, Haki opens Chrome's built-in New Tab page. Example advertisement cards are optional, clearly labeled local design previews; no advertising network or tracking is included.

## Permission justifications

- **Single purpose:** Remind users of their own trading rules before platform use and on their optional new-tab ritual page.
- **storage:** Store only local rules, chosen sites, preferences, confirmation dates and a recovery copy.
- **scripting:** Persist exact-site content scripts at document start so interaction is blocked before the trading page appears; show manually requested gates and recover from a broken gate.
- **Optional HTTPS host access:** The user may choose any public HTTPS trading website. Request each exact host individually in response to the user's enable/add action. Built-ins also require opt-in access. No blanket request or subdomain wildcard grant.
- **New-tab override:** Show the user's rules and inline rule editing when they opt in, otherwise open Chrome's built-in new-tab page.
- **Remote code:** None. All runtime JS/CSS/assets are in the uploaded ZIP.
- **User data:** No developer-side collection, transmission, sale, analytics or ad tracking. Review the actual privacy disclosure questionnaire against PRIVACY.md when submitting.

## Release assets and outstanding submission work

- ZIP: `dist/haki-1.0.0.zip`, generated with `npm run package`.
- Icon: `assets/icon128.png`; review its padding against the store's icon guidance.
- Required promotional image: 440 × 280, still to create. Optional marquee: 1400 × 560.
- Required screenshots: 1–5 at 1280 × 800 or 640 × 400. Existing captures in `test-results/` must be recaptured at these dimensions. Suggested views: gate, clean new tab, settings. [Official image requirements](https://developer.chrome.com/docs/webstore/images)
- Publish `website/privacy.html` at a stable HTTPS URL, keep it consistent with PRIVACY.md, and supply actual developer contact/support and hosting information.
- Follow [STORE_SUBMISSION.md](STORE_SUBMISSION.md) for the verified account-to-publication checklist. No upload, account purchase or publication has been performed.
- Authenticated-platform smoke tests and assistive-technology review remain release checks; see TESTING.md.

## Reviewer test instructions

Haki is a local rules-reminder tool. No Haki account, payment or credentials are required. It provides no trading signals or order execution.

1. Install and complete onboarding. Enter at least one personal rule.
2. For testing without a brokerage account, add `https://example.com` as a custom website and approve its site-access request. Select **Every new trading tab** and finish setup.
3. Open or reload `https://example.com`. The full-page Haki gate appears with all rules unchecked. Check every rule, then click **READY TO TRADE**; the page becomes usable after the confirmation animation. Reload to see a fresh gate.
4. Open the extension popup on that page. **Show Haki Now** opens another gate. **Emergency Access** reveals a button that must be held continuously for five seconds. Pause requires a separate confirmation.
5. In Settings, edit/reorder rules, toggle websites, and test interval/daily frequency. A confirmation in one site suppresses newly opened protected pages according to the chosen interval or local day; tab mode remains independent.
6. TradingView is a built-in option for `www.tradingview.com`. Enable it, approve access, then open `https://www.tradingview.com/chart/`. Protection covers that exact hostname. Tradovate, TopstepX and TradeSea are also built in; each requires its own user-granted permission.
7. Enable the new-tab preference in Settings and open a new tab. Rules appear with inline editing. New-tab checkmarks do not confirm a platform gate. With the preference off, Chrome's built-in New Tab page opens.
8. Optional example ads can be previewed from Settings. These are clearly labeled, fictional local design mockups, off by default, with no external links, network or tracking.

The extension declares optional `https://*/*` so users can add arbitrary HTTPS websites, but never requests that pattern as a blanket grant. Runtime permissions are requested for each exact hostname only after the user selects it. No remote code is used.
