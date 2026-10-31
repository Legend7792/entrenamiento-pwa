// aiImport.js — Importador de rutinas con parser inteligente + IA opcional
import { saveRutinaUsuario, generarIdRutina, normalizarRutina } from './rutinaUsuario.js';
import { renderizarSelectorRutinas } from './selectorRutinas.js';
import { showToast, showAlert, escapeHtml } from './ui.js';
import { navPush } from './nav.js';

// ============================================================
// PARSER INTELIGENTE (sin API key)
// Formato esperado por bloque de ejercicio:
//   Nombre del ejercicio
//   4x6-8
//   3 min / 90 seg / 60s
//   3-1-1   (tempo, opcional)
//   Notas técnicas (opcional)
//   [línea vacía separa ejercicios]
// ============================================================

const RE_TEMPO    = /^\d+-\d+-\d+(?:-\d+)?$/;
const RE_SETS     = /^(\d+)\s*[xX×]\s*(\d+)(?:\s*[-–]\s*(\d+))?(?:\s*reps?)?$/i;
const RE_DESCANSO = /^(?:descanso|rest)?\s*:?\s*(?:(\d+(?:[.,]\d+)?)\s*(min(?:uto)?s?|m|seg(?:undo)?s?|sec|s)|(\d+):(\d{2}))$/i;

// Devuelve segundos, o null si el texto NO es exactamente una duración
function parsearTiempoDescanso(texto) {
  const m = String(texto || '').trim().match(RE_DESCANSO);
  if (!m) return null;
  if (m[3] !== undefined) return parseInt(m[3]) * 60 + parseInt(m[4]);
  const n = parseFloat(m[1].replace(',', '.'));
  return /^m(in|$)/i.test(m[2]) ? Math.round(n * 60) : Math.round(n);
}

function parsearSetsReps(texto) {
  const m = String(texto || '').trim().match(RE_SETS);
  if (!m) return null;
  const series = parseInt(m[1]);
  const min = parseInt(m[2]);
  const max = m[3] !== undefined ? parseInt(m[3]) : min;
  return { series, repsMin: Math.min(min, max), repsMax: Math.max(min, max) };
}

function esTempo(texto)     { return RE_TEMPO.test(texto.trim()); }
function esSetsReps(texto)  { return RE_SETS.test(texto.trim()); }
function esDescanso(texto)  { return parsearTiempoDescanso(texto) !== null; }

// "Al fallo" real: la palabra aparece y NO está negada ("no llegar al fallo", "sin fallo"...)
function indicaAlFallo(notas) {
  const t = String(notas || '').toLowerCase();
  const re = /fallo/g;
  let m;
  while ((m = re.exec(t)) !== null) {
    const antes = t.slice(Math.max(0, m.index - 30), m.index);
    const negado = /(\bno\b|\bsin\b|evit\w*|nunca|jam[aá]s|antes d\w*|lejos d\w*|cerca d\w*)[^.;]*$/.test(antes);
    if (!negado) return true;
  }
  return false;
}

// Línea de configuración con todo junto y sin separadores: "4x6-8 3 min 3-1-1"
function parsearLineaConfigLibre(linea, resultado) {
  const t = linea.trim();
  if (!/^\d+\s*[xX×]\s*\d+/.test(t)) return false;
  const sets = t.match(/^(\d+\s*[xX×]\s*\d+(?:\s*[-–]\s*\d+)?)/);
  if (!sets) return false;
  let resto = t.slice(sets[0].length);
  const sr = parsearSetsReps(sets[1]);
  if (!sr) return false;
  const tempo = resto.match(/(?:^|\s)(\d+-\d+-\d+(?:-\d+)?)(?=\s|$)/);
  if (tempo) resto = resto.replace(tempo[1], ' ');
  const desc = resto.match(/(\d+(?:[.,]\d+)?\s*(?:min(?:uto)?s?|seg(?:undo)?s?|sec|s)\b|\d+:\d{2})/i);
  if (desc) resto = resto.replace(desc[1], ' ');
  // Si queda texto que no sea ruido, no es una línea de configuración pura
  if (resto.replace(/[·|,;\s]|reps?|descanso/gi, '').length > 0) return false;
  Object.assign(resultado, sr);
  if (desc) resultado.descanso = parsearTiempoDescanso(desc[1].trim()) ?? resultado.descanso;
  if (tempo) resultado.tempo = tempo[1];
  return true;
}

