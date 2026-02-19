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
        { nombre: "Press banca", peso: 80, series: 4, repsMin: 3, repsMax: 5 },
        { nombre: "Press militar", peso: 50, series: 4, repsMin: 3, repsMax: 5 },
        { nombre: "Remo con barra", peso: 70, series: 4, repsMin: 3, repsMax: 5 },
        { nombre: "Press jabalina", peso: 40, series: 3, repsMin: 3, repsMax: 5 },
        { nombre: "Dominada supina", peso: 0, series: 4, repsMin: 5, repsMax: 8 },
        { nombre: "Fondos en paralelas", peso: 0, series: 3, repsMin: 5, repsMax: 8 },
        { nombre: "Elevaciones laterales", peso: 5, series: 3, repsMin: 12, repsMax: 15 },
        { nombre: "Encogimientos", peso: 0, series: 2, repsMin: 8, repsMax: 10 }
      ]
    },
    {
      nombre: "Día 2 – Pierna Fuerza",
      tieneCronometro: false,
      tieneTimer: true,
      ejercicios: [
        { nombre: "Sentadilla trasera", peso: 100, series: 4, repsMin: 3, repsMax: 5 },
        { nombre: "Peso muerto convencional", peso: 80, series: 3, repsMin: 3, repsMax: 5 },
        { nombre: "Buenos días", peso: 20, series: 2, repsMin: 6, repsMax: 6 },
        { nombre: "Elevaciones de piernas colgado", peso: 0, series: 3, repsMin: 8, repsMax: 10, alFallo: true },
        { nombre: "Jalón abdominal con peso", peso: 20, series: 3, repsMin: 10, repsMax: 10 },
        { nombre: "Sentadilla a una pierna", peso: 0, series: 2, repsMin: 5, repsMax: 5 }
      ]
    },
    {
      nombre: "Día 3 – Torso Hipertrofia",
      tieneCronometro: false,
      tieneTimer: true,
      ejercicios: [
        { nombre: "Press militar", peso: 40, series: 4, repsMin: 8, repsMax: 10 },
        { nombre: "Press banca", peso: 60, series: 4, repsMin: 8, repsMax: 10 },
        { nombre: "Dominadas prono", peso: 0, series: 3, repsMin: 0, repsMax: 1, alFallo: true },
        { nombre: "Press banca inclinado", peso: 50, series: 3, repsMin: 8, repsMax: 10 },
        { nombre: "Remo con barra", peso: 50, series: 3, repsMin: 8, repsMax: 10 },
        { nombre: "Curl bíceps", peso: 15, series: 3, repsMin: 10, repsMax: 12 },
        { nombre: "Curl invertido", peso: 0, series: 2, repsMin: 10, repsMax: 10 },
        { nombre: "Tríceps francés / fondos ligeros", peso: 10, series: 3, repsMin: 10, repsMax: 12 }
      ]
    },
    {
      nombre: "Día 4 – Pierna Hipertrofia",
      tieneCronometro: false,
      tieneTimer: true,
      ejercicios: [
        { nombre: "Sentadilla frontal", peso: 60, series: 4, repsMin: 8, repsMax: 10 },
        { nombre: "Peso muerto rumano", peso: 70, series: 4, repsMin: 8, repsMax: 10 },
        { nombre: "Desplantes con barra", peso: 30, series: 4, repsMin: 8, repsMax: 10 },
        { nombre: "Elevación de talones", peso: 0, series: 4, repsMin: 12, repsMax: 15 },
        { nombre: "Peso muerto unilateral", peso: 20, series: 2, repsMin: 6, repsMax: 8 },
        { nombre: "Roll-out", peso: 0, series: 4, repsMin: 10, repsMax: 10, alFallo: true }
      ]
    },
    {
      nombre: "Día 5 – Potencia",
      tieneCronometro: true,
      tieneTimer: true,
      ejercicios: [
        { nombre: "Clean", peso: 40, series: 5, repsMin: 3, repsMax: 3 }
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
  if (!confirm("¿Restaurar la rutina base a sus valores originales? Se perderán todos los cambios.")) return false;
  const rutinas = JSON.parse(localStorage.getItem("rutinas_usuario")) || {};
  rutinas[RUTINA_BASE_ID] = JSON.parse(JSON.stringify(RUTINA_BASE_ORIGINAL));
  localStorage.setItem("rutinas_usuario", JSON.stringify(rutinas));
  alert("✅ Rutina base restaurada");
  return true;
}

export function saveRutinaUsuario(rutina, rutinaId) {
  const rutinas = JSON.parse(localStorage.getItem("rutinas_usuario")) || {};
  rutinas[rutinaId] = rutina;
  localStorage.setItem("rutinas_usuario", JSON.stringify(rutinas));
}

export function loadRutinaUsuario(rutinaId) {
  const rutinas = JSON.parse(localStorage.getItem("rutinas_usuario")) || {};
  return rutinas[rutinaId] || null;
}

export function getAllRutinasUsuario() {
  return JSON.parse(localStorage.getItem("rutinas_usuario")) || {};
}

export function deleteRutinaUsuario(rutinaId) {
  if (rutinaId === RUTINA_BASE_ID) {
    alert("❌ No puedes borrar la rutina base. Usa 'Restaurar' si quieres resetearla.");
    return false;
  }
  const rutinas = JSON.parse(localStorage.getItem("rutinas_usuario")) || {};
  delete rutinas[rutinaId];
  localStorage.setItem("rutinas_usuario", JSON.stringify(rutinas));
  return true;
}

export function generarIdRutina() {
  return `rutina_${Date.now()}`;
}

export function moverEjercicioRutina(rutinaId, diaIndex, ejercicioIndex, direccion) {
  const rutina = loadRutinaUsuario(rutinaId);
  if (!rutina || !rutina.dias[diaIndex]) return false;
  const ejercicios = rutina.dias[diaIndex].ejercicios;
  const newIndex = direccion === 'arriba' ? ejercicioIndex - 1 : ejercicioIndex + 1;
  if (newIndex < 0 || newIndex >= ejercicios.length) return false;
  [ejercicios[ejercicioIndex], ejercicios[newIndex]] = [ejercicios[newIndex], ejercicios[ejercicioIndex]];
  saveRutinaUsuario(rutina, rutinaId);
  return true;
}
