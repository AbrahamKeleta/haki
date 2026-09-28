import { EXAMPLE_RULES } from '../shared/constants.js';
import { element, request, frequencyLabel } from '../shared/utils.js';
import { ruleEditor, platformEditor, frequencyEditor, setStatus } from '../shared/editors.js';

const screen = document.querySelector('#screen'), status = document.querySelector('#status');
const next = document.querySelector('#next'), back = document.querySelector('#back');
let state, step = 0, editor, working = false;
function heading(title, description) {
  screen.append(element('h1', {}, title), element('p', { className: 'section-intro' }, description));
}
function render() {
  screen.replaceChildren(); setStatus(status, '');
  document.querySelector('#step-fill').style.width = `${step * 25}%`;
  document.querySelector('#step-count').textContent = step === 0 ? 'WELCOME' : `${String(step).padStart(2, '0')} / 04`;
  back.hidden = step === 0; next.textContent = step === 0 ? 'GET STARTED →' : step === 4 ? 'FINISH SETUP →' : 'CONTINUE →';
  if (step === 0) {
    screen.append(element('p', { className: 'eyebrow' }, 'WELCOME TO HAKI'));
    screen.append(element('h1', { className: 'welcome-title' }, 'Willpower before execution.'));
    screen.append(element('p', { className: 'welcome-copy' }, 'Trading gets easier when your rules aren’t negotiable. Haki puts your rules in front of you before you enter your trading platform.'));
    const detail = element('p', { className: 'welcome-detail' }); detail.append(element('span', {}, '01 — 03'), 'Your rules. Your platforms. Your pace.'); screen.append(detail);
  } else if (step === 1) {
    heading('Your trading rules', 'What rules do you refuse to break when you trade? Make these examples your own.');
    const root = element('div'); screen.append(root);
    editor = ruleEditor(root, state.rules.length ? state.rules : EXAMPLE_RULES.map(text => ({ id: crypto.randomUUID(), text })));
  } else if (step === 2) {
    heading('Where do you trade?', 'Haki will show your rules before you enter these platforms. Choose at least one.');
    const root = element('div'); screen.append(root);
    editor = platformEditor(root, state.platforms, status, saved => { state = saved; });
  } else if (step === 3) {
    heading('How often should Haki appear?', 'Choose the rhythm that keeps you close to your process.');
    const root = element('div'); screen.append(root); editor = frequencyEditor(root, state.promptSettings);
  } else {
    screen.append(element('div', { className: 'ready-symbol', 'aria-hidden': 'true' }, '✓'));
    heading('Haki is ready.', 'Your rules are set. We’ll put them in front of you before you trade.');
    for (const [label, value] of [['Your rules', state.rules.length], ['Protected platforms', state.platforms.filter(p => p.enabled).length], ['Your rhythm', frequencyLabel(state.promptSettings)]]) {
      const row = element('div', { className: 'summary-line' }); row.append(element('span', { className: 'muted' }, label), element('span', {}, String(value))); screen.append(row);
    }
    const optIn = element('label', { className: 'newtab-optin' });
    const checkbox = element('input', { type: 'checkbox', id: 'newtab-optin' }); checkbox.checked = state.newTabSettings.enabled;
    optIn.append(checkbox, element('span', {}, 'Start each new tab with my rules'));
    screen.append(optIn, element('p', { className: 'hint' }, 'Optional. A quiet reminder, with your rules always within reach. Change this anytime in Settings.'));
  }
  screen.focus({ preventScroll: true });
}
next.addEventListener('click', async () => {
  if (working || (step === 2 && editor.pending())) return;
  working = true; next.disabled = back.disabled = true;
  try {
    if (step === 1) state = (await request('SAVE_RULES', { rules: editor.value() })).state;
    if (step === 2 && !state.platforms.some(p => p.enabled)) throw new Error('Enable at least one platform and grant access to continue.');
    if (step === 3) state = (await request('SAVE_PROMPT', { promptSettings: editor.value() })).state;
    if (step === 4) {
      await request('SAVE_NEWTAB', { newTabSettings: { ...state.newTabSettings, enabled: document.querySelector('#newtab-optin').checked } });
      await request('FINISH_SETUP'); location.href = '../options/options.html#ready'; return;
    }
    step++; render();
  } catch (error) { setStatus(status, error.message, true); }
  finally { working = false; next.disabled = back.disabled = false; }
});
back.addEventListener('click', () => {
  if (working || (step === 2 && editor.pending())) return;
  if (step === 1) state.rules = editor.value();
  if (step === 3) state.promptSettings = editor.value();
  step = Math.max(0, step - 1); render();
});
try {
  state = (await request('GET_STATE')).state;
  if (state.onboardingComplete) location.replace('../options/options.html'); else render();
} catch (error) { next.disabled = true; setStatus(status, error.message, true); }
