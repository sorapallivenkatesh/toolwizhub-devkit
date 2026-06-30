/* ░░░ tools-encode.js — Base64 / URL / Hex / SHA ░░░ */
import { el, select, field } from './util.js';
import { inputArea, inputLine, copyOut, note } from './devutil.js';

const te = new TextEncoder(), td = new TextDecoder();
const bytesToB64 = (bytes) => { let s = ''; for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]); return btoa(s); };
const b64ToBytes = (b64) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
const toHex = (bytes) => [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
const fromHex = (hex) => { const h = hex.replace(/[^0-9a-f]/gi, ''); const a = new Uint8Array(h.length / 2); for (let i = 0; i < a.length; i++) a[i] = parseInt(h.substr(i * 2, 2), 16); return a; };
async function sha(algo, bytes) { const buf = await crypto.subtle.digest(algo, bytes); return toHex(new Uint8Array(buf)); }

function hashEncodeTool(mount) {
  const input = inputArea('Input text', { placeholder: 'Type or paste text…', rows: 4 });
  const mode = select([{ value: 'encode', label: 'Encode / Hash' }, { value: 'decode', label: 'Decode' }], 'encode');
  const fromSel = select([{ value: 'base64', label: 'Base64' }, { value: 'base64url', label: 'Base64URL' }, { value: 'url', label: 'URL-encoded' }, { value: 'hex', label: 'Hex' }], 'base64');
  const outWrap = el('div', { class: 'dk-outs' });
  let rows = [];

  function buildOutputs() {
    outWrap.innerHTML = ''; rows = [];
    if (mode.value === 'encode') {
      for (const label of ['Base64', 'Base64URL', 'URL-encoded', 'Hex', 'SHA-256', 'SHA-1', 'SHA-512']) {
        const r = copyOut(label, label.startsWith('SHA') || label === 'Base64' ? { area: true, rows: 2 } : {});
        rows.push([label, r]); outWrap.append(r.node);
      }
    } else {
      const r = copyOut('Decoded text', { area: true, rows: 4 });
      rows.push(['decoded', r]); outWrap.append(el('div', { class: 'controls' }, [el('label', { class: 'dk-field' }, [el('span', { class: 'dk-field__label' }, 'Decode from'), fromSel])]), r.node);
    }
  }

  async function compute() {
    const s = input.get();
    if (mode.value === 'encode') {
      const bytes = te.encode(s);
      const map = { Base64: bytesToB64(bytes), 'Base64URL': bytesToB64(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''), 'URL-encoded': encodeURIComponent(s), Hex: toHex(bytes) };
      for (const [label, r] of rows) if (map[label] != null) r.set(map[label]);
      try { for (const a of [['SHA-256', 'SHA-256'], ['SHA-1', 'SHA-1'], ['SHA-512', 'SHA-512']]) { const r = rows.find(([l]) => l === a[0]); if (r) r[1].set(await sha(a[1], bytes)); } } catch (e) {}
    } else {
      const r = rows[0][1];
      try {
        let out = '';
        const v = input.get();
        if (fromSel.value === 'base64') out = td.decode(b64ToBytes(v));
        else if (fromSel.value === 'base64url') out = td.decode(b64ToBytes(v.replace(/-/g, '+').replace(/_/g, '/')));
        else if (fromSel.value === 'url') out = decodeURIComponent(v);
        else out = td.decode(fromHex(v));
        r.set(out);
      } catch (e) { r.set('⚠ invalid input for ' + fromSel.value); }
    }
  }

  input.on(compute); mode.addEventListener('change', () => { buildOutputs(); compute(); }); fromSel.addEventListener('change', compute);
  mount.append(input.node, el('div', { class: 'controls' }, [el('label', { class: 'dk-field' }, [el('span', { class: 'dk-field__label' }, 'Mode'), mode])]), outWrap, note('UTF-8 aware. SHA via the browser’s Web Crypto. Nothing leaves your device.'));
  buildOutputs(); compute();
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
