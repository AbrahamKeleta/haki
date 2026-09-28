import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { defaultState } from '../shared/constants.js';

let data, registered, grants, created, listeners, tabs;
const events = {};
const event = name => ({ addListener(callback) { events[name] = callback; } });
globalThis.chrome = {
  runtime: { id: 'haki-test', getURL: path => `chrome-extension://haki-test/${path}`, onMessage: event('message'), onInstalled: event('installed'), onStartup: event('startup') },
  storage: { local: {
    async get(keys) {
      if (keys === null) return structuredClone(data);
      const result = {}; for (const key of typeof keys === 'string' ? [keys] : keys) if (key in data) result[key] = structuredClone(data[key]);
      return result;
    },
    async set(fields) { Object.assign(data, structuredClone(fields)); },
  } },
  permissions: {
    async contains({ origins }) { return origins.every(origin => grants.has(origin)); },
    async remove({ origins }) { origins.forEach(origin => grants.delete(origin)); return true; },
    async getAll() { return { origins: [...grants] }; },
    onRemoved: event('removed'),
  },
  scripting: {
    async getRegisteredContentScripts() { return structuredClone(registered); },
    async registerContentScripts(scripts) { registered.push(...structuredClone(scripts)); },
    async updateContentScripts(scripts) { registered = structuredClone(scripts); },
    async unregisterContentScripts() { registered = []; },
    async executeScript() { return []; },
  },
  tabs: {
    async query() { return tabs; },
    async create(tab) { created.push(tab); },
    async sendMessage(tabId, message) { listeners.push({ tabId, message }); return { ok: true, documentToken: 'doc' }; },
  },
};
await import('../background/service-worker.js');
const ui = { id: 'haki-test', url: 'chrome-extension://haki-test/options/options.html' };
const content = { id: 'haki-test', tab: { id: 1 }, frameId: 0, url: 'https://trader.tradovate.com/' };
function send(type, fields = {}, sender = ui) { return new Promise(resolve => events.message({ type, ...fields }, sender, resolve)); }
async function setup() {
  data.onboardingComplete = true;
  data.rules = [{ id: 'rule', text: 'My process', order: 0 }];
  grants.add('https://trader.tradovate.com/*');
  data.platforms[0].enabled = true;
}
beforeEach(() => { data = defaultState(); registered = []; grants = new Set(); created = []; listeners = []; tabs = []; });

