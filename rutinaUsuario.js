// rutinaUsuario.js
export const RUTINA_BASE_ID = "rutina_base";

const RUTINA_BASE_ORIGINAL = {
  nombre: "Rutina Base (5 días)",
  dias: [
    {
      nombre: "Día 1 – Torso Fuerza",
      tieneCronometro: false,
      tieneTimer: true,
      ejercicios: [
        { nombre: "Press banca", peso: 80, series: 4, repsMin: 3, repsMax: 5, descanso: 180, tempo: "3-1-1", notas: "ANCLA. Escápulas retraídas y deprimidas. Barra toca pecho bajo. Codos 45-75° del torso." },
        { nombre: "Press militar", peso: 50, series: 4, repsMin: 3, repsMax: 5, descanso: 180, tempo: "3-1-1", notas: "De pie. Core apretado. Sin hiperextender lumbar. Barra sube por delante de la cara." },
        { nombre: "Remo con barra", peso: 70, series: 4, repsMin: 3, repsMax: 5, descanso: 180, tempo: "3-0-1", notas: "Tronco a 45°. Tira hacia abdomen bajo. Pausa 1 seg en contracción máxima." },
        { nombre: "Press jabalina", peso: 40, series: 3, repsMin: 3, repsMax: 5, descanso: 150, tempo: "", notas: "Barra apoyada en esquina. Empuje unilateral explosivo." },
        { nombre: "Dominada supina", peso: 0, series: 4, repsMin: 5, repsMax: 8, descanso: 150, tempo: "3-0-1", notas: "Agarre supino (palmas hacia ti). ROM completo. Codos hacia bolsillos al subir." },
        { nombre: "Fondos en paralelas", peso: 0, series: 3, repsMin: 5, repsMax: 8, descanso: 120, tempo: "", notas: "Ligera inclinación hacia delante para pectoral. Codos no se abren más de 45°." },
        { nombre: "Elevaciones laterales", peso: 5, series: 3, repsMin: 12, repsMax: 15, descanso: 60, tempo: "2-0-1", notas: "Sin impulso de caderas. Hasta paralelo al suelo. Último set al fallo técnico." },
        { nombre: "Encogimientos", peso: 0, series: 2, repsMin: 8, repsMax: 10, descanso: 60, tempo: "", notas: "Lento y controlado. Pausa 1 seg arriba." }
      ]
    },
    {
      nombre: "Día 2 – Pierna Fuerza",
      tieneCronometro: false,
      tieneTimer: true,
      ejercicios: [
        { nombre: "Sentadilla trasera", peso: 100, series: 4, repsMin: 3, repsMax: 5, descanso: 240, tempo: "3-1-1", notas: "Barra en trapecio medio. Profundidad paralela o más. Rodillas siguen punta de pie." },
        { nombre: "Peso muerto convencional", peso: 80, series: 3, repsMin: 3, repsMax: 5, descanso: 240, tempo: "3-1-1", notas: "Espalda neutral toda la serie. Barra pegada a las piernas. Empujar suelo con pies." },
        { nombre: "Buenos días", peso: 20, series: 2, repsMin: 6, repsMax: 6, descanso: 120, tempo: "", notas: "Bisagra de cadera. Espalda rígida. Solo hasta sentir tensión en femorales." },
        { nombre: "Elevaciones de piernas colgado", peso: 0, series: 3, repsMin: 8, repsMax: 10, alFallo: true, descanso: 90, tempo: "", notas: "Sin balanceo. Pelvis en retroversión al subir. Al fallo técnico." },
        { nombre: "Jalón abdominal con peso", peso: 20, series: 3, repsMin: 10, repsMax: 10, descanso: 90, tempo: "", notas: "Codos fijos. Solo flexión de columna. Pausa 1 seg abajo." },
        { nombre: "Sentadilla a una pierna", peso: 0, series: 2, repsMin: 5, repsMax: 5, descanso: 120, tempo: "", notas: "Pistol squat. Brazo contralateral al frente. Control total en bajada." }
      ]
    },
    {
      nombre: "Día 3 – Torso Hipertrofia",
      tieneCronometro: false,
      tieneTimer: true,
      ejercicios: [
        { nombre: "Press militar", peso: 40, series: 4, repsMin: 8, repsMax: 10, descanso: 90, tempo: "3-1-1", notas: "De pie. Pausa 1 seg abajo para estirar deltoides. Sin hiperextensión lumbar." },
        { nombre: "Press banca", peso: 60, series: 4, repsMin: 8, repsMax: 10, descanso: 90, tempo: "3-1-1", notas: "Escápulas retraídas. Bajar lento 3 seg. Pausa 1 seg en pecho." },
        { nombre: "Dominadas prono", peso: 0, series: 3, repsMin: 0, repsMax: 1, alFallo: true, descanso: 90, tempo: "3-0-1", notas: "Agarre prono. ROM completo. Al fallo con técnica limpia." },
        { nombre: "Press banca inclinado", peso: 50, series: 3, repsMin: 8, repsMax: 10, descanso: 90, tempo: "3-1-1", notas: "30°. Pausa 1 seg abajo para estiramiento pectoral. Mancuernas no chocan arriba." },
        { nombre: "Remo con barra", peso: 50, series: 3, repsMin: 8, repsMax: 10, descanso: 90, tempo: "2-0-2", notas: "Pausa 2 seg en contracción. Tira hacia abdomen bajo. Espalda completamente estática." },
        { nombre: "Curl bíceps", peso: 15, series: 3, repsMin: 10, repsMax: 12, descanso: 60, tempo: "3-0-1", notas: "Codos fijos al costado. Sin oscilación lumbar. Baja completamente en cada rep." },
        { nombre: "Curl invertido", peso: 0, series: 2, repsMin: 10, repsMax: 10, descanso: 60, tempo: "", notas: "Agarre prono. Trabaja braquial y braquiorradial. Codos fijos." },
        { nombre: "Tríceps francés", peso: 10, series: 3, repsMin: 10, repsMax: 12, descanso: 60, tempo: "3-0-1", notas: "Recostado. Agarre neutro. Codos fijos apuntando al techo. Baja detrás de la cabeza controlado." }
      ]
    },
    {
      nombre: "Día 4 – Pierna Hipertrofia",
      tieneCronometro: false,
      tieneTimer: true,
      ejercicios: [
        { nombre: "Sentadilla frontal", peso: 60, series: 4, repsMin: 8, repsMax: 10, descanso: 120, tempo: "3-1-1", notas: "Barra en clavículas. Codos altos. Torso vertical. Core muy apretado." },
        { nombre: "Peso muerto rumano", peso: 70, series: 4, repsMin: 8, repsMax: 10, descanso: 120, tempo: "3-1-1", notas: "Bisagra de cadera pura. Baja hasta sentir femorales tensos. Sin redondear lumbar." },
        { nombre: "Desplantes con barra", peso: 30, series: 4, repsMin: 8, repsMax: 10, descanso: 90, tempo: "", notas: "Paso largo. Rodilla trasera casi toca suelo. Tronco vertical." },
        { nombre: "Elevación de talones", peso: 0, series: 4, repsMin: 12, repsMax: 15, descanso: 60, tempo: "", notas: "Pausa 2 seg arriba. Baja lento al máximo estiramiento. ROM completo." },
        { nombre: "Peso muerto unilateral", peso: 20, series: 2, repsMin: 6, repsMax: 8, descanso: 90, tempo: "", notas: "Una pierna. Cadera a 90° al bajar. Control total. Trabaja glúteo y femoral." },
        { nombre: "Roll-out", peso: 0, series: 4, repsMin: 10, repsMax: 10, alFallo: true, descanso: 60, tempo: "", notas: "Rodillas en suelo. Rueda hasta extensión máxima sin colapsar lumbar. Al fallo técnico." }
      ]
    },
    {
      nombre: "Día 5 – Potencia",
      tieneCronometro: true,
      tieneTimer: true,
      ejercicios: [
        { nombre: "Clean", peso: 40, series: 5, repsMin: 3, repsMax: 3, descanso: 300, tempo: "", notas: "Movimiento olímpico. Técnica ante todo. Extensión triple explosiva. Sin lastre si falla la técnica." }
      ]
    }
  ]
};

