// app.js — Gym Tracker v99
import "./auth.js";
import { loadRutinaUsuario, inicializarRutinaBase, getAllRutinasUsuario, RUTINA_BASE_ID as RUTINA_BASE_KEY } from "./rutinaUsuario.js";
import { markDirty, userState, esClaveBackup, sincronizarSiHaceFalta } from "./userState.js";
import { navPush, navLimpiar, navAtras, navRegistrarPop, navVigilarCapas, navTopePantalla } from "./nav.js";
import * as audioStore from "./audioStore.js";
import { renderizarSelectorRutinas, obtenerRutinaActiva, RUTINA_BASE_ID } from "./selectorRutinas.js";
import "./themes.js";
import "./editorRutinas.js";
import { showToast, showConfirm, showPrompt, showAlert, initOfflineBanner, escapeHtml } from "./ui.js";
import "./aiImport.js";

// ══════════════════════════════════════════════════════
// PERSISTENCIA DE ALMACENAMIENTO (evita que el navegador borre la caché)
// ══════════════════════════════════════════════════════
if (navigator.storage && navigator.storage.persist) {
  navigator.storage.persist().then(granted => {
    if (granted) {
      console.log('✅ Almacenamiento persistente concedido');
    } else {
      console.warn('⚠️ Almacenamiento persistente denegado');
    }
  });
}

// ══════════════════════════════════════════════════════
// WAKE LOCK — Pantalla activa durante el entrenamiento
// ══════════════════════════════════════════════════════
let _wakeLock = null;

async function activarWakeLock() {
  if (!('wakeLock' in navigator)) return;
  try {
    _wakeLock = await navigator.wakeLock.request('screen');
    _wakeLock.addEventListener('release', () => { _wakeLock = null; });
  } catch (e) {
    console.warn('[WakeLock]', e.message);
  }
}

async function liberarWakeLock() {
  if (_wakeLock) { await _wakeLock.release().catch(() => {}); _wakeLock = null; }
}

// Re-adquirir wake lock si la pantalla se durmió y el usuario volvió al día activo
document.addEventListener('visibilitychange', async () => {
  if (document.visibilityState === 'visible' &&
      !document.getElementById('pantalla-dia')?.classList.contains('oculto')) {
    await activarWakeLock();
  }
});

// Número de día según la fecha LOCAL (no depende de horario de verano: un día siempre = +1)
function numDia(fecha) {
  const d = fecha instanceof Date ? fecha : new Date(fecha);
  return Math.round(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000);
}

// Un ejercicio "hecho" tiene al menos una serie con repeticiones > 0. Los ejercicios que no se
// tocaron en una sesión no deben contar como récord, volumen ni referencia de la "última vez".
function ejercicioHecho(ej) {
  return Array.isArray(ej?.reps) && ej.reps.some(r => r !== '' && r !== null && Number(r) > 0);
}

// ══════════════════════════════════════════════════════
// ESTIMADOR 1RM (Fórmula de Epley)
// ══════════════════════════════════════════════════════
function calcular1RM(peso, reps) {
  if (!peso || peso <= 0 || !reps || reps <= 0) return null;
  return Math.round(peso * (1 + reps / 30) * 10) / 10;
}

// ══════════════════════════════════════════════════════
// MODO TEXTO GRANDE — letras y botones más grandes para usar la app entre series (manos sudadas, prisa)
// Es una preferencia de ESTE dispositivo (no se sincroniza con la nube). La clase se aplica ya desde
// index.html para que no haya un parpadeo al abrir; aquí solo se mantienen los controles al día.
// ══════════════════════════════════════════════════════
try { if (localStorage.getItem('textoGrande') === 'true') document.documentElement.classList.add('texto-grande'); } catch {}

function textoGrandeActivo() { return document.documentElement.classList.contains('texto-grande'); }

function sincronizarControlesTextoGrande() {
  const on = textoGrandeActivo();
  const chk = document.getElementById('toggle-texto-grande');
  if (chk) chk.checked = on;
  const btn = document.getElementById('btn-texto-grande');
  if (btn) { btn.setAttribute('aria-pressed', on ? 'true' : 'false'); btn.classList.toggle('modo-activo', on); }
}

window.toggleTextoGrande = function (activo) {
  const on = typeof activo === 'boolean' ? activo : !textoGrandeActivo();
  document.documentElement.classList.toggle('texto-grande', on);
  try { localStorage.setItem('textoGrande', on ? 'true' : 'false'); } catch {}
  sincronizarControlesTextoGrande();
  showToast(on ? '🔠 Texto grande activado' : 'Texto normal', 'info', 1800);
};

// ══════════════════════════════════════════════════════
// VIBRACIÓN AL TERMINAR TIMER
// ══════════════════════════════════════════════════════
function vibrarSiActivo() {
  if (localStorage.getItem('vibrarAlTerminar') !== 'true') return;
  if (!navigator.vibrate) return;
  navigator.vibrate([200, 100, 200]);
}

window.toggleVibracion = function (activo) {
  localStorage.setItem('vibrarAlTerminar', activo ? 'true' : 'false');
  markDirty();
  showToast(activo ? '📳 Vibración activada' : '🔕 Vibración desactivada', 'info');
};

// ══════════════════════════════════════════════════════
// MAPA DE GRUPOS MUSCULARES
// ══════════════════════════════════════════════════════
const MUSCULOS_MAP = {
  pectoral:   '🫀 Pectoral',
  espalda:    '🔙 Espalda',
  hombro:     '💪 Hombro',
  bicep:      '💪 Bícep',
  tricep:     '💪 Trícep',
  cuadricep:  '🦵 Cuádr.',
  isquio:     '🦵 Isquio.',
  gluteo:     '🍑 Glúteo',
  gemelo:     '🦶 Gemelo',
  core:       '🎯 Core'
};

// ══════════════════════════════════════════════════════
// A2HS — Prompt de instalación (Add to Home Screen)
// ══════════════════════════════════════════════════════
let _installPrompt = null;

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  _installPrompt = e;
  const btn = document.getElementById('btn-instalar-app');
  if (btn) btn.style.display = '';
});

window.addEventListener('appinstalled', () => {
  _installPrompt = null;
  const btn = document.getElementById('btn-instalar-app');
  if (btn) btn.style.display = 'none';
  showToast('✅ App instalada en tu pantalla de inicio', 'success');
});

window.instalarApp = async function () {
  if (!_installPrompt) {
    showToast('La app ya está instalada o tu navegador no lo soporta', 'info');
    return;
  }
  _installPrompt.prompt();
  const { outcome } = await _installPrompt.userChoice;
  if (outcome === 'accepted') _installPrompt = null;
};

