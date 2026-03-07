// app.js — Gym Tracker v89 — Versión completa
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
// AUDIO
// ══════════════════════════════════════════════════════
let audioCtx;
let bufferBeep;
let sourceBeep;
let audioPersonalizado     = null;
let audioPersonalizadoNombre = null;

async function initAudio() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  const resp = await fetch("./beep.mp3");
  const arrayBuffer = await resp.arrayBuffer();
  bufferBeep = await audioCtx.decodeAudioData(arrayBuffer);
  await cargarAudioGuardado();
}

function desbloquearAudioPorGesto() {
  if (audioCtx?.state === "suspended") audioCtx.resume();
}

function playBeep() {
  if (!audioCtx) return;
  const buf = audioPersonalizado || bufferBeep;
  if (!buf) return;
  if (audioCtx.state === "suspended") audioCtx.resume().catch(() => {});
  sourceBeep = audioCtx.createBufferSource();
  sourceBeep.buffer = buf;
  sourceBeep.loop = true;
  sourceBeep.connect(audioCtx.destination);
  sourceBeep.start();
}

function stopBeep() {
  try { sourceBeep?.stop(); sourceBeep?.disconnect(); } catch (e) {}
  sourceBeep = null;
}

async function cargarAudioPersonalizado(input) {
  const file = input.files[0];
  if (!file) return;
  if (!file.type.startsWith('audio/')) { showToast('Selecciona un archivo de audio válido', 'warning'); input.value = ''; return; }
  if (file.size > 5 * 1024 * 1024) { showToast('Archivo muy grande. Máximo 5MB.', 'warning'); input.value = ''; return; }
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const arrayBuffer = await file.arrayBuffer();
    audioPersonalizado = await audioCtx.decodeAudioData(arrayBuffer.slice(0));
    audioPersonalizadoNombre = file.name;
    const reader = new FileReader();
    reader.onload = e => {
      try {
        localStorage.setItem('audioPersonalizado', e.target.result);
        localStorage.setItem('audioPersonalizadoNombre', file.name);
        actualizarNombreAudio(file.name);
        showToast('Audio guardado correctamente', 'success');
      } catch { showToast('Error al guardar el audio. Intenta con uno más pequeño.', 'error'); }
    };
    reader.readAsDataURL(file);
  } catch { showToast('Error al cargar el audio', 'error'); }
  finally { input.value = ''; }
}

async function cargarAudioGuardado() {
  const guardado = localStorage.getItem('audioPersonalizado');
  const nombre   = localStorage.getItem('audioPersonalizadoNombre');
  if (!guardado || !nombre) return;
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const resp = await fetch(guardado);
    const blob = await resp.blob();
    const buf  = await blob.arrayBuffer();
    audioPersonalizado = await audioCtx.decodeAudioData(buf);
    audioPersonalizadoNombre = nombre;
    actualizarNombreAudio(nombre);
  } catch {
    localStorage.removeItem('audioPersonalizado');
    localStorage.removeItem('audioPersonalizadoNombre');
  }
}

function resetearAudioPorDefecto() {
  showConfirm('¿Volver al sonido predeterminado?', () => {
    localStorage.removeItem('audioPersonalizado');
    localStorage.removeItem('audioPersonalizadoNombre');
    audioPersonalizado = null;
    audioPersonalizadoNombre = null;
    actualizarNombreAudio('Beep (predeterminado)');
    showToast('Audio restaurado', 'success');
  });
}

function probarSonido() { stopBeep(); playBeep(); setTimeout(stopBeep, 2000); }

function actualizarNombreAudio(nombre) {
  const el = document.getElementById('nombre-audio-display');
  if (el) el.textContent = nombre;
}

window.cargarAudioPersonalizado = cargarAudioPersonalizado;
window.resetearAudioPorDefecto  = resetearAudioPorDefecto;
window.probarSonido             = probarSonido;

// ══════════════════════════════════════════════════════
// ESTADO CENTRAL
// ══════════════════════════════════════════════════════
let estadoApp = JSON.parse(localStorage.getItem("estadoApp")) || {
  pantalla: "menu", diaActual: null, ejerciciosDia: null,
  tiempoRestante: 0, tiempoFinal: null
};

let diaActual    = null;
let ejerciciosDia = [];
let notasSesion  = "";

// ══════════════════════════════════════════════════════
// MODO 2 PERSONAS — TIMERS INDEPENDIENTES POR EJERCICIO
// ══════════════════════════════════════════════════════
//
//  CÓMO FUNCIONA:
//  • Modo 1 persona (por defecto): cada ejercicio tiene 1 botón ⏱️.
//    Al pulsarlo inicia el descanso. Volver a pulsarlo lo cancela.
//
//  • Modo 2 personas (toggle ☰ → 👥): cada ejercicio muestra 2 botones
//    independientes: ⏱️ P1 y ⏱️ P2.
//    Persona 1 termina su serie y pulsa su botón → empieza SU cuenta atrás.
//    Persona 2 termina (quizás 30 seg después) y pulsa SU botón → empieza
//    SU cuenta atrás independiente. Ambos timers corren simultáneamente y
//    no se interfieren. Cuando uno termina, suena el beep y el botón
//    hace flash. El otro sigue corriendo si aún no acabó.
//
//  • Uso habitual en el gym: P1 termina → pulsa P1. P2 termina → pulsa P2.
//    No hace falta coordinación.

let modoDosPersonas = localStorage.getItem('modoDosPersonas') === 'true';

// ejercicioTimers[ejIndex][persona] = { intervalId, endTime }
// persona: 0 = P1, 1 = P2
const ejercicioTimers = {};

function iniciarTimerEjercicio(ejIndex, persona = 0) {
  const ej = ejerciciosDia[ejIndex];
  if (!ej) return;
  const segundos = ej.descanso || 90;

  if (!ejercicioTimers[ejIndex]) ejercicioTimers[ejIndex] = {};

  // Si el botón está en estado "done" (sonando) → primera pulsación para el sonido y resetea
  const id  = modoDosPersonas ? `timer-ej-${ejIndex}-${persona}` : `timer-ej-${ejIndex}`;
  const btn = document.getElementById(id);
  if (btn?.classList.contains('timer-ej-done')) {
    stopBeep();
    actualizarBtnTimer(ejIndex, persona, segundos, false, false);
    return;
  }

  // Cancelar si ya corría para esta persona (toggle cancel)
  if (ejercicioTimers[ejIndex][persona]) {
    clearInterval(ejercicioTimers[ejIndex][persona].intervalId);
    delete ejercicioTimers[ejIndex][persona];
    actualizarBtnTimer(ejIndex, persona, segundos, false, false);
    stopBeep(); // por si acaso sonaba algo
    return;
  }

  // Parar cualquier beep previo antes de iniciar nuevo timer
  stopBeep();

  const endTime = Date.now() + segundos * 1000;
  const intervalId = setInterval(() => {
    const remaining = Math.max(0, Math.round((endTime - Date.now()) / 1000));
    actualizarBtnTimer(ejIndex, persona, remaining, true, remaining === 0);

    if (remaining <= 0) {
      clearInterval(intervalId);
      delete ejercicioTimers[ejIndex][persona];
      playBeep();
      // Flash tarjeta
      const card = document.querySelector(`.ejercicio[data-ej-index="${ejIndex}"]`);
      if (card) { card.classList.add('timer-ej-flash'); setTimeout(() => card.classList.remove('timer-ej-flash'), 2000); }
      // NO auto-resetear — el usuario para el sonido pulsando el botón
    }
  }, 500);

  ejercicioTimers[ejIndex][persona] = { intervalId, endTime };
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
  btn.classList.toggle('timer-ej-done',   done);
}

function cancelarTodosTimersEjercicio(ejIndex) {
  if (!ejercicioTimers[ejIndex]) return;
  [0, 1].forEach(p => {
    if (ejercicioTimers[ejIndex][p]) {
      clearInterval(ejercicioTimers[ejIndex][p].intervalId);
      delete ejercicioTimers[ejIndex][p];
    }
  });
}

