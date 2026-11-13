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
      "--danger": "#f44336",
      "--serie-ok": "#4a9eff"
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
      "--danger": "#f44336",
      "--serie-ok": "#2196f3"
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
      "--danger": "#ff1744",
      "--serie-ok": "#00e5ff"
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
    nombre: "⚙️ Gris Acero",
    variables: {
      "--bg-primary": "#1c1c1e",
      "--bg-secondary": "#2c2c2e",
      "--text-primary": "#f2f2f7",
      "--text-secondary": "#8e8e93",
      "--accent": "#636366",
      "--border": "#3a3a3c",
      "--success": "#30d158",
      "--warning": "#ffd60a",
      "--danger": "#ff453a",
      "--serie-ok": "#aeaeb2"
    }
  },
  cyan: {
    nombre: "💠 Cyan Neón",
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

// ── Contraste: texto blanco o negro, el que más contraste dé sobre un color ──
function luminancia(hex) {
  const h = hex.replace("#", "");
  const c = [0, 2, 4].map(i => parseInt(h.substr(i, 2), 16) / 255)
    .map(v => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
export function textoSobre(hex) {
  const L = luminancia(hex);
  const conBlanco = 1.05 / (L + 0.05);
  const conNegro  = (L + 0.05) / 0.05;
  return conNegro >= conBlanco ? "#000000" : "#ffffff";
}

function contrasteEntre(a, b) {
  const la = luminancia(a), lb = luminancia(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}
function mezclarHex(origen, destino, t) {
  const o = origen.replace("#", ""), d = destino.replace("#", "");
  return "#" + [0, 2, 4].map(i => {
    const a = parseInt(o.substr(i, 2), 16), b = parseInt(d.substr(i, 2), 16);
    return Math.round(a + (b - a) * t).toString(16).padStart(2, "0");
  }).join("");
}
// Versión del color apta para TEXTO sobre los fondos del tema (contraste mínimo 4.5:1).
// Si el color ya cumple se devuelve tal cual; si no, se aclara (fondo oscuro) u oscurece (fondo claro)
// lo justo. Los rellenos (botones, barras) siguen usando el color original.
export function colorLegible(hex, fondos, minimo = 4.5) {
  if (fondos.every(f => contrasteEntre(hex, f) >= minimo)) return hex;
  const destino = luminancia(fondos[0]) < 0.4 ? "#ffffff" : "#000000";
  for (let t = 0.05; t <= 1.0001; t += 0.05) {
    const c = mezclarHex(hex, destino, t);
    if (fondos.every(f => contrasteEntre(c, f) >= minimo)) return c;
  }
  return destino;
}

// Aplicar tema. `sincronizar` solo debe ser true cuando el USUARIO cambia el tema
// (antes se marcaba como cambio en cada arranque y provocaba una subida a la nube).
export function aplicarTema(idTema, { sincronizar = false } = {}) {
  const tema = TEMAS[idTema];
  if (!tema) return;

  const root = document.documentElement;
  Object.entries(tema.variables).forEach(([variable, valor]) => {
    root.style.setProperty(variable, valor);
  });

  // Colores de texto legibles sobre los rellenos de cada tema
  const v = tema.variables;
  root.style.setProperty("--on-accent",  textoSobre(v["--accent"]));
  root.style.setProperty("--on-success", textoSobre(v["--success"]));
  // Color de la casilla de repeticiones cumplida: el del tema (si no define uno propio, el de éxito)
  const serieOk = v["--serie-ok"] || v["--success"];
  root.style.setProperty("--serie-ok", serieOk);
  root.style.setProperty("--on-serie-ok", textoSobre(serieOk));
  root.style.setProperty("--on-danger",  textoSobre(v["--danger"]));
  root.style.setProperty("--on-warning", textoSobre(v["--warning"]));
  // Variantes para usar el color como TEXTO (en temas claros u oscuros con poco contraste)
  const fondos = [v["--bg-primary"], v["--bg-secondary"]];
  ["accent", "success", "warning", "danger"].forEach(n =>
    root.style.setProperty(`--${n}-text`, colorLegible(v[`--${n}`], fondos)));
  // El texto secundario es siempre texto: se ajusta directamente (solo cambia si no llegaba a 4.5:1)
  root.style.setProperty("--text-secondary", colorLegible(v["--text-secondary"], fondos));

  // Barra de estado del navegador/PWA acorde al tema
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", v["--bg-primary"]);

  try {
    if (localStorage.getItem("tema") !== idTema) localStorage.setItem("tema", idTema);
  } catch (e) {
    console.warn("No se pudo guardar el tema:", e);
  }
  if (sincronizar) markDirty();
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
    aplicarTema(e.target.value, { sincronizar: true });
  };
}

// Inicializar tema al cargar
document.addEventListener("DOMContentLoaded", () => {
  aplicarTema(obtenerTemaActual());
  crearSelectorTemas();
});

// Reaplicar el tema guardado (p. ej. después de traer datos de la nube)
window.aplicarTemaGuardado = () => aplicarTema(obtenerTemaActual());