// ══════════════════════════════════════════════════════
// EXPORTAR BACKUP COMPLETO JSON
// ══════════════════════════════════════════════════════
window.exportarBackupJSON = function () {
  try {
    // Sin sesión, tokens, API key, audio ni estado temporal (ver esClaveBackup)
    const backup = { _version: 'gym-tracker-backup-v2', _exportedAt: new Date().toISOString() };
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (esClaveBackup(key)) backup[key] = localStorage.getItem(key);
    }
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `gym-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    try { localStorage.setItem('gym_ultimoBackup', String(Date.now())); } catch {}
    showToast('💾 Backup exportado (no incluye tu sesión ni claves)', 'success');
  } catch (e) {
    showToast('Error al exportar: ' + e.message, 'error');
  }
};

// ══════════════════════════════════════════════════════
// IMPORTAR BACKUP JSON
// ══════════════════════════════════════════════════════
window.importarBackupJSON = function (input) {
  const archivo = input?.files?.[0];
  if (!archivo) return;
  input.value = ''; // reset para permitir re-seleccionar el mismo archivo

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result);

      if (!data || typeof data._version !== 'string' || !data._version.startsWith('gym-tracker-backup')) {
        showToast('❌ Archivo no válido. Debe ser un backup de Gym Tracker.', 'error');
        return;
      }

      // Solo claves permitidas: un backup (aunque sea antiguo o manipulado) no puede
      // cambiar la sesión ni la API key.
      const entradas = Object.entries(data).filter(([k, v]) => !k.startsWith('_') && esClaveBackup(k) && typeof v === 'string');
      let nSesiones = 0;
      try { nSesiones = JSON.parse(data.historial || '[]').length; } catch {}

      showConfirm(
        `📂 ¿Restaurar backup?\n\nSe REEMPLAZARÁN los datos de este dispositivo que estén en el backup.\n\nBackup del: ${data._exportedAt ? new Date(data._exportedAt).toLocaleString('es-ES') : 'fecha desconocida'}\nSesiones: ${nSesiones} · Claves: ${entradas.length}\n\n⚠️ Esta acción no se puede deshacer. Si quieres conservarlo todo, exporta antes un backup nuevo.`,
        () => {
          let restauradas = 0;
          for (const [key, val] of entradas) {
            try { localStorage.setItem(key, val); restauradas++; }
            catch (err) { console.warn('[Backup] No se pudo restaurar clave:', key, err.message); }
          }
          // Las sesiones que vuelven con el backup dejan de contar como "borradas" (si no, la
          // siguiente fusión con la nube las eliminaría otra vez)
          try {
            const vivas = new Set(leerHistorialCrudo().map(claveSesion));
            const lapidas = JSON.parse(localStorage.getItem('historialBorrados') || '[]').filter(k => !vivas.has(k));
            localStorage.setItem('historialBorrados', JSON.stringify(lapidas));
            const medVivas = new Set(leerMedidas().map(m => m.fecha));
            const lapMed = JSON.parse(localStorage.getItem('medidasBorradas') || '[]').filter(k => !medVivas.has(k));
            localStorage.setItem('medidasBorradas', JSON.stringify(lapMed));
          } catch {}
          // Estado de pantalla/sesión en curso del equipo anterior: no tiene sentido restaurarlo
          localStorage.removeItem('estadoApp');
          localStorage.removeItem('gym_sesion_parcial');
          markDirty();
          showToast(`✅ Backup restaurado: ${restauradas} claves. Recargando...`, 'success');
          setTimeout(() => window.location.reload(), 1800);
        },
        () => {}
      );
    } catch (err) {
      showToast('❌ Error al leer el archivo: ' + err.message, 'error');
    }
  };
  reader.readAsText(archivo);
};

// ══════════════════════════════════════════════════════
// AUTO-GUARDADO PARCIAL DE SESIÓN
// Guarda los pesos y reps introducidos cada 30s
// para recuperarlos si la app se cierra accidentalmente
// ══════════════════════════════════════════════════════
const AUTO_SAVE_KEY  = 'gym_sesion_parcial';
const AUTO_SAVE_SECS = 30;
let   _autoSaveTimer = null;

function iniciarAutoGuardado() {
  detenerAutoGuardado();
  _autoSaveTimer = setInterval(() => {
    if (!diaActual || !ejerciciosDia.length) return;
    const parcial = {
      savedAt:      Date.now(),
      diaActual,
      rutinaId:     (typeof obtenerRutinaActiva === 'function') ? obtenerRutinaActiva() : null,
      ejerciciosDia: ejerciciosDia.map(ej => ({
        nombre: ej.nombre,
        peso:   ej.peso,
        reps:   [...ej.reps]
      }))
    };
    try { localStorage.setItem(AUTO_SAVE_KEY, JSON.stringify(parcial)); }
    catch (e) { /* localStorage lleno */ }
  }, AUTO_SAVE_SECS * 1000);
}

function detenerAutoGuardado() {
  if (_autoSaveTimer) { clearInterval(_autoSaveTimer); _autoSaveTimer = null; }
}

function limpiarAutoGuardado() {
  localStorage.removeItem(AUTO_SAVE_KEY);
}

// Ofrecer restauración si hay un guardado parcial reciente (<4 horas)
function verificarSesionParcial() {
  try {
    const raw = localStorage.getItem(AUTO_SAVE_KEY);
    if (!raw) return;
    const parcial = JSON.parse(raw);
    if (!parcial?.savedAt || !parcial.ejerciciosDia?.length) return;

    const hace = Date.now() - parcial.savedAt;
    const horasMax = 4 * 3600 * 1000; // 4 horas
    if (hace > horasMax) { limpiarAutoGuardado(); return; }

    const mins = Math.round(hace / 60000);
    const cuandoStr = mins < 2 ? 'hace un momento' : `hace ${mins} min`;

    showConfirm(
      `⚠️ Sesión interrumpida detectada\n\nSe encontró una sesión guardada automáticamente ${cuandoStr} con ${parcial.ejerciciosDia.length} ejercicios.\n\n¿Deseas restaurar los datos introducidos?`,
      () => {
        // Restaurar datos en ejerciciosDia si el día sigue activo
        if (parcial.ejerciciosDia && ejerciciosDia.length) {
          parcial.ejerciciosDia.forEach((pej, idx) => {
            if (ejerciciosDia[idx]?.nombre === pej.nombre) {
              ejerciciosDia[idx].peso = pej.peso;
              ejerciciosDia[idx].reps = [...pej.reps];
            }
          });
          renderDia();
          showToast('✅ Sesión restaurada', 'success');
        }
        limpiarAutoGuardado();
      },
      () => limpiarAutoGuardado()
    );
  } catch (e) { limpiarAutoGuardado(); }
}

// ══════════════════════════════════════════════════════
// SCREEN ORIENTATION LOCK — Fijar portrait durante el entrenamiento
// ══════════════════════════════════════════════════════
async function fijarOrientacionPortrait() {
  try {
    if (screen.orientation?.lock) {
      await screen.orientation.lock('portrait');
    }
  } catch (e) {
    // Silencioso: no todos los dispositivos lo soportan
  }
}

async function liberarOrientacion() {
  try {
    if (screen.orientation?.unlock) {
      screen.orientation.unlock();
    }
  } catch (e) { /* silencioso */ }
}

// ══════════════════════════════════════════════════════
// SHARE API — Compartir resumen de sesión
// ══════════════════════════════════════════════════════
window.compartirResumen = async function () {
  const historial = leerHistorialCrudo();
  const sesion = historial[historial.length - 1];
  if (!sesion) { showToast('Sin sesión para compartir', 'info'); return; }

  const fecha  = new Date(sesion.fecha).toLocaleDateString('es-ES');
  const dur    = sesion.duracionMin ? ` · ⏱️ ${sesion.duracionMin} min` : '';
  const ejList = sesion.ejercicios
    .map(ej => `  • ${ej.nombre}: ${ej.peso > 0 ? ej.peso + 'kg' : 'Al fallo'} (${ej.reps.filter(r=>r!=='').join('/')} reps)`)
    .join('\n');

  const texto = `🏋️ Gym Tracker — ${sesion.dia}\n📅 ${fecha}${dur}\n\n${ejList}\n\n💪 ¡Sesión completada!`;

  if (navigator.share) {
    try {
      await navigator.share({ title: 'Gym Tracker', text: texto });
    } catch (e) {
      if (e.name !== 'AbortError') showToast('Error al compartir: ' + e.message, 'error');
    }
  } else {
    // Fallback: copiar al portapapeles
    try {
      await navigator.clipboard.writeText(texto);
      showToast('📋 Resumen copiado al portapapeles', 'success');
    } catch {
      showToast('Tu navegador no soporta compartir ni copiar', 'info');
    }
  }
};

// ══════════════════════════════════════════════════════
// AUDIO - Sistema modular con instancias independientes
// ══════════════════════════════════════════════════════
class AudioManager {
  constructor() {
    this.ctx = null;
    this.gainNode = null;
    this.gainValue = parseFloat(localStorage.getItem('audioGain') || '1.0');
    this.bufferBeep = null;
    this.bufferPersonalizado = null;
    this.nombrePersonalizado = null;
    this.activeSources = new Map();
  }

  async init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    // GainNode para amplificación configurable
    if (!this.gainNode) {
      this.gainNode = this.ctx.createGain();
      this.gainNode.gain.value = this.gainValue;
      this.gainNode.connect(this.ctx.destination);
    }
    if (!this.bufferBeep) {
      const resp = await fetch("./beep.mp3");
      const arrayBuffer = await resp.arrayBuffer();
      this.bufferBeep = await this.ctx.decodeAudioData(arrayBuffer);
    }
    await this.cargarGuardado();
  }

  desbloquear() {
    if (this.ctx?.state === "suspended") this.ctx.resume();
  }

  play(timerId) {
    if (!this.ctx) return;
    const buf = this.bufferPersonalizado || this.bufferBeep;
    if (!buf) return;
    if (this.ctx.state === "suspended") this.ctx.resume().catch(() => {});
    this.stop(timerId);
    const source = this.ctx.createBufferSource();
    source.buffer = buf;
    source.loop = true;
    // Rutear a través del GainNode para amplificación configurable
    source.connect(this.gainNode || this.ctx.destination);
    source.start();
    this.activeSources.set(timerId, source);
  }

  setGain(value) {
    this.gainValue = Math.max(0.1, Math.min(3.0, parseFloat(value)));
    if (this.gainNode) this.gainNode.gain.value = this.gainValue;
    localStorage.setItem('audioGain', String(this.gainValue));
    if (typeof markDirty === 'function') markDirty();
  }

  stop(timerId) {
    const source = this.activeSources.get(timerId);
    if (source) {
      try { source.stop(); source.disconnect(); } catch (e) {}
      this.activeSources.delete(timerId);
    }
  }

  stopAll() {
    this.activeSources.forEach((source, id) => {
      try { source.stop(); source.disconnect(); } catch (e) {}
    });
    this.activeSources.clear();
  }

  async cargarPersonalizado(file) {
    if (!file) return;
    if (!file.type.startsWith('audio/')) {
      showToast('Selecciona un archivo de audio válido', 'warning');
      return false;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast('Archivo muy grande. Máximo 5MB.', 'warning');
      return false;
    }
    try {
      if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      const arrayBuffer = await file.arrayBuffer();
      const buffer = await this.ctx.decodeAudioData(arrayBuffer.slice(0));
      // Guardar en IndexedDB (admite los 5 MB; localStorage no)
      await audioStore.guardarAudio(arrayBuffer, file.name, file.type);
      this.bufferPersonalizado = buffer;
      this.nombrePersonalizado = file.name;
      actualizarNombreAudio(file.name);
      showToast('Audio guardado correctamente', 'success');
      return true;
    } catch (e) {
      showToast('No se pudo cargar o guardar el audio. Prueba con otro archivo (MP3/WAV/OGG).', 'error');
      return false;
    }
  }

  async cargarGuardado() {
    try {
      await audioStore.migrarAudioLegacy(); // audio antiguo en localStorage → IndexedDB
      const reg = await audioStore.leerAudio();
      if (!reg) return;
      if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.bufferPersonalizado = await this.ctx.decodeAudioData(reg.datos.slice(0));
      this.nombrePersonalizado = reg.nombre;
      actualizarNombreAudio(reg.nombre);
    } catch {
      // Audio dañado: volver al beep sin tocar nada más
      this.bufferPersonalizado = null;
      this.nombrePersonalizado = null;
    }
  }

  resetear() {
    showConfirm('¿Volver al sonido predeterminado?', () => {
      audioStore.borrarAudio().catch(() => {});
      localStorage.removeItem('audioPersonalizado');
      localStorage.removeItem('audioPersonalizadoNombre');
      this.bufferPersonalizado = null;
      this.nombrePersonalizado = null;
      actualizarNombreAudio('Beep (predeterminado)');
      showToast('Audio restaurado', 'success');
    });
  }

  probar() {
    const testId = 'test';
    this.stop(testId);
    this.play(testId);
    setTimeout(() => this.stop(testId), 2000);
  }
}

const audioManager = new AudioManager();

async function initAudio() { return audioManager.init(); }
function desbloquearAudioPorGesto() { audioManager.desbloquear(); }
function playBeep(timerId = 'default') { audioManager.play(timerId); }
function stopBeep(timerId = 'default') { audioManager.stop(timerId); }
function stopAllBeep() { audioManager.stopAll(); }

async function cargarAudioPersonalizado(input) {
  const file = input.files[0];
  const result = await audioManager.cargarPersonalizado(file);
  if (input) input.value = '';
  return result;
}

function resetearAudioPorDefecto() { audioManager.resetear(); }
function probarSonido() { audioManager.probar(); }

function actualizarNombreAudio(nombre) {
  const el = document.getElementById('nombre-audio-display');
  if (el) el.textContent = nombre;
}

window.cargarAudioPersonalizado = cargarAudioPersonalizado;
window.resetearAudioPorDefecto = resetearAudioPorDefecto;
window.probarSonido = probarSonido;

// ── Control de amplificación (GainNode) ──────────────────
window.ajustarGainAudio = function (value) {
  const v = parseFloat(value);
  audioManager.setGain(v);
  const label = document.getElementById('audio-gain-val');
  if (label) label.textContent = v.toFixed(1) + '×';
};

let _permisoNotifPedido = false;
function pedirPermisoNotificaciones() {
  if (_permisoNotifPedido) return;
  _permisoNotifPedido = true;
  try {
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }
  } catch { /* navegador sin soporte */ }
}

// ── Notificación SW cuando el timer termina en background ─
// Usa el canal de notificaciones (distinto del volumen de medios)
function notificarTimerTerminado(texto = '¡Descanso terminado! Siguiente serie') {
  if (!document.hidden) return; // Solo si la app está en segundo plano
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.ready
    .then(reg => reg.showNotification('⏱️ Gym Tracker', {
      body: texto,
      icon: './icons/icon-192.png',
      badge: './icons/icon-192.png',
      vibrate: [200, 100, 200],
      requireInteraction: false,
      tag: 'gym-timer' // reemplaza notificaciones anteriores del mismo tag
    }))
    .catch(() => {}); // silencioso si falla
}

// ══════════════════════════════════════════════════════
// ESTADO CENTRAL
// ══════════════════════════════════════════════════════
let estadoApp = JSON.parse(localStorage.getItem("estadoApp")) || {
  pantalla: "menu", diaActual: null, ejerciciosDia: null,
  tiempoRestante: 0, tiempoFinal: null
};

let diaActual = null;
let ejerciciosDia = [];
let notasSesion = "";
let sesionStartTime = null; // Para calcular duración de la sesión
let sesionActiva = false;   // hay un entrenamiento abierto (entre abrir el día y finalizar o salir)
let guiaUltimaVisible = false; // la guía "última sesión" sigue visible aunque se vuelva a dibujar el día
let _rutinaCargadaId = null;   // rutina activa con la que se cargaron los ejercicios del día

// ══════════════════════════════════════════════════════
// MODO 2 PERSONAS — TIMERS INDEPENDIENTES POR EJERCICIO
// ══════════════════════════════════════════════════════
let modoDosPersonas = localStorage.getItem('modoDosPersonas') === 'true';

const ejercicioTimers = {};

function getTimerId(ejIndex, persona) {
  return `ej-${ejIndex}-p${persona}`;
}

function iniciarTimerEjercicio(ejIndex, persona = 0) {
  const ej = ejerciciosDia[ejIndex];
  if (!ej) return;
  pedirPermisoNotificaciones();
  const segundos = ej.descanso || 90;
  const timerId = getTimerId(ejIndex, persona);

  if (!ejercicioTimers[ejIndex]) ejercicioTimers[ejIndex] = {};

  const id = modoDosPersonas ? `timer-ej-${ejIndex}-${persona}` : `timer-ej-${ejIndex}`;
  const btn = document.getElementById(id);
  if (btn?.classList.contains('timer-ej-done')) {
    audioManager.stop(timerId);
    actualizarBtnTimer(ejIndex, persona, segundos, false, false);
    if (ejercicioTimers[ejIndex][persona]) {
      clearInterval(ejercicioTimers[ejIndex][persona].intervalId);
      delete ejercicioTimers[ejIndex][persona];
    }
    return;
  }

  if (ejercicioTimers[ejIndex][persona]) {
    clearInterval(ejercicioTimers[ejIndex][persona].intervalId);
    delete ejercicioTimers[ejIndex][persona];
    actualizarBtnTimer(ejIndex, persona, segundos, false, false);
    audioManager.stop(timerId);
    return;
  }

  const endTime = Date.now() + segundos * 1000;
  const intervalId = setInterval(() => {
    const remaining = Math.max(0, Math.round((endTime - Date.now()) / 1000));
    actualizarBtnTimer(ejIndex, persona, remaining, true, remaining === 0);

    if (remaining <= 0) {
      clearInterval(intervalId);
      ejercicioTimers[ejIndex][persona] = { ...ejercicioTimers[ejIndex][persona], intervalId: null };
      audioManager.play(timerId);
      vibrarSiActivo();
      notificarTimerTerminado('¡Descanso terminado! Vuelve a la app para continuar.');
      const card = document.querySelector(`.ejercicio[data-ej-index="${ejIndex}"]`);
      if (card) {
        card.classList.add('timer-ej-flash');
        setTimeout(() => card.classList.remove('timer-ej-flash'), 2000);
      }
    }
  }, 500);

  ejercicioTimers[ejIndex][persona] = { intervalId, endTime, timerId };
  actualizarBtnTimer(ejIndex, persona, segundos, true, false);
}

function actualizarBtnTimer(ejIndex, persona, remaining, activo, done) {
  const id = modoDosPersonas ? `timer-ej-${ejIndex}-${persona}` : `timer-ej-${ejIndex}`;
  const btn = document.getElementById(id);
  if (!btn) return;
  const label = persona === 0 ? (modoDosPersonas ? 'P1 ' : '') : 'P2 ';
  if (done) {
    btn.textContent = `🔔 ${label}¡Toca para parar!`;
  } else {
    btn.textContent = `⏱ ${label}${formatearTiempo(remaining)}`;
  }
  btn.classList.toggle('timer-ej-activo', activo && !done);
  btn.classList.toggle('timer-ej-done', done);
}

function cancelarTodosTimersEjercicio(ejIndex) {
  if (!ejercicioTimers[ejIndex]) return;
  [0, 1].forEach(p => {
    if (ejercicioTimers[ejIndex][p]) {
      clearInterval(ejercicioTimers[ejIndex][p].intervalId);
      audioManager.stop(ejercicioTimers[ejIndex][p].timerId);
      delete ejercicioTimers[ejIndex][p];
    }
  });
}

window.toggleTimerEjercicio = (ejIndex, persona = 0) => iniciarTimerEjercicio(ejIndex, persona);

window.toggleModoDosPersonas = function () {
  modoDosPersonas = !modoDosPersonas;
  localStorage.setItem('modoDosPersonas', modoDosPersonas);
  markDirty();
  Object.keys(ejercicioTimers).forEach(i => cancelarTodosTimersEjercicio(Number(i)));
  const btn = document.getElementById('btn-modo-personas');
  if (btn) {
    btn.textContent = modoDosPersonas ? '👥 2 personas' : '👤 1 persona';
    btn.classList.toggle('modo-activo', modoDosPersonas);
  }
  renderDia();
  showToast(modoDosPersonas ? 'Modo 2 personas activado' : 'Modo 1 persona activado', 'info', 2000);
};

// ══════════════════════════════════════════════════════
// RUTINA
// ══════════════════════════════════════════════════════
const rutina = {};

function obtenerRutinaCompleta() {
  const rutinaActiva = obtenerRutinaActiva();
  const rutinaData = loadRutinaUsuario(rutinaActiva);
  if (!rutinaData?.dias?.length) return rutina;

  const conv = {};
  rutinaData.dias.forEach((dia, idx) => {
    const key = rutinaActiva === RUTINA_BASE_KEY ? `dia_base_${idx}` : `dia_personalizado_${idx}`;
    conv[key] = { nombre: dia.nombre, ejercicios: dia.ejercicios, tieneCronometro: dia.tieneCronometro || false, tieneTimer: dia.tieneTimer !== false };
  });
  return conv;
}

// ══════════════════════════════════════════════════════
// CONFIGURACIÓN
// ══════════════════════════════════════════════════════
let config = JSON.parse(localStorage.getItem("config")) || { pesos: {}, ejerciciosExtra: {}, descansos: {} };
if (!config.descansos) config.descansos = {};
if (!config.incrementos) config.incrementos = {};   // ← NUEVO

function guardarConfig() {
  localStorage.setItem("config", JSON.stringify(config));
  if (typeof markDirty === 'function' && userState?.uid) markDirty();
}

function recargarConfig() {
  config = JSON.parse(localStorage.getItem("config")) || { pesos: {}, ejerciciosExtra: {}, descansos: {} };
  if (!config.descansos) config.descansos = {};
  if (!config.incrementos) config.incrementos = {};   // ← NUEVO
}
window.recargarConfig = recargarConfig;

// ── Claves de configuración por EJERCICIO, separadas por rutina ──
// Antes: "<día>_<ejercicio>" para todas las rutinas (dos rutinas con el mismo nombre de
// día compartían pesos). Ahora: la rutina base conserva su formato (compatibilidad) y las
// demás usan "<idRutina>::<día>_<ejercicio>". Si no existe la clave nueva se lee la antigua.
const safeKey = (str) => String(str ?? '').replace(/[<>\"']/g, '');

function claveEj(nombreDia, nombreEj, rutinaId = obtenerRutinaActiva()) {
  const base = `${safeKey(nombreDia)}_${safeKey(nombreEj)}`;
  return rutinaId === RUTINA_BASE_KEY ? base : `${rutinaId}::${base}`;
}

function leerCfg(tabla, nombreDia, nombreEj, rutinaId = obtenerRutinaActiva()) {
  const t = config[tabla] || {};
  const nueva = claveEj(nombreDia, nombreEj, rutinaId);
  if (t[nueva] !== undefined) return t[nueva];
  const legacy = `${safeKey(nombreDia)}_${safeKey(nombreEj)}`;
  return t[legacy];
}

function escribirCfg(tabla, nombreDia, nombreEj, valor, rutinaId = obtenerRutinaActiva()) {
  if (!config[tabla]) config[tabla] = {};
  config[tabla][claveEj(nombreDia, nombreEj, rutinaId)] = valor;
}

// Llamado por el editor de rutinas: fija el peso de trabajo de un ejercicio
window.fijarPesoConfig = function (rutinaId, nombreDia, nombreEj, peso) {
  escribirCfg('pesos', nombreDia, nombreEj, Number(peso) || 0, rutinaId);
  guardarConfig();
};

// Llamado por el editor al renombrar un ejercicio o un día: conserva pesos, descansos e incrementos
window.migrarClavesConfig = function (rutinaId, dia, ejViejo, diaNuevo, ejNuevo) {
  ['pesos', 'descansos', 'incrementos'].forEach(tabla => {
    const v = leerCfg(tabla, dia, ejViejo, rutinaId);
    if (v !== undefined) {
      escribirCfg(tabla, diaNuevo, ejNuevo, v, rutinaId);
    }
  });
  guardarConfig();
};

// Peso de trabajo vigente (el guardado en config tiene prioridad sobre el de la plantilla de la rutina)
window.pesoConfigActual = function (rutinaId, nombreDia, nombreEj, porDefecto) {
  const v = parseFloat(leerCfg('pesos', nombreDia, nombreEj, rutinaId));
  return (v >= 0 && !Number.isNaN(v)) ? v : (Number(porDefecto) || 0);
};

// El editor cambió el descanso de un ejercicio: el valor guardado en config tiene prioridad al cargar,
// así que hay que actualizarlo también o el cambio no se vería.
window.fijarDescansoConfig = function (rutinaId, nombreDia, nombreEj, seg) {
  escribirCfg('descansos', nombreDia, nombreEj, Number(seg) || 0, rutinaId);
  guardarConfig();
};

// El editor renombró un día: mueve pesos/descansos/incrementos de todos sus ejercicios
// y los ejercicios extra añadidos desde la pantalla del día.
window.renombrarDiaConfig = function (rutinaId, diaViejo, diaNuevo, nombresEjercicios) {
  if (diaViejo === diaNuevo) return;
  (nombresEjercicios || []).forEach(n => window.migrarClavesConfig(rutinaId, diaViejo, n, diaNuevo, n));
  const extra = config.ejerciciosExtra || {};
  if (extra[diaViejo] && !extra[diaNuevo]) {
    extra[diaNuevo] = extra[diaViejo];
    delete extra[diaViejo];
    guardarConfig();
  }
};

// El editor duplicó un día: el día nuevo parte de los mismos pesos de trabajo, descansos e incrementos
// que tiene ahora el original (todo se guarda por nombre de día, así que hay que copiarlo).
window.copiarConfigDia = function (rutinaId, diaOrigen, diaNuevo, nombresEjercicios) {
  (nombresEjercicios || []).forEach(n => {
    ['pesos', 'descansos', 'incrementos'].forEach(tabla => {
      const v = leerCfg(tabla, diaOrigen, n, rutinaId);
      if (v !== undefined) escribirCfg(tabla, diaNuevo, n, v, rutinaId);
    });
  });
  // Ejercicios añadidos a mano a ese día (si los hay)
  const extra = config.ejerciciosExtra?.[diaOrigen];
  if (extra?.length) { config.ejerciciosExtra[diaNuevo] = JSON.parse(JSON.stringify(extra)); }
  guardarConfig();
};

function migrarPesosAntiguos() {
  if (localStorage.getItem('pesosMigradosV91') === 'true') return;
  
  const migracion = {
    'torso_fuerza': 'Día 1 – Torso Fuerza', 'pierna_fuerza': 'Día 2 – Pierna Fuerza',
    'torso_hipertrofia': 'Día 3 – Torso Hipertrofia', 'pierna_hipertrofia': 'Día 4 – Pierna Hipertrofia',
    'potencia': 'Día 5 – Potencia'
  };
  let migrado = false;
  const nuevoPesos = { ...config.pesos };
  Object.keys(config.pesos).forEach(key => {
    Object.keys(migracion).forEach(viejo => {
      if (key.startsWith(viejo + '_')) {
        const ejNombre = key.substring(viejo.length + 1);
        const ejNombreSafe = ejNombre.replace(/[<>\"']/g, '');
        const nuevaKey = `${migracion[viejo]}_${ejNombreSafe}`;
        if (!nuevoPesos[nuevaKey]) { nuevoPesos[nuevaKey] = config.pesos[key]; migrado = true; }
      }
    });
  });
  if (migrado) {
    config.pesos = nuevoPesos;
    guardarConfig();
    localStorage.setItem('pesosMigradosV91', 'true');
  }
}
migrarPesosAntiguos();

// ══════════════════════════════════════════════════════
// TEMPORIZADOR GLOBAL (sidebar derecho)
// ══════════════════════════════════════════════════════
let timerID = null;
let tiempoRestante = 0;
let tiempoFinal = null;
let timerPausado = false;
let timers = JSON.parse(localStorage.getItem("timers")) || [
  { nombre: "Descanso corto", minutos: 1, segundos: 30 },
  { nombre: "Descanso largo", minutos: 4, segundos: 0 }
];

function guardarTimers() { localStorage.setItem("timers", JSON.stringify(timers)); markDirty(); }

function renderTimers() {
  const cont = document.getElementById("lista-timers");
  if (!cont) return;
  cont.innerHTML = timers.map((t, i) => `
    <div class="timer-item">
      <p>${escapeHtml(t.nombre)} — ${t.minutos}m ${t.segundos}s</p>
      <button onclick="iniciarTemporizador(${t.minutos},${t.segundos})">▶️</button>
      <button onclick="borrarTimer(${i})">🗑️</button>
    </div>`).join('');
}

let timerDuracionTotal = 0;
let svgRadio = 52;

function calcularCircunferencia() {
  const arc = document.getElementById('timer-arc');
  if (arc) {
    const r = arc.getAttribute('r');
    if (r) svgRadio = parseFloat(r);
  }
  return 2 * Math.PI * svgRadio;
}

function actualizarArcSVG() {
  const arc = document.getElementById('timer-arc');
  const estado = document.getElementById('timer-estado');
  if (!arc) return;
  
  const circunf = calcularCircunferencia();
  
  if (timerDuracionTotal <= 0) {
    arc.style.strokeDashoffset = '0';
    arc.classList.remove('warning', 'done');
    if (estado) estado.textContent = tiempoRestante > 0 ? formatearTiempo(tiempoRestante) : 'Listo';
    return;
  }
  const pct = tiempoRestante / timerDuracionTotal;
  const offset = circunf * (1 - pct);
  arc.style.strokeDashoffset = String(offset);
  arc.classList.remove('warning', 'done');
  if (tiempoRestante <= 0) arc.classList.add('done');
  else if (pct < 0.25) arc.classList.add('warning');
  if (estado) {
    if (tiempoRestante <= 0) estado.textContent = '✅ Listo';
    else if (timerPausado) estado.textContent = 'Pausado';
    else estado.textContent = 'Descansando';
  }
}

function mostrarTiempo() {
  const el = document.getElementById("tiempo");
  if (el) el.innerText = formatearTiempo(tiempoRestante);
  actualizarArcSVG();
}

function añadirTimer() {
  const overlay = document.getElementById('modal-confirm-overlay');
  if (!overlay) {
    showPrompt("Nombre del timer:", "ej: Descanso medio", nombre => {
      showPrompt("Minutos:", "0", minStr => {
        showPrompt("Segundos:", "90", segStr => {
          timers.push({ nombre, minutos: Number(minStr) || 0, segundos: Number(segStr) || 0 });
          guardarTimers(); renderTimers();
          showToast("Timer añadido: " + nombre, "success");
        });
      });
    });
    return;
  }
  
  const msgEl = document.getElementById('modal-confirm-msg');
  msgEl.innerHTML = `
    <strong>➕ Nuevo timer</strong>
    <div style="margin-top:12px;display:flex;flex-direction:column;gap:8px;">
      <input id="_timer-nombre" placeholder="Nombre (ej: Descanso medio)" style="margin:0;" value="Descanso" />
      <div style="display:flex;gap:8px;">
        <input id="_timer-min" type="number" min="0" max="99" placeholder="Min" style="margin:0;flex:1;" value="1" />
        <input id="_timer-seg" type="number" min="0" max="59" placeholder="Seg" style="margin:0;flex:1;" value="30" />
      </div>
      <div style="display:flex;gap:4px;font-size:calc(12px*var(--fs));color:var(--text-secondary);">
        <span style="flex:1;text-align:center;">Minutos</span>
        <span style="flex:1;text-align:center;">Segundos</span>
      </div>
    </div>`;
  overlay.classList.remove('oculto');
  const btnSi = document.getElementById('modal-confirm-si');
  const btnNo = document.getElementById('modal-confirm-no');
  btnSi.textContent = '✓ Añadir';
  btnNo.textContent = 'Cancelar';
  const newSi = btnSi.cloneNode(true);
  const newNo = btnNo.cloneNode(true);
  btnSi.replaceWith(newSi);
  btnNo.replaceWith(newNo);
  newSi.onclick = () => {
    const nombre = document.getElementById('_timer-nombre')?.value.trim() || 'Timer';
    const min = Number(document.getElementById('_timer-min')?.value) || 0;
    const seg = Number(document.getElementById('_timer-seg')?.value) || 0;
    overlay.classList.add('oculto');
    newSi.textContent = 'Confirmar'; newNo.textContent = 'Cancelar';
    if (min === 0 && seg === 0) { showToast('Duración no puede ser 0', 'warning'); return; }
    timers.push({ nombre, minutos: min, segundos: seg });
    guardarTimers(); renderTimers();
    showToast("Timer añadido: " + nombre, "success");
  };
  newNo.onclick = () => {
    overlay.classList.add('oculto');
    newSi.textContent = 'Confirmar'; newNo.textContent = 'Cancelar';
  };
  setTimeout(() => document.getElementById('_timer-nombre')?.select(), 80);
}

function borrarTimer(i) { timers.splice(i, 1); guardarTimers(); renderTimers(); }

function iniciarTemporizador(min = 0, seg = 0) {
  if (timerID) { showToast('Ya hay un timer en marcha. Pulsa ⏹️ Reset para cambiarlo.', 'info', 2500); return; }
  pedirPermisoNotificaciones();
  const btnPausar = document.querySelector('#temporizador .btn-pausar');
  if (timerPausado && tiempoRestante > 0) {
    tiempoFinal = Date.now() + tiempoRestante * 1000;
    timerPausado = false;
  } else {
    tiempoRestante = min * 60 + seg;
    timerDuracionTotal = tiempoRestante;
    tiempoFinal = Date.now() + tiempoRestante * 1000;
  }
  if (btnPausar) btnPausar.textContent = "⏸️ Pausar";
  timerID = setInterval(() => {
    tiempoRestante = Math.max(0, Math.round((tiempoFinal - Date.now()) / 1000));
    mostrarTiempo();
    if (tiempoRestante <= 0) {
      clearInterval(timerID); timerID = null; timerPausado = false;
      audioManager.play('global-timer');
      notificarTimerTerminado('¡Timer terminado! Vuelve a la app.');
      mostrarModalTimer();
    }
  }, 1000);
  guardarEstadoApp();
}

function pausarTemporizador() {
  const btnPausar = document.querySelector('#temporizador .btn-pausar');
  if (!timerID && timerPausado) {
    iniciarTemporizador(0, tiempoRestante);
    if (btnPausar) btnPausar.textContent = "⏸️ Pausar";
  } else if (timerID) {
    clearInterval(timerID); timerID = null;
    tiempoRestante = Math.max(0, Math.round((tiempoFinal - Date.now()) / 1000));
    timerPausado = true;
    guardarEstadoApp();
    audioManager.stop('global-timer');
    if (btnPausar) btnPausar.textContent = "▶️ Reanudar";
  }
}

function resetTemporizador() {
  clearInterval(timerID); timerID = null; timerPausado = false;
  tiempoRestante = 0; tiempoFinal = null; timerDuracionTotal = 0;
  audioManager.stop('global-timer');
  mostrarTiempo();
  const arc = document.getElementById('timer-arc');
  if (arc) { arc.style.strokeDashoffset = '0'; arc.classList.remove('warning', 'done'); }
  const estado = document.getElementById('timer-estado');
  if (estado) estado.textContent = 'Listo';
  const btnPausar = document.querySelector('#temporizador .btn-pausar');
  if (btnPausar) btnPausar.textContent = "⏸️ Pausar";
  guardarEstadoApp();
}

// ══════════════════════════════════════════════════════
// HIT CRONÓMETRO - Con persistencia de estado
// ══════════════════════════════════════════════════════
let hitActivo = false, hitInicio = null, hitAcumulado = 0, hitInterval = null, hitTipo = "HIT 1";

function iniciarHIT() {
  if (hitActivo) return;
  hitActivo = true; hitInicio = Date.now();
  hitInterval = setInterval(() => {
    const total = hitAcumulado + Math.round((Date.now() - hitInicio) / 1000);
    const el = document.getElementById("tiempo-hit");
    if (el) el.innerText = formatearTiempo(total);
    if (total % 10 === 0) guardarEstadoApp(); // no escribir en localStorage cada segundo
  }, 1000);
  guardarEstadoApp();
}

function pausarHIT() {
  if (!hitActivo) return;
  hitAcumulado += Math.round((Date.now() - hitInicio) / 1000);
  hitActivo = false; clearInterval(hitInterval);
  guardarEstadoApp();
}

function resetHIT() {
  hitActivo = false; clearInterval(hitInterval);
  hitAcumulado = 0; hitInicio = null;
  const el = document.getElementById("tiempo-hit");
  if (el) el.innerText = "0:00";
  guardarEstadoApp();
}

function obtenerTiempoHIT() {
  if (hitActivo) pausarHIT();
  return hitAcumulado;
}

// ══════════════════════════════════════════════════════
// NAVEGACIÓN
// ══════════════════════════════════════════════════════
function ocultarTodas() {
  ['pantalla-auth', 'pantalla-perfil', 'pantalla-dia', 'pantalla-historial',
    'pantalla-detalle', 'pantalla-medidas', 'pantalla-audio',
    'pantalla-editor', 'pantalla-resumen', 'pantalla-ai-import', 'pantalla-guia-tempo',
    'pantalla-estadisticas', 'pantalla-progreso', 'pantalla-progresion-rutina',
    'menu'].forEach(id => document.getElementById(id)?.classList.add('oculto'));
}

function abrirDia(diaKey) {
  desbloquearAudioPorGesto();
  guardarEstadoApp();
  diaActual = diaKey;
  lastEjerciciosDiaHash = null; // siempre dibujar de cero al entrar
  navPush();
  ocultarTodas();
  document.getElementById("pantalla-dia").classList.remove("oculto");

  const rutinaActual = obtenerRutinaCompleta();
  if (!rutinaActual[diaKey]) { showToast("Este día no existe", "warning"); volverMenu(); return; }

  const tituloDia = document.getElementById("titulo-dia");
  if (tituloDia) tituloDia.innerText = rutinaActual[diaKey].nombre;

  const btn = document.getElementById('btn-modo-personas');
  if (btn) {
    btn.textContent = modoDosPersonas ? '👥 2 personas' : '👤 1 persona';
    btn.classList.toggle('modo-activo', modoDosPersonas);
  }

  notasSesion = "";
  sesionStartTime = Date.now();
  sesionActiva = true;
  guiaUltimaVisible = false;
  activarWakeLock();
  fijarOrientacionPortrait();
  iniciarAutoGuardado();
  const notasEl = document.getElementById('notas-sesion-input');
  if (notasEl) notasEl.value = "";

  cargarEjerciciosDia();
  resetTemporizador();
  renderDia();   // dibuja también los botones de "última sesión"
  setTimeout(verificarSesionParcial, 600); // leve delay para que renderDia esté listo

  aplicarConfigDia(diaKey);
}

// Muestra/oculta cronómetro HIT y temporizador según la configuración del día
function aplicarConfigDia(diaKey) {
  const rutinaActiva = obtenerRutinaActiva();
  let mostrarCrono = false, mostrarTimer = true;
  const rutinaData = loadRutinaUsuario(rutinaActiva);
  if (rutinaData?.dias) {
    const match = String(diaKey).match(/dia_(?:base|personalizado)_(\d+)/);
    if (match) {
      const diaConf = rutinaData.dias[parseInt(match[1])];
      if (diaConf) { mostrarCrono = diaConf.tieneCronometro || false; mostrarTimer = diaConf.tieneTimer !== false; }
    }
  }
  document.getElementById("hit-crono")?.classList.toggle('oculto', !mostrarCrono);
  document.getElementById("temporizador")?.classList.toggle('oculto', !mostrarTimer);
}

// ══════════════════════════════════════════════════════
// CARGAR EJERCICIOS
// ══════════════════════════════════════════════════════
// Incremento sugerido: cargas pequeñas suben poco (2 kg sobre 5 kg de elevaciones laterales
// es un salto del 40 %); los básicos pesados suben 2,5 kg.
function incrementoPorDefecto(peso) {
  const p = Number(peso) || 0;
  if (p <= 15) return 1;
  if (p <= 40) return 2;
  return 2.5;
}

function cargarEjerciciosDia() {
  const rutinaActual = obtenerRutinaCompleta();
  if (!rutinaActual[diaActual]) return;
  _rutinaCargadaId = obtenerRutinaActiva();
  const nombreDia = rutinaActual[diaActual].nombre;
  const base = rutinaActual[diaActual].ejercicios || [];
  const extra = config.ejerciciosExtra?.[nombreDia] || [];

  const descansoInteligente = (repsMax) => {
    if (!repsMax || repsMax <= 5) return 180;
    if (repsMax <= 8) return 150;
    if (repsMax <= 12) return 90;
    return 60;
  };

  ejerciciosDia = [...base, ...extra].map(ej => {
    const descanso = leerCfg('descansos', nombreDia, ej.nombre) || ej.descanso || descansoInteligente(ej.repsMax);
    const pesoGuardado = parseFloat(leerCfg('pesos', nombreDia, ej.nombre));
    const pesoTrabajo = ej.alFallo ? 0 : ((pesoGuardado >= 0 && !Number.isNaN(pesoGuardado)) ? pesoGuardado : (parseFloat(ej.peso) || 0));
    // Incremento personalizado guardado o, si no hay, uno razonable según la carga
    const incrementoGuardado = leerCfg('incrementos', nombreDia, ej.nombre);
    const inc = ej.alFallo ? 0 : (incrementoGuardado !== undefined ? incrementoGuardado : incrementoPorDefecto(pesoTrabajo));

    return {
      nombre: ej.nombre,
      series: ej.series,
      repsMin: ej.repsMin,
      repsMax: ej.repsMax,
      peso: pesoTrabajo,
      reps: Array(ej.series).fill(""),
      incremento: inc,
      noProgresar: ej.alFallo ? true : false,
      alFallo: ej.alFallo || false,
      descanso,
      tempo: ej.tempo || "",
      notas: ej.notas || "",
      musculo: ej.musculo || ""
    };
  });

  ejerciciosDia = aplicarFactorDeload(ejerciciosDia);
  ejerciciosDia.forEach(ej => { ej.reps = Array(ej.series).fill(""); });
}

// ══════════════════════════════════════════════════════
// RENDERIZAR DÍA - Optimizado con diffing parcial
// ══════════════════════════════════════════════════════
let lastEjerciciosDiaHash = null;

function calcularHashEjercicios() {
  // Incluir modoDosPersonas para que cambiar de modo fuerce re-renderizado de los timers
  const modoPrefix = modoDosPersonas ? '2p' : '1p';
  // Incluye todo lo que se dibuja (antes faltaban tempo, notas y músculo → pantalla desactualizada)
  return modoPrefix + '|' + ejerciciosDia.map(e => [e.nombre, e.series, e.repsMin, e.repsMax, e.peso, e.descanso, e.alFallo, e.tempo, e.notas, e.musculo, e.incremento, e.noProgresar].join('~')).join('|');
}

// Clase CSS de una serie según las reps escritas
function claseSerie(ej, rep) {
  if (ej.alFallo || rep === "" || rep === null || rep === undefined) return "";
  const n = Number(rep);
  if (n >= ej.repsMax) return "serie-ok";
  if (n < ej.repsMin) return "serie-fail";
  return "serie-mid";
}

function renderDia() {
  const cont = document.getElementById("contenido");
  if (!cont) return;

  const currentHash = calcularHashEjercicios();
  const necesitaRenderCompleto = currentHash !== lastEjerciciosDiaHash;
  lastEjerciciosDiaHash = currentHash;

  if (!necesitaRenderCompleto) {
    actualizarInputsReps();
    return;
  }

  let html = "";

  if (deloadEstaActivo()) {
    html += `<div class="deload-dia-notice">
        💤 <strong>SEMANA DE DELOAD</strong> — Pesos al 70% · Series al 60% · RIR 4-5
        <button onclick="mostrarInfoDeload()" style="background:none;border:none;cursor:pointer;font-size:calc(14px*var(--fs));padding:0 4px;">ℹ️</button>
      </div>`;
  }

  ejerciciosDia.forEach((ej, i) => {
    let seriesHTML = "";
    for (let s = 0; s < ej.series; s++) {
      seriesHTML += `<input type="number" inputmode="numeric" min="0" max="${ej.alFallo ? 999 : Math.max(ej.repsMax, 1) + 20}"
        id="rep-${i}-${s}" placeholder="S${s + 1}" value="${ej.reps[s]}" class="${claseSerie(ej, ej.reps[s])}"
        aria-label="Repeticiones serie ${s + 1} de ${escapeHtml(ej.nombre)}"
        oninput="actualizarSerie(${i},${s},this.value,this)">`;
    }

    const descansoLabel = formatearTiempo(ej.descanso || 90);

    let timerBtns = "";
    if (modoDosPersonas) {
      timerBtns = `
        <div class="timer-doble">
          <button id="timer-ej-${i}-0" class="btn-timer-ej" onclick="toggleTimerEjercicio(${i},0)" title="Descanso P1: ${descansoLabel}">⏱ P1 ${descansoLabel}</button>
          <button id="timer-ej-${i}-1" class="btn-timer-ej" onclick="toggleTimerEjercicio(${i},1)" title="Descanso P2: ${descansoLabel}">⏱ P2 ${descansoLabel}</button>
          <button class="btn-edit-descanso" onclick="editarDescansoInline(${i})" title="Cambiar tiempo de descanso">⚙️</button>
        </div>`;
    } else {
      timerBtns = `
        <div class="timer-doble">
          <button id="timer-ej-${i}" class="btn-timer-ej" onclick="toggleTimerEjercicio(${i},0)" title="Descanso: ${descansoLabel}">⏱ ${descansoLabel}</button>
          <button class="btn-edit-descanso" onclick="editarDescansoInline(${i})" title="Cambiar tiempo de descanso">⚙️</button>
        </div>`;
    }

    html += `
      <div class="ejercicio" data-ej-index="${i}">
        <div class="ejercicio-header">
          <h3>${escapeHtml(ej.nombre)}</h3>
          <div class="ejercicio-badges">
            ${ej.tempo ? `<span class="badge-tempo" onclick="mostrarGuiaTempoEj(${i})" title="Ver guía de tempo" role="button" tabindex="0">${escapeHtml(ej.tempo)} ❓</span>` : ''}
            ${ej.alFallo ? `<span class="badge-fallo">Al fallo</span>` : ''}
            ${!ej.alFallo && ej.peso >= 20 ? `<span class="badge-tempo" onclick="mostrarCalentamiento(${i})" title="Series de aproximación sugeridas" role="button" tabindex="0">🔥 Calentar</span>` : ''}
            ${ej.musculo ? `<span class="badge-musculo">${escapeHtml(MUSCULOS_MAP[ej.musculo] || ej.musculo)}</span>` : ''}
          </div>
        </div>

        ${ej.notas ? `
        <div class="notas-tecnicas-container">
          <button class="btn-notas" onclick="toggleNotas(${i})">📋 Ver técnica</button>
          <div id="notas-${i}" class="notas-tecnicas oculto">${escapeHtml(ej.notas)}</div>
        </div>` : ''}

        <div class="ejercicio-row">
          ${!ej.alFallo ? `
          <div class="ejercicio-col">
            <label class="col-label">Peso (kg) <button type="button" class="btn-discos" onclick="mostrarDiscos(${i})" title="Calculadora de discos" aria-label="Calculadora de discos">🧮</button></label>
            <input type="number" step="0.5" value="${ej.peso}" onchange="actualizarPesoBase(${i},this.value)">
          </div>` : ''}
          <div class="ejercicio-col">
            <label class="col-label">Objetivo</label>
            <p class="objetivo-texto">${ej.alFallo ? `${ej.series}×Al fallo` : `${ej.series}×${ej.repsMin}${ej.repsMax !== ej.repsMin ? '-' + ej.repsMax : ''}`}</p>
            ${!ej.alFallo && ej.peso > 0 ? `<p class="rm-estimado">1RM ≈ ${calcular1RM(ej.peso, ej.repsMax)}kg</p>` : ''}
          </div>
        </div>

        <div class="series">${seriesHTML}</div>

        <div class="ejercicio-footer">
          <div class="footer-left">
            ${!ej.alFallo ? `
            <span class="label-small">Inc.kg</span>
            <input type="number" step="0.5" id="inc-${i}" class="input-small" value="${ej.incremento}" onchange="actualizarIncremento(${i},this.value)">
            <label class="label-check"><input type="checkbox" id="noprog-${i}" ${ej.noProgresar ? 'checked' : ''} onchange="actualizarNoProgresar(${i},this.checked)"> No prog.</label>
            ` : `<span class="label-small" style="color:var(--text-secondary)">Al fallo técnico</span>`}
          </div>
          ${timerBtns}
        </div>
      </div>`;
  });

  cont.innerHTML = html;
  // El dibujado completo borra los botones de "última sesión" (viven dentro de #contenido):
  // se reponen aquí para que no desaparezcan al restaurar una sesión, cambiar de modo, etc.
  renderBotonesUltimaSesion();
}

function actualizarInputsReps() {
  ejerciciosDia.forEach((ej, i) => {
    ej.reps.forEach((rep, s) => {
      const input = document.getElementById(`rep-${i}-${s}`);
      if (input && input.value !== String(rep)) {
        input.value = rep;
        input.classList.remove("serie-ok", "serie-fail", "serie-mid");
        const c = claseSerie(ej, rep);
        if (c) input.classList.add(c);
      }
    });
  });
}

window.toggleNotas = function (i) {
  const el = document.getElementById(`notas-${i}`);
  if (!el) return;
  el.classList.toggle('oculto');
  const btn = el.previousElementSibling;
  if (btn) btn.textContent = el.classList.contains('oculto') ? '📋 Ver técnica' : '📋 Ocultar técnica';
};

window.editarDescansoInline = function (ejIndex) {
  const ej = ejerciciosDia[ejIndex];
  const actual = ej.descanso || 90;
  const opciones = [
    { label: '30 seg', val: 30 },
    { label: '1 min', val: 60 },
    { label: '1:30', val: 90 },
    { label: '2 min', val: 120 },
    { label: '2:30', val: 150 },
    { label: '3 min', val: 180 },
    { label: '4 min', val: 240 },
    { label: '5 min', val: 300 },
  ];

  const overlay = document.getElementById('modal-descanso-overlay');
  const cont = document.getElementById('modal-descanso-contenido');
  if (!overlay || !cont) {
    showPrompt(`Descanso para "${ej.nombre}" (segundos):`, 'ej: 90', (val) => {
      const seg = parseInt(val);
      if (seg > 0) {
        ejerciciosDia[ejIndex].descanso = seg;
        renderDia();
        showToast(`Descanso: ${formatearTiempo(seg)}`, 'success', 2000);
      }
    }, String(actual));
    return;
  }

  cont.innerHTML = `
    <p style="font-weight:700;margin-bottom:12px;">⏱️ Descanso — ${escapeHtml(ej.nombre)}</p>
    <div class="descanso-opciones">
      ${opciones.map(o => `<button onclick="aplicarDescansoRapido(${ejIndex},${o.val})"
        class="btn-descanso-op${o.val === actual ? ' activo' : ''}">${o.label}</button>`).join('')}
    </div>
    <div style="display:flex;gap:8px;margin-top:10px;align-items:center;">
      <input id="descanso-custom" type="number" min="5" max="900" placeholder="segundos" value="${actual}"
        style="flex:1;margin:0;" />
      <button onclick="aplicarDescansoRapido(${ejIndex}, parseInt(document.getElementById('descanso-custom').value)||90)"
        style="width:auto!important;padding:10px 14px!important;margin:0!important;font-size:calc(13px*var(--fs));">✓</button>
    </div>`;

  overlay.classList.remove('oculto');
};

window.aplicarDescansoRapido = function (ejIndex, seg) {
  if (!seg || seg < 5) return;
  ejerciciosDia[ejIndex].descanso = seg;
  document.getElementById('modal-descanso-overlay')?.classList.add('oculto');

  const rutinaActual = obtenerRutinaCompleta();
  const nombreDia = rutinaActual[diaActual]?.nombre;
  if (nombreDia) {
    escribirCfg('descansos', nombreDia, ejerciciosDia[ejIndex].nombre, seg);
    guardarConfig();
  }

  const descansoLabel = formatearTiempo(seg);
  const btnP1 = document.getElementById(`timer-ej-${ejIndex}-0`) || document.getElementById(`timer-ej-${ejIndex}`);
  if (btnP1 && !btnP1.classList.contains('timer-ej-activo') && !btnP1.classList.contains('timer-ej-done')) {
    const esDoble = !!document.getElementById(`timer-ej-${ejIndex}-0`);
    if (esDoble) {
      btnP1.textContent = `⏱ P1 ${descansoLabel}`;
      const btnP2 = document.getElementById(`timer-ej-${ejIndex}-1`);
      if (btnP2 && !btnP2.classList.contains('timer-ej-activo') && !btnP2.classList.contains('timer-ej-done')) {
        btnP2.textContent = `⏱ P2 ${descansoLabel}`;
      }
    } else {
      btnP1.textContent = `⏱ ${descansoLabel}`;
    }
  }
  showToast(`Descanso "${ejerciciosDia[ejIndex].nombre}": ${descansoLabel} guardado`, 'success', 2000);
};

window.cerrarModalDescanso = () => document.getElementById('modal-descanso-overlay')?.classList.add('oculto');

function actualizarSerie(ejIndex, serieIndex, valor, input) {
  const ej = ejerciciosDia[ejIndex];
  const reps = valor === "" ? "" : Number(valor);
  ej.reps[serieIndex] = reps;
  input.classList.remove("serie-ok", "serie-fail", "serie-mid");
  const c = claseSerie(ej, reps);
  if (c) input.classList.add(c);
  guardarEstadoApp();
}

function guardarPesoBase(nombre, valor) {
  const ra = obtenerRutinaCompleta();
  const nombreDia = ra[diaActual]?.nombre || diaActual;
  escribirCfg('pesos', nombreDia, nombre, parseFloat(valor) || 0);
  guardarConfig();
}

// El nombre ya no viaja dentro del atributo onchange (un apóstrofe lo rompía): se lee del estado
window.actualizarPesoBase = (ejIndex, valor) => {
  const ej = ejerciciosDia[ejIndex];
  if (!ej) return;
  ej.peso = parseFloat(valor) || 0;
  if (!deloadEstaActivo()) {
    guardarPesoBase(ej.nombre, valor);
  }
};

// ══════ NUEVO: Incremento personalizado se guarda en config ══════
window.actualizarIncremento = (ejIndex, valor) => {
  const nuevoValor = parseFloat(valor) || 0;
  ejerciciosDia[ejIndex].incremento = nuevoValor;

  // Guardar en config para que persista
  const ra = obtenerRutinaCompleta();
  const nombreDia = ra[diaActual]?.nombre || diaActual;
  const ej = ejerciciosDia[ejIndex];
  escribirCfg('incrementos', nombreDia, ej.nombre, nuevoValor);
  guardarConfig();

  guardarEstadoApp();
};

window.actualizarNoProgresar = (ejIndex, checked) => { ejerciciosDia[ejIndex].noProgresar = checked; guardarEstadoApp(); };
window.actualizarSerie = actualizarSerie;

function finalizarDia() {
  if (!diaActual) return;

  const hayReps = ejerciciosDia.some(ej => ej.reps.some(r => r !== "" && r !== null));
  if (!hayReps) {
    showConfirm(
      '⚠️ No has registrado ninguna repetición.\n¿Finalizar igualmente y guardar la sesión?',
      _doFinalizarDia,
      () => { }
    );
    return;
  }
  _doFinalizarDia();
}

function leerHistorial() {
  try {
    const h = JSON.parse(localStorage.getItem("historial"));
    return Array.isArray(h) ? h.filter(s => s && Array.isArray(s.ejercicios)) : [];
  } catch { return []; }
}

// Lectura segura SIN filtrar (mantiene los mismos índices que la lista guardada: se usa para
// listar, ver detalle y borrar por posición). Si el dato está corrupto devuelve [] en vez de romper la pantalla.
function leerHistorialCrudo() {
  try {
    const h = JSON.parse(localStorage.getItem("historial") || "[]");
    return Array.isArray(h) ? h : [];
  } catch { return []; }
}

function claveSesion(s) { return `${s?.fecha}|${s?.dia}`; }

// Lápidas: sesiones borradas a propósito, para que una fusión entre dispositivos no las "resucite"
function registrarBorrados(sesiones) {
  let t = [];
  try { t = JSON.parse(localStorage.getItem('historialBorrados') || '[]'); } catch {}
  if (!Array.isArray(t)) t = [];
  sesiones.forEach(s => { const k = claveSesion(s); if (!t.includes(k)) t.push(k); });
  try { localStorage.setItem('historialBorrados', JSON.stringify(t.slice(-3000))); } catch {}
}

let _finalizando = false;

function _doFinalizarDia() {
  // Evita dos sesiones idénticas por doble toque
  if (_finalizando) return;
  _finalizando = true;
  setTimeout(() => { _finalizando = false; }, 2000);

  Object.keys(ejercicioTimers).forEach(i => cancelarTodosTimersEjercicio(Number(i)));
  audioManager.stopAll();
  detenerAutoGuardado();
  limpiarAutoGuardado();

  const rutinaActual = obtenerRutinaCompleta();
  const sesion = {
    fecha: new Date().toISOString(),
    rutinaId: obtenerRutinaActiva(),
    dia: rutinaActual[diaActual]?.nombre || "Día desconocido",
    notas: notasSesion,
    duracionMin: sesionStartTime ? Math.max(1, Math.round((Date.now() - sesionStartTime) / 60000)) : null,
    ejercicios: (ejerciciosDia.some(ejercicioHecho) ? ejerciciosDia.filter(ejercicioHecho) : ejerciciosDia)
      .map(ej => ({ nombre: ej.nombre, peso: ej.peso, reps: [...ej.reps] })),
    tiempoHIT: obtenerTiempoHIT() || null,
    tipoHIT: hitTipo || null,
    deload: deloadEstaActivo() // las sesiones de deload no cuentan como récords ni en las gráficas
  };

  let huboProgresion = false;
  const detalles = [];
  const enDeload = sesion.deload;

  const cambiosPeso = [];

  ejerciciosDia.forEach(ej => {
    const completo = ej.repsMax > 0 && ej.reps.every(r => Number(r) >= ej.repsMax);
    if (enDeload) {
      detalles.push(`${ej.nombre}: 💤 Deload — ${ej.reps.filter(r => r !== "").join("/")} reps a ${ej.peso}kg`);
    } else if (!ej.alFallo && completo && !ej.noProgresar) {
      const nuevoPeso = parseFloat((ej.peso + ej.incremento).toFixed(2));
      cambiosPeso.push({ nombre: ej.nombre, pesoAnterior: ej.peso, pesoNuevo: nuevoPeso, incremento: ej.incremento });
      ej.peso = nuevoPeso;
      huboProgresion = true;
      detalles.push(`${ej.nombre}: PROGRESO +${ej.incremento}kg → ${ej.peso}kg`);
    } else if (ej.alFallo) {
      const maxReps = Math.max(...ej.reps.filter(r => r !== "").map(Number), 0);
      detalles.push(`${ej.nombre}: Al fallo — ${ej.reps.filter(r => r !== "").join("/")} reps (máx: ${maxReps})`);
    } else {
      detalles.push(`${ej.nombre}: NO progresó`);
    }
  });

  cambiosPeso.forEach(c => guardarPesoBase(c.nombre, c.pesoNuevo));

  const historial = leerHistorial();
  historial.push(sesion);
  try {
    localStorage.setItem("historial", JSON.stringify(historial));
  } catch (e) {
    _finalizando = false;
    showToast('❌ No se pudo guardar la sesión: almacenamiento lleno. Exporta un backup y libera espacio.', 'error', 7000);
    return;
  }
  markDirty();

  // ── Detección automática de Récords Personales ─────────────────────
  const historialPrevio = historial.slice(0, -1).filter(s => !s.deload); // sin esta sesión ni deloads
  const prsNuevos = [];
  sesion.ejercicios.forEach(ej => {
    if (sesion.deload) return;
    if (!ej.peso || ej.peso <= 0 || !ejercicioHecho(ej)) return;
    const previos = historialPrevio
      .flatMap(s => s.ejercicios)
      .filter(e => e.nombre === ej.nombre && e.peso > 0 && ejercicioHecho(e));
    if (previos.length === 0) return; // Primera vez — no es PR porque no hay referencia
    const maxPrevio = Math.max(...previos.map(e => e.peso));
    if (ej.peso > maxPrevio) {
      prsNuevos.push({ nombre: ej.nombre, peso: ej.peso, previo: maxPrevio });
    }
  });
  if (prsNuevos.length > 0) {
    setTimeout(() => {
      prsNuevos.forEach(pr => {
        showToast(`🏆 ¡NUEVO RÉCORD! ${pr.nombre}: ${pr.peso}kg (+${(pr.peso - pr.previo).toFixed(1)}kg)`, 'success', 5000);
      });
    }, 600);
  }
  guardarConfig();

  sesionActiva = false;
  guiaUltimaVisible = false;
  cargarEjerciciosDia(); // reps vacías y pesos/incrementos recalculados desde la configuración
  resetTemporizador();
  resetHIT();
  lastEjerciciosDiaHash = null;
  renderDia();

  mostrarPantallaResumen(sesion, huboProgresion, detalles, enDeload);
  guardarEstadoApp();   // ya no estamos en el día: si se cierra la app aquí no debe reabrirse un día vacío
}

function mostrarPantallaResumen(sesion, huboProgresion, detalles, enDeload = false) {
  const pantalla = document.getElementById('pantalla-resumen');
  const contenido = document.getElementById('resumen-contenido');
  if (!pantalla || !contenido) { showToast('Sesión guardada', 'success'); volverMenu(); return; }

  ocultarTodas();
  const fecha = new Date(sesion.fecha).toLocaleString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
  const progresaron = detalles.filter(d => d.includes('PROGRESO'));
  const noProgresaron = detalles.filter(d => d.includes('NO progresó'));
  const alFallo = detalles.filter(d => d.includes('Al fallo'));

  contenido.innerHTML = `
    <div class="resumen-header">
      <div class="resumen-emoji">${huboProgresion ? '🚀' : '💪'}</div>
      <h2>${huboProgresion ? '¡Progreso registrado!' : '¡Sesión completada!'}</h2>
      <p class="resumen-fecha">${fecha}</p>
      <p class="resumen-dia">${escapeHtml(sesion.dia)}</p>
      ${sesion.notas ? `<p class="resumen-notas">"${escapeHtml(sesion.notas)}"</p>` : ''}
    </div>

    <div class="resumen-stats">
      <div class="stat-card"><span class="stat-num">${sesion.ejercicios.length}</span><span class="stat-label">Ejercicios</span></div>
      <div class="stat-card stat-success"><span class="stat-num">${progresaron.length}</span><span class="stat-label">Progresaron 📈</span></div>
      <div class="stat-card"><span class="stat-num">${noProgresaron.length + alFallo.length}</span><span class="stat-label">Sin cambio</span></div>
      ${sesion.duracionMin ? `<div class="stat-card"><span class="stat-num">${sesion.duracionMin}'</span><span class="stat-label">Duración</span></div>` : ''}
    </div>

    ${enDeload ? `<div class="deload-dia-notice" style="margin:12px 0;">💤 Sesión de <strong>Deload</strong> — pesos al 70%, sin progresión registrada</div>` : ''}

    ${progresaron.length > 0 ? `
    <div class="resumen-seccion">
      <h3>📈 PROGRESARON</h3>
      ${progresaron.map(d => {
      const m = d.match(/(.+): PROGRESO \+(\S+) → (\S+)/);
      return m ? `<div class="resumen-item resumen-ok"><span class="item-nombre">${escapeHtml(m[1])}</span><span class="item-detalle">+${m[2]} → <strong>${m[3]}</strong></span></div>` : `<div class="resumen-item resumen-ok">${escapeHtml(d)}</div>`;
    }).join('')}
    </div>` : ''}

    <div class="resumen-seccion">
      <h3>📋 DETALLE COMPLETO</h3>
      ${sesion.ejercicios.map(ej => {
      const pesoLabel = ej.peso > 0 ? `${ej.peso}kg` : 'Al fallo';
      const repsLabel = ej.reps.filter(r => r !== "").join(' / ') || '—';
      return `<div class="resumen-item">
          <span class="item-nombre">${escapeHtml(ej.nombre)}</span>
          <span class="item-detalle">${pesoLabel} — ${repsLabel} reps</span>
        </div>`;
    }).join('')}
    </div>`;

  pantalla.classList.remove('oculto');

  const historialActual = leerHistorialCrudo();
  const idxSesion = historialActual.length - 1;

  const btnDetalle = document.createElement('button');
  btnDetalle.className = 'btn-secondary';
  btnDetalle.style.marginTop = '8px';
  btnDetalle.textContent = '📋 Ver detalle completo';
  btnDetalle.onclick = () => {
    document.getElementById('pantalla-resumen')?.classList.add('oculto');
    abrirHistorial();
    setTimeout(() => verDetalle(idxSesion), 150);
  };
  contenido.appendChild(btnDetalle);
}

window.cerrarResumen = function () {
  document.getElementById('pantalla-resumen')?.classList.add('oculto');
  volverMenu();
};

const cacheUltimaSesion = new Map();

function abrirHistorial() {
  cerrarSidebar();
  guardarEstadoApp();
  navPush();
  ocultarTodas();
  document.getElementById("pantalla-historial").classList.remove("oculto");
  historialFiltro = "";
  historialPagina = 30;
  const searchInput = document.getElementById("historial-buscar");
  if (searchInput) searchInput.value = "";
  renderListaHistorial();
}

function mostrarPantallaHistorial() {
  ocultarTodas();
  document.getElementById("pantalla-historial").classList.remove("oculto");
}

// Desde el detalle: retrocede una entrada del historial (popstate muestra el historial, o el día en curso)
function volverHistorial() {
  if (navAtras()) return;
  if (sesionActiva && _detalleDesdeDia) volverADiaEnCurso(); else mostrarPantallaHistorial();
}

let _detalleDesdeDia = false;

// "Ver detalle →" de la pantalla del día: el detalle se abre ENCIMA del entrenamiento, sin pasar por el
// historial, y al volver se retoma el día con lo que ya habías escrito (antes se acababa en el menú y se perdía).
window.verDetalleDesdeDia = function (index) { verDetalle(index, { desdeDia: true }); };

// Retoma el entrenamiento abierto (sin tocar las repeticiones escritas)
function volverADiaEnCurso(desdePopstate = false) {
  if (!desdePopstate) { navLimpiar(); navPush({ pantalla: 'dia' }); }   // la pila queda solo con el día
  ocultarTodas();
  document.getElementById('pantalla-dia')?.classList.remove('oculto');
  activarWakeLock();
  guardarEstadoApp();
}

function verDetalle(index, opciones = {}) {
  guardarEstadoApp();
  const historial = leerHistorialCrudo();
  const s = historial[index];
  if (!s) return;
  _detalleDesdeDia = opciones.desdeDia === true;
  navPush(_detalleDesdeDia ? { pantalla: 'detalle', index, desde: 'dia' } : { pantalla: 'detalle', index });
  ocultarTodas();
  document.getElementById("pantalla-detalle").classList.remove("oculto");

  const cont = document.getElementById("detalle-sesion");
  cont.innerHTML = `
    <div class="detalle-header">
      <p>${new Date(s.fecha).toLocaleString('es-ES')}</p>
      <p class="resumen-dia">${escapeHtml(s.dia)}</p>
      ${s.duracionMin ? `<p style="color:var(--text-secondary);font-size:calc(13px*var(--fs));">⏱️ Duración: <strong>${s.duracionMin} min</strong></p>` : ''}
      ${s.notas ? `<p class="resumen-notas">"${escapeHtml(s.notas)}"</p>` : ''}
      ${s.tiempoHIT ? `<p class="detalle-hit">⏲️ HIT (${escapeHtml(s.tipoHIT || 'Cardio')}): ${formatearTiempo(s.tiempoHIT)}</p>` : ''}
    </div>
    ${s.ejercicios.map(ej => {
    const pesoLabel = ej.peso > 0 ? `${ej.peso}kg` : 'Al fallo';
    const repsLabel = ej.reps.filter(r => r !== '' && r !== null && r !== undefined).join(' / ') || '—';
    return `<div class="ejercicio-detalle">
        <strong>${escapeHtml(ej.nombre)}</strong>
        <span>${pesoLabel} — ${repsLabel} reps</span>
      </div>`;
  }).join('')}`;
}

function borrarTodoHistorial() {
  showConfirm("¿Borrar todo el historial?\nNo se puede deshacer.", () => {
    registrarBorrados(leerHistorial());
    localStorage.removeItem("historial");
    markDirty();
    cacheUltimaSesion.clear();
    const cont = document.getElementById("lista-historial");
    if (cont) cont.innerHTML = `<p class="texto-vacio">No hay sesiones registradas.</p>`;
    showToast("Historial eliminado", "info");
  });
}

window.borrarSesion = function (index) {
  const historial = leerHistorialCrudo();
  const s = historial[index];
  if (!s) return;
  showConfirm(`¿Borrar sesión del ${new Date(s.fecha).toLocaleString('es-ES')}?`, () => {
    historial.splice(index, 1);
    registrarBorrados([s]);
    localStorage.setItem("historial", JSON.stringify(historial));
    markDirty();
    cacheUltimaSesion.clear();
    renderListaHistorial();
    showToast("Sesión eliminada", "success");
  });
};

function limpiarHistorialDuplicados() {
  let h = leerHistorialCrudo();
  const antes = h.length;
  h = h.filter((s, i, a) => i === a.findIndex(x => x.fecha === s.fecha && x.dia === s.dia));
  localStorage.setItem("historial", JSON.stringify(h));
  markDirty();
  if (h.length < antes) {
    cacheUltimaSesion.clear();
    showToast(`Eliminados ${antes - h.length} duplicados`, "success");
  } else {
    showToast("No se encontraron duplicados", "info");
  }
  abrirHistorial();
}

function abrirMedidas() {
  cerrarSidebar();
  guardarEstadoApp();
  navPush();
  ocultarTodas();
  document.getElementById("pantalla-medidas").classList.remove("oculto");
  cargarMedidas();
}

function leerMedidas() {
  try {
    const h = JSON.parse(localStorage.getItem("historialMedidas") || "[]");
    return Array.isArray(h) ? h.filter(m => m && m.fecha) : [];
  } catch { return []; }
}

// Índice de masa corporal = peso (kg) / altura (m)². Clasificación de la OMS para adultos.
function calcularIMC(pesoKg, alturaCm) {
  if (!(pesoKg > 0) || !(alturaCm >= 100 && alturaCm <= 250)) return null;
  const imc = pesoKg / Math.pow(alturaCm / 100, 2);
  const cat = imc < 18.5 ? 'bajo peso' : imc < 25 ? 'normal' : imc < 30 ? 'sobrepeso' : 'obesidad';
  return { valor: Math.round(imc * 10) / 10, categoria: cat };
}

function registrarMedidasBorradas(fechas) {
  let t = [];
  try { t = JSON.parse(localStorage.getItem('medidasBorradas') || '[]'); } catch {}
  if (!Array.isArray(t)) t = [];
  fechas.forEach(f => { if (f && !t.includes(f)) t.push(f); });
  try { localStorage.setItem('medidasBorradas', JSON.stringify(t.slice(-3000))); } catch {}
}

// Mini gráfica del peso corporal (últimos 30 registros con peso)
function htmlGraficaPesoCorporal(h) {
  const pts = h.filter(m => m.peso > 0).slice(-30);
  if (pts.length < 2) return '';
  const W = 300, H = 70, P = 6;
  const vals = pts.map(m => m.peso);
  const min = Math.min(...vals), max = Math.max(...vals), rango = (max - min) || 1;
  const xy = vals.map((v, i) => [P + i * (W - 2 * P) / (vals.length - 1), H - P - (v - min) * (H - 2 * P) / rango]);
  const delta = Math.round((vals[vals.length - 1] - vals[0]) * 10) / 10;
  return `<div class="grafica-peso-corporal">
    <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Evolución del peso corporal de ${vals[0]} a ${vals[vals.length - 1]} kilos">
      <polyline fill="none" stroke="var(--accent)" stroke-width="2" points="${xy.map(([x, y]) => x.toFixed(1) + ',' + y.toFixed(1)).join(' ')}" />
      <circle cx="${xy[xy.length - 1][0].toFixed(1)}" cy="${xy[xy.length - 1][1].toFixed(1)}" r="3.5" fill="var(--accent)" />
    </svg>
    <p class="import-hint">Peso corporal: ${vals[0]} → ${vals[vals.length - 1]} kg (${delta > 0 ? '+' : ''}${delta} kg en ${pts.length} registros)</p>
  </div>`;
}

function guardarMedidas() {
  const campos = ["peso", "altura", "cintura", "cadera", "pecho", "brazo_relajado", "brazo_contraido", "muslo"];
  const nuevaMedida = { fecha: new Date().toISOString() };
  let algun = false, invalido = false;
  campos.forEach(id => {
    const v = document.getElementById(id)?.value;
    const n = v === "" || v === undefined ? null : Number(v);
    if (n !== null && (!Number.isFinite(n) || n <= 0)) invalido = true;
    nuevaMedida[id] = n;
    if (n !== null) algun = true;
  });
  if (invalido) { showToast("Revisa los valores: deben ser números mayores que 0", "warning"); return; }
  if (!algun)   { showToast("Escribe al menos una medida", "warning"); return; }
  const h = leerMedidas();
  h.push(nuevaMedida);
  try { localStorage.setItem("historialMedidas", JSON.stringify(h)); }
  catch { showToast("No se pudo guardar (almacenamiento lleno)", "error"); return; }
  markDirty();
  showToast("Medidas guardadas", "success");
  campos.forEach(id => { const el = document.getElementById(id); if (el) el.value = ""; });
  cargarMedidas();
}

function cargarMedidas() {
  const cont = document.getElementById("lista-medidas");
  if (!cont) return;
  const h = leerMedidas();
  if (h.length === 0) { cont.innerHTML = `<p class="texto-vacio">Sin medidas registradas.</p>`; return; }

  // Para el IMC se usa la altura de ese registro o, si falta, la última altura anterior conocida
  let ultimaAltura = null;
  const conIMC = h.map(m => {
    if (m.altura > 0) ultimaAltura = m.altura;
    return { m, imc: calcularIMC(m.peso, m.altura > 0 ? m.altura : ultimaAltura) };
  });

  const grafica = htmlGraficaPesoCorporal(h);
  const campo = (rotulo, v, u) => (v !== null && v !== undefined) ? `<p>${rotulo}: ${escapeHtml(String(v))} ${u}</p>` : '';
  cont.innerHTML = grafica + conIMC.slice().reverse().map(({ m, imc }, iRev) => {
    const iReal = h.length - 1 - iRev;
    const prev = iReal > 0 ? h.slice(0, iReal).reverse().find(x => x.peso > 0) : null;
    let delta = '';
    if (m.peso > 0 && prev) {
      const d = Math.round((m.peso - prev.peso) * 10) / 10;
      delta = ` <span style="color:var(--text-secondary);font-size:calc(12px*var(--fs));">(${d > 0 ? '+' : ''}${d} kg vs. anterior)</span>`;
    }
    return `
    <div class="medida-item">
      <div class="medida-item-header">
        <strong>${new Date(m.fecha).toLocaleDateString('es-ES')}</strong>
        <button class="btn-danger-sm" onclick="borrarMedidaIndividual(${iReal})" title="Borrar esta medida" aria-label="Borrar esta medida">🗑️</button>
      </div>
      ${m.peso !== null && m.peso !== undefined ? `<p>Peso: ${escapeHtml(String(m.peso))} kg${delta}</p>` : ''}
      ${imc ? `<p>IMC: ${imc.valor} (${imc.categoria})</p>` : ''}
      ${campo('Altura', m.altura, 'cm')}
      ${campo('Cintura', m.cintura, 'cm')}
      ${campo('Cadera', m.cadera, 'cm')}
      ${campo('Pecho', m.pecho, 'cm')}
      ${campo('Brazo rel.', m.brazo_relajado, 'cm')}
      ${campo('Brazo cont.', m.brazo_contraido, 'cm')}
      ${campo('Muslo', m.muslo, 'cm')}
    </div>`;
  }).join('') + `<p class="import-hint">El IMC es solo orientativo: no distingue músculo de grasa, así que en personas que entrenan fuerza puede salir alto sin que haya exceso de grasa.</p>`;
}

window.borrarMedidaIndividual = function (index) {
  const h = leerMedidas();
  if (!h[index]) return;
  const fecha = new Date(h[index].fecha).toLocaleDateString('es-ES');
  showConfirm(`¿Borrar medida del ${fecha}?`, () => {
    registrarMedidasBorradas([h[index].fecha]);
    h.splice(index, 1);
    localStorage.setItem("historialMedidas", JSON.stringify(h));
    markDirty();
    cargarMedidas();
    showToast("Medida eliminada", "success");
  });
};

function borrarTodoHistorialMedidas() {
  showConfirm("¿Borrar todo el historial de medidas?", () => {
    registrarMedidasBorradas(leerMedidas().map(m => m.fecha));
    localStorage.removeItem("historialMedidas");
    markDirty();
    const cont = document.getElementById("lista-medidas");
    if (cont) cont.innerHTML = `<p class="texto-vacio">Sin medidas registradas.</p>`;
    showToast("Historial de medidas eliminado", "info");
  });
}

function abrirConfigAudio() {
  cerrarSidebar();
  guardarEstadoApp();
  navPush();
  ocultarTodas();
  document.getElementById("pantalla-audio").classList.remove("oculto");
  actualizarNombreAudio(audioManager.nombrePersonalizado || 'Beep (predeterminado)');
}
window.abrirConfigAudio = abrirConfigAudio;

// ── Calculadora de discos: qué poner en cada lado de la barra ──
const DISCOS_POR_DEFECTO = [25, 20, 15, 10, 5, 2.5, 1.25];

function leerConfigDiscos() {
  let c = {};
  try { c = JSON.parse(localStorage.getItem('calcDiscos') || '{}') || {}; } catch {}
  const barra = Number(c.barra) > 0 ? Number(c.barra) : 20;
  const lista = Array.isArray(c.discos) ? c.discos.map(Number).filter(n => Number.isFinite(n) && n > 0) : [];
  return { barra, discos: lista.length ? lista : DISCOS_POR_DEFECTO };
}

// Mínimo de discos por lado (cambio de monedas). Trabaja en centésimas de kg para evitar errores de decimales.
function calcularDiscos(total, barra, discos) {
  const porLado = (total - barra) / 2;
  if (!(total > 0) || porLado < 0) return null;
  const E = 100;
  const objetivo = Math.round(porLado * E);
  if (objetivo > 40000) return null;
  const pl = [...new Set(discos.map(d => Math.round(d * E)))].filter(d => d > 0).sort((a, b) => b - a);
  if (!pl.length) return null;
  const INF = 1e9;
  const dp = new Array(objetivo + 1).fill(INF), usado = new Array(objetivo + 1).fill(0);
  dp[0] = 0;
  for (let t = 1; t <= objetivo; t++) {
    for (const d of pl) if (d <= t && dp[t - d] + 1 < dp[t]) { dp[t] = dp[t - d] + 1; usado[t] = d; }
  }
  let t = objetivo;
  while (t > 0 && dp[t] >= INF) t--;      // si no se llega exacto, lo más cercano por debajo
  const lista = [];
  for (let x = t; x > 0; x -= usado[x]) lista.push(usado[x] / E);
  lista.sort((a, b) => b - a);
  return { lista, exacto: t === objetivo, totalReal: Math.round((barra + 2 * t / E) * 100) / 100 };
}

function pintarResultadoDiscos() {
  const cont = document.getElementById('disc-resultado');
  if (!cont) return;
  const total = Number(document.getElementById('disc-total')?.value);
  const barra = Number(document.getElementById('disc-barra')?.value);
  const discos = String(document.getElementById('disc-lista')?.value || '')
    .split(/[\s,;]+/).map(Number).filter(n => Number.isFinite(n) && n > 0).slice(0, 12);
  if (!(barra >= 0) || !discos.length) { cont.innerHTML = '<p class="import-hint">Indica el peso de la barra y al menos un disco.</p>'; return; }
  try { localStorage.setItem('calcDiscos', JSON.stringify({ barra, discos })); } catch {}
  const r = calcularDiscos(total, barra, discos);
  if (!r) { cont.innerHTML = '<p class="import-hint">El peso total debe ser mayor o igual que el de la barra.</p>'; return; }
  const chips = r.lista.length ? r.lista.map(d => `<span class="disco-chip">${d}</span>`).join('') : '<em>solo la barra</em>';
  cont.innerHTML = `<p style="margin:6px 0;"><strong>Por cada lado:</strong></p><div class="discos-fila">${chips}</div>
    ${r.exacto ? '' : `<p class="import-hint">⚠️ Con esos discos no se llega exacto a ${total} kg. Lo más cercano por debajo es <strong>${r.totalReal} kg</strong>.</p>`}`;
}

window.recalcularDiscos = pintarResultadoDiscos;

window.mostrarDiscos = function (i) {
  const ej = ejerciciosDia[i];
  const overlay = document.getElementById('modal-tempo-overlay');
  const cont = document.getElementById('modal-tempo-contenido');
  if (!overlay || !cont) return;
  const cfg = leerConfigDiscos();
  cont.innerHTML = `
    <h3>🧮 Calculadora de discos</h3>
    <div class="discos-form">
      <label>Peso total (kg)<input id="disc-total" type="number" step="0.5" min="0" value="${Number(ej?.peso) || ''}" oninput="recalcularDiscos()"></label>
      <label>Barra (kg)<input id="disc-barra" type="number" step="0.5" min="0" value="${cfg.barra}" oninput="recalcularDiscos()"></label>
      <label>Discos que tienes (kg, separados por coma)<input id="disc-lista" type="text" value="${cfg.discos.join(', ')}" oninput="recalcularDiscos()"></label>
    </div>
    <div id="disc-resultado"></div>`;
  overlay.classList.remove('oculto');
  pintarResultadoDiscos();
};

// Insignias accesibles con teclado (Enter / Espacio)
document.addEventListener('keydown', e => {
  if ((e.key === 'Enter' || e.key === ' ') && e.target?.matches?.('[role="button"][tabindex]')) {
    e.preventDefault();
    e.target.click();
  }
});

window.mostrarGuiaTempoEj = (i) => window.mostrarGuiaTempo(ejerciciosDia[i]?.tempo || '');

// Series de aproximación orientativas (patrón habitual: ~50 % × 8, ~70 % × 5, ~85 % × 3 del peso de trabajo).
// Es una sugerencia general, no una prescripción: se ajusta a las sensaciones de cada persona.
function seriesCalentamiento(pesoTrabajo) {
  const paso = pesoTrabajo <= 15 ? 1 : 2.5;
  const redondear = x => Math.round(x / paso) * paso;
  const plan = [[0.5, 8], [0.7, 5], [0.85, 3]];
  const vistos = new Set();
  return plan
    .map(([f, reps]) => ({ kg: redondear(pesoTrabajo * f), reps }))
    .filter(s => s.kg > 0 && s.kg < pesoTrabajo && !vistos.has(s.kg) && vistos.add(s.kg));
}

window.mostrarCalentamiento = function (i) {
  const ej = ejerciciosDia[i];
  if (!ej || !(ej.peso > 0)) return;
  const overlay = document.getElementById('modal-tempo-overlay');
  const cont = document.getElementById('modal-tempo-contenido');
  if (!overlay || !cont) return;
  const filas = seriesCalentamiento(ej.peso).map((s, n) =>
    `<div class="tempo-fase"><span class="tempo-num">${s.kg} kg</span><span>Serie ${n + 1}: ${s.reps} reps</span></div>`).join('');
  cont.innerHTML = `
    <h3>🔥 Calentamiento</h3>
    <p style="text-align:center;color:var(--text-secondary);margin:0 0 8px;">${escapeHtml(ej.nombre)} · peso de trabajo ${ej.peso} kg</p>
    <div class="tempo-desglose">${filas || '<p>Con este peso basta con 1–2 series muy ligeras.</p>'}</div>
    <p class="import-hint">Sugerencia orientativa: descansa 1 min entre series de aproximación y no llegues al cansancio. Si es tu primer ejercicio del día, añade antes 5 min de movilidad o cardio suave.</p>`;
  overlay.classList.remove('oculto');
};

window.mostrarGuiaTempo = function (tempo) {
  const partes = String(tempo).split('-');
  let explicacion = '';
  if (partes.length >= 3) {
    explicacion = `
      <div class="tempo-desglose">
        <div class="tempo-fase"><span class="tempo-num">${escapeHtml(partes[0])}</span><span>Excéntrica (bajar)</span></div>
        <div class="tempo-fase"><span class="tempo-num">${escapeHtml(partes[1])}</span><span>Pausa abajo</span></div>
        <div class="tempo-fase"><span class="tempo-num">${escapeHtml(partes[2])}</span><span>Concéntrica (subir)</span></div>
        ${partes[3] ? `<div class="tempo-fase"><span class="tempo-num">${escapeHtml(partes[3])}</span><span>Pausa arriba</span></div>` : ''}
      </div>`;
  }
  const overlay = document.getElementById('modal-tempo-overlay');
  const cont = document.getElementById('modal-tempo-contenido');
  if (!overlay || !cont) return;
  cont.innerHTML = `<h3>Tempo ${escapeHtml(tempo)}</h3>${explicacion}`;
  overlay.classList.remove('oculto');
};

window.cerrarModalTempo = function () {
  document.getElementById('modal-tempo-overlay')?.classList.add('oculto');
};

function abrirGuiaTempo() {
  cerrarSidebar();
  navPush();
  ocultarTodas();
  document.getElementById("pantalla-guia-tempo").classList.remove("oculto");
}
window.abrirGuiaTempo = abrirGuiaTempo;

async function hayConexionReal() {
  if (!navigator.onLine) return false;
  try {
    const r = await fetch('./manifest.json?ts=' + Date.now(), { cache: 'no-store' });
    return r.ok;
  } catch { return false; }
}

async function forzarActualizacion() {
  if (!(await hayConexionReal())) {
    showAlert('📴 Sin conexión.\n\nPara actualizar la app necesitas internet: si borramos la caché ahora no podrías volver a abrirla.\n\nInténtalo cuando tengas datos o Wi-Fi.', 'warning');
    return;
  }
  showConfirm('⚠️ Se descargará de nuevo la app y se recargará.\nTus datos NO se pierden.\nNecesitas conexión durante el proceso.\n¿Continuar?', async () => {
    try {
      // Primero comprobar que la descarga funciona; solo entonces se borra la caché
      const resp = await fetch('./index.html?ts=' + Date.now(), { cache: 'no-store' });
      if (!resp.ok) throw new Error('descarga');
      navigator.serviceWorker?.controller?.postMessage({ type: 'CLEAR_CACHE' });
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        for (let r of regs) await r.unregister();
      }
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map(k => caches.delete(k)));
      }
      showToast('Caché limpiado. Recargando...', 'success');
      setTimeout(() => window.location.reload(), 1200);
    } catch { showToast('No se pudo actualizar (¿sin conexión?). No se ha borrado nada.', 'warning'); }
  });
}

function mostrarModalTimer() { document.getElementById("modal-timer")?.classList.remove("oculto"); }
function ocultarModalTimer() { document.getElementById("modal-timer")?.classList.add("oculto"); }
function resetDesdeModal() { resetTemporizador(); ocultarModalTimer(); }

function volverMenu(desdePopstate = false) {
  const enDia = !document.getElementById("pantalla-dia")?.classList.contains("oculto");
  const hayReps = ejerciciosDia.some(ej => ej.reps.some(r => r !== ""));
  // Se abrió otra pantalla (historial, medidas…) en mitad de un entrenamiento con series escritas:
  // "volver" retoma el entrenamiento en vez de llevar al menú y perder lo escrito.
  if (!enDia && sesionActiva && hayReps) { volverADiaEnCurso(desdePopstate === true); return; }
  if (enDia) {
    if (hayReps) {
      showConfirm(
        '¿Salir del entrenamiento?\nLas repeticiones marcadas NO se guardarán hasta que pulses "✅ Finalizar sesión".',
        _doVolverMenu,
        () => { if (desdePopstate === true) navPush({ pantalla: 'dia' }); } // el "atrás" ya consumió la entrada: reponerla
      );
      return;
    }
  }
  _doVolverMenu();
}

function _doVolverMenu() {
  sesionActiva = false;
  guiaUltimaVisible = false;
  navLimpiar(); // quita de golpe las entradas de historial de las pantallas (los paneles abiertos se quedan)
  ocultarTodas();
  document.getElementById("menu").classList.remove("oculto");
  cerrarSidebarRight();
  renderizarSelectorRutinas();
  renderizarBannerDeload();
  guardarEstadoApp();
  Object.keys(ejercicioTimers).forEach(i => cancelarTodosTimersEjercicio(Number(i)));
  audioManager.stopAll();
  liberarWakeLock();
  liberarOrientacion();
  detenerAutoGuardado();
  limpiarAutoGuardado();
}

function toggleSidebar() {
  const sidebar = document.getElementById("sidebar");
  const overlay = document.getElementById("sidebar-overlay");
  if (!sidebar || !overlay) return;
  const isOpen = sidebar.classList.contains("sidebar-open");
  sidebar.classList.toggle("sidebar-open", !isOpen);
  sidebar.classList.toggle("sidebar-closed", isOpen);
  overlay.classList.toggle("oculto", isOpen);
  if (!isOpen) renderSidebarPerfil();
}

function toggleSidebarRight() {
  const sidebar = document.getElementById("sidebar-right");
  const overlay = document.getElementById("sidebar-right-overlay");
  if (!sidebar || !overlay) return;
  const isOpen = sidebar.classList.contains("sidebar-right-open");
  sidebar.classList.toggle("sidebar-right-open", !isOpen);
  sidebar.classList.toggle("sidebar-right-closed", isOpen);
  overlay.classList.toggle("oculto", isOpen);
}

function cerrarSidebar() {
  document.getElementById("sidebar")?.classList.replace("sidebar-open", "sidebar-closed");
  document.getElementById("sidebar-overlay")?.classList.add("oculto");
}

function cerrarSidebarRight() {
  document.getElementById("sidebar-right")?.classList.replace("sidebar-right-open", "sidebar-right-closed");
  document.getElementById("sidebar-right-overlay")?.classList.add("oculto");
}

function renderSidebarPerfil() {
  const cont = document.getElementById("sidebar-perfil-info");
  if (!cont) return;

  let userState = {};
  try { userState = JSON.parse(localStorage.getItem("userState") || "{}"); } catch { }

  const email = userState.email || null;
  const logueado = !!userState.uid;

  cont.innerHTML = `
    <div class="sidebar-perfil-email">
      ${logueado
      ? `<span>👤 ${escapeHtml(email)}</span>`
      : `<span style="color:var(--text-secondary);font-size:calc(12px*var(--fs));">Sin cuenta — datos locales</span>`}
    </div>
    <div class="sidebar-perfil-btns">
      <button onclick="toggleSidebar(); mostrarPerfil()">
        ${logueado ? "⚙️ Perfil / Contraseña" : "🔑 Iniciar sesión"}
      </button>
      ${logueado ? `<button onclick="logout()" class="btn-danger" style="margin-top:4px;">🚪 Cerrar sesión</button>` : ""}
    </div>`;
}
window.renderSidebarPerfil = renderSidebarPerfil;

function guardarEstadoApp() {
  const pantalla = sesionActiva ? "dia" :
    !document.getElementById("menu")?.classList.contains("oculto") ? "menu" :
      !document.getElementById("pantalla-dia")?.classList.contains("oculto") ? "dia" :
        !document.getElementById("pantalla-historial")?.classList.contains("oculto") ? "historial" :
          !document.getElementById("pantalla-detalle")?.classList.contains("oculto") ? "detalle" :
            !document.getElementById("pantalla-medidas")?.classList.contains("oculto") ? "medidas" : "menu";

  const ejTimersSnapshot = {};
  Object.keys(ejercicioTimers).forEach(i => {
    const personas = ejercicioTimers[i];
    if (!personas) return;
    [0, 1].forEach(p => {
      if (personas[p]?.endTime && personas[p].endTime > Date.now()) {
        if (!ejTimersSnapshot[i]) ejTimersSnapshot[i] = {};
        ejTimersSnapshot[i][p] = { endTime: personas[p].endTime };
      }
    });
  });

  estadoApp = {
    pantalla, diaActual,
    repsPorEjercicio: ejerciciosDia.map(ej => ({ nombre: ej.nombre, reps: [...ej.reps] })),
    tiempoRestante, tiempoFinal, timerPausado, timerDuracionTotal,
    ejTimersSnapshot,
    sesionStartTime, notasSesion,
    hitActivo, hitAcumulado, hitInicio, hitTipo
  };
  localStorage.setItem("estadoApp", JSON.stringify(estadoApp));
}

function renderizarBotonesDias() {
  const contenedor = document.getElementById("botones-dias");
  if (!contenedor) return;
  const rutinaActual = obtenerRutinaCompleta();
  const historial = leerHistorialCrudo();
  contenedor.innerHTML = "";
  
  // Pre-calcular última sesión por día (solo de la rutina activa; las antiguas sin rutinaId cuentan para todas)
  const rutinaActivaId = obtenerRutinaActiva();
  const ultimaPorDia = new Map();
  historial.forEach(s => {
    if (s.rutinaId && s.rutinaId !== rutinaActivaId) return;
    if (!ultimaPorDia.has(s.dia) || new Date(s.fecha) > new Date(ultimaPorDia.get(s.dia).fecha)) {
      ultimaPorDia.set(s.dia, s);
    }
  });
  
  Object.keys(rutinaActual).forEach((diaKey, idx) => {
    const dia = rutinaActual[diaKey];
    const ultimaSesion = ultimaPorDia.get(dia.nombre);
    let subtexto = '';
    if (ultimaSesion) {
      const dias = Math.max(0, numDia(new Date()) - numDia(ultimaSesion.fecha));
      subtexto = dias === 0 ? 'Hoy' : dias === 1 ? 'Ayer' : `Hace ${dias} días`;
    }
    const btn = document.createElement("button");
    btn.innerHTML = subtexto
      ? `<span class="dia-btn-nombre">${escapeHtml(dia.nombre)}</span><span class="dia-btn-fecha">${subtexto}</span>`
      : `<span class="dia-btn-nombre">${escapeHtml(dia.nombre)}</span><span class="dia-btn-fecha dia-btn-nueva">Sin sesiones</span>`;
    btn.onclick = () => abrirDia(diaKey);
    contenedor.appendChild(btn);
  });
}
window.renderizarBotonesDias = renderizarBotonesDias;

// ══════════════════════════════════════════════════════
// SISTEMA DELOAD — Independiente por rutina
// ══════════════════════════════════════════════════════
// Cada rutina tiene su propio estado de deload y contador de semanas.
// Solo aparece el banner si la rutina activa tiene deload habilitado.

function _deloadKey(rutinaId) {
  return `deloadState_${rutinaId}`;
}

function _getDeloadState(rutinaId) {
  const id = rutinaId || obtenerRutinaActiva();
  try { return JSON.parse(localStorage.getItem(_deloadKey(id))) || {}; } catch { return {}; }
}

function _saveDeloadState(s, rutinaId) {
  const id = rutinaId || obtenerRutinaActiva();
  try {
    localStorage.setItem(_deloadKey(id), JSON.stringify(s));
  } catch (e) {
    console.warn("No se pudo guardar estado deload:", e);
  }
  if (typeof markDirty === "function" && userState?.uid) markDirty();
}

// ¿La rutina activa tiene el deload habilitado en su configuración?
function rutinaConDeloadHabilitado() {
  const rutinaId = obtenerRutinaActiva();
  const rutinaData = loadRutinaUsuario(rutinaId);
  return rutinaData?.tieneDeload === true;
}

// Semanas entrenadas SOLO de la rutina activa desde el último deload (o desde siempre)
function calcularSemanasEntrenadas() {
  const rutinaId = obtenerRutinaActiva();
  const historial = leerHistorialCrudo();
  if (!historial.length) return 0;

  const ds = _getDeloadState(rutinaId);
  const desde = ds.finDeload ? new Date(ds.finDeload) : new Date(0);

  // Solo sesiones de esta rutina
  const sesionesRutina = historial.filter(s =>
    (s.rutinaId ? s.rutinaId === rutinaId : true) &&
    new Date(s.fecha) >= desde
  );

  // Contar semanas ISO (lun-dom) con al menos 1 sesión
  const semanasConSesion = new Set(
    sesionesRutina.map(s => {
      const d = new Date(s.fecha);
      const diaSemana = d.getDay() === 0 ? 6 : d.getDay() - 1;
      const lunes = new Date(d);
      lunes.setDate(d.getDate() - diaSemana);
      lunes.setHours(0, 0, 0, 0);
      return lunes.getTime();
    })
  );
  return semanasConSesion.size;
}

// ¿Hay deload activo ahora mismo para la rutina activa?
function deloadEstaActivo() {
  if (!rutinaConDeloadHabilitado()) return false;
  const ds = _getDeloadState();
  if (!ds.inicioDeload) return false;
  const inicio = new Date(ds.inicioDeload);
  const fin = new Date(inicio.getTime() + 7 * 24 * 60 * 60 * 1000);
  return Date.now() < fin.getTime();
}

function verificarFinDeload() {
  if (!rutinaConDeloadHabilitado()) return false;
  const rutinaId = obtenerRutinaActiva();
  const ds = _getDeloadState(rutinaId);
  if (!ds.inicioDeload) return false;
  const inicio = new Date(ds.inicioDeload);
  const fin = new Date(inicio.getTime() + 7 * 24 * 60 * 60 * 1000);
  if (Date.now() >= fin.getTime() && !ds.finDeload) {
    ds.finDeload = fin.toISOString();
    ds.inicioDeload = null;
    _saveDeloadState(ds, rutinaId);
    showToast("✅ Semana de Deload finalizada. ¡Vuelves a tu rutina normal!", "success", 4000);
    return true;
  }
  return false;
}

window.iniciarDeload = function () {
  if (!rutinaConDeloadHabilitado()) {
    showToast("Esta rutina no tiene Deload habilitado. Actívalo en el editor de rutinas.", "info", 4000);
    return;
  }
  if (deloadEstaActivo()) {
    showToast("Ya hay un Deload activo para esta rutina.", "info"); return;
  }
  const semanas = calcularSemanasEntrenadas();
  const rutinaData = loadRutinaUsuario(obtenerRutinaActiva());
  const nombreRutina = rutinaData?.nombre || "esta rutina";
  const msg = `🔄 ¿Iniciar semana de Deload?\n\n` +
    `Rutina: ${nombreRutina}\n` +
    `• Llevas aproximadamente ${semanas} semana(s) entrenando con esta rutina\n` +
    `• Duración: 7 días exactos\n` +
    `• Los pesos se reducirán al 70% automáticamente\n` +
    `• El volumen se reducirá al 60% (menos series)\n` +
    `• La semana siguiente vuelve todo a normal solo\n\n` +
    `El Deload no es perder el tiempo — es cuando el músculo\ncrece de verdad (supercompensación).`;
  showConfirm(msg, () => {
    const rutinaId = obtenerRutinaActiva();
    const ds = _getDeloadState(rutinaId);
    ds.inicioDeload = new Date().toISOString();
    ds.finDeload = null;
    _saveDeloadState(ds, rutinaId);
    renderizarBannerDeload();
    showToast("💤 Deload iniciado. ¡Disfruta la semana de descarga!", "success", 3500);
  });
};

function renderizarBannerDeload() {
  verificarFinDeload();
  const banner = document.getElementById("deload-banner");
  if (!banner) return;

  // Si la rutina no tiene deload habilitado, no mostrar nada
  if (!rutinaConDeloadHabilitado()) {
    banner.innerHTML = "";
    return;
  }

  const activo = deloadEstaActivo();
  const semanas = calcularSemanasEntrenadas();
  const historial = leerHistorialCrudo();
  const rutinaId = obtenerRutinaActiva();
  const sesionesRutina = historial.filter(s => s.rutinaId ? s.rutinaId === rutinaId : true);

  if (!sesionesRutina.length) { banner.innerHTML = ""; return; }

  if (activo) {
    const ds = _getDeloadState(rutinaId);
    const inicio = new Date(ds.inicioDeload);
    const fin = new Date(inicio.getTime() + 7 * 24 * 60 * 60 * 1000);
    const diasRestantes = Math.max(1, Math.ceil((fin.getTime() - Date.now()) / 86400000));
    banner.innerHTML = `
      <div class="deload-banner deload-activo">
        <div class="deload-banner-left">
          <span class="deload-icon">💤</span>
          <div>
            <strong>SEMANA DE DELOAD ACTIVA</strong>
            <small>Termina en ${diasRestantes} día${diasRestantes !== 1 ? 's' : ''} · Pesos al 70%, series al 60%</small>
          </div>
        </div>
        <button class="deload-info-btn" onclick="mostrarInfoDeload()">ℹ️</button>
      </div>`;
  } else {
    const ds = _getDeloadState(rutinaId);
    const recomendado = semanas >= 4;
    banner.innerHTML = `
      <div class="deload-banner${recomendado ? ' deload-recomendado' : ''}">
        <div class="deload-banner-left">
          <span class="deload-icon">${recomendado ? '⚠️' : '📅'}</span>
          <div>
            <strong>${recomendado ? 'Deload recomendado' : 'Sin Deload activo'}</strong>
            <small>${semanas} semana${semanas !== 1 ? 's' : ''} con esta rutina${ds.finDeload ? ' desde último deload' : ''}</small>
          </div>
        </div>
        <button class="deload-btn" onclick="iniciarDeload()">
          ${recomendado ? '⚡ Hacer Deload' : '💤 Deload'}
        </button>
      </div>`;
  }
}
window.renderizarBannerDeload = renderizarBannerDeload;

window.mostrarInfoDeload = function () {
  showAlert(
    `💤 ¿Qué es el Deload?\n\n` +
    `Una semana de entrenamiento con menor intensidad y volumen para permitir que el sistema nervioso y los músculos se recuperen completamente.\n\n` +
    `📌 Durante el Deload:\n` +
    `• Peso: 70% de tu carga normal\n` +
    `• Series: 60% del volumen habitual\n` +
    `• RIR 4-5 (muy lejos del fallo)\n` +
    `• Mismos ejercicios, mismo patrón\n\n` +
    `🔬 ¿Por qué funciona?\n` +
    `La supercompensación ocurre DESPUÉS del estímulo, no durante. El músculo crece en recuperación. El récord personal suele llegar la semana después del Deload.\n\n` +
    `⏱ Duración: exactamente 7 días, luego vuelve todo automáticamente a normal.\n\n` +
    `⚙️ El Deload se activa/desactiva por rutina desde el editor de rutinas.`
  );
};

function aplicarFactorDeload(ejercicios) {
  if (!deloadEstaActivo()) return ejercicios;
  return ejercicios.map(ej => ({
    ...ej,
    peso: parseFloat((ej.peso * 0.70).toFixed(2)),
    series: Math.max(1, Math.ceil(ej.series * 0.60)),
    _esDeload: true
  }));
}

function renderBotonesUltimaSesion() {
  const contenedor = document.getElementById("contenido");
  if (!contenedor) return;
  contenedor.querySelector('.botones-ultima-sesion')?.remove();
  const ultimaSesion = obtenerUltimaSesion();
  if (!ultimaSesion) { guiaUltimaVisible = false; return; }

  const historial = leerHistorialCrudo();
  const idxSesion = historial.findIndex(s => s.fecha === ultimaSesion.fecha && s.dia === ultimaSesion.dia);
  const fechaCorta = new Date(ultimaSesion.fecha).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });

  contenedor.insertAdjacentHTML('afterbegin', `
    <div class="botones-ultima-sesion">
      <button onclick="toggleGuiaUltimaSesion()" id="btn-toggle-guia" class="btn-secondary${guiaUltimaVisible ? ' activo' : ''}" data-fecha="${escapeHtml(fechaCorta)}">${guiaUltimaVisible ? '🚫 Ocultar guía' : `👁️ Última sesión (${escapeHtml(fechaCorta)})`}</button>
      ${idxSesion >= 0 ? `<button onclick="verDetalleDesdeDia(${idxSesion})" class="btn-link" style="width:auto!important;padding:4px 8px!important;font-size:calc(12px*var(--fs));">Ver detalle →</button>` : ''}
    </div>`);
  if (guiaUltimaVisible) mostrarGuiaUltimaSesion();
}

function obtenerUltimaSesion() {
  const historial = leerHistorialCrudo();
  const rutinaActual = obtenerRutinaCompleta();
  const nombreDia = rutinaActual[diaActual]?.nombre;
  const rutinaActiva = obtenerRutinaActiva();
  if (!nombreDia) return null;
  return historial.filter(s => (s.rutinaId ? s.rutinaId === rutinaActiva : true) && s.dia === nombreDia)
    .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))[0] || null;
}

window.toggleGuiaUltimaSesion = function () {
  const btn = document.getElementById('btn-toggle-guia');
  if (!btn) return;
  guiaUltimaVisible = !guiaUltimaVisible;
  if (guiaUltimaVisible) {
    mostrarGuiaUltimaSesion();
    btn.textContent = '🚫 Ocultar guía';
    btn.classList.add('activo');
  } else {
    document.querySelectorAll('.guia-ultima-sesion').forEach(g => g.remove());
    btn.textContent = `👁️ Última sesión (${btn.dataset.fecha || ''})`;
    btn.classList.remove('activo');
  }
};

function mostrarGuiaUltimaSesion() {
  const sesion = obtenerUltimaSesion();
  if (!sesion) return;
  document.querySelectorAll('.guia-ultima-sesion').forEach(g => g.remove());   // nunca duplicar
  const fecha = new Date(sesion.fecha).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
  ejerciciosDia.forEach((ej, ejIndex) => {
    const ejAnterior = sesion.ejercicios.find(e => e.nombre === ej.nombre && ejercicioHecho(e));
    if (!ejAnterior) return;
    const div = document.querySelector(`.ejercicio[data-ej-index="${ejIndex}"]`);
    if (!div) return;
    const guia = `<div class="guia-ultima-sesion">
      <span class="guia-fecha">📅 ${fecha}</span>
      <span class="guia-peso">Peso: ${escapeHtml(ejAnterior.peso)}kg</span>
      <span class="guia-reps">Reps: ${ejAnterior.reps.filter(r => r !== "").map(escapeHtml).join(' - ')}</span>
    </div>`;
    // Debajo de TODA la cabecera (título + etiquetas). Antes se insertaba junto al título, dentro de la
    // cabecera flexible, y lo aplastaba hasta dejar el nombre del ejercicio en vertical.
    const ancla = div.querySelector('.ejercicio-header');
    if (ancla) ancla.insertAdjacentHTML('afterend', guia);
    else div.insertAdjacentHTML('afterbegin', guia);
  });
}

function borrarRutinaDia() {
  if (!diaActual) return;
  showConfirm("¿Limpiar los ejercicios añadidos manualmente en este día?", () => {
    const ra = obtenerRutinaCompleta();
    const nombreDiaBorrar = ra[diaActual]?.nombre || diaActual;
    delete config.ejerciciosExtra[nombreDiaBorrar];
    guardarConfig();
    cargarEjerciciosDia();
    renderDia();
    showToast("Ejercicios extra eliminados", "info");
  });
}

function formatearTiempo(segundos) {
  const m = Math.floor(segundos / 60);
  const s = segundos % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// Cierra una capa (panel lateral o diálogo) por su id
const CAPAS = {
  'modal-confirm-overlay':  { abierta: el => !el.classList.contains('oculto'), cerrar: () => document.getElementById('modal-confirm-no')?.click() },
  'modal-alert-overlay':    { abierta: el => !el.classList.contains('oculto'), cerrar: () => document.getElementById('modal-alert-ok')?.click() },
  'modal-prompt-overlay':   { abierta: el => !el.classList.contains('oculto'), cerrar: () => document.getElementById('modal-prompt-cancel')?.click() },
  'modal-descanso-overlay': { abierta: el => !el.classList.contains('oculto'), cerrar: () => window.cerrarModalDescanso?.() },
  'modal-timer':            { abierta: el => !el.classList.contains('oculto'), cerrar: ocultarModalTimer },
  'modal-tempo-overlay':    { abierta: el => !el.classList.contains('oculto'), cerrar: () => window.cerrarModalTempo?.() },
  'sidebar-right':          { abierta: el => el.classList.contains('sidebar-right-open'), cerrar: cerrarSidebarRight },
  'sidebar':                { abierta: el => el.classList.contains('sidebar-open'), cerrar: cerrarSidebar }
};

function cerrarCapaPorId(id) {
  const def = CAPAS[id];
  const el = document.getElementById(id);
  if (!def || !el) return;
  def.cerrar();
  if (def.abierta(el)) navPush({ capa: id });   // no se pudo cerrar: que "atrás" siga disponible
}

window.addEventListener("popstate", (e) => {
  const r = navRegistrarPop(e.state);
  if (r.ignorar || r.sobrante) return;
  const it = r.item;
  const visible = id => { const el = document.getElementById(id); return !!el && !el.classList.contains("oculto"); };

  // Panel lateral o diálogo
  if (it && it.capa) { cerrarCapaPorId(it.capa); return; }

  // Nivel interno del editor de rutinas (día → rutina → lista)
  if (it && it.pantalla === 'editor' && it.nivel && window.editorSubirNivel) { window.editorSubirNivel(it.nivel); return; }

  // Progreso abierto desde Estadísticas: vuelve a Estadísticas
  if (it && it.pantalla === 'progreso' && it.padre === 'stats' && visible("pantalla-progreso")) {
    ocultarTodas();
    document.getElementById('pantalla-estadisticas')?.classList.remove('oculto');
    renderEstadisticas();
    return;
  }

  if (visible("pantalla-resumen")) { cerrarResumen(); return; }
  // Detalle abierto desde "Ver detalle →" del entrenamiento: "atrás" retoma el día
  if (it && it.pantalla === 'detalle' && it.desde === 'dia' && visible("pantalla-detalle") && sesionActiva) { volverADiaEnCurso(true); return; }
  if (visible("pantalla-detalle")) { mostrarPantallaHistorial(); return; }
  if (visible("pantalla-editor") && window.volverMenuDesdeEditor) { window.volverMenuDesdeEditor(); return; }
  if (visible("menu")) return;
  volverMenu(true);
});

let touchStartX = 0, touchStartY = 0, isSwiping = false, swipeTarget = null;
const EDGE_ZONE = 30, SWIPE_THRESHOLD = 100;

document.addEventListener('touchstart', e => {
  touchStartX = e.changedTouches[0].screenX;
  touchStartY = e.changedTouches[0].screenY;
  const w = window.innerWidth;
  if (touchStartX <= EDGE_ZONE) { isSwiping = true; swipeTarget = 'left'; }
  if (touchStartX >= w - EDGE_ZONE) { isSwiping = true; swipeTarget = 'right'; }
}, { passive: true });

document.addEventListener('touchend', e => {
  if (!isSwiping) return;
  const dx = e.changedTouches[0].screenX - touchStartX;
  const dy = Math.abs(e.changedTouches[0].screenY - touchStartY);
  if (dy < 100) {
    if (swipeTarget === 'left' && dx > SWIPE_THRESHOLD) {
      document.getElementById("sidebar")?.classList.replace("sidebar-closed", "sidebar-open");
      document.getElementById("sidebar-overlay")?.classList.remove("oculto");
    }
    if (swipeTarget === 'right' && dx < -SWIPE_THRESHOLD) {
      document.getElementById("sidebar-right")?.classList.replace("sidebar-right-closed", "sidebar-right-open");
      document.getElementById("sidebar-right-overlay")?.classList.remove("oculto");
    }
  }
  isSwiping = false; swipeTarget = null;
}, { passive: true });

window.abrirDia = abrirDia;
window.volverMenu = volverMenu;
window.abrirHistorial = abrirHistorial;
window.volverHistorial = volverHistorial;
window.finalizarDia = finalizarDia;
window.forzarActualizacion = forzarActualizacion;
window.iniciarTemporizador = iniciarTemporizador;
window.pausarTemporizador = pausarTemporizador;
window.resetTemporizador = resetTemporizador;
window.añadirTimer = añadirTimer;
window.borrarTimer = borrarTimer;
window.iniciarHIT = iniciarHIT;
window.pausarHIT = pausarHIT;
window.resetHIT = resetHIT;
window.borrarRutinaDia = borrarRutinaDia;
window.guardarMedidas = guardarMedidas;
window.borrarTodoHistorialMedidas = borrarTodoHistorialMedidas;
window.abrirMedidas = abrirMedidas;
window.verDetalle = verDetalle;
window.limpiarHistorialDuplicados = limpiarHistorialDuplicados;
window.borrarTodoHistorial = borrarTodoHistorial;
window.toggleSidebar = toggleSidebar;
window.toggleSidebarRight = toggleSidebarRight;
window.resetDesdeModal = resetDesdeModal;
window.mostrarPerfil = window.mostrarPerfil || (() => { });

let historialFiltro = '';
let historialPagina = 30;

window.filtrarHistorial = function (texto) {
  historialFiltro = texto.trim().toLowerCase();
  historialPagina = 30;
  renderListaHistorial();
};

window.cargarMasHistorial = function () {
  historialPagina += 30;
  renderListaHistorial();
};

function renderListaHistorial() {
  const cont = document.getElementById("lista-historial");
  if (!cont) return;
  const historial = leerHistorialCrudo();
  const filtrado = historial
    .map((s, i) => ({ s, i }))
    .filter(({ s }) => {
      if (!historialFiltro) return true;
      const fecha = new Date(s.fecha).toLocaleString('es-ES').toLowerCase();
      const tieneEjercicio = s.ejercicios?.some(ej =>
        ej.nombre?.toLowerCase().includes(historialFiltro)
      );
      return (
        s.dia?.toLowerCase().includes(historialFiltro) ||
        fecha.includes(historialFiltro) ||
        s.notas?.toLowerCase().includes(historialFiltro) ||
        tieneEjercicio
      );
    })
    .reverse();

  if (filtrado.length === 0) {
    cont.innerHTML = `<p class="texto-vacio">${historialFiltro ? 'Sin resultados para "' + escapeHtml(historialFiltro) + '"' : 'No hay sesiones registradas.'}</p>`;
    return;
  }

  const visible = filtrado.slice(0, historialPagina);
  const hayMas = filtrado.length > historialPagina;

  cont.innerHTML = visible.map(({ s, i }) => `
    <div class="historial-item">
      <div class="historial-info">
        <p class="historial-fecha">${new Date(s.fecha).toLocaleString('es-ES')}</p>
        <p class="historial-dia">${escapeHtml(s.dia)}</p>
        ${s.notas ? `<p class="historial-notas">"${escapeHtml(s.notas)}"</p>` : ''}
      </div>
      <div class="botones-historial">
        <button onclick="verDetalle(${i})">👁️</button>
        <button class="btn-danger" onclick="borrarSesion(${i})">🗑️</button>
      </div>
    </div>`).join('') +
    (hayMas ? `<button onclick="cargarMasHistorial()" class="btn-secondary" style="width:100%;margin-top:8px;">
      ⬇️ Ver más (${filtrado.length - historialPagina} restantes)
    </button>` : '');
}

window.exportarHistorialCSV = function () {
  const historial = leerHistorialCrudo();
  if (historial.length === 0) { showToast('No hay historial para exportar', 'warning'); return; }

  const filas = [['Fecha', 'Día', 'Ejercicio', 'Peso (kg)', 'Reps por serie', 'Nota sesión', 'Tiempo HIT', 'Tipo HIT']];
  historial.forEach(s => {
    s.ejercicios.forEach(ej => {
      filas.push([
        new Date(s.fecha).toLocaleString('es-ES'),
        s.dia,
        ej.nombre,
        ej.peso > 0 ? ej.peso : 'Al fallo',
        ej.reps.filter(r => r !== '').join(' / '),
        s.notas || '',
        s.tiempoHIT ? formatearTiempo(s.tiempoHIT) : '',
        s.tipoHIT || ''
      ]);
    });
  });

  // Un texto que empiece por = + - @ se interpretaría como fórmula en Excel: se neutraliza con '
  const seguro = v => { const t = String(v); return /^[=+\-@]/.test(t) && isNaN(Number(t)) ? "'" + t : t; };
  const csv = filas.map(f => f.map(v => `"${seguro(v).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `historial_gym_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  showToast('CSV exportado correctamente', 'success');
};

