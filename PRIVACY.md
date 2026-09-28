# Haki Privacy Policy

Effective September 27, 2026 · Version 1.0.0

Haki stores your trading rules and preferences locally in your browser using `chrome.storage.local`.

## What is stored

- Your rule text, identifiers and ordering.
- Trading website hostnames you select and their enabled/disabled state.
- Onboarding/protection preferences, reminder frequency and optional new-tab preference.
- The time and local calendar date of your last gate confirmation.
- One local recovery copy when damaged settings are repaired or settings are reset.

Individual checked-rule state is never persisted. Emergency-access state is temporary and does not record a confirmation.

## What is not collected

Haki does not collect your trades, account numbers, account balances, brokerage credentials, positions, orders, trade history, profit/loss data, passwords or browsing history. It does not read trading data from the platform's DOM.

Haki uses the current hostname to determine whether to display its overlay. While the overlay is active, it handles keyboard and pointer events for its own checklist and prevents those events from interacting with the platform. Those events are not recorded or transmitted. After dismissal, its interaction guards are removed.

Your rules and preferences are not transmitted to a server. Haki has no backend, authentication, analytics SDK, advertising SDK or remote error reporting. Its images, fonts and scripts do not require a network download.

## Website and new-tab access

Haki requests access to each exact HTTPS host you enable. The broad optional host declaration allows you to choose your own trading websites; the extension does not request blanket browsing access. Removing a custom site releases its optional permission. Browser site-access settings can also revoke access.

The optional new-tab feature displays your local rules. With that preference disabled, Haki redirects to Chrome's built-in New Tab page. Chrome's own services and network behavior are governed by Chrome's policies, not Haki.

This release contains no advertisements, sponsored links, advertising network or ad tracking.

## Your controls and retention

Edit your rules and preferences in Settings. Pause protection, remove websites, revoke browser permissions, or uninstall Haki at any time. Reset returns settings to defaults while keeping one local recovery copy; uninstalling clears the extension's local storage. Chrome profile management, device backups, other extensions and organizational browser policies are outside Haki's control.

If future functionality changes how data is handled, this policy and the relevant user controls must be updated before release.