window.toggleTimerEjercicio = (ejIndex, persona = 0) => iniciarTimerEjercicio(ejIndex, persona);

window.toggleModoDosPersonas = function () {
  modoDosPersonas = !modoDosPersonas;
  localStorage.setItem('modoDosPersonas', modoDosPersonas);
  // Cancelar todos los timers activos
  Object.keys(ejercicioTimers).forEach(i => cancelarTodosTimersEjercicio(Number(i)));
  // Actualizar botón de toggle
  const btn = document.getElementById('btn-modo-personas');
  if (btn) {
    btn.textContent = modoDosPersonas ? '👥 2 personas' : '👤 1 persona';
    btn.classList.toggle('modo-activo', modoDosPersonas);
  }
  // Re-renderizar ejercicios
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
  const rutinaData   = loadRutinaUsuario(rutinaActiva);
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
        const nuevaKey = `${migracion[viejo]}_${ejNombre}`;
        if (!nuevoPesos[nuevaKey]) { nuevoPesos[nuevaKey] = config.pesos[key]; migrado = true; }
      }
    });
  });
  if (migrado) { config.pesos = nuevoPesos; guardarConfig(); }
}
migrarPesosAntiguos();

// ══════════════════════════════════════════════════════
// TEMPORIZADOR GLOBAL (sidebar derecho)
// ══════════════════════════════════════════════════════
let timerID        = null;
let tiempoRestante = 0;
let tiempoFinal    = null;
let timerPausado   = false;
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
      <p>${t.nombre} — ${t.minutos}m ${t.segundos}s</p>
      <button onclick="iniciarTemporizador(${t.minutos},${t.segundos})">▶️</button>
      <button onclick="borrarTimer(${i})">🗑️</button>
    </div>`).join('');
}

// Duración total del timer actual (para el arco SVG)
let timerDuracionTotal = 0;

function actualizarArcSVG() {
  const arc    = document.getElementById('timer-arc');
  const estado = document.getElementById('timer-estado');
  if (!arc) return;
  const circunf = 326.73; // 2 * π * 52
  if (timerDuracionTotal <= 0) {
    arc.style.strokeDashoffset = '0';
    arc.classList.remove('warning', 'done');
    if (estado) estado.textContent = tiempoRestante > 0 ? formatearTiempo(tiempoRestante) : 'Listo';
    return;
  }
  const pct    = tiempoRestante / timerDuracionTotal;
  const offset = circunf * (1 - pct);
  arc.style.strokeDashoffset = String(offset);
  arc.classList.remove('warning', 'done');
  if (tiempoRestante <= 0)           arc.classList.add('done');
  else if (pct < 0.25)               arc.classList.add('warning');
  if (estado) {
    if (tiempoRestante <= 0)         estado.textContent = '✅ Listo';
    else if (timerPausado)           estado.textContent = 'Pausado';
    else                             estado.textContent = 'Descansando';
  }
}

function mostrarTiempo() {
  const el = document.getElementById("tiempo");
  if (el) el.innerText = formatearTiempo(tiempoRestante);
  actualizarArcSVG();
}

function añadirTimer() {
  // Modal único con nombre + minutos + segundos
  const overlay = document.getElementById('modal-confirm-overlay');
  if (!overlay) {
    // fallback: prompt encadenado
    showPrompt("Nombre del timer:", "ej: Descanso medio", nombre => {
      showPrompt("Minutos:", "0", minStr => {
        showPrompt("Segundos:", "90", segStr => {
          timers.push({ nombre, minutos: Number(minStr)||0, segundos: Number(segStr)||0 });
          guardarTimers(); renderTimers();
          showToast("Timer añadido: " + nombre, "success");
        });
      });
    });
    return;
  }
  // Usar el modal-confirm pero con contenido custom (reusamos el overlay)
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
    const min    = Number(document.getElementById('_timer-min')?.value) || 0;
    const seg    = Number(document.getElementById('_timer-seg')?.value) || 0;
    overlay.classList.add('oculto');
    // Restaurar botones del modal confirm a su estado original
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
    timerDuracionTotal = tiempoRestante; // guardar para el arco
    tiempoFinal = Date.now() + tiempoRestante * 1000;
  }
  if (btnPausar) btnPausar.textContent = "⏸️ Pausar";
  timerID = setInterval(() => {
    tiempoRestante = Math.max(0, Math.round((tiempoFinal - Date.now()) / 1000));
    mostrarTiempo();
    if (tiempoRestante <= 0) {
      clearInterval(timerID); timerID = null; timerPausado = false;
      playBeep(); mostrarModalTimer();
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
    guardarEstadoApp(); stopBeep();
    if (btnPausar) btnPausar.textContent = "▶️ Reanudar";
  }
}

function resetTemporizador() {
  clearInterval(timerID); timerID = null; timerPausado = false;
  tiempoRestante = 0; tiempoFinal = null; timerDuracionTotal = 0;
  stopBeep(); mostrarTiempo();
  const arc = document.getElementById('timer-arc');
  if (arc) { arc.style.strokeDashoffset = '0'; arc.classList.remove('warning','done'); }
  const estado = document.getElementById('timer-estado');
  if (estado) estado.textContent = 'Listo';
  const btnPausar = document.querySelector('#temporizador .btn-pausar');
  if (btnPausar) btnPausar.textContent = "⏸️ Pausar";
  guardarEstadoApp();
}

// ══════════════════════════════════════════════════════
// HIT CRONÓMETRO
// ══════════════════════════════════════════════════════
let hitActivo = false, hitInicio = null, hitAcumulado = 0, hitInterval = null, hitTipo = "HIT 1";

function iniciarHIT() {
  if (hitActivo) return;
  hitActivo = true; hitInicio = Date.now();
  hitInterval = setInterval(() => {
    const total = hitAcumulado + Math.floor((Date.now() - hitInicio) / 1000);
    const el = document.getElementById("tiempo-hit");
    if (el) el.innerText = formatearTiempo(total);
  }, 500);
}

function pausarHIT() {
  if (!hitActivo) return;
  hitAcumulado += Math.floor((Date.now() - hitInicio) / 1000);
  hitActivo = false; clearInterval(hitInterval);
}

function resetHIT() {
  hitActivo = false; clearInterval(hitInterval);
  hitAcumulado = 0; hitInicio = null;
  const el = document.getElementById("tiempo-hit");
  if (el) el.innerText = "0:00";
}

function obtenerTiempoHIT() { if (hitActivo) pausarHIT(); return hitAcumulado; }

// ══════════════════════════════════════════════════════
// NAVEGACIÓN
// ══════════════════════════════════════════════════════
function ocultarTodas() {
  ['pantalla-auth','pantalla-perfil','pantalla-dia','pantalla-historial',
   'pantalla-detalle','pantalla-medidas','pantalla-audio',
   'pantalla-editor','pantalla-resumen','pantalla-ai-import','pantalla-guia-tempo',
   'pantalla-estadisticas','pantalla-progreso','pantalla-progresion-rutina',
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

  // Modo 2 personas — actualizar botón
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

  // HIT/Timer config
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
  const base  = rutinaActual[diaActual].ejercicios || [];
  const extra = config.ejerciciosExtra[nombreDia] || [];

  // Migración silenciosa: ejercicios sin descanso heredan valor inteligente según reps
  const descansoInteligente = (repsMax) => {
    if (!repsMax || repsMax <= 5)  return 180;
    if (repsMax <= 8)               return 150;
    if (repsMax <= 12)              return 90;
    return 60;
  };

  ejerciciosDia = [...base, ...extra].map(ej => {
    const key = `${nombreDia}_${ej.nombre}`;
    // config.descansos tiene prioridad sobre la rutina (cambios inline del usuario)
    const descanso = config.descansos[key] || ej.descanso || descansoInteligente(ej.repsMax);
    return {
      nombre:      ej.nombre,
      series:      ej.series,
      repsMin:     ej.repsMin,
      repsMax:     ej.alFallo ? 30 : ej.repsMax,
      peso:        ej.alFallo ? 0 : (parseFloat(config.pesos[key]) || parseFloat(ej.peso) || 0),
      reps:        Array(ej.series).fill(""),
      incremento:  ej.alFallo ? 0 : 2,
      noProgresar: ej.alFallo ? true : false,
      alFallo:     ej.alFallo || false,
      descanso,
      tempo:       ej.tempo   || "",
      notas:       ej.notas   || ""
    };
  });
}

// ══════════════════════════════════════════════════════
// RENDERIZAR DÍA
// ══════════════════════════════════════════════════════
function renderDia() {
  const cont = document.getElementById("contenido");
  if (!cont) return;
  cont.innerHTML = "";

  ejerciciosDia.forEach((ej, i) => {
    let seriesHTML = "";
    for (let s = 0; s < ej.series; s++) {
      seriesHTML += `<input type="number" min="0" max="${ej.alFallo ? 30 : ej.repsMax}"
        id="rep-${i}-${s}" placeholder="S${s+1}" value="${ej.reps[s]}"
        oninput="actualizarSerie(${i},${s},this.value,this)">`;
    }

    const descansoLabel = formatearTiempo(ej.descanso || 90);

    // Botones de timer según modo + botón de editar descanso inline
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

    cont.innerHTML += `
      <div class="ejercicio" data-ej-index="${i}">
        <div class="ejercicio-header">
          <h3>${ej.nombre}</h3>
          <div class="ejercicio-badges">
            ${ej.tempo ? `<span class="badge-tempo" onclick="mostrarGuiaTempo('${ej.tempo}')" title="Ver guía de tempo">${ej.tempo} ❓</span>` : ''}
            ${ej.alFallo ? `<span class="badge-fallo">Al fallo</span>` : ''}
          </div>
        </div>

        ${ej.notas ? `
        <div class="notas-tecnicas-container">
          <button class="btn-notas" onclick="toggleNotas(${i})">📋 Ver técnica</button>
          <div id="notas-${i}" class="notas-tecnicas oculto">${ej.notas}</div>
        </div>` : ''}

        <div class="ejercicio-row">
          <div class="ejercicio-col">
            <label class="col-label">Peso (kg)</label>
            <input type="number" step="0.5" value="${ej.peso}" onchange="actualizarPesoBase(${i},'${ej.nombre}',this.value)">
          </div>
          <div class="ejercicio-col">
            <label class="col-label">Objetivo</label>
            <p class="objetivo-texto">${ej.series}×${ej.repsMin}${ej.repsMax !== ej.repsMin ? '-'+ej.repsMax : ''}</p>
          </div>
        </div>

        <div class="series">${seriesHTML}</div>

        <div class="ejercicio-footer">
          <div class="footer-left">
            <span class="label-small">Inc.kg</span>
            <input type="number" step="0.5" id="inc-${i}" class="input-small" value="${ej.incremento}" onchange="actualizarIncremento(${i},this.value)">
            <label class="label-check"><input type="checkbox" id="noprog-${i}" ${ej.noProgresar?'checked':''} onchange="actualizarNoProgresar(${i},this.checked)"> No prog.</label>
          </div>
          ${timerBtns}
        </div>
      </div>`;
  });
}

window.toggleNotas = function (i) {
  const el = document.getElementById(`notas-${i}`);
  if (!el) return;
  el.classList.toggle('oculto');
  const btn = el.previousElementSibling;
  if (btn) btn.textContent = el.classList.contains('oculto') ? '📋 Ver técnica' : '📋 Ocultar técnica';
};

// ── EDITAR DESCANSO INLINE DURANTE EL ENTRENAMIENTO ───────────
// Toca ⚙️ junto al timer → popup rápido para cambiar segundos
// Solo cambia para esta sesión (no modifica la rutina guardada)
// Si quieres persistirlo, te pregunta al final.
window.editarDescansoInline = function (ejIndex) {
  const ej = ejerciciosDia[ejIndex];
  const actual = ej.descanso || 90;
  const opciones = [
    { label: '30 seg', val: 30 },
    { label: '1 min',  val: 60 },
    { label: '1:30',   val: 90 },
    { label: '2 min',  val: 120 },
    { label: '2:30',   val: 150 },
    { label: '3 min',  val: 180 },
    { label: '4 min',  val: 240 },
    { label: '5 min',  val: 300 },
  ];

  const overlay = document.getElementById('modal-descanso-overlay');
  const cont    = document.getElementById('modal-descanso-contenido');
  if (!overlay || !cont) {
    // fallback si no existe el modal en HTML
    showPrompt(`Descanso para "${ej.nombre}" (segundos):`, 'ej: 90', (val) => {
      const seg = parseInt(val);
      if (seg > 0) { ejerciciosDia[ejIndex].descanso = seg; renderDia(); showToast(`Descanso: ${formatearTiempo(seg)}`, 'success', 2000); }
    }, String(actual));
    return;
  }

  cont.innerHTML = `
    <p style="font-weight:700;margin-bottom:12px;">⏱️ Descanso — ${ej.nombre}</p>
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

  // Persistir en config.descansos con la misma clave que los pesos
  const rutinaActual = obtenerRutinaCompleta();
  const nombreDia = rutinaActual[diaActual]?.nombre;
  if (nombreDia) {
    const key = `${nombreDia}_${ejerciciosDia[ejIndex].nombre}`;
    config.descansos[key] = seg;
    guardarConfig();
  }

  // Actualizar botón sin re-renderizar (para no perder las reps)
  const descansoLabel = formatearTiempo(seg);
  const btnP1 = document.getElementById(`timer-ej-${ejIndex}-0`) || document.getElementById(`timer-ej-${ejIndex}`);
  if (btnP1 && !btnP1.classList.contains('timer-ej-activo')) {
    const esDoble = !!document.getElementById(`timer-ej-${ejIndex}-0`);
    if (esDoble) {
      btnP1.textContent = `⏱ P1 ${descansoLabel}`;
      const btnP2 = document.getElementById(`timer-ej-${ejIndex}-1`);
      if (btnP2 && !btnP2.classList.contains('timer-ej-activo')) btnP2.textContent = `⏱ P2 ${descansoLabel}`;
    } else {
      btnP1.textContent = `⏱ ${descansoLabel}`;
    }
  }
  showToast(`Descanso "${ejerciciosDia[ejIndex].nombre}": ${descansoLabel} guardado`, 'success', 2000);
};

