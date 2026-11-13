// metodos.js — Biblioteca de métodos de progresión e intensidad
//
// Hay dos tipos de entradas:
//  * AUTOMÁTICOS: la app los aplica sola (cambia series, descansos u objetivos y decide la subida de peso).
//  * GUÍA: se explican en la "Guía y Conceptos", pero la app no los programa (los aplicas tú a mano).
//
// Tipos de serie dentro de un ejercicio (ej.tipos[i]):
//   'n'     serie normal (cuenta para progresar y para los colores del rango de reps)
//   'mini'  mini-serie de rest-pause / myo-reps (mismo peso)
//   'drop'  bajada de peso (drop set)
//   'widow' serie "viuda" de 20+ reps con peso más ligero
// Las series que no son 'n' no cuentan para decidir si subes de peso ni para el color del rango.

const DEFECTO_PROG = 'doble';

// ═══════════════════════════ PROGRESIÓN ═══════════════════════════
export const PROGRESION = [
  {
    id: 'doble', nombre: 'Doble progresión',
    resumen: 'Trabajas dentro de un rango de reps. Cuando llegas al máximo en TODAS las series, subes peso y vuelves al mínimo.',
    detalle: 'Es la regla clásica de la app. Ejemplo 4×6-10 a 80 kg: 8/7/6/6 → 10/9/8/7 → 10/10/10/10 → sube a 82,5 kg y empiezas otra vez cerca de 6.'
  },
  {
    id: 'lineal', nombre: 'Lineal (sube cada sesión)',
    resumen: 'Si completas el objetivo en todas las series, subes el incremento la sesión siguiente.',
    detalle: 'El objetivo es el número de "Reps mín". Sirve con repeticiones fijas (5×5, 3×5…) y es lo habitual en principiantes, donde se puede progresar casi cada sesión. Si dejas de cumplir, el peso se queda hasta que lo logres.'
  },
  {
    id: 'escalera', nombre: 'Escalera de reps (8 → 9 → 10)',
    resumen: 'El objetivo de reps sube una cada sesión (en todas las series) hasta el máximo; entonces sube el peso y vuelve al mínimo.',
    detalle: 'Con rango 8-10: sesión 1 objetivo 8, sesión 2 objetivo 9, sesión 3 objetivo 10; al cumplir las 10 sube el peso y se repite desde 8. Si no cumples el objetivo, se repite la misma sesión en vez de avanzar. Es una versión más gradual de la doble progresión.'
  },
  {
    id: 'triple', nombre: 'Triple progresión (reps → series → peso)',
    resumen: 'Primero reps hasta el máximo, luego se añade una serie (hasta un tope), y al llegar al tope sube el peso y vuelve a las series base.',
    detalle: 'Parámetro: cuántas series extra puedes añadir (por defecto 2). Con 3 series base y 2 extra: 3×6-10 → al llegar a 10 en todas pasa a 4 series, luego a 5 series, y después sube el peso y vuelve a 3 series.'
  },
  {
    id: 'ninguna', nombre: 'Sin progresión automática',
    resumen: 'La app no sube el peso sola. Lo cambias tú cuando quieras.',
    detalle: 'Equivale a marcar "No prog." en el ejercicio. Útil para mantenimiento, rehabilitación o trabajo con RIR/RPE manual.'
  }
];

export function metodoProgPorId(id) { return PROGRESION.find(p => p.id === id) || PROGRESION.find(p => p.id === DEFECTO_PROG); }
export function nombreProg(id) { return metodoProgPorId(id).nombre; }

