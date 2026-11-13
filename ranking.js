// ranking.js — Ranking global de usuarios de la app (mejora 15)
//
// Cómo funciona
//  * Es OPCIONAL y requiere cuenta en la nube. Si activas "Participar", se sube SOLO: apodo, puntos, nivel, nº de sesiones
//    y volumen total. Nunca se suben rutinas, historial, medidas, correo ni nada más.
//  * Los puntos y el nivel se calculan en tu dispositivo con tu historial (ver calcularNivel).
//  * El ranking se descarga solo al abrir la app / volver la conexión / abrir la pantalla. Se guarda la última
//    descarga: sin internet se sigue viendo, indicando de cuándo es.
//  * La tabla se crea con supabase_ranking.sql (hay que ejecutarlo UNA vez en Supabase). Sin esa tabla, la pantalla
//    avisa y el resto de la app funciona igual.
//  * LIMITACIÓN: al calcularse en el cliente, un usuario con conocimientos podría falsear sus puntos. Es un ranking
//    "de confianza entre amigos", no una competición con premios.

import { getSupabase } from "./cloud.js";
import { userState, markDirty } from "./userState.js";
import { repsContables } from "./metodos.js";
import { escapeHtml, showToast, showConfirm } from "./ui.js";

// Niveles por puntos (diseño propio, fácil de ajustar aquí)
export const NIVELES = [
  { n: 1, nombre: 'Novato',     min: 0 },
  { n: 2, nombre: 'Aprendiz',   min: 100 },
  { n: 3, nombre: 'Constante',  min: 300 },
  { n: 4, nombre: 'Intermedio', min: 700 },
  { n: 5, nombre: 'Avanzado',   min: 1500 },
  { n: 6, nombre: 'Élite',      min: 3000 },
  { n: 7, nombre: 'Leyenda',    min: 6000 }
];
export function nivelPorPuntos(p) {
  let r = NIVELES[0];
  NIVELES.forEach(x => { if (p >= x.min) r = x; });
  return r;
}

// puntos = 10 por sesión (no cuentan las de deload) + 1 por cada 1000 kg de volumen levantado
// (volumen = peso × repeticiones; no cuentan bajadas ni series viuda, que usan otro peso)
export function calcularNivel(historial) {
  let sesiones = 0, volumen = 0;
  (Array.isArray(historial) ? historial : []).forEach(s => {
    if (!s || s.deload || !Array.isArray(s.ejercicios)) return;
    sesiones++;
    s.ejercicios.forEach(ej => {
      if (!(ej.peso > 0)) return;
      volumen += ej.peso * repsContables(ej).filter(r => r !== '' && r !== null).reduce((a, r) => a + (Number(r) || 0), 0);
    });
  });
  volumen = Math.round(volumen);
  const puntos = sesiones * 10 + Math.floor(volumen / 1000);
  const nivel = nivelPorPuntos(puntos);
  const sig = NIVELES.find(x => x.min > puntos) || null;
  return { sesiones, volumen, puntos, nivel: nivel.n, nombre: nivel.nombre, siguiente: sig };
}

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
  return /PGRST205|42P01|relation .* does not exist|Could not find the table/i.test(m);
}

async function publicar(sb, uid) {
  const perfil = leerPerfilRanking();
  if (!perfil.activo) return;
  const apodo = apodoValido(perfil.apodo);
  if (!apodo) return;
  const c = calcularNivel(leerHistorial());
  const { error } = await sb.from('ranking').upsert({
    id: uid, apodo, puntos: c.puntos, nivel: c.nivel, sesiones: c.sesiones, volumen_kg: c.volumen, actualizado: new Date().toISOString()
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
        .select('id,apodo,puntos,nivel,sesiones,volumen_kg,actualizado')
        .order('puntos', { ascending: false }).limit(100);
      if (error) throw error;
      _tablaFalta = false;
      const filas = (data || []).map(f => ({ id: f.id, apodo: String(f.apodo || '').slice(0, 20), puntos: Number(f.puntos) || 0, nivel: Number(f.nivel) || 1, sesiones: Number(f.sesiones) || 0 }));
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
  const falta = mio.siguiente ? mio.siguiente.min - mio.puntos : 0;

  let html = `<div class="nut-card rk-mio">
      <h3>Tu nivel</h3>
      <p class="rk-nivel">Nivel ${mio.nivel} · <strong>${escapeHtml(mio.nombre)}</strong></p>
      <p class="import-hint">${mio.puntos} puntos (${mio.sesiones} ${mio.sesiones === 1 ? 'sesión' : 'sesiones'} × 10 + ${Math.floor(mio.volumen / 1000)} por volumen de ${mio.volumen.toLocaleString('es-ES')} kg)${mio.siguiente ? ` · te faltan ${falta} para «${escapeHtml(mio.siguiente.nombre)}»` : ' · ¡nivel máximo!'}</p>
    </div>`;

  if (!uid) {
    html += `<div class="nut-card"><p>El ranking necesita una cuenta en la nube (Perfil → iniciar sesión). Con el modo local no se puede participar.</p></div>`;
  } else {
    html += `<div class="nut-card">
      <h3>Participar en el ranking</h3>
      <label class="audio-toggle-label"><input type="checkbox" id="rk-activo" ${perfil.activo ? 'checked' : ''} onchange="rankingParticipar(this.checked)"><span class="audio-toggle-text">Aparecer en el ranking global</span></label>
      <label class="form-label" for="rk-apodo">Apodo público (2–20 letras, números, espacio . _ -)</label>
      <input id="rk-apodo" maxlength="20" value="${escapeHtml(perfil.apodo)}" placeholder="Ej: Leinier" onchange="rankingGuardarApodo()">
      <p class="import-hint">Solo se publican: apodo, puntos, nivel, nº de sesiones. Nada de rutinas, historial, medidas ni correo. Puedes salir cuando quieras y tu fila se borra.</p>
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
        <li class="rk-fila${f.id === uid ? ' rk-yo' : ''}"><span class="rk-pos">${f.pos}</span><span class="rk-nombre">${escapeHtml(f.apodo)}</span><span class="rk-niv">Nv ${f.nivel} · ${escapeHtml((NIVELES.find(n => n.n === f.nivel) || {}).nombre || '')}</span><span class="rk-pts">${f.puntos} pts</span></li>`).join('')}</ol>`
        : '<p class="texto-vacio">Nadie en este nivel todavía.</p>'}
      <p class="import-hint">Se muestran los 100 primeros.</p>
    </div>`;
  }
  if (_tablaFalta) html += `<div class="nut-card"><p>⚠️ La tabla del ranking aún no existe en tu Supabase. Ejecuta <code>supabase_ranking.sql</code> una vez (instrucciones en CAMBIOS.md).</p></div>`;
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
    showToast(r.ok ? 'Ya apareces en el ranking' : r.motivo === 'sin-tabla' ? 'Falta crear la tabla del ranking en Supabase' : 'No se pudo publicar ahora; se reintentará', r.ok ? 'success' : 'warning', 4000);
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