function abrirEstadisticas() {
  cerrarSidebar();
  navPush();
  ocultarTodas();
  document.getElementById('pantalla-estadisticas').classList.remove('oculto');
  renderEstadisticas();
}
window.abrirEstadisticas = abrirEstadisticas;

// Nombre de ejercicio → músculo, según las rutinas guardadas (el historial no guarda el músculo)
function mapaMusculos() {
  const mapa = {};
  try {
    Object.values(getAllRutinasUsuario()).forEach(r => (r.dias || []).forEach(d => (d.ejercicios || []).forEach(e => {
      if (e.musculo && !mapa[e.nombre]) mapa[e.nombre] = e.musculo;
    })));
  } catch {}
  return mapa;
}

// Series efectivas (con reps > 0) por músculo entre dos números de día, sin contar deloads
function seriesPorMusculo(historial, desdeDia, hastaDia) {
  const mapa = mapaMusculos();
  const out = {};
  historial.forEach(s => {
    const d = numDia(s.fecha);
    if (s.deload || d < desdeDia || d > hastaDia) return;
    s.ejercicios.forEach(ej => {
      const series = (ej.reps || []).filter(r => r !== '' && Number(r) > 0).length;
      if (!series) return;
      const m = mapa[ej.nombre] || '_sin';
      out[m] = (out[m] || 0) + series;
    });
  });
  return out;
}

