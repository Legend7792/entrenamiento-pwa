// ranking.js — Ranking global de usuarios de la app (mejora 15; v107: mide PROGRESO, no asistencia)
//
// Cómo funciona
//  * Es OPCIONAL y requiere cuenta en la nube. Si activas "Participar", se sube SOLO: apodo, puntos, nivel y nº de
//    ejercicios evaluados. Nunca se suben rutinas, historial, medidas, correo ni nada más.
//  * v107 — QUÉ SE MIDE: la mejora de fuerza de cada ejercicio respecto a TU propio punto de partida (1RM estimado
//    con la fórmula de Epley), promediada entre tus ejercicios. NO cuenta cuántas sesiones haces ni cuánto tiempo
//    llevas: si faltas unas semanas, tu progreso ya conseguido no baja; y quien entrena menos días pero mejora sube.
//    (Antes eran 10 puntos por sesión + volumen: quien paraba por lesión, trabajo o viaje se quedaba atrás para siempre.)
//  * Los puntos y el nivel se calculan en tu dispositivo con tu historial (ver calcularNivel).
//  * El ranking se descarga solo al abrir la app / volver la conexión / abrir la pantalla. Se guarda la última
//    descarga: sin internet se sigue viendo, indicando de cuándo es.
//  * La tabla se crea/actualiza con supabase_ranking.sql (hay que ejecutarlo UNA vez en Supabase; es repetible).
//    Sin esa tabla, la pantalla avisa y el resto de la app funciona igual.
//  * LIMITACIÓN: al calcularse en el cliente, un usuario con conocimientos podría falsear sus puntos. Es un ranking
//    "de confianza entre amigos", no una competición con premios.

import { getSupabase } from "./cloud.js";
import { userState, markDirty } from "./userState.js";
import { repsContables } from "./metodos.js";
import { escapeHtml, showToast, showConfirm } from "./ui.js";

// Métrica del ranking (se guarda en la nube para no mezclar con la antigua, que contaba sesiones)
export const METRICA = 2;
export const MIN_SESIONES_EJ = 3;   // un ejercicio cuenta cuando lo has hecho al menos 3 veces (con peso y sin ser deload)
export const MIN_EJERCICIOS = 3;    // y hay que tener al menos 3 ejercicios así para entrar en el ranking
const TOPE_MEJORA = 100;            // % máximo que puede aportar un ejercicio (evita que un dato raro lo domine)
const TOPE_REPS_1RM = 12;           // por encima de ~12 reps la fórmula de Epley deja de ser fiable

// puntos = mejora media (%) × 10, así 12,4 % = 124 puntos. Niveles por puntos (diseño propio, fácil de ajustar aquí)
export const NIVELES = [
  { n: 1, nombre: 'Novato',     min: 0 },
  { n: 2, nombre: 'Aprendiz',   min: 50 },    //  +5 %
  { n: 3, nombre: 'Constante',  min: 100 },   // +10 %
  { n: 4, nombre: 'Intermedio', min: 200 },   // +20 %
  { n: 5, nombre: 'Avanzado',   min: 300 },   // +30 %
  { n: 6, nombre: 'Élite',      min: 450 },   // +45 %
  { n: 7, nombre: 'Leyenda',    min: 600 }    // +60 %
];
export function nivelPorPuntos(p) {
  let r = NIVELES[0];
  NIVELES.forEach(x => { if (p >= x.min) r = x; });
  return r;
}

// 1RM estimado (Epley) de un ejercicio en una sesión: la mejor serie "normal" (sin bajadas ni serie viuda)
export function e1rmSesion(ej) {
  const peso = Number(ej?.peso);
  if (!(peso > 0)) return 0;
  let mejor = 0;
  repsContables(ej).forEach(r => {
    const n = Number(r);
    if (r === '' || r === null || !(n > 0)) return;
    mejor = Math.max(mejor, peso * (1 + Math.min(n, TOPE_REPS_1RM) / 30));
  });
  return mejor;
}

