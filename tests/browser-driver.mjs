import { spawn } from 'node:child_process';
import { mkdtemp, readFile, writeFile, mkdir, unlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

export const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
export async function until(fn, timeout = 10000) {
  const start = Date.now(); let last;
  while (Date.now() - start < timeout) {
    try { const result = await fn(); if (result) return result; } catch (error) { last = error; }
    await pause(60);
  }
  throw last || new Error('Timed out waiting for browser state.');
}
export class CDP {
  constructor(ws) {
    this.ws = ws; this.id = 0; this.pending = new Map(); this.listeners = new Map();
    ws.addEventListener('message', event => {
      const message = JSON.parse(event.data);
      if (message.id) {
        const pending = this.pending.get(message.id); if (!pending) return;
        this.pending.delete(message.id); clearTimeout(pending.timer);
        if (message.error) pending.reject(new Error(message.error.message)); else pending.resolve(message.result);
      } else for (const callback of this.listeners.get(message.method) || []) callback(message.params);
    });
  }
  static async connect(url) {
    const ws = new WebSocket(url);
    await new Promise((resolve, reject) => { ws.addEventListener('open', resolve, { once: true }); ws.addEventListener('error', reject, { once: true }); });
    return new CDP(ws);
  }
  send(method, params = {}) {
    const id = ++this.id;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => { this.pending.delete(id); reject(new Error(`CDP timeout: ${method}`)); }, 15000);
      this.pending.set(id, { resolve, reject, timer }); this.ws.send(JSON.stringify({ id, method, params }));
    });
  }
  on(method, callback) { const list = this.listeners.get(method) || []; list.push(callback); this.listeners.set(method, list); }
  async evaluate(expression, options = {}) {
    const result = await this.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true, userGesture: true, ...options });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
    return result.result.value;
  }
  close() { this.ws.close(); }
}

export async function launch({ profile, binary = process.env.HAKI_BROWSER || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' } = {}) {
  profile ||= await mkdtemp(join(tmpdir(), 'haki-browser-'));
  await unlink(join(profile, 'DevToolsActivePort')).catch(error => { if (error.code !== 'ENOENT') throw error; });
  const child = spawn(binary, ['--headless=new', '--no-first-run', '--no-default-browser-check', '--disable-background-networking', '--disable-component-update', '--disable-sync', '--enable-unsafe-extension-debugging', '--remote-debugging-port=0', `--user-data-dir=${profile}`, '--window-size=1440,1000', 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] });
  let logs = ''; child.stderr.on('data', data => { logs += data; });
  const [port, path] = await until(async () => { try { return (await readFile(join(profile, 'DevToolsActivePort'), 'utf8')).trim().split('\n'); } catch { if (child.exitCode !== null) throw new Error(logs); return null; } });
  const browser = await CDP.connect(`ws://127.0.0.1:${port}${path}`);
  const pages = [];
  async function attach(targetId) {
    const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
    const target = targets.find(t => t.id === targetId);
    if (!target) throw new Error('Target not available yet.');
    const page = await CDP.connect(target.webSocketDebuggerUrl); pages.push(page);
    await page.send('Runtime.enable'); await page.send('Page.enable').catch(() => {});
    page.targetId = targetId; return page;
  }
  return {
    browser, profile, port, child,
    async open(url = 'about:blank') { const { targetId } = await browser.send('Target.createTarget', { url }); return until(() => attach(targetId)); },
    attach,
    async install() { return browser.send('Extensions.loadUnpacked', { path: resolve('.') }); },
    async targets() { return (await browser.send('Target.getTargets')).targetInfos; },
    async screenshot(page, name) {
      const output = process.env.HAKI_TEST_OUTPUT || 'test-results';
      await mkdir(output, { recursive: true });
      const result = await page.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
      await writeFile(`${output}/${name}.png`, Buffer.from(result.data, 'base64'));
    },
    async close() {
      for (const page of pages) page.close();
      await browser.send('Browser.close').catch(() => {}); browser.close();
      await new Promise(resolve => { if (child.exitCode !== null) resolve(); else child.once('exit', resolve); });
    },
  };
}