function htmlSeriesPorMusculo(historial, hoy) {
  const actual = seriesPorMusculo(historial, hoy - 6, hoy);
  const previa = seriesPorMusculo(historial, hoy - 13, hoy - 7);
  const claves = Object.keys(actual).sort((a, b) => actual[b] - actual[a]);
  if (!claves.length) return '';
  const filas = claves.map(k => {
    const n = actual[k], pv = previa[k] || 0;
    const nombre = k === '_sin' ? 'Sin músculo asignado' : (MUSCULOS_MAP[k] || k);
    return `<div class="musculo-fila">
      <span class="musculo-nombre">${escapeHtml(nombre)}</span>
      <div class="musculo-barra" role="presentation"><div style="width:${Math.min(100, Math.round(n / 20 * 100))}%"></div></div>
      <span class="musculo-n">${n}<small> (sem. previa ${pv})</small></span>
    </div>`;
  }).join('');
  return `<div class="stats-seccion">
    <h3>💪 Series por músculo · últimos 7 días</h3>
    ${filas}
    <p class="import-hint">Orientativo: muchos programas de hipertrofia manejan del orden de 10–20 series semanales por grupo muscular; depende de tu nivel y recuperación. La barra llena equivale a 20 series.</p>
  </div>`;
}

// Calendario de asistencia: últimas 12 semanas, columnas = semanas (lunes a domingo)
function htmlAsistencia(fechasUnicas, hoy) {
  const diaSemana = (new Date().getDay() + 6) % 7;      // 0 = lunes
  const inicio = hoy - (11 * 7 + diaSemana);
  const con = new Set(fechasUnicas);
  let celdas = '', total = 0;
  for (let d = inicio; d <= inicio + 12 * 7 - 1; d++) {
    if (d > hoy) { celdas += '<span class="hm-cell hm-fut"></span>'; continue; }
    const on = con.has(d);
    if (on) total++;
    celdas += `<span class="hm-cell${on ? ' hm-on' : ''}"></span>`;
  }
  return `<div class="stats-seccion">
    <h3>📅 Asistencia · últimas 12 semanas</h3>
    <div class="heatmap" role="img" aria-label="Entrenaste ${total} días en las últimas 12 semanas">${celdas}</div>
    <p class="import-hint">${total} día${total !== 1 ? 's' : ''} con entrenamiento (cada columna es una semana, de lunes a domingo).</p>
  </div>`;
}