window.cerrarModalDescanso = () => document.getElementById('modal-descanso-overlay')?.classList.add('oculto');

// ══════════════════════════════════════════════════════
// ACTUALIZAR SERIE
// ══════════════════════════════════════════════════════
function actualizarSerie(ejIndex, serieIndex, valor, input) {
  const ej = ejerciciosDia[ejIndex];
  const reps = valor === "" ? "" : Number(valor);
  ej.reps[serieIndex] = reps;
  input.classList.remove("serie-ok", "serie-fail", "serie-mid");
  if (!ej.alFallo && reps !== "") {
    if (reps >= ej.repsMax)      input.classList.add("serie-ok");
    else if (reps < ej.repsMin)  input.classList.add("serie-fail");
    else                          input.classList.add("serie-mid");
  }
  guardarEstadoApp();
}

// ══════════════════════════════════════════════════════
// PESOS
// ══════════════════════════════════════════════════════
function guardarPesoBase(nombre, valor) {
  const ra = obtenerRutinaCompleta();
  const nombreDia = ra[diaActual]?.nombre || diaActual;
  const key = `${nombreDia}_${nombre}`;
  config.pesos[key] = parseFloat(valor) || 0;
  guardarConfig();
}

window.actualizarPesoBase = (ejIndex, nombre, valor) => {
  ejerciciosDia[ejIndex].peso = parseFloat(valor) || 0;
  guardarPesoBase(nombre, valor);
};
window.actualizarIncremento  = (ejIndex, valor) => { ejerciciosDia[ejIndex].incremento = parseFloat(valor) || 0; guardarEstadoApp(); };
window.actualizarNoProgresar = (ejIndex, checked) => { ejerciciosDia[ejIndex].noProgresar = checked; guardarEstadoApp(); };
window.actualizarSerie       = actualizarSerie;

