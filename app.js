/*************************
 * DATOS DE LA RUTINA (BASE - NO SE MODIFICA)
 *************************/
import "./auth.js";
import "./cloud.js";
import { loadRutinaUsuario, inicializarRutinaBase, RUTINA_BASE_ID as RUTINA_BASE_KEY } from "./rutinaUsuario.js";
import { markDirty, userState } from "./userState.js";
import { renderizarSelectorRutinas, obtenerRutinaActiva, RUTINA_BASE_ID } from "./selectorRutinas.js";
import "./themes.js";
import "./editorRutinas.js";
let audioCtx;
let bufferBeep;
let sourceBeep;
let audioPersonalizado = null; // Buffer de audio personalizado
let audioPersonalizadoNombre = null; // Nombre del archivo
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

  // Cargar beep por defecto
  const resp = await fetch("./beep.mp3");
  const arrayBuffer = await resp.arrayBuffer();
  bufferBeep = await audioCtx.decodeAudioData(arrayBuffer);
  
  // Cargar audio personalizado si existe
  await cargarAudioGuardado();
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
    return;
  }

  // Usar audio personalizado si existe, sino usar beep
  const bufferToUse = audioPersonalizado || bufferBeep;
  
  if (!bufferToUse) {
    console.warn("Buffer de audio no cargado");
    return;
  }

  if (audioCtx.state === "suspended") {
    audioCtx.resume().catch(e => console.warn("No se pudo reanudar audio", e));
  }

  sourceBeep = audioCtx.createBufferSource();
  sourceBeep.buffer = bufferToUse;
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

// ========================================
// ✅ FUNCIONES DE AUDIO PERSONALIZADO
// ========================================

async function cargarAudioPersonalizado(input) {
  const file = input.files[0];
  
  if (!file) return;
  
  // Validar que sea un archivo de audio
  if (!file.type.startsWith('audio/')) {
    alert('❌ Por favor selecciona un archivo de audio válido (.mp3, .wav, .ogg)');
    input.value = ''; // Limpiar input
    return;
  }
  
  // Validar tamaño (max 5MB)
  if (file.size > 5 * 1024 * 1024) {
    alert('❌ El archivo es muy grande. Máximo 5MB.');
    input.value = ''; // Limpiar input
    return;
  }
  
  try {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    
    console.log('📁 Cargando audio:', file.name);
    
    // Leer archivo como ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    
    // Decodificar audio PRIMERO (para validar)
    audioPersonalizado = await audioCtx.decodeAudioData(arrayBuffer.slice(0));
    audioPersonalizadoNombre = file.name;
    
    console.log('✅ Audio decodificado correctamente');
    
    // Ahora guardar en localStorage
    const reader = new FileReader();
    reader.onload = function(e) {
      try {
        const base64Audio = e.target.result;
        localStorage.setItem('audioPersonalizado', base64Audio);
        localStorage.setItem('audioPersonalizadoNombre', file.name);
        
        console.log('💾 Audio guardado en localStorage');
        console.log('📊 Tamaño guardado:', (base64Audio.length / 1024).toFixed(2), 'KB');
        
        // Actualizar UI
        actualizarNombreAudio(file.name);
        
        alert('✅ Audio personalizado guardado correctamente');
      } catch (error) {
        console.error('Error guardando en localStorage:', error);
        alert('❌ Error al guardar el audio. Intenta con un archivo más pequeño.');
      }
    };
    
    reader.onerror = function() {
      alert('❌ Error al leer el archivo');
    };
    
    reader.readAsDataURL(file);
    
  } catch (error) {
    console.error('Error cargando audio:', error);
    alert('❌ Error al cargar el audio. Intenta con otro archivo.');
  } finally {
    input.value = ''; // Limpiar input
  }
}

async function cargarAudioGuardado() {
  const audioGuardado = localStorage.getItem('audioPersonalizado');
  const nombreGuardado = localStorage.getItem('audioPersonalizadoNombre');
  
  if (!audioGuardado || !nombreGuardado) {
    console.log('ℹ️ No hay audio personalizado guardado');
    return;
  }
  
  try {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    
    console.log('📂 Cargando audio guardado:', nombreGuardado);
    
    // Convertir base64 a blob
    const response = await fetch(audioGuardado);
    const blob = await response.blob();
    const arrayBuffer = await blob.arrayBuffer();
    
    // Decodificar audio
    audioPersonalizado = await audioCtx.decodeAudioData(arrayBuffer);
    audioPersonalizadoNombre = nombreGuardado;
    
    // Actualizar UI
    actualizarNombreAudio(nombreGuardado);
    
    console.log('✅ Audio personalizado cargado:', nombreGuardado);
    
  } catch (error) {
    console.error('❌ Error cargando audio guardado:', error);
    // Si falla, limpiar localStorage
    localStorage.removeItem('audioPersonalizado');
    localStorage.removeItem('audioPersonalizadoNombre');
    console.log('🗑️ Audio corrupto eliminado');
  }
}

