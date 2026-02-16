// userState.js - VERSIÓN FINAL CORREGIDA
import { supabase } from "./cloud.js";

export const userState = {
  uid: null,
  email: null,
  sessionToken: null
};

// Cargar estado desde localStorage
export function loadLocal() {
  const saved = localStorage.getItem("userState");
  if (saved) {
    try {
      const data = JSON.parse(saved);
      userState.uid = data.uid;
      userState.email = data.email;
      userState.sessionToken = data.sessionToken;
    } catch (e) {
      console.error("Error cargando userState:", e);
    }
  }
}

// Guardar estado en localStorage
export function saveLocal() {
  localStorage.setItem("userState", JSON.stringify({
    uid: userState.uid,
    email: userState.email,
    sessionToken: userState.sessionToken
  }));
}

// Sincronizar desde la nube
export async function syncFromCloud() {
  if (!userState.uid) {
    console.log("No hay UID, saltando sync desde nube");
    return;
  }
  
  // Obtener sesión activa
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  
  if (sessionError || !sessionData.session) {
    console.log("No hay sesión activa para sincronizar desde nube");
    return;
  }

  const { data, error } = await supabase
    .from("usuarios")
    .select("*")
    .eq("id", sessionData.session.user.id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      console.log("Primera vez, no hay datos en la nube");
    } else {
      console.error("Error cargando desde nube:", error);
    }
    return;
  }

  if (data && data.data) {
    const cloudData = typeof data.data === 'string' 
      ? JSON.parse(data.data) 
      : data.data;
    
    // Restaurar datos en localStorage
    Object.keys(cloudData).forEach(key => {
      if (key !== "userState") {
        localStorage.setItem(key, cloudData[key]);
      }
    });
    
    console.log("✅ Datos sincronizados desde la nube");
  }
}

// Sincronizar a la nube
export async function syncToCloud() {
  if (!userState.uid) {
    throw new Error("No hay usuario autenticado");
  }

  // Obtener sesión activa
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  
  if (sessionError) {
    console.error("Error obteniendo sesión:", sessionError);
    throw new Error("Error de autenticación. Inicia sesión de nuevo.");
  }
  
  if (!sessionData.session) {
    throw new Error("No hay sesión activa. Inicia sesión de nuevo.");
  }
  
  // Verificar que el UID coincida
  if (sessionData.session.user.id !== userState.uid) {
    console.warn("UID mismatch, actualizando local", {
      local: userState.uid,
      session: sessionData.session.user.id
    });
    
    // Actualizar UID local con el de la sesión
    userState.uid = sessionData.session.user.id;
    userState.email = sessionData.session.user.email;
    userState.sessionToken = sessionData.session.access_token;
    saveLocal();
  }

  // Recopilar todos los datos de localStorage
  const localData = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    // Excluir claves de sistema
    if (key !== "userState" && !key.startsWith("supabase.")) {
      localData[key] = localStorage.getItem(key);
    }
  }

  console.log("📤 Sincronizando a nube...", {
    uid: sessionData.session.user.id,
    keysCount: Object.keys(localData).length
  });

  // Usar el UID de la sesión activa
  const { error } = await supabase
    .from("usuarios")
    .upsert(
      {
        id: sessionData.session.user.id,
        data: localData
      },
      { 
        onConflict: 'id'
      }
    );

  if (error) {
    console.error("❌ Error sincronizando:", error);
    throw error;
  }
  
  console.log("✅ Datos sincronizados a la nube");
}

// Marcar como modificado
export function markDirty() {
  saveLocal();
}

// Cargar al inicio
loadLocal();