// ══════════════════════════════════════════════════════
// FINALIZAR DÍA
// ══════════════════════════════════════════════════════
function finalizarDia() {
  if (!diaActual) return;

  // Verificar que haya al menos una rep registrada
  const hayReps = ejerciciosDia.some(ej => ej.reps.some(r => r !== "" && r !== null));
  if (!hayReps) {
    showConfirm(
      '⚠️ No has registrado ninguna repetición.\n¿Finalizar igualmente y guardar la sesión?',
      _doFinalizarDia,
      () => {}
    );
    return;
  }
  _doFinalizarDia();
}

function _doFinalizarDia() {
  // Cancelar todos los timers de ejercicio
  Object.keys(ejercicioTimers).forEach(i => cancelarTodosTimersEjercicio(Number(i)));

  const rutinaActual = obtenerRutinaCompleta();
  const sesion = {
    fecha:    new Date().toISOString(),
    rutinaId: obtenerRutinaActiva(),
    dia:      rutinaActual[diaActual]?.nombre || "Día desconocido",
    notas:    notasSesion,
    ejercicios: ejerciciosDia.map(ej => ({ nombre: ej.nombre, peso: ej.peso, reps: [...ej.reps] })),
    tiempoHIT: obtenerTiempoHIT() || null,
    tipoHIT:   hitTipo || null
  };

  let huboProgresion = false;
  const detalles = [];

  ejerciciosDia.forEach(ej => {
    const completo = ej.reps.every(r => Number(r) >= ej.repsMax);
    if (!ej.alFallo && completo && !ej.noProgresar) {
      ej.peso = parseFloat((ej.peso + ej.incremento).toFixed(2));
      guardarPesoBase(ej.nombre, ej.peso);
      huboProgresion = true;
      detalles.push(`${ej.nombre}: PROGRESO +${ej.incremento}kg → ${ej.peso}kg`);
    } else if (ej.alFallo) {
      detalles.push(`${ej.nombre}: Al fallo — ${ej.reps.filter(r=>r!=="").join("/")} reps`);
    } else {
      detalles.push(`${ej.nombre}: NO progresó`);
    }
  });

  const historial = JSON.parse(localStorage.getItem("historial")) || [];
  historial.push(sesion);
  localStorage.setItem("historial", JSON.stringify(historial));
  guardarConfig();

  ejerciciosDia.forEach(ej => { ej.reps = Array(ej.series).fill(""); ej.incremento = 2; ej.noProgresar = false; });
  resetTemporizador();
  renderDia();

  mostrarPantallaResumen(sesion, huboProgresion, detalles);
}

