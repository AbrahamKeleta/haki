import { MAX_RULES, MAX_RULE_LENGTH, INTERVAL_HOURS } from './constants.js';
import { normalizeHostname, originPattern } from './domains.js';
import { element, request } from './utils.js';

export function setStatus(target, text, error = false) {
  target.textContent = text; target.classList.toggle('error', error);
}

export function ruleEditor(container, initialRules, onChange = () => {}) {
  let rules = initialRules.map(r => ({ ...r }));
  if (!rules.length) rules.push({ id: crypto.randomUUID(), text: '' });
  const list = element('div', { className: 'rule-editor' });
  const footer = element('div', { className: 'editor-footer' });
  const add = element('button', { type: 'button', className: 'text-button' }, '+ Add another rule');
  const count = element('small');
  footer.append(add, count); container.replaceChildren(list, footer);
  function render(focusIndex, focusAction = 'input') {
    list.replaceChildren();
    rules.forEach((rule, index) => {
      const row = element('div', { className: 'edit-row' });
      const input = element('input', { type: 'text', maxlength: MAX_RULE_LENGTH, 'aria-label': `Rule ${index + 1}`, placeholder: 'A rule you refuse to break', autocomplete: 'off' });
      input.value = rule.text;
      input.addEventListener('input', () => { rule.text = input.value; onChange(); });
      const controls = element('div', { className: 'row-actions' });
      for (const [action, symbol, label] of [['up', '↑', 'Move up'], ['down', '↓', 'Move down'], ['delete', '×', 'Delete']]) {
        const button = element('button', { type: 'button', className: 'icon-button', 'aria-label': `${label} rule ${index + 1}`, title: label, 'data-action': action }, symbol);
        button.disabled = action === 'up' ? index === 0 : action === 'down' ? index === rules.length - 1 : rules.length === 1;
        button.addEventListener('click', () => {
          let destination = index;
          if (action === 'delete') { rules.splice(index, 1); destination = Math.min(index, rules.length - 1); }
          else { destination = index + (action === 'up' ? -1 : 1); [rules[index], rules[destination]] = [rules[destination], rules[index]]; }
          onChange(); render(destination);
        }); controls.append(button);
      }
      row.append(element('span', { className: 'rule-number', 'aria-hidden': 'true' }, String(index + 1).padStart(2, '0')), input, controls);
      list.append(row);
    });
    count.textContent = `${rules.length} / ${MAX_RULES} rules`;
    add.disabled = rules.length >= MAX_RULES;
    if (focusIndex !== undefined) list.children[focusIndex]?.querySelector(focusAction).focus();
  }
  add.addEventListener('click', () => { rules.push({ id: crypto.randomUUID(), text: '' }); onChange(); render(rules.length - 1); });
  render();
  return { value: () => rules.map((r, order) => ({ ...r, order })) };
}