function renderEstadisticas() {
  const cont = document.getElementById('stats-contenido');
  if (!cont) return;
  const historial = leerHistorial();

  if (historial.length === 0) {
    cont.innerHTML = `<p class="texto-vacio">Sin sesiones registradas todavía.</p>`; return;
  }

  const hoy = numDia(new Date());
  const fechasUnicas = [...new Set(historial.map(s => numDia(s.fecha)))].sort((a, b) => b - a);

  // Racha: días consecutivos (hoy o ayer cuentan como inicio). Usa números de día, no milisegundos.
  let rachaActual = 0;
  let cursor = hoy;
  for (const f of fechasUnicas) {
    if (f === cursor || f === cursor - 1) { rachaActual++; cursor = f; }
    else break;
  }
  const rachaMejor = calcularRachaMejor(fechasUnicas);

  const primeraFecha = historial.reduce((m, s) => Math.min(m, new Date(s.fecha).getTime()), Date.now());
  const semanasTotales = Math.max(1, Math.ceil((Date.now() - primeraFecha) / (7 * 86400000)));
  const sesXSemana = (historial.length / semanasTotales).toFixed(1);

  const totalSesiones = historial.length;
  let totalVolumen = 0;
  historial.forEach(s => s.ejercicios.forEach(ej => {
    const repsTotal = ej.reps.filter(r => r !== '').reduce((a, r) => a + Number(r), 0);
    totalVolumen += (ej.peso || 0) * repsTotal;
  }));

  const records = {};
  historial.forEach(s => {
    s.ejercicios.forEach(ej => {
      if (!ej.peso || ej.peso <= 0 || s.deload || !ejercicioHecho(ej)) return;
      if (!records[ej.nombre] || ej.peso > records[ej.nombre].peso) {
        records[ej.nombre] = { peso: ej.peso, fecha: s.fecha };
      }
    });
  });
  const topRecords = Object.entries(records)
    .sort((a, b) => b[1].peso - a[1].peso)
    .slice(0, 8);

  const diasCount = {};
  historial.forEach(s => { diasCount[s.dia] = (diasCount[s.dia] || 0) + 1; });
  const diaFav = Object.entries(diasCount).sort((a, b) => b[1] - a[1])[0];

  // Duración promedio (solo sesiones que la tengan registrada)
  const conDuracion = historial.filter(s => s.duracionMin > 0);
  const durPromedio = conDuracion.length
    ? Math.round(conDuracion.reduce((a, s) => a + s.duracionMin, 0) / conDuracion.length)
    : null;

  cont.innerHTML = `
    <div class="stats-grid">
      <div class="stat-box highlight">
        <span class="stat-val">🔥 ${rachaActual}</span>
        <span class="stat-lbl">Racha actual (días)</span>
      </div>
      <div class="stat-box">
        <span class="stat-val">${rachaMejor}</span>
        <span class="stat-lbl">Mejor racha</span>
      </div>
      <div class="stat-box">
        <span class="stat-val">${totalSesiones}</span>
        <span class="stat-lbl">Total sesiones</span>
      </div>
      <div class="stat-box">
        <span class="stat-val">${sesXSemana}</span>
        <span class="stat-lbl">Sesiones / semana</span>
      </div>
      <div class="stat-box">
        <span class="stat-val">${totalVolumen >= 10000 ? (totalVolumen / 1000).toFixed(1) + ' t' : Math.round(totalVolumen) + ' kg'}</span>
        <span class="stat-lbl">Volumen total</span>
      </div>
      <div class="stat-box">
        <span class="stat-val">${diaFav ? diaFav[1] : 0}x</span>
        <span class="stat-lbl">${diaFav ? diaFav[0].split('–')[1]?.trim() || diaFav[0] : '-'}</span>
      </div>
      ${durPromedio ? `<div class="stat-box">
        <span class="stat-val">${durPromedio}'</span>
        <span class="stat-lbl">Duración promedio</span>
      </div>` : ''}
    </div>

    ${topRecords.length > 0 ? `
    <div class="stats-seccion">
      <h3>🏆 Récords de peso</h3>
      <div class="records-list">
        ${topRecords.map(([nombre, data]) => `
          <div class="record-item">
            <span class="record-nombre">${escapeHtml(nombre)}</span>
            <div style="text-align:right">
              <span class="record-val">${data.peso} kg</span><br>
              <span class="record-fecha">${new Date(data.fecha).toLocaleDateString('es-ES')}</span>
            </div>
          </div>`).join('')}
      </div>
    </div>` : ''}

    ${htmlSeriesPorMusculo(historial, hoy)}
    ${htmlAsistencia(fechasUnicas, hoy)}

    <button onclick="abrirProgreso(true)" class="btn-secondary" style="margin-top:4px;">📈 Ver gráficas de progreso</button>`;
}