// ══════════════════════════════════════════════════════
// PANTALLA RESUMEN
// ══════════════════════════════════════════════════════
function mostrarPantallaResumen(sesion, huboProgresion, detalles) {
  const pantalla  = document.getElementById('pantalla-resumen');
  const contenido = document.getElementById('resumen-contenido');
  if (!pantalla || !contenido) { showToast('Sesión guardada', 'success'); volverMenu(); return; }

  ocultarTodas();
  const fecha = new Date(sesion.fecha).toLocaleString('es-ES', { weekday:'long', day:'numeric', month:'long', hour:'2-digit', minute:'2-digit' });
  const progresaron   = detalles.filter(d => d.includes('PROGRESO'));
  const noProgresaron = detalles.filter(d => d.includes('NO progresó'));
  const alFallo       = detalles.filter(d => d.includes('Al fallo'));

  contenido.innerHTML = `
    <div class="resumen-header">
      <div class="resumen-emoji">${huboProgresion ? '🚀' : '💪'}</div>
      <h2>${huboProgresion ? '¡Progreso registrado!' : '¡Sesión completada!'}</h2>
      <p class="resumen-fecha">${fecha}</p>
      <p class="resumen-dia">${sesion.dia}</p>
      ${sesion.notas ? `<p class="resumen-notas">"${sesion.notas}"</p>` : ''}
    </div>

    <div class="resumen-stats">
      <div class="stat-card"><span class="stat-num">${sesion.ejercicios.length}</span><span class="stat-label">Ejercicios</span></div>
      <div class="stat-card stat-success"><span class="stat-num">${progresaron.length}</span><span class="stat-label">Progresaron 📈</span></div>
      <div class="stat-card"><span class="stat-num">${noProgresaron.length + alFallo.length}</span><span class="stat-label">Sin cambio</span></div>
    </div>

    ${progresaron.length > 0 ? `
    <div class="resumen-seccion">
      <h3>📈 PROGRESARON</h3>
      ${progresaron.map(d => {
        const m = d.match(/(.+): PROGRESO \+(\S+) → (\S+)/);
        return m ? `<div class="resumen-item resumen-ok"><span class="item-nombre">${m[1]}</span><span class="item-detalle">+${m[2]} → <strong>${m[3]}</strong></span></div>` : `<div class="resumen-item resumen-ok">${d}</div>`;
      }).join('')}
    </div>` : ''}

    <div class="resumen-seccion">
      <h3>📋 DETALLE COMPLETO</h3>
      ${sesion.ejercicios.map(ej => `
        <div class="resumen-item">
          <span class="item-nombre">${ej.nombre}</span>
          <span class="item-detalle">${ej.peso}kg — ${ej.reps.filter(r=>r!=="").join(' / ')} reps</span>
        </div>`).join('')}
    </div>`;

  pantalla.classList.remove('oculto');

  // Guardar índice de esta sesión para poder enlazar al detalle
  const historialActual = JSON.parse(localStorage.getItem('historial')) || [];
  const idxSesion = historialActual.length - 1; // la acabamos de guardar, es la última

  // Botón de ver detalle completo
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

// ══════════════════════════════════════════════════════
// HISTORIAL
// ══════════════════════════════════════════════════════
function abrirHistorial() {
  cerrarSidebar();
  guardarEstadoApp();
  history.pushState({}, "");
  ocultarTodas();
  document.getElementById("pantalla-historial").classList.remove("oculto");
  // Resetear filtro y usar renderListaHistorial como única fuente de verdad
  historialFiltro = "";
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
      <p class="resumen-dia">${s.dia}</p>
      ${s.notas ? `<p class="resumen-notas">"${s.notas}"</p>` : ''}
      ${s.tiempoHIT ? `<p class="detalle-hit">⏲️ HIT (${s.tipoHIT || 'Cardio'}): ${formatearTiempo(s.tiempoHIT)}</p>` : ''}
    </div>
    ${s.ejercicios.map(ej => `
      <div class="ejercicio-detalle">
        <strong>${ej.nombre}</strong>
        <span>${ej.peso}kg — ${ej.reps.filter(r => r !== '' && r !== null && r !== undefined).join(' / ')} reps</span>
      </div>`).join('')}`;
}

function borrarTodoHistorial() {
  showConfirm("¿Borrar todo el historial?\nNo se puede deshacer.", () => {
    localStorage.removeItem("historial");
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
    // No resetear paginación — solo re-renderizar donde estamos
    renderListaHistorial();
    showToast("Sesión eliminada", "success");
  });
};

function limpiarHistorialDuplicados() {
  let h = JSON.parse(localStorage.getItem("historial")) || [];
  h = h.filter((s, i, a) => i === a.findIndex(x => x.fecha === s.fecha && x.dia === s.dia));
  localStorage.setItem("historial", JSON.stringify(h));
  showToast("Duplicados eliminados", "success");
  abrirHistorial();
}

// ══════════════════════════════════════════════════════
// MEDIDAS
// ══════════════════════════════════════════════════════
function abrirMedidas() {
  cerrarSidebar();
  guardarEstadoApp();
  history.pushState({}, "");
  ocultarTodas();
  document.getElementById("pantalla-medidas").classList.remove("oculto");
  cargarMedidas();
}

function guardarMedidas() {
  const campos = ["peso","altura","cintura","cadera","pecho","brazo_relajado","brazo_contraido","muslo"];
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
    const iReal = h.length - 1 - iRev; // índice real en el array original
    return `
    <div class="medida-item">
      <div class="medida-item-header">
        <strong>${new Date(m.fecha).toLocaleDateString('es-ES')}</strong>
        <button class="btn-danger-sm" onclick="borrarMedidaIndividual(${iReal})" title="Borrar esta medida">🗑️</button>
      </div>
      ${m.peso        !== null ? `<p>Peso: ${m.peso} kg</p>` : ''}
      ${m.altura      !== null ? `<p>Altura: ${m.altura} cm</p>` : ''}
      ${m.cintura     !== null ? `<p>Cintura: ${m.cintura} cm</p>` : ''}
      ${m.cadera      !== null ? `<p>Cadera: ${m.cadera} cm</p>` : ''}
      ${m.pecho       !== null ? `<p>Pecho: ${m.pecho} cm</p>` : ''}
      ${m.brazo_relajado   !== null ? `<p>Brazo rel.: ${m.brazo_relajado} cm</p>` : ''}
      ${m.brazo_contraido  !== null ? `<p>Brazo cont.: ${m.brazo_contraido} cm</p>` : ''}
      ${m.muslo       !== null ? `<p>Muslo: ${m.muslo} cm</p>` : ''}
    </div>`; }).join('');
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

// ══════════════════════════════════════════════════════
// AUDIO CONFIG
// ══════════════════════════════════════════════════════
function abrirConfigAudio() {
  cerrarSidebar();
  guardarEstadoApp();
  history.pushState({}, "");
  ocultarTodas();
  document.getElementById("pantalla-audio").classList.remove("oculto");
  actualizarNombreAudio(audioPersonalizadoNombre || 'Beep (predeterminado)');
}
window.abrirConfigAudio = abrirConfigAudio;

// ══════════════════════════════════════════════════════
// GUÍA DE TEMPO
// ══════════════════════════════════════════════════════
window.mostrarGuiaTempo = function (tempo) {
  const partes = tempo.split('-');
  let explicacion = '';
  if (partes.length >= 3) {
    explicacion = `
      <div class="tempo-desglose">
        <div class="tempo-fase"><span class="tempo-num">${partes[0]}</span><span>Excéntrica (bajar)</span></div>
        <div class="tempo-fase"><span class="tempo-num">${partes[1]}</span><span>Pausa abajo</span></div>
        <div class="tempo-fase"><span class="tempo-num">${partes[2]}</span><span>Concéntrica (subir)</span></div>
        ${partes[3] ? `<div class="tempo-fase"><span class="tempo-num">${partes[3]}</span><span>Pausa arriba</span></div>` : ''}
      </div>`;
  }
  const overlay = document.getElementById('modal-tempo-overlay');
  const cont    = document.getElementById('modal-tempo-contenido');
  if (!overlay || !cont) return;
  cont.innerHTML = `<h3>Tempo ${tempo}</h3>${explicacion}`;
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

// ══════════════════════════════════════════════════════
// FORZAR ACTUALIZACIÓN
// ══════════════════════════════════════════════════════
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

// ══════════════════════════════════════════════════════
// MODALES DE TEMPORIZADOR
// ══════════════════════════════════════════════════════
function mostrarModalTimer() { document.getElementById("modal-timer")?.classList.remove("oculto"); }
function ocultarModalTimer() { document.getElementById("modal-timer")?.classList.add("oculto"); }
function resetDesdeModal()   { resetTemporizador(); ocultarModalTimer(); }

// ══════════════════════════════════════════════════════
// MENÚ Y SIDEBAR
// ══════════════════════════════════════════════════════
function volverMenu() {
  // Si estamos en un día con reps cargadas, confirmar antes de salir
  const enDia = !document.getElementById("pantalla-dia")?.classList.contains("oculto");
  if (enDia) {
    const hayReps = ejerciciosDia.some(ej => ej.reps.some(r => r !== ""));
    if (hayReps) {
      showConfirm(
        '¿Salir del entrenamiento?\nLas repeticiones marcadas NO se guardarán hasta que pulses "✅ Finalizar sesión".',
        _doVolverMenu,
        () => {} // cancelar → no hace nada
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
  guardarEstadoApp();
}

function toggleSidebar() {
  const sidebar  = document.getElementById("sidebar");
  const overlay  = document.getElementById("sidebar-overlay");
  if (!sidebar || !overlay) return;
  const isOpen = sidebar.classList.contains("sidebar-open");
  sidebar.classList.toggle("sidebar-open",  !isOpen);
  sidebar.classList.toggle("sidebar-closed", isOpen);
  overlay.classList.toggle("oculto", isOpen);
  // Renderizar info de perfil cada vez que se abre el sidebar
  if (!isOpen) renderSidebarPerfil();
}

function toggleSidebarRight() {
  const sidebar = document.getElementById("sidebar-right");
  const overlay = document.getElementById("sidebar-right-overlay");
  if (!sidebar || !overlay) return;
  const isOpen = sidebar.classList.contains("sidebar-right-open");
  sidebar.classList.toggle("sidebar-right-open",   !isOpen);
  sidebar.classList.toggle("sidebar-right-closed",  isOpen);
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

// ── Perfil en sidebar ─────────────────────────────────────────
// Muestra email del usuario + botones de perfil y cerrar sesión
function renderSidebarPerfil() {
  const cont = document.getElementById("sidebar-perfil-info");
  if (!cont) return;

  // Leer estado de sesión desde localStorage (lo escribe auth.js)
  let userState = {};
  try { userState = JSON.parse(localStorage.getItem("userState") || "{}"); } catch {}

  const email     = userState.email || null;
  const logueado  = !!userState.uid;

  cont.innerHTML = `
    <div class="sidebar-perfil-email">
      ${logueado
        ? `<span>👤 ${email}</span>`
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

// ══════════════════════════════════════════════════════
// ESTADO APP
// ══════════════════════════════════════════════════════
function guardarEstadoApp() {
  const pantalla =
    !document.getElementById("menu")?.classList.contains("oculto")        ? "menu" :
    !document.getElementById("pantalla-dia")?.classList.contains("oculto") ? "dia"  :
    !document.getElementById("pantalla-historial")?.classList.contains("oculto") ? "historial" :
    !document.getElementById("pantalla-detalle")?.classList.contains("oculto")   ? "detalle"   :
    !document.getElementById("pantalla-medidas")?.classList.contains("oculto")   ? "medidas"   : "menu";

  // Guardar timers de ejercicio activos (para restaurar si se recarga)
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
    ejTimersSnapshot
  };
  localStorage.setItem("estadoApp", JSON.stringify(estadoApp));
}

// ══════════════════════════════════════════════════════
// BOTONES DÍAS
// ══════════════════════════════════════════════════════
function renderizarBotonesDias() {
  const contenedor = document.getElementById("botones-dias");
  if (!contenedor) return;
  const rutinaActual = obtenerRutinaCompleta();
  contenedor.innerHTML = "";
  Object.keys(rutinaActual).forEach((diaKey, idx) => {
    const dia = rutinaActual[diaKey];
    const btn = document.createElement("button");
    btn.textContent = dia.nombre;
    btn.onclick = () => abrirDia(diaKey);
    contenedor.appendChild(btn);
  });
}
window.renderizarBotonesDias = renderizarBotonesDias;

// ══════════════════════════════════════════════════════
// ÚLTIMA SESIÓN COMO GUÍA
// ══════════════════════════════════════════════════════
function renderBotonesUltimaSesion() {
  const contenedor = document.getElementById("contenido");
  if (!contenedor) return;
  const ultimaSesion = obtenerUltimaSesion();
  if (!ultimaSesion) return;
  if (document.getElementById('btn-toggle-guia')) return;

  // Buscar índice real en historial para poder enlazar al detalle
  const historial = JSON.parse(localStorage.getItem("historial")) || [];
  const idxSesion = historial.findIndex(s => s.fecha === ultimaSesion.fecha && s.dia === ultimaSesion.dia);
  const fechaCorta = new Date(ultimaSesion.fecha).toLocaleDateString('es-ES', { day:'2-digit', month:'short' });

  contenedor.insertAdjacentHTML('afterbegin', `
    <div class="botones-ultima-sesion">
      <button onclick="toggleGuiaUltimaSesion()" id="btn-toggle-guia" class="btn-secondary">👁️ Última sesión (${fechaCorta})</button>
      ${idxSesion >= 0 ? `<button onclick="abrirHistorial();setTimeout(()=>verDetalle(${idxSesion}),150)" class="btn-link" style="width:auto!important;padding:4px 8px!important;font-size:12px;">Ver detalle →</button>` : ''}
    </div>`);
}

function obtenerUltimaSesion() {
  const historial    = JSON.parse(localStorage.getItem("historial")) || [];
  const rutinaActual = obtenerRutinaCompleta();
  const nombreDia    = rutinaActual[diaActual]?.nombre;
  const rutinaActiva = obtenerRutinaActiva();
  if (!nombreDia) return null;
  return historial.filter(s => (s.rutinaId ? s.rutinaId === rutinaActiva : true) && s.dia === nombreDia)
    .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))[0] || null;
}

