import { originPattern } from '../shared/domains.js';

export const CONTENT_FILES = ['content/gate-style.js', 'content/gate.js'];
export const SCRIPT_ID = 'haki-protected-sites';

export async function syncRegistration(state) {
  const matches = [];
  if (state.enabled && state.onboardingComplete) {
    for (const platform of state.platforms.filter(p => p.enabled)) {
      const origin = originPattern(platform.hostname);
      if (await chrome.permissions.contains({ origins: [origin] })) matches.push(origin);
    }
  }
  const existing = (await chrome.scripting.getRegisteredContentScripts({ ids: [SCRIPT_ID] }))[0];
  if (!matches.length) {
    if (existing) await chrome.scripting.unregisterContentScripts({ ids: [SCRIPT_ID] });
    return;
  }
  const script = {
    id: SCRIPT_ID, matches, js: CONTENT_FILES, css: ['content/preflight.css'],
    runAt: 'document_start', allFrames: false, persistAcrossSessions: true, world: 'ISOLATED',
  };
  if (existing) await chrome.scripting.updateContentScripts([script]);
  else await chrome.scripting.registerContentScripts([script]);
}

export async function notifyPages() {
  // Without the tabs permission, URLs are only exposed for hosts the user granted.
  const tabs = await chrome.tabs.query({});
  await Promise.allSettled(tabs.filter(tab => tab.id && tab.url?.startsWith('https:')).map(tab =>
    chrome.tabs.sendMessage(tab.id, { type: 'HAKI_RECHECK' }, { frameId: 0 })));
}

export async function ensureContent(tabId) {
  try { return await chrome.tabs.sendMessage(tabId, { type: 'HAKI_STATUS' }, { frameId: 0 }); }
  catch {
    await chrome.scripting.executeScript({ target: { tabId }, files: CONTENT_FILES, injectImmediately: true });
    return chrome.tabs.sendMessage(tabId, { type: 'HAKI_STATUS' }, { frameId: 0 });
  }
}
