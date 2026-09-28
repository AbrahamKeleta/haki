import assert from 'node:assert/strict';
import { writeFile, mkdir } from 'node:fs/promises';
import { launch, until, pause } from './browser-driver.mjs';
import { BUILT_IN_PLATFORMS } from '../shared/constants.js';

const results = [], errors = [];
let run, extensionId, ui, worker;
const origin = () => `chrome-extension://${extensionId}`;
const gate = `document.querySelector('#haki-root')?.shadowRoot`;
function watch(page) { page.on('Runtime.exceptionThrown', event => errors.push(event.exceptionDetails.exception?.description || event.exceptionDetails.text)); return page; }
async function check(name, callback) { await callback(); results.push(name); console.log(`PASS ${name}`); }
async function message(type, data = {}) {
  const response = await ui.evaluate(`chrome.runtime.sendMessage(${JSON.stringify({ type, ...data })})`);
  assert.equal(response.ok, true, response.error); return response;
}
async function click(page, selector) {
  const point = await page.evaluate(`(() => { const el = ${selector}; if (!el) throw Error('Missing click target'); el.scrollIntoView({block:'center'}); const r = el.getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2}; })()`);
  await page.send('Input.dispatchMouseEvent', { type: 'mousePressed', button: 'left', clickCount: 1, ...point });
  await page.send('Input.dispatchMouseEvent', { type: 'mouseReleased', button: 'left', clickCount: 1, ...point });
}
const dom = selector => `document.querySelector(${JSON.stringify(selector)})`;
async function key(page, key, code, modifiers = 0) {
  await page.send('Input.dispatchKeyEvent', { type: 'keyDown', key, code: code || key, modifiers, windowsVirtualKeyCode: key === 'Tab' ? 9 : key === 'Escape' ? 27 : key === ' ' ? 32 : key === 'Enter' ? 13 : 65 });
  await page.send('Input.dispatchKeyEvent', { type: 'keyUp', key, code: code || key, modifiers });
}
async function configuredPage(hostname = 'trader.tradovate.com') {
  const page = watch(await run.open());
  await page.send('Fetch.enable', { patterns: [{ urlPattern: 'https://*/*', requestStage: 'Request' }] });
  page.on('Fetch.requestPaused', event => {
    const html = `<!doctype html><html><head><title>Offline platform fixture</title><style>*{box-sizing:border-box}body{margin:0;background:white;color:black}button{position:fixed;left:25px;top:25px;width:100px;height:60px}div{color:red}#aggressive{position:fixed;inset:0;z-index:2147483647}dialog{background:red!important}</style></head><body><div id="aggressive"><button id="trade">Fixture button</button></div><script>window.pageCalls={clicks:0,keys:0};window.early={hidden:getComputedStyle(document.body).display==='none',gate:!!document.querySelector('#haki-root')};document.querySelector('#trade').onclick=()=>pageCalls.clicks++;window.addEventListener('keydown',()=>pageCalls.keys++,true);document.querySelector('#trade').focus();</script></body></html>`;
    void page.send('Fetch.fulfillRequest', { requestId: event.requestId, responseCode: 200, responseHeaders: [{ name: 'Content-Type', value: 'text/html' }], body: Buffer.from(html).toString('base64') });
  });
  await page.send('Page.navigate', { url: `https://${hostname}/fixture` });
  await until(() => page.evaluate('document.readyState === "complete" && !!window.early'));
  return page;
}
async function waitGate(page) { await until(() => page.evaluate(`${gate}?.querySelectorAll('.rule').length > 0`)); }
async function finishGate(page) {
  const count = await page.evaluate(`${gate}.querySelectorAll('.rule').length`);
  for (let i = 0; i < count; i++) await click(page, `${gate}.querySelectorAll('.rule')[${i}]`);
  await click(page, `${gate}.querySelector('[data-action=confirm]')`);
  await until(() => page.evaluate(`!document.querySelector('#haki-root')`));
}
async function grant(hostname) {
  // Use Chrome's own extension management API in this isolated test profile.
  const management = await run.open('chrome://extensions/');
  await until(() => management.evaluate('typeof chrome.developerPrivate?.addHostPermission === "function"'));
  await management.evaluate(`chrome.developerPrivate.addHostPermission(${JSON.stringify(extensionId)},${JSON.stringify(`https://${hostname}/*`)})`);
  await run.browser.send('Target.closeTarget', { targetId: management.targetId });
  assert.equal(await ui.evaluate(`chrome.permissions.request({origins:[${JSON.stringify(`https://${hostname}/*`)}]})`), true);
}

try {
  run = await launch();
  console.log((await run.browser.send('Browser.getVersion')).product);
  ({ id: extensionId } = await run.install());
  const target = await until(async () => (await run.targets()).find(t => t.url === `${origin()}/onboarding/onboarding.html`));
  ui = watch(await run.attach(target.targetId));
  const workerTarget = await until(async () => (await run.targets()).find(t => t.url === `${origin()}/background/service-worker.js`));
  worker = watch(await run.attach(workerTarget.targetId));
  await check('fresh installation opens onboarding', async () => {
    await until(() => ui.evaluate('document.querySelector(".welcome-title")?.textContent.includes("Willpower")'));
    await run.screenshot(ui, 'onboarding');
  });
  await check('new-tab opt-out opens native Chrome page without recursion', async () => {
    const page = await run.open(`${origin()}/newtab/newtab.html`);
    await until(() => page.evaluate('location.href === "chrome://new-tab-page/"'));
  });
  await check('onboarding creates rules and requires a permitted platform', async () => {
    await click(ui, dom('#next'));
    await until(() => ui.evaluate('document.querySelectorAll(".edit-row").length === 4'));
    await ui.evaluate(`document.querySelector('.edit-row input').value='Only trade my setup'; document.querySelector('.edit-row input').dispatchEvent(new Event('input',{bubbles:true}))`);
    await click(ui, dom('#next'));
    await until(() => ui.evaluate(`document.querySelectorAll('.platform-row').length === ${BUILT_IN_PLATFORMS.length}`));
    await click(ui, dom('#next'));
    assert.match(await ui.evaluate('document.querySelector("#status").textContent'), /at least one/);
    await grant('trader.tradovate.com');
    await click(ui, dom('[aria-label="Protect Tradovate"]'));
    await until(() => ui.evaluate('document.querySelector("#status").textContent.startsWith("Saved")'));
    await click(ui, dom('#next'));
    await until(() => ui.evaluate('!!document.querySelector(".frequency-options")'));
    await click(ui, dom('#next'));
    await until(() => ui.evaluate('!!document.querySelector("#newtab-optin")'));
    await click(ui, dom('#newtab-optin'));
    await click(ui, dom('#next'));
    await until(() => ui.evaluate('location.pathname.includes("options") && !!document.querySelector(".edit-row")'));
    assert.equal((await message('GET_STATE')).state.onboardingComplete, true);
    await run.screenshot(ui, 'settings');
  });
  await check('permission rejection leaves a site disabled and explains access', async () => {
    await ui.evaluate(`location.hash='platforms';globalThis.realPermissionRequest=chrome.permissions.request;chrome.permissions.request=async()=>false;`);
    await click(ui, dom('[aria-label="Protect TopstepX"]'));
    await until(() => ui.evaluate('document.querySelector("#platform-status").textContent.includes("wasn’t granted")'));
    assert.equal((await message('GET_STATE')).state.platforms.find(p => p.id === 'topstepx').enabled, false);
    await ui.evaluate('chrome.permissions.request=globalThis.realPermissionRequest;location.hash="rules"');
  });
  await check('platform search and category filters preserve choices, focus and permission behavior', async () => {
    await ui.evaluate('location.hash="platforms"');
    const searchFor = async value => ui.evaluate(`document.querySelector('#platform-search').value=${JSON.stringify(value)};document.querySelector('#platform-search').dispatchEvent(new Event('input',{bubbles:true}))`);
    await searchFor('  WEBULL  ');
    assert.equal(await ui.evaluate('document.querySelectorAll(".platform-row").length'), 1);
    await click(ui, dom('[data-category="fx"]'));
    assert.equal(await ui.evaluate('document.querySelectorAll(".platform-row").length'), 0);
    assert.match(await ui.evaluate('document.querySelector(".platform-empty").textContent'), /No matching/);
    await click(ui, dom('.platform-clear'));
    assert.equal(await ui.evaluate('document.activeElement.id'), 'platform-search');
    assert.equal(await ui.evaluate('document.querySelectorAll(".platform-row").length'), BUILT_IN_PLATFORMS.length);
    await click(ui, dom('[data-category="fx"]'));
    assert.equal(await ui.evaluate('document.querySelectorAll(".platform-row").length'), BUILT_IN_PLATFORMS.filter(p => p.category === 'fx').length);
    await searchFor('trade.oanda.com'); await grant('trade.oanda.com');
    await click(ui, dom('[aria-label="Protect OANDA Web"]'));
    await until(async () => (await message('GET_STATE')).state.platforms.find(p => p.id === 'oanda').enabled);
    await until(() => ui.evaluate('document.activeElement.getAttribute("aria-label") === "Protect OANDA Web"'));
    assert.equal(await ui.evaluate('document.querySelector("#platform-search").value'), 'trade.oanda.com');
    assert.equal(await ui.evaluate('document.querySelector("[data-category=fx]").getAttribute("aria-pressed")'), 'true');
    await click(ui, dom('[aria-label="Protect OANDA Web"]'));
    await until(async () => !(await message('GET_STATE')).state.platforms.find(p => p.id === 'oanda').enabled);
    await click(ui, dom('.platform-clear')); await click(ui, dom('[data-category="custom"]'));
    await ui.evaluate(`chrome.permissions.request=async()=>false;document.querySelector('#custom-host').value='review-fixture.example.org';document.querySelector('.add-site').requestSubmit()`);
    await until(() => ui.evaluate(`!!${dom('[aria-label="Remove review-fixture.example.org"]')}`));
    assert.equal(await ui.evaluate(`${dom('[aria-label="Protect review-fixture.example.org"]')}.checked`), false);
    await ui.evaluate('chrome.permissions.request=globalThis.realPermissionRequest');
    await click(ui, dom('[aria-label="Remove review-fixture.example.org"]'));
    await until(() => ui.evaluate('document.querySelectorAll(".platform-row").length === 0'));
    await click(ui, dom('.platform-clear'));
    await run.screenshot(ui, 'platform-catalog');
    await ui.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: false });
    assert.equal(await ui.evaluate('document.documentElement.scrollWidth <= innerWidth'), true);
    await run.screenshot(ui, 'platform-catalog-mobile');
    await ui.send('Emulation.clearDeviceMetricsOverride');
    await ui.evaluate('location.hash="rules"');
  });
  let trading;
  await check('first paint is blocked and all rules begin unchecked', async () => {
    trading = await configuredPage(); await waitGate(trading);
    assert.ok(await trading.evaluate('window.early.hidden || window.early.gate'));
    assert.equal(await trading.evaluate(`${gate}.querySelectorAll('[aria-checked=true]').length`), 0);
    assert.equal(await trading.evaluate(`${gate}.querySelector('[data-action=confirm]').disabled`), true);
    assert.equal(await trading.evaluate(`${gate}.querySelector('dialog').matches(':modal')`), true);
    await run.screenshot(trading, 'gate');
  });
  await check('modal blocks page clicks, shortcuts, Escape and focus escape', async () => {
    await click(trading, dom('#trade'));
    assert.equal(await trading.evaluate('pageCalls.clicks'), 0);
    await key(trading, 'Escape');
    assert.ok(await trading.evaluate(`!!${gate}`));
    await key(trading, 'a', 'KeyA');
    assert.equal(await trading.evaluate('pageCalls.keys'), 0);
    await trading.evaluate(`document.querySelector('#trade').focus()`);
    assert.notEqual(await trading.evaluate('document.activeElement?.id'), 'trade');
    await click(trading, `${gate}.querySelector('.rule')`);
    await key(trading, ' ', 'Space');
    assert.equal(await trading.evaluate(`${gate}.querySelector('.rule').getAttribute('aria-checked')`), 'false');
    await key(trading, 'Enter');
    assert.equal(await trading.evaluate(`${gate}.querySelector('.rule').getAttribute('aria-checked')`), 'true');
    await key(trading, 'Tab', 'Tab', 8);
    assert.equal(await trading.evaluate(`${gate}.activeElement?.dataset.index`), '3');
    await key(trading, 'Tab');
    assert.equal(await trading.evaluate(`${gate}.activeElement?.dataset.index`), '0');
    // Restore unchecked state for the full completion flow.
    await key(trading, ' ');
  });
  await check('every rule is required, confirmation saves, platform becomes usable', async () => {
    await finishGate(trading);
    assert.ok((await message('GET_STATE')).state.confirmation.lastConfirmedAt);
    await click(trading, dom('#trade'));
    assert.equal(await trading.evaluate('pageCalls.clicks'), 1);
    await key(trading, 'a', 'KeyA'); assert.equal(await trading.evaluate('pageCalls.keys'), 1);
    assert.equal(await trading.evaluate('document.documentElement.hasAttribute("data-haki-blocked")'), false);
  });
  await check('SPA navigation stays clear; reload and second tab each gate', async () => {
    await trading.evaluate('history.pushState({}, "", "/workspace")'); await pause(120);
    assert.equal(await trading.evaluate(`!!${gate}`), false);
    await trading.send('Page.reload'); await waitGate(trading);
    const second = await configuredPage(); await waitGate(second);
    await finishGate(second);
  });
  await check('manual gate resets unchecked even after a confirmation', async () => {
    await run.browser.send('Target.activateTarget', { targetId: trading.targetId });
    await message('SHOW_NOW');
    assert.equal(await trading.evaluate(`${gate}.querySelectorAll('[aria-checked=true]').length`), 0);
  });
  await check('emergency bypass rejects short holds and releases only its document', async () => {
    const short = await message('BYPASS_START');
    const denied = await ui.evaluate(`chrome.runtime.sendMessage({type:'BYPASS_END',token:${JSON.stringify(short.token)}})`);
    assert.equal(denied.ok, false);
    const start = await message('BYPASS_START'); await pause(5100);
    await message('BYPASS_END', { token: start.token });
    await until(() => trading.evaluate(`!${gate}`));
    await trading.send('Page.reload'); await waitGate(trading);
  });
  await check('pause releases existing gate and unregisters early scripts', async () => {
    await message('SET_ENABLED', { enabled: false });
    await until(() => trading.evaluate(`!${gate}`));
    assert.equal((await ui.evaluate('chrome.scripting.getRegisteredContentScripts()')).length, 0);
    await message('SET_ENABLED', { enabled: true }); await waitGate(trading);
  });
  await check('interval confirmation applies globally across permitted platforms', async () => {
    await grant('topstepx.com');
    await message('SET_PLATFORM', { platform: { hostname: 'topstepx.com', enabled: true } });
    await message('SAVE_PROMPT', { promptSettings: { mode: 'interval', intervalHours: 4 } });
    const second = await configuredPage('topstepx.com');
    await until(() => second.evaluate('document.documentElement.hasAttribute("data-haki-ready")'));
    assert.equal(await second.evaluate(`!!${gate}`), false);
    await worker.evaluate(`chrome.storage.local.set({confirmation:{lastConfirmedAt:Date.now()-5*3600000,lastConfirmedLocalDate:null}})`);
    await second.send('Page.reload'); await waitGate(second); await finishGate(second);
    const third = await configuredPage(); await until(() => third.evaluate('document.documentElement.hasAttribute("data-haki-ready")'));
    assert.equal(await third.evaluate(`!!${gate}`), false);
  });
  await check('daily mode suppresses today and prompts after local date changes', async () => {
    await message('SAVE_PROMPT', { promptSettings: { mode: 'daily', intervalHours: 4 } });
    const page = await configuredPage(); await until(() => page.evaluate('document.documentElement.hasAttribute("data-haki-ready")'));
    assert.equal(await page.evaluate(`!!${gate}`), false);
    await worker.evaluate(`chrome.storage.local.set({confirmation:{lastConfirmedAt:Date.now(),lastConfirmedLocalDate:'2000-01-01'}})`);
    await page.send('Page.reload'); await waitGate(page); await finishGate(page);
  });
  await check('corrupt rules show repair UI and local recovery preserves original', async () => {
    await message('SAVE_PROMPT', { promptSettings: { mode: 'tab', intervalHours: 4 } });
    await worker.evaluate('chrome.storage.local.set({rules:[{id:"broken",text:" "}]})');
    const page = await configuredPage();
    await until(() => page.evaluate(`${gate}?.querySelector('[data-action=emergency]') !== null && !!${gate}`));
    assert.match(await page.evaluate(`${gate}.textContent`), /couldn’t load/);
    await message('SAVE_RULES', { rules: [{ id: 'one', text: 'Accept the risk before entering' }] });
    assert.equal(await worker.evaluate('chrome.storage.local.get("recoveryBackup").then(value => value.recoveryBackup.data.rules[0].id)'), 'broken');
    await page.send('Page.reload'); await waitGate(page); await finishGate(page);
  });
  await check('twenty long rules scroll inside the gate and support reduced motion', async () => {
    await message('SAVE_RULES', { rules: Array.from({ length: 20 }, (_, i) => ({ id: `rule${i}`, text: `Rule ${i + 1}. ${'Follow my process. '.repeat(9)}` })) });
    const page = await configuredPage(); await waitGate(page);
    await page.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
    assert.equal(await page.evaluate(`getComputedStyle(${gate}.querySelector('.rule')).transitionDuration`), '0s');
    assert.ok(await page.evaluate(`${gate}.querySelector('dialog').scrollHeight > ${gate}.querySelector('dialog').clientHeight`));
    await finishGate(page);
    await message('SAVE_RULES', { rules: [{ id: 'a', text: 'Only trade my setup' }, { id: 'b', text: 'Never move my stop' }, { id: 'c', text: 'Never add to a losing trade' }, { id: 'd', text: 'Accept the risk before entering' }] });
  });
  await check('new tab reflects rules, edits inline, and keeps reflection separate from gate confirmation', async () => {
    const before = (await message('GET_STATE')).state.confirmation;
    await ui.evaluate('chrome.storage.local.set({newTabSettings:{enabled:true,showExampleAds:true}})');
    const page = watch(await run.open(`${origin()}/newtab/newtab.html?preview=1&ads=1`));
    await until(() => page.evaluate('document.querySelectorAll(".reminder").length === 4'));
    assert.equal(await page.evaluate(`${dom('.example-ad, #ads-toggle, a[href^="https://"]')} === null`), true);
    const settings = watch(await run.open(`${origin()}/options/options.html#newtab`));
    await until(() => settings.evaluate('!document.querySelector("#newtab").hidden'));
    assert.equal(await settings.evaluate(`${dom('#example-ads, a[href*="ads=1"]')} === null`), true);
    await click(settings, dom('#newtab-enabled'));
    await until(async () => (await message('GET_STATE')).state.newTabSettings.enabled === false);
    await click(settings, dom('#newtab-enabled'));
    await until(async () => (await message('GET_STATE')).state.newTabSettings.enabled === true);
    for (let i = 0; i < 4; i++) await click(page, `document.querySelectorAll('.reminder')[${i}]`);
    assert.deepEqual((await message('GET_STATE')).state.confirmation, before);
    await click(page, dom('#edit'));
    await page.evaluate(`const field=document.querySelector('#editor input');field.value='Trade with a clear mind';field.dispatchEvent(new Event('input',{bubbles:true}));`);
    await click(page, dom('#save-edit'));
    await until(() => page.evaluate('document.querySelector(".reminder-text").textContent === "Trade with a clear mind"'));
    assert.equal((await message('GET_STATE')).state.rules[0].text, 'Trade with a clear mind');
    await run.screenshot(page, 'newtab-clean');
    await page.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: false });
    assert.equal(await page.evaluate('document.documentElement.scrollWidth <= innerWidth'), true);
    await run.screenshot(page, 'newtab-mobile');
    const real = await run.open('chrome://newtab/');
    await until(() => real.evaluate('document.querySelectorAll(".reminder").length === 4'));
  });
  await check('popup renders status and pause requires confirmation', async () => {
    const page = watch(await run.open(`${origin()}/popup/popup.html`));
    await until(() => page.evaluate('document.querySelector("#rule-count").textContent === "4"'));
    await page.send('Emulation.setDeviceMetricsOverride', { width: 360, height: 610, deviceScaleFactor: 1, mobile: false });
    await run.screenshot(page, 'popup');
    await click(page, dom('#toggle')); assert.equal((await message('GET_STATE')).state.enabled, true);
    await click(page, dom('#confirm-pause')); await until(async () => !(await message('GET_STATE')).state.enabled);
    await message('SET_ENABLED', { enabled: true });
  });
  await check('custom site permission is required and removal releases permission', async () => {
    const denied = await ui.evaluate(`chrome.runtime.sendMessage({type:'SET_PLATFORM',platform:{hostname:'example.com',enabled:true}})`);
    assert.equal(denied.ok, false);
    await grant('example.com'); await message('SET_PLATFORM', { platform: { hostname: 'example.com', enabled: true } });
    assert.equal(await ui.evaluate('chrome.permissions.contains({origins:["https://example.com/*"]})'), true);
    await message('REMOVE_PLATFORM', { id: 'custom-example.com' });
    assert.equal(await ui.evaluate('chrome.permissions.contains({origins:["https://example.com/*"]})'), false);
  });
  await check('TradingView is built-in and gates its exact permitted hostname', async () => {
    const platform = (await message('GET_STATE')).state.platforms.find(p => p.id === 'tradingview');
    assert.equal(platform.builtIn, true); assert.equal(platform.enabled, false);
    await grant('www.tradingview.com');
    await message('SET_PLATFORM', { platform: { ...platform, enabled: true } });
    const registrations = await ui.evaluate('chrome.scripting.getRegisteredContentScripts()');
    assert.ok(registrations[0].matches.includes('https://www.tradingview.com/*'));
    const page = await configuredPage('www.tradingview.com'); await waitGate(page);
    assert.equal(await page.evaluate(`${gate}.querySelectorAll('[aria-checked=true]').length`), 0);
    await finishGate(page);
  });
  await check('all 24 added platform hosts register, block first paint and release after confirmation', async () => {
    for (const platform of BUILT_IN_PLATFORMS.slice(4)) {
      await grant(platform.hostname);
      await message('SET_PLATFORM', { platform: { ...platform, enabled: true } });
      const page = await configuredPage(platform.hostname); await waitGate(page);
      assert.ok(await page.evaluate('window.early.hidden || window.early.gate'), platform.hostname);
      assert.equal(await page.evaluate(`${gate}.querySelectorAll('[aria-checked=true]').length`), 0, platform.hostname);
      await finishGate(page);
      await run.browser.send('Target.closeTarget', { targetId: page.targetId });
      await message('SET_PLATFORM', { platform: { ...platform, enabled: false } });
    }
  });
  await check('manual injection into an existing page locks scrolling and recovers removed hosts', async () => {
    const page = await configuredPage('app.tradesea.ai');
    assert.equal(await page.evaluate(`!!${gate}`), false);
    await grant('app.tradesea.ai');
    await message('SET_PLATFORM', { platform: { hostname: 'app.tradesea.ai', enabled: true } });
    await run.browser.send('Target.activateTarget', { targetId: page.targetId });
    await message('SHOW_NOW'); await waitGate(page);
    assert.equal(await page.evaluate('getComputedStyle(document.documentElement).overflow'), 'hidden');
    await page.evaluate('document.querySelector("#haki-root").remove()');
    await key(page, 'a', 'KeyA');
    assert.equal(await page.evaluate('pageCalls.keys'), 1);
    assert.equal(await page.evaluate('!!document.querySelector("#haki-scroll-lock")'), false);
  });
  const persisted = (await message('GET_STATE')).state;
  const profile = run.profile;
  await run.close(); run = null;
  // CDP's debug install is session-only; reattach it to the same profile after restart.
  // Chrome retains its local storage; normal Load unpacked installs persist in the UI.
  run = await launch({ profile });
  await run.install();
  await check('browser restart preserves settings; debug reattach reconciles site registration', async () => {
    ui = watch(await run.open(`${origin()}/options/options.html`));
    await until(() => ui.evaluate('document.querySelectorAll(".edit-row").length === 4'));
    assert.deepEqual((await message('GET_STATE')).state.rules, persisted.rules);
    assert.deepEqual((await message('GET_STATE')).state.promptSettings, persisted.promptSettings);
    // CDP temporary installs do not retain Chrome's grant registry; restore a test grant.
    await grant('trader.tradovate.com');
    await message('SET_PLATFORM', { platform: { hostname: 'trader.tradovate.com', enabled: true } });
    assert.ok((await ui.evaluate('chrome.scripting.getRegisteredContentScripts()')).length);
    assert.equal((await run.targets()).some(t => t.url.includes('/onboarding/')), false);
  });
  assert.deepEqual(errors, [], 'No uncaught extension or fixture errors');
  const output = process.env.HAKI_TEST_OUTPUT || 'test-results';
  await mkdir(output, { recursive: true });
  await writeFile(`${output}/browser-results.json`, JSON.stringify({ browser: await run.browser.send('Browser.getVersion'), passed: results, errors }, null, 2));
  console.log(`${results.length} real-browser checks passed; no uncaught errors.`);
} catch (error) {
  console.error(error);
  console.error('Captured errors:', errors);
  if (run && ui) await run.screenshot(ui, 'failure').catch(() => {});
  process.exitCode = 1;
} finally { if (run) await run.close(); }
