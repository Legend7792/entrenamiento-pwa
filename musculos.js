// musculos.js — Grupos musculares y subzonas (lista única para el editor, la pantalla del día y las estadísticas)
//
// Las subzonas son una ETIQUETA orientativa para que anotes qué parte quieres enfatizar con un ejercicio
// (p. ej. "cabeza larga" en un tríceps). La evidencia sobre hipertrofia "regional" es limitada y heterogénea:
// úsalas como organización personal, no como garantía de que un ejercicio trabaje solo esa porción.

export const MUSCULOS = [
  { id: 'pectoral',  etiqueta: '🫀 Pectoral',      corta: '🫀 Pectoral' },
  { id: 'espalda',   etiqueta: '🔙 Espalda',       corta: '🔙 Espalda' },
  { id: 'hombro',    etiqueta: '💪 Hombro',        corta: '💪 Hombro' },
  { id: 'bicep',     etiqueta: '💪 Bícep',         corta: '💪 Bícep' },
  { id: 'tricep',    etiqueta: '💪 Trícep',        corta: '💪 Trícep' },
  { id: 'antebrazo', etiqueta: '🦾 Antebrazo',     corta: '🦾 Antebrazo' },
  { id: 'cuadricep', etiqueta: '🦵 Cuádricep',     corta: '🦵 Cuádr.' },
  { id: 'isquio',    etiqueta: '🦵 Isquiotibial',  corta: '🦵 Isquio.' },
  { id: 'gluteo',    etiqueta: '🍑 Glúteo',        corta: '🍑 Glúteo' },
  { id: 'gemelo',    etiqueta: '🦶 Gemelo',        corta: '🦶 Gemelo' },
  { id: 'core',      etiqueta: '🎯 Core/Abdomen',  corta: '🎯 Core' }
];

export const MUSCULOS_MAP = Object.fromEntries(MUSCULOS.map(m => [m.id, m.corta]));

// [id, etiqueta]
export const SUBZONAS = {
  pectoral:  [['superior', 'Superior (clavicular)'], ['medio', 'Medio (esternal)'], ['inferior', 'Inferior']],
  espalda:   [['dorsal', 'Dorsal ancho'], ['media', 'Espalda media (romboides / trapecio medio)'], ['trapecio_sup', 'Trapecio superior'], ['lumbar', 'Zona lumbar']],
  hombro:    [['anterior', 'Anterior'], ['lateral', 'Lateral (medio)'], ['posterior', 'Posterior']],
  bicep:     [['larga', 'Cabeza larga'], ['corta', 'Cabeza corta'], ['braquial', 'Braquial']],
  tricep:    [['larga', 'Cabeza larga'], ['lateral', 'Cabeza lateral'], ['medial', 'Cabeza medial']],
  antebrazo: [['flexores', 'Flexores'], ['extensores', 'Extensores'], ['braquiorradial', 'Braquiorradial']],
  cuadricep: [['recto', 'Recto femoral'], ['vasto_lateral', 'Vasto lateral'], ['vasto_medial', 'Vasto medial']],
  isquio:    [['biceps_femoral', 'Bíceps femoral'], ['semis', 'Semitendinoso / semimembranoso']],
  gluteo:    [['mayor', 'Glúteo mayor'], ['medio', 'Glúteo medio']],
  gemelo:    [['gastrocnemio', 'Gastrocnemio'], ['soleo', 'Sóleo']],
  core:      [['recto', 'Recto abdominal'], ['oblicuos', 'Oblicuos'], ['transverso', 'Transverso']]
};

export function etiquetaSubzona(musculo, subzona) {
  const par = (SUBZONAS[musculo] || []).find(([id]) => id === subzona);
  return par ? par[1] : '';
}

// <option> de músculos (con el valor actual seleccionado)
export function opcionesMusculo(actual, escapar = s => s) {
  return `<option value="">— Sin especificar —</option>` +
    MUSCULOS.map(m => `<option value="${escapar(m.id)}"${m.id === actual ? ' selected' : ''}>${escapar(m.etiqueta)}</option>`).join('');
}

// <option> de subzonas del músculo dado
export function opcionesSubzona(musculo, actual, escapar = s => s) {
  return `<option value="">— Toda la zona —</option>` +
    (SUBZONAS[musculo] || []).map(([id, et]) => `<option value="${escapar(id)}"${id === actual ? ' selected' : ''}>${escapar(et)}</option>`).join('');
}
