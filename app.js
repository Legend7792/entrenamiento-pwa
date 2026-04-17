// app.js — Gym Tracker v91 — Versión corregida y optimizada
import "./auth.js";
import "./cloud.js";
import { loadRutinaUsuario, inicializarRutinaBase, RUTINA_BASE_ID as RUTINA_BASE_KEY } from "./rutinaUsuario.js";
import { markDirty, userState } from "./userState.js";
import { renderizarSelectorRutinas, obtenerRutinaActiva, RUTINA_BASE_ID } from "./selectorRutinas.js";
import "./themes.js";
import "./editorRutinas.js";
import { showToast, showConfirm, showPrompt, showAlert, initOfflineBanner } from "./ui.js";
import "./aiImport.js";

// ══════════════════════════════════════════════════════
// AUDIO - Sistema modular con instancias independientes
// ══════════════════════════════════════════════════════
class AudioManager {
  constructor() {
    this.ctx = null;
    this.bufferBeep = null;
    this.bufferPersonalizado = null;
    this.nombrePersonalizado = null;
    this.activeSources = new Map();
  }

  async init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
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
    source.connect(this.ctx.destination);
    source.start();
    this.activeSources.set(timerId, source);
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
      this.bufferPersonalizado = await this.ctx.decodeAudioData(arrayBuffer.slice(0));
      this.nombrePersonalizado = file.name;
      const reader = new FileReader();
      reader.onload = e => {
        try {
          localStorage.setItem('audioPersonalizado', e.target.result);
          localStorage.setItem('audioPersonalizadoNombre', file.name);
          actualizarNombreAudio(file.name);
          showToast('Audio guardado correctamente', 'success');
        } catch {
          showToast('Error al guardar el audio. Intenta con uno más pequeño.', 'error');
        }
      };
      reader.readAsDataURL(file);
      return true;
    } catch {
      showToast('Error al cargar el audio', 'error');
      return false;
    }
  }

  async cargarGuardado() {
    const guardado = localStorage.getItem('audioPersonalizado');
    const nombre = localStorage.getItem('audioPersonalizadoNombre');
    if (!guardado || !nombre) return;
    try {
      if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      const resp = await fetch(guardado);
      const blob = await resp.blob();
      const buf = await blob.arrayBuffer();
      this.bufferPersonalizado = await this.ctx.decodeAudioData(buf);
      this.nombrePersonalizado = nombre;
      actualizarNombreAudio(nombre);
    } catch {
      localStorage.removeItem('audioPersonalizado');
      localStorage.removeItem('audioPersonalizadoNombre');
    }
  }

  resetear() {
    showConfirm('¿Volver al sonido predeterminado?', () => {
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
  Object.keys(ejercicioTimers).forEach(i => cancelarTodosTimersEjercicio(Number(i)));
  const btn = document.getElementById('btn-modo-personas');
  if (btn) {
    btn.textContent = modoDosPersonas ? '👥 2 personas' : '👤 1 persona';
    btn.classList.toggle('modo-activo', modoDosPersonas);
  }
  renderDia();
  renderBotonesUltimaSesion();
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

function guardarConfig() {
  localStorage.setItem("config", JSON.stringify(config));
  if (typeof markDirty === 'function' && userState?.uid) markDirty();
}

function recargarConfig() {
  config = JSON.parse(localStorage.getItem("config")) || { pesos: {}, ejerciciosExtra: {}, descansos: {} };
  if (!config.descansos) config.descansos = {};
}
window.recargarConfig = recargarConfig;

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

function guardarTimers() { localStorage.setItem("timers", JSON.stringify(timers)); }

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

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
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
      <div style="display:flex;gap:4px;font-size:12px;color:var(--text-secondary);">
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
  if (timerID) return;
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
    guardarEstadoApp();
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
  history.pushState({}, "");
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
  const notasEl = document.getElementById('notas-sesion-input');
  if (notasEl) notasEl.value = "";

  cargarEjerciciosDia();
  resetTemporizador();
  renderDia();
  renderBotonesUltimaSesion();

  const rutinaActiva = obtenerRutinaActiva();
  let mostrarCrono = false, mostrarTimer = true;
  const rutinaData = loadRutinaUsuario(rutinaActiva);
  if (rutinaData?.dias) {
    const match = diaKey.match(/dia_(?:base|personalizado)_(\d+)/);
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
function cargarEjerciciosDia() {
  const rutinaActual = obtenerRutinaCompleta();
  if (!rutinaActual[diaActual]) return;
  const nombreDia = rutinaActual[diaActual].nombre;
  const base = rutinaActual[diaActual].ejercicios || [];
  const extra = config.ejerciciosExtra[nombreDia] || [];

  const safeKey = (str) => str.replace(/[<>\"']/g, '');

  const descansoInteligente = (repsMax) => {
    if (!repsMax || repsMax <= 5) return 180;
    if (repsMax <= 8) return 150;
    if (repsMax <= 12) return 90;
    return 60;
  };

  ejerciciosDia = [...base, ...extra].map(ej => {
    const key = `${safeKey(nombreDia)}_${safeKey(ej.nombre)}`;
    const descanso = config.descansos[key] || ej.descanso || descansoInteligente(ej.repsMax);
    return {
      nombre: ej.nombre,
      series: ej.series,
      repsMin: ej.repsMin,
      repsMax: ej.repsMax,
      peso: ej.alFallo ? 0 : (parseFloat(config.pesos[key]) || parseFloat(ej.peso) || 0),
      reps: Array(ej.series).fill(""),
      incremento: ej.alFallo ? 0 : 2,
      noProgresar: ej.alFallo ? true : false,
      alFallo: ej.alFallo || false,
      descanso,
      tempo: ej.tempo || "",
      notas: ej.notas || ""
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
  return modoPrefix + '|' + ejerciciosDia.map(e => `${e.nombre}-${e.series}-${e.repsMin}-${e.repsMax}-${e.peso}-${e.descanso}-${e.alFallo}`).join('|');
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
        <button onclick="mostrarInfoDeload()" style="background:none;border:none;cursor:pointer;font-size:14px;padding:0 4px;">ℹ️</button>
      </div>`;
  }

  ejerciciosDia.forEach((ej, i) => {
    let seriesHTML = "";
    for (let s = 0; s < ej.series; s++) {
      seriesHTML += `<input type="number" min="0" max="${ej.repsMax}"
        id="rep-${i}-${s}" placeholder="S${s + 1}" value="${ej.reps[s]}"
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
            ${ej.tempo ? `<span class="badge-tempo" onclick="mostrarGuiaTempo('${escapeHtml(ej.tempo)}')" title="Ver guía de tempo">${escapeHtml(ej.tempo)} ❓</span>` : ''}
            ${ej.alFallo ? `<span class="badge-fallo">Al fallo</span>` : ''}
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
            <label class="col-label">Peso (kg)</label>
            <input type="number" step="0.5" value="${ej.peso}" onchange="actualizarPesoBase(${i},'${escapeHtml(ej.nombre)}',this.value)">
          </div>` : ''}
          <div class="ejercicio-col">
            <label class="col-label">Objetivo</label>
            <p class="objetivo-texto">${ej.alFallo ? `${ej.series}×Al fallo` : `${ej.series}×${ej.repsMin}${ej.repsMax !== ej.repsMin ? '-' + ej.repsMax : ''}`}</p>
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
}

function actualizarInputsReps() {
  ejerciciosDia.forEach((ej, i) => {
    ej.reps.forEach((rep, s) => {
      const input = document.getElementById(`rep-${i}-${s}`);
      if (input && input.value !== String(rep)) {
        input.value = rep;
        input.classList.remove("serie-ok", "serie-fail", "serie-mid");
        if (!ej.alFallo && rep !== "") {
          const n = Number(rep);
          if (n >= ej.repsMax) input.classList.add("serie-ok");
          else if (n < ej.repsMin) input.classList.add("serie-fail");
          else input.classList.add("serie-mid");
        }
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
        style="width:auto!important;padding:10px 14px!important;margin:0!important;font-size:13px;">✓</button>
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
    const safeKey = (str) => str.replace(/[<>\"']/g, '');
    const key = `${safeKey(nombreDia)}_${safeKey(ejerciciosDia[ejIndex].nombre)}`;
    config.descansos[key] = seg;
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
  if (!ej.alFallo && reps !== "") {
    if (reps >= ej.repsMax) input.classList.add("serie-ok");
    else if (reps < ej.repsMin) input.classList.add("serie-fail");
    else input.classList.add("serie-mid");
  }
  guardarEstadoApp();
}

function guardarPesoBase(nombre, valor) {
  const ra = obtenerRutinaCompleta();
  const nombreDia = ra[diaActual]?.nombre || diaActual;
  const safeKey = (str) => str.replace(/[<>\"']/g, '');
  const key = `${safeKey(nombreDia)}_${safeKey(nombre)}`;
  config.pesos[key] = parseFloat(valor) || 0;
  guardarConfig();
}

window.actualizarPesoBase = (ejIndex, nombre, valor) => {
  ejerciciosDia[ejIndex].peso = parseFloat(valor) || 0;
  if (!deloadEstaActivo()) {
    guardarPesoBase(nombre, valor);
  }
};
window.actualizarIncremento = (ejIndex, valor) => { ejerciciosDia[ejIndex].incremento = parseFloat(valor) || 0; guardarEstadoApp(); };
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

function _doFinalizarDia() {
  Object.keys(ejercicioTimers).forEach(i => cancelarTodosTimersEjercicio(Number(i)));
  audioManager.stopAll();

  const rutinaActual = obtenerRutinaCompleta();
  const sesion = {
    fecha: new Date().toISOString(),
    rutinaId: obtenerRutinaActiva(),
    dia: rutinaActual[diaActual]?.nombre || "Día desconocido",
    notas: notasSesion,
    ejercicios: ejerciciosDia.map(ej => ({ nombre: ej.nombre, peso: ej.peso, reps: [...ej.reps] })),
    tiempoHIT: obtenerTiempoHIT() || null,
    tipoHIT: hitTipo || null
  };

  let huboProgresion = false;
  const detalles = [];
  const enDeload = deloadEstaActivo();

  const cambiosPeso = [];

  ejerciciosDia.forEach(ej => {
    const completo = ej.reps.every(r => Number(r) >= ej.repsMax);
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

  const historial = JSON.parse(localStorage.getItem("historial")) || [];
  historial.push(sesion);
  localStorage.setItem("historial", JSON.stringify(historial));
  guardarConfig();

  ejerciciosDia.forEach(ej => { ej.reps = Array(ej.series).fill(""); ej.incremento = 2; ej.noProgresar = false; });
  resetTemporizador();
  resetHIT();
  lastEjerciciosDiaHash = null;
  renderDia();

  mostrarPantallaResumen(sesion, huboProgresion, detalles, enDeload);
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

  const historialActual = JSON.parse(localStorage.getItem('historial')) || [];
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
  history.pushState({}, "");
  ocultarTodas();
  document.getElementById("pantalla-historial").classList.remove("oculto");
  historialFiltro = "";
  historialPagina = 30;
  const searchInput = document.getElementById("historial-buscar");
  if (searchInput) searchInput.value = "";
  renderListaHistorial();
}

function volverHistorial() {
  history.pushState({}, "");
  ocultarTodas();
  document.getElementById("pantalla-historial").classList.remove("oculto");
}

function verDetalle(index) {
  guardarEstadoApp();
  history.pushState({ pantalla: 'detalle', index }, "");
  const historial = JSON.parse(localStorage.getItem("historial")) || [];
  const s = historial[index];
  if (!s) return;
  ocultarTodas();
  document.getElementById("pantalla-detalle").classList.remove("oculto");

  const cont = document.getElementById("detalle-sesion");
  cont.innerHTML = `
    <div class="detalle-header">
      <p>${new Date(s.fecha).toLocaleString('es-ES')}</p>
      <p class="resumen-dia">${escapeHtml(s.dia)}</p>
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
    localStorage.removeItem("historial");
    cacheUltimaSesion.clear();
    const cont = document.getElementById("lista-historial");
    if (cont) cont.innerHTML = `<p class="texto-vacio">No hay sesiones registradas.</p>`;
    showToast("Historial eliminado", "info");
  });
}

window.borrarSesion = function (index) {
  const historial = JSON.parse(localStorage.getItem("historial")) || [];
  const s = historial[index];
  if (!s) return;
  showConfirm(`¿Borrar sesión del ${new Date(s.fecha).toLocaleString('es-ES')}?`, () => {
    historial.splice(index, 1);
    localStorage.setItem("historial", JSON.stringify(historial));
    cacheUltimaSesion.clear();
    renderListaHistorial();
    showToast("Sesión eliminada", "success");
  });
};

function limpiarHistorialDuplicados() {
  let h = JSON.parse(localStorage.getItem("historial")) || [];
  const antes = h.length;
  h = h.filter((s, i, a) => i === a.findIndex(x => x.fecha === s.fecha && x.dia === s.dia));
  localStorage.setItem("historial", JSON.stringify(h));
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
  history.pushState({}, "");
  ocultarTodas();
  document.getElementById("pantalla-medidas").classList.remove("oculto");
  cargarMedidas();
}

function guardarMedidas() {
  const campos = ["peso", "altura", "cintura", "cadera", "pecho", "brazo_relajado", "brazo_contraido", "muslo"];
  const nuevaMedida = { fecha: new Date().toISOString() };
  campos.forEach(id => { const v = document.getElementById(id)?.value; nuevaMedida[id] = v ? Number(v) : null; });
  const h = JSON.parse(localStorage.getItem("historialMedidas")) || [];
  h.push(nuevaMedida);
  localStorage.setItem("historialMedidas", JSON.stringify(h));
  showToast("Medidas guardadas", "success");
  campos.forEach(id => { const el = document.getElementById(id); if (el) el.value = ""; });
  cargarMedidas();
}

function cargarMedidas() {
  const cont = document.getElementById("lista-medidas");
  if (!cont) return;
  const h = JSON.parse(localStorage.getItem("historialMedidas")) || [];
  if (h.length === 0) { cont.innerHTML = `<p class="texto-vacio">Sin medidas registradas.</p>`; return; }
  cont.innerHTML = h.slice().reverse().map((m, iRev) => {
    const iReal = h.length - 1 - iRev;
    return `
    <div class="medida-item">
      <div class="medida-item-header">
        <strong>${new Date(m.fecha).toLocaleDateString('es-ES')}</strong>
        <button class="btn-danger-sm" onclick="borrarMedidaIndividual(${iReal})" title="Borrar esta medida">🗑️</button>
      </div>
      ${m.peso !== null ? `<p>Peso: ${m.peso} kg</p>` : ''}
      ${m.altura !== null ? `<p>Altura: ${m.altura} cm</p>` : ''}
      ${m.cintura !== null ? `<p>Cintura: ${m.cintura} cm</p>` : ''}
      ${m.cadera !== null ? `<p>Cadera: ${m.cadera} cm</p>` : ''}
      ${m.pecho !== null ? `<p>Pecho: ${m.pecho} cm</p>` : ''}
      ${m.brazo_relajado !== null ? `<p>Brazo rel.: ${m.brazo_relajado} cm</p>` : ''}
      ${m.brazo_contraido !== null ? `<p>Brazo cont.: ${m.brazo_contraido} cm</p>` : ''}
      ${m.muslo !== null ? `<p>Muslo: ${m.muslo} cm</p>` : ''}
    </div>`;
  }).join('');
}

window.borrarMedidaIndividual = function (index) {
  const h = JSON.parse(localStorage.getItem("historialMedidas")) || [];
  if (!h[index]) return;
  const fecha = new Date(h[index].fecha).toLocaleDateString('es-ES');
  showConfirm(`¿Borrar medida del ${fecha}?`, () => {
    h.splice(index, 1);
    localStorage.setItem("historialMedidas", JSON.stringify(h));
    cargarMedidas();
    showToast("Medida eliminada", "success");
  });
};

function borrarTodoHistorialMedidas() {
  showConfirm("¿Borrar todo el historial de medidas?", () => {
    localStorage.removeItem("historialMedidas");
    const cont = document.getElementById("lista-medidas");
    if (cont) cont.innerHTML = `<p class="texto-vacio">Sin medidas registradas.</p>`;
    showToast("Historial de medidas eliminado", "info");
  });
}

function abrirConfigAudio() {
  cerrarSidebar();
  guardarEstadoApp();
  history.pushState({}, "");
  ocultarTodas();
  document.getElementById("pantalla-audio").classList.remove("oculto");
  actualizarNombreAudio(audioManager.nombrePersonalizado || 'Beep (predeterminado)');
}
window.abrirConfigAudio = abrirConfigAudio;

window.mostrarGuiaTempo = function (tempo) {
  const partes = tempo.split('-');
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
  history.pushState({}, "");
  ocultarTodas();
  document.getElementById("pantalla-guia-tempo").classList.remove("oculto");
}
window.abrirGuiaTempo = abrirGuiaTempo;

async function forzarActualizacion() {
  showConfirm('⚠️ Limpiará la caché y recargará la app.\nTus datos NO se perderán.\n¿Continuar?', async () => {
    try {
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
      setTimeout(() => window.location.reload(true), 1200);
    } catch { showToast('Error al actualizar. Cierra y abre la app.', 'warning'); }
  });
}

function mostrarModalTimer() { document.getElementById("modal-timer")?.classList.remove("oculto"); }
function ocultarModalTimer() { document.getElementById("modal-timer")?.classList.add("oculto"); }
function resetDesdeModal() { resetTemporizador(); ocultarModalTimer(); }

function volverMenu() {
  const enDia = !document.getElementById("pantalla-dia")?.classList.contains("oculto");
  if (enDia) {
    const hayReps = ejerciciosDia.some(ej => ej.reps.some(r => r !== ""));
    if (hayReps) {
      showConfirm(
        '¿Salir del entrenamiento?\nLas repeticiones marcadas NO se guardarán hasta que pulses "✅ Finalizar sesión".',
        _doVolverMenu,
        () => { }
      );
      return;
    }
  }
  _doVolverMenu();
}

function _doVolverMenu() {
  history.pushState({ pantalla: 'menu' }, "");
  ocultarTodas();
  document.getElementById("menu").classList.remove("oculto");
  cerrarSidebarRight();
  renderizarSelectorRutinas();
  renderizarBannerDeload();
  guardarEstadoApp();
  Object.keys(ejercicioTimers).forEach(i => cancelarTodosTimersEjercicio(Number(i)));
  audioManager.stopAll();
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
      : `<span style="color:var(--text-secondary);font-size:12px;">Sin cuenta — datos locales</span>`}
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
  const pantalla =
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
    tiempoRestante, tiempoFinal,
    ejTimersSnapshot,
    hitActivo, hitAcumulado, hitTipo
  };
  localStorage.setItem("estadoApp", JSON.stringify(estadoApp));
}

function renderizarBotonesDias() {
  const contenedor = document.getElementById("botones-dias");
  if (!contenedor) return;
  const rutinaActual = obtenerRutinaCompleta();
  const historial = JSON.parse(localStorage.getItem("historial")) || [];
  contenedor.innerHTML = "";
  
  // Pre-calcular última sesión por día para optimizar
  const ultimaPorDia = new Map();
  historial.forEach(s => {
    if (!ultimaPorDia.has(s.dia) || new Date(s.fecha) > new Date(ultimaPorDia.get(s.dia).fecha)) {
      ultimaPorDia.set(s.dia, s);
    }
  });
  
  Object.keys(rutinaActual).forEach((diaKey, idx) => {
    const dia = rutinaActual[diaKey];
    const ultimaSesion = ultimaPorDia.get(dia.nombre);
    let subtexto = '';
    if (ultimaSesion) {
      const dias = Math.floor((Date.now() - new Date(ultimaSesion.fecha).getTime()) / 86400000);
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
  const historial = JSON.parse(localStorage.getItem("historial")) || [];
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
  const historial = JSON.parse(localStorage.getItem("historial")) || [];
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
  const ultimaSesion = obtenerUltimaSesion();
  if (!ultimaSesion) return;
  if (document.getElementById('btn-toggle-guia')) return;

  const historial = JSON.parse(localStorage.getItem("historial")) || [];
  const idxSesion = historial.findIndex(s => s.fecha === ultimaSesion.fecha && s.dia === ultimaSesion.dia);
  const fechaCorta = new Date(ultimaSesion.fecha).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });

  contenedor.insertAdjacentHTML('afterbegin', `
    <div class="botones-ultima-sesion">
      <button onclick="toggleGuiaUltimaSesion()" id="btn-toggle-guia" class="btn-secondary">👁️ Última sesión (${fechaCorta})</button>
      ${idxSesion >= 0 ? `<button onclick="abrirHistorial();setTimeout(()=>verDetalle(${idxSesion}),150)" class="btn-link" style="width:auto!important;padding:4px 8px!important;font-size:12px;">Ver detalle →</button>` : ''}
    </div>`);
}

function obtenerUltimaSesion() {
  const historial = JSON.parse(localStorage.getItem("historial")) || [];
  const rutinaActual = obtenerRutinaCompleta();
  const nombreDia = rutinaActual[diaActual]?.nombre;
  const rutinaActiva = obtenerRutinaActiva();
  if (!nombreDia) return null;
  return historial.filter(s => (s.rutinaId ? s.rutinaId === rutinaActiva : true) && s.dia === nombreDia)
    .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))[0] || null;
}

window.toggleGuiaUltimaSesion = function () {
  const guias = document.querySelectorAll('.guia-ultima-sesion');
  const btn = document.getElementById('btn-toggle-guia');
  if (guias.length > 0) {
    guias.forEach(g => g.remove());
    btn.textContent = `👁️ Última sesión`;
    btn.classList.remove('activo');
  } else {
    mostrarGuiaUltimaSesion();
    btn.textContent = '🚫 Ocultar guía';
    btn.classList.add('activo');
  }
};

function mostrarGuiaUltimaSesion() {
  const sesion = obtenerUltimaSesion();
  if (!sesion) return;
  const fecha = new Date(sesion.fecha).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
  ejerciciosDia.forEach((ej, ejIndex) => {
    const ejAnterior = sesion.ejercicios.find(e => e.nombre === ej.nombre);
    if (!ejAnterior) return;
    const div = document.querySelectorAll('.ejercicio')[ejIndex];
    if (!div) return;
    const guia = `<div class="guia-ultima-sesion">
      <span class="guia-fecha">📅 ${fecha}</span>
      <span class="guia-peso">Peso: ${ejAnterior.peso}kg</span>
      <span class="guia-reps">Reps: ${ejAnterior.reps.filter(r => r !== "").join(' - ')}</span>
    </div>`;
    div.querySelector('h3')?.insertAdjacentHTML('afterend', guia);
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

window.addEventListener("popstate", () => {
  if (!document.getElementById("modal-timer")?.classList.contains("oculto")) { ocultarModalTimer(); return; }
  if (document.getElementById("sidebar-right")?.classList.contains("sidebar-right-open")) { toggleSidebarRight(); return; }
  if (document.getElementById("sidebar")?.classList.contains("sidebar-open")) { toggleSidebar(); return; }
  if (!document.getElementById("modal-tempo-overlay")?.classList.contains("oculto")) { cerrarModalTempo(); return; }
  if (!document.getElementById("pantalla-perfil")?.classList.contains("oculto")) { volverMenu(); return; }
  if (!document.getElementById("pantalla-audio")?.classList.contains("oculto")) { volverMenu(); return; }
  if (!document.getElementById("pantalla-editor")?.classList.contains("oculto")) { volverMenu(); return; }
  if (!document.getElementById("pantalla-guia-tempo")?.classList.contains("oculto")) { volverMenu(); return; }
  if (!document.getElementById("pantalla-ai-import")?.classList.contains("oculto")) { volverMenu(); return; }
  if (!document.getElementById("pantalla-estadisticas")?.classList.contains("oculto")) { volverMenu(); return; }
  if (!document.getElementById("pantalla-progreso")?.classList.contains("oculto")) { volverMenu(); return; }
  if (!document.getElementById("pantalla-progresion-rutina")?.classList.contains("oculto")) { volverMenu(); return; }
  if (!document.getElementById("pantalla-resumen")?.classList.contains("oculto")) { cerrarResumen(); return; }
  if (!document.getElementById("pantalla-detalle")?.classList.contains("oculto")) { volverHistorial(); return; }
  if (!document.getElementById("pantalla-medidas")?.classList.contains("oculto")) { volverMenu(); return; }
  if (!document.getElementById("pantalla-historial")?.classList.contains("oculto")) { volverMenu(); return; }
  if (!document.getElementById("pantalla-dia")?.classList.contains("oculto")) { volverMenu(); return; }
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
  const historial = JSON.parse(localStorage.getItem("historial")) || [];
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
  const historial = JSON.parse(localStorage.getItem("historial")) || [];
  if (historial.length === 0) { showToast('No hay historial para exportar', 'warning'); return; }

  const filas = [['Fecha', 'Día', 'Ejercicio', 'Peso (kg)', 'Series completadas', 'Nota sesión', 'Tiempo HIT', 'Tipo HIT']];
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

  const csv = filas.map(f => f.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `historial_gym_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('CSV exportado correctamente', 'success');
};

function abrirEstadisticas() {
  cerrarSidebar();
  history.pushState({}, '');
  ocultarTodas();
  document.getElementById('pantalla-estadisticas').classList.remove('oculto');
  renderEstadisticas();
}
window.abrirEstadisticas = abrirEstadisticas;

function renderEstadisticas() {
  const cont = document.getElementById('stats-contenido');
  if (!cont) return;
  const historial = JSON.parse(localStorage.getItem('historial')) || [];

  if (historial.length === 0) {
    cont.innerHTML = `<p class="texto-vacio">Sin sesiones registradas todavía.</p>`; return;
  }

  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  const fechasUnicas = [...new Set(historial.map(s => {
    const d = new Date(s.fecha); d.setHours(0, 0, 0, 0); return d.getTime();
  }))].sort((a, b) => b - a);

  let rachaActual = 0;
  let cursor = hoy.getTime();
  for (const f of fechasUnicas) {
    if (f === cursor || f === cursor - 86400000) { rachaActual++; cursor = f; }
    else break;
  }
  const rachaMejor = calcularRachaMejor(fechasUnicas);

  const primeraFecha = historial.length ? new Date(historial[0].fecha) : new Date();
  const semanasTotales = Math.max(1, Math.ceil((Date.now() - primeraFecha.getTime()) / (7 * 86400000)));
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
      if (!ej.peso || ej.peso <= 0) return;
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
        <span class="stat-val">${(totalVolumen / 1000).toFixed(0)}t</span>
        <span class="stat-lbl">Volumen total</span>
      </div>
      <div class="stat-box">
        <span class="stat-val">${diaFav ? diaFav[1] : 0}x</span>
        <span class="stat-lbl">${diaFav ? diaFav[0].split('–')[1]?.trim() || diaFav[0] : '-'}</span>
      </div>
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

    <button onclick="abrirProgreso()" class="btn-secondary" style="margin-top:4px;">📈 Ver gráficas de progreso</button>`;
}

function calcularRachaMejor(fechasOrdenadas) {
  if (!fechasOrdenadas.length) return 0;
  let mejor = 1, actual = 1;
  for (let i = 1; i < fechasOrdenadas.length; i++) {
    if (fechasOrdenadas[i - 1] - fechasOrdenadas[i] === 86400000) { actual++; mejor = Math.max(mejor, actual); }
    else actual = 1;
  }
  return mejor;
}

function abrirProgreso() {
  cerrarSidebar();
  history.pushState({}, '');
  ocultarTodas();
  document.getElementById('pantalla-progreso').classList.remove('oculto');
  poblarSelectorEjercicios();
}
window.abrirProgreso = abrirProgreso;

function poblarSelectorEjercicios() {
  const sel = document.getElementById('progreso-ejercicio-select');
  if (!sel) return;
  const historial = JSON.parse(localStorage.getItem('historial')) || [];
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
  const historial = JSON.parse(localStorage.getItem('historial')) || [];

  const datosEj = historial.filter(s => s.ejercicios.some(e => e.nombre === nombre));
  const esAlFallo = datosEj.length > 0 && datosEj.every(s => {
    const ej = s.ejercicios.find(e => e.nombre === nombre);
    return !ej?.peso || ej.peso === 0;
  });

  if (esAlFallo) {
    cont.innerHTML = `<div class="chart-empty-fallo">
      <p>⚠️ <strong>${escapeHtml(nombre)}</strong> es un ejercicio de peso corporal / al fallo.</p>
      <p style="font-size:13px;color:var(--text-secondary);">La gráfica de peso no aplica. Puedes ver el historial de reps en la pantalla de detalle de cada sesión.</p>
    </div>`; return;
  }

  const datos = datosEj
    .filter(s => s.ejercicios.some(e => e.nombre === nombre))
    .map(s => {
      const ej = s.ejercicios.find(e => e.nombre === nombre);
      const repsTotal = (ej.reps || []).filter(r => r !== '').reduce((a, r) => a + Number(r), 0);
      return {
        fecha: s.fecha,
        peso: ej.peso || 0,
        volumen: (ej.peso || 0) * repsTotal
      };
    })
    .sort((a, b) => new Date(a.fecha) - new Date(b.fecha))
    .slice(-20);

  if (datos.length < 2) {
    cont.innerHTML = `<p class="chart-empty">Necesitas al menos 2 sesiones con "${escapeHtml(nombre)}" para ver la gráfica.</p>`; return;
  }

  const esPeso = graficaModo === 'peso';
  const valores = datos.map(d => esPeso ? d.peso : d.volumen);
  const maxVal = Math.max(...valores);
  const minVal = Math.min(...valores);
  const rango = maxVal - minVal || 1;
  const ultimo = valores[valores.length - 1];
  const primero = valores[0];
  const mejora = parseFloat((ultimo - primero).toFixed(1));
  const unidad = esPeso ? 'kg' : 'kg·r';

  const alturaMax = 140;
  const barras = datos.map((d, idx) => {
    const val = valores[idx];
    const pct = (val - minVal) / rango;
    const alto = Math.max(8, Math.round(pct * alturaMax) + 8);
    const fecha = new Date(d.fecha).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' });
    const esMax = val === maxVal;
    const label = esPeso ? `${val}kg` : `${val}`;
    return `<div class="chart-bar-wrap">
      <span class="chart-bar-val">${label}</span>
      <div class="chart-bar" style="height:${alto}px;${esMax ? 'background:var(--success);' : ''}" title="${label} — ${fecha}"></div>
      <span class="chart-bar-date">${fecha}</span>
    </div>`;
  }).join('');

  cont.innerHTML = `
    <div class="grafica-toggle">
      <button onclick="setGraficaModo('peso')" class="${esPeso ? 'activo' : 'btn-secondary'}">⚖️ Peso máx</button>
      <button onclick="setGraficaModo('volumen')" class="${!esPeso ? 'activo' : 'btn-secondary'}">📦 Volumen</button>
    </div>
    <div style="display:flex;gap:10px;margin-bottom:10px;flex-wrap:wrap;">
      <div class="stat-box" style="flex:1;min-width:80px;">
        <span class="stat-val">${maxVal} ${unidad}</span><span class="stat-lbl">${esPeso ? 'Récord' : 'Vol. máx'}</span>
      </div>
      <div class="stat-box ${mejora > 0 ? 'highlight' : ''}" style="flex:1;min-width:80px;">
        <span class="stat-val">${mejora >= 0 ? '+' : ''}${mejora} ${unidad}</span><span class="stat-lbl">Total ganado</span>
      </div>
      <div class="stat-box" style="flex:1;min-width:80px;">
        <span class="stat-val">${datos.length}</span><span class="stat-lbl">Sesiones</span>
      </div>
    </div>
    <div class="chart-container">
      <div class="chart-bars">${barras}</div>
    </div>
    <p style="font-size:12px;color:var(--text-secondary);text-align:center;">
      🟢 barra verde = ${esPeso ? 'récord de peso' : 'sesión de mayor volumen'} · Últimas ${datos.length} sesiones
    </p>`;
};

window.addEventListener("cambio-rutina", () => {
  renderizarBotonesDias();
  renderizarBannerDeload();
  renderizarSelectorRutinas();
  if (diaActual) { cargarEjerciciosDia(); renderDia(); }
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
  history.pushState({}, '');
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
    '<p style="font-size:12px;color:var(--text-secondary);margin:4px 0 0;">' +
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

if ("Notification" in window && Notification.permission !== "granted") {
  Notification.requestPermission();
}

let swRegistration = null;

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js')
    .then(reg => {
      swRegistration = reg;

      // NO hacer reg.update() automático periódico.
      // El update automático puede desencadenar skipWaiting + reload en background
      // mientras el usuario usa la app offline → pantalla negra.
      // Solo verificar actualizaciones cuando el usuario lo pida explícitamente
      // (botón "Actualizar app") o al volver online con conexión real.

      reg.addEventListener('updatefound', () => {
        const nw = reg.installing;
        if (!nw) return;
        nw.addEventListener('statechange', () => {
          // Solo ofrecer actualización si hay un controller activo (no primera instalación)
          // y el usuario tiene conexión (no está offline)
          if (nw.state === 'installed' && navigator.serviceWorker.controller && navigator.onLine) {
            showConfirm('🎉 Nueva versión disponible. ¿Actualizar ahora?', () => {
              nw.postMessage({ type: 'SKIP_WAITING' });
              // Esperar un tick antes de recargar para que el SW nuevo tome control
              setTimeout(() => window.location.reload(), 200);
            });
          }
        });
      });
    }).catch(err => console.error('SW error:', err));

  navigator.serviceWorker.addEventListener('message', event => {
    if (event.data?.type === 'SYNC_DATA' && userState.uid) {
      import('./userState.js').then(m => m.syncToCloud?.().catch(() => { }));
    }
  });
}

// Al volver online: intentar sync pero NO forzar update del SW
// (el update del SW puede causar reload inesperado)
window.addEventListener('online', () => {
  if (userState.uid) {
    import('./userState.js').then(m => m.syncToCloud?.().catch(() => { }));
  }
});

document.addEventListener("DOMContentLoaded", async () => {
  inicializarRutinaBase();
  initOfflineBanner();
  renderTimers();
  renderizarBotonesDias();
  renderizarBannerDeload();

  try { await initAudio(); } catch (e) { console.warn("Audio:", e); }

  const saved = JSON.parse(localStorage.getItem("estadoApp"));
  if (saved) {
    diaActual = saved.diaActual;
    tiempoRestante = saved.tiempoRestante || 0;
    tiempoFinal = saved.tiempoFinal;

    // Restaurar estado HIT si existe
    if (saved.hitActivo !== undefined) {
      hitTipo = saved.hitTipo || "HIT 1";
      if (saved.hitActivo) {
        hitAcumulado = saved.hitAcumulado || 0;
        iniciarHIT();
      } else {
        hitAcumulado = saved.hitAcumulado || 0;
        const el = document.getElementById("tiempo-hit");
        if (el) el.innerText = formatearTiempo(hitAcumulado);
      }
    }

    if (saved.pantalla === "dia" && diaActual) {
      cargarEjerciciosDia();
      if (saved.repsPorEjercicio) {
        saved.repsPorEjercicio.forEach(se => {
          const ej = ejerciciosDia.find(e => e.nombre === se.nombre);
          if (ej) ej.reps = se.reps;
        });
      }
      renderDia();
      renderBotonesUltimaSesion();

      if (saved.ejTimersSnapshot) {
        Object.keys(saved.ejTimersSnapshot).forEach(ejIdx => {
          const personas = saved.ejTimersSnapshot[ejIdx];
          Object.keys(personas).forEach(p => {
            const { endTime } = personas[p];
            const secondsLeft = Math.round((endTime - Date.now()) / 1000);
            if (secondsLeft > 0) {
              const idx = Number(ejIdx);
              const persona = Number(p);
              const timerId = getTimerId(idx, persona);
              if (!ejercicioTimers[idx]) ejercicioTimers[idx] = {};
              const intervalId = setInterval(() => {
                const remaining = Math.max(0, Math.round((endTime - Date.now()) / 1000));
                actualizarBtnTimer(idx, persona, remaining, true, remaining === 0);
                if (remaining <= 0) {
                  clearInterval(intervalId);
                  delete ejercicioTimers[idx][persona];
                  audioManager.play(timerId);
                  const card = document.querySelector(`.ejercicio[data-ej-index="${idx}"]`);
                  if (card) { card.classList.add('timer-ej-flash'); setTimeout(() => card.classList.remove('timer-ej-flash'), 2000); }
                }
              }, 500);
              ejercicioTimers[idx][persona] = { intervalId, endTime, timerId };
              actualizarBtnTimer(idx, persona, secondsLeft, true, false);
            } else if (secondsLeft <= 0 && secondsLeft > -5) {
              // Timer expiró hace poco, notificar
              const idx = Number(ejIdx);
              const persona = Number(p);
              actualizarBtnTimer(idx, persona, 0, false, true);
            }
          });
        });
      }

      if (saved.repsPorEjercicio) {
        saved.repsPorEjercicio.forEach((se, ei) => {
          const ej = ejerciciosDia.find(e => e.nombre === se.nombre);
          if (!ej) return;
          se.reps.forEach((r, si) => {
            const input = document.getElementById(`rep-${ei}-${si}`);
            if (!input || r === "" || ej.alFallo) return;
            const n = Number(r);
            input.classList.toggle('serie-ok', n >= ej.repsMax);
            input.classList.toggle('serie-fail', n < ej.repsMin);
            input.classList.toggle('serie-mid', n >= ej.repsMin && n < ej.repsMax);
          });
        });
      }
      mostrarTiempo();
      ocultarTodas();
      document.getElementById("pantalla-dia").classList.remove("oculto");
      const tituloDia = document.getElementById("titulo-dia");
      const ra = obtenerRutinaCompleta();
      if (tituloDia && ra[diaActual]) tituloDia.innerText = ra[diaActual].nombre;
    } else if (saved.pantalla === "historial") {
      abrirHistorial();
    } else if (saved.pantalla === "medidas") {
      abrirMedidas();
    }

    if (tiempoFinal && tiempoFinal > Date.now()) {
      iniciarTemporizador(0, tiempoRestante);
    } else {
      tiempoRestante = 0;
    }
  }

  const selectHit = document.getElementById("hit-tipo");
  if (selectHit) selectHit.addEventListener("change", e => { hitTipo = e.target.value; });
});
