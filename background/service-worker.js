import { defaultState, BYPASS_HOLD_MS, DEBUG } from '../shared/constants.js';
import { readState, writeFields, validateRules, validatePrompt, validatePlatforms } from '../shared/storage.js';
import { originPattern, protectedPlatform } from '../shared/domains.js';
import { shouldPrompt, localDate } from '../shared/utils.js';
import { syncRegistration, notifyPages, ensureContent } from './registration.js';

let queue = Promise.resolve();
const holds = new Map();
const serialized = task => {
  const result = queue.then(task);
  queue = result.catch(() => {});
  return result;
};
const log = error => { if (DEBUG) console.warn('Haki:', error.message); };

async function apply(fields) {
  const state = await writeFields(fields);
  await syncRegistration(state);
  await notifyPages();
  return { state };
}

async function initialize(details) {
  const raw = await chrome.storage.local.get('schemaVersion');
  if (raw.schemaVersion === undefined) {
    const existing = await chrome.storage.local.get(null);
    if (!Object.keys(existing).length) await chrome.storage.local.set(defaultState());
  }
  await syncRegistration(await readState());
  if (details?.reason === 'install') await chrome.tabs.create({ url: chrome.runtime.getURL('onboarding/onboarding.html') });
}

chrome.runtime.onInstalled.addListener(details => { serialized(() => initialize(details)).catch(log); });
chrome.runtime.onStartup.addListener(() => { serialized(() => initialize()).catch(log); });
chrome.permissions.onRemoved.addListener(() => {
  serialized(async () => {
    const state = await readState();
    for (const platform of state.platforms) {
      if (platform.enabled && !await chrome.permissions.contains({ origins: [originPattern(platform.hostname)] })) platform.enabled = false;
    }
    await apply({ platforms: state.platforms });
  }).catch(log);
});

async function activeProtectedTab(state) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id || !protectedPlatform(state.platforms, tab.url)) throw new Error('Open an enabled trading website, then try again.');
  if (!await chrome.permissions.contains({ origins: [originPattern(new URL(tab.url).hostname)] })) throw new Error('Grant this website access in Protected Platforms first.');
  return tab;
}