export function inicializarRutinaBase() {
  const rutinas = JSON.parse(localStorage.getItem("rutinas_usuario")) || {};
  if (!rutinas[RUTINA_BASE_ID]) {
    rutinas[RUTINA_BASE_ID] = JSON.parse(JSON.stringify(RUTINA_BASE_ORIGINAL));
    localStorage.setItem("rutinas_usuario", JSON.stringify(rutinas));
  }
}

export function restaurarRutinaBase() {
  const rutinas = JSON.parse(localStorage.getItem("rutinas_usuario")) || {};
  rutinas[RUTINA_BASE_ID] = JSON.parse(JSON.stringify(RUTINA_BASE_ORIGINAL));
  localStorage.setItem("rutinas_usuario", JSON.stringify(rutinas));
  return true;
}

export function saveRutinaUsuario(rutina, rutinaId) {
  const rutinas = JSON.parse(localStorage.getItem("rutinas_usuario")) || {};
  rutinas[rutinaId] = rutina;
  localStorage.setItem("rutinas_usuario", JSON.stringify(rutinas));
  if (typeof window !== 'undefined' && window.markDirty) window.markDirty();
}

export function loadRutinaUsuario(rutinaId) {
  const rutinas = JSON.parse(localStorage.getItem("rutinas_usuario")) || {};
  return rutinas[rutinaId] || null;
}

