// selectorRutinas.js - SELECTOR CON MÚLTIPLES RUTINAS
import { getAllRutinasUsuario } from "./rutinaUsuario.js";

export const RUTINA_BASE_ID = "rutina_base";

// Obtener rutina activa
export function obtenerRutinaActiva() {
  return localStorage.getItem("rutinaActiva") || RUTINA_BASE_ID;
}

// Establecer rutina activa
export function setRutinaActiva(rutinaId) {
  localStorage.setItem("rutinaActiva", rutinaId);
  
  window.dispatchEvent(new CustomEvent("cambio-rutina", {
    detail: { rutinaId }
  }));
}

// Renderizar selector
export function renderizarSelectorRutinas() {
  const selector = document.getElementById("selector-rutina");
  if (!selector) return;
  
  const rutinaActiva = obtenerRutinaActiva();
  const rutinasUsuario = getAllRutinasUsuario();
  
  // Limpiar selector
  selector.innerHTML = "";
  
  // Opción: Rutina base
  const optionBase = document.createElement("option");
  optionBase.value = RUTINA_BASE_ID;
  const nombreBase = rutinasUsuario[RUTINA_BASE_ID]?.nombre || "Rutina Base";
  optionBase.textContent = `📋 ${nombreBase}`;
  if (rutinaActiva === RUTINA_BASE_ID) optionBase.selected = true;
  selector.appendChild(optionBase);
  
  // Opciones: Rutinas personalizadas (incluye las recién creadas sin días)
Object.keys(rutinasUsuario).forEach(rutinaId => {
  if (rutinaId === RUTINA_BASE_ID) return;
  
  const rutina = rutinasUsuario[rutinaId];
  if (!rutina) return;

    const option = document.createElement("option");
    option.value = rutinaId;
    option.textContent = `✏️ ${rutina.nombre || "Mi Rutina"} (${(rutina.dias||[]).length} días)`;
    
    if (rutinaActiva === rutinaId) {
      option.selected = true;
    }
    
    selector.appendChild(option);
  });
  
  // Event listener
  selector.onchange = function() {
    setRutinaActiva(this.value);
    
    if (typeof window.renderizarBotonesDias === 'function') {
      window.renderizarBotonesDias();
    }
  };
}

// Inicializar
document.addEventListener("DOMContentLoaded", () => {
  renderizarSelectorRutinas();
});

// Escuchar cambios
window.addEventListener("cambio-rutina", () => {
  renderizarSelectorRutinas();
  
  if (typeof window.renderizarBotonesDias === 'function') {
    window.renderizarBotonesDias();
  }
});
