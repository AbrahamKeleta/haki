import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(process.argv[2] || resolve(here, '../..'));
const output = resolve(process.argv[3] || resolve(here, 'captures-portrait'));
process.chdir(root);
const { launch, until } = await import(pathToFileURL(`${root}/tests/browser-driver.mjs`));
await mkdir(output, { recursive: true });
const run = await launch();
const shots = {}, errors = [];
async function watch(page) {
  page.on('Runtime.exceptionThrown', e => errors.push(e.exceptionDetails.exception?.description || e.exceptionDetails.text));
  await page.send('Emulation.setDeviceMetricsOverride', { width: 460, height: 1180, deviceScaleFactor: 2, mobile: false });
  await page.send('Emulation.setEmulatedMedia', { features: [{name:'prefers-reduced-motion',value:'reduce'}] });
  return page;
}
const dom = selector => `document.querySelector(${JSON.stringify(selector)})`;
const shadow = `document.querySelector('#haki-root').shadowRoot`;
async function point(page, expression) {
  return page.evaluate(`(() => { const r=(${expression}).getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2}; })()`);
}
async function click(page, expression) {
  const pos=await point(page, expression);
  await page.send('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,...pos});
  await page.send('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,...pos});
}
async function shot(name, page, region, targets={}) {
  await page.evaluate('document.fonts.ready');
  const clip=await page.evaluate(`(() => {
    const r=(${region}).getBoundingClientRect();
    const pad=${region.includes('ritual') ? 30 : 0};
    const inset=0;
    const x=Math.max(0,r.x+inset-pad), y=Math.max(0,r.y-pad);
    return {x,y,width:Math.min(innerWidth-x,r.width-inset*2+pad*2),height:Math.min(innerHeight-y,r.height+pad*2),scale:1};
  })()`);
  const points={};
  for(const [key,expr] of Object.entries(targets)) {
    const p=await point(page,expr); points[key]={x:(p.x-clip.x)/clip.width,y:(p.y-clip.y)/clip.height};
  }
  const {data}=await page.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false,clip});
  const file=`${name}.png`;
  await writeFile(`${output}/${file}`,Buffer.from(data,'base64'));
  shots[name]={file,clip,points};
  console.log(`Captured ${name}`);
}
try {
  const {id}=await run.install();
  const origin=`chrome-extension://${id}`;
  const target=await until(async()=>(await run.targets()).find(t=>t.url===`${origin}/onboarding/onboarding.html`));
  const ui=await watch(await run.attach(target.targetId));
  await until(()=>ui.evaluate(`!!${dom('.welcome-title')}`));
  const main='document.querySelector("main")';
  await shot('01-welcome',ui,main,{next:dom('#next')});
  await click(ui,dom('#next'));
  await until(()=>ui.evaluate('document.querySelectorAll(".edit-row").length===4'));
  await shot('02-rules-before',ui,main,{field:dom('.edit-row input'),next:dom('#next')});
  await ui.evaluate('document.querySelector(".edit-row input").focus();document.querySelector(".edit-row input").select()');
  await ui.send('Input.insertText',{text:'Trade my A+ setup only.'});
  await shot('03-rules-edited',ui,main,{field:dom('.edit-row input'),next:dom('#next')});
  await click(ui,dom('#next'));
  await until(()=>ui.evaluate(`!!${dom('#platform-search')}`));
  await click(ui,dom('#platform-search'));
  await ui.send('Input.insertText',{text:'Tradovate'});
  await shot('04-platform-search',ui,main,{search:dom('#platform-search'),toggle:dom('[aria-label="Protect Tradovate"]'),next:dom('#next')});
  // Site permission exists only in the disposable profile used for this recording.
  const management=await run.open('chrome://extensions/');
  await until(()=>management.evaluate('typeof chrome.developerPrivate?.addHostPermission === "function"'));
  await management.evaluate(`chrome.developerPrivate.addHostPermission(${JSON.stringify(id)},'https://trader.tradovate.com/*')`);
  await run.browser.send('Target.closeTarget',{targetId:management.targetId});
  assert.equal(await ui.evaluate(`chrome.permissions.request({origins:['https://trader.tradovate.com/*']})`),true);
  await click(ui,dom('[aria-label="Protect Tradovate"]'));
  await until(()=>ui.evaluate('document.querySelector("#status").textContent.startsWith("Saved")'));
  await shot('05-platform-saved',ui,main,{toggle:dom('[aria-label="Protect Tradovate"]'),next:dom('#next')});
  await click(ui,dom('#next'));
  await until(()=>ui.evaluate(`!!${dom('.frequency-options')}`));
  await shot('06-frequency',ui,main,{next:dom('#next')});
  await click(ui,dom('#next'));
  await until(()=>ui.evaluate(`!!${dom('#newtab-optin')}`));
  await shot('07-ready-before',ui,main,{toggle:dom('#newtab-optin'),next:dom('#next')});
  await click(ui,dom('#newtab-optin'));
  await shot('08-ready-enabled',ui,main,{toggle:dom('#newtab-optin'),next:dom('#next')});
  await click(ui,dom('#next'));
  await until(()=>ui.evaluate('location.pathname.includes("options")'));
  const state=await ui.evaluate(`chrome.runtime.sendMessage({type:'GET_STATE'})`);
  assert.equal(state.state.onboardingComplete,true); assert.equal(state.state.newTabSettings.enabled,true);
  const page=await watch(await run.open());
  const candles=Array.from({length:40},(_,i)=>{const x=40+i*21,y=350-Math.sin(i*.58)*54-i*3;return `<line x1="${x}" x2="${x}" y1="${y-45}" y2="${y+43}" stroke="${i%3?'#34bdaf':'#536989'}" stroke-width="2"/><rect x="${x-6}" y="${y-20}" width="12" height="${24+i%4*7}" fill="${i%3?'#34bdaf':'#536989'}"/>`;}).join('');
  const fixture=`<!doctype html><html><head><title>Sample trading workspace</title><style>body{margin:0;background:#07101b;color:#e3edf8;font:20px -apple-system,sans-serif}header{padding:36px 42px;border-bottom:1px solid #243347;display:flex;justify-content:space-between}small{color:#8babc5;font-size:15px}main{padding:60px 65px}h1{font-weight:450;font-size:42px}svg{width:100%;border:1px solid #243347;border-radius:14px;background:#0a1421}p{color:#92a8bc}span{color:#54c8b8}</style></head><body><header><b>TRADING WORKSPACE</b><small>ISOLATED DEMO · NO LIVE ORDERS</small></header><main><span>YOUR RULES ARE CONFIRMED</span><h1>Back to your plan.</h1><svg viewBox="0 0 930 500">${candles}</svg><p>Sample workspace for the Haki walkthrough.</p></main></body></html>`;
  await page.send('Fetch.enable',{patterns:[{urlPattern:'https://*/*',requestStage:'Request'}]});
  page.on('Fetch.requestPaused',e=>void page.send('Fetch.fulfillRequest',{requestId:e.requestId,responseCode:200,responseHeaders:[{name:'Content-Type',value:'text/html'}],body:Buffer.from(fixture).toString('base64')}));
  await page.send('Page.navigate',{url:'https://trader.tradovate.com/haki-demo'});
  await until(()=>page.evaluate(`${shadow}?.querySelectorAll('.rule').length===4`));
  const ritual=`${shadow}.querySelector('.ritual')`;
  const targets={}; for(let i=0;i<4;i++) targets[`rule${i}`]=`${shadow}.querySelectorAll('.rule')[${i}]`;
  targets.confirm=`${shadow}.querySelector('[data-action=confirm]')`;
  await shot('09-gate-0',page,ritual,targets);
  for(let i=0;i<4;i++) {await click(page,targets[`rule${i}`]);await shot(`10-gate-${i+1}`,page,ritual,targets);}
  await click(page,targets.confirm);
  await until(()=>page.evaluate(`${shadow}?.querySelector('#haki-title')?.textContent==='HAKI CONFIRMED.'`));
  await shot('11-confirmed',page,ritual);
  await until(()=>page.evaluate('!document.querySelector("#haki-root")'));
  await shot('12-workspace',page,main);
  const nt=await watch(await run.open(`${origin}/newtab/newtab.html`));
  await until(()=>nt.evaluate('document.querySelectorAll(".reminder").length===4'));
  await shot('13-newtab',nt,main,{rule:dom('.reminder'),edit:dom('#edit')});
  await click(nt,dom('.reminder'));
  await shot('14-newtab-checked',nt,main,{rule:dom('.reminder'),edit:dom('#edit')});
  assert.deepEqual(errors,[]);
  await writeFile(`${output}/shots.json`,JSON.stringify({shots,errors,recording:'Actual Haki UI in an isolated Chrome profile. Example rules and a simulated platform response; no live brokerage connection.'},null,2));
  console.log('Capture complete. No uncaught errors.');
} finally { await run.close(); }