function parsearBloqueEjercicio(lineas) {
  if (lineas.length === 0) return null;

  const resultado = {
    nombre: '', series: 3, repsMin: 8, repsMax: 12,
    peso: 0, descanso: 90, tempo: '', notas: '', alFallo: false
  };

  resultado.nombre = lineas[0].trim().replace(/^[-•*\d.)\s]+(?=[A-Za-zÁÉÍÓÚÑáéíóúñ])/, '');
  const notasLineas = [];

  for (let i = 1; i < lineas.length; i++) {
    const lineaOriginal = lineas[i].trim();
    if (!lineaOriginal) continue;

    const partes = lineaOriginal.split(/\s*[·|]\s*/).map(x => x.trim()).filter(Boolean);
    if (partes.length === 1 && parsearLineaConfigLibre(lineaOriginal, resultado)) continue;

    const sobrantes = [];
    for (const p of partes) {
      if (esSetsReps(p))        Object.assign(resultado, parsearSetsReps(p));
      else if (esDescanso(p))   resultado.descanso = parsearTiempoDescanso(p);
      else if (esTempo(p))      resultado.tempo = p;
      else                      sobrantes.push(p);
    }
    // Todo lo que no sea configuración es nota (antes se perdía si la línea tenía varias partes)
    if (sobrantes.length) notasLineas.push(sobrantes.join(' · '));
  }

  resultado.notas = notasLineas.join(' ').trim();
  resultado.alFallo = indicaAlFallo(resultado.notas);

  return resultado.nombre ? resultado : null;
}

export function parsearRutinaTexto(texto, nombreDia = 'Día 1') {
  // Dividir por líneas vacías para separar bloques de ejercicios
  const bloques = texto.trim().split(/\n\s*\n/);
  const ejercicios = [];

  for (const bloque of bloques) {
    const lineas = bloque.split('\n').filter(l => l.trim());
    if (lineas.length === 0) continue;

    const ej = parsearBloqueEjercicio(lineas);
    if (ej) ejercicios.push(ej);
  }

  return {
    nombre: nombreDia,
    tieneCronometro: false,
    tieneTimer: true,
    ejercicios
  };
}

// ============================================================
// IMPORTAR CON IA (requiere API key de Anthropic)
// ============================================================
// Modelo vigente (el anterior claude-sonnet-4-20250514 fue retirado el 15-jun-2026)
const MODELO_IA = 'claude-sonnet-5-5';

async function parsearConIA(texto, apiKey) {
  const prompt = `Eres un asistente que convierte rutinas de entrenamiento en JSON estructurado.

El usuario te da una rutina en texto. Debes devolver ÚNICAMENTE un JSON válido con esta estructura exacta, sin markdown, sin explicaciones:

{
  "dias": [
    {
      "nombre": "Nombre del día",
      "tieneCronometro": false,
      "tieneTimer": true,
      "ejercicios": [
        {
          "nombre": "Nombre del ejercicio",
          "series": 4,
          "repsMin": 6,
          "repsMax": 8,
          "peso": 0,
          "descanso": 180,
          "tempo": "3-1-1",
          "notas": "Notas técnicas aquí",
          "alFallo": false
        }
      ]
    }
  ]
}

Reglas:
- "descanso" siempre en SEGUNDOS (3 min = 180, 90 seg = 90, 60 seg = 60)
- "peso" siempre 0 si no se especifica
- "alFallo" es true solo si el texto lo dice explícitamente
- "tempo" puede ser string vacío "" si no se especifica
- "notas" es el texto técnico/indicaciones, puede ser string vacío ""
- Si hay múltiples días en el texto, crear múltiples elementos en "dias"
- Si solo hay un día, "dias" tiene un solo elemento

Rutina a parsear:
${texto}`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      // Obligatoria para llamar a la API directamente desde el navegador (CORS)
      'anthropic-dangerous-direct-browser-access': 'true'
    },
    body: JSON.stringify({
      model: MODELO_IA,
      max_tokens: 4000,
      messages: [{ role: 'user', content: prompt }]
    })
  });

  if (!response.ok) {
    let msg = `Error API: ${response.status}`;
    try { const err = await response.json(); msg = err.error?.message || msg; } catch {}
    if (response.status === 401) msg = 'API key no válida. Revísala en la sección de IA.';
    throw new Error(msg);
  }

  const data = await response.json();
  const texto_respuesta = (data.content || []).map(c => c.text || '').join('');

  // Extraer el JSON aunque venga con ```json o con texto alrededor
  const ini = texto_respuesta.indexOf('{');
  const fin = texto_respuesta.lastIndexOf('}');
  if (ini < 0 || fin <= ini) throw new Error('La IA no devolvió un JSON. Inténtalo de nuevo.');
  try {
    return JSON.parse(texto_respuesta.slice(ini, fin + 1));
  } catch {
    throw new Error('La IA devolvió un formato JSON inválido. Inténtalo de nuevo.');
  }
}

