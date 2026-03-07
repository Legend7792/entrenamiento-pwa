// ui.js — Sistema de Toasts, Modales y Banner Offline

// ─────────────────────────────────────────────
// TOASTS
// ─────────────────────────────────────────────
export function showToast(mensaje, tipo = 'success', duracion = 3500) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }
  const iconos = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
  const toast = document.createElement('div');
  toast.className = `toast toast-${tipo}`;
  toast.innerHTML = `<span class="toast-icon">${iconos[tipo] || '•'}</span><span class="toast-msg">${mensaje}</span>`;
  container.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('toast-visible'));
  setTimeout(() => {
    toast.classList.remove('toast-visible');
    toast.addEventListener('transitionend', () => toast.remove(), { once: true });
  }, duracion);
}

// ─────────────────────────────────────────────
// MODAL CONFIRM
// ─────────────────────────────────────────────
export function showConfirm(mensaje, onSi, onNo) {
  const overlay = document.getElementById('modal-confirm-overlay');
  if (!overlay) { if (onSi && window.confirm(mensaje)) onSi(); else if (onNo) onNo(); return; }
  document.getElementById('modal-confirm-msg').innerHTML = mensaje.replace(/\n/g, '<br>');
  overlay.classList.remove('oculto');
  const btnSi = document.getElementById('modal-confirm-si');
  const btnNo = document.getElementById('modal-confirm-no');
  const newSi = btnSi.cloneNode(true);
  const newNo = btnNo.cloneNode(true);
  btnSi.replaceWith(newSi);
  btnNo.replaceWith(newNo);
  newSi.onclick = () => { overlay.classList.add('oculto'); onSi?.(); };
  newNo.onclick = () => { overlay.classList.add('oculto'); onNo?.(); };
}

// ─────────────────────────────────────────────
// MODAL PROMPT
// ─────────────────────────────────────────────
export function showPrompt(mensaje, placeholder, onConfirm, valorInicial = '') {
  const overlay = document.getElementById('modal-prompt-overlay');
  if (!overlay) { const v = window.prompt(mensaje, valorInicial); if (v !== null && onConfirm) onConfirm(v); return; }
  document.getElementById('modal-prompt-msg').textContent = mensaje;
  const input = document.getElementById('modal-prompt-input');
  input.placeholder = placeholder || '';
  input.value = valorInicial;
  overlay.classList.remove('oculto');
  setTimeout(() => input.focus(), 120);
  const btnOk = document.getElementById('modal-prompt-ok');
  const btnCancel = document.getElementById('modal-prompt-cancel');
  const newOk = btnOk.cloneNode(true);
  const newCancel = btnCancel.cloneNode(true);
  btnOk.replaceWith(newOk);
  btnCancel.replaceWith(newCancel);
  const confirmar = () => {
    const val = input.value.trim();
    overlay.classList.add('oculto');
    if (val && onConfirm) onConfirm(val);
  };
  newOk.onclick = confirmar;
  newCancel.onclick = () => overlay.classList.add('oculto');
  input.onkeydown = e => { if (e.key === 'Enter') confirmar(); if (e.key === 'Escape') overlay.classList.add('oculto'); };
}

// ─────────────────────────────────────────────
// MODAL ALERT (mensajes largos)
// ─────────────────────────────────────────────
export function showAlert(mensaje, tipo = 'info') {
  const overlay = document.getElementById('modal-alert-overlay');
  if (!overlay) { showToast(mensaje, tipo, 5000); return; }
  document.getElementById('modal-alert-msg').innerHTML = mensaje.replace(/\n/g, '<br>');
  overlay.classList.remove('oculto');
  const btnOk = document.getElementById('modal-alert-ok');
  const newOk = btnOk.cloneNode(true);
  btnOk.replaceWith(newOk);
  newOk.onclick = () => overlay.classList.add('oculto');
}

// ─────────────────────────────────────────────
// BANNER OFFLINE
// ─────────────────────────────────────────────
export function initOfflineBanner() {
  const banner = document.getElementById('banner-offline');
  if (!banner) return;
  const update = () => banner.classList.toggle('oculto', navigator.onLine);
  update();
  window.addEventListener('online', update);
  window.addEventListener('offline', update);
}

// Exportar globalmente para uso en HTML inline
window.showToast   = showToast;
window.showConfirm = showConfirm;
window.showPrompt  = showPrompt;
window.showAlert   = showAlert;