// fechasOrdenadas: números de día (numDia) de más reciente a más antigua
function calcularRachaMejor(fechasOrdenadas) {
  if (!fechasOrdenadas.length) return 0;
  let mejor = 1, actual = 1;
  for (let i = 1; i < fechasOrdenadas.length; i++) {
    if (fechasOrdenadas[i - 1] - fechasOrdenadas[i] === 1) { actual++; mejor = Math.max(mejor, actual); }
    else actual = 1;
  }
  return mejor;
}

function abrirProgreso(desdeStats = false) {
  cerrarSidebar();
  navPush(desdeStats === true ? { pantalla: 'progreso', padre: 'stats' } : { pantalla: 'progreso' });
  ocultarTodas();
  document.getElementById('pantalla-progreso').classList.remove('oculto');
  poblarSelectorEjercicios();
}
window.abrirProgreso = abrirProgreso;

// ← de "Progreso": si se abrió desde Estadísticas vuelve allí; si no, al menú
window.volverDeProgreso = function () {
  const t = navTopePantalla();
  if (t && t.pantalla === 'progreso' && t.padre === 'stats' && navAtras()) return;
  volverMenu();
};

function poblarSelectorEjercicios() {
  const sel = document.getElementById('progreso-ejercicio-select');
  if (!sel) return;
  const historial = leerHistorial();
  const ejercicios = [...new Set(historial.flatMap(s => s.ejercicios.map(e => e.nombre)))].sort();
  sel.innerHTML = `<option value="">Selecciona ejercicio...</option>` +
    ejercicios.map(n => `<option value="${escapeHtml(n)}">${escapeHtml(n)}</option>`).join('');
  if (ejercicios.length > 0) { sel.value = ejercicios[0]; renderGraficaProgreso(); }
}

