document.querySelector('#copy-address')?.addEventListener('click', async () => {
  const status = document.querySelector('#copy-status');
  try { await navigator.clipboard.writeText('chrome://extensions'); status.textContent = 'Copied'; }
  catch { status.textContent = 'Type chrome://extensions in the address bar.'; }
});
