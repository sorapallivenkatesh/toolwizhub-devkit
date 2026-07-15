/* ░░░ devutil.js — small shared helpers for DevKit tools ░░░ */
import { el } from './util.js';

// A labelled output row with a copy button.
export function copyOut(label, opts = {}) {
  const val = el(opts.area ? 'textarea' : 'input', {
    class: 'inp dk-out mono', readonly: 'readonly', ...(opts.area ? { rows: String(opts.rows || 3) } : {}),
  });
  const copy = el('button', { class: 'btn btn--sm dk-copy', type: 'button',
    onclick: () => { if (!val.value) return; navigator.clipboard.writeText(val.value); const t = copy.textContent; copy.textContent = '✓ Copied'; setTimeout(() => { copy.textContent = t; }, 1200); } }, 'Copy');
  const node = el('div', { class: 'dk-row' }, [
    el('span', { class: 'dk-row__label' }, label),
    el('div', { class: 'dk-row__val' }, [val, copy]),
  ]);
  return { node, set: (v) => { val.value = v == null ? '' : v; }, el: val };
}

// A big input textarea with a label.
export function inputArea(label, opts = {}) {
  const ta = el('textarea', { class: 'inp mono', rows: String(opts.rows || 5), placeholder: opts.placeholder || '' });
  const node = el('label', { class: 'dk-field' }, [el('span', { class: 'dk-field__label' }, label), ta]);
  return { node, el: ta, get: () => ta.value, set: (v) => { ta.value = v; }, on: (fn) => ta.addEventListener('input', fn) };
}

/** IDE-style editor pane with gutter line numbers. */
export function ideEditor(opts = {}) {
  const gutter = el('pre', { class: 'ide-gutter', 'aria-hidden': 'true' }, '1');
  const ta = el('textarea', {
    class: 'ide-code mono',
    spellcheck: 'false',
    rows: String(opts.rows || 14),
    placeholder: opts.placeholder || '',
    ...(opts.readonly ? { readonly: 'readonly' } : {}),
  });
  const syncGutter = () => {
    const n = Math.max(1, ta.value.split('\n').length);
    let s = '';
    for (let i = 1; i <= n; i++) s += i + (i < n ? '\n' : '');
    gutter.textContent = s;
  };
  const syncScroll = () => { gutter.scrollTop = ta.scrollTop; };
  ta.addEventListener('input', syncGutter);
  ta.addEventListener('scroll', syncScroll);
  const node = el('div', { class: 'ide-editor' }, [gutter, ta]);
  return {
    node, el: ta,
    get: () => ta.value,
    set: (v) => { ta.value = v == null ? '' : v; syncGutter(); },
    on: (fn) => ta.addEventListener('input', fn),
  };
}

/** Segmented control (Encode / Decode style). Same .value + change API as select(). */
export function segment(options, value) {
  let cur = value != null ? value : (options[0] && options[0].value);
  const wrap = el('div', { class: 'ide-seg', role: 'tablist' });
  const sync = () => {
    [...wrap.children].forEach((b) => b.classList.toggle('is-active', b.dataset.value === String(cur)));
  };
  options.forEach((o) => {
    const b = el('button', { type: 'button', class: 'ide-seg__btn', role: 'tab', 'data-value': o.value }, o.label);
    b.addEventListener('click', () => {
      if (String(cur) === String(o.value)) return;
      cur = o.value; sync();
      wrap.dispatchEvent(new Event('change', { bubbles: true }));
    });
    wrap.append(b);
  });
  Object.defineProperty(wrap, 'value', { configurable: true, get: () => cur, set: (v) => { cur = v; sync(); } });
  sync();
  return wrap;
}

export function inputLine(label, opts = {}) {
  const inp = el('input', { class: 'inp mono', type: opts.type || 'text', placeholder: opts.placeholder || '', ...(opts.value != null ? { value: opts.value } : {}) });
  const node = el('label', { class: 'dk-field' }, [el('span', { class: 'dk-field__label' }, label), inp]);
  return { node, el: inp, get: () => inp.value, set: (v) => { inp.value = v; }, on: (fn) => inp.addEventListener('input', fn) };
}

export function note(msg, kind = '') { return el('p', { class: 'dk-note ' + kind }, msg); }
export function section(title) { return el('h3', { class: 'dk-section' }, title); }