// Progreso por ejercicio y total.
//   punto de partida = 1RM estimado de tu PRIMERA sesión con ese ejercicio · mejor = el mayor de todas (el récord no baja si paras)
//   mejora del ejercicio = (mejor / punto de partida − 1) × 100, entre 0 y 100 %
//   mejora media = media de los ejercicios con ≥ 3 sesiones · puntos = mejora media × 10
export function calcularNivel(historial) {
  const porEj = new Map();   // clave normalizada → { nombre, valores: [e1rm en orden de fecha] }
  const sesiones = (Array.isArray(historial) ? historial : [])
    .filter(s => s && !s.deload && Array.isArray(s.ejercicios))
    .map((s, i) => ({ s, i, t: new Date(s.fecha).getTime() }))
    .sort((a, b) => ((Number.isFinite(a.t) ? a.t : 0) - (Number.isFinite(b.t) ? b.t : 0)) || a.i - b.i);
  sesiones.forEach(({ s }) => {
    s.ejercicios.forEach(ej => {
      const nombre = String(ej?.nombre || '').trim();
      if (!nombre) return;
      const v = e1rmSesion(ej);
      if (!(v > 0)) return;
      const k = nombre.toLowerCase();
      if (!porEj.has(k)) porEj.set(k, { nombre, valores: [] });
      porEj.get(k).valores.push(v);
    });
  });

  const detalle = [];
  porEj.forEach(({ nombre, valores }) => {
    if (valores.length < MIN_SESIONES_EJ) { detalle.push({ nombre, sesiones: valores.length, cuenta: false }); return; }
    const base = valores[0];
    const mejor = Math.max(...valores);
    const mejora = Math.min(TOPE_MEJORA, Math.max(0, (mejor / base - 1) * 100));
    detalle.push({ nombre, sesiones: valores.length, cuenta: true, base: Math.round(base * 10) / 10, mejor: Math.round(mejor * 10) / 10, mejora });
  });
  detalle.sort((a, b) => (b.cuenta - a.cuenta) || ((b.mejora || 0) - (a.mejora || 0)) || b.sesiones - a.sesiones);

  const validos = detalle.filter(d => d.cuenta);
  const ejercicios = validos.length;
  const calibrado = ejercicios >= MIN_EJERCICIOS;
  const mejoraPct = ejercicios ? validos.reduce((a, d) => a + d.mejora, 0) / ejercicios : 0;
  const puntos = calibrado ? Math.round(mejoraPct * 10) : 0;
  const nivel = nivelPorPuntos(puntos);
  const sig = NIVELES.find(x => x.min > puntos) || null;
  return { puntos, mejoraPct, ejercicios, calibrado, faltanEjercicios: Math.max(0, MIN_EJERCICIOS - ejercicios), detalle, nivel: nivel.n, nombre: nivel.nombre, siguiente: sig };
}

