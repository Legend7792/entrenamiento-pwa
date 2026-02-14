// editorRutinas.js - GESTOR DE MÚLTIPLES RUTINAS (VERSIÓN CORREGIDA)
import { 
  saveRutinaUsuario, 
  loadRutinaUsuario, 
  getAllRutinasUsuario,
  deleteRutinaUsuario,
  generarIdRutina
} from "./rutinaUsuario.js";

let rutinaEditando = null;
let rutinaEditandoId = null;
let diaEditando = null;

// Abrir el editor
window.abrirEditorRutinas = function() {
  document.getElementById("menu").classList.add("oculto");
  document.getElementById("pantalla-editor").classList.remove("oculto");
  
  renderListaRutinas();
};

// Renderizar lista de rutinas
function renderListaRutinas() {
  const contenedor = document.getElementById("contenido-editor");
  const rutinas = getAllRutinasUsuario();
  const rutinasArray = Object.keys(rutinas).map(id => ({ id, ...rutinas[id] }));
  
  contenedor.innerHTML = `
    <div class="gestor-rutinas">
      <h3>Mis Rutinas</h3>
      
      <div class="lista-rutinas">
        ${rutinasArray.length === 0 ? `
          <p style="text-align: center; color: var(--text-secondary); padding: 20px;">
            No tienes rutinas personalizadas
          </p>
        ` : rutinasArray.map(rutina => `
          <div class="rutina-card">
            <h4>📋 ${rutina.nombre}</h4>
            <p>${rutina.dias.length} día(s)</p>
            <div class="acciones-rutina-card">
              <button onclick="editarRutina('${rutina.id}')">✏️ Editar</button>
              <button class="danger" onclick="borrarRutinaCompleta('${rutina.id}')">🗑️</button>
            </div>
          </div>
        `).join('')}
      </div>
      
      <button onclick="crearNuevaRutina()">➕ Crear nueva rutina</button>
      <button onclick="volverMenuDesdeEditor()">Volver al menú</button>
    </div>
  `;
}

// Crear nueva rutina
window.crearNuevaRutina = function() {
  const nombre = prompt("Nombre de la rutina:") || "Mi Rutina";
  
  const nuevoId = generarIdRutina();
  
  const nuevaRutina = {
    nombre: nombre,
    dias: []
  };
  
  saveRutinaUsuario(nuevaRutina, nuevoId);
  
  // Editar la nueva rutina
  editarRutina(nuevoId);
};

// Editar rutina existente
window.editarRutina = function(rutinaId) {
  rutinaEditandoId = rutinaId;
  rutinaEditando = loadRutinaUsuario(rutinaId);
  renderEditorRutina();
};

// Renderizar editor de una rutina específica
function renderEditorRutina() {
  const contenedor = document.getElementById("contenido-editor");
  
  contenedor.innerHTML = `
    <div class="editor-header">
      <h3>${rutinaEditando.nombre}</h3>
      <button onclick="cambiarNombreRutina()">✏️ Cambiar nombre</button>
      <button onclick="volverListaRutinas()">← Volver a lista</button>
    </div>
    
    <div class="lista-dias">
      ${rutinaEditando.dias.length === 0 ? `
        <p style="text-align: center; color: var(--text-secondary); padding: 20px;">
          No hay días en esta rutina. Añade uno para empezar.
        </p>
      ` : rutinaEditando.dias.map((dia, idx) => `
        <div class="dia-card">
          <h4>📅 ${dia.nombre}</h4>
          <p>${dia.ejercicios.length} ejercicio(s)</p>
          <div class="acciones-dia-card">
            <button onclick="editarDia(${idx})">✏️ Editar</button>
            <button class="danger" onclick="borrarDia(${idx})">🗑️</button>
          </div>
        </div>
      `).join('')}
    </div>
    
    <button onclick="añadirNuevoDia()">➕ Añadir día</button>
  `;
}

