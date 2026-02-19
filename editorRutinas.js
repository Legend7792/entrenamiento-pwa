// editorRutinas.js
import {
  saveRutinaUsuario,
  loadRutinaUsuario,
  getAllRutinasUsuario,
  deleteRutinaUsuario,
  generarIdRutina,
  RUTINA_BASE_ID,
  restaurarRutinaBase,
  moverEjercicioRutina
} from "./rutinaUsuario.js";

import { renderizarSelectorRutinas } from "./selectorRutinas.js";

let rutinaEditando = null;
let rutinaEditandoId = null;
let diaEditando = null;

// ========================================
// ABRIR EDITOR
// ========================================
window.abrirEditorRutinas = function () {
  document.getElementById("menu").classList.add("oculto");
  document.getElementById("pantalla-editor").classList.remove("oculto");
  renderListaRutinas();
};

// ========================================
// LISTA DE RUTINAS
// ========================================
function renderListaRutinas() {
  const contenedor = document.getElementById("contenido-editor");
  const rutinas = getAllRutinasUsuario();

  contenedor.innerHTML = `
    <div class="gestor-rutinas">
      <h3>Mis Rutinas</h3>

      <div class="lista-rutinas">
        ${Object.keys(rutinas).length === 0 ? `
          <p style="text-align:center; color:var(--text-secondary); padding:20px;">
            No tienes rutinas. Crea una abajo.
          </p>
        ` : Object.keys(rutinas).map(id => {
          const r = rutinas[id];
          const esBase = id === RUTINA_BASE_ID;
          return `
            <div class="rutina-card">
              <h4>${esBase ? '📋' : '✏️'} ${r.nombre}</h4>
              <p>${r.dias.length} día(s)</p>
              <div class="acciones-rutina-card">
                <button onclick="editarRutina('${id}')">✏️ Editar</button>
                ${esBase
                  ? `<button onclick="restaurarRutinaBaseBtn()" style="background:orange;">🔄 Restaurar</button>`
                  : `<button class="danger" onclick="borrarRutinaCompleta('${id}')">🗑️ Borrar</button>`
                }
              </div>
            </div>
          `;
        }).join('')}
      </div>

      <button onclick="crearNuevaRutina()">➕ Crear nueva rutina</button>
      <button onclick="volverMenuDesdeEditor()">← Volver al menú</button>
    </div>
  `;
}

// ========================================
// RESTAURAR RUTINA BASE
// ========================================
window.restaurarRutinaBaseBtn = function () {
  const exito = restaurarRutinaBase();
  if (exito) {
    renderizarSelectorRutinas();
    renderListaRutinas();
  }
};

// ========================================
// CREAR NUEVA RUTINA
// ========================================
window.crearNuevaRutina = function () {
  const nombre = prompt("Nombre de la rutina:");
  if (!nombre || !nombre.trim()) return;

  const nuevoId = generarIdRutina();
  saveRutinaUsuario({ nombre: nombre.trim(), dias: [] }, nuevoId);
  editarRutina(nuevoId);
};

// ========================================
// EDITAR RUTINA
// ========================================
window.editarRutina = function (rutinaId) {
  rutinaEditandoId = rutinaId;
  rutinaEditando = loadRutinaUsuario(rutinaId);
  renderEditorRutina();
};

function renderEditorRutina() {
  const contenedor = document.getElementById("contenido-editor");
  const esBase = rutinaEditandoId === RUTINA_BASE_ID;

  contenedor.innerHTML = `
    <div class="editor-header">
      <h3>${rutinaEditando.nombre}</h3>
      ${!esBase ? `<button onclick="cambiarNombreRutina()">✏️ Cambiar nombre</button>` : ''}
      <button onclick="volverListaRutinas()">← Volver a lista</button>
    </div>

    <div class="lista-dias">
      ${rutinaEditando.dias.length === 0 ? `
        <p style="text-align:center; color:var(--text-secondary); padding:20px;">
          No hay días. Añade uno abajo.
        </p>
      ` : rutinaEditando.dias.map((dia, idx) => `
        <div class="dia-card">
          <h4>📅 ${dia.nombre}</h4>
          <p>${dia.ejercicios.length} ejercicio(s)</p>
          <div class="acciones-dia-card">
            <button onclick="editarDia(${idx})">✏️ Editar</button>
            <button class="danger" onclick="borrarDia(${idx})">🗑️ Borrar</button>
          </div>
        </div>
      `).join('')}
    </div>

    <button onclick="añadirNuevoDia()">➕ Añadir día</button>
  `;
}

