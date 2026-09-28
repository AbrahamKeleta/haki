# hakitrade.com landing page

Static HTML/CSS/JavaScript, local images and a real extension ZIP download. No payment integration, backend, cookies, or analytics code.

1. From the repository root, run `npm run package`. This writes `website/downloads/haki-1.0.0.zip` and creates `dist/hakitrade-site.zip` containing the deployable website.
2. Upload the contents of `website/` (or extract the site ZIP) to any static host. Use `website/` as the document root, not the extension root. The supplied ZIP omits this README.
3. Connect `hakitrade.com` in that host's domain settings and enable HTTPS. The homepage is `index.html`; privacy policy is `privacy.html`.
4. Verify `/downloads/haki-1.0.0.zip` returns the ZIP, then download, extract and Load unpacked in Chrome. Keep that file available for every release.

No deployment or DNS change has been performed. There are no checkout buttons or claims that payment is configured. Hosting-provider disclosures/contact details can be added once the host is selected. For a future Web Store release, replace download links with the actual listing URL and update the installation instructions.

Local preview: `python3 -m http.server 8080 --directory website`, then visit `http://localhost:8080`. Clipboard copying works on localhost/HTTPS and has a text fallback.