// Métodos que la app NO programa (solo explicados en la guía)
export const PROGRESION_GUIA = [
  { nombre: 'Autorregulación por RIR / RPE', texto: 'Eliges la carga por sensaciones: RIR 2 = te quedaban 2 repeticiones en reserva. Cada semana ajustas el peso para mantener ese RIR. Una regla orientativa habitual es subir o bajar un 2–2,5 % por cada 0,5 de RPE de diferencia con el objetivo. Requiere práctica para estimar bien el RIR (se suele subestimar al principio).' },
  { nombre: 'Porcentaje del 1RM', texto: 'Programas la carga como un % de tu máximo (real o estimado, ya lo calcula la app como "1RM ≈"). Cómodo para fuerza y ciclos planificados; el 1RM cambia con el tiempo y hay que reevaluarlo.' },
  { nombre: 'Ondas (wave loading)', texto: 'La carga sube y baja en ondas: por ejemplo 3 series de pesos crecientes y se repite en una segunda onda con un poco más de peso. Se usa sobre todo en fuerza.' },
  { nombre: 'Progresión por densidad', texto: 'Mismo trabajo en menos tiempo (reduces el descanso) o más trabajo en el mismo tiempo. Puede usarse cuando subir peso ya no es posible.' },
  { nombre: 'Progresión por tempo / rango de movimiento', texto: 'Más control en la fase excéntrica, pausas o más recorrido (si técnicamente es posible) con el mismo peso. Útil en lesiones o cuando no tienes discos más pequeños.' },
  { nombre: 'Escalera de series (rep ladder)', texto: 'Series de 2-4-6 u 8-10-12 reps con el mismo peso o pesos ajustados. Es una técnica de sesión; la escalera automática de esta app es la de objetivo por sesión (8 → 9 → 10).' }
];

// ═══════════════════ PERIODIZACIÓN Y ESTRUCTURA (guía) ═══════════════════
export const PERIODIZACION_GUIA = [
  { nombre: 'Lineal', texto: 'Con las semanas baja el volumen y sube la intensidad (menos reps, más peso). Clásica en fuerza.' },
  { nombre: 'Inversa', texto: 'Al revés: empiezas pesado y vas hacia más reps y menos peso. Se ha usado en fases orientadas a resistencia muscular.' },
  { nombre: 'Ondulante diaria (DUP)', texto: 'Cambias el rango de reps entre sesiones de la misma semana (p. ej. pesado 4-6 · medio 8-10 · ligero 12-15). Permite trabajar fuerza e hipertrofia a la vez.' },
  { nombre: 'Ondulante semanal', texto: 'Igual pero el cambio de rango es de una semana a otra.' },
  { nombre: 'Por bloques', texto: 'Bloques de semanas con un solo objetivo: acumulación (volumen), transformación (intensidad), realización (pico).' },
  { nombre: 'Conjugada', texto: 'Se alternan días de esfuerzo máximo y de esfuerzo dinámico y se rotan los ejercicios principales. Es avanzada.' },
  { nombre: 'Deload (descarga)', texto: 'Semana más ligera cada cierto tiempo. La app la tiene integrada (pesos al 70 %, series al 60 %) y se activa por rutina en el editor.' },
  { nombre: 'Splits', texto: 'Cuerpo completo (2-3 días), torso/pierna (4), empuje/tirón/pierna (3-6), por grupos (5-6). Lo que mejor funciona es el que puedes cumplir de forma constante.' }
];

// ═══════════════════════════ DESCANSOS (guía) ═══════════════════════════
export const DESCANSOS_GUIA = [
  { nombre: 'Multiarticulares pesados (sentadilla, peso muerto, press)', texto: 'Orientación: 3 minutos o más entre series cuando importa el rendimiento de la serie siguiente.' },
  { nombre: 'Aislamiento / accesorios', texto: 'Orientación: 1,5–2 minutos suelen bastar.' },
  { nombre: 'Descansos cortos (30–60 s)', texto: 'Útiles para ahorrar tiempo, con técnicas como superseries o circuitos; a cambio las series siguientes suelen salir con menos repeticiones.' },
  { nombre: 'Micro-descansos (10–20 s)', texto: 'Los usan el rest-pause, las myo-reps y los drop sets (ver abajo). La app los aplica sola a esas series.' },
  { nombre: 'Descanso automático por tu ejercicio', texto: 'Si no pones un descanso, la app sugiere 180 s (hasta 5 reps), 150 s (6–8), 90 s (9–12) o 60 s (más de 12).' }
];

