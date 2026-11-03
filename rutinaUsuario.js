// rutinaUsuario.js — v99
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

function leerRutinas() {
  try {
    const r = JSON.parse(localStorage.getItem("rutinas_usuario"));
    return (r && typeof r === "object" && !Array.isArray(r)) ? r : {};
  } catch { return {}; }
}

function guardarRutinas(rutinas) {
  localStorage.setItem("rutinas_usuario", JSON.stringify(rutinas));
  if (typeof window !== 'undefined' && window.markDirty) window.markDirty();
}

// Normaliza una rutina importada: garantiza estructura mínima válida y números sanos
export function normalizarRutina(r) {
  if (!r || typeof r !== 'object' || typeof r.nombre !== 'string' || !r.nombre.trim() || !Array.isArray(r.dias)) return null;
  const num = (v, d, min = 0) => { const n = Number(v); return Number.isFinite(n) && n >= min ? n : d; };
  const out = { nombre: r.nombre.trim().slice(0, 80), dias: [] };
  if (r.tieneDeload === true) out.tieneDeload = true;
  const diasUsados = new Set();   // dos días con el mismo nombre compartirían pesos, notas e historial
  for (const d of r.dias) {
    if (!d || typeof d !== 'object') continue;
    const nombreBaseDia = String(d.nombre || `Día ${out.dias.length + 1}`).slice(0, 80);
    let nombreDia = nombreBaseDia, nd = 1;
    while (diasUsados.has(nombreDia.toLowerCase())) { const suf = ` (${++nd})`; nombreDia = nombreBaseDia.slice(0, 80 - suf.length) + suf; }
    diasUsados.add(nombreDia.toLowerCase());
    const dia = {
      nombre: nombreDia,
      tieneCronometro: d.tieneCronometro === true,
      tieneTimer: d.tieneTimer !== false,
      ejercicios: []
    };
    const usados = new Set();   // dos ejercicios con el mismo nombre en un día compartirían pesos e historial
    for (const e of (Array.isArray(d.ejercicios) ? d.ejercicios : [])) {
      if (!e || typeof e.nombre !== 'string' || !e.nombre.trim()) continue;
      const repsMin = Math.max(0, Math.round(num(e.repsMin, 8)));
      const repsMax = Math.max(repsMin, Math.round(num(e.repsMax, repsMin || 12)));
      let nombreEj = e.nombre.trim().slice(0, 74), n = 1, candidato = nombreEj;
      while (usados.has(candidato.toLowerCase())) candidato = `${nombreEj} (${++n})`;
      usados.add(candidato.toLowerCase());
      dia.ejercicios.push({
        nombre: candidato,
        peso: num(e.peso, 0),
        series: Math.max(1, Math.round(num(e.series, 3, 1))),
        repsMin, repsMax,
        descanso: Math.round(num(e.descanso, 90)),
        tempo: String(e.tempo || '').slice(0, 20),
        notas: String(e.notas || '').slice(0, 500),
        alFallo: e.alFallo === true,
        musculo: typeof e.musculo === 'string' ? e.musculo : ''
      });
    }
    out.dias.push(dia);
  }
  return out;
}

export function inicializarRutinaBase() {
  const rutinas = leerRutinas();
  if (!rutinas[RUTINA_BASE_ID]) {
    rutinas[RUTINA_BASE_ID] = JSON.parse(JSON.stringify(RUTINA_BASE_ORIGINAL));
    localStorage.setItem("rutinas_usuario", JSON.stringify(rutinas));
  }
  // Rutinas dañadas (sin dias): repararlas para que el editor no se rompa
  let reparado = false;
  Object.keys(rutinas).forEach(id => {
    const r = rutinas[id];
    if (!r || !Array.isArray(r.dias)) { rutinas[id] = { nombre: (r && r.nombre) || "Rutina", dias: [] }; reparado = true; }
    else r.dias.forEach(d => { if (!Array.isArray(d.ejercicios)) { d.ejercicios = []; reparado = true; } });
  });
  if (reparado) localStorage.setItem("rutinas_usuario", JSON.stringify(rutinas));
}

export function restaurarRutinaBase() {
  const rutinas = leerRutinas();
  rutinas[RUTINA_BASE_ID] = JSON.parse(JSON.stringify(RUTINA_BASE_ORIGINAL));
  guardarRutinas(rutinas);
  return true;
}

export function saveRutinaUsuario(rutina, rutinaId) {
  const rutinas = leerRutinas();
  rutinas[rutinaId] = rutina;
  guardarRutinas(rutinas);
}

