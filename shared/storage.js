import { defaultState, BUILT_IN_PLATFORMS, SCHEMA_VERSION, MAX_RULES, MAX_RULE_LENGTH, MAX_PLATFORMS, MAX_CUSTOM_PLATFORMS, INTERVAL_HOURS } from './constants.js';
import { normalizeHostname } from './domains.js';

export function validateRules(rules) {
  if (!Array.isArray(rules) || rules.length < 1 || rules.length > MAX_RULES) {
    throw new Error(`Keep between 1 and ${MAX_RULES} rules.`);
  }
  const ids = new Set();
  return rules.map((rule, order) => {
    const text = typeof rule?.text === 'string' ? rule.text.trim() : '';
    if (!text || text.length > MAX_RULE_LENGTH) throw new Error(`Each rule needs 1–${MAX_RULE_LENGTH} characters.`);
    const id = typeof rule.id === 'string' && /^[a-zA-Z0-9_-]{1,64}$/.test(rule.id) && !ids.has(rule.id)
      ? rule.id : crypto.randomUUID();
    ids.add(id);
    return { id, text, order };
  });
}

export function validatePrompt(settings) {
  if (!settings || !['tab', 'interval', 'daily'].includes(settings.mode) || !INTERVAL_HOURS.includes(settings.intervalHours)) {
    throw new Error('Choose a valid reminder frequency.');
  }
  return { mode: settings.mode, intervalHours: settings.intervalHours };
}

export function validatePlatforms(platforms) {
  if (!Array.isArray(platforms) || platforms.length > MAX_PLATFORMS) throw new Error(`Use up to ${MAX_CUSTOM_PLATFORMS} custom websites alongside the built-in platforms.`);
  const hosts = new Set();
  const result = platforms.map(platform => {
    const hostname = normalizeHostname(platform.hostname);
    if (hosts.has(hostname)) throw new Error('That website is already in your list.');
    hosts.add(hostname);
    const builtIn = BUILT_IN_PLATFORMS.find(p => p.hostname === hostname);
    return {
      ...(builtIn || { id: `custom-${hostname}`, name: hostname, hostname, builtIn: false }),
      enabled: platform.enabled === true,
    };
  });
  if (result.filter(p => !p.builtIn).length > MAX_CUSTOM_PLATFORMS) throw new Error(`Use up to ${MAX_CUSTOM_PLATFORMS} custom websites.`);
  for (const platform of BUILT_IN_PLATFORMS) {
    if (!hosts.has(platform.hostname)) result.push({ ...platform, enabled: false });
  }
  return result;
}

export function normalizeState(raw) {
  const state = defaultState();
  const issues = [];
  if (!raw || typeof raw !== 'object') return { ...state, issues: ['Settings could not be read.'] };
  if (raw.schemaVersion != null && raw.schemaVersion !== SCHEMA_VERSION) issues.push('Settings use an unsupported version.');
  for (const key of ['enabled', 'onboardingComplete']) {
    if (typeof raw[key] === 'boolean') state[key] = raw[key];
    else if (raw[key] !== undefined) issues.push(`The ${key} setting needs repair.`);
  }
  if (raw.rules !== undefined) {
    try { state.rules = validateRules(raw.rules); }
    catch {
      // Keep usable text for the editor, but never silently omit a damaged rule in the gate.
      const usable = Array.isArray(raw.rules) ? raw.rules.filter(r => typeof r?.text === 'string' && r.text.trim() && r.text.trim().length <= MAX_RULE_LENGTH).slice(0, MAX_RULES) : [];
      state.rules = usable.length ? validateRules(usable) : [];
      if (state.onboardingComplete || (Array.isArray(raw.rules) && raw.rules.length)) issues.push('Your rules need repair.');
    }
  }
  if (raw.platforms !== undefined) {
    try { state.platforms = validatePlatforms(raw.platforms); }
    catch { issues.push('Your websites need repair.'); }
  }
  if (raw.promptSettings !== undefined) {
    try { state.promptSettings = validatePrompt(raw.promptSettings); }
    catch { issues.push('Your reminder frequency needs repair.'); }
  }
  if (raw.confirmation && typeof raw.confirmation === 'object') {
    const { lastConfirmedAt, lastConfirmedLocalDate } = raw.confirmation;
    state.confirmation = {
      lastConfirmedAt: Number.isFinite(lastConfirmedAt) && lastConfirmedAt > 0 ? lastConfirmedAt : null,
      lastConfirmedLocalDate: typeof lastConfirmedLocalDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(lastConfirmedLocalDate) ? lastConfirmedLocalDate : null,
    };
  }
  if (raw.newTabSettings && typeof raw.newTabSettings === 'object') {
    state.newTabSettings = { enabled: raw.newTabSettings.enabled === true };
  }
  if (state.onboardingComplete && !state.rules.length && !issues.includes('Your rules need repair.')) issues.push('Your rules need repair.');
  return { ...state, issues };
}

export async function readState() {
  return normalizeState(await chrome.storage.local.get(Object.keys(defaultState())));
}

// Called only inside the service worker's serialized mutation queue.
export async function writeFields(fields) {
  const raw = await chrome.storage.local.get(null);
  if (normalizeState(raw).issues.length && !raw.recoveryBackup) {
    await chrome.storage.local.set({ recoveryBackup: { savedAt: Date.now(), data: raw } });
  }
  await chrome.storage.local.set(fields);
  return readState();
}