test('fresh install initializes storage and opens onboarding; updates do not reopen', async () => {
  data = {}; events.installed({ reason: 'install' }); await send('GET_STATE');
  assert.equal(data.schemaVersion, 1); assert.equal(created.length, 1);
  data.onboardingComplete = true; events.installed({ reason: 'update' }); await send('GET_STATE');
  assert.equal(created.length, 1);
});
test('permission denial never enables protection or registers a site', async () => {
  const result = await send('SET_PLATFORM', { platform: { hostname: 'example.com', enabled: true } });
  assert.equal(result.ok, false); assert.equal(registered.length, 0);
  assert.equal(data.platforms.some(p => p.hostname === 'example.com'), false);
  const disabled = await send('SET_PLATFORM', { platform: { hostname: 'example.com', enabled: false } });
  assert.equal(disabled.ok, true); assert.equal(data.platforms.at(-1).enabled, false);
});
test('registration is persistent, exact-host, document_start and top-frame only', async () => {
  await setup(); const result = await send('SET_ENABLED', { enabled: true }); assert.equal(result.ok, true);
  assert.deepEqual(registered[0].matches, ['https://trader.tradovate.com/*']);
  assert.equal(registered[0].runAt, 'document_start'); assert.equal(registered[0].persistAcrossSessions, true);
  assert.equal(registered[0].allFrames, false); assert.deepEqual(registered[0].css, ['content/preflight.css']);
});
test('onboarding requires both valid rules and an enabled platform', async () => {
  assert.equal((await send('FINISH_SETUP')).ok, false);
  await send('SAVE_RULES', { rules: [{ text: 'Keep risk defined' }] });
  assert.equal((await send('FINISH_SETUP')).ok, false);
  grants.add('https://trader.tradovate.com/*');
  await send('SET_PLATFORM', { platform: { hostname: 'trader.tradovate.com', enabled: true } });
  assert.equal((await send('FINISH_SETUP')).ok, true);
  assert.equal(registered.length, 1);
});
test('untrusted senders, non-top frames and content settings writes are rejected', async () => {
  await setup();
  assert.equal((await send('SET_ENABLED', { enabled: false }, content)).ok, false);
  assert.equal((await send('GET_STATE', {}, { ...ui, id: 'other' })).ok, false);
  assert.equal((await send('GET_GATE', {}, { ...content, frameId: 1 })).ok, false);
  assert.equal(data.enabled, true);
});
test('valid confirmation persists globally; stale rule snapshots are rejected', async () => {
  await setup();
  assert.equal((await send('CONFIRM_GATE', { signature: 'outdated' }, content)).ok, false);
  const signature = JSON.stringify(data.rules.map(r => [r.id, r.text]));
  assert.equal((await send('CONFIRM_GATE', { signature }, content)).ok, true);
  assert.ok(data.confirmation.lastConfirmedAt); assert.match(data.confirmation.lastConfirmedLocalDate, /^\d{4}-\d{2}-\d{2}$/);
  assert.equal((await send('GET_GATE', {}, content)).show, true);
  assert.equal((await send('GET_GATE', { sessionGateConfirmed: true }, content)).show, false);
});
test('serialized field writes preserve simultaneous rules, settings and confirmations', async () => {
  await setup();
  const signature = JSON.stringify(data.rules.map(r => [r.id, r.text]));
  const responses = await Promise.all([
    send('CONFIRM_GATE', { signature }, content),
    send('SAVE_RULES', { rules: [{ id: 'updated', text: 'Updated process' }] }),
    send('SAVE_PROMPT', { promptSettings: { mode: 'daily', intervalHours: 4 } }),
  ]);
  assert.ok(responses.every(r => r.ok)); assert.ok(data.confirmation.lastConfirmedAt);
  assert.equal(data.rules[0].id, 'updated'); assert.equal(data.promptSettings.mode, 'daily');
});
test('corrupt data produces a repair screen and preserves an original recovery copy', async () => {
  await setup(); data.rules = [{ id: 'broken', text: ' ' }];
  const gate = await send('GET_GATE', {}, content); assert.equal(gate.show, true); assert.ok(gate.error);
  await send('SAVE_RULES', { rules: [{ text: 'Repaired' }] });
  assert.equal(data.recoveryBackup.data.rules[0].id, 'broken');
  await send('SAVE_RULES', { rules: [{ text: 'Edited again' }] });
  assert.equal(data.recoveryBackup.data.rules[0].id, 'broken');
});
test('revoking host permission disables its platform and unregisters protection', async () => {
  await setup(); await send('SET_ENABLED', { enabled: true }); grants.clear();
  events.removed(); await send('GET_STATE');
  assert.equal(data.platforms[0].enabled, false); assert.equal(registered.length, 0);
});
test('startup reconciles site permissions removed while the worker was inactive', async () => {
  await setup(); grants.clear(); events.startup(); await send('GET_STATE');
  assert.equal(data.platforms[0].enabled, false); assert.equal(registered.length, 0);
});
test('custom removal releases optional site access', async () => {
  await setup(); grants.add('https://example.com/*');
  await send('SET_PLATFORM', { platform: { hostname: 'example.com', enabled: true } });
  await send('REMOVE_PLATFORM', { id: 'custom-example.com' });
  assert.equal(grants.has('https://example.com/*'), false);
  assert.equal(data.platforms.some(p => p.hostname === 'example.com'), false);
});
test('new-tab preferences do not affect confirmation or gate registration', async () => {
  await setup(); const before = structuredClone(data.confirmation);
  const result = await send('SAVE_NEWTAB', { newTabSettings: { enabled: true, showExampleAds: true, injected: 'ignored' } });
  assert.equal(result.ok, true); assert.deepEqual(data.newTabSettings, { enabled: true, showExampleAds: true });
  assert.deepEqual(data.confirmation, before);
});
test('an already displayed gate is not dismissed by another tab confirmation', async () => {
  await setup(); data.promptSettings.mode = 'interval'; data.confirmation.lastConfirmedAt = Date.now();
  assert.equal((await send('GET_GATE', {}, content)).show, false);
  assert.equal((await send('GET_GATE', { gateActive: true }, content)).show, true);
});
test('reset retains a recovery copy, clears site access and removes registrations', async () => {
  await setup(); await send('SET_ENABLED', { enabled: true }); await send('RESET_SETTINGS');
  assert.equal(data.onboardingComplete, false); assert.equal(data.rules.length, 0);
  assert.equal(data.recoveryBackup.data.rules[0].text, 'My process');
  assert.equal(registered.length, 0); assert.equal(grants.size, 0);
});
