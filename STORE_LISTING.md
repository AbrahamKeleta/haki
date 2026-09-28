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
- Icon: `assets/icon128.png`.
- Local screenshots: `test-results/gate.png`, `newtab-clean.png`, `newtab-ads.png`, `settings.png`, `popup.png`, `onboarding.png`. Use screenshots at the store's required dimensions; the browser harness can capture a 1280 × 800 viewport.
- Host the exact policy in PRIVACY.md at a stable public URL and supply developer contact/support details in the store console.
- Verify current store image and disclosure requirements when submitting. No upload, account purchase or publication has been performed by this implementation.
- Authenticated-platform smoke tests and assistive-technology review remain release checks; see TESTING.md.
