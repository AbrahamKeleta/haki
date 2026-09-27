(() => {
  if (globalThis.__hakiInstalled) return;
  globalThis.__hakiInstalled = true;
  const documentToken = crypto.randomUUID();
  let host, shadow, dialog, card, ready, progress, fill;
  let rules = [], checked = new Set(), sessionGateConfirmed = false, sessionBypassed = false;
  let previousFocus, busy = false, generation = 0, watchdog, holdTimer, holdStarted;
  const events = ['keydown', 'keyup', 'keypress', 'click', 'dblclick', 'pointerdown', 'pointerup', 'pointercancel', 'mousedown', 'mouseup', 'touchstart', 'touchend', 'wheel', 'contextmenu', 'focusin'];

  function node(tag, className, text) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text) el.textContent = text;
    return el;
  }
  function button(text, action, className = 'secondary') {
    const el = node('button', className, text);
    el.type = 'button'; el.dataset.action = action;
    return el;
  }
  function brand() {
    const mark = node('div', 'wordmark');
    const symbol = node('span', 'mark', 'H'); symbol.setAttribute('aria-hidden', 'true');
    mark.append(symbol, document.createTextNode('HAKI'));
    return mark;
  }
  function mount() {
    if (host) return;
    previousFocus = document.activeElement;
    host = node('div'); host.id = 'haki-root';
    host.style.cssText = 'all:initial!important;display:block!important;visibility:visible!important;position:fixed!important;inset:0!important;z-index:2147483647!important;pointer-events:auto!important;';
    shadow = host.attachShadow({ mode: 'open' });
    const style = node('style');
    // The checked-in stylesheet bundle loads synchronously; no network or resource fetch.
    style.textContent = globalThis.HAKI_GATE_CSS || 'dialog{position:fixed;inset:0;margin:0;width:100vw;height:100vh;background:#040b13;color:white;font:18px sans-serif;padding:40px;box-sizing:border-box}button{padding:16px;margin:12px}';
    dialog = node('dialog'); dialog.setAttribute('aria-modal', 'true'); dialog.setAttribute('aria-labelledby', 'haki-title'); dialog.tabIndex = -1;
    dialog.addEventListener('cancel', event => event.preventDefault());
    card = node('section', 'ritual');
    const title = node('h1', '', 'A moment for your process.'); title.id = 'haki-title';
    card.append(brand(), title, node('p', 'intro', 'Loading your rules…'));
    dialog.append(card); shadow.append(style, dialog);
    document.documentElement.append(host);
    for (const name of events) window.addEventListener(name, guard, { capture: true, passive: false });
    window.addEventListener('blur', cancelHold);
    dialog.showModal();
    document.documentElement.setAttribute('data-haki-blocked', '');
    document.documentElement.setAttribute('data-haki-ready', '');
    dialog.focus();
  }
  function release() {
    generation++;
    clearTimeout(watchdog); cancelHold();
    for (const name of events) window.removeEventListener(name, guard, true);
    window.removeEventListener('blur', cancelHold);
    document.documentElement.setAttribute('data-haki-ready', '');
    document.documentElement.removeAttribute('data-haki-blocked');
    if (dialog?.open) dialog.close();
    host?.remove(); host = shadow = dialog = card = null;
    busy = false; checked.clear();
    if (previousFocus?.isConnected && typeof previousFocus.focus === 'function') previousFocus.focus({ preventScroll: true });
  }
  function focusable() { return [...shadow.querySelectorAll('button:not(:disabled)')]; }
  function guard(event) {
    if (!host) return;
    const path = event.composedPath();
    const inside = path.includes(dialog);
    const control = path.find(el => el instanceof HTMLButtonElement && shadow.contains(el));
    // Consume gate input in the earliest capture listener. Platform hotkeys never receive it.
    event.stopImmediatePropagation();
    if (event.type === 'keydown') {
      if (event.key === 'Tab') {
        event.preventDefault();
        const controls = focusable(), current = controls.indexOf(shadow.activeElement);
        if (!controls.length) return dialog.focus();
        controls[(current + (event.shiftKey ? -1 : 1) + controls.length) % controls.length].focus();
      } else if (event.key === 'Escape') { event.preventDefault(); cancelHold(); }
      else if (event.key === ' ' || event.key === 'Enter') {
        event.preventDefault();
        if (!event.repeat && control) {
          if (control.dataset.action === 'emergency') startHold(control);
          else activate(control);
        }
      } else event.preventDefault();
    } else if (event.type === 'keyup' || event.type === 'keypress') {
      event.preventDefault();
      if (event.type === 'keyup') cancelHold();
    } else if (event.type === 'click') {
      event.preventDefault();
      if (control && control.dataset.action !== 'emergency') activate(control);
    } else if (event.type === 'pointerdown') {
      if (control?.dataset.action === 'emergency' && event.button === 0) startHold(control);
      if (!inside) event.preventDefault();
    } else if (event.type === 'pointerup' || event.type === 'pointercancel' || event.type === 'touchend') cancelHold();
    else if (event.type === 'focusin' && !inside) (focusable()[0] || dialog).focus();
    else if (!inside || event.type === 'contextmenu') event.preventDefault();
  }
  function cancelHold() {
    clearInterval(holdTimer); holdTimer = null;
    const control = shadow?.querySelector('[data-action=emergency]');
    if (control) control.textContent = 'Hold 5 seconds for Emergency Access';
  }
  function startHold(control) {
    if (holdTimer) return;
    holdStarted = performance.now();
    holdTimer = setInterval(() => {
      const elapsed = performance.now() - holdStarted;
      control.textContent = `Keep holding… ${Math.max(1, Math.ceil((5000 - elapsed) / 1000))}`;
      if (elapsed >= 5000) { sessionBypassed = true; release(); }
    }, 80);
  }
  function renderError(message = 'We couldn’t load your rules.') {
    mount(); clearTimeout(watchdog); busy = false;
    const title = node('h1', '', message); title.id = 'haki-title';
    card.replaceChildren(brand(), node('p', 'eyebrow', 'LET’S GET YOU BACK ON TRACK'), title,
      node('p', 'intro', 'Open settings to repair your rules, or hold below for emergency access.'),
      button('OPEN SETTINGS', 'settings', 'primary'), button('Hold 5 seconds for Emergency Access', 'emergency'));
    focusable()[0].focus();
  }
  function renderRules(nextRules) {
    mount(); clearTimeout(watchdog); cancelHold(); generation++; busy = false;
    rules = (Array.isArray(nextRules) ? nextRules : []).filter(rule => typeof rule?.text === 'string' && rule.text.trim());
    checked = new Set();
    if (!rules.length) return renderError();
    const title = node('h1', '', 'BEFORE YOU TRADE'); title.id = 'haki-title';
    const intro = node('p', 'intro'); intro.append('You already know what to do.', node('br'), 'Follow your process.');
    const list = node('div', 'rules'); list.setAttribute('role', 'group'); list.setAttribute('aria-label', 'Your trading rules');
    rules.forEach((rule, index) => {
      const row = button('', 'rule', 'rule'); row.dataset.index = String(index);
      row.setAttribute('role', 'checkbox'); row.setAttribute('aria-checked', 'false');
      const circle = node('span', 'circle', '✓'); circle.setAttribute('aria-hidden', 'true');
      row.append(circle, node('span', 'rule-text', rule.text)); list.append(row);
    });
    progress = node('p', 'progress', `0 / ${rules.length} CONFIRMED`); progress.setAttribute('role', 'status'); progress.setAttribute('aria-live', 'polite');
    const track = node('div', 'track'); track.setAttribute('aria-hidden', 'true'); fill = node('div', 'fill'); track.append(fill);
    ready = button('READY TO TRADE', 'confirm', 'primary'); ready.disabled = true;
    card.replaceChildren(brand(), node('p', 'eyebrow', 'WILLPOWER BEFORE EXECUTION'), title, intro, list, progress, track, ready, node('p', 'footer', 'Process over impulse.'));
    focusable()[0].focus();
  }
  async function activate(control) {
    if (control.disabled || busy) return;
    const action = control.dataset.action;
    if (action === 'rule') {
      const index = Number(control.dataset.index);
      if (checked.has(index)) checked.delete(index); else checked.add(index);
      control.setAttribute('aria-checked', String(checked.has(index)));
      progress.textContent = `${checked.size} / ${rules.length} CONFIRMED`;
      fill.style.width = `${checked.size / rules.length * 100}%`;
      ready.disabled = checked.size !== rules.length;
    } else if (action === 'settings') {
      try { await chrome.runtime.sendMessage({ type: 'OPEN_SETTINGS' }); }
      catch { renderError('Open Haki settings from the extension menu.'); }
    } else if (action === 'confirm' && rules.length && checked.size === rules.length) {
      busy = true; ready.disabled = true; ready.textContent = 'CONFIRMING…';
      const current = generation;
      const timeout = setTimeout(() => { if (host && current === generation) renderError('Your confirmation couldn’t be saved.'); }, 6000);
      try {
        const response = await chrome.runtime.sendMessage({ type: 'CONFIRM_GATE', signature: JSON.stringify(rules.map(r => [r.id, r.text])) });
        clearTimeout(timeout);
        if (!host || current !== generation) return;
        if (!response?.ok) throw new Error(response?.error || 'Your confirmation couldn’t be saved.');
        sessionGateConfirmed = true;
        const title = node('h1', '', 'HAKI CONFIRMED.'); title.id = 'haki-title';
        const success = node('div', 'success-check', '✓'); success.setAttribute('aria-hidden', 'true');
        card.replaceChildren(brand(), success, title, node('p', 'intro', 'Trust your edge. Good luck.'));
        card.setAttribute('role', 'status'); dialog.focus();
        setTimeout(() => {
          if (!host || current !== generation) return;
          dialog.classList.add('leaving');
          setTimeout(() => { if (current === generation) release(); }, matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 300);
        }, 700);
      } catch (error) { clearTimeout(timeout); if (host && current === generation) renderError(error.message); }
    }
  }
  async function check({ initial = false } = {}) {
    const current = ++generation;
    if (initial) mount();
    clearTimeout(watchdog);
    watchdog = setTimeout(() => { if (current === generation && host) renderError(); }, 6000);
    try {
      const response = await chrome.runtime.sendMessage({ type: 'GET_GATE', sessionGateConfirmed });
      if (current !== generation) return;
      clearTimeout(watchdog);
      if (!response?.ok) throw new Error();
      if (!response.show) return release();
      if (sessionBypassed) return release();
      if (response.error) return renderError(response.error);
      if (!host || initial) renderRules(response.rules);
    } catch { if (current === generation) renderError(); }
  }
  chrome.runtime.onMessage.addListener((message, sender, respond) => {
    if (sender.id !== chrome.runtime.id) return;
    if (message.type === 'HAKI_STATUS') respond({ active: !!host, documentToken });
    if (message.type === 'HAKI_RECHECK') { respond({ ok: true }); if (!busy) void check(); }
    if (message.type === 'HAKI_SHOW') {
      generation++; sessionBypassed = false; sessionGateConfirmed = false;
      if (message.error) renderError(message.error); else renderRules(message.rules);
      respond({ ok: true });
    }
    if (message.type === 'HAKI_BYPASS') {
      if (message.documentToken !== documentToken) return respond({ ok: false });
      sessionBypassed = true; release(); respond({ ok: true });
    }
  });
  window.addEventListener('pageshow', event => { if (event.persisted) void check(); });
  void check({ initial: true });
})();