// ═══════════════════════════ INTENSIDAD ═══════════════════════════
// params: { id, etiqueta, defecto, min, max }
export const INTENSIDAD = [
  {
    id: 'restpause', nombre: 'Rest-pause (pausa-descanso)',
    resumen: 'La última serie la llevas cerca del fallo, descansas 15–20 s y sigues con mini-series hasta cerca del fallo otra vez.',
    detalle: 'La app añade las mini-series al final del ejercicio (la última serie normal pasa a ser la serie principal) y fija el descanso corto entre ellas; el descanso normal vuelve tras la última mini-serie.',
    params: [
      { id: 'minis', etiqueta: 'Mini-series', defecto: 2, min: 1, max: 5 },
      { id: 'pausa', etiqueta: 'Pausa (s)', defecto: 20, min: 5, max: 60 }
    ]
  },
  {
    id: 'myo', nombre: 'Myo-reps',
    resumen: 'Una serie de activación cerca del fallo (≈12–20 reps) y después mini-series de 3–5 reps con descansos muy cortos (≈5 respiraciones, 10–15 s).',
    detalle: 'La app añade las mini-series y el descanso corto. Termina cuando no puedas igualar las repeticiones objetivo de la mini-serie. Conviene en ejercicios de aislamiento o máquinas estables.',
    params: [
      { id: 'minis', etiqueta: 'Mini-series', defecto: 4, min: 2, max: 8 },
      { id: 'pausa', etiqueta: 'Pausa (s)', defecto: 15, min: 5, max: 60 }
    ]
  },
  {
    id: 'drop', nombre: 'Drop set (series descendentes)',
    resumen: 'Al terminar la serie principal bajas el peso (≈20–30 %) y sigues sin descansar o con muy poco.',
    detalle: 'La app añade las bajadas, calcula el peso sugerido de cada una (redondeado a 0,5 kg) y deja 10 s para cambiar el peso. Las reps de las bajadas no cuentan para el volumen, el 1RM estimado ni la progresión, porque usan menos peso.',
    params: [
      { id: 'bajadas', etiqueta: 'Bajadas', defecto: 2, min: 1, max: 4 },
      { id: 'pct', etiqueta: '% de bajada', defecto: 25, min: 10, max: 40 }
    ]
  },
  {
    id: 'widow', nombre: 'Widowmaker (serie viuda, 20+ reps)',
    resumen: 'Una sola serie larga (≈20 reps o más) con un peso más ligero tras tu trabajo normal, parando a respirar si hace falta.',
    detalle: 'La app añade una serie final. Sus reps no cuentan para el volumen, el 1RM ni la progresión. Úsala con moderación: es muy exigente, sobre todo en sentadilla.',
    params: []
  },
  {
    id: 'gvt', nombre: '10×10 (German Volume Training)',
    resumen: '10 series de 10 repeticiones con el mismo peso y descansos cortos.',
    detalle: 'La app fija 10 series de 10 reps (mín = máx = 10) y 60 s de descanso para ese ejercicio. El peso lo eliges tú (se suele empezar con una carga con la que las 10 series sean posibles). La doble progresión sube el peso cuando completes 10×10.',
    params: []
  }
];

export function metodoIntPorId(id) { return INTENSIDAD.find(m => m.id === id) || null; }