window.toggleGuiaUltimaSesion = function () {
  const guias = document.querySelectorAll('.guia-ultima-sesion');
  const btn   = document.getElementById('btn-toggle-guia');
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
  const fecha = new Date(sesion.fecha).toLocaleDateString('es-ES', { day:'2-digit', month:'short' });
  ejerciciosDia.forEach((ej, ejIndex) => {
    const ejAnterior = sesion.ejercicios.find(e => e.nombre === ej.nombre);
    if (!ejAnterior) return;
    const div = document.querySelectorAll('.ejercicio')[ejIndex];
    if (!div) return;
    const guia = `<div class="guia-ultima-sesion">
      <span class="guia-fecha">📅 ${fecha}</span>
      <span class="guia-peso">Peso: ${ejAnterior.peso}kg</span>
      <span class="guia-reps">Reps: ${ejAnterior.reps.filter(r=>r!=="").join(' - ')}</span>
    </div>`;
    div.querySelector('h3')?.insertAdjacentHTML('afterend', guia);
  });
}

// ══════════════════════════════════════════════════════
// BORRAR RUTINA DÍA (función existente)
// ══════════════════════════════════════════════════════
function borrarRutinaDia() {
  if (!diaActual) return;
  showConfirm("¿Borrar TODA la rutina de este día?", () => {
    const ra = obtenerRutinaCompleta();
    if (ra[diaActual]) ra[diaActual].ejercicios = [];
    delete config.ejerciciosExtra[diaActual];
    guardarConfig();
    cargarEjerciciosDia();
    renderDia();
    showToast("Rutina del día eliminada", "info");
  });
}

