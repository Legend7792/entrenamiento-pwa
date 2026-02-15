/*************************
 * DATOS DE LA RUTINA (BASE - NO SE MODIFICA)
 *************************/
import "./auth.js";
import "./cloud.js";
import { loadRutinaUsuario } from "./rutinaUsuario.js";
import "./userState.js";
import { renderizarSelectorRutinas, obtenerRutinaActiva, RUTINA_BASE_ID } from "./selectorRutinas.js";
import "./themes.js";
import "./editorRutinas.js";
let audioCtx;
let bufferBeep;
let sourceBeep;
let estadoApp = JSON.parse(localStorage.getItem("estadoApp")) || {
  pantalla: "menu",
  diaActual: null,
  ejerciciosDia: null,
  tiempoRestante: 0,
  tiempoFinal: null
};
async function initAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }

  const resp = await fetch("./beep.mp3");
  const arrayBuffer = await resp.arrayBuffer();
  bufferBeep = await audioCtx.decodeAudioData(arrayBuffer);
}

function desbloquearAudioPorGesto() {
  if (!audioCtx) return;
  if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }
}

function playBeep() {
  if (!audioCtx) {
    console.warn("Audio no inicializado");
    return; // no recursión
  }

 if (!bufferBeep) {
  console.warn("Buffer de audio no cargado");
  return;
}

  if (audioCtx.state === "suspended") {
    audioCtx.resume().catch(e => console.warn("No se pudo reanudar audio", e));
  }

  sourceBeep = audioCtx.createBufferSource();
  sourceBeep.buffer = bufferBeep;
  sourceBeep.loop = true;
  sourceBeep.connect(audioCtx.destination);
  sourceBeep.start();
}

function stopBeep() {
  if (sourceBeep) {
    try {
      sourceBeep.stop();
      sourceBeep.disconnect();
    } catch (e) {}
    sourceBeep = null;
  }
}

// AÑADIR ESTA FUNCIÓN NUEVA:
function obtenerRutinaCompleta() {
  const rutinaActiva = obtenerRutinaActiva();
  
  // Si es la rutina base, usar la que está hardcodeada en app.js
  if (rutinaActiva === RUTINA_BASE_ID) {
    return rutina;
  }
  
  // Si es una rutina personalizada, cargarla por ID
  const rutinaUsuario = loadRutinaUsuario(rutinaActiva);
  
  // Si no existe o no tiene días, volver a rutina base
  if (!rutinaUsuario || !rutinaUsuario.dias || rutinaUsuario.dias.length === 0) {
    console.warn('Rutina no encontrada, usando base');
    return rutina;
  }
  
  // Convertir rutina personalizada al formato esperado
  const rutinaConvertida = {};
  
  rutinaUsuario.dias.forEach((dia, idx) => {
    const diaKey = `dia_personalizado_${idx}`;
    rutinaConvertida[diaKey] = {
      nombre: dia.nombre,
      ejercicios: dia.ejercicios.map(ej => ({
        nombre: ej.nombre,
        peso: ej.peso,
        series: ej.series,
        repsMin: ej.repsMin,
        repsMax: ej.repsMax,
        alFallo: ej.alFallo || false
      }))
    };
  });
  
  return rutinaConvertida;
}

// Mantén la rutina base como está (NO la borres)
const rutina = {
  torso_fuerza: {
    nombre: "Día 1 – Torso Fuerza",
    ejercicios: [
      { nombre: "Press banca", peso: 80, series: 4, repsMin: 3, repsMax: 5 },
      { nombre: "Press militar", peso: 50, series: 4, repsMin: 3, repsMax: 5 },
      { nombre: "Remo con barra", peso: 70, series: 4, repsMin: 3, repsMax: 5 },
      { nombre: "Press jabalina", peso: 40, series: 3, repsMin: 3, repsMax: 5 },
      { nombre: "Dominada supina", peso: 0, series: 4, repsMin: 5, repsMax: 8 },
      { nombre: "Fondos en paralelas", peso: 0, series: 3, repsMin: 5, repsMax: 8 },
      { nombre: "Elevaciones laterales", peso: 5, series: 3, repsMin: 12, repsMax: 15 }, // añadido
      { nombre: "Encogimientos", peso: 0, series: 2, repsMin: 8, repsMax: 10 }
    ]
  },
  pierna_fuerza: {
    nombre: "Día 2 – Pierna Fuerza",
    ejercicios: [
      { nombre: "Sentadilla trasera", peso: 100, series: 4, repsMin: 3, repsMax: 5 },
      { nombre: "Peso muerto convencional", peso: 80, series: 3, repsMin: 3, repsMax: 5 },
      { nombre: "Buenos días", peso: 20, series: 2, repsMin: 6, repsMax: 6 }, // añadido
      { nombre: "Elevaciones de piernas colgado", peso: 0, series: 3, repsMin: 8, repsMax: 10, alFallo: true },
      { nombre: "Jalón abdominal con peso", peso: 20, series: 3, repsMin: 10, repsMax: 10 },
      { nombre: "Sentadilla a una pierna", peso: 0, series: 2, repsMin: 5, repsMax: 5 }
    ]
  },
  torso_hipertrofia: {
    nombre: "Día 3 – Torso Hipertrofia",
    ejercicios: [
      { nombre: "Press militar", peso: 40, series: 4, repsMin: 8, repsMax: 10 },
      { nombre: "Press banca", peso: 60, series: 4, repsMin: 8, repsMax: 10 },
       { nombre: "Dominadas prono", peso: 0, series: 3, repsMin: 0, repsMax: 1, alFallo: true },
      { nombre: "Press banca inclinado", peso: 50, series: 3, repsMin: 8, repsMax: 10 },
      { nombre: "Remo con barra", peso: 50, series: 3, repsMin: 8, repsMax: 10 },
      { nombre: "Curl bíceps", peso: 15, series: 3, repsMin: 10, repsMax: 12 },
      { nombre: "Curl invertido", peso: 0, series: 2, repsMin: 10, repsMax: 10 },
      { nombre: "Tríceps francés / fondos ligeros", peso: 10, series: 3, repsMin: 10, repsMax: 12 }
    ]
  },
  pierna_hipertrofia: {
    nombre: "Día 4 – Pierna Hipertrofia",
    ejercicios: [
      { nombre: "Sentadilla frontal", peso: 60, series: 4, repsMin: 8, repsMax: 10 },
      { nombre: "Peso muerto rumano", peso: 70, series: 4, repsMin: 8, repsMax: 10 },
      { nombre: "Desplantes con barra", peso: 30, series: 4, repsMin: 8, repsMax: 10 },
      { nombre: "Elevación de talones", peso: 0, series: 4, repsMin: 12, repsMax: 15 },
      { nombre: "Peso muerto unilateral", peso: 20, series: 2, repsMin: 6, repsMax: 8 },
      { nombre: "Roll-out", peso: 0, series: 4, repsMin: 10, repsMax: 10, alFallo: true } // <--- SIN progresión
    ]
  },
  potencia: {
    nombre: "Día 5 – Potencia",
    ejercicios: [
      { nombre: "Clean", peso: 40, series: 5, repsMin: 3, repsMax: 3 }
    ]
  }
};

