// rutinaUsuario.js
import { markDirty } from "./userState.js";

const KEY = "rutinaUsuario";

export function crearRutinaBase() {
  return {
    dias: [
      {
        id: "dia-1",
        nombre: "Nuevo día",
        temporizador: null,
        ejercicios: []
      }
    ]
  };
}

export function loadRutinaUsuario() {
  const raw = localStorage.getItem(KEY);
  return raw ? JSON.parse(raw) : crearRutinaBase();
}

export function saveRutinaUsuario(rutina) {
  localStorage.setItem(KEY, JSON.stringify(rutina));
  markDirty();
}

export function clonarRutina(rutina) {
  return JSON.parse(JSON.stringify(rutina));
}

export function borrarRutinaUsuario() {
  localStorage.removeItem(KEY);
  markDirty();
}
