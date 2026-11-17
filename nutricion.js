// nutricion.js — Calculadora de calorías y macros + diario de comidas (v1)
//
// Datos (todos en localStorage y sincronizables):
//   nutricionPerfil     objetivo, datos personales y metas (automáticas o manuales)
//   alimentosPropios    alimentos que añade el usuario (por 100 g)
//   nutricionDia_AAAA-MM-DD   comidas anotadas ese día
//
// Fórmulas y rangos (ver notas de la Guía):
//   Gasto en reposo (BMR): Mifflin-St Jeor. Gasto diario = BMR × factor de actividad (1,2–1,9).
//   Superávit para ganar músculo: 10–20 % sobre mantenimiento (principiantes e intermedios) — Iraki et al., 2019.
//   Déficit para perder grasa: pérdida de ≈0,5–1 % del peso por semana — Helms et al., 2014.
//   Proteína: ≈1,6 g/kg es el punto a partir del cual deja de mejorar mucho la ganancia (Morton et al., 2018); 1,6–2,2 g/kg
//   en volumen (Iraki 2019); 2,3–3,1 g/kg de masa magra en definición (Helms 2014; aquí se aproxima por peso total).
//   Los valores por defecto son PUNTOS DE PARTIDA editables, no una prescripción médica.

import { markDirty } from "./userState.js";
import { showToast, showConfirm, escapeHtml } from "./ui.js";
import { ALIMENTOS, FUENTE_ALIMENTOS } from "./alimentos.js";

const esc = escapeHtml;

export const ACTIVIDADES = [
  { f: 1.2,   etiqueta: 'Sedentario (poco o nada de ejercicio)' },
  { f: 1.375, etiqueta: 'Ligera (1–3 días de ejercicio por semana)' },
  { f: 1.55,  etiqueta: 'Moderada (3–5 días por semana)' },
  { f: 1.725, etiqueta: 'Alta (6–7 días por semana)' },
  { f: 1.9,   etiqueta: 'Muy alta (entreno intenso + trabajo físico)' }
];

// ajuste: % sobre el gasto de mantenimiento · prot: g por kg de peso · grasa: % de las kcal
export const OBJETIVOS = {
  ganar:    { nombre: '💪 Ganar músculo',     ajuste: 10,  ajusteMin: 5,   ajusteMax: 20,  prot: 2.0, grasa: 25,
              nota: 'Superávit moderado (10–20 % en principiantes e intermedios) y proteína de 1,6–2,2 g/kg. Un superávit mayor suele acabar en más grasa, no en más músculo.' },
  perder:   { nombre: '🔥 Perder grasa',       ajuste: -20, ajusteMin: -30, ajusteMax: -5,  prot: 2.2, grasa: 25,
              nota: 'Déficit que produzca ≈0,5–1 % del peso corporal por semana. Mantén o sube la proteína para conservar músculo.' },
  mantener: { nombre: '⚖️ Mantener',           ajuste: 0,   ajusteMin: -5,  ajusteMax: 5,   prot: 1.6, grasa: 25,
              nota: 'Calorías de mantenimiento. Con 1,6 g/kg de proteína ya cubres lo que la mayoría de estudios encuentra útil para el músculo.' },
  recomp:   { nombre: '🔄 Recomposición',      ajuste: 0,   ajusteMin: -10, ajusteMax: 5,   prot: 2.0, grasa: 25,
              nota: 'Calorías cercanas al mantenimiento con proteína alta y entrenamiento de fuerza constante. Los cambios son lentos y más claros en principiantes.' }
};

// ── Persistencia ────────────────────────────────────
function leerJSON(clave, defecto) {
  try { const v = JSON.parse(localStorage.getItem(clave)); return v ?? defecto; } catch { return defecto; }
}
function guardarJSON(clave, valor) {
  try { localStorage.setItem(clave, JSON.stringify(valor)); markDirty(); return true; }
  catch { showToast('No se pudo guardar (almacenamiento lleno)', 'error'); return false; }
}

export function leerPerfil() {
  const p = leerJSON('nutricionPerfil', {});
  return (p && typeof p === 'object' && !Array.isArray(p)) ? p : {};
}
function leerPropios() {
  const a = leerJSON('alimentosPropios', []);
  return Array.isArray(a) ? a.filter(x => x && x.id && x.nombre) : [];
}

