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
  },
  rojo: {
    nombre: "🔥 Rojo Fuego",
    variables: {
      "--bg-primary": "#1a0000",
      "--bg-secondary": "#2d0000",
      "--text-primary": "#ffffff",
      "--text-secondary": "#ff8a80",
      "--accent": "#ff3d00",
      "--border": "#7f0000",
      "--success": "#ff6e40",
      "--warning": "#ffab40",
      "--danger": "#ff1744"
    }
  },
  amoled: {
    nombre: "⚫ AMOLED Negro",
    variables: {
      "--bg-primary": "#000000",
      "--bg-secondary": "#0a0a0a",
      "--text-primary": "#ffffff",
      "--text-secondary": "#888888",
      "--accent": "#00e5ff",
      "--border": "#1a1a1a",
      "--success": "#00e676",
      "--warning": "#ffea00",
      "--danger": "#ff1744"
    }
  },
  naranja: {
    nombre: "🧡 Naranja Atlético",
    variables: {
      "--bg-primary": "#1a0e00",
      "--bg-secondary": "#2e1800",
      "--text-primary": "#fff8f0",
      "--text-secondary": "#ffcc80",
      "--accent": "#ff6d00",
      "--border": "#6d3a00",
      "--success": "#ffab40",
      "--warning": "#ffd740",
      "--danger": "#ff3d00"
    }
  },
  gris: {
    nombre: "🩶 Gris Acero",
    variables: {
      "--bg-primary": "#1c1c1e",
      "--bg-secondary": "#2c2c2e",
      "--text-primary": "#f2f2f7",
      "--text-secondary": "#8e8e93",
      "--accent": "#636366",
      "--border": "#3a3a3c",
      "--success": "#30d158",
      "--warning": "#ffd60a",
      "--danger": "#ff453a"
    }
  },
  cyan: {
    nombre: "🩵 Cyan Neón",
    variables: {
      "--bg-primary": "#00111a",
      "--bg-secondary": "#001f2e",
      "--text-primary": "#e0f7fa",
      "--text-secondary": "#80deea",
      "--accent": "#00e5ff",
      "--border": "#004d5e",
      "--success": "#00bcd4",
      "--warning": "#ffb300",
      "--danger": "#ff1744"
    }
  },
  militar: {
    nombre: "🪖 Verde Militar",
    variables: {
      "--bg-primary": "#1b1f0e",
      "--bg-secondary": "#2a2f14",
      "--text-primary": "#f0f0e0",
      "--text-secondary": "#b0b890",
      "--accent": "#8bc34a",
      "--border": "#4a5220",
      "--success": "#aed581",
      "--warning": "#ffcc02",
      "--danger": "#e64a19"
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

  try {
    localStorage.setItem("tema", idTema);
  } catch (e) {
    console.warn("No se pudo guardar el tema:", e);
  }
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
