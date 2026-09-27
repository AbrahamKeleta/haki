export function normalizeHostname(input, { development = false } = {}) {
  if (typeof input !== 'string' || !input.trim()) throw new Error('Enter a trading website.');
  const value = input.trim();
  if (/[\s\\*]/u.test(value)) throw new Error('Enter a valid hostname or HTTPS URL.');
  let url;
  try { url = new URL(value.includes('://') ? value : `https://${value}`); }
  catch { throw new Error('Enter a valid hostname or HTTPS URL.'); }
  if (url.protocol !== 'https:' || url.username || url.password || url.port) {
    throw new Error('Use an HTTPS website without a username, password or custom port.');
  }
  const hostname = url.hostname.toLowerCase().replace(/\.$/, '');
  if (development && hostname === 'localhost') return hostname;
  const labels = hostname.split('.');
  if (hostname.length > 253 || labels.length < 2 ||
      labels.some(label => !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label)) ||
      !/^(?:[a-z]{2,63}|xn--[a-z0-9-]+)$/.test(labels.at(-1)) ||
      /(?:^|\.)(localhost|local|internal|test|invalid|onion)$/.test(hostname)) {
    throw new Error('Use a public trading hostname, such as app.examplebroker.com.');
  }
  return hostname;
}

export function originPattern(hostname) {
  return `https://${normalizeHostname(hostname)}/*`;
}

export function protectedPlatform(platforms, url) {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:') return null;
    return platforms.find(p => p.enabled && p.hostname === parsed.hostname) || null;
  } catch { return null; }
}
