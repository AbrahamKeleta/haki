// Render the existing Haki brand artwork at social-card dimensions.
import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { launch, until } from '../tests/browser-driver.mjs';

const width = 1200, height = 630;
const run = await launch();
try {
  const page = await run.open(pathToFileURL(resolve('store-assets/source/marquee.html')).href);
  await page.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });
  await until(() => page.evaluate('document.readyState === "complete"'));
  await page.evaluate(`(() => {
    const style = document.createElement('style');
    style.textContent = '.marquee { width:1200px; height:630px; } .marquee main { padding:68px 64px; } .marquee h1 { font-size:72px; margin-top:45px; } .symbol { right:54px; top:96px; width:420px; height:420px; } .symbol-disc { inset:102px; } .symbol-disc img { width:190px; height:190px; } .step-one { right:-14px; } .step-two { left:-20px; } .step-three { right:0; }';
    document.head.append(style);
    return document.fonts.ready;
  })()`);
  assert.equal(await page.evaluate('Array.from(document.images).every(img => img.complete && img.naturalWidth > 0)'), true);
  const { data } = await page.send('Page.captureScreenshot', { format:'png', captureBeyondViewport:false, clip:{x:0,y:0,width,height,scale:1} });
  const image = Buffer.from(data, 'base64');
  assert.equal(image.readUInt32BE(16), width); assert.equal(image.readUInt32BE(20), height);
  await writeFile('website/assets/social-preview.png', image);
  console.log(`Social preview saved: ${width} × ${height}, ${image.length.toLocaleString()} bytes.`);
} finally { await run.close(); }
