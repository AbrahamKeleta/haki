// A directly openable preview using the actual new-tab markup, styles and interactions.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { defaultState, EXAMPLE_RULES } from '../shared/constants.js';
import { element, request } from '../shared/utils.js';

const root = new URL('../', import.meta.url);
const read = path => readFile(new URL(path, root), 'utf8');
const [source, script, gate, styles] = await Promise.all([
  read('newtab/newtab.html'), read('newtab/newtab.js'), read('content/gate.css'), read('newtab/newtab.css'),
]);
const state = { ...defaultState(), newTabSettings: { enabled: true }, issues: [],
  rules: EXAMPLE_RULES.map((text, index) => ({ id: String(index), text })) };
const previewScript = `
const previewState = ${JSON.stringify(state)};
const chrome = {
  storage: { local: { get: async () => previewState }, onChanged: { addListener() {} } },
  runtime: { sendMessage: async () => ({ ok: true, state: previewState }) },
  tabs: { getCurrent: async () => ({ id: 1 }), update: async () => { location.href = 'about:blank'; } },
};
${element.toString()}
${request.toString()}
${script.replace(/^import .*;\n/gm, '')}
`;
const html = source
  .replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, '')
  .replace(/<link\b[^>]*>/g, link => link.includes('content/gate.css') ? `<style>${gate}</style>` : link.includes('newtab.css') ? `<style>${styles}</style>` : '')
  .replace('</body>', `<script type="module">${previewScript}</script></body>`);
await mkdir(new URL('dist/', root), { recursive: true });
await writeFile(new URL('dist/newtab-preview.html', root), html);
console.log('Open dist/newtab-preview.html in any browser. No extension installation is needed.');
