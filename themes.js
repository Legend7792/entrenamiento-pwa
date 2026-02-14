// themes.js
import { markDirty } from "./userState.js";

export const TEMAS = {
  oscuro: {
    nombre: "🌙 Oscuro",
    variables: {
      "--bg-primary": "#121212",
      "--bg-secondary": "#1e1e1e",
      "--text-primary": "#ffffff",
      "--text-secondary": "#b0b0b0",
      "--accent": "#4a9eff",
      "--border": "#333333",
      "--success": "#4caf50",
      "--warning": "#ff9800",
      "--danger": "#f44336"
    }
  },
  claro: {
    nombre: "☀️ Claro",
    variables: {
      "--bg-primary": "#ffffff",
      "--bg-secondary": "#f5f5f5",
      "--text-primary": "#000000",
      "--text-secondary": "#666666",
      "--accent": "#2196f3",
      "--border": "#dddddd",
      "--success": "#4caf50",
      "--warning": "#ff9800",
      "--danger": "#f44336"
    }
  },
  morado: {
    nombre: "💜 Morado",
    variables: {
      "--bg-primary": "#1a0033",
      "--bg-secondary": "#2d0052",
      "--text-primary": "#ffffff",
      "--text-secondary": "#c4a3e8",
      "--accent": "#9c27b0",
      "--border": "#4a148c",
      "--success": "#7e57c2",
      "--warning": "#ba68c8",
      "--danger": "#d81b60"
    }
  },
  verde: {
    nombre: "🌿 Verde Natural",
    variables: {
      "--bg-primary": "#0d1b0d",
      "--bg-secondary": "#1a2e1a",
      "--text-primary": "#e8f5e9",
      "--text-secondary": "#a5d6a7",
      "--accent": "#4caf50",
      "--border": "#2e7d32",
      "--success": "#66bb6a",
      "--warning": "#ffb74d",
      "--danger": "#ef5350"
    }
  },
  azul: {
    nombre: "🌊 Azul Océano",
    variables: {
      "--bg-primary": "#001a33",
      "--bg-secondary": "#003366",
      "--text-primary": "#e3f2fd",
      "--text-secondary": "#90caf9",
      "--accent": "#2196f3",
      "--border": "#1565c0",
      "--success": "#42a5f5",
      "--warning": "#ffa726",
      "--danger": "#ef5350"
    }
  }
};

// Obtener tema actual
export function obtenerTemaActual() {
  return localStorage.getItem("tema") || "oscuro";
}

// Aplicar tema
export function aplicarTema(idTema) {
  const tema = TEMAS[idTema];
  if (!tema) return;

  const root = document.documentElement;
  Object.entries(tema.variables).forEach(([variable, valor]) => {
    root.style.setProperty(variable, valor);
  });

  localStorage.setItem("tema", idTema);
  markDirty(); // Marcar para sincronizar
}

// Crear selector de temas en el sidebar
export function crearSelectorTemas() {
  const selector = document.getElementById("selector-temas-sidebar");
  if (!selector) return;

  const temaActual = obtenerTemaActual();

  selector.innerHTML = Object.entries(TEMAS).map(([id, tema]) => 
    `<option value="${id}" ${id === temaActual ? "selected" : ""}>
      ${tema.nombre}
    </option>`
  ).join("");

  selector.onchange = (e) => {
    aplicarTema(e.target.value);
  };
}

// Inicializar tema al cargar
document.addEventListener("DOMContentLoaded", () => {
  aplicarTema(obtenerTemaActual());
  crearSelectorTemas();
});

function renderizarSelectorTemas() {
  const selector = document.getElementById("selector-temas");
  if (!selector) return;

  const temaActual = obtenerTemaActual();

  selector.innerHTML = Object.entries(TEMAS).map(([id, tema]) => 
    `<option value="${id}" ${id === temaActual ? "selected" : ""}>
      ${tema.nombre}
    </option>`
  ).join("");

  selector.onchange = (e) => {
    aplicarTema(e.target.value);
  };
}

// Inicializar tema al cargar
document.addEventListener("DOMContentLoaded", () => {
  aplicarTema(obtenerTemaActual());
  crearSelectorTemas();
});
