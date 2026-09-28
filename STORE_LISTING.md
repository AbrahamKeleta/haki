# Chrome Web Store submission draft

**Name:** Haki

**Short description:** Your trading rules before your emotions.

**Category recommendation:** Workflow & Planning — Haki supports focus and a repeatable checklist routine. [Google's category guide](https://developer.chrome.com/docs/webstore/best-practices#choose-your-extensions-category-well)

## Description

Haki puts your own trading rules in front of you before you enter your chosen trading websites.

Build a calmer routine: read your rules, check each one, and continue when you are ready. Every new gate starts with a fresh checklist.

MAKE IT YOUR PROCESS
• Create, edit and reorder up to 20 personal rules.
• Choose from 28 built-in browser platforms or add your own HTTPS trading websites.
• See your checklist on every new trading page, every few hours, or once per local calendar day.
• Bring your rules into an optional new-tab page, with quick inline editing.
• Stay in control with pause and intentional emergency access.

PRIVATE AND SIMPLE
Your rules and preferences stay locally in your browser. No Haki account, advertisements, analytics or backend. Website access is requested only for the individual sites you enable.

NEW-TAB CHOICE
Haki registers a new-tab replacement. Its in-app setting starts off; when off, Haki opens Chrome's built-in New Tab page. Turn it on to see your rules whenever you open a new tab.

Willpower before execution.

Haki is a behavioral productivity tool. It does not provide financial advice, trading signals, investment recommendations or risk-management guarantees. You remain responsible for your trading decisions.

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
- Ready: [small promo tile](store-assets/small-promo-440x280.png), 440 × 280; [marquee promo tile](store-assets/marquee-promo-1400x560.png), 1400 × 560.
- Ready: five actual extension screenshots at 1280 × 800. Upload files `01`–`05` in order from [store-assets/](store-assets/README.md). Native PNG dimensions were verified and all images visually reviewed. [Official image requirements](https://developer.chrome.com/docs/webstore/images)
- Plain-text product description: [store-assets/description.txt](store-assets/description.txt).
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
6. Search the 28 built-ins or filter by Futures, Stocks & multi-asset, or FX & CFDs. TradingView uses `www.tradingview.com`: enable it, approve access, then open `https://www.tradingview.com/chart/`. Protection covers that exact hostname. Each platform requires its own user-granted permission; new catalog entries start disabled. Custom sites have a separate 50-site allowance.
7. Enable the new-tab preference in Settings and open a new tab. Rules appear with inline editing. New-tab checkmarks do not confirm a platform gate. With the preference off, Chrome's built-in New Tab page opens.

The extension declares optional `https://*/*` so users can add arbitrary HTTPS websites, but never requests that pattern as a blanket grant. Runtime permissions are requested for each exact hostname only after the user selects it. No remote code is used.
