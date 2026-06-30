/* ░░░ util.js — shared helpers for MediaKit tools ░░░
 * Everything runs locally; these are DOM + file plumbing helpers.
 */

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

export function el(tag, attrs = {}, children = []) {
  const n = document.createElement(tag);
  for (const k in attrs) {
    if (k === 'class') n.className = attrs[k];
    else if (k === 'html') n.innerHTML = attrs[k];
    else if (k.startsWith('on') && typeof attrs[k] === 'function') n.addEventListener(k.slice(2), attrs[k]);
    else if (attrs[k] != null) n.setAttribute(k, attrs[k]);
  }
  for (const c of [].concat(children)) if (c != null) n.append(c.nodeType ? c : document.createTextNode(c));
  return n;
}

export function humanSize(bytes) {
  if (!bytes) return '0 B';
  const u = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i ? 1 : 0)} ${u[i]}`;
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = el('a', { href: url, download: filename });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export const stripExt = (name) => name.replace(/\.[^.]+$/, '');
export const readArrayBuffer = (file) => file.arrayBuffer();

/**
 * Build a drag-and-drop + click-to-pick zone.
 * @param {object} opts { accept, multiple, label, onFiles(File[]) }
 * @returns the zone element
 */
export function dropzone({ accept = '*/*', multiple = false, label = 'Drop a file or click to choose', onFiles }) {
  const input = el('input', { type: 'file', accept, ...(multiple ? { multiple: 'multiple' } : {}), style: 'display:none' });
  const zone = el('div', { class: 'dz', tabindex: '0', role: 'button' }, [
    el('div', { class: 'dz__icon', html: '⬆' }),
    el('div', { class: 'dz__label' }, label),
    el('div', { class: 'dz__hint' }, accept.replace(/\//g, ' ').replace(/,/g, ', ')),
    input,
  ]);
  const fire = (files) => { const arr = [...files]; if (arr.length) onFiles(multiple ? arr : [arr[0]]); };
  zone.addEventListener('click', () => input.click());
  zone.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); input.click(); } });
  input.addEventListener('change', () => fire(input.files));
  zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('is-over'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('is-over'));
  zone.addEventListener('drop', (e) => { e.preventDefault(); zone.classList.remove('is-over'); fire(e.dataTransfer.files); });
  return zone;
}

// A labelled control row (label + control element).
export function field(labelText, control, hint) {
  return el('label', { class: 'ctl' }, [
    el('span', { class: 'ctl__label' }, labelText),
    control,
    hint ? el('span', { class: 'ctl__hint' }, hint) : null,
  ]);
}

export function button(text, opts = {}) {
  return el('button', { class: `btn ${opts.primary ? 'btn--primary' : ''}`, type: 'button', ...(opts.onclick ? { onclick: opts.onclick } : {}) }, text);
}

function closeAllSelects(except) {
  document.querySelectorAll('.csel.is-open').forEach((w) => { if (w !== except) { w.classList.remove('is-open'); const m = w.querySelector('.csel__menu'); if (m) m.hidden = true; } });
}
document.addEventListener('click', () => closeAllSelects(null));

/* Custom glass dropdown. Same surface as a native <select>: read/write `.value`
 * and listen for 'change'. Drop-in replacement so every tool upgrades at once. */
export function select(options, value) {
  let cur = value != null ? value : (options[0] && options[0].value);
  let active = -1;
  const label = el('span', { class: 'csel__label' });
  const chev = el('span', { class: 'csel__chev' });
  const btn = el('button', { type: 'button', class: 'csel__btn' }, [label, chev]);
  const menu = el('ul', { class: 'csel__menu', role: 'listbox', hidden: 'hidden' });
  const wrap = el('div', { class: 'csel' }, [btn, menu]);
  const opts = [];

  const sync = () => {
    const o = options.find((x) => String(x.value) === String(cur));
    label.textContent = o ? o.label : '';
    opts.forEach((li, i) => { li.classList.toggle('is-sel', String(li.dataset.value) === String(cur)); li.classList.toggle('is-active', i === active); });
  };
  const choose = (v) => { cur = v; sync(); close(); wrap.dispatchEvent(new Event('change', { bubbles: true })); };
  const open = () => { closeAllSelects(wrap); menu.hidden = false; wrap.classList.add('is-open'); active = Math.max(0, options.findIndex((x) => String(x.value) === String(cur))); sync(); };
  const close = () => { menu.hidden = true; wrap.classList.remove('is-open'); };

  options.forEach((o) => {
    const li = el('li', { class: 'csel__opt', role: 'option', 'data-value': o.value }, o.label);
    li.addEventListener('click', (e) => { e.stopPropagation(); choose(o.value); });
    li.addEventListener('mousemove', () => { active = opts.indexOf(li); sync(); });
    opts.push(li); menu.append(li);
  });

  btn.addEventListener('click', (e) => { e.stopPropagation(); if (menu.hidden) open(); else close(); });
  wrap.addEventListener('keydown', (e) => {
    if (menu.hidden && (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown')) { e.preventDefault(); open(); return; }
    if (menu.hidden) return;
    if (e.key === 'Escape') { close(); btn.focus(); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); active = Math.min(active + 1, options.length - 1); sync(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); active = Math.max(active - 1, 0); sync(); }
    else if (e.key === 'Enter') { e.preventDefault(); if (options[active]) choose(options[active].value); }
  });

  Object.defineProperty(wrap, 'value', { configurable: true, get: () => cur, set: (v) => { cur = v; sync(); } });
  sync();
  return wrap;
}

// Status / progress line a tool can update.
export function statusLine() {
  const bar = el('span', { class: 'status__bar' });
  const barWrap = el('span', { class: 'status__track', style: 'display:none' }, [bar]);
  const text = el('span', { class: 'status__text' });
  const node = el('div', { class: 'status' }, [text, barWrap]);
  return {
    node,
    set(msg) { text.textContent = msg || ''; },
    progress(p) { barWrap.style.display = p == null ? 'none' : 'inline-block'; if (p != null) bar.style.width = `${Math.round(p * 100)}%`; },
    error(msg) { text.textContent = msg; node.classList.add('is-err'); },
    clear() { text.textContent = ''; node.classList.remove('is-err'); barWrap.style.display = 'none'; },
  };
}

/* Result area: shows a PREVIEW (image / audio / video / file) and a Download
 * button — the output is never auto-downloaded, only after the user clicks.
 * `showMany` handles batch output with per-file + "Download all". */
export function resultArea() {
  const node = el('div', { class: 'result', hidden: 'hidden' });
  const previewFor = (blob, filename, url) => {
    if (blob.type.startsWith('image/') && blob.type !== 'image/x-icon') return el('img', { class: 'result__img', src: url });
    if (blob.type.startsWith('audio/')) return el('audio', { class: 'result__media', controls: 'controls', src: url });
    if (blob.type.startsWith('video/')) return el('video', { class: 'result__media', controls: 'controls', src: url });
    return el('div', { class: 'result__file' }, '📄 ' + filename);
  };
  return {
    node,
    show(blob, filename) {
      node.hidden = false; node.innerHTML = '';
      const url = URL.createObjectURL(blob);
      node.append(
        el('div', { class: 'result__head' }, '✓ Preview'),
        previewFor(blob, filename, url),
        el('div', { class: 'result__meta' }, `${filename} · ${humanSize(blob.size)}`),
        button('⬇ Download', { primary: true, onclick: () => downloadBlob(blob, filename) }),
      );
    },
    showMany(items) {
      node.hidden = false; node.innerHTML = '';
      node.append(el('div', { class: 'result__head' }, `✓ ${items.length} file(s) ready`));
      const list = el('div', { class: 'file-list' });
      items.forEach((it) => list.append(el('div', { class: 'file-row' }, [
        el('span', { class: 'file-row__name' }, it.name),
        el('span', { class: 'file-row__meta' }, humanSize(it.blob.size)),
        button('⬇', { onclick: () => downloadBlob(it.blob, it.name) }),
      ])));
      node.append(list, button(`⬇ Download all (${items.length})`, { primary: true, onclick: () => items.forEach((it, i) => setTimeout(() => downloadBlob(it.blob, it.name), i * 250)) }));
    },
    clear() { node.hidden = true; node.innerHTML = ''; },
  };
}

// Load a classic (non-module) script once, resolving when ready.
const loaded = {};
export function loadScript(src) {
  if (loaded[src]) return loaded[src];
  loaded[src] = new Promise((resolve, reject) => {
    const s = el('script', { src });
    s.onload = resolve;
    s.onerror = () => reject(new Error('Failed to load ' + src));
    document.head.append(s);
  });
  return loaded[src];
}