// Técnicas explicadas pero NO programadas por la app
export const INTENSIDAD_GUIA = [
  { nombre: 'Series en racimo / micro-series (cluster)', texto: 'Divides una serie en bloques pequeños con 10–20 s entre ellos (p. ej. 6 reps como 3+3). Permite mover más peso o más reps totales. La app no lo programa: anotas el total de reps de la serie.' },
  { nombre: 'Superseries y series compuestas', texto: 'Superserie: dos ejercicios seguidos sin descanso (antagonistas, p. ej. bíceps y tríceps, ahorran tiempo). Serie compuesta: dos ejercicios para el mismo músculo seguidos.' },
  { nombre: 'Pre-agotamiento', texto: 'Un ejercicio de aislamiento antes del compuesto para el mismo músculo. Reduce la carga que podrás mover en el compuesto.' },
  { nombre: 'Series gigantes', texto: 'Cuatro o más ejercicios seguidos para un mismo grupo.' },
  { nombre: 'Dead-stop (parada completa)', texto: 'Cada repetición empieza desde reposo total en la posición inferior (p. ej. press desde los soportes, remo con pausa abajo). Elimina el rebote y la ayuda elástica.' },
  { nombre: 'Pausas e isométricos', texto: 'Mantener 1–3 s en el punto de mayor estiramiento o contracción. Se anota en el tempo del ejercicio.' },
  { nombre: 'Excéntricas / negativas', texto: 'Bajada lenta y controlada (3–5 s). También se anota en el tempo.' },
  { nombre: 'Repeticiones parciales y 21s', texto: 'Trabajar solo un tramo del recorrido (parciales) o 7 reps en el tramo inferior + 7 en el superior + 7 completas (21s).' },
  { nombre: 'Repeticiones forzadas', texto: 'Un compañero ayuda lo justo para completar reps tras el fallo. Requiere compañero y cuidado con la recuperación.' },
  { nombre: 'Series al fallo (HIT)', texto: 'Una o pocas series al fallo muscular con descanso amplio. La app tiene el cronómetro HIT y el modo "Al fallo" en el editor.' },
  { nombre: 'EMOM / circuitos', texto: 'Trabajo por tiempo (cada minuto en el minuto) o estaciones encadenadas. Orientado a acondicionamiento.' }
];

// ═══════════════════ EVALUACIÓN DE LA PROGRESIÓN ═══════════════════
export function indicesNormales(ej) {
  const n = (ej.reps || []).length;
  const tipos = ej.tipos || [];
  const out = [];
  for (let i = 0; i < n; i++) if (!tipos[i] || tipos[i] === 'n') out.push(i);
  return out;
}

const hecha = r => r !== '' && r !== null && r !== undefined;

// Objetivo de reps de la sesión: solo cambia con la escalera (usa el estado guardado)
export function objetivoReps(ej, estado) {
  const id = ej.metodoProgId || DEFECTO_PROG;
  if (id === 'escalera') {
    const paso = Math.max(0, Number(estado?.paso) || 0);
    return Math.min(ej.repsMin + paso, ej.repsMax);
  }
  if (id === 'lineal') return ej.repsMin;
  return ej.repsMax;
}

// Decide si hay progresión tras la sesión.
// Devuelve { progresa, pesoNuevo, seriesNuevas, estado, texto }
//   progresa: sube el peso
//   estado: nuevo estado del método para ese ejercicio (se guarda en config.metodoEstado)
export function evaluarProgresion(ej, estadoPrevio) {
  const id = ej.metodoProgId || DEFECTO_PROG;
  const est = { ...(estadoPrevio || {}) };
  const idx = indicesNormales(ej);
  const reps = idx.map(i => ej.reps[i]);
  const completas = reps.length > 0 && reps.every(hecha);
  const todasAlcanzan = objetivo => completas && reps.every(r => Number(r) >= objetivo);
  const subir = () => parseFloat((ej.peso + ej.incremento).toFixed(2));
  const res = { progresa: false, pesoNuevo: ej.peso, estado: est, texto: '' };

  if (ej.alFallo || ej.noProgresar || id === 'ninguna' || !(ej.repsMax > 0)) return res;

  if (id === 'lineal') {
    if (todasAlcanzan(ej.repsMin)) { res.progresa = true; res.pesoNuevo = subir(); }
    return res;
  }

  if (id === 'escalera') {
    const objetivo = objetivoReps(ej, est);
    if (todasAlcanzan(objetivo)) {
      if (objetivo >= ej.repsMax) { res.progresa = true; res.pesoNuevo = subir(); est.paso = 0; res.texto = `Escalera completa (${ej.repsMax} reps)`; }
      else { est.paso = (Number(est.paso) || 0) + 1; res.texto = `Escalera: la próxima sesión, objetivo ${Math.min(ej.repsMin + est.paso, ej.repsMax)} reps`; }
    }
    return res;
  }

  if (id === 'triple') {
    if (todasAlcanzan(ej.repsMax)) {
      const extra = Number(est.extra) || 0;
      const extraMax = Math.max(0, Number(ej.metodoProgParams?.extraMax ?? 2));
      if (extra < extraMax) {
        est.extra = extra + 1;
        res.texto = `Triple progresión: la próxima sesión, ${(ej.seriesBase ?? ej.series) + est.extra} series`;
      } else {
        res.progresa = true; res.pesoNuevo = subir(); est.extra = 0;
        res.texto = `Triple progresión completa: vuelve a ${ej.seriesBase ?? ej.series} series`;
      }
    }
    return res;
  }

  // doble (por defecto)
  if (todasAlcanzan(ej.repsMax)) { res.progresa = true; res.pesoNuevo = subir(); }
  return res;
}