// ========================================
// CAMBIAR NOMBRE RUTINA
// ========================================
window.cambiarNombreRutina = function () {
  const nuevo = prompt("Nuevo nombre:", rutinaEditando.nombre);
  if (!nuevo || !nuevo.trim()) return;
  rutinaEditando.nombre = nuevo.trim();
  saveRutinaUsuario(rutinaEditando, rutinaEditandoId);
  dispararCambioRutina();
  renderEditorRutina();
};

// ========================================
// BORRAR RUTINA
// ========================================
window.borrarRutinaCompleta = function (rutinaId) {
  const rutina = loadRutinaUsuario(rutinaId);
  if (!confirm(`¿Borrar "${rutina.nombre}"? Esta acción no se puede deshacer.`)) return;

  deleteRutinaUsuario(rutinaId);

  if (localStorage.getItem("rutinaActiva") === rutinaId) {
    localStorage.setItem("rutinaActiva", RUTINA_BASE_ID);
  }

  dispararCambioRutina();
  renderizarSelectorRutinas();
  renderListaRutinas();
};

// ========================================
// DÍAS
// ========================================
window.añadirNuevoDia = function () {
  const nombre = prompt("Nombre del día:") || `Día ${rutinaEditando.dias.length + 1}`;
  rutinaEditando.dias.push({
    nombre: nombre.trim(),
    ejercicios: [],
    tieneTimer: true,
    tieneCronometro: false
  });
  saveRutinaUsuario(rutinaEditando, rutinaEditandoId);
  dispararCambioRutina();
  renderEditorRutina();
};

window.borrarDia = function (index) {
  if (!confirm(`¿Borrar "${rutinaEditando.dias[index].nombre}"?`)) return;
  rutinaEditando.dias.splice(index, 1);
  saveRutinaUsuario(rutinaEditando, rutinaEditandoId);
  dispararCambioRutina();
  renderEditorRutina();
};

window.editarDia = function (index) {
  diaEditando = index;
  renderFormularioDia();
};

// ========================================
// FORMULARIO DE DÍA (CON ORDENAR EJERCICIOS)
// ========================================
function renderFormularioDia() {
  const dia = rutinaEditando.dias[diaEditando];
  const contenedor = document.getElementById("contenido-editor");
  const totalEjercicios = dia.ejercicios.length;

  contenedor.innerHTML = `
    <div class="editor-dia">

      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
        <h3>📅 ${dia.nombre}</h3>
        <button onclick="cambiarNombreDia()">✏️ Nombre</button>
      </div>

      <div class="config-dia" style="margin-bottom:15px;">
        <label>
          <input type="checkbox" id="dia-timer" ${dia.tieneTimer !== false ? 'checked' : ''}
            onchange="toggleTimer(this.checked)" />
          ⏱️ Mostrar temporizador de descanso
        </label>
        <br>
        <label>
          <input type="checkbox" id="dia-cronometro" ${dia.tieneCronometro ? 'checked' : ''}
            onchange="toggleCronometro(this.checked)" />
          ⏲️ Mostrar cronómetro HIT
        </label>
      </div>

      <hr>

      <h4>Ejercicios</h4>
      <div class="lista-ejercicios-editor">
        ${totalEjercicios === 0 ? `
          <p style="text-align:center; color:var(--text-secondary); padding:10px;">
            No hay ejercicios. Añade uno abajo.
          </p>
        ` : dia.ejercicios.map((ej, idx) => `
          <div class="ejercicio-editor-card">
            <div style="display:flex; align-items:center; gap:8px;">

              <div style="display:flex; flex-direction:column; gap:4px;">
                <button
                  onclick="moverEjercicioEditor(${idx}, 'arriba')"
                  ${idx === 0 ? 'disabled style="opacity:0.3;"' : ''}
                  style="padding:4px 8px; font-size:12px;">⬆️</button>
                <button
                  onclick="moverEjercicioEditor(${idx}, 'abajo')"
                  ${idx === totalEjercicios - 1 ? 'disabled style="opacity:0.3;"' : ''}
                  style="padding:4px 8px; font-size:12px;">⬇️</button>
              </div>

              <div style="flex:1;">
                <strong>${ej.nombre}</strong>
                <p style="margin:2px 0; font-size:13px;">
                  ${ej.series} series × ${ej.repsMin}-${ej.repsMax} reps — ${ej.peso}kg
                  ${ej.alFallo ? '<span class="badge">Al fallo</span>' : ''}
                </p>
              </div>

              <button class="danger" onclick="borrarEjercicio(${idx})">🗑️</button>
            </div>
          </div>
        `).join('')}
      </div>

      <hr>

      <h4>➕ Añadir ejercicio</h4>
      <div class="form-ejercicio">
        <input id="ej-nombre" placeholder="Nombre del ejercicio" />
        <div class="form-row">
          <input id="ej-peso" type="number" min="0" placeholder="Peso (kg)" />
          <input id="ej-series" type="number" min="1" placeholder="Series" />
        </div>
        <div class="form-row">
          <input id="ej-reps-min" type="number" min="1" placeholder="Reps mín" />
          <input id="ej-reps-max" type="number" min="1" placeholder="Reps máx" />
        </div>
        <label>
          <input type="checkbox" id="ej-fallo" />
          Al fallo (sin progresión de peso)
        </label>
        <button onclick="añadirEjercicioADia()">➕ Añadir ejercicio</button>
      </div>

      <hr>

      <button onclick="volverListaDias()">← Volver a lista de días</button>
    </div>
  `;
}