/*************************
 * CONFIGURACIÓN USUARIO
 *************************/
let config = JSON.parse(localStorage.getItem("config")) || {
  pesos: {},
  ejerciciosExtra: {}
};

function guardarConfig() {
  localStorage.setItem("config", JSON.stringify(config));
}

/*************************
 * ESTADO CENTRAL
 *************************/
let diaActual = null;
let ejerciciosDia = []; // array de objetos con estado de inputs

/*************************
 * TEMPORIZADOR AVANZADO
 *************************/
let timerID = null;
let tiempoRestante = 0;
let tiempoFinal = null;
let timerPausado = false;
// Lista de timers guardados
let timers = JSON.parse(localStorage.getItem("timers")) || [
  { nombre: "Descanso corto", minutos: 1, segundos: 30 },
  { nombre: "Descanso largo", minutos: 4, segundos: 0 }
];

function guardarTimers() {
  localStorage.setItem("timers", JSON.stringify(timers));
}

// Renderizar lista de timers
function renderTimers() {
  const cont = document.getElementById("lista-timers");
  if (!cont) return;
  cont.innerHTML = "";
  timers.forEach((t, i) => {
    cont.innerHTML += `
  <div class="timer-item">
    <p>${t.nombre} — ${t.minutos}m ${t.segundos}s</p>
    <button onclick="borrarTimer(${i})">Borrar</button>
    <button onclick="iniciarTemporizador(${t.minutos}, ${t.segundos})">Iniciar</button>
  </div>
`;
  });
}

function mostrarTiempo() {
  const el = document.getElementById("tiempo");
  if (!el) return;
  const m = Math.floor(tiempoRestante / 60);
  const s = tiempoRestante % 60;
  el.innerText = `${m}:${s.toString().padStart(2, "0")}`;
}


// Añadir timer
function añadirTimer() {
  const nombre = prompt("Nombre del temporizador:");
  const minutos = Number(prompt("Minutos:"));
  const segundos = Number(prompt("Segundos:"));
  if (!nombre || isNaN(minutos) || isNaN(segundos)) return alert("Datos inválidos");
  timers.push({ nombre, minutos, segundos });
  guardarTimers();
  renderTimers();
}

// Borrar timer
function borrarTimer(index) {
  timers.splice(index, 1);
  guardarTimers();
  renderTimers();
}



// Iniciar temporizador (segundo plano)
function iniciarTemporizador(min = 0, seg = 0) {
  if (timerID) return;

  const botonPausar = document.querySelector('#temporizador button[onclick*="pausar"]');

  // si estaba pausado, continuar
  if (timerPausado && tiempoRestante > 0) {
    tiempoFinal = Date.now() + tiempoRestante * 1000;
    timerPausado = false;
  } else {
    // inicio nuevo
    tiempoRestante = min * 60 + seg;
    tiempoFinal = Date.now() + tiempoRestante * 1000;
  }

  if (botonPausar) botonPausar.innerText = "Pausar";

  timerID = setInterval(() => {
    const ahora = Date.now();
    tiempoRestante = Math.max(
      0,
      Math.round((tiempoFinal - ahora) / 1000)
    );

    mostrarTiempo();

    if (tiempoRestante <= 0) {
      clearInterval(timerID);
      timerID = null;
      timerPausado = false;
      playBeep();
      mostrarModalTimer();
    }
  }, 1000);

  guardarEstadoApp();
}


// Pausar/Reanudar temporizador
function pausarTemporizador() {
  const botonPausar = document.querySelector('#temporizador button[onclick*="pausar"]');
  
  if (!timerID && timerPausado) {
    // Está pausado -> Reanudar
    iniciarTemporizador(0, tiempoRestante);
    if (botonPausar) botonPausar.innerText = "Pausar";
  } else if (timerID) {
    // Está corriendo -> Pausar
    clearInterval(timerID);
    timerID = null;
    
    // Recalcular tiempo restante REAL
    tiempoRestante = Math.max(
      0,
      Math.round((tiempoFinal - Date.now()) / 1000)
    );
    
    timerPausado = true;
    guardarEstadoApp();
    stopBeep();
    
    if (botonPausar) botonPausar.innerText = "Reanudar";
  }
}