let graficaModo = 'peso';
window.setGraficaModo = function (modo) {
  graficaModo = modo;
  renderGraficaProgreso();
};

window.renderGraficaProgreso = function () {
  const sel = document.getElementById('progreso-ejercicio-select');
  const cont = document.getElementById('progreso-grafica');
  if (!sel || !cont || !sel.value) { if (cont) cont.innerHTML = `<p class="chart-empty">Selecciona un ejercicio</p>`; return; }

  const nombre = sel.value;
  const historial = leerHistorial();

  const datosEj = historial.filter(s => !s.deload && s.ejercicios.some(e => e.nombre === nombre && ejercicioHecho(e)));
  const esAlFallo = datosEj.length > 0 && datosEj.every(s => {
    const ej = s.ejercicios.find(e => e.nombre === nombre);
    return !ej?.peso || ej.peso === 0;
  });

  if (esAlFallo) {
    cont.innerHTML = `<div class="chart-empty-fallo">
      <p>⚠️ <strong>${escapeHtml(nombre)}</strong> es un ejercicio de peso corporal / al fallo.</p>
      <p style="font-size:calc(13px*var(--fs));color:var(--text-secondary);">La gráfica de peso no aplica. Puedes ver el historial de reps en la pantalla de detalle de cada sesión.</p>
    </div>`; return;
  }

  const datos = datosEj
    .map(s => {
      const ej = s.ejercicios.find(e => e.nombre === nombre && ejercicioHecho(e));
      const repsLista = (ej.reps || []).filter(r => r !== '').map(Number);
      const repsTotal = repsLista.reduce((a, r) => a + r, 0);
      const mejor1RM = Math.max(0, ...repsLista.map(r => calcular1RM(ej.peso || 0, r) || 0));
      return {
        fecha: s.fecha,
        peso: ej.peso || 0,
        volumen: (ej.peso || 0) * repsTotal,
        e1rm: mejor1RM
      };
    })
    .sort((a, b) => new Date(a.fecha) - new Date(b.fecha))
    .slice(-20);

  if (datos.length < 2) {
    cont.innerHTML = `<p class="chart-empty">Necesitas al menos 2 sesiones con "${escapeHtml(nombre)}" para ver la gráfica.</p>`; return;
  }

  const modo = ['peso', 'volumen', 'e1rm'].includes(graficaModo) ? graficaModo : 'peso';
  const valores = datos.map(d => modo === 'peso' ? d.peso : modo === 'volumen' ? d.volumen : d.e1rm);
  const maxVal = Math.max(...valores);
  const minVal = Math.min(...valores);
  const rango = maxVal - minVal || 1;
  const ultimo = valores[valores.length - 1];
  const primero = valores[0];
  const mejora = parseFloat((ultimo - primero).toFixed(1));
  const unidad = modo === 'volumen' ? 'kg·r' : 'kg';
  const etiquetaMax = modo === 'volumen' ? 'Vol. máx' : modo === 'e1rm' ? '1RM est. máx' : 'Récord';
  const leyenda = modo === 'volumen' ? 'sesión de mayor volumen' : modo === 'e1rm' ? 'mejor 1RM estimado' : 'récord de peso';

  const alturaMax = 140;
  const barras = datos.map((d, idx) => {
    const val = valores[idx];
    // Base fija desde 0 si el rango es pequeño respecto al valor, para no exagerar diferencias mínimas
    const base = Math.min(minVal, maxVal * 0.5);
    const pct = (val - base) / ((maxVal - base) || 1);
    const alto = Math.max(8, Math.round(pct * alturaMax) + 8);
    const fecha = new Date(d.fecha).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' });
    const esMax = val === maxVal;
    const label = modo === 'volumen' ? `${Math.round(val)}` : `${val}kg`;
    return `<div class="chart-bar-wrap">
      <span class="chart-bar-val">${label}</span>
      <div class="chart-bar" style="height:${alto}px;${esMax ? 'background:var(--success);' : ''}" title="${label} — ${fecha}"></div>
      <span class="chart-bar-date">${fecha}</span>
    </div>`;
  }).join('');

  const btn = (m, txt) => `<button onclick="setGraficaModo('${m}')" class="${modo === m ? 'activo' : 'btn-secondary'}">${txt}</button>`;
  cont.innerHTML = `
    <div class="grafica-toggle">
      ${btn('peso', '⚖️ Peso')}${btn('e1rm', '🏋️ 1RM est.')}${btn('volumen', '📦 Volumen')}
    </div>
    <div style="display:flex;gap:10px;margin-bottom:10px;flex-wrap:wrap;">
      <div class="stat-box" style="flex:1;min-width:80px;">
        <span class="stat-val">${Math.round(maxVal * 10) / 10} ${unidad}</span><span class="stat-lbl">${etiquetaMax}</span>
      </div>
      <div class="stat-box ${mejora > 0 ? 'highlight' : ''}" style="flex:1;min-width:80px;">
        <span class="stat-val">${mejora >= 0 ? '+' : ''}${mejora} ${unidad}</span><span class="stat-lbl">Cambio total</span>
      </div>
      <div class="stat-box" style="flex:1;min-width:80px;">
        <span class="stat-val">${datos.length}</span><span class="stat-lbl">Sesiones</span>
      </div>
    </div>
    <div class="chart-container">
      <div class="chart-bars">${barras}</div>
    </div>
    <p style="font-size:calc(12px*var(--fs));color:var(--text-secondary);text-align:center;">
      🟢 barra verde = ${leyenda} · Últimas ${datos.length} sesiones (sin semanas de deload)
    </p>`;
};

window.addEventListener("cambio-rutina", () => {
  renderizarBotonesDias();
  renderizarBannerDeload();
  renderizarSelectorRutinas();
  if (diaActual) {
    // Editar la rutina (editor) con un entrenamiento abierto recargaba los ejercicios y borraba las repeticiones
    // escritas. Se conservan (por nombre de ejercicio) si la rutina activa sigue siendo la misma.
    const activa = obtenerRutinaActiva();
    const previas = (sesionActiva && _rutinaCargadaId === activa) ? new Map(ejerciciosDia.map(e => [e.nombre, e.reps])) : null;
    cargarEjerciciosDia();
    if (previas) ejerciciosDia.forEach(e => { const r = previas.get(e.nombre); if (r) e.reps = e.reps.map((_, i) => r[i] ?? ""); });
    renderDia();
  }
});

window.actualizarNotasSesion = function (val) { notasSesion = val; };

function cargarNotasProgresion() {
  try { return JSON.parse(localStorage.getItem('notasProgresion') || '{}'); }
  catch { return {}; }
}

function guardarNotasProgresion(datos) {
  localStorage.setItem('notasProgresion', JSON.stringify(datos));
  if (typeof markDirty === 'function' && userState?.uid) markDirty();
}

