/* ░░░ tools-text.js — Regex tester · Case converter · Text diff ░░░ */
import { el } from './util.js';
import { inputArea, inputLine, copyOut, note, section } from './devutil.js';

const escapeHtml = (s) => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

/* ── Regex tester ──────────────────────────────────────────── */
function regexTool(mount) {
  const pattern = inputLine('Pattern', { placeholder: '\\b\\w+@\\w+\\.\\w+\\b' });
  const flags = inputLine('Flags', { placeholder: 'gim', value: 'g' });
  const test = inputArea('Test string', { rows: 6, placeholder: 'Text to match against…' });
  const status = el('div', { class: 'dk-note' });
  const hl = el('pre', { class: 'dk-hl' });
  const groups = el('div', { class: 'dk-groups' });
  function run() {
    status.className = 'dk-note'; status.textContent = ''; groups.innerHTML = '';
    const pat = pattern.get(); const txt = test.get();
    if (!pat) { hl.innerHTML = escapeHtml(txt); return; }
    let re; const fl = flags.get().includes('g') ? flags.get() : flags.get() + 'g';
    try { re = new RegExp(pat, fl); } catch (e) { status.className = 'dk-note is-err'; status.textContent = '⚠ ' + e.message; hl.innerHTML = escapeHtml(txt); return; }
    let out = '', last = 0, count = 0, m; const found = [];
    while ((m = re.exec(txt)) !== null) {
      out += escapeHtml(txt.slice(last, m.index)) + `<mark>${escapeHtml(m[0]) || '∅'}</mark>`;
      last = m.index + m[0].length; count++; found.push(m);
      if (m.index === re.lastIndex) re.lastIndex++;
      if (count > 5000) break;
    }
    out += escapeHtml(txt.slice(last));
    hl.innerHTML = out || escapeHtml(txt);
    status.textContent = `${count} match${count === 1 ? '' : 'es'}`;
    found.slice(0, 50).forEach((mm, i) => {
      const gr = mm.slice(1).map((g, gi) => `$${gi + 1}=${g ?? ''}`).join('  ');
      groups.append(el('div', { class: 'dk-grp' }, `#${i + 1}  “${mm[0]}”${gr ? '  ·  ' + gr : ''}`));
    });
  }
  [pattern, flags, test].forEach((f) => f.on(run));
  mount.append(el('div', { class: 'controls' }, [pattern.node, flags.node]), test.node, status, hl, groups,
    note('Uses your browser’s native regex engine. The "g" flag is added automatically for highlighting.'));
  run();
}

/* ── Case converter ────────────────────────────────────────── */
const words = (s) => s.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/[_\-.]+/g, ' ').replace(/[^a-zA-Z0-9 ]+/g, ' ').trim().split(/\s+/).filter(Boolean);
const cap = (w) => w ? w[0].toUpperCase() + w.slice(1).toLowerCase() : w;
function caseTool(mount) {
  const input = inputArea('Input', { rows: 3, placeholder: 'Hello world example' });
  const rows = [['camelCase', (w) => w.map((x, i) => i ? cap(x) : x.toLowerCase()).join('')],
    ['PascalCase', (w) => w.map(cap).join('')],
    ['snake_case', (w) => w.map((x) => x.toLowerCase()).join('_')],
    ['kebab-case', (w) => w.map((x) => x.toLowerCase()).join('-')],
    ['CONSTANT_CASE', (w) => w.map((x) => x.toUpperCase()).join('_')],
    ['dot.case', (w) => w.map((x) => x.toLowerCase()).join('.')],
    ['Title Case', (w) => w.map(cap).join(' ')],
    ['Sentence case', (w) => w.length ? cap(w[0]) + (w.length > 1 ? ' ' + w.slice(1).map((x) => x.toLowerCase()).join(' ') : '') : ''],
    ['lower case', () => input.get().toLowerCase()],
    ['UPPER CASE', () => input.get().toUpperCase()]];
  const outs = rows.map(([label, fn]) => { const r = copyOut(label); return [fn, r]; });
  function run() { const w = words(input.get()); outs.forEach(([fn, r]) => r.set(fn(w))); }
  input.on(run);
  mount.append(input.node, ...outs.map(([, r]) => r.node));
  run();
}

/* ── Text diff ─────────────────────────────────────────────── */
function diffLines(a, b) {
  const A = a.split('\n'), B = b.split('\n'), n = A.length, m = B.length;
  const dp = Array.from({ length: n + 1 }, () => new Int32Array(m + 1));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) dp[i][j] = A[i] === B[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const out = []; let i = 0, j = 0;
  while (i < n && j < m) { if (A[i] === B[j]) { out.push(['=', A[i]]); i++; j++; } else if (dp[i + 1][j] >= dp[i][j + 1]) { out.push(['-', A[i]]); i++; } else { out.push(['+', B[j]]); j++; } }
  while (i < n) out.push(['-', A[i++]]); while (j < m) out.push(['+', B[j++]]);
  return out;
}
function diffTool(mount) {
  const a = inputArea('Original', { rows: 8 }); const b = inputArea('Changed', { rows: 8 });
  const out = el('pre', { class: 'dk-diff' }); const stat = el('div', { class: 'dk-note' });
  function run() {
    const d = diffLines(a.get(), b.get()); out.innerHTML = '';
    let add = 0, del = 0;
    for (const [op, line] of d) { if (op === '+') add++; else if (op === '-') del++; out.append(el('div', { class: 'dk-dl dk-dl--' + (op === '+' ? 'add' : op === '-' ? 'del' : 'eq') }, (op === '=' ? '  ' : op + ' ') + line)); }
    stat.textContent = `+${add} added · −${del} removed`;
  }
  a.on(run); b.on(run);
  mount.append(el('div', { class: 'dk-two' }, [a.node, b.node]), stat, out);
  run();
}

export default {
  group: 'Text',
  tools: [
    { id: 'regex', label: 'Regex Tester', desc: 'Live match highlighting, groups and match count.', render: regexTool },
    { id: 'case', label: 'Case Converter', desc: 'camelCase, snake_case, kebab, CONSTANT and more.', render: caseTool },
    { id: 'diff', label: 'Text Diff', desc: 'Line-by-line differences between two texts.', render: diffTool },
  ],
};
