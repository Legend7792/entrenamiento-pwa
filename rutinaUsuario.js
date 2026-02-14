// rutinaUsuario.js - SISTEMA DE MÚLTIPLES RUTINAS

// Guardar una rutina (con ID)
export function saveRutinaUsuario(rutina, rutinaId = "rutina_1") {
  const rutinas = getAllRutinasUsuario();
  rutinas[rutinaId] = rutina;
  localStorage.setItem("rutinasUsuario", JSON.stringify(rutinas));
}

// Cargar una rutina específica
export function loadRutinaUsuario(rutinaId = "rutina_1") {
  const rutinas = getAllRutinasUsuario();
  return rutinas[rutinaId] || null;
}

// Obtener todas las rutinas
export function getAllRutinasUsuario() {
  const data = localStorage.getItem("rutinasUsuario");
  return data ? JSON.parse(data) : {};
}

// Borrar una rutina específica
export function deleteRutinaUsuario(rutinaId) {
  const rutinas = getAllRutinasUsuario();
  delete rutinas[rutinaId];
  localStorage.setItem("rutinasUsuario", JSON.stringify(rutinas));
}

// Generar ID único para nueva rutina
export function generarIdRutina() {
  return `rutina_${Date.now()}`;
}