// Resetear al audio por defecto
function resetearAudioPorDefecto() {
  if (!confirm('¿Volver al sonido predeterminado?')) return;
  
  // Limpiar localStorage
  localStorage.removeItem('audioPersonalizado');
  localStorage.removeItem('audioPersonalizadoNombre');
  
  // Limpiar variables
  audioPersonalizado = null;
  audioPersonalizadoNombre = null;
  
  // Actualizar UI
  actualizarNombreAudio('Beep (predeterminado)');
  
  alert('✅ Audio restaurado al predeterminado');
}

// Probar el sonido actual
function probarSonido() {
  // Parar cualquier sonido en reproducción
  stopBeep();
  
  // Reproducir el sonido actual
  playBeep();
  
  // Detener después de 2 segundos
  setTimeout(() => {
    stopBeep();
  }, 2000);
}

// Actualizar nombre del audio en la UI
function actualizarNombreAudio(nombre) {
  // Actualizar en sidebar (si existe)
  const elementoSidebar = document.getElementById('nombre-audio');
  if (elementoSidebar) {
    elementoSidebar.textContent = nombre;
  }
  
  // Actualizar en pantalla de audio
  const elementoPantalla = document.getElementById('nombre-audio-display');
  if (elementoPantalla) {
    elementoPantalla.textContent = nombre;
  }
  
  console.log('🔄 UI actualizada:', nombre);
}

// Exportar funciones
window.cargarAudioPersonalizado = cargarAudioPersonalizado;
window.resetearAudioPorDefecto = resetearAudioPorDefecto;
window.probarSonido = probarSonido;

