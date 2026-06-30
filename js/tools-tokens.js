/* ░░░ tools-tokens.js — UUID/ULID/token · Password · JWT ░░░ */
import { el, select, button, field } from './util.js';
import { inputArea, inputLine, copyOut, note, section } from './devutil.js';

const td = new TextDecoder();
const toHex = (b) => [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
const b64urlToText = (s) => td.decode(Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(s.length / 4) * 4, '=')), (c) => c.charCodeAt(0)));

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
  function fmtTime(sec) { const d = new Date(sec * 1000); return d.toUTCString() + ` (${d.toLocaleString()})`; }
  function inspect() {
    summary.innerHTML = ''; header.set(''); payload.set('');
    const tok = input.get().trim();
    if (!tok) return;
    const parts = tok.split('.');
    if (parts.length < 2) { summary.append(note('⚠ Not a JWT (needs header.payload.signature).', 'is-err')); return; }
    let h, p;
    try { h = JSON.parse(b64urlToText(parts[0])); header.set(JSON.stringify(h, null, 2)); } catch (e) { summary.append(note('⚠ Could not decode header.', 'is-err')); return; }
    try { p = JSON.parse(b64urlToText(parts[1])); payload.set(JSON.stringify(p, null, 2)); } catch (e) { summary.append(note('⚠ Could not decode payload.', 'is-err')); return; }
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
  input.on(inspect);
  mount.append(input.node, summary, header.node, payload.node);
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
