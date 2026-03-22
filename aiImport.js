// aiImport.js — Importador de rutinas con parser inteligente + IA opcional
import { saveRutinaUsuario, generarIdRutina } from './rutinaUsuario.js';
import { renderizarSelectorRutinas } from './selectorRutinas.js';
import { showToast, showAlert } from './ui.js';

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

function parsearTiempoDescanso(texto) {
  if (!texto) return 90;
  const t = texto.toLowerCase().trim();

  // "3 min" / "3min" / "3 minutos"
  const minMatch = t.match(/(\d+(?:\.\d+)?)\s*min/);
  if (minMatch) return Math.round(parseFloat(minMatch[1]) * 60);

  // "90 seg" / "90seg" / "90 s" / "90s"
  const segMatch = t.match(/(\d+)\s*(?:seg|sec|s\b)/);
  if (segMatch) return parseInt(segMatch[1]);

  // Solo número → asumimos segundos
  const numMatch = t.match(/^(\d+)$/);
  if (numMatch) return parseInt(numMatch[1]);

  return 90; // default
}

function parsearSetsReps(texto) {
  if (!texto) return { series: 3, repsMin: 8, repsMax: 12 };
  const t = texto.trim();

  // "4x6-8" / "4 x 6-8" / "4X6-8"
  const rangoMatch = t.match(/(\d+)\s*[xX×]\s*(\d+)\s*[-–]\s*(\d+)/);
  if (rangoMatch) {
    return {
      series: parseInt(rangoMatch[1]),
      repsMin: parseInt(rangoMatch[2]),
      repsMax: parseInt(rangoMatch[3])
    };
  }

  // "4x8" — número fijo de reps
  const fijoMatch = t.match(/(\d+)\s*[xX×]\s*(\d+)/);
  if (fijoMatch) {
    const r = parseInt(fijoMatch[2]);
    return { series: parseInt(fijoMatch[1]), repsMin: r, repsMax: r };
  }

  return { series: 3, repsMin: 8, repsMax: 12 };
}

function esTempo(texto) {
  // Formato tempo: "3-1-1" / "2-0-2" / "3-0-1-0"
  return /^\d+-\d+-\d+(-\d+)?$/.test(texto.trim());
}

function esSetsReps(texto) {
  return /\d+\s*[xX×]\s*\d+/.test(texto.trim());
}

function esDescanso(texto) {
  const t = texto.toLowerCase().trim();
  return /\d+\s*(min|seg|sec|s\b)/.test(t) ||
         /^\d+\s*min(uto)?s?$/i.test(t);
}

function parsearBloqueEjercicio(lineas) {
  if (lineas.length === 0) return null;

  const resultado = {
    nombre: '', series: 3, repsMin: 8, repsMax: 12,
    peso: 0, descanso: 90, tempo: '', notas: '', alFallo: false
  };

  resultado.nombre = lineas[0].trim();

  const notasLineas = [];

  for (let i = 1; i < lineas.length; i++) {
    const lineaOriginal = lineas[i].trim();
    if (!lineaOriginal) continue;

    // Soporte formato inline: "4x6-8 · 3 min · 3-1-1" (separado por · o |)
    const partes = lineaOriginal.split(/\s*[·|]\s*/);
    for (const parte of partes) {
      const p = parte.trim();
      if (!p) continue;
      if (esSetsReps(p)) {
        Object.assign(resultado, parsearSetsReps(p));
      } else if (esDescanso(p)) {
        resultado.descanso = parsearTiempoDescanso(p);
      } else if (esTempo(p)) {
        resultado.tempo = p;
      } else if (partes.length === 1) {
        // Solo hay una parte en esta línea → es nota
        notasLineas.push(p);
      }
    }
  }

  resultado.notas = notasLineas.join(' ').trim();
  if (resultado.notas.toLowerCase().includes('fallo')) resultado.alFallo = true;

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
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      messages: [{ role: 'user', content: prompt }]
    })
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error?.message || `Error API: ${response.status}`);
  }

  const data = await response.json();
  const texto_respuesta = data.content[0]?.text || '';

  // Limpiar posibles backticks de markdown
  const clean = texto_respuesta
    .replace(/```json\n?/gi, '')
    .replace(/```\n?/gi, '')
    .trim();

  try {
    return JSON.parse(clean);
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
        value="${(d.nombre||'').replace(/"/g,'&quot;').replace(/</g,'&lt;')}" oninput="_aiDias[${i}].nombre = this.value" />
      <textarea class="ai-dia-texto" rows="8"
        placeholder="Press banca con barra&#10;4x6-8 · 3 min · 3-1-1&#10;Escápulas retraídas.&#10;&#10;Dominadas pronadas&#10;4x6-8 · 3 min · 3-0-1"
        oninput="_aiDias[${i}].texto = this.value">${d.texto}</textarea>
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
  history.pushState({}, '');
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
      // Usar IA — enviar todo el texto junto
      showToast('Enviando a IA...', 'info', 2000);
      const textoCompleto = diasConTexto.map(d => `=== ${d.nombre} ===\n${d.texto}`).join('\n\n');
      const resultado = await parsearConIA(textoCompleto, apiKey);
      diasParseados = resultado.dias || [];
      localStorage.setItem('anthropic_api_key', apiKey);
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

    const nuevaRutina = { nombre: nombreRutina, dias: diasParseados };
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

// Cargar API key guardada al abrir la pantalla
document.addEventListener('DOMContentLoaded', () => {
  const savedKey = localStorage.getItem('anthropic_api_key');
  const keyInput = document.getElementById('ai-import-apikey');
  if (savedKey && keyInput) keyInput.value = savedKey;
  // Inicializar días con uno por defecto
  if (_aiDias.length === 0) _aiDias = [{ id: Date.now(), nombre: 'Día 1', texto: '' }];
});
