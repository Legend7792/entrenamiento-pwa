// userState.js
import { supabase } from "./cloud.js";

export const userState = {
  uid: null,
  email: null,
  sessionToken: null
};

// ── Cargar sesión desde localStorage ────────────────
export function loadLocal() {
  const saved = localStorage.getItem("userState");
  if (saved) {
    try {
      const data = JSON.parse(saved);
      userState.uid   = data.uid;
      userState.email = data.email;
      userState.sessionToken = data.sessionToken;
    } catch (e) {
      console.error("Error cargando userState:", e);
    }
  }
}

// ── Guardar sesión en localStorage ──────────────────
export function saveLocal() {
  try {
    localStorage.setItem("userState", JSON.stringify({
      uid:          userState.uid,
      email:        userState.email,
      sessionToken: userState.sessionToken
    }));
  } catch (e) {
    console.warn("saveLocal: no se pudo guardar:", e);
  }
}

// ── Subir datos a la nube ────────────────────────────
// Solo sube. Nunca baja. Seguro de llamar en cualquier momento.
export async function syncToCloud() {
  if (!userState.uid) throw new Error("No hay usuario autenticado");

  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw new Error("Error de autenticación. Inicia sesión de nuevo.");
  if (!sessionData.session) throw new Error("No hay sesión activa. Inicia sesión de nuevo.");

  // Actualizar UID local si no coincide
  if (sessionData.session.user.id !== userState.uid) {
    userState.uid   = sessionData.session.user.id;
    userState.email = sessionData.session.user.email;
    userState.sessionToken = sessionData.session.access_token;
    saveLocal();
  }

  // Recopilar datos de localStorage
  const localData = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key !== "userState" && !key.startsWith("supabase.")) {
      localData[key] = localStorage.getItem(key);
    }
  }

  // Añadir timestamp de esta subida para que el otro dispositivo sepa cuándo es
  localData["_syncedAt"] = new Date().toISOString();

  const { error } = await supabase
    .from("usuarios")
    .upsert({ id: sessionData.session.user.id, data: localData }, { onConflict: "id" });

  if (error) throw error;

  // Guardar localmente también el timestamp de última subida
  try { localStorage.setItem("_syncedAt", localData["_syncedAt"]); } catch {}
  console.log("✅ Datos subidos a la nube:", localData["_syncedAt"]);
}

// ── Bajar datos de la nube ────────────────────────────
// Sobreescribe localStorage con los datos de la nube.
// PELIGROSO si los datos locales son más nuevos.
// Llamar SOLO cuando el usuario lo pide explícitamente.
export async function syncFromCloud() {
  if (!userState.uid) throw new Error("No hay usuario autenticado");

  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !sessionData.session) throw new Error("No hay sesión activa");

  const { data, error } = await supabase
    .from("usuarios")
    .select("*")
    .eq("id", sessionData.session.user.id)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      throw new Error("No hay datos guardados en la nube todavía.");
    }
    throw error;
  }

  if (!data?.data) throw new Error("La nube no tiene datos para esta cuenta.");

  const cloudData = typeof data.data === "string" ? JSON.parse(data.data) : data.data;

  // Cancelar cualquier auto-sync pendiente para no sobreescribir nube con datos viejos
  if (_syncTimeout) { clearTimeout(_syncTimeout); _syncTimeout = null; }

  // Escribir en localStorage
  Object.keys(cloudData).forEach(key => {
    if (key !== "userState") {
      try { localStorage.setItem(key, cloudData[key]); } catch {}
    }
  });

  console.log("✅ Datos bajados de la nube:", cloudData["_syncedAt"] || "sin fecha");
  return cloudData["_syncedAt"] || null; // devolver timestamp para mostrarlo en UI
}

// ── Obtener info de la nube SIN bajar datos ──────────
// Solo lee el timestamp para informar al usuario antes de confirmar.
export async function obtenerInfoNube() {
  if (!userState.uid) return null;
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData?.session) return null;

  const { data, error } = await supabase
    .from("usuarios")
    .select("data")
    .eq("id", sessionData.session.user.id)
    .single();

  if (error || !data?.data) return null;

  const cloudData = typeof data.data === "string" ? JSON.parse(data.data) : data.data;

  // Contar sesiones en la nube para dar info útil
  let numSesiones = 0;
  try {
    const historial = JSON.parse(cloudData["historial"] || "[]");
    numSesiones = historial.length;
  } catch {}

  return {
    syncedAt:    cloudData["_syncedAt"] || null,
    numSesiones
  };
}

// ── Auto-sync (solo sube, nunca baja) ───────────────
let _syncTimeout = null;

export function markDirty() {
  saveLocal();
  if (userState.uid && navigator.onLine) {
    clearTimeout(_syncTimeout);
    _syncTimeout = setTimeout(() => {
      syncToCloud()
        .then(() => console.log("✅ Auto-sync completado"))
        .catch(e => console.log("⚠️ Auto-sync fallido:", e.message));
    }, 3000);
  }
}

// ── Cargar al inicio ────────────────────────────────
loadLocal();

if (typeof window !== "undefined") {
  window.markDirty = markDirty;
}