// ═══════════════════ ESTRUCTURA DE SERIES (INTENSIDAD) ═══════════════════
// Modifica el ejercicio (ya cargado) según el método de intensidad. No guarda nada: se recalcula al abrir el día.
// Pone: ej.series, ej.tipos[], ej.descansosSerie[] (seg. de descanso DESPUÉS de cada serie), ej.pistas[] (placeholder de cada casilla),
//       ej.notaMetodo (texto breve que se muestra bajo las series).
const redondear05 = n => Math.max(0.5, Math.round(n / 0.5) * 0.5);

export function aplicarIntensidad(ej, metodo) {
  const def = metodoIntPorId(metodo?.id);
  if (!def || ej.alFallo) return ej;
  const p = { ...Object.fromEntries(def.params.map(x => [x.id, x.defecto])), ...(metodo.params || {}) };
  const clamp = (v, par) => Math.min(par.max, Math.max(par.min, Math.round(Number(v) || par.defecto)));
  def.params.forEach(par => { p[par.id] = clamp(p[par.id], par); });
  const base = ej.descanso || 90;
  ej.metodoIntId = def.id;

  if (def.id === 'gvt') {
    ej.series = 10; ej.repsMin = 10; ej.repsMax = 10; ej.descanso = 60;
    ej.tipos = Array(10).fill('n');
    ej.descansosSerie = null;
    ej.pistas = Array(10).fill('');
    ej.notaMetodo = '10×10 · descanso 60 s';
    return ej;
  }

  const n = ej.series;
  if (def.id === 'restpause' || def.id === 'myo') {
    const k = p.minis;
    ej.tipos = [...Array(n).fill('n'), ...Array(k).fill('mini')];
    ej.series = n + k;
    ej.descansosSerie = Array(n + k).fill(base);
    ej.descansosSerie[n - 1] = p.pausa;                      // tras la serie principal
    for (let i = 0; i < k - 1; i++) ej.descansosSerie[n + i] = p.pausa;   // entre mini-series (tras la última vuelve el normal)
    ej.pistas = [...Array(n).fill(''), ...Array.from({ length: k }, (_, i) => `M${i + 1}`)];
    ej.notaMetodo = def.id === 'restpause'
      ? `Rest-pause: tras la última serie, ${p.pausa} s y ${k} mini-serie${k > 1 ? 's' : ''} hasta cerca del fallo`
      : `Myo-reps: tras la serie de activación, ${k} mini-series de 3–5 reps con ${p.pausa} s de pausa`;
    return ej;
  }

  if (def.id === 'drop') {
    const k = p.bajadas;
    ej.tipos = [...Array(n).fill('n'), ...Array(k).fill('drop')];
    ej.series = n + k;
    ej.descansosSerie = Array(n + k).fill(base);
    ej.descansosSerie[n - 1] = 10;
    for (let i = 0; i < k - 1; i++) ej.descansosSerie[n + i] = 10;
    const pesos = [];
    let w = ej.peso;
    for (let i = 0; i < k; i++) { w = redondear05(w * (1 - p.pct / 100)); pesos.push(w); }
    ej.pistas = [...Array(n).fill(''), ...pesos.map(x => `↓${x}`)];
    ej.notaMetodo = ej.peso > 0
      ? `Drop set: tras la última serie baja a ${pesos.join(' → ')} kg (−${p.pct} % cada vez), sin descansar`
      : `Drop set: tras la última serie baja el peso un ${p.pct} % ${k} vez/veces, sin descansar`;
    return ej;
  }

  if (def.id === 'widow') {
    ej.tipos = [...Array(n).fill('n'), 'widow'];
    ej.series = n + 1;
    ej.descansosSerie = null;
    ej.pistas = [...Array(n).fill(''), '20+'];
    ej.notaMetodo = 'Widowmaker: una serie final de 20+ reps con un peso más ligero (no cuenta para la progresión)';
    return ej;
  }
  return ej;
}