// Resetear temporizador
function resetTemporizador() {
  const botonPausar = document.querySelector('#temporizador button[onclick*="pausar"]');
  
  clearInterval(timerID);
  timerID = null;
  timerPausado = false;
  tiempoRestante = 0;
  tiempoFinal = null;
  stopBeep();
  mostrarTiempo();
  
  if (botonPausar) botonPausar.innerText = "Pausar";
  
  guardarEstadoApp();
}


/*************************
 * NAVEGACIÓN
 *************************/
function abrirDia(diaKey) {
  desbloquearAudioPorGesto();
  guardarEstadoApp();
  diaActual = diaKey;
  history.pushState({}, "");

  // Pantallas
  const menu = document.getElementById("menu");
  const pantallaDia = document.getElementById("pantalla-dia");
  const pantallaHistorial = document.getElementById("pantalla-historial");
  const pantallaDetalle = document.getElementById("pantalla-detalle");

  if (!menu || !pantallaDia || !pantallaHistorial || !pantallaDetalle) return;

  menu.classList.add("oculto");
  pantallaDia.classList.remove("oculto");
  pantallaHistorial.classList.add("oculto");
  pantallaDetalle.classList.add("oculto");

  // Obtener rutina actual (base o personalizada)
  const rutinaActual = obtenerRutinaCompleta();
  
  // Verificar que el día existe
  if (!rutinaActual[diaKey]) {
    alert("Este día no existe en la rutina actual");
    volverMenu();
    return;
  }

  // Título
  const tituloDia = document.getElementById("titulo-dia");
  if (tituloDia) tituloDia.innerText = rutinaActual[diaKey].nombre;

  cargarEjerciciosDia();
  resetTemporizador();
  renderDia();

 // 👇 CONFIGURACIÓN DINÁMICA DE HIT/Timer (ACTUALIZADA)
const rutinaActiva = obtenerRutinaActiva();

let mostrarCronometro = false;
let mostrarTimer = true;

// Si es rutina personalizada, usar configuración del día
if (rutinaActiva !== RUTINA_BASE_ID) {
  const rutinaUsuario = loadRutinaUsuario(rutinaActiva);
  
  if (rutinaUsuario && rutinaUsuario.dias) {
    // Extraer el índice del diaKey (dia_personalizado_0 → 0)
    const match = diaKey.match(/dia_personalizado_(\d+)/);
    if (match) {
      const diaIndex = parseInt(match[1]);
      const diaConfig = rutinaUsuario.dias[diaIndex];
      
      if (diaConfig) {
        mostrarCronometro = diaConfig.tieneCronometro || false;
        mostrarTimer = diaConfig.tieneTimer !== false;
      }
    }
  }
} else {
  // Rutina base: HIT solo en día "potencia"
  mostrarCronometro = (diaKey === "potencia");
}

// Mostrar/ocultar cronómetro HIT
const hit = document.getElementById("hit-crono");
if (hit) {
  if (mostrarCronometro) {
    hit.classList.remove("oculto");
  } else {
    hit.classList.add("oculto");
  }
}

// Mostrar/ocultar temporizador
const timer = document.getElementById("temporizador");
if (timer) {
  if (mostrarTimer) {
    timer.classList.remove("oculto");
  } else {
    timer.classList.add("oculto");
  }
 }
}

/*************************
 * CARGAR EJERCICIOS DEL DÍA
 *************************/
function cargarEjerciciosDia() {
  const rutinaActual = obtenerRutinaCompleta();
  
  if (!rutinaActual[diaActual]) {
    console.error("Día no encontrado:", diaActual);
    return;
  }
  
  const base = rutinaActual[diaActual].ejercicios || [];
  const extra = config.ejerciciosExtra[diaActual] || [];

  // Combinar base + extra en un solo array
  ejerciciosDia = [...base, ...extra].map(ej => {
    const key = `${diaActual}_${ej.nombre}`;
    return {
      nombre: ej.nombre,
      series: ej.series,
      repsMin: ej.repsMin,
      repsMax: ej.alFallo ? 30 : ej.repsMax,
      peso: ej.alFallo ? 0 : (config.pesos[key] ?? ej.peso),
      reps: Array(ej.series).fill(""),
      incremento: ej.alFallo ? 0 : 2,
      noProgresar: ej.alFallo ? true : false,
      alFallo: ej.alFallo || false
    };
  });
}

/*************************
 * RENDERIZAR DÍA
 *************************/
function renderDia() {
 const cont = document.getElementById("contenido");
 if (!cont) return;
 cont.innerHTML = "";

  ejerciciosDia.forEach((ej, i) => {
    let seriesHTML = "";
    for (let s = 0; s < ej.series; s++) {
  seriesHTML += `
    <input
      type="number"
      min="0"
      max="${ej.alFallo ? 30 : ej.repsMax}"
      id="rep-${i}-${s}"
      placeholder="S${s + 1}"
      value="${ej.reps[s]}"
      oninput="actualizarSerie(${i}, ${s}, this.value, this)"
    >
  `;
}

    cont.innerHTML += `
      <div class="ejercicio">
        <h3>${ej.nombre}</h3>

        <label>Peso base:</label>
        <input type="number" value="${ej.peso}" onchange="ejerciciosDia[${i}].peso=Number(this.value); guardarPesoBase('${ej.nombre}', this.value)">

        <p>Objetivo: ${ej.series} × ${ej.repsMin}-${ej.repsMax}</p>

        <div class="series">${seriesHTML}</div>

        <label>Incremento (kg):</label>
        <input type="number" id="inc-${i}" placeholder="2" value="${ej.incremento}" onchange="ejerciciosDia[${i}].incremento=Number(this.value)">

        <label>
          <input type="checkbox" id="noprog-${i}" ${ej.noProgresar ? "checked" : ""} onchange="ejerciciosDia[${i}].noProgresar=this.checked">
          No progresar
        </label>
      </div>
    `;
  });
}

