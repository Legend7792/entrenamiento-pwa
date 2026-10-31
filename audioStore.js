// audioStore.js — Guarda el sonido personalizado en IndexedDB (no en localStorage)
//
// localStorage tiene ~5 M de caracteres y un MP3 de 5 MB en base64 ocupa ~7 M: no cabía,
// además se subía a la nube y entraba en cada backup. IndexedDB admite archivos grandes.

const DB = 'gym-tracker-audio';
const STORE = 'audio';
const KEY = 'personalizado';

function abrir() {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) { reject(new Error('IndexedDB no disponible')); return; }
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx(modo, fn) {
  const db = await abrir();
  try {
    return await new Promise((resolve, reject) => {
      const t = db.transaction(STORE, modo);
      const r = fn(t.objectStore(STORE));
      t.oncomplete = () => resolve(r?.result);
      t.onerror = () => reject(t.error);
      t.onabort = () => reject(t.error);
    });
  } finally { db.close(); }
}

export function guardarAudio(arrayBuffer, nombre, tipo) {
  return tx('readwrite', s => s.put({ datos: arrayBuffer, nombre, tipo: tipo || 'audio/mpeg' }, KEY));
}

// { datos: ArrayBuffer, nombre, tipo } | undefined
export function leerAudio() {
  return tx('readonly', s => s.get(KEY));
}

export function borrarAudio() {
  return tx('readwrite', s => s.delete(KEY));
}

// Migra el audio antiguo (base64 en localStorage) a IndexedDB. Devuelve true si migró algo.
export async function migrarAudioLegacy() {
  const dataUrl = localStorage.getItem('audioPersonalizado');
  const nombre = localStorage.getItem('audioPersonalizadoNombre');
  if (!dataUrl) return false;
  try {
    const resp = await fetch(dataUrl);
    const buf = await resp.arrayBuffer();
    await guardarAudio(buf, nombre || 'audio', resp.headers.get('content-type') || 'audio/mpeg');
    localStorage.removeItem('audioPersonalizado');
    localStorage.removeItem('audioPersonalizadoNombre');
    return true;
  } catch {
    return false;
  }
}