// ========================================
// MOVER EJERCICIO ⬆️⬇️
// ========================================
window.moverEjercicioEditor = function (idx, direccion) {
  const exito = moverEjercicioRutina(rutinaEditandoId, diaEditando, idx, direccion);
  if (exito) {
    rutinaEditando = loadRutinaUsuario(rutinaEditandoId);
    renderFormularioDia();
  }
};

// ========================================
// AÑADIR EJERCICIO AL DÍA
// ========================================
window.añadirEjercicioADia = function () {
  const nombre = document.getElementById("ej-nombre").value.trim();
  const pesoVal = document.getElementById("ej-peso").value;
  const seriesVal = document.getElementById("ej-series").value;
  const repsMinVal = document.getElementById("ej-reps-min").value;
  const repsMaxVal = document.getElementById("ej-reps-max").value;
  const alFallo = document.getElementById("ej-fallo").checked;

  if (!nombre || !pesoVal || !seriesVal || !repsMinVal || !repsMaxVal) {
    alert("⚠️ Completa todos los campos");
    return;
  }

  const series = Number(seriesVal);
  const repsMin = Number(repsMinVal);
  const repsMax = Number(repsMaxVal);

  if (series <= 0 || repsMin <= 0 || repsMax <= 0) {
    alert("⚠️ Los valores deben ser mayores que 0");
    return;
  }

  if (repsMin > repsMax) {
    alert("⚠️ Reps mín no puede ser mayor que reps máx");
    return;
  }

  rutinaEditando.dias[diaEditando].ejercicios.push({
    nombre,
    peso: alFallo ? 0 : Number(pesoVal),
    series,
    repsMin,
    repsMax,
    alFallo
  });

  saveRutinaUsuario(rutinaEditando, rutinaEditandoId);
  renderFormularioDia();
};

// ========================================
// BORRAR EJERCICIO
// ========================================
window.borrarEjercicio = function (index) {
  const ej = rutinaEditando.dias[diaEditando].ejercicios[index];
  if (!confirm(`¿Borrar "${ej.nombre}"?`)) return;
  rutinaEditando.dias[diaEditando].ejercicios.splice(index, 1);
  saveRutinaUsuario(rutinaEditando, rutinaEditandoId);
  renderFormularioDia();
};

// ========================================
// VOLVER
// ========================================
window.volverListaDias = function () {
  diaEditando = null;
  renderEditorRutina();
};

window.volverListaRutinas = function () {
  rutinaEditando = null;
  rutinaEditandoId = null;
  renderListaRutinas();
};

window.volverMenuDesdeEditor = function () {
  document.getElementById("pantalla-editor").classList.add("oculto");
  document.getElementById("menu").classList.remove("oculto");
  rutinaEditando = null;
  rutinaEditandoId = null;
  diaEditando = null;
  dispararCambioRutina();
};

// ========================================
// CONFIGURACIÓN DEL DÍA
// ========================================
window.toggleTimer = function (value) {
  rutinaEditando.dias[diaEditando].tieneTimer = value;
  saveRutinaUsuario(rutinaEditando, rutinaEditandoId);
};

window.toggleCronometro = function (value) {
  rutinaEditando.dias[diaEditando].tieneCronometro = value;
  saveRutinaUsuario(rutinaEditando, rutinaEditandoId);
};

window.cambiarNombreDia = function () {
  const dia = rutinaEditando.dias[diaEditando];
  const nuevo = prompt("Nuevo nombre del día:", dia.nombre);
  if (!nuevo || !nuevo.trim()) return;
  rutinaEditando.dias[diaEditando].nombre = nuevo.trim();
  saveRutinaUsuario(rutinaEditando, rutinaEditandoId);
  renderFormularioDia();
};

// ========================================
// HELPER
// ========================================
function dispararCambioRutina() {
  window.dispatchEvent(new CustomEvent("cambio-rutina", {
    detail: { rutinaId: rutinaEditandoId || localStorage.getItem("rutinaActiva") }
  }));
}
