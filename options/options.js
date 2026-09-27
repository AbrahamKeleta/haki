import { request } from '../shared/utils.js';
import { ruleEditor, platformEditor, frequencyEditor, setStatus } from '../shared/editors.js';
import { emergencyHold } from '../shared/hold.js';

const $ = selector => document.querySelector(selector);
let state, rules, dirty = false;
const globalStatus = $('#global-status');
function protection() {
  $('#protection').textContent = state.enabled ? '● PROTECTION ON' : '○ PROTECTION PAUSED';
  $('#protection').classList.toggle('paused', !state.enabled);
  $('#protection').setAttribute('aria-label', state.enabled ? 'Pause protection' : 'Resume protection');
}
function navigate() {
  const section = ['rules', 'platforms', 'frequency', 'settings'].includes(location.hash.slice(1)) ? location.hash.slice(1) : 'rules';
  document.querySelectorAll('.settings-section').forEach(el => { el.hidden = el.id !== section; });
  document.querySelectorAll('[data-section]').forEach(el => { if (el.dataset.section === section) el.setAttribute('aria-current', 'page'); else el.removeAttribute('aria-current'); });
}
function recovery() {
  $('#recovery').hidden = !state.issues.length;
  $('#recovery-detail').textContent = state.issues.join(' ');
}
async function run(action) {
  try { await action(); }
  catch (error) { setStatus(globalStatus, error.message, true); }
}
$('#save-rules').addEventListener('click', () => run(async () => {
  $('#save-rules').disabled = true;
  try { state = (await request('SAVE_RULES', { rules: rules.value() })).state; dirty = false; recovery(); setStatus($('#rules-status'), 'Your rules are saved.'); }
  catch (error) { setStatus($('#rules-status'), error.message, true); }
  finally { $('#save-rules').disabled = false; }
}));
$('#protection').addEventListener('click', () => {
  if (state.enabled) $('#pause-dialog').showModal();
  else void run(async () => { state = (await request('SET_ENABLED', { enabled: true })).state; protection(); });
});
$('#confirm-pause').addEventListener('click', () => run(async () => {
  state = (await request('SET_ENABLED', { enabled: false })).state; protection(); $('#pause-dialog').close();
}));
$('#reset').addEventListener('click', () => $('#reset-dialog').showModal());
$('#confirm-reset').addEventListener('click', () => run(async () => { await request('RESET_SETTINGS'); dirty = false; location.href = '../onboarding/onboarding.html'; }));
document.querySelectorAll('[data-close]').forEach(button => button.addEventListener('click', () => document.getElementById(button.dataset.close).close()));
window.addEventListener('hashchange', navigate);
window.addEventListener('beforeunload', event => { if (dirty) { event.preventDefault(); event.returnValue = ''; } });
emergencyHold($('#emergency'), $('#emergency-status'));
try {
  state = (await request('GET_STATE')).state;
  if (!state.onboardingComplete && !state.issues.length) location.replace('../onboarding/onboarding.html');
  else {
    rules = ruleEditor($('#rule-editor'), state.rules, () => { dirty = true; setStatus($('#rules-status'), 'Unsaved changes'); });
    platformEditor($('#platform-editor'), state.platforms, $('#platform-status'), saved => { state = saved; recovery(); });
    let saves = Promise.resolve();
    frequencyEditor($('#frequency-editor'), state.promptSettings, settings => {
      setStatus($('#frequency-status'), 'Saving…');
      saves = saves.then(async () => { state = (await request('SAVE_PROMPT', { promptSettings: settings })).state; recovery(); setStatus($('#frequency-status'), 'Saved.'); }).catch(error => setStatus($('#frequency-status'), error.message, true));
    });
    if (location.hash === '#ready') { $('#notice').hidden = false; $('#notice').textContent = 'Haki is ready. Open or reload a protected trading platform to begin your ritual.'; }
    protection(); recovery(); navigate();
  }
} catch (error) { setStatus(globalStatus, error.message, true); }
chrome.storage.onChanged.addListener(changes => {
  if (changes.enabled && state) { state.enabled = changes.enabled.newValue === true; protection(); }
});