// ══════════════════════════════════════════════════════
// UTILIDADES
// ══════════════════════════════════════════════════════
function formatearTiempo(segundos) {
  const m = Math.floor(segundos / 60);
  const s = segundos % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// ══════════════════════════════════════════════════════
// BOTÓN ATRÁS ANDROID
// ══════════════════════════════════════════════════════
window.addEventListener("popstate", () => {
  if (!document.getElementById("modal-timer")?.classList.contains("oculto")) { ocultarModalTimer(); return; }
  if (document.getElementById("sidebar-right")?.classList.contains("sidebar-right-open")) { toggleSidebarRight(); return; }
  if (document.getElementById("sidebar")?.classList.contains("sidebar-open")) { toggleSidebar(); return; }
  if (!document.getElementById("modal-tempo-overlay")?.classList.contains("oculto")) { cerrarModalTempo(); return; }
  if (!document.getElementById("pantalla-perfil")?.classList.contains("oculto"))    { volverMenu(); return; }
  if (!document.getElementById("pantalla-audio")?.classList.contains("oculto"))     { volverMenu(); return; }
  if (!document.getElementById("pantalla-editor")?.classList.contains("oculto"))    { volverMenu(); return; }
  if (!document.getElementById("pantalla-guia-tempo")?.classList.contains("oculto")) { volverMenu(); return; }
  if (!document.getElementById("pantalla-ai-import")?.classList.contains("oculto")) { volverMenu(); return; }
  if (!document.getElementById("pantalla-estadisticas")?.classList.contains("oculto")) { volverMenu(); return; }
  if (!document.getElementById("pantalla-progreso")?.classList.contains("oculto"))     { volverMenu(); return; }
  if (!document.getElementById("pantalla-progresion-rutina")?.classList.contains("oculto")) { volverMenu(); return; }
  if (!document.getElementById("pantalla-resumen")?.classList.contains("oculto"))   { cerrarResumen(); return; }
  if (!document.getElementById("pantalla-detalle")?.classList.contains("oculto"))   { volverHistorial(); return; }
  if (!document.getElementById("pantalla-medidas")?.classList.contains("oculto"))   { volverMenu(); return; }
  if (!document.getElementById("pantalla-historial")?.classList.contains("oculto")) { volverMenu(); return; }
  if (!document.getElementById("pantalla-dia")?.classList.contains("oculto"))       { volverMenu(); return; }
});

// ══════════════════════════════════════════════════════
// SWIPE GESTURES
// ══════════════════════════════════════════════════════
let touchStartX = 0, touchStartY = 0, isSwiping = false, swipeTarget = null;
const EDGE_ZONE = 30, SWIPE_THRESHOLD = 100;

document.addEventListener('touchstart', e => {
  touchStartX = e.changedTouches[0].screenX;
  touchStartY = e.changedTouches[0].screenY;
  const w = window.innerWidth;
  if (touchStartX <= EDGE_ZONE)   { isSwiping = true; swipeTarget = 'left'; }
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

// ══════════════════════════════════════════════════════
// EXPORTAR FUNCIONES GLOBALES
// ══════════════════════════════════════════════════════
window.abrirDia                 = abrirDia;
window.volverMenu               = volverMenu;
window.abrirHistorial           = abrirHistorial;
window.volverHistorial          = volverHistorial;
window.finalizarDia             = finalizarDia;
window.forzarActualizacion      = forzarActualizacion;
window.iniciarTemporizador      = iniciarTemporizador;
window.pausarTemporizador       = pausarTemporizador;
window.resetTemporizador        = resetTemporizador;
window.añadirTimer              = añadirTimer;
window.borrarTimer              = borrarTimer;
window.iniciarHIT               = iniciarHIT;
window.pausarHIT                = pausarHIT;
window.resetHIT                 = resetHIT;
window.borrarRutinaDia          = borrarRutinaDia;
window.guardarMedidas           = guardarMedidas;
window.borrarTodoHistorialMedidas = borrarTodoHistorialMedidas;
window.abrirMedidas             = abrirMedidas;
window.verDetalle               = verDetalle;
window.limpiarHistorialDuplicados = limpiarHistorialDuplicados;
window.borrarTodoHistorial      = borrarTodoHistorial;
window.toggleSidebar            = toggleSidebar;
window.toggleSidebarRight       = toggleSidebarRight;
window.resetDesdeModal          = resetDesdeModal;
window.mostrarPerfil            = window.mostrarPerfil || (() => {});

// ══════════════════════════════════════════════════════
// BÚSQUEDA Y FILTRO EN HISTORIAL
// ══════════════════════════════════════════════════════
let historialFiltro = '';
let historialPagina = 30; // cuántos mostrar (se amplía con "Ver más")

window.filtrarHistorial = function (texto) {
  historialFiltro = texto.trim().toLowerCase();
  historialPagina = 30; // resetear paginación al filtrar
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
    cont.innerHTML = `<p class="texto-vacio">${historialFiltro ? 'Sin resultados para "'+historialFiltro+'"' : 'No hay sesiones registradas.'}</p>`;
    return;
  }

  const visible  = filtrado.slice(0, historialPagina);
  const hayMas   = filtrado.length > historialPagina;

  cont.innerHTML = visible.map(({ s, i }) => `
    <div class="historial-item">
      <div class="historial-info">
        <p class="historial-fecha">${new Date(s.fecha).toLocaleString('es-ES')}</p>
        <p class="historial-dia">${s.dia}</p>
        ${s.notas ? `<p class="historial-notas">"${s.notas}"</p>` : ''}
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

// ══════════════════════════════════════════════════════
// EXPORTAR HISTORIAL CSV
// ══════════════════════════════════════════════════════
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
        ej.peso,
        ej.reps.filter(r => r !== '').join(' / '),
        s.notas || '',
        s.tiempoHIT ? formatearTiempo(s.tiempoHIT) : '',
        s.tipoHIT || ''
      ]);
    });
  });

  const csv = filas.map(f => f.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `historial_gym_${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('CSV exportado correctamente', 'success');
};

// ══════════════════════════════════════════════════════
// ESTADÍSTICAS
// ══════════════════════════════════════════════════════
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

  // — Racha actual
  const hoy = new Date(); hoy.setHours(0,0,0,0);
  const fechasUnicas = [...new Set(historial.map(s => {
    const d = new Date(s.fecha); d.setHours(0,0,0,0); return d.getTime();
  }))].sort((a,b) => b-a);

  let rachaActual = 0;
  let cursor = hoy.getTime();
  for (const f of fechasUnicas) {
    if (f === cursor || f === cursor - 86400000) { rachaActual++; cursor = f; }
    else break;
  }
  const rachaMejor = calcularRachaMejor(fechasUnicas);

  // — Sesiones por semana (promedio real desde la primera sesión)
  const primeraFecha = historial.length ? new Date(historial[0].fecha) : new Date();
  const semanasTotales = Math.max(1, Math.ceil((Date.now() - primeraFecha.getTime()) / (7 * 86400000)));
  const sesXSemana = (historial.length / semanasTotales).toFixed(1);

  // — Total sesiones y volumen
  const totalSesiones = historial.length;
  let totalVolumen = 0;
  historial.forEach(s => s.ejercicios.forEach(ej => {
    const repsTotal = ej.reps.filter(r => r !== '').reduce((a, r) => a + Number(r), 0);
    totalVolumen += (ej.peso || 0) * repsTotal;
  }));

  // — Récords por ejercicio
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
    .sort((a,b) => b[1].peso - a[1].peso)
    .slice(0, 8);

  // — Día más frecuente
  const diasCount = {};
  historial.forEach(s => { diasCount[s.dia] = (diasCount[s.dia]||0)+1; });
  const diaFav = Object.entries(diasCount).sort((a,b) => b[1]-a[1])[0];

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
        <span class="stat-val">${(totalVolumen/1000).toFixed(0)}t</span>
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
            <span class="record-nombre">${nombre}</span>
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
    if (fechasOrdenadas[i-1] - fechasOrdenadas[i] === 86400000) { actual++; mejor = Math.max(mejor, actual); }
    else actual = 1;
  }
  return mejor;
}

// ══════════════════════════════════════════════════════
// GRÁFICA DE PROGRESO POR EJERCICIO
// ══════════════════════════════════════════════════════
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
    ejercicios.map(n => `<option value="${n}">${n}</option>`).join('');
  if (ejercicios.length > 0) { sel.value = ejercicios[0]; renderGraficaProgreso(); }
}

let graficaModo = 'peso'; // 'peso' o 'volumen'
window.setGraficaModo = function(modo) {
  graficaModo = modo;
  renderGraficaProgreso();
};

window.renderGraficaProgreso = function () {
  const sel  = document.getElementById('progreso-ejercicio-select');
  const cont = document.getElementById('progreso-grafica');
  if (!sel || !cont || !sel.value) { if (cont) cont.innerHTML = `<p class="chart-empty">Selecciona un ejercicio</p>`; return; }

  const nombre    = sel.value;
  const historial = JSON.parse(localStorage.getItem('historial')) || [];

  // Detectar si el ejercicio es "al fallo" (peso siempre 0)
  const datosEj = historial.filter(s => s.ejercicios.some(e => e.nombre === nombre));
  const esAlFallo = datosEj.length > 0 && datosEj.every(s => {
    const ej = s.ejercicios.find(e => e.nombre === nombre);
    return !ej?.peso || ej.peso === 0;
  });

  if (esAlFallo) {
    cont.innerHTML = `<div class="chart-empty-fallo">
      <p>⚠️ <strong>${nombre}</strong> es un ejercicio de peso corporal / al fallo.</p>
      <p style="font-size:13px;color:var(--text-secondary);">La gráfica de peso no aplica. Puedes ver el historial de reps en la pantalla de detalle de cada sesión.</p>
    </div>`; return;
  }

  const datos = datosEj
    .filter(s => s.ejercicios.some(e => e.nombre === nombre))
    .map(s => {
      const ej  = s.ejercicios.find(e => e.nombre === nombre);
      const repsTotal = (ej.reps || []).filter(r => r !== '').reduce((a, r) => a + Number(r), 0);
      return {
        fecha:   s.fecha,
        peso:    ej.peso || 0,
        volumen: (ej.peso || 0) * repsTotal
      };
    })
    .sort((a, b) => new Date(a.fecha) - new Date(b.fecha))
    .slice(-20);

  if (datos.length < 2) {
    cont.innerHTML = `<p class="chart-empty">Necesitas al menos 2 sesiones con "${nombre}" para ver la gráfica.</p>`; return;
  }

  const esPeso   = graficaModo === 'peso';
  const valores  = datos.map(d => esPeso ? d.peso : d.volumen);
  const maxVal   = Math.max(...valores);
  const minVal   = Math.min(...valores);
  const rango    = maxVal - minVal || 1;
  const ultimo   = valores[valores.length - 1];
  const primero  = valores[0];
  const mejora   = parseFloat((ultimo - primero).toFixed(1));
  const unidad   = esPeso ? 'kg' : 'kg·r';

  const alturaMax = 140;
  const barras = datos.map((d, idx) => {
    const val  = valores[idx];
    const pct  = (val - minVal) / rango;
    const alto = Math.max(8, Math.round(pct * alturaMax) + 8);
    const fecha = new Date(d.fecha).toLocaleDateString('es-ES', { day:'2-digit', month:'2-digit' });
    const esMax = val === maxVal;
    const label = esPeso ? `${val}kg` : `${val}`;
    return `<div class="chart-bar-wrap">
      <span class="chart-bar-val">${label}</span>
      <div class="chart-bar" style="height:${alto}px;${esMax?'background:var(--success);':''}" title="${label} — ${fecha}"></div>
      <span class="chart-bar-date">${fecha}</span>
    </div>`;
  }).join('');

  cont.innerHTML = `
    <div class="grafica-toggle">
      <button onclick="setGraficaModo('peso')" class="${esPeso?'activo':'btn-secondary'}">⚖️ Peso máx</button>
      <button onclick="setGraficaModo('volumen')" class="${!esPeso?'activo':'btn-secondary'}">📦 Volumen</button>
    </div>
    <div style="display:flex;gap:10px;margin-bottom:10px;flex-wrap:wrap;">
      <div class="stat-box" style="flex:1;min-width:80px;">
        <span class="stat-val">${maxVal} ${unidad}</span><span class="stat-lbl">${esPeso?'Récord':'Vol. máx'}</span>
      </div>
      <div class="stat-box ${mejora>0?'highlight':''}" style="flex:1;min-width:80px;">
        <span class="stat-val">${mejora>=0?'+':''}${mejora} ${unidad}</span><span class="stat-lbl">Total ganado</span>
      </div>
      <div class="stat-box" style="flex:1;min-width:80px;">
        <span class="stat-val">${datos.length}</span><span class="stat-lbl">Sesiones</span>
      </div>
    </div>
    <div class="chart-container">
      <div class="chart-bars">${barras}</div>
    </div>
    <p style="font-size:12px;color:var(--text-secondary);text-align:center;">
      🟢 barra verde = ${esPeso?'récord de peso':'sesión de mayor volumen'} · Últimas ${datos.length} sesiones
    </p>`;
};

// abrirHistorial ya está definido arriba como función + window export.
// El override final unifica historialFiltro reset + renderListaHistorial.
window.abrirHistorial = function () {
  cerrarSidebar();
  guardarEstadoApp();
  history.pushState({}, '');
  ocultarTodas();
  document.getElementById('pantalla-historial').classList.remove('oculto');
  historialFiltro = '';
  historialPagina = 30;
  const input = document.getElementById('historial-buscar');
  if (input) input.value = '';
  renderListaHistorial();
};

window.addEventListener("cambio-rutina", () => {
  renderizarBotonesDias();
  renderizarSelectorRutinas();
  if (diaActual) { cargarEjerciciosDia(); renderDia(); }
});

// Notas de sesión
window.actualizarNotasSesion = function (val) { notasSesion = val; };

// ══════════════════════════════════════════════════════
// NOTAS DE PROGRESIÓN POR RUTINA
// ══════════════════════════════════════════════════════
// Estructura guardada: notasProgresion = {
//   [rutinaId]: {
//     general: string,          ← notas generales de la rutina
//     dias: { [diaNombre]: string }  ← notas por día
//   }
// }

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

  const notas    = cargarNotasProgresion();
  const rutinaId = obtenerRutinaActiva();
  const rutinaData = loadRutinaUsuario(rutinaId);
  if (!rutinaData) {
    cont.innerHTML = `<p class="texto-vacio">No hay rutina activa.</p>`; return;
  }

  const notasRutina  = notas[rutinaId] || { general: '', dias: {} };
  const nombreRutina = rutinaData.nombre || 'Rutina';
  const dias         = rutinaData.dias   || [];

  cont.innerHTML = `
    <div class="progresion-header">
      <h3>🏋️ ${nombreRutina}</h3>
      <p style="font-size:12px;color:var(--text-secondary);margin:0;">
        Anota aquí la estrategia de progresión: cómo subir peso, cuándo, qué hacer cuando te estancas.
      </p>
    </div>

    <div class="progresion-seccion">
      <h4>📌 Estrategia general de la rutina</h4>
      <textarea id="prog-general" rows="5"
        placeholder="Ej: Doble progresión en todos los básicos. Cuando completo todas las series en el rango máximo, subo 2,5kg la siguiente sesión. En accesorios subo cuando completo el rango máximo 2 semanas seguidas..."
        oninput="guardarNotaProg('general', this.value)">${notasRutina.general || ''}</textarea>
    </div>

    ${dias.map((dia, i) => `
    <div class="progresion-seccion">
      <h4>📅 ${dia.nombre}</h4>
      <div class="progresion-ejercicios-lista">
        ${(dia.ejercicios || []).map(ej => `
          <div class="prog-ej-ref">
            <span class="prog-ej-nombre">${ej.nombre}</span>
            <span class="prog-ej-config">${ej.series}×${ej.repsMin}–${ej.repsMax} · ${ej.peso}kg · ${ej.descanso ? Math.floor(ej.descanso/60)+'m'+(ej.descanso%60?String(ej.descanso%60).padStart(2,'0')+'s':'') : '?'}</span>
          </div>`).join('')}
      </div>
      <textarea id="prog-dia-${i}" rows="4"
        placeholder="Ej: Press banca → doble progresión 6-10. Peso muerto → lineal +2,5kg/semana. Si fallo → repetir mismo peso hasta completar todas las series..."
        oninput="guardarNotaProg('dia', this.value, '${dia.nombre.replace(/'/g,"\\'")}' )">${(notasRutina.dias || {})[dia.nombre] || ''}</textarea>
    </div>`).join('')}

    <button onclick="volverMenu()" class="btn-secondary" style="margin-top:8px;">← Volver al menú</button>
  `;
}

