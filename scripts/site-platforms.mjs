import { readFile, writeFile } from 'node:fs/promises';
import { BUILT_IN_PLATFORMS } from '../shared/constants.js';

const escapeHTML = value => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
export const PLATFORM_MARKUP = [
  '<!-- HAKI_PLATFORMS_START -->',
  ...BUILT_IN_PLATFORMS.map(p => `          <li data-platform="${escapeHTML(p.id)}">${escapeHTML(p.name)}</li>`),
  '          <li class="custom-platform">+ Your website</li>',
  '          <!-- HAKI_PLATFORMS_END -->',
].join('\n');

if (process.argv.includes('--write')) {
  const path = new URL('../website/index.html', import.meta.url);
  const html = await readFile(path, 'utf8');
  const section = /<!-- HAKI_PLATFORMS_START -->[\s\S]*?<!-- HAKI_PLATFORMS_END -->/;
  if (!section.test(html)) throw new Error('Landing page platform markers are missing.');
  await writeFile(path, html.replace(section, PLATFORM_MARKUP));
  console.log(`Synced ${BUILT_IN_PLATFORMS.length} landing-page platforms from the extension catalog.`);
}