function actualizarSerie(ejIndex, serieIndex, valor, input) {
  const ej = ejerciciosDia[ejIndex];
  const reps = valor === "" ? "" : Number(valor);
  ej.reps[serieIndex] = reps;

  input.classList.remove("serie-ok", "serie-fail", "serie-mid");

  if (ej.alFallo) {
    guardarEstadoApp(); // 👈 AÑADIR AQUÍ
    return;
  }

  if (reps === ej.repsMax) {
    input.classList.add("serie-ok");
  } else if (reps < ej.repsMin) {
    input.classList.add("serie-fail");
  } else {
    input.classList.add("serie-mid");
  }
  
  guardarEstadoApp(); // 👈 YA ESTABA AQUÍ, está bien
}

/*************************
 * GUARDAR PESO BASE
 *************************/
function guardarPesoBase(nombre, valor) {
  const key = `${diaActual}_${nombre}`;
  config.pesos[key] = Number(valor);
  guardarConfig();
}


/*************************
HIT – CRONÓMETRO REAL
*************************/
let hitActivo = false;
let hitInicio = null;
let hitTiempoAcumulado = 0;
let hitInterval = null;
let hitTipo = "HIT 1";


function iniciarHIT() {
  if (hitActivo) return;

  hitActivo = true;
  hitInicio = Date.now();

  hitInterval = setInterval(() => {
    const ahora = Date.now();
    const total = hitTiempoAcumulado + Math.floor((ahora - hitInicio) / 1000);
    document.getElementById("tiempo-hit").innerText = formatearTiempo(total);
  }, 500);
}

function pausarHIT() {
  if (!hitActivo) return;

  hitTiempoAcumulado += Math.floor((Date.now() - hitInicio) / 1000);
  hitActivo = false;
  clearInterval(hitInterval);
}

function resetHIT() {
  hitActivo = false;
  clearInterval(hitInterval);
  hitTiempoAcumulado = 0;
  hitInicio = null;
  document.getElementById("tiempo-hit").innerText = "0:00";
}

function obtenerTiempoHIT() {
  if (hitActivo) {
    pausarHIT();
  }
  return hitTiempoAcumulado;
}

/*************************
 * FINALIZAR SESIÓN CORREGIDO
 *************************/
function finalizarDia() {
  if (!diaActual) return;

  let huboProgresion = false;
  let detallesProgreso = [];

  // Obtener rutina actual (base o personalizada)
  const rutinaActual = obtenerRutinaCompleta();
  
  // Crear objeto de sesión con fecha completa
  const sesion = {
    fecha: new Date().toISOString(),
    dia: rutinaActual[diaActual]?.nombre || "Día desconocido", // 👈 CORREGIDO
    ejercicios: ejerciciosDia.map(ej => ({
      nombre: ej.nombre,
      peso: ej.peso,
      reps: [...ej.reps]
    })),
    tiempoHIT: diaActual === "potencia" ? obtenerTiempoHIT() : null,
    tipoHIT: diaActual === "potencia" ? hitTipo : null 
  };

  // Calcular progresión
  ejerciciosDia.forEach(ej => {
    const completo = ej.reps.every(r => Number(r) === ej.repsMax);

    // Solo incrementa si NO es al fallo y no está marcado "noProgresar"
    if (!ej.alFallo && completo && !ej.noProgresar) {
      ej.peso += ej.incremento;
      guardarPesoBase(ej.nombre, ej.peso);
      huboProgresion = true;
      detallesProgreso.push(`${ej.nombre}: PROGRESO +${ej.incremento}kg`);
    } else if (ej.alFallo) {
      detallesProgreso.push(`${ej.nombre}: Al fallo — repeticiones registradas, SIN incremento`);
    } else {
      detallesProgreso.push(`${ej.nombre}: NO progresó`);
    }
  });

  // Guardar historial SIEMPRE
  let historial = JSON.parse(localStorage.getItem("historial")) || [];
  historial.push(sesion);
  localStorage.setItem("historial", JSON.stringify(historial));
  guardarConfig();

  // Resetear reps, incremento y checkbox
  ejerciciosDia.forEach(ej => {
    ej.reps = Array(ej.series).fill("");
    ej.incremento = 2;
    ej.noProgresar = false;
  });

  resetTemporizador();
  renderDia();

  let mensaje = `Sesión guardada.\n${huboProgresion ? "Algunos ejercicios progresaron automáticamente.\n" : "No hubo progresión.\n"}Detalles:\n`;
  mensaje += detallesProgreso.join("\n");
  alert(mensaje);
}

resetHIT();

/*************************
 * HISTORIAL CORREGIDO
 *************************/
