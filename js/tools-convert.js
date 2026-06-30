/* ░░░ tools-convert.js — Color converter · Number base ░░░ */
import { el, select } from './util.js';
import { inputLine, copyOut, note } from './devutil.js';

/* ── Color ─────────────────────────────────────────────────── */
function hslToRgb(h, s, l, a = 1) {
  h = ((h % 360) + 360) % 360; s /= 100; l /= 100;
  const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs((h / 60) % 2 - 1)), m = l - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 60) [r, g, b] = [c, x, 0]; else if (h < 120) [r, g, b] = [x, c, 0]; else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c]; else if (h < 300) [r, g, b] = [x, 0, c]; else [r, g, b] = [c, 0, x];
  return { r: Math.round((r + m) * 255), g: Math.round((g + m) * 255), b: Math.round((b + m) * 255), a };
}
function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255; const max = Math.max(r, g, b), min = Math.min(r, g, b); let h = 0, s = 0; const l = (max + min) / 2;
  if (max !== min) { const d = max - min; s = l > 0.5 ? d / (2 - max - min) : d / (max + min); h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4; h *= 60; }
  return { h: Math.round(h), s: Math.round(s * 100), l: Math.round(l * 100) };
}
const hx = (n) => Math.max(0, Math.min(255, n)).toString(16).padStart(2, '0');
function parseColor(str) {
  str = str.trim(); let m;
  if ((m = str.match(/^#([0-9a-f]{3,8})$/i))) { let h = m[1]; if (h.length === 3 || h.length === 4) h = h.split('').map((c) => c + c).join(''); return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16), a: h.length >= 8 ? +(parseInt(h.slice(6, 8), 16) / 255).toFixed(2) : 1 }; }
  if ((m = str.match(/rgba?\(([^)]+)\)/i))) { const p = m[1].split(/[ ,/]+/).filter(Boolean); return { r: +p[0], g: +p[1], b: +p[2], a: p[3] != null ? +p[3] : 1 }; }
  if ((m = str.match(/hsla?\(([^)]+)\)/i))) { const p = m[1].split(/[ ,/]+/).filter(Boolean); return hslToRgb(parseFloat(p[0]), parseFloat(p[1]), parseFloat(p[2]), p[3] != null ? +p[3] : 1); }
  return null;
}
function colorTool(mount) {
  const input = inputLine('Colour', { placeholder: '#22d3ee · rgb(34,211,238) · hsl(187,80%,53%)', value: '#22d3ee' });
  const picker = el('input', { type: 'color', class: 'inp inp--color', value: '#22d3ee' });
  const swatch = el('div', { class: 'dk-swatch' });
  const hex = copyOut('HEX'); const rgb = copyOut('RGB'); const hsl = copyOut('HSL');
  function show(c) {
    const a = c.a == null ? 1 : c.a;
    swatch.style.background = `rgba(${c.r},${c.g},${c.b},${a})`;
    hex.set('#' + hx(c.r) + hx(c.g) + hx(c.b) + (a < 1 ? hx(Math.round(a * 255)) : ''));
    rgb.set(a < 1 ? `rgba(${c.r}, ${c.g}, ${c.b}, ${a})` : `rgb(${c.r}, ${c.g}, ${c.b})`);
    const h = rgbToHsl(c.r, c.g, c.b); hsl.set(a < 1 ? `hsla(${h.h}, ${h.s}%, ${h.l}%, ${a})` : `hsl(${h.h}, ${h.s}%, ${h.l}%)`);
  }
  function run() { const c = parseColor(input.get()); if (!c || [c.r, c.g, c.b].some(isNaN)) { swatch.style.background = 'transparent'; [hex, rgb, hsl].forEach((r) => r.set('')); return; } show(c); picker.value = '#' + hx(c.r) + hx(c.g) + hx(c.b); }
  input.on(run);
  picker.addEventListener('input', () => { input.set(picker.value); run(); });
  mount.append(el('div', { class: 'dk-color-top' }, [input.node, picker, swatch]), hex.node, rgb.node, hsl.node,
    note('Accepts HEX (3/4/6/8 digits), rgb()/rgba() and hsl()/hsla().'));
  run();
}

/* ── Number base ───────────────────────────────────────────── */
const DIGITS = '0123456789abcdefghijklmnopqrstuvwxyz';
function toBig(str, base) {
  let s = str.trim().toLowerCase().replace(/^[+]/, ''); let neg = false;
  if (s.startsWith('-')) { neg = true; s = s.slice(1); }
  s = s.replace(/^0x/, '').replace(/^0b/, '').replace(/^0o/, '').replace(/[_\s]/g, '');
  if (!s) throw new Error('empty');
  let n = 0n; const B = BigInt(base);
  for (const ch of s) { const d = DIGITS.indexOf(ch); if (d < 0 || d >= base) throw new Error('invalid digit "' + ch + '" for base ' + base); n = n * B + BigInt(d); }
  return neg ? -n : n;
}
function baseTool(mount) {
  const val = inputLine('Value', { placeholder: 'e.g. 255 or ff or 1010' });
  const from = select([{ value: '10', label: 'Decimal (10)' }, { value: '16', label: 'Hex (16)' }, { value: '2', label: 'Binary (2)' }, { value: '8', label: 'Octal (8)' }], '10');
  const status = el('div', { class: 'dk-note' });
  const bin = copyOut('Binary'); const oct = copyOut('Octal'); const dec = copyOut('Decimal'); const hexo = copyOut('Hex');
  function run() {
    status.className = 'dk-note'; status.textContent = '';
    const v = val.get().trim(); if (!v) { [bin, oct, dec, hexo].forEach((r) => r.set('')); return; }
    let n; try { n = toBig(v, +from.value); } catch (e) { status.className = 'dk-note is-err'; status.textContent = '⚠ ' + e.message; [bin, oct, dec, hexo].forEach((r) => r.set('')); return; }
    bin.set(n.toString(2)); oct.set(n.toString(8)); dec.set(n.toString(10)); hexo.set(n.toString(16));
  }
  val.on(run); from.addEventListener('change', run);
  mount.append(el('div', { class: 'controls' }, [val.node, el('label', { class: 'dk-field' }, [el('span', { class: 'dk-field__label' }, 'Input base'), from])]), status, bin.node, oct.node, dec.node, hexo.node,
    note('Arbitrary precision via BigInt. Accepts 0x / 0b / 0o prefixes and underscores.'));
  run();
}

export default {
  group: 'Convert',
  tools: [
    { id: 'color', label: 'Color Converter', desc: 'HEX ↔ RGB ↔ HSL with a live swatch.', render: colorTool },
    { id: 'base', label: 'Number Base', desc: 'Binary · octal · decimal · hex (BigInt).', render: baseTool },
  ],
};
