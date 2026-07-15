/* ░░░ status.js — IDE status bar helpers ░░░ */
import { $ } from './util.js';

export function setStatus({ encoding, bytes, tool, state } = {}) {
  const enc = $('#status-enc');
  const by = $('#status-bytes');
  const tl = $('#status-tool');
  const st = $('#status-state');
  if (!enc) return;
  if (encoding != null) enc.textContent = encoding;
  if (bytes != null) by.textContent = typeof bytes === 'number' ? `${bytes} byte${bytes === 1 ? '' : 's'}` : bytes;
  if (tool != null) tl.textContent = tool;
  if (state != null) {
    st.textContent = state;
    st.classList.toggle('ide-statusbar__seg--ok', state === 'ready');
    st.classList.toggle('ide-statusbar__seg--busy', state === 'computing');
  }
}