// ============================================================
// UI MULTI-DÍA — lógica para añadir/quitar días en la pantalla de import
// ============================================================
let _aiDias = []; // [{id, nombre, texto}]
// Exponer a window porque los atributos oninput= del HTML no acceden a variables de módulo ES
Object.defineProperty(window, '_aiDias', {
  get: () => _aiDias,
  set: (v) => { _aiDias = v; }
});

function _aiRenderDias() {
  const cont = document.getElementById('ai-dias-lista');
  if (!cont) return;
  cont.innerHTML = _aiDias.map((d, i) => `
    <div class="ai-dia-bloque" id="ai-dia-${d.id}">
      <div class="ai-dia-header">
        <span class="ai-dia-num">📅 Día ${i + 1}</span>
        ${_aiDias.length > 1
          ? `<button onclick="aiEliminarDia(${d.id})" class="btn-danger-sm" style="width:auto!important;padding:4px 8px!important;">✕ Quitar</button>`
          : ''}
      </div>
      <input class="ai-dia-nombre" placeholder="Nombre del día (ej: Día 1 – Torso Fuerza)"
        value="${escapeHtml(d.nombre || '')}" oninput="_aiDias[${i}].nombre = this.value" />
      <textarea class="ai-dia-texto" rows="8"
        placeholder="Press banca con barra&#10;4x6-8 · 3 min · 3-1-1&#10;Escápulas retraídas.&#10;&#10;Dominadas pronadas&#10;4x6-8 · 3 min · 3-0-1"
        oninput="_aiDias[${i}].texto = this.value">${escapeHtml(d.texto)}</textarea>
    </div>`).join('');
}

window.aiAñadirDia = function () {
  const id = Date.now();
  _aiDias.push({ id, nombre: `Día ${_aiDias.length + 1}`, texto: '' });
  _aiRenderDias();
};

window.aiEliminarDia = function (id) {
  _aiDias = _aiDias.filter(d => d.id !== id);
  _aiRenderDias();
};

// ============================================================
// PANTALLA DE IMPORTACIÓN — Lógica principal
// ============================================================
export function abrirPantallaImport() {
  navPush();
  ['menu','pantalla-auth','pantalla-dia','pantalla-historial','pantalla-detalle',
   'pantalla-medidas','pantalla-audio','pantalla-editor','pantalla-resumen',
   'pantalla-estadisticas','pantalla-progreso','pantalla-guia-tempo',
   'pantalla-progresion-rutina','pantalla-perfil'
  ].forEach(id => document.getElementById(id)?.classList.add('oculto'));
  document.getElementById('pantalla-ai-import')?.classList.remove('oculto');

  // Inicializar con un día si está vacío
  if (_aiDias.length === 0) {
    _aiDias = [{ id: Date.now(), nombre: 'Día 1', texto: '' }];
  }
  _aiRenderDias();
}

window.abrirPantallaImport = abrirPantallaImport;