export function loadRutinaUsuario(rutinaId) {
  return leerRutinas()[rutinaId] || null;
}

export function getAllRutinasUsuario() {
  return leerRutinas();
}

export function deleteRutinaUsuario(rutinaId) {
  if (rutinaId === RUTINA_BASE_ID) return false;
  const rutinas = leerRutinas();
  delete rutinas[rutinaId];
  guardarRutinas(rutinas);
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
  a.download = `rutina_${String(rutina.nombre).replace(/[^a-z0-9]/gi, '_')}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);   // si se revoca al instante algunos navegadores cancelan la descarga
}

export function importarRutinaDesdeJSON(archivo, callback) {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const rutina = normalizarRutina(JSON.parse(e.target.result));
      if (!rutina) {
        callback(null, 'Archivo JSON inválido. Debe tener "nombre" y "dias" (con ejercicios).');
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

let _ultimoId = 0;
export function generarIdRutina() {
  // Único aunque se llame dos veces en el mismo milisegundo
  let t = Date.now();
  if (t <= _ultimoId) t = _ultimoId + 1;
  _ultimoId = t;
  return `rutina_${t}`;
}

// Mueve un elemento de una lista de la posición `desde` a la posición final `hasta`
function moverElemento(lista, desde, hasta) {
  const [x] = lista.splice(desde, 1);
  lista.splice(hasta, 0, x);
}

function indicesValidos(lista, desde, hasta) {
  return Array.isArray(lista) && Number.isInteger(desde) && Number.isInteger(hasta) &&
    desde !== hasta && desde >= 0 && hasta >= 0 && desde < lista.length && hasta < lista.length;
}

// Cambia de posición un día dentro de la rutina (arrastrar para reordenar). Es seguro porque la
// configuración, las notas y el historial se guardan por NOMBRE de día, no por su posición.
export function reordenarDiaRutina(rutinaId, desde, hasta) {
  const rutina = loadRutinaUsuario(rutinaId);
  if (!rutina || !indicesValidos(rutina.dias, desde, hasta)) return false;
  moverElemento(rutina.dias, desde, hasta);
  saveRutinaUsuario(rutina, rutinaId);
  return true;
}

export function reordenarEjercicioRutina(rutinaId, diaIndex, desde, hasta) {
  const rutina = loadRutinaUsuario(rutinaId);
  const ejercicios = rutina?.dias?.[diaIndex]?.ejercicios;
  if (!indicesValidos(ejercicios, desde, hasta)) return false;
  moverElemento(ejercicios, desde, hasta);
  saveRutinaUsuario(rutina, rutinaId);
  return true;
}

// ¿Existe ya un día con ese nombre? (sin distinguir mayúsculas; `idxPropio` se ignora al renombrar)
export function nombreDiaRepetido(dias, nombre, idxPropio = -1) {
  const n = String(nombre).trim().toLowerCase();
  return (dias || []).some((d, i) => i !== idxPropio && String(d.nombre).trim().toLowerCase() === n);
}

// "Día 1 (copia)", "Día 1 (copia 2)"… el primero que no exista
export function nombreCopiaDia(dias, nombre) {
  const base = String(nombre);
  for (let n = 1; n < 1000; n++) {
    const sufijo = n === 1 ? ' (copia)' : ` (copia ${n})`;
    const cand = base.slice(0, Math.max(1, 80 - sufijo.length)) + sufijo;
    if (!nombreDiaRepetido(dias, cand)) return cand;
  }
  return base + ' (copia ' + Date.now() + ')';
}

// Duplica un día justo debajo del original (copia profunda: ejercicios, notas, tempos, descansos, timers).
// Devuelve { indice, nombre, nombreOrigen, ejercicios } o null.
export function duplicarDiaRutina(rutinaId, diaIndex) {
  const rutina = loadRutinaUsuario(rutinaId);
  const origen = rutina?.dias?.[diaIndex];
  if (!origen) return null;
  const copia = JSON.parse(JSON.stringify(origen));
  copia.nombre = nombreCopiaDia(rutina.dias, origen.nombre);
  rutina.dias.splice(diaIndex + 1, 0, copia);
  saveRutinaUsuario(rutina, rutinaId);
  return { indice: diaIndex + 1, nombre: copia.nombre, nombreOrigen: origen.nombre, ejercicios: (copia.ejercicios || []).map(e => e.nombre) };
}