// Reps que cuentan para volumen / 1RM / récords (no las de bajadas ni de la serie viuda)
export function repsContables(ej) {
  const tipos = ej.tipos;
  const reps = ej.reps || [];
  if (!Array.isArray(tipos)) return reps;
  return reps.filter((_, i) => !tipos[i] || tipos[i] === 'n' || tipos[i] === 'mini');
}

// Descanso (s) que corresponde tras la serie `idx` (0-based); sin dato, el del ejercicio
export function descansoTrasSerie(ej, idx) {
  const d = ej.descansosSerie?.[idx];
  return d > 0 ? d : (ej.descanso || 90);
}

// ═══════════════════ HTML DE LA GUÍA ═══════════════════
function esc(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
const itemHtml = (titulo, texto, marca = '') =>
  `<div class="guia-item"><h4>${esc(titulo)}${marca}</h4><p>${esc(texto)}</p></div>`;
const AUTO = ` <span class="badge-auto" title="La app lo aplica sola">⚙️ automático</span>`;
const MANUAL = ` <span class="badge-manual" title="Solo informativo: lo aplicas tú">📖 guía</span>`;

export function htmlGuiaMetodos() {
  return `
  <div class="guia-section" id="guia-metodos">
    <h3>🧰 Métodos de progresión</h3>
    <p>Cómo decide la app cuándo subir peso. Elige uno para toda la rutina (editor de rutinas) y, si quieres, otro distinto para ejercicios concretos. Los marcados ⚙️ los aplica la app sola; los marcados 📖 son solo explicación.</p>
    ${PROGRESION.map(m => itemHtml(m.nombre, `${m.resumen} ${m.detalle}`, AUTO)).join('')}
    ${PROGRESION_GUIA.map(m => itemHtml(m.nombre, m.texto, MANUAL)).join('')}
  </div>
  <div class="guia-section">
    <h3>🔥 Métodos de intensidad (series)</h3>
    <p>Se aplican por ejercicio (editor → "Método de intensidad"). La app cambia las series y los descansos de ese ejercicio al abrir el día; no modifica tu rutina guardada, así que puedes quitarlos cuando quieras. Durante una semana de deload no se aplican.</p>
    ${INTENSIDAD.map(m => itemHtml(m.nombre, `${m.resumen} ${m.detalle}`, AUTO)).join('')}
    ${INTENSIDAD_GUIA.map(m => itemHtml(m.nombre, m.texto, MANUAL)).join('')}
  </div>
  <div class="guia-section">
    <h3>⏳ Descansos entre series</h3>
    ${DESCANSOS_GUIA.map(m => itemHtml(m.nombre, m.texto)).join('')}
  </div>
  <div class="guia-section">
    <h3>🗓️ Periodización y estructura</h3>
    <p>Son formas de organizar semanas y sesiones. La app no las programa; puedes reflejarlas creando varias rutinas (editor) o días con distintos rangos de reps.</p>
    ${PERIODIZACION_GUIA.map(m => itemHtml(m.nombre, m.texto, MANUAL)).join('')}
  </div>`;
}