window.importarRutina = async function() {
  const nombreRutina = document.getElementById('ai-import-nombre')?.value?.trim() || 'Rutina Importada';
  const apiKey = document.getElementById('ai-import-apikey')?.value?.trim();
  const btnImportar = document.getElementById('btn-importar');

  // Recoger datos actuales de los textareas (por si el oninput no los capturó todos)
  _aiDias.forEach((d, i) => {
    const nombreEl = document.querySelector(`#ai-dia-${d.id} .ai-dia-nombre`);
    const textoEl  = document.querySelector(`#ai-dia-${d.id} .ai-dia-texto`);
    if (nombreEl) d.nombre = nombreEl.value;
    if (textoEl)  d.texto  = textoEl.value;
  });

  const diasConTexto = _aiDias.filter(d => d.texto.trim());
  if (diasConTexto.length === 0) {
    showToast('Pega el contenido de al menos un día', 'warning');
    return;
  }

  btnImportar.disabled = true;
  btnImportar.textContent = '⏳ Procesando...';

  try {
    let diasParseados = [];

    if (apiKey) {
      if (!navigator.onLine) { showToast('La importación con IA necesita conexión. Quita la API key para usar el importador local.', 'warning', 5000); return; }
      showToast('Enviando a IA...', 'info', 2000);
      const textoCompleto = diasConTexto.map(d => `=== ${d.nombre} ===\n${d.texto}`).join('\n\n');
      const resultado = await parsearConIA(textoCompleto, apiKey);
      const rutinaIA = normalizarRutina({ nombre: nombreRutina, dias: resultado.dias || [] });
      diasParseados = rutinaIA ? rutinaIA.dias.filter(d => d.ejercicios.length) : [];
      // La clave solo se recuerda si el usuario lo pide (y nunca se sincroniza ni entra en backups)
      const recordar = document.getElementById('ai-recordar-key')?.checked;
      try {
        if (recordar) { localStorage.setItem('anthropic_api_key', apiKey); sessionStorage.removeItem('anthropic_api_key'); }
        else { sessionStorage.setItem('anthropic_api_key', apiKey); localStorage.removeItem('anthropic_api_key'); }
      } catch {}
    } else {
      // Parser local — procesar cada día por separado
      for (const dia of diasConTexto) {
        const parsed = parsearRutinaTexto(dia.texto, dia.nombre);
        if (parsed.ejercicios.length > 0) diasParseados.push(parsed);
      }
    }

    if (!diasParseados.length) {
      showToast('No se detectaron ejercicios. Revisa el formato del texto.', 'error');
      return;
    }

    const nuevaRutina = normalizarRutina({ nombre: nombreRutina, dias: diasParseados });
    if (!nuevaRutina || !nuevaRutina.dias.length) { showToast('No se detectaron ejercicios válidos.', 'error'); return; }
    const nuevoId = generarIdRutina();
    saveRutinaUsuario(nuevaRutina, nuevoId);
    localStorage.setItem('rutinaActiva', nuevoId);
    renderizarSelectorRutinas();

    const totalEj = diasParseados.reduce((acc, d) => acc + d.ejercicios.length, 0);
    showToast(`✅ ${diasParseados.length} día(s) importados — ${totalEj} ejercicios`, 'success', 4000);

    window.dispatchEvent(new CustomEvent('cambio-rutina', { detail: { rutinaId: nuevoId } }));

    // Resetear días para la próxima vez
    _aiDias = [{ id: Date.now(), nombre: 'Día 1', texto: '' }];

    setTimeout(() => {
      document.getElementById('pantalla-ai-import')?.classList.add('oculto');
      document.getElementById('menu')?.classList.remove('oculto');
      if (typeof window.renderizarBotonesDias === 'function') window.renderizarBotonesDias();
    }, 1500);

  } catch (err) {
    console.error('Error importando:', err);
    showToast(`Error: ${err.message}`, 'error', 5000);
  } finally {
    btnImportar.disabled = false;
    btnImportar.textContent = '🚀 Importar rutina';
  }
};

// Cargar API key guardada al abrir la pantalla (sessionStorage o, si se pidió recordar, localStorage)
document.addEventListener('DOMContentLoaded', () => {
  let savedKey = null, recordada = false;
  try {
    savedKey = sessionStorage.getItem('anthropic_api_key');
    if (!savedKey) { savedKey = localStorage.getItem('anthropic_api_key'); recordada = !!savedKey; }
  } catch {}
  const keyInput = document.getElementById('ai-import-apikey');
  if (savedKey && keyInput) keyInput.value = savedKey;
  const chk = document.getElementById('ai-recordar-key');
  if (chk) chk.checked = recordada;
  if (_aiDias.length === 0) _aiDias = [{ id: Date.now(), nombre: 'Día 1', texto: '' }];
});

window.borrarApiKeyGuardada = function () {
  try { localStorage.removeItem('anthropic_api_key'); sessionStorage.removeItem('anthropic_api_key'); } catch {}
  const keyInput = document.getElementById('ai-import-apikey');
  if (keyInput) keyInput.value = '';
  showToast('API key borrada de este dispositivo', 'success');
};