export function getAllRutinasUsuario() {
  return JSON.parse(localStorage.getItem("rutinas_usuario")) || {};
}

export function deleteRutinaUsuario(rutinaId) {
  if (rutinaId === RUTINA_BASE_ID) return false;
  const rutinas = JSON.parse(localStorage.getItem("rutinas_usuario")) || {};
  delete rutinas[rutinaId];
  localStorage.setItem("rutinas_usuario", JSON.stringify(rutinas));
  if (typeof window !== 'undefined' && window.markDirty) window.markDirty();
  return true;
}

export function duplicarRutina(rutinaId) {
  const rutina = loadRutinaUsuario(rutinaId);
  if (!rutina) return null;
  const nuevaRutina = JSON.parse(JSON.stringify(rutina));
  nuevaRutina.nombre = rutina.nombre + " (copia)";
  const nuevoId = generarIdRutina();
  saveRutinaUsuario(nuevaRutina, nuevoId);
  return nuevoId;
}

export function exportarRutinaJSON(rutinaId) {
  const rutina = loadRutinaUsuario(rutinaId);
  if (!rutina) return;
  const json = JSON.stringify(rutina, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `rutina_${rutina.nombre.replace(/[^a-z0-9]/gi, '_')}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function importarRutinaDesdeJSON(archivo, callback) {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const rutina = JSON.parse(e.target.result);
      if (!rutina.nombre || !Array.isArray(rutina.dias)) {
        callback(null, 'Archivo JSON inválido. Debe tener "nombre" y "dias".');
        return;
      }
      const nuevoId = generarIdRutina();
      saveRutinaUsuario(rutina, nuevoId);
      callback(nuevoId, null);
    } catch (err) {
      callback(null, 'Error al leer el archivo: ' + err.message);
    }
  };
  reader.readAsText(archivo);
}

export function generarIdRutina() {
  return `rutina_${Date.now()}`;
}

export function moverEjercicioRutina(rutinaId, diaIndex, ejercicioIndex, direccion) {
  const rutina = loadRutinaUsuario(rutinaId);
  if (!rutina?.dias[diaIndex]) return false;
  const ejercicios = rutina.dias[diaIndex].ejercicios;
  const newIndex = direccion === 'arriba' ? ejercicioIndex - 1 : ejercicioIndex + 1;
  if (newIndex < 0 || newIndex >= ejercicios.length) return false;
  [ejercicios[ejercicioIndex], ejercicios[newIndex]] = [ejercicios[newIndex], ejercicios[ejercicioIndex]];
  saveRutinaUsuario(rutina, rutinaId);
  return true;
}
