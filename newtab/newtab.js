import { request, element } from '../shared/utils.js';
import { ruleEditor, setStatus } from '../shared/editors.js';

const $ = selector => document.querySelector(selector);
const parameters = new URLSearchParams(location.search), preview = parameters.get('preview') === '1';
let state, editor;
function renderRules() {
  $('#rules-list').replaceChildren();
  $('#reflection').textContent = 'Read slowly. Let them sink in.';
  if (!state.rules.length) {
    const empty = element('p', { className: 'muted' }, 'Your ritual starts with a rule of your own.');
    const link = element('a', { href: '../onboarding/onboarding.html' }, 'CREATE YOUR RULES →');
    $('#rules-list').append(empty, link); return;
  }
  const checked = new Set();
  state.rules.forEach((rule, index) => {
    const row = element('button', { type: 'button', className: 'reminder', role: 'checkbox', 'aria-checked': 'false' });
    const circle = element('span', { className: 'reminder-circle', 'aria-hidden': 'true' }, String(index + 1).padStart(2, '0'));
    row.append(circle, element('span', { className: 'reminder-text' }, rule.text));
    row.addEventListener('click', () => {
      if (checked.has(index)) checked.delete(index); else checked.add(index);
      const active = checked.has(index); row.setAttribute('aria-checked', String(active)); circle.textContent = active ? '✓' : String(index + 1).padStart(2, '0');
      $('#reflection').textContent = checked.size === state.rules.length ? 'Take your process with you.' : checked.size ? `${checked.size} of ${state.rules.length} brought to mind.` : 'Read slowly. Let them sink in.';
      // Reflection here never records a trading-gate confirmation.
    }); $('#rules-list').append(row);
  });
}
$('#edit').addEventListener('click', () => { editor = ruleEditor($('#editor'), state.rules); setStatus($('#edit-status'), ''); $('#edit-dialog').showModal(); });
$('#cancel-edit').addEventListener('click', () => $('#edit-dialog').close());
$('#save-edit').addEventListener('click', async () => {
  $('#save-edit').disabled = true;
  try { state = (await request('SAVE_RULES', { rules: editor.value() })).state; renderRules(); $('#edit-dialog').close(); setStatus($('#status'), 'Your rules are saved.'); }
  catch (error) { setStatus($('#edit-status'), error.message, true); }
  finally { $('#save-edit').disabled = false; }
});
$('#enable').addEventListener('click', async () => {
  try {
    state = (await request('SAVE_NEWTAB', { newTabSettings: { ...state.newTabSettings, enabled: true } })).state;
    $('#preview').hidden = true; setStatus($('#status'), 'Your next new tab will feel like this.');
  } catch (error) { setStatus($('#status'), error.message, true); }
});
try {
  const { newTabSettings } = await chrome.storage.local.get('newTabSettings');
  if (!preview && !newTabSettings?.enabled) {
    // chrome://newtab would recurse into this override. Use Chrome's native page directly.
    const tab = await chrome.tabs.getCurrent();
    await chrome.tabs.update(tab.id, { url: 'chrome://new-tab-page/' });
  } else {
    state = (await request('GET_STATE')).state;
    $('#today').textContent = new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date());
    $('#preview').hidden = !preview || state.newTabSettings.enabled;
    renderRules(); $('#app').hidden = false;
    if (state.issues.length) setStatus($('#status'), 'Some settings need attention. Open Settings to repair them.', true);
  }
} catch { $('#load-error').hidden = false; }
chrome.storage.onChanged.addListener(async changes => {
  if (changes.rules && state) {
    try { state = (await request('GET_STATE')).state; renderRules(); }
    catch { setStatus($('#status'), 'Reload this tab to see updated rules.', true); }
  }
});
