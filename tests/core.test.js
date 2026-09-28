import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeHostname, protectedPlatform, originPattern } from '../shared/domains.js';
import { shouldPrompt, localDate } from '../shared/utils.js';
import { defaultState, BUILT_IN_PLATFORMS } from '../shared/constants.js';
import { validateRules, validatePlatforms, validatePrompt, normalizeState } from '../shared/storage.js';

test('normalizes HTTPS hostnames and paths without granting subdomains', () => {
  for (const input of ['EXAMPLE.com', 'https://example.com', 'https://example.com/path?q=1', 'example.com.']) assert.equal(normalizeHostname(input), 'example.com');
  assert.equal(originPattern('example.com'), 'https://example.com/*');
  assert.equal(normalizeHostname('bücher.de'), 'xn--bcher-kva.de');
});
test('rejects malformed, internal, insecure and private destinations', () => {
  for (const value of ['', 'localhost', 'localhost.local', '127.0.0.1', 'https://[::1]', 'http://example.com', 'chrome://settings', 'chrome-extension://abc', 'file:///a', 'https://a:b@example.com', 'a..com', '-a.com', 'a_.com', 'example.com:8080', '*.example.com', 'ex ample.com', 'https://example.com\\@evil.com']) assert.throws(() => normalizeHostname(value), undefined, value);
  assert.equal(normalizeHostname('localhost', { development: true }), 'localhost');
});
test('domain matching is exact, HTTPS only and respects disabled state', () => {
  const platforms = [{ hostname: 'trader.tradovate.com', enabled: true }];
  assert.ok(protectedPlatform(platforms, 'https://trader.tradovate.com/a'));
  for (const url of ['https://fake-tradovate-example.com', 'https://trader.tradovate.com.evil.com', 'https://child.trader.tradovate.com', 'http://trader.tradovate.com', 'invalid']) assert.equal(protectedPlatform(platforms, url), null);
  assert.equal(protectedPlatform([{ ...platforms[0], enabled: false }], 'https://trader.tradovate.com'), null);
});
test('tab mode is independent of global confirmation', () => {
  assert.equal(shouldPrompt({ mode: 'tab' }, { lastConfirmedAt: Date.now() }), true);
  assert.equal(shouldPrompt({ mode: 'tab' }, {}, { sessionGateConfirmed: true }), false);
});
test('interval handles missing, expired, exact boundary and clock rollback', () => {
  const now = 1_800_000_000_000;
  const settings = { mode: 'interval', intervalHours: 4 };
  for (const last of [null, 0, now + 1, now - 4 * 3600000]) assert.equal(shouldPrompt(settings, { lastConfirmedAt: last }, { now }), true);
  assert.equal(shouldPrompt(settings, { lastConfirmedAt: now - 4 * 3600000 + 1 }, { now }), false);
});
test('daily uses local calendar midnight, not elapsed 24 hours', () => {
  const yesterday = new Date(2026, 8, 26, 23, 59).getTime();
  const today = new Date(2026, 8, 27, 0, 1).getTime();
  const settings = { mode: 'daily' };
  assert.equal(shouldPrompt(settings, { lastConfirmedLocalDate: localDate(yesterday) }, { now: today }), true);
  assert.equal(shouldPrompt(settings, { lastConfirmedLocalDate: localDate(today) }, { now: today + 3600000 }), false);
});
test('rules enforce limits, trim, preserve reorder and repair duplicate IDs', () => {
  const rules = validateRules([{ id: 'b', text: ' B ' }, { id: 'a', text: 'A' }]);
  assert.deepEqual(rules, [{ id: 'b', text: 'B', order: 0 }, { id: 'a', text: 'A', order: 1 }]);
  assert.equal(validateRules(Array.from({ length: 20 }, () => ({ id: 'same', text: 'ok' }))).length, 20);
  assert.equal(new Set(validateRules([{ id: 'a', text: 'one' }, { id: 'a', text: 'two' }]).map(r => r.id)).size, 2);
  for (const list of [[], [{ text: ' ' }], [{ text: 'a'.repeat(201) }], Array.from({ length: 21 }, () => ({ text: 'ok' }))]) assert.throws(() => validateRules(list));
});
test('platform validation canonicalizes built-ins and rejects duplicates', () => {
  assert.equal(validatePlatforms([{ hostname: BUILT_IN_PLATFORMS[0].hostname, name: 'spoof', enabled: true }])[0].name, 'Tradovate');
  assert.throws(() => validatePlatforms([{ hostname: 'example.com' }, { hostname: 'example.com' }]));
  assert.equal(validatePlatforms([{ hostname: 'example.com', enabled: true }])[0].builtIn, false);
});
test('existing installations gain TradingView without changing rules or enabled sites', () => {
  const previous = defaultState();
  previous.rules = [{ id: 'keep', text: 'My existing rule', order: 0 }];
  previous.platforms = previous.platforms.filter(p => p.id !== 'tradingview');
  previous.platforms[0].enabled = true;
  const next = normalizeState(previous);
  assert.deepEqual(next.rules, previous.rules);
  assert.equal(next.platforms[0].enabled, true);
  assert.deepEqual(next.platforms.find(p => p.id === 'tradingview'), {
    id: 'tradingview', name: 'TradingView', hostname: 'www.tradingview.com', builtIn: true, enabled: false,
  });
});
test('an existing custom TradingView entry becomes built-in and keeps its permission preference', () => {
  const platforms = validatePlatforms([{ id: 'custom-www.tradingview.com', hostname: 'www.tradingview.com', builtIn: false, enabled: true }]);
  const platform = platforms.find(p => p.id === 'tradingview');
  assert.equal(platform.builtIn, true); assert.equal(platform.enabled, true);
  assert.equal(platforms.filter(p => p.hostname === 'www.tradingview.com').length, 1);
  assert.ok(protectedPlatform(platforms, 'https://www.tradingview.com/chart/'));
  assert.equal(protectedPlatform(platforms, 'https://www.tradingview.com.evil.com/chart/'), null);
});
test('corrupt settings return repair state while preserving usable text', () => {
  const state = normalizeState({ ...defaultState(), onboardingComplete: true, rules: [{ text: 'Keep this' }, { text: '' }] });
  assert.equal(state.rules[0].text, 'Keep this');
  assert.ok(state.issues.length);
  assert.ok(normalizeState({ ...defaultState(), onboardingComplete: true, rules: null }).issues.length);
  assert.deepEqual(normalizeState(defaultState()).issues, []);
  assert.throws(() => validatePrompt({ mode: 'interval', intervalHours: 7 }));
});
