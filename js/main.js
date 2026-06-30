/* ░░░ main.js — DevKit controller (flat grouped-pill nav) ░░░ */
import { $, el } from './util.js';
import encodeMod from './tools-encode.js';
import tokensMod from './tools-tokens.js';
import timeMod from './tools-time.js';
import textMod from './tools-text.js';
import convertMod from './tools-convert.js';

const MODULES = [encodeMod, tokensMod, timeMod, textMod, convertMod];
const TOOLS = MODULES.flatMap((m) => m.tools.map((t) => ({ ...t, group: m.group })));
const findTool = (id) => TOOLS.find((t) => t.id === id) || TOOLS[0];

function dismissSplash() {
  const splash = $('#splash');
  if (!splash) return;
  setTimeout(() => { splash.classList.add('is-hiding'); try { sessionStorage.setItem('devkit:splashed', '1'); } catch (e) {} }, 900);
  splash.addEventListener('click', () => splash.classList.add('is-hiding'));
}

function buildPills() {
  const wrap = $('#tool-pills');
  wrap.innerHTML = '';
  let lastGroup = null;
  for (const t of TOOLS) {
    if (t.group !== lastGroup) { wrap.append(el('span', { class: 'pill-group' }, t.group)); lastGroup = t.group; }
    wrap.append(el('a', { class: 'pill', href: `#${t.id}`, 'data-id': t.id }, t.label));
  }
}

function selectTool(id) {
  const tool = findTool(id);
  document.querySelectorAll('.pill').forEach((a) => a.classList.toggle('is-active', a.dataset.id === tool.id));
  $('#tool-cat').textContent = tool.group;
  $('#tool-title').textContent = tool.label;
  $('#tool-desc').textContent = tool.desc;
  // Per-tool title + meta description for deep links / SEO.
  document.title = `${tool.label} — DevKit · ToolWizHub`;
  const md = document.querySelector('meta[name="description"]');
  if (md) md.setAttribute('content', `${tool.label} — ${tool.desc} Free & private, runs in your browser. A ToolWizHub DevKit tool.`);
  const can = document.querySelector('link[rel="canonical"]');
  if (can) can.setAttribute('href', `https://devkit.toolwizhub.com/#${tool.id}`);
  const mount = $('#tool-mount');
  mount.innerHTML = '';
  tool.render(mount);
  if (location.hash !== `#${tool.id}`) history.replaceState(null, '', `#${tool.id}`);
}

function route() {
  const id = location.hash.replace(/^#/, '');
  selectTool(id || TOOLS[0].id);
}

function init() {
  dismissSplash();
  buildPills();
  window.addEventListener('hashchange', route);
  route();
  if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}

document.addEventListener('DOMContentLoaded', init);
