# Haki Chrome Web Store assets

Prepared for the ad-free 1.0.0 release. Category recommendation: **Workflow & Planning**, which covers focus and task-management tools in [Google's current category guide](https://developer.chrome.com/docs/webstore/best-practices#choose-your-extensions-category-well).

Copy the product description from [description.txt](description.txt). Short description: **Your trading rules before your emotions.**

## Images to upload

| Store field / order | File | Dimensions |
| --- | --- | --- |
| Screenshot 1: rules gate | `01-rules-gate-1280x800.png` | 1280 × 800 |
| Screenshot 2: new tab | `02-new-tab-1280x800.png` | 1280 × 800 |
| Screenshot 3: edit rules | `03-edit-rules-1280x800.png` | 1280 × 800 |
| Screenshot 4: platforms | `04-platforms-1280x800.png` | 1280 × 800 |
| Screenshot 5: frequency | `05-frequency-1280x800.png` | 1280 × 800 |
| Small promo tile | `small-promo-440x280.png` | 440 × 280 |
| Marquee promo tile | `marquee-promo-1400x560.png` | 1400 × 560 |

All files are PNGs at their native upload dimensions. Screenshots are unaltered viewport captures of the installed extension, with sample rules in an isolated Chrome profile. The gate runs over a local fixture; no brokerage account or live trading page is accessed. Promotional artwork is rendered from the HTML/CSS/SVG in `source/` using Haki's existing visual identity.

The assets contain no advertisements, sponsor links, account data, ratings or approval claims. The gate screenshot shows an intermediate checklist state after checking two rules. [Google's image requirements](https://developer.chrome.com/docs/webstore/images)

## Regenerate

Run `npm run store:assets` from the repository root. Requires Node and a Chrome executable supporting the existing browser harness; set `HAKI_BROWSER` if necessary. It generates all seven PNGs, verifies their dimensions, and checks for uncaught browser errors. These development assets and their sources are excluded from the extension ZIP by the runtime-only packaging script.
