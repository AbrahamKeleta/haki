// A directly openable visual preview, generated from the actual extension markup.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { EXAMPLE_RULES } from '../shared/constants.js';

const root = new URL('../', import.meta.url);
const read = path => readFile(new URL(path, root), 'utf8');
const [source, theme, styles, icon] = await Promise.all([
  read('newtab/newtab.html'), read('shared/theme.css'), read('newtab/newtab.css'),
  readFile(new URL('assets/icon48.png', root)),
]);
const escape = value => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const rules = EXAMPLE_RULES.map((text, index) => `<div class="reminder"><span class="reminder-circle">${String(index + 1).padStart(2, '0')}</span><span class="reminder-text">${escape(text)}</span></div>`).join('');
let html = source
  .replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, '')
  .replace(/<link\b[^>]*>/g, '')
  .replace('</head>', `<style>${theme}\n${styles}</style></head>`)
  .replace('<div id="app" hidden>', '<div id="app">')
  .replace('<div id="rules-list"></div>', `<div id="rules-list">${rules}</div>`)
  .replace(/<button id="edit"[\s\S]*?<\/button>/, '')
  .replace(/<dialog\b[\s\S]*?<\/dialog>/, '')
  .replace(/<a\b[^>]*class="brand"[^>]*>([\s\S]*?)<\/a>/, '<span class="brand">$1</span>')
  .replace(/<a\b[^>]*class="settings-link"[^>]*>[\s\S]*?<\/a>/, '<span class="settings-link">DESIGN PREVIEW</span>')
  .replace('src="../assets/icon48.png"', `src="data:image/png;base64,${icon.toString('base64')}"`);
await mkdir(new URL('dist/', root), { recursive: true });
await writeFile(new URL('dist/newtab-preview.html', root), html);
console.log('Open dist/newtab-preview.html in any browser. No extension installation is needed.');
