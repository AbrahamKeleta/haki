document.querySelector('#copy-address')?.addEventListener('click', async () => {
  const status = document.querySelector('#copy-status');
  try { await navigator.clipboard.writeText('chrome://extensions'); status.textContent = 'Copied'; }
  catch { status.textContent = 'Type chrome://extensions in the address bar.'; }
});

const carousel = document.querySelector('[data-platform-carousel]');
if (carousel) {
  const track = carousel.querySelector('.platform-track');
  const group = carousel.querySelector('.platform-group');
  const duplicate = group.cloneNode(true);
  duplicate.setAttribute('aria-hidden', 'true');
  duplicate.classList.add('platform-group-copy');
  track.append(duplicate);
  const control = carousel.querySelector('.platform-motion');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  let paused = false;
  function updateMotion() {
    carousel.classList.toggle('is-animated', !motion.matches);
    carousel.dataset.paused = String(paused);
    control.hidden = motion.matches;
    control.textContent = paused ? 'Resume' : 'Pause';
    control.setAttribute('aria-label', `${paused ? 'Resume' : 'Pause'} platform scrolling`);
    control.setAttribute('aria-pressed', String(paused));
  }
  control.addEventListener('click', () => { paused = !paused; updateMotion(); });
  motion.addEventListener('change', updateMotion);
  updateMotion();
}
