import { BYPASS_HOLD_MS } from './constants.js';
import { request } from './utils.js';
import { setStatus } from './editors.js';

export function emergencyHold(button, status, onComplete = () => {}) {
  let generation = 0, timer, holding = false;
  const label = 'Hold 5 seconds to bypass Haki';
  button.textContent = label;
  function cancel() {
    generation++; holding = false; clearInterval(timer);
    button.textContent = label; button.style.removeProperty('--hold-progress');
  }
  async function start() {
    if (holding) return;
    holding = true; const current = ++generation;
    try {
      const { token } = await request('BYPASS_START');
      if (!holding || current !== generation) return;
      const started = performance.now();
      timer = setInterval(async () => {
        const elapsed = performance.now() - started;
        button.style.setProperty('--hold-progress', `${Math.min(100, elapsed / BYPASS_HOLD_MS * 100)}%`);
        button.textContent = `Keep holding… ${Math.max(1, Math.ceil((BYPASS_HOLD_MS - elapsed) / 1000))}`;
        if (elapsed >= BYPASS_HOLD_MS) {
          clearInterval(timer);
          try { await request('BYPASS_END', { token }); cancel(); setStatus(status, 'Emergency access granted for this page.'); onComplete(); }
          catch (error) { cancel(); setStatus(status, error.message, true); }
        }
      }, 60);
    } catch (error) { cancel(); setStatus(status, error.message, true); }
  }
  button.addEventListener('pointerdown', event => { if (event.button === 0) { button.setPointerCapture(event.pointerId); void start(); } });
  button.addEventListener('keydown', event => { if ([' ', 'Enter'].includes(event.key)) { event.preventDefault(); if (!event.repeat) void start(); } });
  for (const event of ['pointerup', 'pointercancel', 'lostpointercapture', 'keyup', 'blur']) button.addEventListener(event, cancel);
  button.addEventListener('contextmenu', event => event.preventDefault());
  window.addEventListener('blur', cancel);
  document.addEventListener('visibilitychange', () => { if (document.hidden) cancel(); });
}
