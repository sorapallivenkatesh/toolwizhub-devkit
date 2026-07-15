/* ░░░ main.js — DevKit controller (IDE dual-pane shell) ░░░ */
import { $, el } from './util.js';
import { setStatus } from './status.js';
import encodeMod from './tools-encode.js';
import tokensMod from './tools-tokens.js';
import timeMod from './tools-time.js';
import textMod from './tools-text.js';
import convertMod from './tools-convert.js';

const MODULES = [encodeMod, tokensMod, timeMod, textMod, convertMod];
const TOOLS = MODULES.flatMap((m) => m.tools.map((t) => ({ ...t, group: m.group })));
const GROUPS = MODULES.map((m) => m.group);
const findTool = (id) => TOOLS.find((t) => t.id === id) || TOOLS[0];

let activeGroup = GROUPS[0];
let cmdkIndex = 0;
let cmdkResults = TOOLS;

function dismissSplash() {
  const splash = $('#splash');
  if (!splash) return;
  setTimeout(() => { splash.classList.add('is-hiding'); try { sessionStorage.setItem('devkit:splashed', '1'); } catch (e) {} }, 900);
  splash.addEventListener('click', () => splash.classList.add('is-hiding'));
}

function buildCats() {
  const wrap = $('#cat-tabs');
  wrap.innerHTML = '';
  for (const g of GROUPS) {
    const btn = el('button', { type: 'button', class: 'ide-cat', 'data-group': g }, g.toUpperCase());
    btn.addEventListener('click', () => {
      activeGroup = g;
      buildChips(g);
      const first = TOOLS.find((t) => t.group === g);
      if (first) selectTool(first.id);
    });
    wrap.append(btn);
  }
}

function buildChips(group) {
  const wrap = $('#tool-chips');
  wrap.innerHTML = '';
  TOOLS.filter((t) => t.group === group).forEach((t) => {
    wrap.append(el('a', { class: 'ide-chip', href: `#${t.id}`, 'data-id': t.id }, t.label));
  });
  document.querySelectorAll('.ide-cat').forEach((b) => b.classList.toggle('is-active', b.dataset.group === group));
}

function selectTool(id) {
  const tool = findTool(id);
  activeGroup = tool.group;
  buildChips(tool.group);
  document.querySelectorAll('.ide-chip').forEach((a) => a.classList.toggle('is-active', a.dataset.id === tool.id));
  $('#tool-cat').textContent = tool.group;
  $('#tool-title').textContent = tool.label;
  $('#tool-desc').textContent = tool.desc;
  document.title = `${tool.label} — DevKit · ToolWizHub`;
  const md = document.querySelector('meta[name="description"]');
  if (md) md.setAttribute('content', `${tool.label} — ${tool.desc} Free & private, runs in your browser. A ToolWizHub DevKit tool.`);
  const can = document.querySelector('link[rel="canonical"]');
  if (can) can.setAttribute('href', `https://devkit.toolwizhub.com/#${tool.id}`);
  const mount = $('#tool-mount');
  mount.innerHTML = '';
  setStatus({ encoding: 'utf-8', bytes: 0, tool: tool.label, state: 'ready' });
  tool.render(mount);
  if (location.hash !== `#${tool.id}`) history.replaceState(null, '', `#${tool.id}`);
}

function route() {
  const id = location.hash.replace(/^#/, '');
  selectTool(id || TOOLS[0].id);
}

/* ── Command palette (⌘K) ─────────────────────────────────── */
function openCmdk() {
  const dlg = $('#cmdk');
  dlg.hidden = false;
  $('#cmdk-input').value = '';
  cmdkResults = TOOLS;
  cmdkIndex = 0;
  renderCmdk();
  requestAnimationFrame(() => $('#cmdk-input').focus());
}

function closeCmdk() {
  $('#cmdk').hidden = true;
}

function renderCmdk() {
  const list = $('#cmdk-list');
  list.innerHTML = '';
  if (!cmdkResults.length) {
    list.append(el('li', { class: 'cmdk__empty' }, 'No tools match'));
    return;
  }
  cmdkResults.forEach((t, i) => {
    const li = el('li', {
      class: 'cmdk__item' + (i === cmdkIndex ? ' is-active' : ''),
      role: 'option',
      'aria-selected': i === cmdkIndex ? 'true' : 'false',
      'data-id': t.id,
    }, [
      el('span', { class: 'cmdk__item-label' }, t.label),
      el('span', { class: 'cmdk__item-group' }, t.group),
    ]);
    li.addEventListener('mouseenter', () => { cmdkIndex = i; renderCmdk(); });
    li.addEventListener('click', () => { closeCmdk(); selectTool(t.id); });
    list.append(li);
  });
}

function filterCmdk(q) {
  const s = q.trim().toLowerCase();
  cmdkResults = !s ? TOOLS : TOOLS.filter((t) =>
    t.label.toLowerCase().includes(s) || t.group.toLowerCase().includes(s) || t.desc.toLowerCase().includes(s) || t.id.includes(s));
  cmdkIndex = 0;
  renderCmdk();
}

function initCmdk() {
  $('#cmdk-open').addEventListener('click', openCmdk);
  $('#cmdk').querySelector('[data-cmdk-close]').addEventListener('click', closeCmdk);
  $('#cmdk-input').addEventListener('input', (e) => filterCmdk(e.target.value));
  $('#cmdk-input').addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); cmdkIndex = Math.min(cmdkIndex + 1, Math.max(0, cmdkResults.length - 1)); renderCmdk(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); cmdkIndex = Math.max(cmdkIndex - 1, 0); renderCmdk(); }
    else if (e.key === 'Enter' && cmdkResults[cmdkIndex]) { e.preventDefault(); closeCmdk(); selectTool(cmdkResults[cmdkIndex].id); }
    else if (e.key === 'Escape') { e.preventDefault(); closeCmdk(); }
  });
  window.addEventListener('keydown', (e) => {
    const isMac = /Mac|iPhone|iPad/.test(navigator.platform || '');
    if ((isMac ? e.metaKey : e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      if ($('#cmdk').hidden) openCmdk(); else closeCmdk();
    }
    if (e.key === 'Escape' && !$('#cmdk').hidden) closeCmdk();
  });
}

function init() {
  dismissSplash();
  buildCats();
  initCmdk();
  window.addEventListener('hashchange', route);
  route();
  if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}

document.addEventListener('DOMContentLoaded', init);
