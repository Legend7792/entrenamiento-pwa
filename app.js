/*************************
 * DATOS DE LA RUTINA (BASE - NO SE MODIFICA)
 *************************/
const sonidoTimer = new Audio("beep.mp3");
sonidoTimer.preload = "auto";
sonidoTimer.loop = true; // para que suene continuo hasta que lo pares

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
      { nombre: "Clean", peso: 40, series: 5, repsMin: 3, repsMax: 3 },
      { nombre: "HIIT", peso: 0, series: 1, repsMin: 8, repsMax: 12 } // min y max en minutos
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

// Mostrar tiempo en pantalla
function mostrarTiempo() {
  const m = Math.floor(tiempoRestante / 60);
  const s = tiempoRestante % 60;
  document.getElementById("tiempo").innerText = `${m}:${s.toString().padStart(2, "0")}`;
}

// Iniciar temporizador (segundo plano)
function iniciarTemporizador(min = 0, seg = 0) {
  if (timerID) return;

  tiempoRestante = min * 60 + seg;
  tiempoFinal = Date.now() + tiempoRestante * 1000;

  timerID = setInterval(() => {
    const ahora = Date.now();
    tiempoRestante = Math.max(0, Math.round((tiempoFinal - ahora) / 1000));
    mostrarTiempo();

    if (tiempoRestante <= 0) {
      clearInterval(timerID);
      timerID = null;
      sonidoTimer.currentTime = 0;
      sonidoTimer.play();
    }
  }, 200); // actualiza cada 0.2s
}

// Pausar temporizador
function pausarTemporizador() {
  clearInterval(timerID);
  timerID = null;
  sonidoTimer.pause();
  sonidoTimer.currentTime = 0;
}

// Resetear temporizador
function resetTemporizador() {
  pausarTemporizador();
  tiempoRestante = 0;
  mostrarTiempo();
}

// Inicializar la lista de timers al cargar la app
document.addEventListener("DOMContentLoaded", () => {
  renderTimers();
});

/*************************
 * NAVEGACIÓN
 *************************/
function abrirDia(diaKey) {
  diaActual = diaKey;
  history.pushState({}, "");

  document.getElementById("menu").classList.add("oculto");
  document.getElementById("pantalla-dia").classList.remove("oculto");
  document.getElementById("pantalla-historial").classList.add("oculto");
  document.getElementById("pantalla-detalle").classList.add("oculto");

  document.getElementById("titulo-dia").innerText = rutina[diaKey].nombre;

  cargarEjerciciosDia();
  resetTemporizador();
  renderDia();
}

function volverMenu() {
  document.getElementById("pantalla-dia").classList.add("oculto");
  document.getElementById("pantalla-historial").classList.add("oculto");
  document.getElementById("pantalla-detalle").classList.add("oculto");
  document.getElementById("pantalla-medidas").classList.add("oculto");

  document.getElementById("menu").classList.remove("oculto");
}

/*************************
 * CARGAR EJERCICIOS DEL DÍA
 *************************/
function cargarEjerciciosDia() {
  const base = rutina[diaActual].ejercicios || [];
  const extra = config.ejerciciosExtra[diaActual] || [];

  ejerciciosDia = [...base, ...extra].map(ej => {
    const key = `${diaActual}_${ej.nombre}`;
    return {
      nombre: ej.nombre,
      series: ej.series,
      repsMin: ej.repsMin,
      repsMax: ej.repsMax,
      peso: config.pesos[key] ?? ej.peso,
      reps: Array(ej.series).fill(""), // <-- vacío en vez de 0
      incremento: 2,
      noProgresar: false
    };
  });
}

/*************************
 * RENDERIZAR DÍA
 *************************/
function renderDia() {
  const cont = document.getElementById("contenido");
  cont.innerHTML = "";

  ejerciciosDia.forEach((ej, i) => {
    let seriesHTML = "";
    for (let s = 0; s < ej.series; s++) {
      seriesHTML += `<input type="number" id="rep-${i}-${s}" placeholder="S${s + 1}" value="${ej.reps[s]}" 
        onchange="ejerciciosDia[${i}].reps[${s}]=this.value === '' ? '' : Number(this.value)">`;
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

/*************************
 * GUARDAR PESO BASE
 *************************/
function guardarPesoBase(nombre, valor) {
  const key = `${diaActual}_${nombre}`;
  config.pesos[key] = Number(valor);
  guardarConfig();
}

/*************************
 * FINALIZAR SESIÓN CORREGIDO
 *************************/
function finalizarDia() {
  if (!diaActual) return;

  let huboProgresion = false;
  let detallesProgreso = [];

  // Crear objeto de sesión con fecha completa
  const sesion = {
    fecha: new Date().toISOString(), // fecha + hora
    dia: rutina[diaActual].nombre,
    tiempo: tiempoBase - tiempoRestante,
    ejercicios: ejerciciosDia.map(ej => ({
      nombre: ej.nombre,
      peso: ej.peso,
      reps: [...ej.reps]
    }))
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
  historial.push(sesion); // no filtrar por fecha
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

/*************************
 * HISTORIAL CORREGIDO
 *************************/
function abrirHistorial() {
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

  historial.forEach((s, i) => {
    cont.innerHTML += `
      <div class="historial-item">
        <p>${new Date(s.fecha).toLocaleString()} — ${s.dia}</p>
        <button onclick="verDetalle(${i})">Ver detalles</button>
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
  // Guardar el estado actual en el historial del navegador
  history.pushState({ pantalla: 'detalle', index }, "");

  const historial = JSON.parse(localStorage.getItem("historial")) || [];
  const s = historial[index];
  if (!s) return;

  document.getElementById("pantalla-historial").classList.add("oculto");
  document.getElementById("pantalla-dia").classList.add("oculto");
  document.getElementById("pantalla-detalle").classList.remove("oculto");

  const cont = document.getElementById("detalle-sesion");
  cont.innerHTML = `<p>${s.fecha} — ${s.dia} (${formatearTiempo(s.tiempo)})</p>`;
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

  if (!rutina[diaKey]) { alert("Día inválido"); return; }
  if (!nombre || series <= 0 || repsMin <= 0 || repsMax <= 0) { alert("Datos incompletos"); return; }

  const nuevo = { nombre, peso, series, repsMin, repsMax };
  if (!config.ejerciciosExtra[diaKey]) config.ejerciciosExtra[diaKey] = [];
  config.ejerciciosExtra[diaKey].push(nuevo);
  guardarConfig();

  if (diaActual === diaKey) cargarEjerciciosDia(), renderDia();

  document.getElementById("nuevo-nombre").value = "";
  document.getElementById("nuevo-peso").value = "";
  document.getElementById("nuevo-series").value = "";
  document.getElementById("nuevo-reps-min").value = "";
  document.getElementById("nuevo-reps-max").value = "";

  alert(`Ejercicio añadido a ${rutina[diaKey].nombre}`);
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
  if (!document.getElementById("pantalla-detalle").classList.contains("oculto")) {
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