const fmtKg = v => v.toLocaleString('es-ES', { maximumFractionDigits: 1 });
const fmtPct = v => v.toLocaleString('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

// ── Estado local ──
const K_PERFIL = 'rankingPerfil';   // { activo, apodo }   (se sincroniza con la cuenta)
const K_CACHE = 'rankingCache';     // { fecha, filas }    (solo este dispositivo)

export function leerPerfilRanking() {
  try { const p = JSON.parse(localStorage.getItem(K_PERFIL) || '{}') || {}; return { activo: p.activo === true, apodo: String(p.apodo || '') }; }
  catch { return { activo: false, apodo: '' }; }
}
function guardarPerfilRanking(p) {
  try { localStorage.setItem(K_PERFIL, JSON.stringify(p)); markDirty(); return true; }
  catch { showToast('No se pudo guardar', 'error'); return false; }
}
function leerCache() {
  try { const c = JSON.parse(localStorage.getItem(K_CACHE) || 'null'); return c && Array.isArray(c.filas) ? c : null; } catch { return null; }
}
function guardarCache(filas) {
  try { localStorage.setItem(K_CACHE, JSON.stringify({ fecha: new Date().toISOString(), filas })); } catch {}
}

export function apodoValido(a) {
  const t = String(a || '').trim().replace(/\s+/g, ' ');
  return t.length >= 2 && t.length <= 20 && /^[\p{L}\p{N} _.\-]+$/u.test(t) ? t : null;
}

function leerHistorial() { try { const h = JSON.parse(localStorage.getItem('historial') || '[]'); return Array.isArray(h) ? h : []; } catch { return []; } }

// ── Nube ──
let _enCurso = null, _ultimo = 0, _tablaFalta = false;

function esTablaInexistente(e) {
  const m = String(e?.message || '') + String(e?.code || '');
  return /PGRST205|PGRST204|42P01|42703|relation .* does not exist|column .* does not exist|Could not find the (table|'[^']*' column)/i.test(m);   // falta la tabla o las columnas de la versión nueva
}

async function publicar(sb, uid) {
  const perfil = leerPerfilRanking();
  if (!perfil.activo) return;
  const apodo = apodoValido(perfil.apodo);
  if (!apodo) return;
  const c = calcularNivel(leerHistorial());
  if (!c.calibrado) return;   // hasta tener 3 ejercicios con 3+ sesiones no hay datos suficientes para comparar
  const { error } = await sb.from('ranking').upsert({
    id: uid, apodo, puntos: c.puntos, nivel: c.nivel, ejercicios: c.ejercicios, metrica: METRICA, actualizado: new Date().toISOString()
  }, { onConflict: 'id' });
  if (error) throw error;
}

// Publica (si participas) y descarga el ranking. forzar=true ignora el límite de 1 minuto entre llamadas.
export async function actualizarRanking({ forzar = false } = {}) {
  if (_enCurso) return _enCurso;
  if (!forzar && Date.now() - _ultimo < 60000) return { ok: true, omitido: true };
  if (!userState.uid) return { ok: false, motivo: 'sin-cuenta' };
  if (!navigator.onLine) return { ok: false, motivo: 'offline' };
  _enCurso = (async () => {
    try {
      const sb = await getSupabase();
      const { data: ses } = await sb.auth.getSession();
      if (!ses?.session) return { ok: false, motivo: 'sin-cuenta' };
      await publicar(sb, ses.session.user.id);
      const { data, error } = await sb.from('ranking')
        .select('id,apodo,puntos,nivel,ejercicios,actualizado')
        .eq('metrica', METRICA).gte('ejercicios', MIN_EJERCICIOS)   // solo la métrica actual (las filas antiguas cuentan sesiones)
        .order('puntos', { ascending: false }).limit(100);
      if (error) throw error;
      _tablaFalta = false;
      const filas = (data || []).map(f => ({ id: f.id, apodo: String(f.apodo || '').slice(0, 20), puntos: Number(f.puntos) || 0, nivel: Number(f.nivel) || 1, ejercicios: Number(f.ejercicios) || 0 }));
      guardarCache(filas);
      _ultimo = Date.now();
      return { ok: true };
    } catch (e) {
      if (esTablaInexistente(e)) { _tablaFalta = true; return { ok: false, motivo: 'sin-tabla' }; }
      return { ok: false, motivo: 'error', detalle: e?.message };
    } finally { _enCurso = null; }
  })();
  return _enCurso;
}

// Se llama al abrir la app, al volver la conexión y tras terminar un entrenamiento: no hace nada si no hay cuenta/conexión
export function actualizarRankingSilencioso() {
  if (!userState.uid || !navigator.onLine) return;
  actualizarRanking().then(() => { if (pantallaAbierta()) pintarRanking(); }).catch(() => {});
}

function pantallaAbierta() { const s = document.getElementById('pantalla-ranking'); return !!s && !s.classList.contains('oculto'); }

// ── Pantalla ──
let _filtroNivel = 0;

export function pintarRanking() {
  const cont = document.getElementById('ranking-contenido');
  if (!cont) return;
  const perfil = leerPerfilRanking();
  const mio = calcularNivel(leerHistorial());
  const cache = leerCache();
  const uid = userState.uid;
  const faltaPct = mio.siguiente ? (mio.siguiente.min - mio.puntos) / 10 : 0;

  const filasEj = mio.detalle.map(d => d.cuenta
    ? `<li><span>${escapeHtml(d.nombre)}</span><small>${fmtKg(d.base)} → ${fmtKg(d.mejor)} kg (1RM est.) · <strong>+${fmtPct(d.mejora)} %</strong></small></li>`
    : `<li class="rk-calibrando"><span>${escapeHtml(d.nombre)}</span><small>calibrando: ${d.sesiones}/${MIN_SESIONES_EJ} sesiones</small></li>`).join('');

  let html = `<div class="nut-card rk-mio">
      <h3>Tu nivel</h3>
      ${mio.calibrado ? `
      <p class="rk-nivel">Nivel ${mio.nivel} · <strong>${escapeHtml(mio.nombre)}</strong></p>
      <p class="import-hint">Tu fuerza ha mejorado de media <strong>+${fmtPct(mio.mejoraPct)} %</strong> sobre tu punto de partida (${mio.ejercicios} ejercicios) = ${mio.puntos} puntos${mio.siguiente ? ` · te falta ≈${fmtPct(faltaPct)} % para «${escapeHtml(mio.siguiente.nombre)}»` : ' · ¡nivel máximo!'}</p>`
      : `
      <p class="rk-nivel">Calibrando…</p>
      <p class="import-hint">Para medir tu progreso hacen falta <strong>${MIN_EJERCICIOS} ejercicios con peso hechos al menos ${MIN_SESIONES_EJ} veces</strong> (sin contar deload). Llevas ${mio.ejercicios}${mio.faltanEjercicios ? `: te ${mio.faltanEjercicios === 1 ? 'falta 1' : 'faltan ' + mio.faltanEjercicios}` : ''}.</p>`}
      ${filasEj ? `<details class="nut-avanzado"><summary>Ver cómo sale (por ejercicio)</summary><ul class="rk-detalle">${filasEj}</ul></details>` : ''}
      <details class="nut-avanzado"><summary>¿Cómo se calcula?</summary>
        <p class="import-hint">Se compara tu <strong>1RM estimado</strong> (fórmula de Epley, con la mejor serie normal; las bajadas y la serie viuda no cuentan) de cada ejercicio con tu punto de partida (tu primera sesión con ese ejercicio). Los puntos son la mejora media × 10.</p>
        <p class="import-hint"><strong>No cuenta cuántas veces entrenas ni cuánto tiempo pasas sin hacerlo:</strong> si paras unas semanas tu progreso ya conseguido se mantiene, y solo sube cuando mejoras tus marcas. Las sesiones de deload no cuentan. Cada ejercicio aporta como máximo +${TOPE_MEJORA} %. Al principio se progresa más rápido, por eso es normal que quien acaba de empezar suba deprisa; puedes filtrar por nivel.</p>
      </details>
    </div>`;

  if (!uid) {
    html += `<div class="nut-card"><p>El ranking necesita una cuenta en la nube (Perfil → iniciar sesión). Con el modo local no se puede participar.</p></div>`;
  } else {
    html += `<div class="nut-card">
      <h3>Participar en el ranking</h3>
      <label class="audio-toggle-label"><input type="checkbox" id="rk-activo" ${perfil.activo ? 'checked' : ''} onchange="rankingParticipar(this.checked)"><span class="audio-toggle-text">Aparecer en el ranking global</span></label>
      <label class="form-label" for="rk-apodo">Apodo público (2–20 letras, números, espacio . _ -)</label>
      <input id="rk-apodo" maxlength="20" value="${escapeHtml(perfil.apodo)}" placeholder="Ej: Leinier" onchange="rankingGuardarApodo()">
      <p class="import-hint">Solo se publican: apodo, puntos, nivel y nº de ejercicios evaluados. Nada de rutinas, historial, medidas ni correo. Entras en la lista cuando tienes datos suficientes (ver «¿Cómo se calcula?»). Puedes salir cuando quieras y tu fila se borra.</p>
    </div>`;
  }

  if (!cache) {
    html += `<div class="nut-card"><p class="texto-vacio">${!uid ? '' : navigator.onLine ? 'Aún no se ha descargado el ranking.' : 'Sin conexión y todavía no hay ranking guardado en este dispositivo. Se cargará solo cuando tengas internet.'}</p></div>`;
  } else {
    const filas = cache.filas.map((f, i) => ({ ...f, pos: i + 1 })).filter(f => !_filtroNivel || f.nivel === _filtroNivel);
    const cuando = new Date(cache.fecha).toLocaleString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
    html += `<div class="nut-card">
      <div class="stats-seccion-cab"><h3>🏅 Ranking</h3>
        <select id="rk-filtro" aria-label="Filtrar por nivel" onchange="rankingFiltro(this.value)">
          <option value="0">Todos los niveles</option>${NIVELES.map(n => `<option value="${n.n}"${n.n === _filtroNivel ? ' selected' : ''}>Nivel ${n.n} · ${n.nombre}</option>`).join('')}
        </select></div>
      <p class="import-hint">${navigator.onLine ? '' : '📴 Sin conexión · '}Última actualización: ${escapeHtml(cuando)}</p>
      ${filas.length ? `<ol class="rk-lista">${filas.map(f => `
        <li class="rk-fila${f.id === uid ? ' rk-yo' : ''}"><span class="rk-pos">${f.pos}</span><span class="rk-nombre">${escapeHtml(f.apodo)}</span><span class="rk-niv">Nv ${f.nivel} · ${escapeHtml((NIVELES.find(n => n.n === f.nivel) || {}).nombre || '')}</span><span class="rk-pts">+${fmtPct(f.puntos / 10)} %</span></li>`).join('')}</ol>`
        : '<p class="texto-vacio">Nadie en este nivel todavía.</p>'}
      <p class="import-hint">Se muestran los 100 primeros.</p>
    </div>`;
  }
  if (_tablaFalta) html += `<div class="nut-card"><p>⚠️ La tabla del ranking no existe o está sin actualizar en tu Supabase. Ejecuta <code>supabase_ranking.sql</code> una vez (instrucciones en CAMBIOS.md).</p></div>`;
  cont.innerHTML = html;
}

window.rankingFiltro = function (v) { _filtroNivel = parseInt(v, 10) || 0; pintarRanking(); };
window.rankingGuardarApodo = function () {
  const el = document.getElementById('rk-apodo');
  const a = apodoValido(el?.value);
  if (!a) { showToast('Apodo no válido: 2–20 caracteres (letras, números, espacio . _ -)', 'warning', 4000); return; }
  const p = leerPerfilRanking();
  if (a === p.apodo) return;
  if (guardarPerfilRanking({ ...p, apodo: a })) { if (p.activo) actualizarRanking({ forzar: true }).then(() => pintarRanking()); showToast('Apodo guardado', 'success', 1800); }
};
window.rankingParticipar = async function (activo) {
  const p = leerPerfilRanking();
  if (activo) {
    const a = apodoValido(document.getElementById('rk-apodo')?.value || p.apodo);
    if (!a) { showToast('Escribe primero un apodo válido', 'warning'); const c = document.getElementById('rk-activo'); if (c) c.checked = false; return; }
    if (!guardarPerfilRanking({ activo: true, apodo: a })) return;
    if (!navigator.onLine) { showToast('Participarás en cuanto haya conexión', 'info', 3500); pintarRanking(); return; }
    const r = await actualizarRanking({ forzar: true });
    showToast(r.ok ? 'Ya apareces en el ranking' : r.motivo === 'sin-tabla' ? 'Falta crear o actualizar la tabla del ranking en Supabase (supabase_ranking.sql)' : 'No se pudo publicar ahora; se reintentará', r.ok ? 'success' : 'warning', 4000);
    pintarRanking();
  } else {
    guardarPerfilRanking({ ...p, activo: false });
    try {
      if (userState.uid && navigator.onLine) { const sb = await getSupabase(); await sb.from('ranking').delete().eq('id', userState.uid); }
      else showToast('Sin conexión: tu fila se borrará de la nube la próxima vez que se pueda', 'info', 4500);
    } catch {}
    pintarRanking();
  }
};

export async function abrirPantallaRanking() {
  pintarRanking();
  const r = await actualizarRanking({ forzar: true });
  if (r.ok === false && r.motivo === 'error') showToast('No se pudo actualizar; se muestra la última descarga', 'info', 3500);
  if (pantallaAbierta()) pintarRanking();
}
// gt-build:v108