export function platformEditor(container, initialPlatforms, status, onSaved = () => {}) {
  let platforms = initialPlatforms, pending = false;
  const list = element('div', { className: 'platforms' });
  const form = element('form', { className: 'add-site' });
  const label = element('label', { for: 'custom-host' }, 'Add another trading website');
  const input = element('input', { id: 'custom-host', type: 'text', placeholder: 'app.examplebroker.com', maxlength: 2048, autocomplete: 'off', spellcheck: 'false' });
  const add = element('button', { className: 'secondary', type: 'submit' }, '+ ADD WEBSITE');
  form.append(label, input, add);
  container.replaceChildren(list, form, element('p', { className: 'hint' }, 'Haki asks for access to each website you enable. HTTPS only. Subdomains are added separately.'));
  const saved = state => { platforms = state.platforms; onSaved(state); render(); };
  async function update(platform, enabled) {
    if (pending) return;
    pending = true;
    try {
      // Call within the original click/submit gesture, before any await.
      const allowed = enabled ? await chrome.permissions.request({ origins: [originPattern(platform.hostname)] }) : true;
      const response = await request('SET_PLATFORM', { platform: { ...platform, enabled: enabled && allowed } });
      saved(response.state);
      setStatus(status, allowed ? 'Saved. Reload an already open website for protection from its first moment.' : 'Access wasn’t granted. Haki needs website access to display your rules. This website stays disabled.', !allowed);
      return allowed;
    } catch (error) { setStatus(status, error.message, true); render(); }
    finally { pending = false; }
  }
  function render() {
    list.replaceChildren();
    for (const platform of platforms) {
      const row = element('div', { className: 'platform-row' });
      const info = element('div', { className: 'platform-info' });
      info.append(element('strong', {}, platform.name), element('small', {}, platform.hostname));
      const label = element('label', { className: 'switch' });
      const toggle = element('input', { type: 'checkbox', role: 'switch', 'aria-label': `Protect ${platform.name}` }); toggle.checked = platform.enabled;
      toggle.addEventListener('change', () => { if (pending) { toggle.checked = platform.enabled; return; } toggle.disabled = true; void update(platform, toggle.checked); });
      label.append(toggle, element('span', { className: 'switch-track' }));
      row.append(element('span', { className: 'platform-avatar', 'aria-hidden': 'true' }, platform.name[0].toUpperCase()), info, label);
      if (!platform.builtIn) {
        const remove = element('button', { className: 'icon-button', type: 'button', 'aria-label': `Remove ${platform.hostname}` }, '×');
        remove.addEventListener('click', async () => {
          if (pending) return; pending = true; remove.disabled = true;
          try { const response = await request('REMOVE_PLATFORM', { id: platform.id }); saved(response.state); setStatus(status, 'Website removed. Its optional access was released.'); }
          catch (error) { setStatus(status, error.message, true); remove.disabled = false; }
          finally { pending = false; }
        }); row.append(remove);
      }
      list.append(row);
    }
  }
  form.addEventListener('submit', async event => {
    event.preventDefault(); if (pending) return;
    try {
      const hostname = normalizeHostname(input.value);
      if (platforms.some(p => p.hostname === hostname)) throw new Error('That website is already in your list.');
      add.disabled = true;
      await update({ hostname, name: hostname, builtIn: false }, true); input.value = '';
    } catch (error) { setStatus(status, error.message, true); }
    finally { add.disabled = false; }
  });
  render();
  return { value: () => platforms, pending: () => pending };
}

export function frequencyEditor(container, initial, onChange = () => {}) {
  let settings = { ...initial };
  const group = element('fieldset', { className: 'frequency-options' });
  group.append(element('legend', { className: 'visually-hidden' }, 'Prompt frequency'));
  for (const [mode, title, description] of [
    ['tab', 'Every new trading tab', 'Maximum accountability. See your rules whenever you open or reload a protected platform.'],
    ['interval', 'Every X hours', 'See your rules again after a set amount of time, across all your platforms.'],
    ['daily', 'Once per day', 'Confirm your rules once each local calendar day.'],
  ]) {
    const label = element('label', { className: 'frequency-option' });
    const radio = element('input', { type: 'radio', name: 'frequency', value: mode }); radio.checked = settings.mode === mode;
    const copy = element('span'); copy.append(element('strong', {}, title), element('small', {}, description));
    radio.addEventListener('change', () => { settings.mode = mode; hours.hidden = mode !== 'interval'; onChange({ ...settings }); });
    label.append(radio, copy); group.append(label);
  }
  const hours = element('div', { className: 'interval-select' }); hours.hidden = settings.mode !== 'interval';
  const select = element('select', { id: 'interval-hours' });
  INTERVAL_HOURS.forEach(value => { const option = element('option', { value }, `${value} ${value === 1 ? 'hour' : 'hours'}`); option.selected = settings.intervalHours === value; select.append(option); });
  select.addEventListener('change', () => { settings.intervalHours = Number(select.value); onChange({ ...settings }); });
  hours.append(element('label', { for: 'interval-hours' }, 'Remind me every'), select);
  container.replaceChildren(group, hours);
  return { value: () => ({ ...settings }) };
}