// Cambiar nombre de rutina
window.cambiarNombreRutina = function() {
  const nuevoNombre = prompt("Nuevo nombre:", rutinaEditando.nombre);
  if (nuevoNombre && nuevoNombre.trim()) {
    rutinaEditando.nombre = nuevoNombre.trim();
    saveRutinaUsuario(rutinaEditando, rutinaEditandoId);
    
    window.dispatchEvent(new CustomEvent("cambio-rutina", {
      detail: { rutinaId: rutinaEditandoId }
    }));
    
    renderEditorRutina();
  }
};

// Volver a lista de rutinas
window.volverListaRutinas = function() {
  rutinaEditando = null;
  rutinaEditandoId = null;
  renderListaRutinas();
};

// Borrar rutina completa
window.borrarRutinaCompleta = function(rutinaId) {
  const rutina = loadRutinaUsuario(rutinaId);
  if (!confirm(`¿Borrar "${rutina.nombre}"?`)) return;
  
  deleteRutinaUsuario(rutinaId);
  
  // Si era la activa, volver a base
  if (localStorage.getItem("rutinaActiva") === rutinaId) {
    localStorage.setItem("rutinaActiva", "RUTINA_BASE");
  }
  
  window.dispatchEvent(new CustomEvent("cambio-rutina", {
    detail: { rutinaId: "RUTINA_BASE" }
  }));
  
  renderListaRutinas();
};

// Añadir nuevo día
window.añadirNuevoDia = function() {
  const nombre = prompt("Nombre del día:") || `Día ${rutinaEditando.dias.length + 1}`;
  
  rutinaEditando.dias.push({
    nombre: nombre,
    ejercicios: [],
    tieneTimer: true,
    tieneCronometro: false
  });
  
  saveRutinaUsuario(rutinaEditando, rutinaEditandoId);
  
  window.dispatchEvent(new CustomEvent("cambio-rutina", {
    detail: { rutinaId: rutinaEditandoId }
  }));
  
  renderEditorRutina();
};

// Borrar día
window.borrarDia = function(index) {
  if (!confirm(`¿Borrar "${rutinaEditando.dias[index].nombre}"?`)) return;
  
  rutinaEditando.dias.splice(index, 1);
  saveRutinaUsuario(rutinaEditando, rutinaEditandoId);
  
  window.dispatchEvent(new CustomEvent("cambio-rutina", {
    detail: { rutinaId: rutinaEditandoId }
  }));
  
  renderEditorRutina();
};

// Editar día
window.editarDia = function(index) {
  diaEditando = index;
  renderFormularioDia();
};

// Renderizar formulario de edición de día
function renderFormularioDia() {
  const dia = rutinaEditando.dias[diaEditando];
  const contenedor = document.getElementById("contenido-editor");
  
  contenedor.innerHTML = `
    <div class="editor-dia">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
        <h3>📅 ${dia.nombre}</h3>
        <button onclick="cambiarNombreDia()">✏️ Cambiar nombre</button>
      </div>
      
      <div class="config-dia">
        <h4>⚙️ Configuración del día</h4>
        
        <label>
          <input type="checkbox" id="dia-timer" ${dia.tieneTimer !== false ? 'checked' : ''} onchange="toggleTimer(this.checked)" />
          <span>⏱️ Mostrar temporizadores de descanso</span>
        </label>
        
        <label>
          <input type="checkbox" id="dia-cronometro" ${dia.tieneCronometro ? 'checked' : ''} onchange="toggleCronometro(this.checked)" />
          <span>⏲️ Mostrar cronómetro HIT</span>
        </label>
      </div>
      
      <hr>
      
      <div class="lista-ejercicios-editor">
        ${dia.ejercicios.length === 0 ? `
          <p style="text-align: center; color: var(--text-secondary); padding: 10px;">
            No hay ejercicios. Añade uno abajo.
          </p>
        ` : dia.ejercicios.map((ej, idx) => `
          <div class="ejercicio-editor-card">
            <h4>${ej.nombre}</h4>
            <p>Series: ${ej.series} | Reps: ${ej.repsMin}-${ej.repsMax} | Peso: ${ej.peso}kg</p>
            ${ej.alFallo ? '<span class="badge">Al fallo</span>' : ''}
            <button class="danger" onclick="borrarEjercicio(${idx})">🗑️ Borrar</button>
          </div>
        `).join('')}
      </div>
      
      <hr>
      
      <h4>➕ Añadir ejercicio</h4>
      <div class="form-ejercicio">
        <input id="ej-nombre" placeholder="Nombre del ejercicio" />
        
        <div class="form-row">
          <input id="ej-peso" type="number" placeholder="Peso (kg)" />
          <input id="ej-series" type="number" placeholder="Series" />
        </div>
        
        <div class="form-row">
          <input id="ej-reps-min" type="number" placeholder="Reps mín" />
          <input id="ej-reps-max" type="number" placeholder="Reps máx" />
        </div>
        
        <label>
          <input type="checkbox" id="ej-fallo" />
          <span>Al fallo (sin progresión de peso)</span>
        </label>
        
        <button onclick="añadirEjercicioADia()">➕ Añadir ejercicio</button>
      </div>
      
      <hr>
      
      <button onclick="volverListaDias()">← Volver a lista de días</button>
    </div>
  `;
}

