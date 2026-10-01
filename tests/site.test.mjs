import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { launch, until, pause } from './browser-driver.mjs';
import { BUILT_IN_PLATFORMS } from '../shared/constants.js';

const root = resolve('website'), errors = [];
const prefix = process.env.HAKI_SITE_PREFIX || '';
const { version } = JSON.parse(await readFile('manifest.json', 'utf8'));
const publicBase = 'https://abrahamkeleta.github.io/haki/website/';
const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.png': 'image/png', '.zip': 'application/zip' };
const server = createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    if (prefix && !pathname.startsWith(`${prefix}/`)) { response.writeHead(404); return response.end('Not found'); }
    let path = resolve(root, `.${pathname.slice(prefix.length)}`);
    if (!path.startsWith(root + sep) && path !== root) { response.writeHead(403); return response.end(); }
    if ((await stat(path)).isDirectory()) path = resolve(path, 'index.html');
    response.setHeader('Content-Type', types[extname(path)] || 'application/octet-stream'); response.end(await readFile(path));
  } catch { response.writeHead(404); response.end('Not found'); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}${prefix}`;
let run;
try {
  run = await launch(); const page = await run.open(`${base}/`);
  page.on('Runtime.exceptionThrown', event => errors.push(event.exceptionDetails.text));
  await until(() => page.evaluate('document.readyState === "complete"'));
  assert.equal(await page.evaluate('document.querySelector("h1").textContent'), 'Your rules.Before youremotions.');
  const links = await page.evaluate('Array.from(document.querySelectorAll("a[href]"),a=>a.getAttribute("href"))');
  for (const href of new Set(links)) {
    if (href.startsWith('#')) assert.ok(await page.evaluate(`!!document.querySelector(${JSON.stringify(href)})`));
    else assert.equal((await fetch(`${base}/${href}`)).status, 200, href);
  }
  const downloads = await page.evaluate('Array.from(document.querySelectorAll("a[download]"), a => a.href)');
  assert.equal(downloads.length, 4);
  assert.ok(downloads.every(url => url === `${base}/downloads/haki-${version}.zip`));
  const zip = await fetch(downloads[0]);
  assert.equal(zip.status, 200);
  assert.equal(zip.headers.get('content-type'), 'application/zip');
  assert.deepEqual(Buffer.from(await zip.arrayBuffer()), await readFile(`dist/haki-${version}.zip`));
  console.log('PASS landing links and exact extension ZIP download');
  const meta = await page.evaluate('Object.fromEntries(Array.from(document.querySelectorAll("meta[property], meta[name]"), el => [el.getAttribute("property") || el.name, el.content]))');
  assert.equal(await page.evaluate('document.querySelector("link[rel=canonical]").href'), publicBase);
  assert.equal(meta['og:url'], publicBase);
  assert.equal(meta['twitter:card'], 'summary_large_image');
  assert.equal(meta['twitter:image'], meta['og:image']);
  assert.equal(meta['og:image'], `${publicBase}assets/social-preview.png`);
  for (const name of ['og:title', 'og:description', 'og:image:alt', 'twitter:title', 'twitter:description', 'twitter:image:alt']) assert.ok(meta[name], name);
  const imageResponse = await fetch(`${base}/${meta['og:image'].slice(publicBase.length)}`);
  assert.equal(imageResponse.status, 200); assert.equal(imageResponse.headers.get('content-type'), 'image/png');
  const image = Buffer.from(await imageResponse.arrayBuffer());
  assert.equal(image.readUInt32BE(16), Number(meta['og:image:width']));
  assert.equal(image.readUInt32BE(20), Number(meta['og:image:height']));
  assert.equal(image.readUInt32BE(16), 1200); assert.equal(image.readUInt32BE(20), 630);
  console.log('PASS Open Graph and X metadata reference the available 1200 × 630 preview');
  const resources = await page.evaluate('performance.getEntriesByType("resource").map(r=>r.name)');
  assert.ok(resources.every(url => url.startsWith(base)), 'All assets must remain local.');
  await page.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  assert.equal(await page.evaluate('document.documentElement.scrollWidth <= innerWidth'), true);
  assert.deepEqual(await page.evaluate('Array.from(document.querySelectorAll(".platform-group:not([aria-hidden]) [data-platform]"),el=>el.dataset.platform)'), BUILT_IN_PLATFORMS.map(p => p.id));
  assert.equal(await page.evaluate('document.querySelector(".platform-group-copy").getAttribute("aria-hidden")'), 'true');
  await page.send('Page.bringToFront');
  await page.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }] });
  await page.evaluate('document.querySelector(".platform-window").scrollIntoView({block:"center",behavior:"instant"})');
  await page.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 1, y: 1 });
  const frames = () => page.evaluate('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))');
  const offset = () => page.evaluate('new DOMMatrixReadOnly(getComputedStyle(document.querySelector(".platform-track")).transform).m41');
  await frames(); const beforeMotion = await offset();
  await until(async () => await offset() < beforeMotion);
  await page.evaluate('document.querySelector(".platform-motion").click()');
  assert.equal(await page.evaluate('document.querySelector(".platform-motion").getAttribute("aria-pressed")'), 'true');
  await frames(); const pausedOffset = await offset(); await pause(150);
  assert.equal(await offset(), pausedOffset, 'Pause control stops scrolling');
  await page.evaluate('document.querySelector(".platform-motion").click();document.querySelector(".platform-window").focus()');
  await frames(); const focusedOffset = await offset(); await pause(150);
  assert.equal(await offset(), focusedOffset, 'Keyboard focus stops scrolling');
  await page.evaluate('document.activeElement.blur()');
  await page.evaluate('scrollTo({top:0,behavior:"instant"})');
  console.log('PASS complete catalog carousel, leftward motion, pause/resume and keyboard pause');
  await run.screenshot(page, 'website-desktop');
  await page.evaluate('document.querySelector("#copy-address").click()');
  await until(() => page.evaluate('document.querySelector("#copy-status").textContent.length > 0'));
  await page.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: false });
  await page.evaluate('scrollTo(0,0)');
  assert.equal(await page.evaluate('document.documentElement.scrollWidth <= innerWidth'), true);
  await run.screenshot(page, 'website-mobile');
  await page.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  assert.equal(await page.evaluate('getComputedStyle(document.documentElement).scrollBehavior'), 'auto');
  await until(() => page.evaluate('!document.querySelector(".platform-strip").classList.contains("is-animated")'));
  assert.equal(await page.evaluate('getComputedStyle(document.querySelector(".platform-track")).transform'), 'none');
  assert.equal(await page.evaluate('getComputedStyle(document.querySelector(".platform-group-copy")).display'), 'none');
  assert.equal(await page.evaluate('document.documentElement.scrollWidth <= innerWidth'), true);
  console.log('PASS desktop/mobile layout, address copying and reduced motion');
  await page.send('Page.navigate', { url: `${base}/privacy.html` });
  await until(() => page.evaluate('document.querySelector("h1")?.textContent === "Your rules stay yours."'));
  assert.deepEqual(errors, []);
  console.log('PASS privacy page; no uncaught page errors or third-party resources');
} finally { if (run) await run.close(); await new Promise(resolve => server.close(resolve)); }
