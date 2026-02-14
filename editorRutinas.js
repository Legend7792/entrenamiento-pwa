// editorRutinas.js
import { loadRutinaUsuario, saveRutinaUsuario, crearRutinaBase } from "./rutinaUsuario.js";
import { renderizarSelectorRutinas } from "./selectorRutinas.js";

// Abrir editor de rutinas personalizadas
export function abrirEditorRutinas() {
  const html = `
    <div id="editor-rutinas-modal" style="
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.9);
      z-index: 9999;
      overflow-y: auto;
      padding: 20px;
    ">
      <div style="max-width: 600px; margin: 0 auto; background: var(--bg-secondary); padding: 20px; border-radius: 8px;">
        <h2>💪 Editor de Rutinas Personalizadas</h2>
        <p style="color: var(--text-secondary)">Crea tu propia rutina con días y ejercicios personalizados</p>
        
        <div id="lista-dias-editor"></div>
        
        <button onclick="añadirDiaPersonalizado()" style="margin-top: 15px;">
          ➕ Añadir Día
        </button>
        
        <hr style="margin: 20px 0;">
        
        <button onclick="guardarRutinaPersonalizada()">
          💾 Guardar Rutina
        </button>
        <button onclick="cerrarEditorRutinas()">
          ❌ Cerrar
        </button>
      </div>
    </div>
  `;
  
  document.body.insertAdjacentHTML("beforeend", html);
  renderizarDiasEditor();
}

function renderizarDiasEditor() {
  const rutina = loadRutinaUsuario();
  const contenedor = document.getElementById("lista-dias-editor");
  if (!contenedor) return;
  
  contenedor.innerHTML = rutina.dias.map((dia, idx) => `
    <div class="dia-editor" style="background: var(--bg-primary); padding: 15px; margin: 10px 0; border-radius: 5px;">
      <h3>Día ${idx + 1}</h3>
      <input 
        type="text" 
        value="${dia.nombre}" 
        onchange="actualizarNombreDia(${idx}, this.value)"
        placeholder="Nombre del día"
        style="width: 100%; margin-bottom: 10px;"
      >
      
      <div id="ejercicios-dia-${idx}">
        ${dia.ejercicios.map((ej, ejIdx) => `
          <div style="background: var(--bg-secondary); padding: 10px; margin: 5px 0; border-radius: 3px;">
            <input type="text" value="${ej.nombre}" onchange="actualizarEjercicio(${idx}, ${ejIdx}, 'nombre', this.value)" placeholder="Ejercicio" style="width: 100%;">
            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 5px; margin-top: 5px;">
              <input type="number" value="${ej.peso}" onchange="actualizarEjercicio(${idx}, ${ejIdx}, 'peso', this.value)" placeholder="Peso">
              <input type="number" value="${ej.series}" onchange="actualizarEjercicio(${idx}, ${ejIdx}, 'series', this.value)" placeholder="Series">
              <input type="number" value="${ej.repsMin}" onchange="actualizarEjercicio(${idx}, ${ejIdx}, 'repsMin', this.value)" placeholder="Reps mín">
              <input type="number" value="${ej.repsMax}" onchange="actualizarEjercicio(${idx}, ${ejIdx}, 'repsMax', this.value)" placeholder="Reps máx">
            </div>
            <button onclick="eliminarEjercicio(${idx}, ${ejIdx})" style="margin-top: 5px; background: var(--danger); font-size: 12px;">🗑️ Eliminar</button>
          </div>
        `).join("")}
      </div>
      
      <button onclick="añadirEjercicioDia(${idx})" style="margin-top: 10px; font-size: 14px;">
        ➕ Añadir Ejercicio
      </button>
      <button onclick="eliminarDia(${idx})" style="margin-top: 10px; margin-left: 10px; background: var(--danger); font-size: 14px;">
        🗑️ Eliminar Día
      </button>
    </div>
  `).join("");
}

window.actualizarNombreDia = function(diaIdx, nombre) {
  const rutina = loadRutinaUsuario();
  rutina.dias[diaIdx].nombre = nombre;
  saveRutinaUsuario(rutina);
};

window.actualizarEjercicio = function(diaIdx, ejIdx, campo, valor) {
  const rutina = loadRutinaUsuario();
  const ej = rutina.dias[diaIdx].ejercicios[ejIdx];
  
  if (campo === "nombre") {
    ej[campo] = valor;
  } else {
    ej[campo] = Number(valor);
  }
  
  saveRutinaUsuario(rutina);
};

window.añadirDiaPersonalizado = function() {
  const rutina = loadRutinaUsuario();
  rutina.dias.push({
    id: `dia-${Date.now()}`,
    nombre: `Día ${rutina.dias.length + 1}`,
    temporizador: null,
    ejercicios: []
  });
  saveRutinaUsuario(rutina);
  renderizarDiasEditor();
};

window.añadirEjercicioDia = function(diaIdx) {
  const rutina = loadRutinaUsuario();
  rutina.dias[diaIdx].ejercicios.push({
    nombre: "Nuevo ejercicio",
    peso: 0,
    series: 3,
    repsMin: 8,
    repsMax: 12
  });
  saveRutinaUsuario(rutina);
  renderizarDiasEditor();
};

window.eliminarEjercicio = function(diaIdx, ejIdx) {
  if (!confirm("¿Eliminar este ejercicio?")) return;
  const rutina = loadRutinaUsuario();
  rutina.dias[diaIdx].ejercicios.splice(ejIdx, 1);
  saveRutinaUsuario(rutina);
  renderizarDiasEditor();
};

window.eliminarDia = function(diaIdx) {
  if (!confirm("¿Eliminar este día completo?")) return;
  const rutina = loadRutinaUsuario();
  rutina.dias.splice(diaIdx, 1);
  saveRutinaUsuario(rutina);
  renderizarDiasEditor();
};

window.guardarRutinaPersonalizada = function() {
  alert("✅ Rutina guardada correctamente");
  renderizarSelectorRutinas(); // Actualizar selector
  cerrarEditorRutinas();
};

window.cerrarEditorRutinas = function() {
  const modal = document.getElementById("editor-rutinas-modal");
  if (modal) modal.remove();
};

// Exponer función globalmente
window.abrirEditorRutinas = abrirEditorRutinas;
