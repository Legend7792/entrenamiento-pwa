// userState.js — Estado de usuario y sincronización con la nube (segura)
//
// Cambios clave respecto a la versión anterior:
//  * Solo se sincronizan claves de una LISTA PERMITIDA (nunca la API key, el audio,
//    el estado de pantalla ni la sesión).
//  * Antes de subir se comprueba si otro dispositivo subió datos más nuevos
//    (comparando _syncedAt). Si es así NO se sobrescribe: se avisa o se fusiona.
//  * Bajar de la nube FUSIONA (historial y medidas se unen) en vez de borrar lo local.
//  * Ya no se sube nada solo por abrir la app: solo si hubo cambios (bandera "dirty").

import { getSupabase } from "./cloud.js";

export const userState = { uid: null, email: null };

// ── Claves ────────────────────────────────────────────
const CLAVES_SYNC = new Set([
  'historial', 'historialMedidas', 'config', 'rutinas_usuario', 'rutinaActiva',
  'notasProgresion', 'tema', 'timers', 'vibrarAlTerminar', 'audioGain', 'modoDosPersonas',
  'historialBorrados',  // lápidas: sesiones borradas a propósito (formato "fecha|dia")
  'medidasBorradas'     // lápidas: medidas borradas a propósito (la fecha del registro)
]);
const PREFIJOS_SYNC = ['deloadState_'];

export function esClaveSincronizable(k) {
  return CLAVES_SYNC.has(k) || PREFIJOS_SYNC.some(p => k.startsWith(p));
}

// Claves que NUNCA van a un backup ni se restauran desde él (sesión, secretos, estado temporal)
const CLAVES_NO_BACKUP = new Set([
  'userState', 'anthropic_api_key', 'estadoApp', 'gym_sesion_parcial',
  'gym_dirty', 'gym_ultimoUid', 'gym_modoLocal', 'gym_bienvenida', '_syncedAt',
  'audioPersonalizado', 'audioPersonalizadoNombre',
  'gym_ultimoBackup', 'gym_backupSnooze'
]);
export function esClaveBackup(k) {
  return !CLAVES_NO_BACKUP.has(k) && !k.startsWith('supabase.') && !k.startsWith('sb-');
}

// ── Sesión local (solo uid y email; el token lo guarda Supabase por su cuenta) ──
export function loadLocal() {
  const saved = localStorage.getItem("userState");
  if (saved) {
    try {
      const data = JSON.parse(saved);
      userState.uid   = data.uid || null;
      userState.email = data.email || null;
    } catch (e) {
      console.error("Error cargando userState:", e);
    }
  }
}

export function saveLocal() {
  try {
    localStorage.setItem("userState", JSON.stringify({ uid: userState.uid, email: userState.email }));
  } catch (e) {
    console.warn("saveLocal: no se pudo guardar:", e);
  }
}

// ── Fusión de datos ───────────────────────────────────
function parse(s, def) {
  try { const v = JSON.parse(s); return v ?? def; } catch { return def; }
}

const CLAVE_LISTA = {
  historial:        s => `${s?.fecha}|${s?.dia}`,
  historialMedidas: m => `${m?.fecha}`
};

function unirListas(clave, a, b) {
  const mapa = new Map();
  [...a, ...b].forEach(x => {
    if (!x || !x.fecha) return;
    const k = CLAVE_LISTA[clave](x);
    if (!mapa.has(k)) mapa.set(k, x);
  });
  return [...mapa.values()].sort((x, y) => new Date(x.fecha) - new Date(y.fecha));
}

// Une dos valores (strings de localStorage) de una misma clave.
// prioridad: 'local' | 'remoto' → quién gana cuando ambos tienen la misma clave/subclave.
export function mezclarValor(clave, vLocal, vRemoto, prioridad) {
  if (vLocal === null || vLocal === undefined) return vRemoto;
  if (vRemoto === null || vRemoto === undefined) return vLocal;
  if (vLocal === vRemoto) return vLocal;
  const gana    = prioridad === 'remoto' ? vRemoto : vLocal;
  const pierde  = prioridad === 'remoto' ? vLocal  : vRemoto;

  if (clave === 'historialBorrados' || clave === 'medidasBorradas') {
    const a = parse(vLocal, []), b = parse(vRemoto, []);
    if (!Array.isArray(a) || !Array.isArray(b)) return gana;
    return JSON.stringify([...new Set([...a, ...b])].slice(-3000));
  }

  if (CLAVE_LISTA[clave]) {
    const a = parse(vLocal, []), b = parse(vRemoto, []);
    if (!Array.isArray(a) || !Array.isArray(b)) return gana;
    return JSON.stringify(unirListas(clave, a, b));
  }

  if (clave === 'rutinas_usuario') {
    const g = parse(gana, {}), p = parse(pierde, {});
    return JSON.stringify({ ...p, ...g });
  }

  if (clave === 'config') {
    const g = parse(gana, {}), p = parse(pierde, {});
    const r = { ...p, ...g };
    ['pesos', 'descansos', 'incrementos', 'ejerciciosExtra'].forEach(sub => {
      r[sub] = { ...(p[sub] || {}), ...(g[sub] || {}) };
    });
    return JSON.stringify(r);
  }

  if (clave === 'notasProgresion') {
    const g = parse(gana, {}), p = parse(pierde, {});
    const r = { ...p };
    Object.keys(g).forEach(id => {
      const gi = g[id] || {}, pi = p[id] || {};
      r[id] = { ...pi, ...gi, dias: { ...(pi.dias || {}), ...(gi.dias || {}) } };
    });
    return JSON.stringify(r);
  }

  return gana;
}

