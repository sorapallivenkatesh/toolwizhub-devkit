/* ░░░ tools-time.js — Cron explainer · Epoch ↔ date ░░░ */
import { el, button } from './util.js';
import { inputLine, copyOut, note, section } from './devutil.js';

/* ── Cron ──────────────────────────────────────────────────── */
const ALIASES = { '@yearly': '0 0 1 1 *', '@annually': '0 0 1 1 *', '@monthly': '0 0 1 * *', '@weekly': '0 0 * * 0', '@daily': '0 0 * * *', '@midnight': '0 0 * * *', '@hourly': '0 * * * *' };
const DOW = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MON = ['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const pad = (n) => String(n).padStart(2, '0');

function expand(expr, min, max) {
  if (expr === '*') { const s = new Set(); for (let i = min; i <= max; i++) s.add(i); return s; }
  const out = new Set();
  for (const part of expr.split(',')) {
    let m;
    if ((m = part.match(/^(\*|\d+)(?:-(\d+))?(?:\/(\d+))?$/))) {
      let lo = m[1] === '*' ? min : +m[1]; let hi = m[2] != null ? +m[2] : (m[1] === '*' ? max : (m[3] != null ? max : lo)); const step = m[3] != null ? +m[3] : 1;
      for (let i = lo; i <= hi; i += step) if (i >= min && i <= max) out.add(i);
    } else throw new Error('bad field: ' + expr);
  }
  return out;
}
function parseCron(str) {
  let s = str.trim().toLowerCase();
  if (ALIASES[s]) s = ALIASES[s];
  const f = s.split(/\s+/);
  if (f.length !== 5) throw new Error('Cron needs 5 fields: min hour day-of-month month day-of-week');
  const dowRaw = f[4].replace(/7/g, '0');
  return { minute: expand(f[0], 0, 59), hour: expand(f[1], 0, 23), dom: expand(f[2], 1, 31), month: expand(f[3], 1, 12), dow: expand(dowRaw, 0, 6), raw: f, domStar: f[2] === '*', dowStar: f[4] === '*' };
}
function matches(c, d) {
  if (!c.minute.has(d.getMinutes()) || !c.hour.has(d.getHours()) || !c.month.has(d.getMonth() + 1)) return false;
  const domOk = c.dom.has(d.getDate()), dowOk = c.dow.has(d.getDay());
  if (c.domStar && c.dowStar) return true;
  if (c.domStar) return dowOk;
  if (c.dowStar) return domOk;
  return domOk || dowOk;
}
function describe(c) {
  const [mi, ho, dm, mo, dw] = c.raw;
  let time;
  if (mi === '*' && ho === '*') time = 'Every minute';
  else if (/^\*\/\d+$/.test(mi) && ho === '*') time = `Every ${mi.slice(2)} minutes`;
  else if (ho === '*') time = `Every hour at minute ${mi}`;
  else if (/^\d+$/.test(mi) && /^\*\/(\d+)$/.test(ho)) time = `Every ${ho.slice(2)} hours, at minute ${mi}`;
  else if (/^\d+$/.test(mi) && /^\d+$/.test(ho)) time = `At ${pad(+ho)}:${pad(+mi)}`;
  else time = `At minute ${mi} past hour(s) ${ho}`;
  let day = '';
  const dowTxt = () => [...c.dow].sort((a, b) => a - b).map((d) => DOW[d]).join(', ');
  if (!c.domStar && c.dowStar) day = `, on day ${dm} of the month`;
  else if (c.domStar && !c.dowStar) day = `, on ${dowTxt()}`;
  else if (!c.domStar && !c.dowStar) day = `, on day ${dm} of the month and on ${dowTxt()}`;
  const month = mo === '*' ? '' : `, in ${[...c.month].sort((a, b) => a - b).map((m) => MON[m]).join(', ')}`;
  return time + day + month + '.';
}
function cronTool(mount) {
  const input = inputLine('Cron expression', { placeholder: '0 */6 * * *  (or @daily)', value: '0 */6 * * *' });
  const desc = el('div', { class: 'dk-cron-desc' });
  const next = copyOut('Next 5 runs', { area: true, rows: 5 });
  function run() {
    desc.innerHTML = '';
    let c;
    try { c = parseCron(input.get()); } catch (e) { desc.append(note('⚠ ' + e.message, 'is-err')); next.set(''); return; }
    desc.append(el('div', { class: 'dk-cron-en' }, describe(c)));
    const runs = []; const d = new Date(); d.setSeconds(0, 0); d.setMinutes(d.getMinutes() + 1);
    for (let i = 0; i < 2_000_000 && runs.length < 5; i++) { if (matches(c, d)) runs.push(d.toLocaleString() + '  ·  ' + d.toUTCString()); d.setMinutes(d.getMinutes() + 1); }
    next.set(runs.join('\n') || '(no runs found in the next ~4 years)');
  }
  input.on(run);
  mount.append(input.node, desc, next.node, note('Standard 5-field cron (min hour day-of-month month day-of-week) plus @daily/@hourly/@weekly/@monthly/@yearly. Times shown in your local zone + UTC.'));
  run();
}

/* ── Epoch ↔ date ──────────────────────────────────────────── */
function epochTool(mount) {
  const nowRow = copyOut('Current epoch (seconds)');
  const epoch = inputLine('Epoch (seconds or milliseconds)', { placeholder: 'e.g. 1717000000' });
  const eIso = copyOut('ISO 8601'); const eUtc = copyOut('UTC'); const eLocal = copyOut('Local'); const eRel = copyOut('Relative');
  const dt = el('input', { class: 'inp mono', type: 'datetime-local' });
  const dSec = copyOut('Epoch seconds'); const dMs = copyOut('Epoch milliseconds');
  const rel = (ms) => { const s = Math.round((ms - Date.now()) / 1000); const a = Math.abs(s); const u = a < 60 ? [s, 's'] : a < 3600 ? [s / 60, 'min'] : a < 86400 ? [s / 3600, 'h'] : [s / 86400, 'd']; return `${u[0] > 0 ? 'in ' : ''}${Math.abs(Math.round(u[0]))} ${u[1]}${u[0] <= 0 ? ' ago' : ''}`; };
  function fromEpoch() {
    const v = epoch.get().trim(); if (!v || isNaN(+v)) { [eIso, eUtc, eLocal, eRel].forEach((r) => r.set('')); return; }
    let ms = +v; if (Math.abs(ms) < 1e12) ms *= 1000; // treat <1e12 as seconds
    const d = new Date(ms);
    eIso.set(d.toISOString()); eUtc.set(d.toUTCString()); eLocal.set(d.toLocaleString()); eRel.set(rel(ms));
  }
  function fromDate() {
    if (!dt.value) { dSec.set(''); dMs.set(''); return; }
    const ms = new Date(dt.value).getTime(); dSec.set(String(Math.floor(ms / 1000))); dMs.set(String(ms));
  }
  epoch.on(fromEpoch); dt.addEventListener('input', fromDate);
  const tick = () => { if (!document.body.contains(nowRow.node)) return; nowRow.set(String(Math.floor(Date.now() / 1000))); requestAnimationFrame(() => setTimeout(tick, 1000)); };
  mount.append(nowRow.node, el('div', { class: 'actions' }, [button('Use now', { onclick: () => { epoch.set(String(Math.floor(Date.now() / 1000))); fromEpoch(); } })]),
    section('Epoch → date'), epoch.node, eIso.node, eUtc.node, eLocal.node, eRel.node,
    section('Date → epoch'), el('label', { class: 'dk-field' }, [el('span', { class: 'dk-field__label' }, 'Pick a date & time'), dt]), dSec.node, dMs.node);
  tick(); fromEpoch();
}

export default {
  group: 'Time',
  tools: [
    { id: 'cron', label: 'Cron Explainer', desc: 'Turn a cron expression into plain English + next runs.', render: cronTool },
    { id: 'epoch', label: 'Epoch ↔ Date', desc: 'Convert Unix timestamps to dates and back.', render: epochTool },
  ],
};