function abrirNotasProgresion() {
  cerrarSidebar();
  navPush();
  ocultarTodas();
  document.getElementById('pantalla-progresion-rutina').classList.remove('oculto');
  renderNotasProgresion();
}
window.abrirNotasProgresion = abrirNotasProgresion;

function renderNotasProgresion() {
  const cont = document.getElementById('progresion-rutina-contenido');
  if (!cont) return;

  const notas = cargarNotasProgresion();
  const rutinaId = obtenerRutinaActiva();
  const rutinaData = loadRutinaUsuario(rutinaId);
  if (!rutinaData) {
    cont.innerHTML = '<p class="texto-vacio">No hay rutina activa.</p>'; return;
  }

  const notasRutina = notas[rutinaId] || { general: '', dias: {} };
  const nombreRutina = rutinaData.nombre || 'Rutina';
  const dias = rutinaData.dias || [];

  function htmlSeccion(id, valor) {
    const tieneTexto = valor && valor.trim().length > 0;
    const PREVIEW = 180;
    const largo = tieneTexto && valor.length > PREVIEW;
    const preview = largo ? valor.substring(0, PREVIEW).trimEnd() + '...' : (valor || '');

    return (
      '<div id="nota-view-' + id + '">' +
      (tieneTexto
        ? '<div class="nota-card">' +
        '<div class="nota-texto-preview" id="nota-preview-' + id + '">' +
        escapeHtml(preview).replace(/\n/g, '<br>') +
        '</div>' +
        (largo
          ? '<button class="btn-nota-ver" id="btn-ver-' + id + '" data-exp="0" data-id="' + id + '">📖 Ver completo</button>'
          : '') +
        '</div>'
        : '<p class="nota-vacia">Sin nota — toca Editar para añadir</p>'
      ) +
      '<div class="nota-acciones">' +
      '<button class="btn-nota-editar" data-notaid="' + id + '">✏️ Editar</button>' +
      '</div>' +
      '</div>' +
      '<div id="nota-edit-' + id + '" class="oculto">' +
      '<textarea class="nota-textarea-auto" id="nota-ta-' + id + '" data-notaid="' + id + '"></textarea>' +
      '<button class="btn-nota-listo" data-notaid="' + id + '">✅ Listo</button>' +
      '</div>'
    );
  }

  let html = '<div class="progresion-header">' +
    '<h3>🏋️ ' + escapeHtml(nombreRutina) + '</h3>' +
    '<p style="font-size:calc(12px*var(--fs));color:var(--text-secondary);margin:4px 0 0;">' +
    'Estrategia de progresión: cómo subir peso, cuándo y qué hacer al estancarte.' +
    '</p></div>';

  html += '<div class="progresion-seccion">' +
    '<h4>📌 Estrategia general de la rutina</h4>' +
    htmlSeccion('general', notasRutina.general || '') +
    '</div>';

  dias.forEach((dia, i) => {
    const ejHTML = (dia.ejercicios || []).map(ej =>
      '<div class="prog-ej-ref">' +
      '<span class="prog-ej-nombre">' + escapeHtml(ej.nombre) + '</span>' +
      '<span class="prog-ej-config">' +
      (ej.alFallo ? ej.series + '×Al fallo' : ej.series + '×' + ej.repsMin + '–' + ej.repsMax) + ' · ' +
      (ej.peso > 0 ? ej.peso + 'kg' : 'Peso corporal') + ' · ' +
      (ej.descanso
        ? Math.floor(ej.descanso / 60) + 'm' + (ej.descanso % 60 ? String(ej.descanso % 60).padStart(2, '0') + 's' : '')
        : '?') +
      '</span>' +
      '</div>'
    ).join('');

    html += '<div class="progresion-seccion">' +
      '<h4>📅 ' + escapeHtml(dia.nombre) + '</h4>' +
      '<div class="progresion-ejercicios-lista">' + ejHTML + '</div>' +
      htmlSeccion('dia-' + i, (notasRutina.dias || {})[dia.nombre] || '') +
      '</div>';
  });

  html += '<button onclick="volverMenu()" class="btn-secondary" style="margin-top:8px;">← Volver al menú</button>';

  cont.innerHTML = html;

  cont.querySelectorAll('.nota-textarea-auto').forEach(ta => {
    const id = ta.dataset.notaid;
    if (id === 'general') {
      ta.value = notasRutina.general || '';
      ta.placeholder = 'Ej: Doble progresión en básicos. Subo 2,5kg cuando completo el rango máximo en todas las series.';
      ta.oninput = () => { autoGrowTA(ta); guardarNotaProg('general', ta.value, ''); };
    } else {
      const diaIdx = parseInt(id.replace('dia-', ''));
      const diaNombre = dias[diaIdx] ? dias[diaIdx].nombre : '';
      ta.value = (notasRutina.dias || {})[diaNombre] || '';
      ta.placeholder = 'Ej: Press banca → doble progresión 6-10. Si fallo → repetir mismo peso hasta completar todas las series.';
      ta.oninput = () => { autoGrowTA(ta); guardarNotaProg('dia', ta.value, diaNombre); };
    }
  });

  cont.querySelectorAll('.btn-nota-ver').forEach(btn => {
    const id = btn.dataset.id;
    btn.addEventListener('click', () => {
      const prevEl = document.getElementById('nota-preview-' + id);
      const ta = document.getElementById('nota-ta-' + id);
      if (!prevEl || !ta) return;
      if (btn.dataset.exp === '1') {
        const PREVIEW = 180;
        prevEl.innerHTML = escapeHtml(ta.value.substring(0, PREVIEW).trimEnd()) + '...';
        btn.textContent = '📖 Ver completo';
        btn.dataset.exp = '0';
      } else {
        prevEl.innerHTML = escapeHtml(ta.value).replace(/\n/g, '<br>');
        btn.textContent = '🔼 Ver menos';
        btn.dataset.exp = '1';
      }
    });
  });

  cont.querySelectorAll('.btn-nota-editar').forEach(btn => {
    const id = btn.dataset.notaid;
    btn.addEventListener('click', () => {
      document.getElementById('nota-view-' + id)?.classList.add('oculto');
      const editDiv = document.getElementById('nota-edit-' + id);
      if (editDiv) {
        editDiv.classList.remove('oculto');
        const ta = document.getElementById('nota-ta-' + id);
        if (ta) { autoGrowTA(ta); ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length); }
      }
    });
  });

  cont.querySelectorAll('.btn-nota-listo').forEach(btn => {
    const id = btn.dataset.notaid;
    btn.addEventListener('click', () => {
      document.getElementById('nota-edit-' + id)?.classList.add('oculto');
      const viewDiv = document.getElementById('nota-view-' + id);
      const ta = document.getElementById('nota-ta-' + id);
      if (!viewDiv || !ta) return;
      const val = ta.value;
      const PREVIEW = 180;
      const largo = val.length > PREVIEW;
      const preview = largo ? val.substring(0, PREVIEW).trimEnd() + '...' : val;
      const prevEl = document.getElementById('nota-preview-' + id);
      const btnVer = document.getElementById('btn-ver-' + id);
      if (prevEl) prevEl.innerHTML = escapeHtml(preview).replace(/\n/g, '<br>');
      if (btnVer) btnVer.style.display = largo ? '' : 'none';
      if (val.trim() && viewDiv.querySelector('.nota-vacia')) {
        showToast('Nota guardada', 'success', 1800);
        renderNotasProgresion();
        return;
      }
      viewDiv.classList.remove('oculto');
      showToast('Nota guardada', 'success', 1800);
    });
  });
}

window.autoGrowTA = function (ta) {
  ta.style.height = 'auto';
  ta.style.height = ta.scrollHeight + 'px';
};

window.guardarNotaProg = function (tipo, valor, diaNombre = '') {
  const notas = cargarNotasProgresion();
  const rutinaId = obtenerRutinaActiva();
  if (!notas[rutinaId]) notas[rutinaId] = { general: '', dias: {} };
  if (tipo === 'general') {
    notas[rutinaId].general = valor;
  } else if (tipo === 'dia') {
    notas[rutinaId].dias[diaNombre] = valor;
  }
  guardarNotasProgresion(notas);
};

// ══════════════════════════════════════════════════════
// SERVICE WORKER
// ══════════════════════════════════════════════════════
let swRegistration = null;
let _recargarAlCambiarSW = false;

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js')
    .then(reg => {
      if (!reg) return;            // registro bloqueado (modo privado, política del navegador…)
      swRegistration = reg;

      reg.addEventListener('updatefound', () => {
        const nw = reg.installing;
        if (!nw) return;
        nw.addEventListener('statechange', () => {
          if (nw.state === 'installed' && navigator.serviceWorker.controller) {
            showConfirm('🎉 Nueva versión disponible. ¿Actualizar ahora?', () => {
              _recargarAlCambiarSW = true;
              nw.postMessage({ type: 'SKIP_WAITING' });
            }, () => {}, 'Actualizar', 'Luego');
          }
        });
      });
    }).catch(err => console.error('SW error:', err));

  // Recargar solo cuando el usuario aceptó y el nuevo SW ya controla la página
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (_recargarAlCambiarSW) window.location.reload();
  });

  navigator.serviceWorker.addEventListener('message', event => {
    if (event.data?.type === 'HEALTH_RESULT' && event.data.repaired) {
      showToast('🔧 Caché reparada. Recargando...', 'info');
      setTimeout(() => window.location.reload(), 2000);
    }
    if (event.data?.type === 'CACHE_REBUILT') showToast('✅ Caché reconstruida correctamente', 'success');
    if (event.data?.type === 'CACHE_REPAIRED') console.log('[App] SW reparó la caché — versión:', event.data.version);
  });
}

// Al volver la conexión: subir cambios pendientes (sin pisar datos de otros dispositivos)
// y pedir al SW que compruebe la caché
window.addEventListener('online', () => {
  sincronizarSiHaceFalta();
  if (navigator.serviceWorker?.controller) {
    navigator.serviceWorker.controller.postMessage({ type: 'HEALTH_CHECK' });
  }
});

// ── Verificación de salud del SW al volver al primer plano ───────────────────
let _swHealthCheckTimer = null;
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible') return;
  clearTimeout(_swHealthCheckTimer);
  _swHealthCheckTimer = setTimeout(() => {
    if (navigator.serviceWorker?.controller) {
      navigator.serviceWorker.controller.postMessage({ type: 'HEALTH_CHECK' });
    } else if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./sw.js').catch(() => {});
    }
  }, 1500);
});

// ── Restauración desde bfcache ───────────────────────────────────────────────
window.addEventListener('pageshow', async (evt) => {
  if (!evt.persisted) return;
  if (!('serviceWorker' in navigator)) return;
  const reg = await navigator.serviceWorker.getRegistration().catch(() => null);
  if (!reg?.active) window.location.reload();
});

// ══════════════════════════════════════════════════════
// ARRANQUE
// ══════════════════════════════════════════════════════
function restaurarTimersEjercicio(snapshot) {
  Object.keys(snapshot).forEach(ejIdx => {
    const personas = snapshot[ejIdx];
    Object.keys(personas).forEach(pp => {
      const { endTime } = personas[pp];
      const secondsLeft = Math.round((endTime - Date.now()) / 1000);
      const idx = Number(ejIdx);
      const persona = Number(pp);
      const timerId = getTimerId(idx, persona);
      if (secondsLeft > 0) {
        if (!ejercicioTimers[idx]) ejercicioTimers[idx] = {};
        const intervalId = setInterval(() => {
          const remaining = Math.max(0, Math.round((endTime - Date.now()) / 1000));
          actualizarBtnTimer(idx, persona, remaining, true, remaining === 0);
          if (remaining <= 0) {
            clearInterval(intervalId);
            if (ejercicioTimers[idx]) ejercicioTimers[idx][persona] = { intervalId: null, endTime, timerId };
            audioManager.play(timerId);
            vibrarSiActivo();
            notificarTimerTerminado('¡Descanso terminado! Vuelve a la app para continuar.');
            const card = document.querySelector(`.ejercicio[data-ej-index="${idx}"]`);
            if (card) { card.classList.add('timer-ej-flash'); setTimeout(() => card.classList.remove('timer-ej-flash'), 2000); }
          }
        }, 500);
        ejercicioTimers[idx][persona] = { intervalId, endTime, timerId };
        actualizarBtnTimer(idx, persona, secondsLeft, true, false);
      } else if (secondsLeft > -5) {
        actualizarBtnTimer(idx, persona, 0, false, true);
      }
    });
  });
}

// Recordatorio de backup: solo si no hay cuenta en la nube y hay suficientes datos que perder
function recordarBackupSiHaceFalta() {
  try {
    if (userState.uid) return;
    const menuVisible = !document.getElementById('menu')?.classList.contains('oculto');
    if (!menuVisible) return;
    const ahora = Date.now(), DIA = 86400000;
    const ultimo = Number(localStorage.getItem('gym_ultimoBackup')) || 0;
    const posponer = Number(localStorage.getItem('gym_backupSnooze')) || 0;
    const sesiones = leerHistorial().length;
    if (ahora < posponer) return;
    if (ultimo ? (ahora - ultimo < 30 * DIA || sesiones < 1) : sesiones < 5) return;
    const msg = ultimo
      ? `💾 Hace más de 30 días que no exportas una copia de seguridad.\nTienes ${sesiones} sesiones guardadas solo en este teléfono.\n\n¿Exportar una copia ahora?`
      : `💾 Tienes ${sesiones} sesiones guardadas solo en este teléfono y aún no has hecho ninguna copia de seguridad.\n\n¿Exportar una copia ahora?`;
    const posponerSemana = () => { try { localStorage.setItem('gym_backupSnooze', String(Date.now() + 7 * DIA)); } catch {} };
    showConfirm(msg, () => { posponerSemana(); window.exportarBackupJSON(); }, posponerSemana, 'Exportar', 'Luego');
  } catch {}
}

// Accesos directos del manifest (?accion=historial|stats|medidas|timer)
function ejecutarAccesoDirecto() {
  let accion = null;
  try { accion = new URLSearchParams(location.search).get('accion'); } catch {}
  if (!accion) return false;
  try { history.replaceState(history.state, '', location.pathname + location.hash); } catch {}
  if (accion === 'historial') { abrirHistorial(); return true; }
  if (accion === 'stats')     { abrirEstadisticas(); return true; }
  if (accion === 'medidas')   { abrirMedidas(); return true; }
  if (accion === 'timer')     { toggleSidebarRight(); return true; }
  return false;
}

document.addEventListener("DOMContentLoaded", async () => {
  // Ocultar splash de carga tan pronto como el JS está listo
  const splash = document.getElementById('app-splash');
  if (splash) splash.remove();

  // Paneles laterales y diálogos: cada uno que se abre añade su entrada de historial ("atrás" lo cierra)
  navVigilarCapas(Object.entries(CAPAS).map(([id, d]) => ({ id, abierta: d.abierta })));

  inicializarRutinaBase();
  initOfflineBanner();
  renderTimers();
  renderizarBotonesDias();
  renderizarBannerDeload();

  sincronizarControlesTextoGrande();

  // Inicializar toggle de vibración con el valor guardado
  const chkVib = document.getElementById('toggle-vibracion');
  if (chkVib) chkVib.checked = localStorage.getItem('vibrarAlTerminar') === 'true';

  // Inicializar slider de amplificación de audio
  const gainSlider = document.getElementById('audio-gain-slider');
  const gainVal    = document.getElementById('audio-gain-val');
  const savedGain  = parseFloat(localStorage.getItem('audioGain') || '1.0');
  if (gainSlider) gainSlider.value = savedGain;
  if (gainVal)    gainVal.textContent = savedGain.toFixed(1) + '×';

  // El audio se prepara en segundo plano: ya no retrasa la restauración de la pantalla
  initAudio().catch(e => console.warn("Audio:", e));

  const selectHit = document.getElementById("hit-tipo");
  if (selectHit) selectHit.addEventListener("change", e => { hitTipo = e.target.value; guardarEstadoApp(); });

  let saved = null;
  try { saved = JSON.parse(localStorage.getItem("estadoApp")); } catch { saved = null; }
  let restauroDia = false;

  if (saved) {
    diaActual = saved.diaActual;

    if (saved.pantalla === "dia" && diaActual && obtenerRutinaCompleta()[diaActual]) {
      cargarEjerciciosDia();
      // Reps guardadas: se emparejan por nombre (con la posición como desempate)
      (saved.repsPorEjercicio || []).forEach((se, idx) => {
        const ej = (ejerciciosDia[idx] && ejerciciosDia[idx].nombre === se.nombre)
          ? ejerciciosDia[idx] : ejerciciosDia.find(e => e.nombre === se.nombre);
        if (ej && Array.isArray(se.reps)) ej.reps = ej.reps.map((_, i) => se.reps[i] ?? "");
      });

      // Datos de la sesión en curso que antes se perdían al reabrir la app
      sesionStartTime = saved.sesionStartTime || Date.now();
      notasSesion = saved.notasSesion || "";
      const notasEl = document.getElementById('notas-sesion-input');
      if (notasEl) notasEl.value = notasSesion;

      ocultarTodas();
      document.getElementById("pantalla-dia").classList.remove("oculto");
      const tituloDia = document.getElementById("titulo-dia");
      const ra = obtenerRutinaCompleta();
      if (tituloDia && ra[diaActual]) tituloDia.innerText = ra[diaActual].nombre;
      const btnModo = document.getElementById('btn-modo-personas');
      if (btnModo) {
        btnModo.textContent = modoDosPersonas ? '👥 2 personas' : '👤 1 persona';
        btnModo.classList.toggle('modo-activo', modoDosPersonas);
      }
      aplicarConfigDia(diaActual);   // cronómetro HIT y temporizador visibles según el día
      lastEjerciciosDiaHash = null;
      sesionActiva = true;
      guiaUltimaVisible = false;
      renderDia();
      activarWakeLock();
      fijarOrientacionPortrait();
      iniciarAutoGuardado();
      navPush();                      // "atrás" vuelve al menú, no sale de la app
      if (saved.ejTimersSnapshot) restaurarTimersEjercicio(saved.ejTimersSnapshot);
      restauroDia = true;
    } else if (saved.pantalla === "historial") {
      abrirHistorial();
    } else if (saved.pantalla === "medidas") {
      abrirMedidas();
    }

    // HIT: sumar el tiempo transcurrido mientras la app estaba cerrada si seguía en marcha
    if (saved.hitActivo !== undefined) {
      hitTipo = saved.hitTipo || "HIT 1";
      const sel = document.getElementById("hit-tipo");
      if (sel) sel.value = hitTipo;
      hitAcumulado = saved.hitAcumulado || 0;
      if (saved.hitActivo) {
        if (saved.hitInicio) hitAcumulado += Math.max(0, Math.round((Date.now() - saved.hitInicio) / 1000));
        iniciarHIT();
      } else {
        const el = document.getElementById("tiempo-hit");
        if (el) el.innerText = formatearTiempo(hitAcumulado);
      }
    }

    // Temporizador global: recalcular desde el instante final (antes reiniciaba con el valor viejo)
    const totalGuardado = saved.timerDuracionTotal || 0;
    if (saved.timerPausado && saved.tiempoRestante > 0) {
      tiempoRestante = saved.tiempoRestante;
      timerDuracionTotal = totalGuardado || tiempoRestante;
      timerPausado = true;
      const bp = document.querySelector('#temporizador .btn-pausar');
      if (bp) bp.textContent = "▶️ Reanudar";
      mostrarTiempo();
    } else if (saved.tiempoFinal && saved.tiempoFinal > Date.now()) {
      const restante = Math.round((saved.tiempoFinal - Date.now()) / 1000);
      iniciarTemporizador(0, restante);
      timerDuracionTotal = Math.max(totalGuardado, restante);
      mostrarTiempo();
    } else {
      tiempoRestante = 0;
    }

    guardarEstadoApp();
  }

  if (!restauroDia) ejecutarAccesoDirecto();

  // Subir cambios que quedaron pendientes (sin pisar datos más nuevos de otro dispositivo)
  setTimeout(() => sincronizarSiHaceFalta(), 4000);
  setTimeout(recordarBackupSiHaceFalta, 9000);
});