async function handle(message, sender) {
  if (!message || sender.id !== chrome.runtime.id) throw new Error('Unknown request.');
  const internal = sender.url?.startsWith(chrome.runtime.getURL(''));
  const state = await readState();
  if (message.type === 'GET_GATE' || message.type === 'CONFIRM_GATE') {
    if (!sender.tab || sender.frameId !== 0) throw new Error('This request requires a trading page.');
    const platform = protectedPlatform(state.platforms, sender.url);
    if (message.type === 'GET_GATE') {
      if (!state.enabled || !state.onboardingComplete) return { show: false };
      // A registered page with corrupt settings gets a repair screen, not a blank blocker.
      if (state.issues.length) return { show: true, error: 'We couldn’t load your rules.' };
      if (!platform) return { show: false };
      return { show: shouldPrompt(state.promptSettings, state.confirmation, { sessionGateConfirmed: message.sessionGateConfirmed === true }), rules: state.rules };
    }
    if (!platform || state.issues.length || !state.rules.length) throw new Error('Your settings need repair. Open Haki settings.');
    const signature = JSON.stringify(state.rules.map(r => [r.id, r.text]));
    if (message.signature !== signature) throw new Error('Your rules changed. Review the updated rules before continuing.');
    await writeFields({ confirmation: { lastConfirmedAt: Date.now(), lastConfirmedLocalDate: localDate() } });
    return {};
  }
  if (message.type === 'OPEN_SETTINGS') {
    await chrome.tabs.create({ url: chrome.runtime.getURL('options/options.html') });
    return {};
  }
  if (!internal) throw new Error('This action is only available in Haki.');
  switch (message.type) {
    case 'GET_STATE': return { state };
    case 'SAVE_RULES': return apply({ rules: validateRules(message.rules) });
    case 'SAVE_PROMPT': return apply({ promptSettings: validatePrompt(message.promptSettings) });
    case 'SET_ENABLED':
      if (message.enabled && state.onboardingComplete) validateRules(state.rules);
      return apply({ enabled: message.enabled === true });
    case 'SET_PLATFORM': {
      const existing = state.platforms.some(p => p.hostname === message.platform?.hostname);
      const platforms = validatePlatforms(existing
        ? state.platforms.map(p => p.hostname === message.platform.hostname ? message.platform : p)
        : [...state.platforms, message.platform]);
      for (const platform of platforms.filter(p => p.enabled)) {
        if (!await chrome.permissions.contains({ origins: [originPattern(platform.hostname)] })) {
          throw new Error(`Haki needs website access to protect ${platform.name}. Enable it again to grant permission.`);
        }
      }
      return apply({ platforms });
    }
    case 'REMOVE_PLATFORM': {
      const platform = state.platforms.find(p => p.id === message.id && !p.builtIn);
      if (!platform) throw new Error('Custom website not found.');
      const result = await apply({ platforms: state.platforms.filter(p => p.id !== platform.id) });
      await chrome.permissions.remove({ origins: [originPattern(platform.hostname)] });
      return result;
    }
    case 'FINISH_SETUP':
      validateRules(state.rules);
      if (!state.platforms.some(p => p.enabled)) throw new Error('Enable at least one trading website to finish setup.');
      return apply({ onboardingComplete: true, schemaVersion: 1 });
    case 'SHOW_NOW': {
      if (!state.onboardingComplete || !state.rules.length) throw new Error('Finish setting up your rules first.');
      const tab = await activeProtectedTab(state);
      await ensureContent(tab.id);
      await chrome.tabs.sendMessage(tab.id, { type: 'HAKI_SHOW', rules: state.rules, error: state.issues.length ? 'We couldn’t load your rules.' : null }, { frameId: 0 });
      return {};
    }
    case 'BYPASS_START': {
      const tab = await activeProtectedTab(state);
      let status;
      try { status = await chrome.tabs.sendMessage(tab.id, { type: 'HAKI_STATUS' }, { frameId: 0 }); } catch { /* Emergency fallback supports a broken content script. */ }
      const token = crypto.randomUUID();
      holds.set(token, { started: Date.now(), tabId: tab.id, url: tab.url, documentToken: status?.documentToken });
      for (const [id, hold] of holds) if (Date.now() - hold.started > 60000) holds.delete(id);
      return { token };
    }
    case 'BYPASS_END': {
      const hold = holds.get(message.token);
      holds.delete(message.token);
      if (!hold || Date.now() - hold.started < BYPASS_HOLD_MS) throw new Error('Hold for the full 5 seconds to continue.');
      const tab = await activeProtectedTab(state);
      if (tab.id !== hold.tabId || tab.url !== hold.url) throw new Error('The active page changed. Hold again on the trading page.');
      if (hold.documentToken) {
        const reply = await chrome.tabs.sendMessage(tab.id, { type: 'HAKI_BYPASS', documentToken: hold.documentToken }, { frameId: 0 });
        if (!reply?.ok) throw new Error('The page changed. Hold again to continue.');
      } else {
        await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: () => {
          document.documentElement.setAttribute('data-haki-ready', '');
          document.documentElement.removeAttribute('data-haki-blocked');
          document.getElementById('haki-root')?.remove();
        } });
      }
      return {};
    }
    case 'RESET_SETTINGS': {
      // Keep one recovery copy, including a corrupt original, until explicitly removed by uninstall.
      const raw = await chrome.storage.local.get(null);
      if (!raw.recoveryBackup) await chrome.storage.local.set({ recoveryBackup: { savedAt: Date.now(), data: raw } });
      const result = await apply(defaultState());
      const granted = await chrome.permissions.getAll();
      if (granted.origins?.length) await chrome.permissions.remove({ origins: granted.origins });
      return result;
    }
    default: throw new Error('Unknown Haki action.');
  }
}

chrome.runtime.onMessage.addListener((message, sender, respond) => {
  serialized(() => handle(message, sender)).then(
    result => respond({ ok: true, ...result }),
    error => { log(error); respond({ ok: false, error: error.message || 'Haki could not save. Try again.' }); },
  );
  return true;
});