const pad = n => String(n).padStart(2, '0');
function claveDia(offset = 0) {
  const d = new Date(); d.setDate(d.getDate() + offset);
  return `nutricionDia_${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function fechaLegible(offset) {
  const d = new Date(); d.setDate(d.getDate() + offset);
  const txt = d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
  return offset === 0 ? `Hoy · ${txt}` : offset === -1 ? `Ayer · ${txt}` : txt;
}
function leerDia(offset) {
  const a = leerJSON(claveDia(offset), []);
  return Array.isArray(a) ? a.filter(x => x && Number.isFinite(Number(x.gr))) : [];
}

// ── Cálculo de metas ────────────────────────────────
const num = v => { const n = parseFloat(String(v).replace(',', '.')); return Number.isFinite(n) ? n : null; };

export function calcularBMR({ sexo, edad, peso, altura }) {
  if (!(peso > 0 && altura > 0 && edad > 0)) return null;
  return 10 * peso + 6.25 * altura - 5 * edad + (sexo === 'f' ? -161 : 5);
}

// Devuelve { bmr, mantenimiento, kcal, p, g, c, advertencias[] } o null si faltan datos
export function calcularMetas(perfil) {
  if (perfil.modo === 'manual') {
    const m = perfil.manual || {};
    const kcal = num(m.kcal), p = num(m.p), g = num(m.g), c = num(m.c);
    if (!(kcal > 0)) return null;
    // Si faltan macros se completan: el resto de calorías va a carbohidratos
    const pp = p ?? 0, gg = g ?? 0;
    const cc = c ?? Math.max(0, (kcal - 4 * pp - 9 * gg) / 4);
    return { bmr: null, mantenimiento: null, kcal, p: pp, g: gg, c: cc, advertencias: [], manual: true };
  }
  const peso = num(perfil.peso), altura = num(perfil.altura), edad = num(perfil.edad);
  const bmr = calcularBMR({ sexo: perfil.sexo, edad, peso, altura });
  if (!bmr) return null;
  const factor = num(perfil.actividad) || 1.55;
  const mantenimiento = bmr * factor;
  const obj = OBJETIVOS[perfil.objetivo] || OBJETIVOS.mantener;
  const ajuste = num(perfil.ajuste) ?? obj.ajuste;
  const kcal = mantenimiento * (1 + ajuste / 100);
  const prot = num(perfil.prot) ?? obj.prot;
  const grasaPct = num(perfil.grasaPct) ?? obj.grasa;
  const p = prot * peso;
  const g = (kcal * grasaPct / 100) / 9;
  const c = Math.max(0, (kcal - 4 * p - 9 * g) / 4);
  const advertencias = [];
  const kgSemana = Math.abs(kcal - mantenimiento) * 7 / 7700;   // regla aproximada: ≈7700 kcal por kg de peso
  const pctSemana = kgSemana / peso * 100;
  if (perfil.objetivo === 'perder' && pctSemana > 1) advertencias.push(`Este déficit supone perder ≈${pctSemana.toFixed(1)} % del peso por semana: más de lo habitual (0,5–1 %). Considera un déficit menor para cuidar el músculo.`);
  if (perfil.objetivo === 'ganar' && pctSemana > 0.5) advertencias.push(`Este superávit supone ganar ≈${pctSemana.toFixed(1)} % del peso por semana: por encima del 0,25–0,5 % que suele recomendarse a principiantes e intermedios. Es probable que parte sea grasa.`);
  if (kcal < 1200 && sexoValido(perfil)) advertencias.push('Las calorías resultantes son muy bajas. Revisa los datos o consulta a un profesional de la salud.');
  if (4 * p + 9 * g > kcal) advertencias.push('Proteína + grasa superan las calorías objetivo: baja la proteína o el % de grasa.');
  return { bmr, mantenimiento, kcal, p, g, c, advertencias, kgSemana, pctSemana };
}
const sexoValido = perfil => perfil.sexo === 'm' || perfil.sexo === 'f';

// ── Alimentos (base + propios) ──────────────────────
function todosAlimentos() {
  return [...ALIMENTOS.map(a => ({ ...a, propio: false })), ...leerPropios().map(a => ({ ...a, cat: 'Mis alimentos', propio: true }))];
}

function totalesDia(items) {
  return items.reduce((t, it) => {
    const f = it.gr / 100;
    t.k += it.k * f; t.p += it.p * f; t.g += it.g * f; t.c += it.c * f;
    return t;
  }, { k: 0, p: 0, g: 0, c: 0 });
}

// ── Pantalla ────────────────────────────────────────
let offsetDia = 0;

function barra(rotulo, actual, meta, unidad) {
  const pct = meta > 0 ? Math.min(100, Math.round(actual / meta * 100)) : 0;
  const excede = meta > 0 && actual > meta * 1.05;
  return `<div class="nut-barra">
    <div class="nut-barra-top"><span>${rotulo}</span><strong>${Math.round(actual)} / ${meta > 0 ? Math.round(meta) : '—'} ${unidad}</strong></div>
    <div class="progreso-sesion-barra${excede ? ' nut-excede' : ''}" role="progressbar" aria-label="${esc(rotulo)}" aria-valuemin="0" aria-valuemax="${Math.round(meta)}" aria-valuenow="${Math.round(actual)}"><div style="width:${pct}%"></div></div>
  </div>`;
}

function ultimoMedida() {
  const h = leerJSON('historialMedidas', []);
  if (!Array.isArray(h)) return {};
  const peso = [...h].reverse().find(m => m && m.peso > 0)?.peso;
  const altura = [...h].reverse().find(m => m && m.altura > 0)?.altura;
  return { peso, altura };
}

// ── Buscador de alimentos ──
// Solo se repintan las fichas, las categorías y la selección: el cuadro de búsqueda no se toca, así no se pierde el foco al escribir.
let nutBusqueda = '', nutCat = '', nutSel = '', nutOrden = '', nutLimite = 40, nutRecientes = [];
const PASO_RESULTADOS = 40;
const norm = t => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const fmt1 = n => (Math.round(Number(n) * 10) / 10).toString().replace('.', ',');   // 3.6 → "3,6"
const CAT_ICONO = {
  'Cereales y viandas': '🍚', 'Legumbres': '🫘', 'Proteínas': '🍗', 'Lácteos': '🥛', 'Frutas y vegetales': '🥬',
  'Frutos secos y semillas': '🥜', 'Grasas, dulces y bebidas': '🍯', 'Mis alimentos': '⭐'
};
const icono = cat => CAT_ICONO[cat] || '🍽️';
const ORDENES = [
  ['', 'Orden: relevancia'], ['prot', 'Más proteína'], ['magro', 'Más proteína por kcal'],
  ['kcal_asc', 'Menos calorías'], ['kcal_desc', 'Más calorías'], ['nombre', 'Nombre A–Z']
];
const CAT_RECIENTES = '__recientes';

// Alimentos que anotaste en los últimos 30 días (el más reciente primero): salen del propio diario, no hay que guardar nada más
function idsRecientes() {
  const vistos = [];
  for (let off = 0; off >= -30 && vistos.length < 15; off--) {
    const items = leerDia(off);
    for (let i = items.length - 1; i >= 0 && vistos.length < 15; i--) {
      const id = items[i].id;
      if (id && !vistos.includes(id)) vistos.push(id);
    }
  }
  return vistos;
}

// Texto con las palabras buscadas resaltadas (sin distinguir mayúsculas ni tildes)
function resaltar(texto, palabras) {
  if (!palabras.length) return esc(texto);
  let n = '';
  const mapa = [];   // mapa[i] = posición en `texto` del carácter que originó el carácter normalizado i
  let pos = 0;
  for (const ch of texto) {
    const t = norm(ch);
    for (let k = 0; k < t.length; k++) mapa.push(pos);
    n += t; pos += ch.length;
  }
  const marca = new Array(texto.length).fill(false);
  palabras.forEach(w => {
    for (let i = n.indexOf(w); i !== -1; i = n.indexOf(w, i + 1)) for (let k = i; k < i + w.length; k++) marca[mapa[k]] = true;
  });
  let html = '', abierto = false, p = 0;
  for (const ch of texto) {
    const m = marca[p];
    if (m && !abierto) { html += '<mark>'; abierto = true; }
    if (!m && abierto) { html += '</mark>'; abierto = false; }
    html += esc(ch); p += ch.length;
  }
  return html + (abierto ? '</mark>' : '');
}

function filtrarAlimentos(todos, palabras, cat) {
  return todos.filter(a => {
    if (cat === CAT_RECIENTES) { if (!nutRecientes.includes(a.id)) return false; }
    else if (cat && a.cat !== cat) return false;
    return palabras.every(w => norm(a.nombre + ' ' + a.cat).includes(w));
  });
}

function ordenarAlimentos(lista, palabras, todos) {
  const idx = new Map(todos.map((a, i) => [a.id, i]));
  const porCatalogo = (a, b) => idx.get(a.id) - idx.get(b.id);
  const ratio = a => (a.k > 0 ? a.p / a.k : 0);
  switch (nutOrden) {
    case 'prot':       return [...lista].sort((a, b) => b.p - a.p || porCatalogo(a, b));
    case 'magro':      return [...lista].sort((a, b) => ratio(b) - ratio(a) || porCatalogo(a, b));
    case 'kcal_asc':   return [...lista].sort((a, b) => a.k - b.k || porCatalogo(a, b));
    case 'kcal_desc':  return [...lista].sort((a, b) => b.k - a.k || porCatalogo(a, b));
    case 'nombre':     return [...lista].sort((a, b) => norm(a.nombre).localeCompare(norm(b.nombre), 'es') || porCatalogo(a, b));
  }
  if (nutCat === CAT_RECIENTES && !palabras.length) return [...lista].sort((a, b) => nutRecientes.indexOf(a.id) - nutRecientes.indexOf(b.id));
  if (!palabras.length) return lista;
  // Relevancia: primero los que empiezan por lo escrito, luego los que lo tienen como palabra y al final el resto
  const w0 = palabras[0];
  const puntos = a => { const n = norm(a.nombre); return n.startsWith(w0) ? 0 : n.includes(' ' + w0) ? 1 : 2; };
  return [...lista].sort((a, b) => puntos(a) - puntos(b) || porCatalogo(a, b));
}

function pintarFichas(mostrar, palabras) {
  return mostrar.map(a => `<button type="button" role="option" class="nut-res${a.id === nutSel ? ' sel' : ''}" aria-selected="${a.id === nutSel}" onclick="nutriElegir('${esc(a.id)}')">
      <span class="nut-res-top"><strong>${resaltar(a.nombre, palabras)}</strong><span class="nut-kcal">${a.k}<small> kcal</small></span></span>
      <span class="nut-res-bot"><span class="nut-cat">${icono(a.cat)} ${esc(a.cat)}</span><span class="nut-macros"><b class="mp">P ${fmt1(a.p)}</b><b>C ${fmt1(a.c)}</b><b>G ${fmt1(a.g)}</b></span></span>
    </button>`).join('');
}

function pintarChips(todos, palabras) {
  const cont = document.getElementById('nut-chips');
  if (!cont) return;
  const cuenta = cat => filtrarAlimentos(todos, palabras, cat).length;
  const cats = [...new Set(todos.map(a => a.cat))];
  const chip = (id, texto, n) => `<button type="button" class="nut-chip${nutCat === id ? ' sel' : ''}${n === 0 && nutCat !== id ? ' vacia' : ''}" aria-pressed="${nutCat === id}" onclick="nutriFiltrarCat('${esc(id)}')">${texto} <span>${n}</span></button>`;
  cont.innerHTML = chip('', 'Todos', cuenta(''))
    + (nutRecientes.length ? chip(CAT_RECIENTES, '🕘 Recientes', cuenta(CAT_RECIENTES)) : '')
    + cats.map(c => chip(c, `${icono(c)} ${esc(c)}`, cuenta(c))).join('');
}

function pintarResultadosAlimentos() {
  const cont = document.getElementById('nut-resultados');
  const sel = document.getElementById('nut-seleccion');
  if (!cont) return;
  const palabras = norm(nutBusqueda).split(/\s+/).filter(Boolean);
  const todos = todosAlimentos();
  const hallados = ordenarAlimentos(filtrarAlimentos(todos, palabras, nutCat), palabras, todos);
  const mostrar = hallados.slice(0, nutLimite);
  pintarChips(todos, palabras);

  const conteo = document.getElementById('nut-conteo');
  if (conteo) conteo.textContent = hallados.length === 1 ? '1 alimento' : `${hallados.length} alimentos`;

  if (mostrar.length) {
    cont.innerHTML = pintarFichas(mostrar, palabras)
      + (hallados.length > mostrar.length ? `<button type="button" class="nut-mas" onclick="nutriMas()">Mostrar más (${hallados.length - mostrar.length} restantes)</button>` : '');
  } else {
    const q = nutBusqueda.trim();
    cont.innerHTML = `<div class="nut-vacio"><p>${q ? `Sin resultados para «${esc(q)}».` : 'No hay alimentos en esta categoría.'}</p>
      ${nutCat || q ? `<button type="button" class="btn-secondary" onclick="nutriLimpiarFiltros()">Quitar filtros</button>` : ''}
      ${q ? `<button type="button" class="btn-secondary" onclick="nutriCrearDesdeBusqueda()">➕ Añadir «${esc(q.slice(0, 30))}» a Mis alimentos</button>` : ''}</div>`;
  }

  const a = todos.find(x => x.id === nutSel);
  if (sel) {
    sel.innerHTML = a
      ? `<span class="nut-sel-nombre">✔ <strong>${esc(a.nombre)}</strong></span><span class="nut-sel-100">por 100 g: ${a.k} kcal · P ${fmt1(a.p)} · C ${fmt1(a.c)} · G ${fmt1(a.g)}</span>`
      : 'Toca un alimento de la lista para elegirlo.';
    sel.classList.toggle('nut-sel-ok', !!a);
  }
  nutriPreview();
}

// Cuánto aporta la cantidad escrita del alimento elegido (se actualiza al teclear los gramos)
window.nutriPreview = function () {
  const prev = document.getElementById('nut-preview');
  const btn = document.getElementById('nut-btn-anadir');
  const a = todosAlimentos().find(x => x.id === nutSel);
  const gr = num(document.getElementById('nut-gramos')?.value);
  const valido = !!a && gr > 0 && gr <= 5000;
  if (prev) {
    if (valido) { const f = gr / 100; prev.innerHTML = `${fmt1(gr)} g = <strong>${Math.round(a.k * f)} kcal</strong> · P ${fmt1(a.p * f)} · C ${fmt1(a.c * f)} · G ${fmt1(a.g * f)}`; }
    else prev.textContent = a ? 'Escribe los gramos (1–5000).' : '';
  }
  if (btn) btn.textContent = valido ? `➕ Añadir ${fmt1(gr)} g` : '➕ Añadir';
  document.querySelectorAll('.nut-gr-rapidos button').forEach(b => b.classList.toggle('sel', valido && Number(b.dataset.gr) === gr));
};

window.nutriBuscar = function (t) { nutBusqueda = String(t || ''); nutLimite = PASO_RESULTADOS; pintarResultadosAlimentos(); };
window.nutriFiltrarCat = function (c) { nutCat = String(c || ''); nutLimite = PASO_RESULTADOS; pintarResultadosAlimentos(); };
window.nutriOrdenar = function (o) { nutOrden = String(o || ''); nutLimite = PASO_RESULTADOS; pintarResultadosAlimentos(); };
window.nutriMas = function () { nutLimite += PASO_RESULTADOS; pintarResultadosAlimentos(); };
window.nutriElegir = function (id) { nutSel = id; pintarResultadosAlimentos(); document.getElementById('nut-gramos')?.focus(); };
window.nutriGramos = function (g) { const el = document.getElementById('nut-gramos'); if (el) el.value = g; window.nutriPreview(); };
window.nutriLimpiarFiltros = function () {
  nutBusqueda = ''; nutCat = ''; nutLimite = PASO_RESULTADOS;
  const i = document.getElementById('nut-buscar'); if (i) i.value = '';
  pintarResultadosAlimentos();
};
// Enter en el buscador: elige el primer resultado
window.nutriPrimero = function () {
  const b = document.querySelector('#nut-resultados .nut-res');
  if (b) b.click();
};
// «No lo encuentro»: lleva lo escrito al formulario de «Mis alimentos»
window.nutriCrearDesdeBusqueda = function () {
  const campo = document.getElementById('nut-nuevo-nombre');
  if (!campo) return;
  const q = nutBusqueda.trim().slice(0, 60);
  campo.value = q ? q.charAt(0).toUpperCase() + q.slice(1) : '';
  campo.scrollIntoView({ behavior: 'smooth', block: 'center' });
  campo.focus({ preventScroll: true });
};

export function renderNutricion() {
  const cont = document.getElementById('nutricion-contenido');
  if (!cont) return;
  const perfil = leerPerfil();
  const med = ultimoMedida();
  const val = (k, alt) => esc(perfil[k] ?? alt ?? '');
  const obj = OBJETIVOS[perfil.objetivo] || OBJETIVOS.mantener;
  const objId = OBJETIVOS[perfil.objetivo] ? perfil.objetivo : 'mantener';
  const manual = perfil.modo === 'manual';
  const metas = calcularMetas(perfil);
  const items = leerDia(offsetDia);
  const tot = totalesDia(items);
  const propios = leerPropios();
  nutRecientes = idsRecientes();

  cont.innerHTML = `
  <div class="nut-card">
    <h3>🎯 Mi objetivo</h3>
    <div class="nut-modo">
      <label><input type="radio" name="nut-modo" value="auto" ${manual ? '' : 'checked'} onchange="nutriCambiarModo('auto')"> Calcular por mí</label>
      <label><input type="radio" name="nut-modo" value="manual" ${manual ? 'checked' : ''} onchange="nutriCambiarModo('manual')"> Poner mis metas a mano</label>
    </div>

    <div id="nut-auto" class="${manual ? 'oculto' : ''}">
      <div class="form-row">
        <div class="form-col"><label class="form-label" for="nut-sexo">Sexo</label>
          <select id="nut-sexo"><option value="m" ${perfil.sexo !== 'f' ? 'selected' : ''}>Hombre</option><option value="f" ${perfil.sexo === 'f' ? 'selected' : ''}>Mujer</option></select></div>
        <div class="form-col"><label class="form-label" for="nut-edad">Edad (años)</label>
          <input id="nut-edad" type="number" inputmode="numeric" min="14" max="100" value="${val('edad')}"></div>
      </div>
      <div class="form-row">
        <div class="form-col"><label class="form-label" for="nut-peso">Peso (kg)</label>
          <input id="nut-peso" type="number" inputmode="decimal" step="0.1" min="30" max="300" value="${val('peso', med.peso)}"></div>
        <div class="form-col"><label class="form-label" for="nut-altura">Altura (cm)</label>
          <input id="nut-altura" type="number" inputmode="decimal" min="120" max="230" value="${val('altura', med.altura)}"></div>
      </div>
      <label class="form-label" for="nut-actividad">Actividad</label>
      <select id="nut-actividad">${ACTIVIDADES.map(a => `<option value="${a.f}" ${Number(perfil.actividad || 1.55) === a.f ? 'selected' : ''}>${esc(a.etiqueta)}</option>`).join('')}</select>
      <label class="form-label" for="nut-objetivo">Objetivo</label>
      <select id="nut-objetivo" onchange="nutriCambiaObjetivo()">${Object.entries(OBJETIVOS).map(([id, o]) => `<option value="${id}" ${id === objId ? 'selected' : ''}>${esc(o.nombre)}</option>`).join('')}</select>
      <p class="import-hint" id="nut-obj-nota">${esc(obj.nota)}</p>
      <details class="nut-avanzado"><summary>Ajustar los valores por defecto</summary>
        <div class="form-row">
          <div class="form-col"><label class="form-label" for="nut-ajuste">Ajuste calórico (%)</label>
            <input id="nut-ajuste" type="number" inputmode="decimal" step="1" value="${val('ajuste', obj.ajuste)}"></div>
          <div class="form-col"><label class="form-label" for="nut-prot">Proteína (g/kg)</label>
            <input id="nut-prot" type="number" inputmode="decimal" step="0.1" value="${val('prot', obj.prot)}"></div>
          <div class="form-col"><label class="form-label" for="nut-grasa">Grasa (% kcal)</label>
            <input id="nut-grasa" type="number" inputmode="decimal" step="1" value="${val('grasaPct', obj.grasa)}"></div>
        </div>
        <button type="button" class="btn-secondary" onclick="nutriRestaurarDefectos()">↩️ Valores por defecto del objetivo</button>
      </details>
    </div>

    <div id="nut-manual" class="${manual ? '' : 'oculto'}">
      <div class="form-row">
        <div class="form-col"><label class="form-label" for="nut-m-kcal">Calorías</label><input id="nut-m-kcal" type="number" inputmode="numeric" min="0" value="${esc(perfil.manual?.kcal ?? '')}"></div>
        <div class="form-col"><label class="form-label" for="nut-m-p">Proteína (g)</label><input id="nut-m-p" type="number" inputmode="numeric" min="0" value="${esc(perfil.manual?.p ?? '')}"></div>
      </div>
      <div class="form-row">
        <div class="form-col"><label class="form-label" for="nut-m-c">Carbohidratos (g)</label><input id="nut-m-c" type="number" inputmode="numeric" min="0" value="${esc(perfil.manual?.c ?? '')}"></div>
        <div class="form-col"><label class="form-label" for="nut-m-g">Grasas (g)</label><input id="nut-m-g" type="number" inputmode="numeric" min="0" value="${esc(perfil.manual?.g ?? '')}"></div>
      </div>
      <p class="import-hint">Si dejas vacíos los carbohidratos, se calculan con las calorías que no cubren la proteína y la grasa.</p>
    </div>

    <button class="btn-primary" onclick="nutriGuardarPerfil()">💾 Calcular y guardar</button>

    ${metas ? `
    <div class="nut-resultado">
      ${metas.mantenimiento ? `<p>Gasto de mantenimiento estimado: <strong>${Math.round(metas.mantenimiento)} kcal</strong> <small>(reposo ${Math.round(metas.bmr)} kcal)</small></p>` : ''}
      <div class="nut-metas">
        <div><span>${Math.round(metas.kcal)}</span><small>kcal</small></div>
        <div><span>${Math.round(metas.p)} g</span><small>proteína</small></div>
        <div><span>${Math.round(metas.c)} g</span><small>carbohidratos</small></div>
        <div><span>${Math.round(metas.g)} g</span><small>grasas</small></div>
      </div>
      ${metas.advertencias.map(a => `<p class="nut-aviso">⚠️ ${esc(a)}</p>`).join('')}
      <p class="import-hint">Son estimaciones de partida. Si tras 2–3 semanas tu peso no se mueve como esperas, ajusta las calorías un 5–10 %.</p>
    </div>` : `<p class="import-hint">Rellena tus datos y pulsa «Calcular y guardar» para ver tus metas.</p>`}
  </div>

  <div class="nut-card">
    <h3>🍽️ Diario</h3>
    <div class="nut-dia">
      <button class="btn-secondary" onclick="nutriDia(-1)" aria-label="Día anterior">◀</button>
      <strong>${esc(fechaLegible(offsetDia))}</strong>
      <button class="btn-secondary" onclick="nutriDia(1)" aria-label="Día siguiente" ${offsetDia >= 0 ? 'disabled' : ''}>▶</button>
    </div>
    ${metas ? `
      ${barra('Calorías', tot.k, metas.kcal, 'kcal')}
      ${barra('Proteína', tot.p, metas.p, 'g')}
      ${barra('Carbohidratos', tot.c, metas.c, 'g')}
      ${barra('Grasas', tot.g, metas.g, 'g')}` : `
      <p>Total: <strong>${Math.round(tot.k)} kcal</strong> · P ${Math.round(tot.p)} g · C ${Math.round(tot.c)} g · G ${Math.round(tot.g)} g</p>`}

    <div class="nut-anadir">
      <label class="form-label" for="nut-buscar">🔍 Buscar alimento</label>
      <input id="nut-buscar" type="search" autocomplete="off" enterkeyhint="search" placeholder="Ej: yuca, pollo, atún… (varias palabras)" value="${esc(nutBusqueda)}" oninput="nutriBuscar(this.value)" onkeydown="if(event.key==='Enter'){event.preventDefault();nutriPrimero();}">
      <div id="nut-chips" class="nut-chips" role="group" aria-label="Categorías"></div>
      <div class="nut-barra-lista">
        <span id="nut-conteo" class="nut-conteo" aria-live="polite"></span>
        <select id="nut-orden" aria-label="Ordenar resultados" onchange="nutriOrdenar(this.value)">
          ${ORDENES.map(([v, t]) => `<option value="${v}" ${v === nutOrden ? 'selected' : ''}>${esc(t)}</option>`).join('')}
        </select>
      </div>
      <div id="nut-resultados" class="nut-resultados" role="listbox" aria-label="Resultados"></div>
      <p id="nut-seleccion" class="nut-seleccion"></p>
      <div class="nut-anadir-fila">
        <div><label class="form-label" for="nut-gramos">Gramos</label><input id="nut-gramos" type="number" inputmode="decimal" min="1" max="5000" value="100" oninput="nutriPreview()"></div>
        <button id="nut-btn-anadir" class="btn-primary" onclick="nutriAnadir()">➕ Añadir</button>
      </div>
      <div class="nut-gr-rapidos" aria-label="Cantidades rápidas">${[50, 100, 150, 200, 250].map(g => `<button type="button" data-gr="${g}" onclick="nutriGramos(${g})">${g} g</button>`).join('')}</div>
      <p id="nut-preview" class="nut-preview" aria-live="polite"></p>
    </div>

    <div class="nut-lista">
      ${items.length === 0 ? `<p class="texto-vacio">Nada anotado este día.</p>` : items.map((it, i) => {
        const f = it.gr / 100;
        return `<div class="nut-item"><div><strong>${esc(it.n)}</strong><br><small>${esc(it.gr)} g · ${Math.round(it.k * f)} kcal · P ${(it.p * f).toFixed(1)} · C ${(it.c * f).toFixed(1)} · G ${(it.g * f).toFixed(1)}</small></div>
          <button class="btn-danger btn-icon" onclick="nutriQuitar(${i})" aria-label="Quitar ${esc(it.n)}">🗑️</button></div>`;
      }).join('')}
    </div>
  </div>

  <div class="nut-card">
    <h3>➕ Mis alimentos</h3>
    <p class="import-hint">Añade lo que falte (valores por 100 g, de la etiqueta o de una tabla fiable). La lista crece contigo. Fuente de la base inicial: ${esc(FUENTE_ALIMENTOS)}.</p>
    <input id="nut-nuevo-nombre" aria-label="Nombre del alimento" placeholder="Nombre (ej: Pan blandito, crudo/cocido…)" maxlength="60">
    <div class="form-row">
      <div class="form-col"><label class="form-label" for="nut-nuevo-k">kcal</label><input id="nut-nuevo-k" type="number" inputmode="decimal" min="0"></div>
      <div class="form-col"><label class="form-label" for="nut-nuevo-p">Prot. (g)</label><input id="nut-nuevo-p" type="number" inputmode="decimal" min="0" step="0.1"></div>
    </div>
    <div class="form-row">
      <div class="form-col"><label class="form-label" for="nut-nuevo-c">Carb. (g)</label><input id="nut-nuevo-c" type="number" inputmode="decimal" min="0" step="0.1"></div>
      <div class="form-col"><label class="form-label" for="nut-nuevo-g">Grasa (g)</label><input id="nut-nuevo-g" type="number" inputmode="decimal" min="0" step="0.1"></div>
    </div>
    <button class="btn-secondary" onclick="nutriNuevoAlimento()">💾 Guardar alimento</button>
    ${propios.length ? `<div class="nut-lista">${propios.map(a => `<div class="nut-item"><div><strong>${esc(a.nombre)}</strong><br><small>${a.k} kcal · P ${a.p} · C ${a.c} · G ${a.g} (por 100 g)</small></div>
      <button class="btn-danger btn-icon" onclick="nutriBorrarPropio('${esc(a.id)}')" aria-label="Borrar ${esc(a.nombre)}">🗑️</button></div>`).join('')}</div>` : ''}
  </div>

  <p class="import-hint">Más explicaciones (cálculo, superávit, déficit, proteína y alimentos) en 📖 Guía y Conceptos → Nutrición.</p>`;
  pintarResultadosAlimentos();
}

// ── Acciones ────────────────────────────────────────
window.nutriCambiarModo = function (modo) {
  document.getElementById('nut-auto')?.classList.toggle('oculto', modo === 'manual');
  document.getElementById('nut-manual')?.classList.toggle('oculto', modo !== 'manual');
};

window.nutriCambiaObjetivo = function () {
  const id = document.getElementById('nut-objetivo')?.value;
  const o = OBJETIVOS[id]; if (!o) return;
  const set = (i, v) => { const el = document.getElementById(i); if (el) el.value = v; };
  set('nut-ajuste', o.ajuste); set('nut-prot', o.prot); set('nut-grasa', o.grasa);
  const n = document.getElementById('nut-obj-nota'); if (n) n.textContent = o.nota;
};
window.nutriRestaurarDefectos = window.nutriCambiaObjetivo;

window.nutriGuardarPerfil = function () {
  const get = id => document.getElementById(id)?.value ?? '';
  const modo = document.querySelector('input[name="nut-modo"]:checked')?.value === 'manual' ? 'manual' : 'auto';
  const perfil = leerPerfil();
  perfil.modo = modo;
  if (modo === 'manual') {
    const m = { kcal: get('nut-m-kcal'), p: get('nut-m-p'), c: get('nut-m-c'), g: get('nut-m-g') };
    const k = num(m.kcal);
    if (!(k >= 500 && k <= 10000)) { showToast('Las calorías deben estar entre 500 y 10000', 'warning'); return; }
    for (const [campo, rot] of [['p', 'proteína'], ['c', 'carbohidratos'], ['g', 'grasas']]) {
      if (m[campo] !== '' && !(num(m[campo]) >= 0 && num(m[campo]) <= 2000)) { showToast(`Revisa ${rot}: debe estar entre 0 y 2000 g`, 'warning'); return; }
    }
    perfil.manual = m;
  } else {
    const edad = num(get('nut-edad')), peso = num(get('nut-peso')), altura = num(get('nut-altura'));
    if (!(edad >= 14 && edad <= 100)) { showToast('La edad debe estar entre 14 y 100 años', 'warning'); return; }
    if (!(peso >= 30 && peso <= 300)) { showToast('El peso debe estar entre 30 y 300 kg', 'warning'); return; }
    if (!(altura >= 120 && altura <= 230)) { showToast('La altura debe estar entre 120 y 230 cm', 'warning'); return; }
    const ajuste = num(get('nut-ajuste')), prot = num(get('nut-prot')), grasa = num(get('nut-grasa'));
    if (!(ajuste !== null && ajuste >= -40 && ajuste <= 30)) { showToast('El ajuste calórico debe estar entre −40 % y +30 %', 'warning'); return; }
    if (!(prot >= 0.8 && prot <= 3.5)) { showToast('La proteína debe estar entre 0,8 y 3,5 g/kg', 'warning'); return; }
    if (!(grasa >= 10 && grasa <= 50)) { showToast('La grasa debe estar entre el 10 % y el 50 % de las calorías', 'warning'); return; }
    Object.assign(perfil, {
      sexo: get('nut-sexo') === 'f' ? 'f' : 'm', edad, peso, altura,
      actividad: num(get('nut-actividad')) || 1.55,
      objetivo: OBJETIVOS[get('nut-objetivo')] ? get('nut-objetivo') : 'mantener',
      ajuste, prot, grasaPct: grasa
    });
  }
  if (guardarJSON('nutricionPerfil', perfil)) { showToast('Metas guardadas', 'success'); renderNutricion(); }
};

window.nutriDia = function (d) { offsetDia = Math.min(0, offsetDia + d); renderNutricion(); };

window.nutriAnadir = function () {
  const id = nutSel;
  const gr = num(document.getElementById('nut-gramos')?.value);
  const a = todosAlimentos().find(x => x.id === id);
  if (!a) { showToast('Busca y toca un alimento de la lista primero', 'warning'); return; }
  if (!(gr > 0 && gr <= 5000)) { showToast('Los gramos deben estar entre 1 y 5000', 'warning'); return; }
  const items = leerDia(offsetDia);
  items.push({ id: a.id, n: a.nombre, gr, k: a.k, p: a.p, g: a.g, c: a.c });
  if (guardarJSON(claveDia(offsetDia), items)) { renderNutricion(); showToast(`Añadido: ${a.nombre} · ${gr} g`, 'success', 1800); }
};

window.nutriQuitar = function (i) {
  const items = leerDia(offsetDia);
  if (!items[i]) return;
  items.splice(i, 1);
  if (guardarJSON(claveDia(offsetDia), items)) renderNutricion();
};

window.nutriNuevoAlimento = function () {
  const get = id => document.getElementById(id)?.value ?? '';
  const nombre = get('nut-nuevo-nombre').trim().slice(0, 60);
  const k = num(get('nut-nuevo-k')), p = num(get('nut-nuevo-p')) ?? 0, g = num(get('nut-nuevo-g')) ?? 0, c = num(get('nut-nuevo-c')) ?? 0;
  if (!nombre) { showToast('Escribe el nombre del alimento', 'warning'); return; }
  if (!(k >= 0 && k <= 900)) { showToast('Las kcal por 100 g deben estar entre 0 y 900', 'warning'); return; }
  if ([p, g, c].some(v => !(v >= 0 && v <= 100)) || p + g + c > 100.5) { showToast('Proteína, grasa y carbohidratos (por 100 g) no pueden sumar más de 100 g', 'warning'); return; }
  const propios = leerPropios();
  if (propios.some(a => a.nombre.toLowerCase() === nombre.toLowerCase()) || ALIMENTOS.some(a => a.nombre.toLowerCase() === nombre.toLowerCase())) {
    showToast('Ya existe un alimento con ese nombre', 'warning'); return;
  }
  const estimada = 4 * p + 9 * g + 4 * c;
  propios.push({ id: 'u_' + Date.now().toString(36), nombre, k, p, g, c });
  if (!guardarJSON('alimentosPropios', propios)) return;
  if (k > 0 && Math.abs(estimada - k) / k > 0.25) showToast(`Guardado, pero las macros suman ≈${Math.round(estimada)} kcal y has puesto ${k}: revisa los datos (la fibra o el alcohol pueden explicar parte de la diferencia).`, 'warning', 7000);
  else showToast('Alimento guardado', 'success');
  renderNutricion();
};

window.nutriBorrarPropio = function (id) {
  const a = leerPropios().find(x => x.id === id);
  if (!a) return;
  showConfirm(`¿Borrar "${a.nombre}" de tus alimentos?\nLos días ya anotados no cambian.`, () => {
    if (guardarJSON('alimentosPropios', leerPropios().filter(x => x.id !== id))) renderNutricion();
  });
};

// ── Texto para la Guía y Conceptos ──────────────────
const itemH = (t, p) => `<div class="guia-item"><h4>${esc(t)}</h4><p>${esc(p)}</p></div>`;
export function htmlGuiaNutricion() {
  return `<div class="guia-section" id="guia-nutricion">
    <h3>🍽️ Nutrición: calorías y macros</h3>
    <p>La calculadora (pantalla principal → 🍽️ Nutrición) estima cuánto comer según tu objetivo. Son <strong>puntos de partida</strong>: el cuerpo de cada persona responde distinto, así que lo importante es observar tu peso y tu rendimiento durante 2–3 semanas y ajustar.</p>
    ${itemH('Gasto en reposo y gasto diario', 'Se calcula con la ecuación de Mifflin-St Jeor (10·peso + 6,25·altura − 5·edad, +5 en hombres y −161 en mujeres) y se multiplica por un factor de actividad (1,2 sedentario hasta 1,9 muy alto). Es una estimación: puede errar un 10 % o más en una persona concreta.')}
    ${itemH('Ganar músculo (superávit)', 'La revisión de Iraki y cols. (2019) sobre fase de volumen en culturismo natural propone un superávit del 10–20 % sobre mantenimiento en principiantes e intermedios (más bajo en avanzados), con ganancias de peso de ≈0,25–0,5 % del peso corporal por semana, proteína de 1,6–2,2 g/kg, grasa de 0,5–1,5 g/kg (≈20–35 % de las calorías) y el resto en carbohidratos.')}
    ${itemH('Perder grasa (déficit)', 'Helms y cols. (2014) para fase de definición proponen perder ≈0,5–1 % del peso corporal por semana, y proteína de 2,3–3,1 g/kg de masa magra para conservar músculo. Como la app no conoce tu % de grasa, usa 2,2 g/kg de peso total por defecto; puedes subirlo en "Ajustar los valores por defecto". La equivalencia 7700 kcal ≈ 1 kg es solo una regla aproximada.')}
    ${itemH('Proteína', 'El metaanálisis de Morton y cols. (2018) encontró que más allá de ≈1,6 g/kg/día los beneficios adicionales en masa muscular son pequeños (el límite superior del intervalo llegaba a ≈2,2 g/kg). Repartirla en varias comidas es razonable, aunque el total diario es lo más importante.')}
    ${itemH('Grasas y carbohidratos', 'Las grasas se fijan como porcentaje de las calorías (25 % por defecto) y los carbohidratos son lo que queda. Mantén las grasas por encima de un mínimo razonable para la salud; los carbohidratos sostienen el rendimiento en series de 6–15 reps.')}
    ${itemH('Referencia cubana', 'Las Guías Alimentarias para la población cubana (MINSAP / INHA, 2016) sitúan la proteína en un 10–15 % de la energía y la grasa en un 15–30 %. Para entrenar con pesas esta calculadora usa más proteína (por g/kg) porque busca ganar o conservar músculo; si tienes una condición médica, sigue lo que te indique tu médico o nutricionista.')}
    ${itemH('Base de alimentos', `Valores por 100 g de USDA FoodData Central (SR Legacy). Ojo con crudo/cocido: el arroz, los frijoles y la carne cambian mucho al cocinarse. Los platos compuestos (congrí, picadillo…) se calculan sumando sus ingredientes, o los guardas como "alimento propio". Las cantidades de aceite y azúcar que se usan al cocinar suelen ser lo que más se olvida anotar.`)}
    ${itemH('Medidas, peso y progreso', 'Si te mides y te pesas cada 2–4 semanas (la app puede recordártelo, en Medidas corporales) verás si la tendencia va hacia donde quieres y podrás ajustar un 5–10 % las calorías.')}
  </div>`;
}
// gt-build:v107