// Añadir ejercicio al día
window.añadirEjercicioADia = function() {
  const nombre = document.getElementById("ej-nombre").value.trim();
  const pesoInput = document.getElementById("ej-peso").value;
  const seriesInput = document.getElementById("ej-series").value;
  const repsMinInput = document.getElementById("ej-reps-min").value;
  const repsMaxInput = document.getElementById("ej-reps-max").value;
  const alFallo = document.getElementById("ej-fallo").checked;
  
  if (!nombre || !pesoInput || !seriesInput || !repsMinInput || !repsMaxInput) {
    alert("⚠️ Completa todos los campos");
    return;
  }
  
  const peso = Number(pesoInput);
  const series = Number(seriesInput);
  const repsMin = Number(repsMinInput);
  const repsMax = Number(repsMaxInput);
  
  if (series <= 0 || repsMin <= 0 || repsMax <= 0) {
    alert("⚠️ Los números deben ser mayores que 0");
    return;
  }
  
  rutinaEditando.dias[diaEditando].ejercicios.push({
    nombre,
    peso: alFallo ? 0 : peso,
    series,
    repsMin,
    repsMax,
    alFallo
  });
  
  saveRutinaUsuario(rutinaEditando, rutinaEditandoId);
  renderFormularioDia();
};

// Borrar ejercicio
window.borrarEjercicio = function(index) {
  if (!confirm("¿Borrar este ejercicio?")) return;
  
  rutinaEditando.dias[diaEditando].ejercicios.splice(index, 1);
  saveRutinaUsuario(rutinaEditando, rutinaEditandoId);
  renderFormularioDia();
};

// Volver a lista de días
window.volverListaDias = function() {
  diaEditando = null;
  renderEditorRutina();
};

// Volver al menú
window.volverMenuDesdeEditor = function() {
  document.getElementById("pantalla-editor").classList.add("oculto");
  document.getElementById("menu").classList.remove("oculto");
  
  // Resetear estado
  rutinaEditando = null;
  rutinaEditandoId = null;
  
  window.dispatchEvent(new CustomEvent("cambio-rutina", {
    detail: { rutinaId: localStorage.getItem("rutinaActiva") || "RUTINA_BASE" }
  }));
};

// Toggle temporizador
window.toggleTimer = function(value) {
  rutinaEditando.dias[diaEditando].tieneTimer = value;
  saveRutinaUsuario(rutinaEditando, rutinaEditandoId);
};

// Toggle cronómetro
window.toggleCronometro = function(value) {
  rutinaEditando.dias[diaEditando].tieneCronometro = value;
  saveRutinaUsuario(rutinaEditando, rutinaEditandoId);
};

// Cambiar nombre del día
window.cambiarNombreDia = function() {
  const dia = rutinaEditando.dias[diaEditando];
  const nuevoNombre = prompt("Nuevo nombre del día:", dia.nombre);
  
  if (nuevoNombre && nuevoNombre.trim()) {
    rutinaEditando.dias[diaEditando].nombre = nuevoNombre.trim();
    saveRutinaUsuario(rutinaEditando, rutinaEditandoId);
    renderFormularioDia();
  }
};
