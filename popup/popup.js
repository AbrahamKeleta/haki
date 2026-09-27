import { request, frequencyLabel } from '../shared/utils.js';
import { setStatus } from '../shared/editors.js';
import { emergencyHold } from '../shared/hold.js';

const $ = selector => document.querySelector(selector), status = $('#status');
let state;
function render() {
  $('#toggle').disabled = false;
  $('#toggle').setAttribute('aria-checked', String(state.enabled));
  $('#indicator').textContent = state.enabled ? '● ON' : '○ OFF';
  $('#protection-copy').textContent = state.enabled ? 'Your process comes first.' : 'Protection is paused.';
  $('#rule-count').textContent = state.rules.length;
  $('#platform-count').textContent = state.platforms.filter(p => p.enabled).length;
  $('#frequency-label').textContent = frequencyLabel(state.promptSettings);
  if (state.issues.length) setStatus(status, 'Your settings need repair. Open Settings to continue.', true);
}
async function updateEnabled(enabled) {
  $('#toggle').disabled = true;
  try { state = (await request('SET_ENABLED', { enabled })).state; render(); $('#pause-dialog').close(); }
  catch (error) { setStatus(status, error.message, true); $('#toggle').disabled = false; }
}
$('#toggle').addEventListener('click', () => { if (state.enabled) $('#pause-dialog').showModal(); else void updateEnabled(true); });
$('#cancel-pause').addEventListener('click', () => $('#pause-dialog').close());
$('#confirm-pause').addEventListener('click', () => updateEnabled(false));
$('#show-now').addEventListener('click', async () => {
  $('#show-now').disabled = true;
  try { await request('SHOW_NOW'); window.close(); }
  catch (error) { setStatus(status, error.message, true); }
  finally { $('#show-now').disabled = false; }
});
$('#emergency-toggle').addEventListener('click', () => {
  $('#emergency-area').hidden = !$('#emergency-area').hidden;
  $('#emergency-toggle').setAttribute('aria-expanded', String(!$('#emergency-area').hidden));
});
emergencyHold($('#hold'), status);
try {
  state = (await request('GET_STATE')).state;
  if (!state.onboardingComplete) {
    await chrome.tabs.create({ url: chrome.runtime.getURL('onboarding/onboarding.html') }); window.close();
  } else render();
} catch (error) { setStatus(status, error.message, true); }
