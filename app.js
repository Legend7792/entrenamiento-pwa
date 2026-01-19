/*************************
 * DATOS DE LA RUTINA (BASE - NO SE MODIFICA)
 *************************/
const rutina = {
  torso_fuerza: {
    nombre: "Día 1 – Torso Fuerza",
    ejercicios: [
      { nombre: "Press banca", peso: 80, series: 4, repsMin: 3, repsMax: 5 },
      { nombre: "Press militar", peso: 50, series: 4, repsMin: 3, repsMax: 5 },
      { nombre: "Remo con barra", peso: 70, series: 4, repsMin: 3, repsMax: 5 }
    ]
  },
  pierna_fuerza: {
    nombre: "Día 2 – Pierna Fuerza",
    ejercicios: [
      { nombre: "Sentadilla trasera", peso: 100, series: 4, repsMin: 3, repsMax: 5 }
    ]
  },
  torso_hipertrofia: { nombre: "Día 3 – Torso Hipertrofia", ejercicios: [] },
  pierna_hipertrofia: { nombre: "Día 4 – Pierna Hipertrofia", ejercicios: [] },
  potencia: { nombre: "Día 5 – Potencia", ejercicios: [] }
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
 * TEMPORIZADOR
 *************************/
let tiempoBase = 0; // segundos
let tiempoRestante = 0;
let timerID = null;

function configurarTemporizador(min, seg) {
  tiempoBase = min * 60 + seg;
  tiempoRestante = tiempoBase;
  mostrarTiempo();
}

function mostrarTiempo() {
  const m = Math.floor(tiempoRestante / 60);
  const s = tiempoRestante % 60;
  document.getElementById("tiempo").innerText =
    `${m}:${s.toString().padStart(2, "0")}`;
}

function iniciarTemporizador() {
  if (timerID || tiempoRestante <= 0) return;
  timerID = setInterval(() => {
    tiempoRestante--;
    mostrarTiempo();
    if (tiempoRestante <= 0) {
      clearInterval(timerID);
      timerID = null;
      alert("Tiempo terminado");
    }
  }, 1000);
}

function pausarTemporizador() {
  clearInterval(timerID);
  timerID = null;
}

function resetTemporizador() {
  pausarTemporizador();
  tiempoRestante = tiempoBase;
  mostrarTiempo();
}

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
    if (completo && !ej.noProgresar) {
      ej.peso += ej.incremento;
      guardarPesoBase(ej.nombre, ej.peso);
      huboProgresion = true;
      detallesProgreso.push(`${ej.nombre}: PROGRESO +${ej.incremento}kg`);
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
  if (!document.getElementById("pantalla-detalle").classList.contains("oculto")) volverHistorial();
  else if (!document.getElementById("pantalla-historial").classList.contains("oculto")) volverMenu();
  else if (!document.getElementById("pantalla-dia").classList.contains("oculto")) volverMenu();
});

/*************************
 * UTILIDADES
 *************************/
function formatearTiempo(segundos) {
  const m = Math.floor(segundos / 60);
  const s = segundos % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
