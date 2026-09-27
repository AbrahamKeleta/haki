export function localDate(timestamp = Date.now()) {
  const date = new Date(timestamp);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function shouldPrompt(settings, confirmation, { now = Date.now(), sessionGateConfirmed = false } = {}) {
  if (settings.mode === 'tab') return !sessionGateConfirmed;
  if (settings.mode === 'daily') return confirmation.lastConfirmedLocalDate !== localDate(now);
  if (settings.mode === 'interval') {
    const last = confirmation.lastConfirmedAt;
    // Clock rollback must not silently suppress the ritual indefinitely.
    return !Number.isFinite(last) || last <= 0 || last > now ||
      now - last >= settings.intervalHours * 60 * 60 * 1000;
  }
  return true;
}

export function frequencyLabel(settings) {
  if (settings.mode === 'daily') return 'Once per day';
  if (settings.mode === 'interval') return `Every ${settings.intervalHours} ${settings.intervalHours === 1 ? 'hour' : 'hours'}`;
  return 'Every new trading tab';
}

export function element(tag, attrs = {}, text = '') {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (key === 'className') node.className = value;
    else node.setAttribute(key, value);
  }
  node.textContent = text;
  return node;
}

export async function request(type, payload = {}) {
  const response = await chrome.runtime.sendMessage({ type, ...payload });
  if (!response?.ok) throw new Error(response?.error || 'Haki could not connect. Reload this page and try again.');
  return response;
}