export function mezclarDatos(local, remoto, prioridad) {
  const out = {};
  const claves = new Set([...Object.keys(local), ...Object.keys(remoto)]);
  claves.forEach(k => {
    if (!esClaveSincronizable(k)) return;
    const v = mezclarValor(k, local[k], remoto[k], prioridad);
    if (v !== undefined && v !== null) out[k] = v;
  });

  // Aplicar las lápidas: una sesión borrada en un dispositivo no debe reaparecer al fusionar
  if (out.historial && out.historialBorrados) {
    const borrados = new Set(parse(out.historialBorrados, []));
    const lista = parse(out.historial, []);
    if (Array.isArray(lista) && borrados.size) {
      const filtrada = lista.filter(s => !borrados.has(CLAVE_LISTA.historial(s)));
      if (filtrada.length !== lista.length) out.historial = JSON.stringify(filtrada);
    }
  }
  if (out.historialMedidas && out.medidasBorradas) {
    const borradas = new Set(parse(out.medidasBorradas, []));
    const lista = parse(out.historialMedidas, []);
    if (Array.isArray(lista) && borradas.size) {
      const filtrada = lista.filter(m => !borradas.has(CLAVE_LISTA.historialMedidas(m)));
      if (filtrada.length !== lista.length) out.historialMedidas = JSON.stringify(filtrada);
    }
  }
  return out;
}

function recopilarLocal() {
  const datos = {};
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (esClaveSincronizable(k)) datos[k] = localStorage.getItem(k);
  }
  return datos;
}

function aplicarALocal(datos) {
  Object.keys(datos).forEach(k => {
    if (!esClaveSincronizable(k)) return;
    try { localStorage.setItem(k, datos[k]); } catch (e) { console.warn("No se pudo guardar", k, e.message); }
  });
}

function limpiarDirty() { try { localStorage.removeItem('gym_dirty'); } catch {} }

// ── Nube ──────────────────────────────────────────────
async function sesionActiva(sb) {
  const { data, error } = await sb.auth.getSession();
  if (error) throw new Error("Error de autenticación. Inicia sesión de nuevo.");
  if (!data?.session) throw new Error("No hay sesión activa. Inicia sesión de nuevo.");
  return data.session;
}

// Devuelve el objeto data de la nube, o null si aún no hay fila.
async function leerNube(sb, uid) {
  const { data, error } = await sb.from("usuarios").select("data").eq("id", uid).single();
  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }
  if (!data?.data) return null;
  return typeof data.data === "string" ? JSON.parse(data.data) : data.data;
}

function cancelarAutoSync() { if (_syncTimeout) { clearTimeout(_syncTimeout); _syncTimeout = null; } }

function errorConflicto(syncedAtNube) {
  const e = new Error("La nube tiene datos más nuevos subidos desde otro dispositivo.");
  e.code = "CONFLICT";
  e.syncedAtNube = syncedAtNube || null;
  return e;
}