// AÑADIR ESTA FUNCIÓN NUEVA:
function obtenerRutinaCompleta() {
  const rutinaActiva = obtenerRutinaActiva();

  // Siempre leer de localStorage (base o personalizada)
  const rutinaData = loadRutinaUsuario(rutinaActiva);

  if (!rutinaData || !rutinaData.dias || rutinaData.dias.length === 0) {
    // Fallback a la hardcodeada si algo falla
    return rutina;
  }

  const rutinaConvertida = {};
  rutinaData.dias.forEach((dia, idx) => {
    const diaKey = rutinaActiva === RUTINA_BASE_KEY
      ? `dia_base_${idx}`
      : `dia_personalizado_${idx}`;

    rutinaConvertida[diaKey] = {
      nombre: dia.nombre,
      ejercicios: dia.ejercicios,
      tieneCronometro: dia.tieneCronometro || false,
      tieneTimer: dia.tieneTimer !== false
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
  
  // Marcar para sincronización
  if (typeof markDirty === 'function' && userState?.uid) {
    markDirty();
  }
}

// ← AÑADIR AQUÍ:
function recargarConfig() {
  config = JSON.parse(localStorage.getItem("config")) || {
    pesos: {},
    ejerciciosExtra: {}
  };
  console.log('✅ Config recargado desde localStorage');
}

window.recargarConfig = recargarConfig; // ← Exportar globalmente

// ✅ AÑADIR ESTA FUNCIÓN DE MIGRACIÓN:
function migrarPesosAntiguos() {
  // Mapeo de keys antiguas a nuevas
  const migracion = {
    'torso_fuerza': 'Día 1 – Torso Fuerza',
    'pierna_fuerza': 'Día 2 – Pierna Fuerza',
    'torso_hipertrofia': 'Día 3 – Torso Hipertrofia',
    'pierna_hipertrofia': 'Día 4 – Pierna Hipertrofia',
    'potencia': 'Día 5 – Potencia'
  };
  
  let huboMigracion = false;
  const nuevoPesos = { ...config.pesos };
  
  // Buscar pesos con formato antiguo
  Object.keys(config.pesos).forEach(key => {
    // Si la key contiene un nombre antiguo
    Object.keys(migracion).forEach(viejoNombre => {
      if (key.startsWith(viejoNombre + '_')) {
        // Extraer el nombre del ejercicio
        const nombreEjercicio = key.substring(viejoNombre.length + 1);
        
        // Crear nueva key
        const nuevaKey = `${migracion[viejoNombre]}_${nombreEjercicio}`;
        
        // Migrar si no existe ya
        if (!nuevoPesos[nuevaKey]) {
          nuevoPesos[nuevaKey] = config.pesos[key];
          huboMigracion = true;
          console.log(`📦 Migrando: ${key} → ${nuevaKey}`);
        }
      }
    });
  });
  
  if (huboMigracion) {
    config.pesos = nuevoPesos;
    guardarConfig();
    console.log('✅ Pesos migrados al nuevo formato');
  }
}

// Ejecutar migración al cargar
migrarPesosAntiguos();

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

  // Ocultar TODAS las pantallas
  document.getElementById("menu").classList.add("oculto");
  document.getElementById("pantalla-historial").classList.add("oculto");
  document.getElementById("pantalla-detalle").classList.add("oculto");
  document.getElementById("pantalla-medidas").classList.add("oculto");
  document.getElementById("pantalla-audio").classList.add("oculto");
  document.getElementById("pantalla-perfil").classList.add("oculto");
  document.getElementById("pantalla-editor").classList.add("oculto");
  
  // Mostrar solo pantalla-dia
  document.getElementById("pantalla-dia").classList.remove("oculto");
  
  // Obtener rutina actual UNA SOLA VEZ
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
  renderBotonesUltimaSesion();

  // Configuración dinámica de HIT/Timer
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
    // Rutina base: leer tieneCronometro del día
    const rutinaBase = loadRutinaUsuario(RUTINA_BASE_KEY);
    if (rutinaBase && rutinaBase.dias) {
      const match = diaKey.match(/dia_base_(\d+)/);
      if (match) {
        const diaIndex = parseInt(match[1]);
        const diaConfig = rutinaBase.dias[diaIndex];
        if (diaConfig) {
          mostrarCronometro = diaConfig.tieneCronometro || false;
          mostrarTimer = diaConfig.tieneTimer !== false;
        }
      }
    }
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
  
 const nombreDia = rutinaActual[diaActual].nombre;
const base = rutinaActual[diaActual].ejercicios || [];
const extra = config.ejerciciosExtra[nombreDia] || []; // ← Usar nombreDia

  ejerciciosDia = [...base, ...extra].map(ej => {
    const key = `${nombreDia}_${ej.nombre}`;
    
    return {
      nombre: ej.nombre,
      series: ej.series,
      repsMin: ej.repsMin,
      repsMax: ej.alFallo ? 30 : ej.repsMax,
      peso: ej.alFallo ? 0 : (parseFloat(config.pesos[key]) || parseFloat(ej.peso) || 0),
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
        <input type="number" step="0.1" value="${ej.peso}" onchange="actualizarPesoBase(${i}, '${ej.nombre}', this.value)">

        <p>Objetivo: ${ej.series} × ${ej.repsMin}-${ej.repsMax}</p>

        <div class="series">${seriesHTML}</div>

        <label>Incremento (kg):</label>
        <input type="number" step="0.1" id="inc-${i}" placeholder="2" value="${ej.incremento}" onchange="actualizarIncremento(${i}, this.value)">

<label>
  <input type="checkbox" id="noprog-${i}" ${ej.noProgresar ? "checked" : ""} onchange="actualizarNoProgresar(${i}, this.checked)">
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
  const rutinaActual = obtenerRutinaCompleta();
  const nombreDia = rutinaActual[diaActual]?.nombre || diaActual;
  const key = `${nombreDia}_${nombre}`;
  config.pesos[key] = parseFloat(valor) || 0;
  guardarConfig();
}

// ✅ FUNCIONES DE ACTUALIZACIÓN
window.actualizarPesoBase = function(ejercicioIndex, nombre, valor) {
  // Actualizar en memoria
  ejerciciosDia[ejercicioIndex].peso = parseFloat(valor) || 0;
  
  // Guardar en config
  guardarPesoBase(nombre, valor);
  
  console.log(`✅ Peso actualizado: ${nombre} = ${valor}kg`);
};

window.actualizarIncremento = function(ejercicioIndex, valor) {
  ejerciciosDia[ejercicioIndex].incremento = parseFloat(valor) || 0;
  guardarEstadoApp();
};

window.actualizarNoProgresar = function(ejercicioIndex, checked) {
  ejerciciosDia[ejercicioIndex].noProgresar = checked;
  guardarEstadoApp();
};

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
  rutinaId: obtenerRutinaActiva(), // ← AÑADIR
  dia: rutinaActual[diaActual]?.nombre || "Día desconocido",
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
  // Usar parseFloat y redondear a 2 decimales
  ej.peso = parseFloat((ej.peso + ej.incremento).toFixed(2));
  guardarPesoBase(ej.nombre, ej.peso);
  huboProgresion = true;
  detallesProgreso.push(`${ej.nombre}: PROGRESO +${ej.incremento}kg → ${ej.peso}kg`);
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
  document.getElementById("pantalla-medidas").classList.add("oculto");
  document.getElementById("pantalla-audio").classList.add("oculto"); // ← AÑADIR
  document.getElementById("pantalla-perfil").classList.add("oculto"); // ← AÑADIR
  document.getElementById("pantalla-editor").classList.add("oculto"); // ← AÑADIR

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
    <div class="botones-historial">
      <button onclick="verDetalle(${historial.length - 1 - i})">
        👁️ Ver detalles
      </button>
      <button class="btn-borrar" onclick="borrarSesion(${historial.length - 1 - i})">
        🗑️ Borrar
      </button>
    </div>
  </div>
`;
  });
}

function volverHistorial() {
  history.pushState({ pantalla: 'historial' }, "");

  document.getElementById("pantalla-detalle").classList.add("oculto");
  document.getElementById("pantalla-dia").classList.add("oculto");
  document.getElementById("pantalla-medidas").classList.add("oculto");
  document.getElementById("pantalla-audio").classList.add("oculto"); // ← AÑADIR
  document.getElementById("pantalla-perfil").classList.add("oculto"); // ← AÑADIR
  document.getElementById("pantalla-editor").classList.add("oculto"); // ← AÑADIR
  
  document.getElementById("pantalla-historial").classList.remove("oculto");
}

function verDetalle(index) {
  guardarEstadoApp();
  history.pushState({ pantalla: 'detalle', index }, "");

  const historial = JSON.parse(localStorage.getItem("historial")) || [];
  const s = historial[index];
  if (!s) return;

  document.getElementById("pantalla-historial").classList.add("oculto");
  document.getElementById("pantalla-dia").classList.add("oculto");
  document.getElementById("pantalla-medidas").classList.add("oculto");
  document.getElementById("pantalla-audio").classList.add("oculto"); // ← AÑADIR
  document.getElementById("pantalla-perfil").classList.add("oculto"); // ← AÑADIR
  document.getElementById("pantalla-editor").classList.add("oculto"); // ← AÑADIR
  
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
 * BORRAR HISTORIAL
 *************************/
function borrarTodoHistorial() {
  if (!confirm("¿Borrar todo el historial?")) return;
  localStorage.removeItem("historial");
  alert("Historial eliminado");
}

// ✅ AÑADIR ESTA FUNCIÓN:
window.borrarSesion = function(index) {
  const historial = JSON.parse(localStorage.getItem("historial")) || [];
  const sesion = historial[index];
  
  if (!sesion) return;
  
  const fecha = new Date(sesion.fecha).toLocaleString();
  const confirmMsg = `¿Borrar sesión del ${fecha}?\n\n${sesion.dia}`;
  
  if (!confirm(confirmMsg)) return;
  
  // Eliminar sesión
  historial.splice(index, 1);
  localStorage.setItem("historial", JSON.stringify(historial));
  
  // Recargar historial
  abrirHistorial();
  
  alert("✅ Sesión eliminada");
};

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
  document.getElementById("pantalla-audio").classList.add("oculto"); // ← AÑADIR
  document.getElementById("pantalla-perfil").classList.add("oculto"); // ← AÑADIR
  document.getElementById("pantalla-editor").classList.add("oculto"); // ← AÑADIR

  document.getElementById("pantalla-medidas").classList.remove("oculto");

  cargarMedidas();
}

function abrirConfigAudio() {
  cerrarSidebar();
  guardarEstadoApp();
  history.pushState({}, "");

  document.getElementById("menu").classList.add("oculto");
  document.getElementById("pantalla-dia").classList.add("oculto");
  document.getElementById("pantalla-historial").classList.add("oculto");
  document.getElementById("pantalla-detalle").classList.add("oculto");
  document.getElementById("pantalla-medidas").classList.add("oculto");
  document.getElementById("pantalla-perfil").classList.add("oculto");

  document.getElementById("pantalla-audio").classList.remove("oculto");
  
  // Actualizar nombre del audio actual
  const nombreActual = audioPersonalizadoNombre || 'Beep (predeterminado)';
  actualizarNombreAudio(nombreActual);
}

window.abrirConfigAudio = abrirConfigAudio;

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

async function forzarActualizacion() {
  const confirmar = confirm(
    '⚠️ Esto limpiará la caché y recargará la app.\n\n' +
    'Tus datos locales (entrenamientos, sesión) NO se perderán.\n\n' +
    '¿Continuar?'
  );
  
  if (!confirmar) return;
  
  try {
    // 1. Enviar mensaje al SW para limpiar caché
    if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'CLEAR_CACHE'
      });
    }
    
    // 2. Desregistrar Service Worker
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (let registration of registrations) {
        await registration.unregister();
      }
    }
    
    // 3. Limpiar cachés del navegador
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map(name => caches.delete(name)));
    }
    
    // 4. Recargar
    alert('✅ Caché limpiado. La app se recargará.');
    window.location.reload(true);
    
  } catch (error) {
    console.error('Error:', error);
    alert('⚠️ Error al actualizar. Cierra y vuelve a abrir la app.');
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
  document.getElementById("pantalla-audio").classList.add("oculto"); // ✅ YA DEBE ESTAR
  document.getElementById("pantalla-editor").classList.add("oculto"); // ← AÑADIR
  document.getElementById("menu").classList.remove("oculto");
  
  cerrarSidebarRight();
  
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

// Toggle sidebar derecho (temporizador)
function toggleSidebarRight() {
  const sidebar = document.getElementById("sidebar-right");
  const overlay = document.getElementById("sidebar-right-overlay");
  
  if (!sidebar || !overlay) return;
  
  const isOpen = sidebar.classList.contains("sidebar-right-open");
  
  if (isOpen) {
    sidebar.classList.remove("sidebar-right-open");
    sidebar.classList.add("sidebar-right-closed");
    overlay.classList.add("oculto");
  } else {
    sidebar.classList.remove("sidebar-right-closed");
    sidebar.classList.add("sidebar-right-open");
    overlay.classList.remove("oculto");
  }
}

window.toggleSidebarRight = toggleSidebarRight;

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

// Cerrar sidebar derecho
function cerrarSidebarRight() {
  const sidebar = document.getElementById("sidebar-right");
  const overlay = document.getElementById("sidebar-right-overlay");
  
  if (sidebar && overlay) {
    sidebar.classList.remove("sidebar-right-open");
    sidebar.classList.add("sidebar-right-closed");
    overlay.classList.add("oculto");
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  // 👇 AÑADIR ESTO AL INICIO
  inicializarRutinaBase();

  // Debug de audio guardado
  const audioGuardado = localStorage.getItem('audioPersonalizado');
  const nombreGuardado = localStorage.getItem('audioPersonalizadoNombre');
  console.log('🔍 Audio en localStorage:', {
    existe: !!audioGuardado,
    nombre: nombreGuardado,
    tamaño: audioGuardado ? (audioGuardado.length / 1024).toFixed(2) + 'KB' : 'N/A'
  });

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
 // ✅ AÑADIR ESTO - Renderizar botón de última sesión
renderBotonesUltimaSesion();

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

window.addEventListener('offline', () => {
  isOnline = false;
  console.log('⚠️ Sin conexión - Modo offline');
  // Sin alert - funciona silenciosamente offline
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
window.volverHistorial = volverHistorial;
window.addEventListener("cambio-rutina", (e) => {
  console.log("Rutina cambiada a:", e.detail.rutinaId);
  renderizarBotonesDias(); // ← AÑADIR ESTA LÍNEA
  if (diaActual) {
    cargarEjerciciosDia();
    renderDia();
  }
});

// Sobrescribir para actualizar selector
window.volverMenu = function() {
  // Guardar estado para historial del navegador
  history.pushState({ pantalla: 'menu' }, "");
  
  // Ocultar TODAS las pantallas
  document.getElementById("pantalla-auth").classList.add("oculto");
  document.getElementById("pantalla-perfil").classList.add("oculto");
  document.getElementById("pantalla-dia").classList.add("oculto");
  document.getElementById("pantalla-historial").classList.add("oculto");
  document.getElementById("pantalla-detalle").classList.add("oculto");
  document.getElementById("pantalla-medidas").classList.add("oculto");
  document.getElementById("pantalla-audio").classList.add("oculto"); // ← AÑADIR
  document.getElementById("pantalla-editor").classList.add("oculto"); // ← AÑADIR
  
  // Mostrar menú
  document.getElementById("menu").classList.remove("oculto");
  
  // Cerrar sidebars
  cerrarSidebarRight(); // ← AÑADIR
  
  // Actualizar selector por si hay cambios
  renderizarSelectorRutinas();
  
  guardarEstadoApp();
};

// ========================================
// SWIPE GESTURES PARA SIDEBARS (IZQUIERDO Y DERECHO)
// ========================================
let touchStartX = 0;
let touchStartY = 0;
let touchEndX = 0;
let touchEndY = 0;
let isSwiping = false;
let swipeTarget = null; // 'left' o 'right'

const SWIPE_THRESHOLD = 100; // Píxeles mínimos para considerar swipe
const EDGE_ZONE = 30; // Zona del borde donde funciona el swipe (píxeles)

// ========================================
// DETECTAR INICIO DEL SWIPE
// ========================================
document.addEventListener('touchstart', (e) => {
  touchStartX = e.changedTouches[0].screenX;
  touchStartY = e.changedTouches[0].screenY;
  
  const screenWidth = window.innerWidth;
  
  // Detectar swipe desde BORDE IZQUIERDO (para sidebar izquierdo)
  if (touchStartX <= EDGE_ZONE) {
    isSwiping = true;
    swipeTarget = 'left';
  }
  
  // Detectar swipe desde BORDE DERECHO (para sidebar derecho)
  if (touchStartX >= screenWidth - EDGE_ZONE) {
    isSwiping = true;
    swipeTarget = 'right';
  }
}, { passive: true });

// ========================================
// DETECTAR MOVIMIENTO DEL SWIPE
// ========================================
document.addEventListener('touchmove', (e) => {
  if (!isSwiping) return;
  
  touchEndX = e.changedTouches[0].screenX;
  touchEndY = e.changedTouches[0].screenY;
  
  const deltaX = touchEndX - touchStartX;
  const deltaY = Math.abs(touchEndY - touchStartY);
  
  // Solo procesar si es más horizontal que vertical
  if (deltaY > 100) return;
  
  // SIDEBAR IZQUIERDO - Swipe hacia la DERECHA
  if (swipeTarget === 'left' && deltaX > 50) {
    const sidebar = document.getElementById("sidebar");
    const overlay = document.getElementById("sidebar-overlay");
    
    if (sidebar && !sidebar.classList.contains("sidebar-open")) {
      sidebar.classList.remove("sidebar-closed");
      sidebar.classList.add("sidebar-open");
      if (overlay) overlay.classList.remove("oculto");
    }
  }
  
  // SIDEBAR DERECHO - Swipe hacia la IZQUIERDA
  if (swipeTarget === 'right' && deltaX < -50) {
    const sidebar = document.getElementById("sidebar-right");
    const overlay = document.getElementById("sidebar-right-overlay");
    
    if (sidebar && !sidebar.classList.contains("sidebar-right-open")) {
      sidebar.classList.remove("sidebar-right-closed");
      sidebar.classList.add("sidebar-right-open");
      if (overlay) overlay.classList.remove("oculto");
    }
  }
}, { passive: true });

// ========================================
// FINALIZAR SWIPE
// ========================================
document.addEventListener('touchend', (e) => {
  if (!isSwiping) return;
  
  touchEndX = e.changedTouches[0].screenX;
  touchEndY = e.changedTouches[0].screenY;
  
  const deltaX = touchEndX - touchStartX;
  const deltaY = Math.abs(touchEndY - touchStartY);
  
  // Solo procesar si es swipe horizontal
  if (deltaY < 100) {
    
    // SIDEBAR IZQUIERDO - Abrir con swipe derecha
    if (swipeTarget === 'left' && deltaX > SWIPE_THRESHOLD) {
      const sidebar = document.getElementById("sidebar");
      const overlay = document.getElementById("sidebar-overlay");
      
      if (sidebar && overlay) {
        sidebar.classList.remove("sidebar-closed");
        sidebar.classList.add("sidebar-open");
        overlay.classList.remove("oculto");
      }
    }
    
    // SIDEBAR DERECHO - Abrir con swipe izquierda
    if (swipeTarget === 'right' && deltaX < -SWIPE_THRESHOLD) {
      const sidebar = document.getElementById("sidebar-right");
      const overlay = document.getElementById("sidebar-right-overlay");
      
      if (sidebar && overlay) {
        sidebar.classList.remove("sidebar-right-closed");
        sidebar.classList.add("sidebar-right-open");
        overlay.classList.remove("oculto");
      }
    }
  }
  
  isSwiping = false;
  swipeTarget = null;
}, { passive: true });

// ========================================
// CERRAR SIDEBAR IZQUIERDO CON SWIPE HACIA LA IZQUIERDA
// ========================================
document.getElementById("sidebar")?.addEventListener('touchstart', (e) => {
  if (!document.getElementById("sidebar").classList.contains("sidebar-open")) return;
  
  touchStartX = e.changedTouches[0].screenX;
  isSwiping = true;
  swipeTarget = 'left-close';
}, { passive: true });

document.getElementById("sidebar")?.addEventListener('touchend', (e) => {
  if (!isSwiping || swipeTarget !== 'left-close') return;
  
  touchEndX = e.changedTouches[0].screenX;
  const deltaX = touchEndX - touchStartX;
  
  // Swipe hacia la IZQUIERDA para cerrar
  if (deltaX < -SWIPE_THRESHOLD) {
    toggleSidebar();
  }
  
  isSwiping = false;
  swipeTarget = null;
}, { passive: true });

// ========================================
// CERRAR SIDEBAR DERECHO CON SWIPE HACIA LA DERECHA
// ========================================
document.getElementById("sidebar-right")?.addEventListener('touchstart', (e) => {
  if (!document.getElementById("sidebar-right").classList.contains("sidebar-right-open")) return;
  
  touchStartX = e.changedTouches[0].screenX;
  isSwiping = true;
  swipeTarget = 'right-close';
}, { passive: true });

document.getElementById("sidebar-right")?.addEventListener('touchend', (e) => {
  if (!isSwiping || swipeTarget !== 'right-close') return;
  
  touchEndX = e.changedTouches[0].screenX;
  const deltaX = touchEndX - touchStartX;
  
  // Swipe hacia la DERECHA para cerrar
  if (deltaX > SWIPE_THRESHOLD) {
    toggleSidebarRight();
  }
  
  isSwiping = false;
  swipeTarget = null;
}, { passive: true });

// ========================================
// DETECCIÓN AUTOMÁTICA DE ACTUALIZACIONES
// ========================================

let swRegistration = null;

// Registrar Service Worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js')
    .then(registration => {
      swRegistration = registration;
      console.log('✅ Service Worker registrado');
      
      // Verificar actualizaciones cada 60 segundos
      setInterval(() => {
        registration.update();
      }, 60000);
      
      // Detectar cuando hay nueva versión instalándose
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed') {
            if (navigator.serviceWorker.controller) {
              // Hay nueva versión disponible
              console.log('🎉 Nueva versión detectada');
              
              // Mostrar notificación al usuario
              if (confirm('🎉 Nueva versión disponible. ¿Actualizar ahora?')) {
                newWorker.postMessage({ type: 'SKIP_WAITING' });
                window.location.reload();
              }
            } else {
              // Primera instalación
              console.log('✅ App lista para uso offline');
            }
          }
        });
      });
    })
    .catch(err => {
      console.error('❌ Error registrando SW:', err);
    });
}

// Escuchar mensajes del Service Worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('message', event => {
    if (event.data && event.data.type === 'SW_UPDATED') {
      console.log('✅ Service Worker actualizado a versión:', event.data.version);
      
      // La app ya se recargó, solo log
    }
    
    if (event.data && event.data.type === 'SYNC_DATA') {
      console.log('🔄 SW solicita sincronización');
      
      // Sincronizar si hay sesión activa
      if (userState.uid && typeof syncToCloud === 'function') {
        syncToCloud().catch(e => console.log('Error sync:', e));
      }
    }
  });
}

// Detectar cuando vuelve la conexión
window.addEventListener('online', async () => {
  console.log('🌐 Conexión restaurada');
  
  // 1. Verificar si hay actualizaciones
  if (swRegistration) {
    await swRegistration.update();
  }
  
  // 2. Sincronizar datos
  if (userState.uid && typeof syncToCloud === 'function') {
    try {
      await syncToCloud();
      console.log('✅ Datos sincronizados');
    } catch (error) {
      console.log('⚠️ Error sincronizando:', error);
    }
  }
});

// ========================================
// VER ÚLTIMA SESIÓN COMO GUÍA
// ========================================

// Renderizar botones de última sesión
function renderBotonesUltimaSesion() {
  console.log('🔍 Llamando renderBotonesUltimaSesion'); // Debug
  
  // Buscar el contenedor de la pantalla del día
  const pantallaDia = document.getElementById("pantalla-dia");
  if (!pantallaDia) {
    console.log('❌ No se encontró pantalla-dia');
    return;
  }
  
  // Buscar el contenedor de ejercicios
  const contenedor = document.getElementById("contenido");
  if (!contenedor) {
    console.log('❌ No se encontró contenido');
    return;
  }
  
  const ultimaSesion = obtenerUltimaSesion();
  console.log('🔍 Última sesión:', ultimaSesion);
  
  if (!ultimaSesion) {
    console.log('❌ No hay sesión anterior');
    return;
  }
  
  // Verificar si ya existe el botón
  const botonExistente = document.getElementById('btn-toggle-guia');
  if (botonExistente) {
    console.log('✓ Botón ya existe, no duplicar');
    return;
  }
  
  // Crear botón toggle
  const botonHTML = `
    <div class="botones-ultima-sesion">
      <button onclick="toggleGuiaUltimaSesion()" id="btn-toggle-guia" class="btn-secundario">
        👁️ Mostrar última sesión como guía
      </button>
    </div>
  `;
  
  console.log('✅ Insertando botón');
  contenedor.insertAdjacentHTML('afterbegin', botonHTML);
}

function obtenerUltimaSesion() {
  const historial = JSON.parse(localStorage.getItem("historial")) || [];
  const rutinaActual = obtenerRutinaCompleta();
  const nombreDiaActual = rutinaActual[diaActual]?.nombre;
  const rutinaActiva = obtenerRutinaActiva();
  
  if (!nombreDiaActual) return null;
  
  // Filtrar por rutina Y día
  const sesionesDelDia = historial
    .filter(s => {
      // Si la sesión tiene rutinaId, comparar
      if (s.rutinaId) {
        return s.rutinaId === rutinaActiva && s.dia === nombreDiaActual;
      }
      // Sesiones viejas sin rutinaId: solo comparar por nombre
      return s.dia === nombreDiaActual;
    })
    .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
  
  return sesionesDelDia[0] || null;
}

// Toggle mostrar/ocultar guía
window.toggleGuiaUltimaSesion = function() {
  const guiasActuales = document.querySelectorAll('.guia-ultima-sesion');
  const btn = document.getElementById('btn-toggle-guia');
  
  if (guiasActuales.length > 0) {
    // Ocultar guías
    guiasActuales.forEach(g => g.remove());
    btn.textContent = '👁️ Mostrar última sesión como guía';
    btn.classList.remove('activo');
  } else {
    // Mostrar guías
    mostrarGuiaUltimaSesion();
    btn.textContent = '🚫 Ocultar guía';
    btn.classList.add('activo');
  }
};

// Mostrar guía de última sesión
function mostrarGuiaUltimaSesion() {
  const ultimaSesion = obtenerUltimaSesion();
  if (!ultimaSesion) return;
  
  const fecha = new Date(ultimaSesion.fecha).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  });
  
  // Para cada ejercicio, añadir la guía
  ejerciciosDia.forEach((ej, ejIndex) => {
    // Buscar datos del ejercicio en la última sesión
    const ejAnterior = ultimaSesion.ejercicios.find(e => e.nombre === ej.nombre);
    
    if (!ejAnterior) return; // No hay datos anteriores de este ejercicio
    
    // Buscar el contenedor del ejercicio en el DOM
    const ejercicioDiv = document.querySelectorAll('.ejercicio')[ejIndex];
    if (!ejercicioDiv) return;
    
    // Crear elemento de guía
    const guiaHTML = `
      <div class="guia-ultima-sesion">
        <span class="guia-fecha">📅 ${fecha}</span>
        <div class="guia-detalles">
          <span class="guia-peso">Peso: ${ejAnterior.peso} kg</span>
          <span class="guia-reps">Reps: ${ejAnterior.reps.filter(r => r !== "").join(" - ")}</span>
        </div>
      </div>
    `;
    
    // Insertar después del título del ejercicio
    const titulo = ejercicioDiv.querySelector('h3');
    if (titulo) {
      titulo.insertAdjacentHTML('afterend', guiaHTML);
    }
  });
}


