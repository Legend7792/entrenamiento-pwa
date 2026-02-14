// selectorRutinas.js
import { loadRutinaUsuario } from "./rutinaUsuario.js";

export const RUTINA_BASE_ID = "rutina_base";

// Obtener todas las rutinas disponibles
export function obtenerRutinas() {
  const rutinas = [
    {
      id: RUTINA_BASE_ID,
      nombre: "🔥 Rutina Base (Por defecto)",
      descripcion: "Rutina predefinida del sistema"
    }
  ];

  // Cargar rutinas personalizadas del usuario
  const rutinaUsuario = loadRutinaUsuario();
  if (rutinaUsuario && rutinaUsuario.dias && rutinaUsuario.dias.length > 0) {
    rutinas.push({
      id: "rutina_usuario",
      nombre: "💪 Mi Rutina Personalizada",
      descripcion: "Creada por ti"
    });
  }

  return rutinas;
}

// Obtener rutina activa
export function obtenerRutinaActiva() {
  const guardada = localStorage.getItem("rutinaActiva");
  return guardada || RUTINA_BASE_ID;
}

// Establecer rutina activa
export function setRutinaActiva(idRutina) {
  localStorage.setItem("rutinaActiva", idRutina);
  
  // Disparar evento personalizado para que app.js lo escuche
  window.dispatchEvent(new CustomEvent("cambio-rutina", { 
    detail: { rutinaId: idRutina } 
  }));
}

// Renderizar selector en el menú
export function renderizarSelectorRutinas() {
  const selector = document.getElementById("selector-rutina");
  if (!selector) return;

  const rutinas = obtenerRutinas();
  const activa = obtenerRutinaActiva();

  selector.innerHTML = rutinas.map(r => 
    `<option value="${r.id}" ${r.id === activa ? "selected" : ""}>
      ${r.nombre}
    </option>`
  ).join("");

  // Evento de cambio
  selector.onchange = (e) => {
    setRutinaActiva(e.target.value);
    mostrarMensajeRutina(e.target.value);
  };
}

function mostrarMensajeRutina(idRutina) {
  const rutinas = obtenerRutinas();
  const rutina = rutinas.find(r => r.id === idRutina);
  
  if (rutina) {
    alert(`✅ Rutina activa: ${rutina.nombre}\n${rutina.descripcion}`);
  }
}

// Inicializar selector cuando cargue el DOM
document.addEventListener("DOMContentLoaded", () => {
  renderizarSelectorRutinas();
});