// Sube los datos de este dispositivo.
//  - auto:   subida automática (nunca fusiona; si hay conflicto, lanza CONFLICT)
//  - mezclar: si hay conflicto, fusiona (gana LO LOCAL en rutinas/pesos/ajustes;
//            historial y medidas se unen) y sube el resultado
export async function syncToCloud({ auto = false, mezclar = false } = {}) {
  if (!userState.uid) throw new Error("No hay usuario autenticado");
  if (!navigator.onLine) throw new Error("Sin conexión");

  const sb = await getSupabase();
  const session = await sesionActiva(sb);

  if (session.user.id !== userState.uid) {
    userState.uid   = session.user.id;
    userState.email = session.user.email;
    saveLocal();
  }

  let datos = recopilarLocal();
  const nube = await leerNube(sb, session.user.id);
  const syncedLocal = localStorage.getItem("_syncedAt") || null;
  const syncedNube  = nube?._syncedAt || null;

  if (nube && syncedNube !== syncedLocal) {
    // Otro dispositivo (o una sesión anterior) subió datos desde la última vez que sincronicé aquí
    if (auto || !mezclar) throw errorConflicto(syncedNube);
    datos = mezclarDatos(datos, nube, 'local');
    aplicarALocal(datos);
  }

  const ahora = new Date().toISOString();
  const { error } = await sb
    .from("usuarios")
    .upsert({ id: session.user.id, data: { ...datos, _syncedAt: ahora } }, { onConflict: "id" });
  if (error) throw error;

  try { localStorage.setItem("_syncedAt", ahora); } catch {}
  limpiarDirty();
  return ahora;
}

// Baja los datos de la nube y los FUSIONA con los locales.
//  - La nube gana en rutinas, pesos y ajustes; historial y medidas se unen.
//  - reemplazar:true (solo al entrar con OTRA cuenta): se descartan los datos locales.
export async function syncFromCloud({ reemplazar = false } = {}) {
  if (!userState.uid) throw new Error("No hay usuario autenticado");

  const sb = await getSupabase();
  const session = await sesionActiva(sb);
  const nube = await leerNube(sb, session.user.id);
  if (!nube) throw new Error("No hay datos guardados en la nube todavía.");

  cancelarAutoSync();

  const local = reemplazar ? {} : recopilarLocal();
  const remoto = {};
  Object.keys(nube).forEach(k => { if (esClaveSincronizable(k) && typeof nube[k] === 'string') remoto[k] = nube[k]; });
  const resultado = mezclarDatos(local, remoto, 'remoto');
  aplicarALocal(resultado);

  const syncedNube = nube._syncedAt || null;
  try {
    if (syncedNube) localStorage.setItem("_syncedAt", syncedNube);
    else localStorage.removeItem("_syncedAt");
  } catch {}

  // Si al fusionar quedaron datos locales que la nube no tiene, hay que subirlos después
  const cambioRespectoNube = Object.keys(resultado).some(k => resultado[k] !== remoto[k]);
  if (cambioRespectoNube) { try { localStorage.setItem('gym_dirty', '1'); } catch {} }
  else limpiarDirty();

  return syncedNube;
}

// Info de la nube SIN bajar datos (para mostrar en el aviso previo)
export async function obtenerInfoNube() {
  if (!userState.uid) return null;
  const sb = await getSupabase();
  const { data: sd } = await sb.auth.getSession();
  if (!sd?.session) return null;
  const nube = await leerNube(sb, sd.session.user.id).catch(() => null);
  if (!nube) return null;
  const numSesiones = parse(nube["historial"], []).length || 0;
  return { syncedAt: nube["_syncedAt"] || null, numSesiones };
}

// ── Auto-sync (solo sube y nunca pisa datos más nuevos de otro dispositivo) ──
let _syncTimeout = null;
let _conflictoAvisado = false;

function avisarConflictoUnaVez() {
  if (_conflictoAvisado) return;
  _conflictoAvisado = true;
  window.showToast?.('⚠️ La nube tiene datos de otro dispositivo. Abre Perfil y pulsa "Subir a la nube" para fusionarlos.', 'warning', 7000);
}

export async function sincronizarAuto() {
  if (!userState.uid || !navigator.onLine) return;
  try {
    await syncToCloud({ auto: true });
  } catch (e) {
    if (e.code === "CONFLICT") avisarConflictoUnaVez();
    else console.log("⚠️ Auto-sync fallido:", e.message);
  }
}

export function markDirty() {
  saveLocal();
  if (!userState.uid) return;
  try { localStorage.setItem('gym_dirty', '1'); } catch {}
  if (navigator.onLine) {
    clearTimeout(_syncTimeout);
    _syncTimeout = setTimeout(() => { _syncTimeout = null; sincronizarAuto(); }, 3000);
  }
}

// Sube solo si hay cambios pendientes (al volver la conexión o al abrir la app)
export function sincronizarSiHaceFalta() {
  if (userState.uid && navigator.onLine && localStorage.getItem('gym_dirty') === '1') {
    return sincronizarAuto();
  }
  return Promise.resolve();
}

// ── Cargar al inicio ────────────────────────────────
loadLocal();

if (typeof window !== "undefined") {
  window.markDirty = markDirty;
}