function abrirHistorial() {
  cerrarSidebar();
  guardarEstadoApp();
  history.pushState({}, "");

  // Ocultar TODO lo que no sea pantalla de historial
  document.getElementById("menu").classList.add("oculto");
  document.getElementById("pantalla-dia").classList.add("oculto");
  document.getElementById("pantalla-detalle").classList.add("oculto");

  // Mostrar solo historial
  document.getElementById("pantalla-historial").classList.remove("oculto");

  // Limpiar contenedor
  const cont = document.getElementById("lista-historial");
  cont.innerHTML = "";

  // Obtener historial completo
  const historial = JSON.parse(localStorage.getItem("historial")) || [];

  historial
  .slice()
  .reverse()
  .forEach((s, i) => {
    cont.innerHTML += `
      <div class="historial-item">
        <p>
  ${new Date(s.fecha).toLocaleString()} — ${s.dia}
  ${s.tiempoHIT !== null ? ` — ${s.tipoHIT} (${formatearTiempo(s.tiempoHIT)})` : ""}
</p>
        <button onclick="verDetalle(${historial.length - 1 - i})">
          Ver detalles
        </button>
      </div>
    `;
  });
}

function volverHistorial() {
  // Actualizar el historial del navegador
  history.pushState({ pantalla: 'historial' }, "");

  document.getElementById("pantalla-detalle").classList.add("oculto");
  document.getElementById("pantalla-dia").classList.add("oculto");
  document.getElementById("pantalla-historial").classList.remove("oculto");
}

function verDetalle(index) {
  guardarEstadoApp();
  // Guardar el estado actual en el historial del navegador
  history.pushState({ pantalla: 'detalle', index }, "");

  const historial = JSON.parse(localStorage.getItem("historial")) || [];
  const s = historial[index];
  if (!s) return;

  document.getElementById("pantalla-historial").classList.add("oculto");
  document.getElementById("pantalla-dia").classList.add("oculto");
  document.getElementById("pantalla-detalle").classList.remove("oculto");

  const cont = document.getElementById("detalle-sesion");
cont.innerHTML = `
  <p>
    ${new Date(s.fecha).toLocaleString()} — ${s.dia}
    ${s.tiempoHIT !== null
      ? ` — ${s.tipoHIT}: ${formatearTiempo(s.tiempoHIT)}`
      : ""}
  </p>
`;
  s.ejercicios.forEach(ej => {
    cont.innerHTML += `
      <div class="ejercicio-detalle">
        <p><strong>${ej.nombre}</strong></p>
        <p>Reps: ${ej.reps.join(" / ")} — Peso: ${ej.peso} kg</p>
      </div>
    `;
  });
}

/*************************
 * AÑADIR EJERCICIO
 *************************/
function añadirEjercicio() {
  const diaKey = document.getElementById("dia-ejercicio").value;
  const nombre = document.getElementById("nuevo-nombre").value.trim();
  const peso = Number(document.getElementById("nuevo-peso").value);
  const series = Number(document.getElementById("nuevo-series").value);
  const repsMin = Number(document.getElementById("nuevo-reps-min").value);
  const repsMax = Number(document.getElementById("nuevo-reps-max").value);

  // Validar que el día existe en la rutina actual
  const rutinaActual = obtenerRutinaCompleta();
  if (!rutinaActual[diaKey]) { 
    alert("Día inválido"); 
    return; 
  }
  
  if (!nombre || series <= 0 || repsMin <= 0 || repsMax <= 0) { 
    alert("Datos incompletos"); 
    return; 
  }

  const nuevo = { 
    nombre, 
    peso, 
    series, 
    repsMin, 
    repsMax,
    alFallo: document.getElementById("nuevo-fallo").checked,
    noProgresar: document.getElementById("nuevo-no-progresar").checked,
    reps: []
  };
  
  if (!config.ejerciciosExtra[diaKey]) config.ejerciciosExtra[diaKey] = [];
  config.ejerciciosExtra[diaKey].push(nuevo);
  guardarConfig();

  if (diaActual === diaKey) {
    cargarEjerciciosDia();
    renderDia();
  }

  document.getElementById("nuevo-nombre").value = "";
  document.getElementById("nuevo-peso").value = "";
  document.getElementById("nuevo-series").value = "";
  document.getElementById("nuevo-reps-min").value = "";
  document.getElementById("nuevo-reps-max").value = "";

  alert(`Ejercicio añadido a ${rutinaActual[diaKey].nombre}`); // 👈 CORREGIDO
}

/*************************
 * BORRAR HISTORIAL
 *************************/
function borrarTodoHistorial() {
  if (!confirm("¿Borrar todo el historial?")) return;
  localStorage.removeItem("historial");
  alert("Historial eliminado");
}

function limpiarHistorialDuplicados() {
  let historial = JSON.parse(localStorage.getItem("historial")) || [];
  historial = historial.filter((sesion, index, arr) => 
    index === arr.findIndex(s => s.fecha === sesion.fecha && s.dia === sesion.dia)
  );
  localStorage.setItem("historial", JSON.stringify(historial));
  alert("Historial limpio de duplicados");
}

/*************************
 * BOTÓN ATRÁS ANDROID
 *************************/
window.addEventListener("popstate", () => {
  // Cerrar modal si está abierto
  const modal = document.getElementById("modal-timer");
  if (modal && !modal.classList.contains("oculto")) {
    ocultarModalTimer();
    return;
  }

  // Navegar según pantalla activa
  if (!document.getElementById("pantalla-perfil").classList.contains("oculto")) {
    volverMenu();
  }
  else if (!document.getElementById("pantalla-detalle").classList.contains("oculto")) {
    volverHistorial();
  }
  else if (!document.getElementById("pantalla-medidas").classList.contains("oculto")) {
    volverMenu();
  }
  else if (!document.getElementById("pantalla-historial").classList.contains("oculto")) {
    volverMenu();
  }
  else if (!document.getElementById("pantalla-dia").classList.contains("oculto")) {
    volverMenu();
  }
});

/*************************
 * UTILIDADES
 *************************/
