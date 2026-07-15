/* ░░░ tools-encode.js — Base64 / URL / Hex / SHA ░░░ */
import { el, select, field } from './util.js';
import { inputArea, inputLine, copyOut, note, ideEditor, segment } from './devutil.js';
import { setStatus } from './status.js';

const te = new TextEncoder(), td = new TextDecoder();
const bytesToB64 = (bytes) => { let s = ''; for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]); return btoa(s); };
const b64ToBytes = (b64) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
const toHex = (bytes) => [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
const fromHex = (hex) => { const h = hex.replace(/[^0-9a-f]/gi, ''); const a = new Uint8Array(h.length / 2); for (let i = 0; i < a.length; i++) a[i] = parseInt(h.substr(i * 2, 2), 16); return a; };
async function sha(algo, bytes) { const buf = await crypto.subtle.digest(algo, bytes); return toHex(new Uint8Array(buf)); }

const ENCODE_TABS = ['Base64', 'Base64URL', 'URL-encoded', 'Hex', 'SHA-256', 'SHA-1', 'SHA-512'];

function hashEncodeTool(mount) {
  const input = ideEditor({ placeholder: 'Type or paste text…', rows: 16 });
  const mode = segment([{ value: 'encode', label: 'Encode / Hash' }, { value: 'decode', label: 'Decode' }], 'encode');
  const fromSel = select([{ value: 'base64', label: 'Base64' }, { value: 'base64url', label: 'Base64URL' }, { value: 'url', label: 'URL-encoded' }, { value: 'hex', label: 'Hex' }], 'base64');

  const out = ideEditor({ readonly: true, rows: 16, placeholder: 'Output appears here…' });
  const tabs = el('div', { class: 'ide-otabs', role: 'tablist' });
  const decodeBar = el('div', { class: 'ide-pane__extra', hidden: 'hidden' }, [
    el('label', { class: 'dk-field' }, [el('span', { class: 'dk-field__label' }, 'Decode from'), fromSel]),
  ]);
  const copyBtn = el('button', { class: 'btn btn--sm', type: 'button' }, 'Copy');
  copyBtn.addEventListener('click', () => {
    if (!out.get()) return;
    navigator.clipboard.writeText(out.get());
    const t = copyBtn.textContent; copyBtn.textContent = '✓ Copied'; setTimeout(() => { copyBtn.textContent = t; }, 1200);
  });

  let results = {};
  let activeTab = 'Base64';

  function buildTabs() {
    tabs.innerHTML = '';
    if (mode.value !== 'encode') {
      decodeBar.hidden = false;
      activeTab = 'Decoded';
      const b = el('button', { type: 'button', class: 'ide-otab is-active', role: 'tab' }, 'Decoded');
      tabs.append(b);
      return;
    }
    decodeBar.hidden = true;
    if (!ENCODE_TABS.includes(activeTab)) activeTab = 'Base64';
    ENCODE_TABS.forEach((label) => {
      const b = el('button', {
        type: 'button',
        class: 'ide-otab' + (label === activeTab ? ' is-active' : ''),
        role: 'tab',
        'data-tab': label,
      }, label.replace('URL-encoded', 'URL').replace('Base64URL', 'B64URL'));
      b.addEventListener('click', () => {
        activeTab = label;
        [...tabs.children].forEach((x) => x.classList.toggle('is-active', x.dataset.tab === label));
        out.set(results[label] || '');
      });
      tabs.append(b);
    });
  }

  async function compute() {
    const s = input.get();
    setStatus({ bytes: te.encode(s).length, state: 'computing' });
    if (mode.value === 'encode') {
      const bytes = te.encode(s);
      results = {
        Base64: bytesToB64(bytes),
        Base64URL: bytesToB64(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''),
        'URL-encoded': encodeURIComponent(s),
        Hex: toHex(bytes),
      };
      try {
        results['SHA-256'] = await sha('SHA-256', bytes);
        results['SHA-1'] = await sha('SHA-1', bytes);
        results['SHA-512'] = await sha('SHA-512', bytes);
      } catch (e) {}
      out.set(results[activeTab] || '');
    } else {
      try {
        let decoded = '';
        if (fromSel.value === 'base64') decoded = td.decode(b64ToBytes(s));
        else if (fromSel.value === 'base64url') decoded = td.decode(b64ToBytes(s.replace(/-/g, '+').replace(/_/g, '/')));
        else if (fromSel.value === 'url') decoded = decodeURIComponent(s);
        else decoded = td.decode(fromHex(s));
        results = { Decoded: decoded };
        out.set(decoded);
      } catch (e) {
        results = { Decoded: '⚠ invalid input for ' + fromSel.value };
        out.set(results.Decoded);
      }
    }
    setStatus({ bytes: te.encode(s).length, state: 'ready' });
  }

  mode.addEventListener('change', () => { buildTabs(); compute(); });
  fromSel.addEventListener('change', compute);
  input.on(compute);

  const left = el('div', { class: 'ide-pane' }, [
    el('div', { class: 'ide-pane__bar' }, [
      el('span', { class: 'ide-pane__title' }, 'INPUT'),
      mode,
    ]),
    input.node,
  ]);
  const right = el('div', { class: 'ide-pane' }, [
    el('div', { class: 'ide-pane__bar' }, [
      el('span', { class: 'ide-pane__title' }, 'OUTPUT'),
      tabs,
      copyBtn,
    ]),
    decodeBar,
    out.node,
  ]);

  mount.append(
    el('div', { class: 'ide-split' }, [left, right]),
    note('UTF-8 aware. SHA via the browser’s Web Crypto. Nothing leaves your device.'),
  );
  buildTabs();
  compute();
}

/* ── HMAC ──────────────────────────────────────────────────── */
function hmacTool(mount) {
  const msg = inputArea('Message', { rows: 4, placeholder: 'Message to authenticate…' });
  const key = inputLine('Secret key');
  const algo = select([{ value: 'SHA-256', label: 'SHA-256' }, { value: 'SHA-1', label: 'SHA-1' }, { value: 'SHA-384', label: 'SHA-384' }, { value: 'SHA-512', label: 'SHA-512' }], 'SHA-256');
  const hex = copyOut('HMAC (hex)', { area: true, rows: 2 });
  const b64 = copyOut('HMAC (base64)', { area: true, rows: 2 });
  async function run() {
    if (!key.get()) { hex.set(''); b64.set(''); return; }
    try {
      const ck = await crypto.subtle.importKey('raw', te.encode(key.get()), { name: 'HMAC', hash: algo.value }, false, ['sign']);
      const sig = new Uint8Array(await crypto.subtle.sign('HMAC', ck, te.encode(msg.get())));
      hex.set(toHex(sig)); b64.set(bytesToB64(sig));
    } catch (e) { hex.set('⚠ ' + e.message); }
  }
  msg.on(run); key.on(run); algo.addEventListener('change', run);
  mount.append(msg.node, el('div', { class: 'controls' }, [key.node, el('label', { class: 'dk-field' }, [el('span', { class: 'dk-field__label' }, 'Algorithm'), algo])]), hex.node, b64.node, note('HMAC via Web Crypto. Keys never leave your device.'));
  run();
}

/* ── HTML entities ─────────────────────────────────────────── */
function entitiesTool(mount) {
  const input = inputArea('Input', { rows: 5, placeholder: '<a href="x">Tom & Jerry</a>' });
  const mode = select([{ value: 'encode', label: 'Encode (text → entities)' }, { value: 'decode', label: 'Decode (entities → text)' }], 'encode');
  const all = el('input', { type: 'checkbox' });
  const out = copyOut('Output', { area: true, rows: 5 });
  function run() {
    const s = input.get();
    if (mode.value === 'encode') {
      let r = s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
      if (all.checked) r = r.replace(/[ -￿]/g, (c) => `&#${c.codePointAt(0)};`);
      out.set(r);
    } else {
      const doc = new DOMParser().parseFromString(s, 'text/html');
      out.set(doc.documentElement.textContent);
    }
  }
  input.on(run); mode.addEventListener('change', run); all.addEventListener('change', run);
  mount.append(input.node, el('div', { class: 'controls' }, [el('label', { class: 'dk-field' }, [el('span', { class: 'dk-field__label' }, 'Mode'), mode]), field('Encode all non-ASCII', all)]), out.node);
  run();
}

export default {
  group: 'Encode',
  tools: [
    { id: 'hash', label: 'Hash & Encode', desc: 'Base64 · Base64URL · URL · Hex · SHA-1/256/512 — encode, decode and hash.', render: hashEncodeTool },
    { id: 'hmac', label: 'HMAC', desc: 'Keyed hash (HMAC-SHA) in hex and base64.', render: hmacTool },
    { id: 'entities', label: 'HTML Entities', desc: 'Encode & decode HTML entities.', render: entitiesTool },
  ],
};
