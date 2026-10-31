// ui.js — Sistema de Toasts, Modales, escapado seguro y Banner Offline

// ─────────────────────────────────────────────
// ESCAPADO (válido para texto HTML y para valores de atributo con " o ')
// ─────────────────────────────────────────────
export function escapeHtml(text) {
  if (text === null || text === undefined) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ─────────────────────────────────────────────
// TOASTS (el mensaje se inserta como TEXTO, nunca como HTML)
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
  toast.setAttribute('role', tipo === 'error' ? 'alert' : 'status');
  const icon = document.createElement('span');
  icon.className = 'toast-icon';
  icon.textContent = iconos[tipo] || '•';
  const msg = document.createElement('span');
  msg.className = 'toast-msg';
  msg.textContent = String(mensaje);
  toast.append(icon, msg);
  container.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('toast-visible'));
  setTimeout(() => {
    toast.classList.remove('toast-visible');
    // Si la transición no se dispara (pestaña en segundo plano), limpiar igualmente
    const quitar = () => toast.remove();
    toast.addEventListener('transitionend', quitar, { once: true });
    setTimeout(quitar, 600);
  }, duracion);
}

function mensajeAHtml(mensaje) {
  return escapeHtml(mensaje).replace(/\n/g, '<br>');
}

// ─────────────────────────────────────────────
// MODAL CONFIRM
// ─────────────────────────────────────────────
export function showConfirm(mensaje, onSi, onNo, textoSi = 'Confirmar', textoNo = 'Cancelar') {
  const overlay = document.getElementById('modal-confirm-overlay');
  if (!overlay) { if (onSi && window.confirm(mensaje)) onSi(); else if (onNo) onNo(); return; }
  document.getElementById('modal-confirm-msg').innerHTML = mensajeAHtml(mensaje);
  overlay.classList.remove('oculto');
  const btnSi = document.getElementById('modal-confirm-si');
  const btnNo = document.getElementById('modal-confirm-no');
  const newSi = btnSi.cloneNode(true);
  const newNo = btnNo.cloneNode(true);
  newSi.textContent = textoSi;
  newNo.textContent = textoNo;
  btnSi.replaceWith(newSi);
  btnNo.replaceWith(newNo);
  newSi.onclick = () => { overlay.classList.add('oculto'); onSi?.(); };
  newNo.onclick = () => { overlay.classList.add('oculto'); onNo?.(); };
  setTimeout(() => newNo.focus(), 50);
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
  document.getElementById('modal-alert-msg').innerHTML = mensajeAHtml(mensaje);
  overlay.classList.remove('oculto');
  const btnOk = document.getElementById('modal-alert-ok');
  const newOk = btnOk.cloneNode(true);
  btnOk.replaceWith(newOk);
  newOk.onclick = () => overlay.classList.add('oculto');
}

// Tecla Escape: cierra el modal superior que esté abierto
document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  const abierto = id => { const el = document.getElementById(id); return el && !el.classList.contains('oculto'); };
  if (abierto('modal-confirm-overlay')) document.getElementById('modal-confirm-no')?.click();
  else if (abierto('modal-alert-overlay')) document.getElementById('modal-alert-ok')?.click();
  else if (abierto('modal-prompt-overlay')) document.getElementById('modal-prompt-cancel')?.click();
  else if (abierto('modal-descanso-overlay')) window.cerrarModalDescanso?.();
  else if (abierto('modal-tempo-overlay')) window.cerrarModalTempo?.();
});

// ─────────────────────────────────────────────
// BANNER OFFLINE
// ─────────────────────────────────────────────
export function initOfflineBanner() {
  const banner = document.getElementById('banner-offline');
  if (!banner) return;

  let timer = null;
  let eraOffline = false;

  const mostrar = (texto, duracion) => {
    banner.textContent = texto;
    banner.classList.remove('oculto');
    clearTimeout(timer);
    timer = setTimeout(() => banner.classList.add('oculto'), duracion);
  };

  // Al perder conexión: mostrar 6 segundos y ocultar
  window.addEventListener('offline', () => {
    eraOffline = true;
    mostrar('📴 Sin conexión — Modo offline activo', 6000);
  });

  // Al recuperar conexión: mostrar confirmación breve solo si estuvo offline
  window.addEventListener('online', () => {
    if (eraOffline) {
      eraOffline = false;
      mostrar('✅ Conexión restaurada', 3000);
    }
  });

  // Si arranca sin conexión, avisar una sola vez
  if (!navigator.onLine) {
    eraOffline = true;
    mostrar('📴 Sin conexión — Modo offline activo', 6000);
  }
}

// Exportar globalmente para uso en HTML inline
window.showToast   = showToast;
window.showConfirm = showConfirm;
window.showPrompt  = showPrompt;
window.showAlert   = showAlert;
window.escapeHtml  = escapeHtml;