function formatearTiempo(segundos) {
  const m = Math.floor(segundos / 60);
  const s = segundos % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function abrirMedidas() {
  cerrarSidebar();
  guardarEstadoApp();
  history.pushState({}, "");

  document.getElementById("menu").classList.add("oculto");
  document.getElementById("pantalla-dia").classList.add("oculto");
  document.getElementById("pantalla-historial").classList.add("oculto");
  document.getElementById("pantalla-detalle").classList.add("oculto");

  document.getElementById("pantalla-medidas").classList.remove("oculto");

  cargarMedidas();
}

function guardarMedidas() {
  const nuevaMedida = {
  fecha: new Date().toISOString(),

  peso: valorOpcional("peso"),
  altura: valorOpcional("altura"),
  cintura: valorOpcional("cintura"),
  cadera: valorOpcional("cadera"),
  pecho: valorOpcional("pecho"),
  brazo_relajado: valorOpcional("brazo_relajado"),
  brazo_contraido: valorOpcional("brazo_contraido"),
  muslo: valorOpcional("muslo")
};

  const historial = JSON.parse(localStorage.getItem("historialMedidas")) || [];
  historial.push(nuevaMedida);
  localStorage.setItem("historialMedidas", JSON.stringify(historial));

  alert("Medidas guardadas correctamente");

  limpiarFormularioMedidas();
  cargarMedidas();

}

function cargarMedidas() {
  const cont = document.getElementById("lista-medidas");
  cont.innerHTML = "";

  const historial = JSON.parse(localStorage.getItem("historialMedidas")) || [];

  historial.slice().reverse().forEach(m => {
    const fecha = new Date(m.fecha).toLocaleDateString();

    cont.innerHTML += `
      <div class="medida-item">
        <strong>${fecha}</strong>
        ${mostrarMedida("Peso", m.peso, "kg")}
        ${mostrarMedida("Altura", m.altura, "cm")}
        ${mostrarMedida("Cintura", m.cintura, "cm")}
        ${mostrarMedida("Cadera", m.cadera, "cm")}
        ${mostrarMedida("Pecho", m.pecho, "cm")}
        ${mostrarMedida("Brazo relajado", m.brazo_relajado, "cm")}
        ${mostrarMedida("Brazo contraído", m.brazo_contraido, "cm")}
        ${mostrarMedida("Muslo", m.muslo, "cm")}
      </div>
    `;
  });
}

function mostrarMedida(nombre, valor, unidad) {
  if (valor === null) return "";
  return `<p>${nombre}: ${valor} ${unidad}</p>`;
}

function valorOpcional(id) {
  const v = document.getElementById(id).value;
  return v === "" ? null : Number(v);
}


function borrarTodoHistorialMedidas() {
  if (!confirm("¿Borrar todo el historial de medidas?")) return;
  localStorage.removeItem("historialMedidas");
  document.getElementById("lista-medidas").innerHTML = ""; // limpiar pantalla
  alert("Historial de medidas eliminado");
}

function limpiarFormularioMedidas() {
  const campos = ["peso","altura","cintura","cadera","pecho","brazo_relajado","brazo_contraido","muslo"];
  campos.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });
}

function forzarActualizacion() {
  if (navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({ type: 'SKIP_WAITING' });
    alert("Actualización forzada. La app se recargará automáticamente.");
    // Recarga la página para aplicar la nueva versión
    setTimeout(() => location.reload(), 1000);
  } else {
    alert("Service Worker no activo. Por favor recarga la app manualmente.");
  }
}

/*************************
BORRAR RUTINA COMPLETA DEL DÍA
*************************/
function borrarRutinaDia() {
  if (!diaActual) return;

  if (!confirm("Esto borrará TODA la rutina del día. ¿Continuar?")) return;

  // Eliminar ejercicios base
  rutina[diaActual].ejercicios = [];

  // Eliminar extras
  delete config.ejerciciosExtra[diaActual];

  guardarConfig();
  cargarEjerciciosDia();
  renderDia();

  alert("Rutina del día eliminada. Puedes crear una nueva desde 'Añadir ejercicio'.");
}



if ("Notification" in window && Notification.permission !== "granted") {
Notification.requestPermission().then(permission => {
if (permission !== "granted") console.warn("Notificaciones no activadas");
});
}

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.addEventListener("message", event => {
    if (event.data?.type === "RESET_TIMER") {
      resetTemporizador();
    }
  });
}

function mostrarModalTimer() {
  document.getElementById("modal-timer").classList.remove("oculto");
}

function ocultarModalTimer() {
  document.getElementById("modal-timer").classList.add("oculto");
}

function resetDesdeModal() {
  resetTemporizador();
  ocultarModalTimer();
}

function volverMenu() {
  document.getElementById("pantalla-auth").classList.add("oculto");
  document.getElementById("pantalla-perfil").classList.add("oculto");
  document.getElementById("pantalla-dia").classList.add("oculto");
  document.getElementById("pantalla-historial").classList.add("oculto");
  document.getElementById("pantalla-detalle").classList.add("oculto");
  document.getElementById("pantalla-medidas").classList.add("oculto");
  document.getElementById("menu").classList.remove("oculto");
  guardarEstadoApp();
}

// Renderizar botones de días según rutina activa
function renderizarBotonesDias() {
  const contenedor = document.getElementById("botones-dias");
  if (!contenedor) return;

  const rutinaActual = obtenerRutinaCompleta();
  contenedor.innerHTML = "";

  Object.keys(rutinaActual).forEach((diaKey, idx) => {
    const dia = rutinaActual[diaKey];
    const boton = document.createElement("button");
    boton.textContent = `Día ${idx + 1} – ${dia.nombre}`;
    boton.onclick = () => abrirDia(diaKey);
    contenedor.appendChild(boton);
  });
}


