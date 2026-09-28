import { launch, until } from './browser-driver.mjs';
const run = await launch();
try {
  console.log('Version:', await run.browser.send('Browser.getVersion'));
  console.log('Extension:', await run.install());
  console.log('Targets:', await until(async () => { const t = await run.targets(); return t.some(t => t.url.includes('onboarding')) && t.map(t => ({ type: t.type, url: t.url })); }));
  const page = await run.open('chrome://new-tab-page/');
  console.log('Native new tab:', await until(() => page.evaluate('document.readyState === "complete" && ({url: location.href, title: document.title})')));
} finally { await run.close(); }
