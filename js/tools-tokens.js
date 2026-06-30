/* ░░░ tools-tokens.js — UUID/ULID/token · Password · JWT ░░░ */
import { el, select, button, field } from './util.js';
import { inputArea, inputLine, copyOut, note, section } from './devutil.js';

const td = new TextDecoder(); const te = new TextEncoder();
const toHex = (b) => [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
const b64urlToBytes = (s) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(s.length / 4) * 4, '=')), (c) => c.charCodeAt(0));
const b64urlToText = (s) => td.decode(b64urlToBytes(s));
const pemToBuf = (pem) => Uint8Array.from(atob(pem.replace(/-----[^-]+-----/g, '').replace(/\s+/g, '')), (c) => c.charCodeAt(0)).buffer;

/* ── Generators ────────────────────────────────────────────── */
const ULID_ENC = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
function ulid(now) {
  let t = now, time = '';
  for (let i = 0; i < 10; i++) { time = ULID_ENC[t % 32] + time; t = Math.floor(t / 32); }
  const b = crypto.getRandomValues(new Uint8Array(16));
  let r = ''; for (let i = 0; i < 16; i++) r += ULID_ENC[b[i] % 32];
  return time + r;
}
function genTool(mount) {
  const type = select([{ value: 'uuid', label: 'UUID v4' }, { value: 'ulid', label: 'ULID' }, { value: 'hex', label: 'Random hex token' }, { value: 'b64', label: 'Random base64url token' }], 'uuid');
  const count = select([{ value: '1', label: '1' }, { value: '5', label: '5' }, { value: '10', label: '10' }, { value: '25', label: '25' }], '5');
  const bytes = inputLine('Token bytes', { type: 'number', value: '16' });
  const out = copyOut('Generated', { area: true, rows: 6 });
  function gen() {
    const n = +count.value, lines = [];
    for (let i = 0; i < n; i++) {
      if (type.value === 'uuid') lines.push(crypto.randomUUID());
      else if (type.value === 'ulid') lines.push(ulid(Date.now()));
      else { const b = crypto.getRandomValues(new Uint8Array(Math.max(1, +bytes.value || 16))); lines.push(type.value === 'hex' ? toHex(b) : btoa(String.fromCharCode(...b)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')); }
    }
    out.set(lines.join('\n'));
  }
  type.addEventListener('change', gen); count.addEventListener('change', gen); bytes.on(gen);
  mount.append(el('div', { class: 'controls' }, [field('Type', type), field('Count', count), bytes.node]),
    el('div', { class: 'actions' }, [button('↻ Generate', { primary: true, onclick: gen })]), out.node,
    note('Cryptographically random via crypto.getRandomValues / randomUUID.'));
  gen();
}

/* ── Password ──────────────────────────────────────────────── */
const SETS = { lower: 'abcdefghijklmnopqrstuvwxyz', upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', digit: '0123456789', symbol: '!@#$%^&*()-_=+[]{};:,.<>?' };
function strengthOf(pw) {
  let pool = 0;
  if (/[a-z]/.test(pw)) pool += 26; if (/[A-Z]/.test(pw)) pool += 26; if (/[0-9]/.test(pw)) pool += 10; if (/[^a-zA-Z0-9]/.test(pw)) pool += 32;
  const bits = pw ? Math.round(pw.length * Math.log2(pool || 1)) : 0;
  const label = bits < 40 ? 'Weak' : bits < 60 ? 'Fair' : bits < 80 ? 'Strong' : 'Excellent';
  const pct = Math.min(100, Math.round(bits / 128 * 100));
  return { bits, label, pct };
}
function bar() {
  const fill = el('span', {}); const track = el('div', { class: 'dk-bar' }, [fill]); const txt = el('span', { class: 'dk-bar__txt' });
  return { node: el('div', { class: 'dk-bar-row' }, [track, txt]), set(s) { fill.style.width = s.pct + '%'; fill.className = 'lvl-' + s.label.toLowerCase(); txt.textContent = `${s.label} · ${s.bits} bits`; } };
}
function passwordTool(mount) {
  const len = el('input', { type: 'range', min: '6', max: '64', value: '20', class: 'range' });
  const lenV = el('span', { class: 'ctl__hint' }, '20');
  len.addEventListener('input', () => { lenV.textContent = len.value; gen(); });
  const toggles = {}; const tEls = [];
  for (const [k, lbl] of [['lower', 'a-z'], ['upper', 'A-Z'], ['digit', '0-9'], ['symbol', '!@#']]) { const c = el('input', { type: 'checkbox', ...(k !== 'symbol' ? { checked: 'checked' } : { checked: 'checked' }) }); c.addEventListener('change', gen); toggles[k] = c; tEls.push(field(lbl, c)); }
  const out = copyOut('Password'); const genBar = bar();
  function gen() {
    let pool = ''; for (const k in SETS) if (toggles[k].checked) pool += SETS[k];
    if (!pool) { out.set(''); return; }
    const n = +len.value, arr = crypto.getRandomValues(new Uint32Array(n)); let pw = '';
    for (let i = 0; i < n; i++) pw += pool[arr[i] % pool.length];
    out.set(pw); genBar.set(strengthOf(pw));
  }
  const check = inputLine('Check a password', { placeholder: 'type to score…' });
  const checkBar = bar();
  check.on(() => checkBar.set(strengthOf(check.get())));
  mount.append(section('Generate'),
    el('div', { class: 'controls' }, [field('Length', el('span', { class: 'range-wrap' }, [len, lenV])), ...tEls]),
    el('div', { class: 'actions' }, [button('↻ Generate', { primary: true, onclick: gen })]),
    out.node, genBar.node,
    section('Strength checker'), check.node, checkBar.node,
    note('Entropy = length × log₂(character-pool). A rough guide, not a guarantee.'));
  checkBar.set(strengthOf('')); gen();
}

/* ── JWT Inspector ─────────────────────────────────────────── */
function jwtTool(mount) {
  const input = inputArea('JWT', { placeholder: 'eyJhbGciOiJIUzI1Ni␣…', rows: 4 });
  const header = copyOut('Header', { area: true, rows: 4 });
  const payload = copyOut('Payload', { area: true, rows: 8 });
  const summary = el('div', { class: 'dk-summary' });
  let current = null;
  function fmtTime(sec) { const d = new Date(sec * 1000); return d.toUTCString() + ` (${d.toLocaleString()})`; }
  function inspect() {
    summary.innerHTML = ''; header.set(''); payload.set(''); current = null; vres('');
    const tok = input.get().trim();
    if (!tok) return;
    const parts = tok.split('.');
    if (parts.length < 2) { summary.append(note('⚠ Not a JWT (needs header.payload.signature).', 'is-err')); return; }
    let h, p;
    try { h = JSON.parse(b64urlToText(parts[0])); header.set(JSON.stringify(h, null, 2)); } catch (e) { summary.append(note('⚠ Could not decode header.', 'is-err')); return; }
    try { p = JSON.parse(b64urlToText(parts[1])); payload.set(JSON.stringify(p, null, 2)); } catch (e) { summary.append(note('⚠ Could not decode payload.', 'is-err')); return; }
    current = { parts, alg: h.alg };
    keyLabel.textContent = String(h.alg || '').toUpperCase().startsWith('HS') ? 'Secret (for HMAC)' : 'Public key (PEM, for RSA/EC)';
    const chips = [];
    const alg = h.alg || '?';
    chips.push(el('span', { class: 'dk-chip' }, `alg: ${alg}`));
    if (h.typ) chips.push(el('span', { class: 'dk-chip' }, `typ: ${h.typ}`));
    if (String(alg).toLowerCase() === 'none') chips.push(el('span', { class: 'dk-chip is-bad' }, '⚠ alg "none" — unsigned!'));
    const now = Math.floor(Date.now() / 1000);
    if (p.exp) { const exp = +p.exp; chips.push(el('span', { class: 'dk-chip ' + (exp < now ? 'is-bad' : 'is-ok') }, exp < now ? `⚠ expired ${fmtTime(exp)}` : `expires ${fmtTime(exp)}`)); }
    if (p.iat) chips.push(el('span', { class: 'dk-chip' }, `issued ${fmtTime(+p.iat)}`));
    if (p.nbf) chips.push(el('span', { class: 'dk-chip ' + (+p.nbf > now ? 'is-bad' : '') }, `not before ${fmtTime(+p.nbf)}`));
    summary.append(el('div', { class: 'dk-chips' }, chips), note('Signature is not verified (that needs the secret/public key). Decoding only — never paste production secrets.'));
  }
  // Verify section
  const keyInput = inputArea('Key', { rows: 3, placeholder: 'HMAC secret, or -----BEGIN PUBLIC KEY----- PEM' });
  const keyLabel = keyInput.node.querySelector('.dk-field__label');
  const resultEl = el('div', { class: 'dk-chips' });
  const vres = (msg, cls) => { resultEl.innerHTML = msg ? `<span class="dk-chip ${cls || ''}">${msg}</span>` : ''; };
  async function verify() {
    if (!current) { vres('Paste a valid JWT first.', 'is-bad'); return; }
    const { parts, alg } = current; const a = String(alg || '').toUpperCase();
    const data = te.encode(parts[0] + '.' + parts[1]); const sig = b64urlToBytes(parts[2] || '');
    try {
      let ok;
      if (a.startsWith('HS')) { const k = await crypto.subtle.importKey('raw', te.encode(keyInput.get()), { name: 'HMAC', hash: 'SHA-' + a.slice(2) }, false, ['verify']); ok = await crypto.subtle.verify('HMAC', k, sig, data); }
      else if (a.startsWith('RS')) { const k = await crypto.subtle.importKey('spki', pemToBuf(keyInput.get()), { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-' + a.slice(2) }, false, ['verify']); ok = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', k, sig, data); }
      else if (a === 'ES256') { const k = await crypto.subtle.importKey('spki', pemToBuf(keyInput.get()), { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']); ok = await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, k, sig, data); }
      else { vres('Verification not supported for alg "' + alg + '".', 'is-bad'); return; }
      vres(ok ? '✓ Signature valid' : '✗ Signature INVALID', ok ? 'is-ok' : 'is-bad');
    } catch (e) { vres('⚠ ' + (e.message || e), 'is-bad'); }
  }
  input.on(inspect);
  mount.append(input.node, summary, header.node, payload.node,
    section('Verify signature'), keyInput.node,
    el('div', { class: 'actions' }, [button('Verify', { primary: true, onclick: verify })]), resultEl,
    note('HS256/384/512 (secret), RS256/384/512 & ES256 (PEM public key) — verified locally via Web Crypto. Never paste production secrets.'));
  inspect();
}

export default {
  group: 'Tokens',
  tools: [
    { id: 'gen', label: 'UUID / ULID / Token', desc: 'Generate UUIDs, ULIDs and random tokens.', render: genTool },
    { id: 'password', label: 'Password', desc: 'Generate strong passwords and score strength.', render: passwordTool },
    { id: 'jwt', label: 'JWT Inspector', desc: 'Decode header & claims, expiry, and flag weak/none alg.', render: jwtTool },
  ],
};