function guardarEstadoApp() {
  estadoApp = {
    pantalla:
      !document.getElementById("menu").classList.contains("oculto") ? "menu" :
      !document.getElementById("pantalla-dia").classList.contains("oculto") ? "dia" :
      !document.getElementById("pantalla-historial").classList.contains("oculto") ? "historial" :
      !document.getElementById("pantalla-detalle").classList.contains("oculto") ? "detalle" :
      !document.getElementById("pantalla-medidas").classList.contains("oculto") ? "medidas" :
      "menu",

    diaActual,
    repsPorEjercicio: ejerciciosDia.map(ej => ({
  nombre: ej.nombre,
  reps: [...ej.reps]
})),
    tiempoRestante,
    tiempoFinal
  };

  localStorage.setItem("estadoApp", JSON.stringify(estadoApp));
}

// Toggle sidebar
function toggleSidebar() {
  const sidebar = document.getElementById("sidebar");
  const overlay = document.getElementById("sidebar-overlay");
  
  if (!sidebar || !overlay) return;
  
  const isOpen = sidebar.classList.contains("sidebar-open");
  
  if (isOpen) {
    sidebar.classList.remove("sidebar-open");
    sidebar.classList.add("sidebar-closed");
    overlay.classList.add("oculto");
  } else {
    sidebar.classList.remove("sidebar-closed");
    sidebar.classList.add("sidebar-open");
    overlay.classList.remove("oculto");
  }
}

// Cerrar sidebar al navegar
function cerrarSidebar() {
  const sidebar = document.getElementById("sidebar");
  const overlay = document.getElementById("sidebar-overlay");
  
  if (sidebar && overlay) {
    sidebar.classList.remove("sidebar-open");
    sidebar.classList.add("sidebar-closed");
    overlay.classList.add("oculto");
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  // 1. Render timers
  renderTimers();
  
  // 2. Renderizar botones de días
  renderizarBotonesDias();

  // 3. Audio
  try {
    await initAudio();
  } catch (e) {
    console.warn("Audio no cargado:", e);
  }

  // 4. Restaurar estado
  const saved = JSON.parse(localStorage.getItem("estadoApp"));
  if (!saved) return;

  diaActual = saved.diaActual;
  tiempoRestante = saved.tiempoRestante || 0;
  tiempoFinal = saved.tiempoFinal;

    // ========================================
// RESTAURAR PANTALLA DÍA
// ========================================
if (saved.pantalla === "dia" && diaActual) {
  // Cargar ejercicios del día
  cargarEjerciciosDia();
  
  // 👇 RESTAURAR REPS ANTES DE RENDERIZAR
  if (saved.repsPorEjercicio) {
    saved.repsPorEjercicio.forEach(savedEj => {
      const ej = ejerciciosDia.find(e => e.nombre === savedEj.nombre);
      if (ej) ej.reps = savedEj.reps;
    });
  }
  
  // AHORA sí renderizar con las reps restauradas
  renderDia();
  
  // 👇 NUEVO: Aplicar colores DESPUÉS de renderizar
  if (saved.repsPorEjercicio) {
    saved.repsPorEjercicio.forEach((savedEj, ejIndex) => {
      const ej = ejerciciosDia.find(e => e.nombre === savedEj.nombre);
      if (!ej) return;
      
      savedEj.reps.forEach((reps, serieIndex) => {
        const input = document.getElementById(`rep-${ejIndex}-${serieIndex}`);
        if (!input || reps === "" || ej.alFallo) return;
        
        input.classList.remove("serie-ok", "serie-fail", "serie-mid");
        
        const numReps = Number(reps);
        if (numReps === ej.repsMax) {
          input.classList.add("serie-ok");
        } else if (numReps < ej.repsMin) {
          input.classList.add("serie-fail");
        } else {
          input.classList.add("serie-mid");
        }
      });
    });
  }
  
  mostrarTiempo();
  
  // Mostrar la pantalla correcta
  document.getElementById("menu").classList.add("oculto");
  document.getElementById("pantalla-dia").classList.remove("oculto");
  

    // Obtener rutina actual para el título
    const rutinaActual = obtenerRutinaCompleta();
    const tituloDia = document.getElementById("titulo-dia");
    if (tituloDia && rutinaActual[diaActual]) {
      tituloDia.innerText = rutinaActual[diaActual].nombre;
    }
    
    // Mostrar/ocultar HIT según día
    const hit = document.getElementById("hit-crono");
    if (hit) {
      if (diaActual === "potencia") {
        hit.classList.remove("oculto");
      } else {
        hit.classList.add("oculto");
      }
    }
    
    // Mostrar temporizador
    const timer = document.getElementById("temporizador");
    if (timer) {
      timer.classList.remove("oculto");
    }
  }

  // ========================================
  // RESTAURAR TEMPORIZADOR
  // ========================================
  if (tiempoFinal && tiempoFinal > Date.now()) {
    iniciarTemporizador(0, tiempoRestante);
  } else {
    tiempoRestante = 0;
  }

  // ========================================
  // RESTAURAR OTRAS PANTALLAS
  // ========================================
  if (saved.pantalla === "historial") {
    abrirHistorial();
  } else if (saved.pantalla === "detalle") {
    abrirHistorial();
  } else if (saved.pantalla === "medidas") {
    abrirMedidas();
  }
  
  // 5. Event listener para HIT
  const selectHit = document.getElementById("hit-tipo");
  if (selectHit) {
    selectHit.addEventListener("change", (e) => {
      hitTipo = e.target.value;
    });
  }
});

