import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeHostname, protectedPlatform, originPattern } from '../shared/domains.js';
import { shouldPrompt, localDate } from '../shared/utils.js';
import { defaultState, BUILT_IN_PLATFORMS, MAX_CUSTOM_PLATFORMS, PLATFORM_CATEGORIES } from '../shared/constants.js';
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
    id: 'tradingview', name: 'TradingView', hostname: 'www.tradingview.com', category: 'stocks', builtIn: true, enabled: false,
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
test('approved catalog has unique exact hosts, known categories and no retired ProjectX entries', () => {
  assert.equal(BUILT_IN_PLATFORMS.length, 28);
  assert.equal(new Set(BUILT_IN_PLATFORMS.map(p => p.id)).size, BUILT_IN_PLATFORMS.length);
  assert.equal(new Set(BUILT_IN_PLATFORMS.map(p => p.hostname)).size, BUILT_IN_PLATFORMS.length);
  for (const platform of BUILT_IN_PLATFORMS) {
    assert.equal(normalizeHostname(platform.hostname), platform.hostname);
    assert.ok(PLATFORM_CATEGORIES.some(c => c.id === platform.category));
    assert.equal(platform.hostname.endsWith('projectx.com'), false);
    assert.notEqual(platform.hostname, 'x.e8markets.com');
    assert.equal(protectedPlatform([{ ...platform, enabled: true }], `https://${platform.hostname}.evil.com/`), null);
  }
});
test('catalog expansion preserves a full legacy site list across repeated reads and saves', () => {
  const previous = defaultState();
  previous.rules = [{ id: 'keep', text: 'Keep my rules', order: 0 }];
  previous.platforms = previous.platforms.slice(0, 4).map(p => ({ ...p, enabled: true }));
  previous.platforms.push(...Array.from({ length: 46 }, (_, i) => ({ hostname: `custom${i}.example.com`, enabled: i % 2 === 0 })));
  assert.equal(previous.platforms.length, 50);
  const next = normalizeState(previous);
  assert.deepEqual(next.issues, []);
  assert.deepEqual(next.rules, previous.rules);
  assert.equal(next.platforms.filter(p => !p.builtIn).length, 46);
  assert.deepEqual(next.platforms.filter(p => p.enabled).map(p => p.hostname), previous.platforms.filter(p => p.enabled).map(p => p.hostname));
  assert.equal(next.platforms.length, BUILT_IN_PLATFORMS.length + 46);
  assert.deepEqual(normalizeState(next), next);
  assert.deepEqual(validatePlatforms(next.platforms), next.platforms);
});
test('newly built-in custom sites retain protection while unused additions stay disabled', () => {
  const previous = [
    { hostname: 'trade.oanda.com', id: 'custom-trade.oanda.com', enabled: true },
    { hostname: 'app.webull.com', id: 'custom-app.webull.com', enabled: false },
  ];
  const result = validatePlatforms(previous);
  assert.equal(result.find(p => p.id === 'oanda').enabled, true);
  assert.equal(result.find(p => p.id === 'webull').enabled, false);
  assert.equal(result.filter(p => p.enabled).length, 1);
  assert.equal(result.length, BUILT_IN_PLATFORMS.length);
});
test('the custom website limit is independent of the built-in catalog and cannot be spoofed', () => {
  const custom = Array.from({ length: MAX_CUSTOM_PLATFORMS }, (_, i) => ({ hostname: `custom${i}.example.com`, builtIn: true }));
  const result = validatePlatforms(custom);
  assert.equal(result.filter(p => !p.builtIn).length, MAX_CUSTOM_PLATFORMS);
  assert.deepEqual(validatePlatforms(result), result);
  assert.throws(() => validatePlatforms([...custom, { hostname: 'one-more.example.com' }]), /50 custom/);
});
test('corrupt settings return repair state while preserving usable text', () => {
  const state = normalizeState({ ...defaultState(), onboardingComplete: true, rules: [{ text: 'Keep this' }, { text: '' }] });
  assert.equal(state.rules[0].text, 'Keep this');
  assert.ok(state.issues.length);
  assert.ok(normalizeState({ ...defaultState(), onboardingComplete: true, rules: null }).issues.length);
  assert.deepEqual(normalizeState(defaultState()).issues, []);
  assert.throws(() => validatePrompt({ mode: 'interval', intervalHours: 7 }));
});
