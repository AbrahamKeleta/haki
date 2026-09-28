// Capture the installed extension in an isolated profile and render local promo artwork.
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { launch, until, pause } from '../tests/browser-driver.mjs';
import { defaultState, EXAMPLE_RULES } from '../shared/constants.js';

const output = resolve('store-assets');
await mkdir(output, { recursive: true });
const run = await launch();
const errors = [];
async function frame(page, width = 1280, height = 800) {
  page.on('Runtime.exceptionThrown', event => errors.push(event.exceptionDetails.text));
  await page.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });
  await page.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
}
async function capture(page, name, width = 1280, height = 800) {
  await page.send('Page.bringToFront');
  await page.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 0, y: 0 });
  await page.evaluate('document.fonts.ready');
  await pause(120);
  const { data } = await page.send('Page.captureScreenshot', {
    format: 'png', captureBeyondViewport: false,
    clip: { x: 0, y: 0, width, height, scale: 1 },
  });
  const png = Buffer.from(data, 'base64');
  assert.equal(png.readUInt32BE(16), width);
  assert.equal(png.readUInt32BE(20), height);
  await writeFile(`${output}/${name}.png`, png);
  console.log(`${name}.png — ${width} × ${height}`);
}
try {
  const { id } = await run.install();
  const origin = `chrome-extension://${id}`;
  const target = await until(async () => (await run.targets()).find(t => t.url === `${origin}/onboarding/onboarding.html`));
  const ui = await run.attach(target.targetId);
  await until(() => ui.evaluate('document.readyState === "complete"'));
  const state = defaultState();
  state.rules = EXAMPLE_RULES.map((text, order) => ({ id: `sample-${order}`, text, order }));
  state.onboardingComplete = true;
  state.newTabSettings.enabled = true;
  await ui.evaluate(`chrome.storage.local.set(${JSON.stringify(state)})`);
  const message = async (type, payload = {}) => {
    const result = await ui.evaluate(`chrome.runtime.sendMessage(${JSON.stringify({ type, ...payload })})`);
    assert.equal(result.ok, true, result.error);
    return result;
  };
  // These permissions exist only in this disposable profile. No brokerage is contacted.
  for (const platform of state.platforms.slice(0, 4)) {
    const management = await run.open('chrome://extensions/');
    await until(() => management.evaluate('typeof chrome.developerPrivate?.addHostPermission === "function"'));
    await management.evaluate(`chrome.developerPrivate.addHostPermission(${JSON.stringify(id)},${JSON.stringify(`https://${platform.hostname}/*`)})`);
    await run.browser.send('Target.closeTarget', { targetId: management.targetId });
    assert.equal(await ui.evaluate(`chrome.permissions.request({origins:[${JSON.stringify(`https://${platform.hostname}/*`)}]})`), true);
    await message('SET_PLATFORM', { platform: { ...platform, enabled: true } });
  }

  const gatePage = await run.open();
  await frame(gatePage);
  await gatePage.send('Fetch.enable', { patterns: [{ urlPattern: 'https://*/*', requestStage: 'Request' }] });
  gatePage.on('Fetch.requestPaused', event => {
    void gatePage.send('Fetch.fulfillRequest', {
      requestId: event.requestId, responseCode: 200,
      responseHeaders: [{ name: 'Content-Type', value: 'text/html' }],
      body: Buffer.from('<!doctype html><html><head><title>Local Haki screenshot fixture</title></head><body></body></html>').toString('base64'),
    });
  });
  await gatePage.send('Page.navigate', { url: 'https://trader.tradovate.com/haki-local-fixture' });
  const shadow = 'document.querySelector("#haki-root")?.shadowRoot';
  await until(() => gatePage.evaluate(`${shadow}?.querySelectorAll('.rule').length === 4`));
  await gatePage.evaluate(`${shadow}.querySelectorAll('.rule')[0].click();${shadow}.querySelectorAll('.rule')[1].click();document.activeElement?.blur()`);
  await capture(gatePage, '01-rules-gate-1280x800');

  const newtab = await run.open(`${origin}/newtab/newtab.html`);
  await frame(newtab);
  await until(() => newtab.evaluate('document.querySelectorAll(".reminder").length === 4 && !document.querySelector("#app").hidden'));
  assert.equal(await newtab.evaluate('document.querySelector("#ads-toggle, .example-ad") === null'), true);
  await capture(newtab, '02-new-tab-1280x800');

  for (const [section, name] of [
    ['rules', '03-edit-rules-1280x800'],
    ['platforms', '04-platforms-1280x800'],
    ['frequency', '05-frequency-1280x800'],
  ]) {
    const page = await run.open(`${origin}/options/options.html#${section}`);
    await frame(page);
    await until(() => page.evaluate(`!document.getElementById(${JSON.stringify(section)}).hidden && document.querySelectorAll('.edit-row').length === 4`));
    await capture(page, name);
  }
  for (const [pageName, name, width, height] of [
    ['small', 'small-promo-440x280', 440, 280],
    ['marquee', 'marquee-promo-1400x560', 1400, 560],
  ]) {
    const page = await run.open(pathToFileURL(resolve(`store-assets/source/${pageName}.html`)).href);
    await frame(page, width, height);
    await until(() => page.evaluate('document.readyState === "complete"'));
    await capture(page, name, width, height);
  }
  assert.deepEqual(errors, []);
  console.log('Seven PNGs captured from the ad-free release and local brand artwork; no uncaught browser errors.');
} finally { await run.close(); }