window.guardarNotaProg = function (tipo, valor, diaNombre = '') {
  const notas    = cargarNotasProgresion();
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
// NOTIFICACIONES Y SERVICE WORKER
// ══════════════════════════════════════════════════════
if ("Notification" in window && Notification.permission !== "granted") {
  Notification.requestPermission();
}

let swRegistration = null;

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js')
    .then(reg => {
      swRegistration = reg;
      setInterval(() => reg.update(), 60000);
      reg.addEventListener('updatefound', () => {
        const nw = reg.installing;
        nw.addEventListener('statechange', () => {
          if (nw.state === 'installed' && navigator.serviceWorker.controller) {
            showConfirm('🎉 Nueva versión disponible. ¿Actualizar ahora?', () => {
              nw.postMessage({ type: 'SKIP_WAITING' });
              window.location.reload();
            });
          }
        });
      });
    }).catch(err => console.error('SW error:', err));

  navigator.serviceWorker.addEventListener('message', event => {
    if (event.data?.type === 'SYNC_DATA' && userState.uid) {
      import('./userState.js').then(m => m.syncToCloud?.().catch(() => {}));
    }
  });
}

window.addEventListener('online', async () => {
  if (swRegistration) await swRegistration.update();
  if (userState.uid) {
    import('./userState.js').then(m => m.syncToCloud?.().catch(() => {}));
  }
});

// ══════════════════════════════════════════════════════
// INICIALIZACIÓN
// ══════════════════════════════════════════════════════
document.addEventListener("DOMContentLoaded", async () => {
  inicializarRutinaBase();
  initOfflineBanner();
  renderTimers();
  renderizarBotonesDias();

  try { await initAudio(); } catch (e) { console.warn("Audio:", e); }

  const saved = JSON.parse(localStorage.getItem("estadoApp"));
  if (saved) {
    diaActual      = saved.diaActual;
    tiempoRestante = saved.tiempoRestante || 0;
    tiempoFinal    = saved.tiempoFinal;

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
      // Restaurar timers de ejercicio activos
      if (saved.ejTimersSnapshot) {
        Object.keys(saved.ejTimersSnapshot).forEach(ejIdx => {
          const personas = saved.ejTimersSnapshot[ejIdx];
          Object.keys(personas).forEach(p => {
            const { endTime } = personas[p];
            if (endTime > Date.now()) {
              const secondsLeft = Math.round((endTime - Date.now()) / 1000);
              const idx = Number(ejIdx);
              const persona = Number(p);
              if (!ejercicioTimers[idx]) ejercicioTimers[idx] = {};
              const intervalId = setInterval(() => {
                const remaining = Math.max(0, Math.round((endTime - Date.now()) / 1000));
                actualizarBtnTimer(idx, persona, remaining, true, remaining === 0);
                if (remaining <= 0) {
                  clearInterval(intervalId);
                  delete ejercicioTimers[idx][persona];
                  playBeep();
                  const card = document.querySelector(`.ejercicio[data-ej-index="${idx}"]`);
                  if (card) { card.classList.add('timer-ej-flash'); setTimeout(() => card.classList.remove('timer-ej-flash'), 2000); }
                }
              }, 500);
              ejercicioTimers[idx][persona] = { intervalId, endTime };
              actualizarBtnTimer(idx, persona, secondsLeft, true, false);
            }
          });
        });
      }
      // Restaurar colores
      if (saved.repsPorEjercicio) {
        saved.repsPorEjercicio.forEach((se, ei) => {
          const ej = ejerciciosDia.find(e => e.nombre === se.nombre);
          if (!ej) return;
          se.reps.forEach((r, si) => {
            const input = document.getElementById(`rep-${ei}-${si}`);
            if (!input || r === "" || ej.alFallo) return;
            const n = Number(r);
            input.classList.toggle('serie-ok',   n >= ej.repsMax);
            input.classList.toggle('serie-fail',  n < ej.repsMin);
            input.classList.toggle('serie-mid',   n >= ej.repsMin && n < ej.repsMax);
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
