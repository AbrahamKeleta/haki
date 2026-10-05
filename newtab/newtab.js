import { request, element } from '../shared/utils.js';

const $ = selector => document.querySelector(selector);
const parameters = new URLSearchParams(location.search), preview = parameters.get('preview') === '1';
const shadow = $('#app').attachShadow({ mode: 'open' });
shadow.append($('#ritual-template').content.cloneNode(true));
const dialog = shadow.querySelector('dialog'), card = shadow.querySelector('#ritual');
let state, completionTimer, generation = 0;

// Match the gate's Space/Enter controls, including ignoring held-key repeats.
shadow.addEventListener('keydown', event => {
  if (!(event.target instanceof HTMLButtonElement) || ![' ', 'Enter'].includes(event.key)) return;
  event.preventDefault();
  if (!event.repeat) event.target.click();
});

function status(message, error = false) {
  $('#status').textContent = message;
  $('#status').classList.toggle('error', error);
  $('#status').hidden = !message;
}
function brand() {
  const mark = element('div', { className: 'wordmark' });
  mark.append(element('span', { className: 'mark', 'aria-hidden': 'true' }, 'H'), document.createTextNode('HAKI'));
  return mark;
}
async function openNativeTab() {
  // chrome://newtab would recurse into this override. Use the native page directly.
  const tab = await chrome.tabs.getCurrent();
  await chrome.tabs.update(tab.id, { url: 'chrome://new-tab-page/' });
}
function renderRules() {
  clearTimeout(completionTimer); generation++;
  dialog.classList.remove('leaving');
  card.removeAttribute('role');
  const rules = state.rules, checked = new Set();
  if (!rules.length) {
    const settings = element('button', { type: 'button', className: 'primary' }, 'OPEN SETTINGS');
    settings.addEventListener('click', () => { location.href = '../options/options.html#rules'; });
    card.replaceChildren(brand(), element('p', { className: 'eyebrow' }, 'LET’S GET YOU BACK ON TRACK'),
      element('h1', { id: 'haki-title' }, 'We couldn’t load your rules.'),
      element('p', { className: 'intro' }, 'Open settings to create your trading rules.'), settings);
    return;
  }
  const title = element('h1', { id: 'haki-title' }, 'BEFORE YOU TRADE');
  const intro = element('p', { className: 'intro' });
  intro.append('You already know what to do.', element('br'), 'Follow your process.');
  const list = element('div', { className: 'rules', role: 'group', 'aria-label': 'Your trading rules' });
  const progress = element('p', { className: 'progress', role: 'status', 'aria-live': 'polite' }, `0 / ${rules.length} CONFIRMED`);
  const track = element('div', { className: 'track', 'aria-hidden': 'true' });
  const fill = element('div', { className: 'fill' }); track.append(fill);
  const ready = element('button', { type: 'button', className: 'primary', 'data-action': 'confirm' }, 'READY TO TRADE');
  ready.disabled = true;
  rules.forEach((rule, index) => {
    const row = element('button', { type: 'button', className: 'rule', role: 'checkbox', 'aria-checked': 'false', 'data-index': index });
    row.append(element('span', { className: 'circle', 'aria-hidden': 'true' }, '✓'), element('span', { className: 'rule-text' }, rule.text));
    row.addEventListener('click', () => {
      if (checked.has(index)) checked.delete(index); else checked.add(index);
      row.setAttribute('aria-checked', String(checked.has(index)));
      progress.textContent = `${checked.size} / ${rules.length} CONFIRMED`;
      fill.style.width = `${checked.size / rules.length * 100}%`;
      ready.disabled = checked.size !== rules.length;
    });
    list.append(row);
  });
  ready.addEventListener('click', () => {
    if (ready.disabled || checked.size !== rules.length) return;
    ready.disabled = true;
    const current = generation;
    // This ritual is local to the new tab; it never confirms or bypasses a protected URL.
    card.replaceChildren(brand(), element('div', { className: 'success-check', 'aria-hidden': 'true' }, '✓'),
      element('h1', { id: 'haki-title' }, 'HAKI CONFIRMED.'), element('p', { className: 'intro' }, 'Trust your edge. Good luck.'));
    card.setAttribute('role', 'status'); dialog.focus();
    completionTimer = setTimeout(() => {
      if (current !== generation) return;
      dialog.classList.add('leaving');
      completionTimer = setTimeout(async () => {
        if (current !== generation) return;
        try { await openNativeTab(); }
        catch { renderRules(); status('Couldn’t open a fresh tab. Try again.', true); }
      }, matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 300);
    }, 700);
  });
  card.replaceChildren(brand(), element('p', { className: 'eyebrow' }, 'WILLPOWER BEFORE EXECUTION'), title, intro,
    list, progress, track, ready, element('p', { className: 'footer' }, 'Process over impulse.'));
}
$('#enable').addEventListener('click', async () => {
  try {
    state = (await request('SAVE_NEWTAB', { newTabSettings: { ...state.newTabSettings, enabled: true } })).state;
    $('#preview').hidden = true;
  } catch (error) { status(error.message, true); }
});
try {
  const { newTabSettings } = await chrome.storage.local.get('newTabSettings');
  if (!preview && !newTabSettings?.enabled) {
    await openNativeTab();
  } else {
    state = (await request('GET_STATE')).state;
    $('#preview').hidden = !preview || state.newTabSettings.enabled;
    renderRules(); $('#app').hidden = false;
    if (state.issues.length) status('Some settings need attention. Open Settings to repair them.', true);
  }
} catch { $('#app').hidden = true; $('#preview').hidden = true; $('#load-error').hidden = false; }
chrome.storage.onChanged.addListener(async changes => {
  if (changes.rules && state) {
    clearTimeout(completionTimer); generation++;
    try { state = (await request('GET_STATE')).state; renderRules(); }
    catch { status('Reload this tab to see updated rules.', true); }
  }
});
