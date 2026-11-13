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
  const alimentos = todosAlimentos();
  const cats = [...new Set(alimentos.map(a => a.cat))];
  const propios = leerPropios();

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
      <label class="form-label" for="nut-alimento">Alimento</label>
      <select id="nut-alimento">${cats.map(cat => `<optgroup label="${esc(cat)}">${alimentos.filter(a => a.cat === cat).map(a => `<option value="${esc(a.id)}">${esc(a.nombre)} · ${a.k} kcal</option>`).join('')}</optgroup>`).join('')}</select>
      <div class="nut-anadir-fila">
        <div><label class="form-label" for="nut-gramos">Gramos</label><input id="nut-gramos" type="number" inputmode="decimal" min="1" max="5000" value="100"></div>
        <button class="btn-primary" onclick="nutriAnadir()">➕ Añadir</button>
      </div>
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
  const id = document.getElementById('nut-alimento')?.value;
  const gr = num(document.getElementById('nut-gramos')?.value);
  const a = todosAlimentos().find(x => x.id === id);
  if (!a) { showToast('Elige un alimento', 'warning'); return; }
  if (!(gr > 0 && gr <= 5000)) { showToast('Los gramos deben estar entre 1 y 5000', 'warning'); return; }
  const items = leerDia(offsetDia);
  items.push({ id: a.id, n: a.nombre, gr, k: a.k, p: a.p, g: a.g, c: a.c });
  if (guardarJSON(claveDia(offsetDia), items)) renderNutricion();
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
    <p>La calculadora (menú ☰ → Nutrición) estima cuánto comer según tu objetivo. Son <strong>puntos de partida</strong>: el cuerpo de cada persona responde distinto, así que lo importante es observar tu peso y tu rendimiento durante 2–3 semanas y ajustar.</p>
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
