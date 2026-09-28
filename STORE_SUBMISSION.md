# Publish Haki to the Chrome Web Store

Requirements checked against Google's documentation on September 27, 2026. The extension ZIP and listing copy are prepared locally. No developer account registration, payment, website deployment, store upload or submission has been performed.

## 1. Set up the publisher account

- Sign in to the [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole) with the Google account that should own Haki long term. Register, accept the terms and pay the one-time fee displayed at signup. Google says the account email cannot be changed directly afterward. [Registration guide](https://developer.chrome.com/docs/webstore/register)
- Enable Google 2-Step Verification; it is required to publish or update extensions. [2-Step Verification policy](https://developer.chrome.com/docs/webstore/program-policies/two-step-verification)
- Set the publisher name and verify a real contact email you monitor. [Account setup](https://developer.chrome.com/docs/webstore/set-up-account)
- Complete the Trader/Non-Trader declaration and any requested verification. Here “Trader” means the publisher's business status, not whether Haki's users trade financial markets. The publisher must determine the correct classification; trader contact details are displayed publicly. [Google's verification FAQ](https://developer.chrome.com/docs/webstore/program-policies/trader-verification-faq)

## 2. Put the website and privacy policy online

Deploy the contents of `website/` using [the deployment instructions](website/README.md). The intended public URLs are `https://hakitrade.com/` and `https://hakitrade.com/privacy.html`; these have not been deployed or verified by this work. A stable public policy URL on another HTTPS host also works while the domain is being configured.

Before submitting, add the actual publisher/support contact and hosting-specific information to the site policy. Keep it consistent with [PRIVACY.md](PRIVACY.md). Verify that the policy opens without authentication. The store's privacy form requests an accurate purpose, permission explanations, data disclosures and policy information. [Privacy fields guide](https://developer.chrome.com/docs/webstore/cws-dashboard-privacy)

## 3. Prepare the store images

| Asset | Requirement | Haki status |
| --- | --- | --- |
| Extension icon | 128 × 128 PNG in the package | `assets/icon128.png` exists; check its presentation against Google's square-icon guidance: 96 × 96 artwork with 16 px transparent padding |
| Small promotional image | 440 × 280 | Ready: `store-assets/small-promo-440x280.png` |
| Screenshots | 1–5, 1280 × 800 preferred or 640 × 400; full bleed, square corners | Ready: five 1280 × 800 PNGs, numbered `01`–`05` in `store-assets/` |
| Marquee image | 1400 × 560, optional | Ready: `store-assets/marquee-promo-1400x560.png` |

These sizes and required assets come from [Google's image guide](https://developer.chrome.com/docs/webstore/images). The completed images show the actual gate, new-tab page, rule editor, platform settings and frequency settings with sample rules. Use the upload order in [store-assets/README.md](store-assets/README.md). Older ad-preview screenshots in local test output are obsolete.

## 4. Validate and upload the extension ZIP

Finish the visible Chrome, demo-platform and accessibility checks in [TESTING.md](TESTING.md). Automated coverage currently includes 29 unit/worker tests and 23 Chrome integration checks, including the expanded 28-platform catalog. Live authenticated brokerage layouts are not covered by the fixture tests.

From this repository:

```sh
npm test
npm run check
npm run package
```

In the dashboard choose **New item** and upload **`dist/haki-1.0.0.zip`**. It contains the extension with `manifest.json` at the root. `dist/hakitrade-site.zip` is the website deployment archive and must not be uploaded as the extension. The extension package omits tests, source reference artwork and the landing page. [Upload and submission guide](https://developer.chrome.com/docs/webstore/publish)

## 5. Fill in the listing and reviewer information

- **Store listing:** Use the name, short description and full description in [STORE_LISTING.md](STORE_LISTING.md). Choose **Workflow & Planning**, upload the prepared images, and enter the real website/support details. [Current category guide](https://developer.chrome.com/docs/webstore/best-practices#choose-your-extensions-category-well)
- **Privacy practices:** Paste the single-purpose and permission justifications from that file. Remote code is **No**. Haki keeps rules, selected hostnames, preferences and confirmation dates locally; it has no developer-side transmission, analytics or ad network. Answer the live data questionnaire according to its definitions and the policy; do not treat local storage as if no data is handled at all. The broad optional host declaration supports user-added websites, while each actual grant covers only the exact site the user enables. [Privacy guide](https://developer.chrome.com/docs/webstore/cws-dashboard-privacy)
- **New-tab behavior:** Keep the listing disclosure: Chrome registers an override at installation; the in-app preference starts off and opens Chrome's built-in page until enabled. This submission contains no advertisements, sponsor links or ad-preview controls.
- **Distribution:** Choose Public for launch, Unlisted for installation by link, or Private for designated testers; choose target regions. All three still require review. Haki currently has no purchase or licensing flow. [Distribution guide](https://developer.chrome.com/docs/webstore/cws-dashboard-distribution)
- **Test instructions:** Paste the reviewer steps in [STORE_LISTING.md](STORE_LISTING.md). Haki itself requires no credentials. Reviewers can exercise the gate on a public custom test website without a brokerage account.

## 6. Submit for review and release

Resolve dashboard validation errors and select **Submit for Review**. Use deferred publishing if you want to coordinate the website launch after approval. An approved deferred submission must be published within 30 days or it returns to draft. [Publishing guide](https://developer.chrome.com/docs/webstore/publish)

Google says most reviews finish within a few days, but some take a few weeks. A new publisher/extension and broad host declarations can receive additional scrutiny. Same-day approval is not guaranteed. Monitor the dashboard and publisher email for questions or rejection details. [Review process](https://developer.chrome.com/docs/webstore/review-process)

After approval, install the store version in a fresh Chrome profile and repeat onboarding, TradingView gating, emergency access and new-tab checks. Confirm that the hosted privacy page and listing match the released behavior.

Replace the landing page's manual ZIP download buttons with the actual store listing URL and label them **Add to Chrome**. Update installation instructions to the store flow and redeploy the site. Keep the publisher account, source repository and release ZIP available for maintenance; subsequent extension uploads need an increased manifest version.

## Remaining before submission

- [ ] Publisher registration, fee, 2-Step Verification, verified contact and status declaration.
- [ ] Public website/privacy URL, real support contact and hosting disclosures.
- [x] Five store-sized screenshots, required small promo image and optional marquee image prepared and visually reviewed.
- [ ] Icon presentation reviewed against Google's padding guidance.
- [ ] Manual release checks from TESTING.md.
- [ ] Dashboard listing, privacy declarations, distribution and reviewer notes entered.
- [ ] ZIP uploaded and review requested by the publisher.

The prepared files make the submission repeatable; they do not constitute store approval.