// Detectar estado de conexión
let isOnline = navigator.onLine;

window.addEventListener('online', () => {
  isOnline = true;
  console.log('✅ Conexión restaurada - Puedes sincronizar');
  
  // Mostrar notificación al usuario
  if (confirm('Conexión restaurada. ¿Sincronizar datos ahora?')) {
    if (typeof syncNow === 'function') {
      syncNow();
    }
  }
});

window.addEventListener('offline', () => {
  isOnline = false;
  console.log('⚠️ Sin conexión - Trabajando offline');
  alert('Sin conexión. Los datos se guardarán localmente.');
});

// Función para verificar si estamos online
window.abrirDia = abrirDia;
window.volverMenu = volverMenu;
window.abrirHistorial = abrirHistorial;
window.finalizarDia = finalizarDia;
window.forzarActualizacion = forzarActualizacion;
window.iniciarTemporizador = iniciarTemporizador;
window.pausarTemporizador = pausarTemporizador;
window.resetTemporizador = resetTemporizador;
window.añadirTimer = añadirTimer;
window.añadirEjercicio = añadirEjercicio;
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
window.actualizarSerie = actualizarSerie;
window.toggleSidebar = toggleSidebar;
window.resetDesdeModal = resetDesdeModal;
// Escuchar cambios de rutina
window.addEventListener("cambio-rutina", (e) => {
  console.log("Rutina cambiada a:", e.detail.rutinaId);
  // Aquí puedes recargar ejercicios si estás en un día activo
  if (diaActual) {
    cargarEjerciciosDia();
    renderDia();
  }
});

// Sobrescribir para actualizar selector
window.volverMenu = function() {
  // Guardar estado para historial del navegador
  history.pushState({ pantalla: 'menu' }, "");
  
  // Ocultar todas las pantallas
  document.getElementById("pantalla-auth").classList.add("oculto");
  document.getElementById("pantalla-perfil").classList.add("oculto");
  document.getElementById("pantalla-dia").classList.add("oculto");
  document.getElementById("pantalla-historial").classList.add("oculto");
  document.getElementById("pantalla-detalle").classList.add("oculto");
  document.getElementById("pantalla-medidas").classList.add("oculto");
  
  // Mostrar menú
  document.getElementById("menu").classList.remove("oculto");
  
  // Actualizar selector por si hay cambios
  renderizarSelectorRutinas();
  
  guardarEstadoApp();
};

// ========================================
// SWIPE GESTURE PARA SIDEBAR
// ========================================
let touchStartX = 0;
let touchStartY = 0;
let touchEndX = 0;
let touchEndY = 0;
let isSwiping = false;

const SWIPE_THRESHOLD = 100; // Píxeles mínimos para considerar swipe
const EDGE_ZONE = 30; // Zona del borde izquierdo donde funciona el swipe (píxeles)

document.addEventListener('touchstart', (e) => {
  touchStartX = e.changedTouches[0].screenX;
  touchStartY = e.changedTouches[0].screenY;
  
  // Solo detectar swipe si empieza desde el borde izquierdo
  if (touchStartX <= EDGE_ZONE) {
    isSwiping = true;
  }
}, { passive: true });

document.addEventListener('touchmove', (e) => {
  if (!isSwiping) return;
  
  touchEndX = e.changedTouches[0].screenX;
  touchEndY = e.changedTouches[0].screenY;
  
  const deltaX = touchEndX - touchStartX;
  const deltaY = Math.abs(touchEndY - touchStartY);
  
  // Si el swipe es más horizontal que vertical y va hacia la derecha
  if (deltaX > 50 && deltaY < 100) {
    const sidebar = document.getElementById("sidebar");
    const overlay = document.getElementById("sidebar-overlay");
    
    // Abrir sidebar mientras arrastras (opcional, para feedback visual)
    if (sidebar && !sidebar.classList.contains("sidebar-open")) {
      sidebar.classList.remove("sidebar-closed");
      sidebar.classList.add("sidebar-open");
      if (overlay) overlay.classList.remove("oculto");
    }
  }
}, { passive: true });

document.addEventListener('touchend', (e) => {
  if (!isSwiping) return;
  
  touchEndX = e.changedTouches[0].screenX;
  touchEndY = e.changedTouches[0].screenY;
  
  const deltaX = touchEndX - touchStartX;
  const deltaY = Math.abs(touchEndY - touchStartY);
  
  // Si el swipe es horizontal y supera el umbral
  if (deltaX > SWIPE_THRESHOLD && deltaY < 100) {
    const sidebar = document.getElementById("sidebar");
    const overlay = document.getElementById("sidebar-overlay");
    
    if (sidebar && overlay) {
      sidebar.classList.remove("sidebar-closed");
      sidebar.classList.add("sidebar-open");
      overlay.classList.remove("oculto");
    }
  }
  
  isSwiping = false;
}, { passive: true });

// CERRAR SIDEBAR CON SWIPE HACIA LA IZQUIERDA
document.getElementById("sidebar")?.addEventListener('touchstart', (e) => {
  if (!document.getElementById("sidebar").classList.contains("sidebar-open")) return;
  
  touchStartX = e.changedTouches[0].screenX;
  isSwiping = true;
}, { passive: true });

document.getElementById("sidebar")?.addEventListener('touchend', (e) => {
  if (!isSwiping) return;
  
  touchEndX = e.changedTouches[0].screenX;
  const deltaX = touchEndX - touchStartX;
  
  // Si el swipe es hacia la izquierda
  if (deltaX < -SWIPE_THRESHOLD) {
    toggleSidebar();
  }
  
  isSwiping = false;
}, { passive: true });
