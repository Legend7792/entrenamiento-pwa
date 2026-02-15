// userState.js - VERSIÓN CORREGIDA
import { supabase } from "./cloud.js"; // 👈 AÑADIR ESTA LÍNEA


// userState.js - CON PERSISTENCIA DE SESIÓN
export const userState = {
  uid: null,
  email: null,
  sessionToken: null // 👈 NUEVO
};

// Cargar estado desde localStorage
export function loadLocal() {
  const saved = localStorage.getItem("userState");
  if (saved) {
    try {
      const data = JSON.parse(saved);
      userState.uid = data.uid;
      userState.email = data.email;
      userState.sessionToken = data.sessionToken; // 👈 NUEVO
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
    sessionToken: userState.sessionToken // 👈 NUEVO
  }));
}

// Sincronizar desde la nube
export async function syncFromCloud() {
  if (!userState.uid) return;
  
  const { data, error } = await supabase
    .from("user_data")
    .select("*")
    .eq("user_id", userState.uid)
    .single();

  if (error) {
    console.log("No hay datos en la nube (primera vez)");
    return;
  }

  if (data && data.local_storage) {
    const cloudData = JSON.parse(data.local_storage);
    
    // Restaurar datos en localStorage
    Object.keys(cloudData).forEach(key => {
      if (key !== "userState") { // No sobrescribir userState
        localStorage.setItem(key, cloudData[key]);
      }
    });
    
    console.log("Datos sincronizados desde la nube");
  }
}

// Sincronizar a la nube
export async function syncToCloud() {
  if (!userState.uid) return;

  // Recopilar todos los datos de localStorage
  const localData = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key !== "userState") { // No sincronizar userState (tiene el token)
      localData[key] = localStorage.getItem(key);
    }
  }

  const { error } = await supabase
    .from("user_data")
    .upsert({
      user_id: userState.uid,
      local_storage: JSON.stringify(localData),
      updated_at: new Date().toISOString()
    });

  if (error) {
    console.error("Error sincronizando:", error);
    throw error;
  }
  
  console.log("Datos sincronizados a la nube");
}

// Marcar como modificado (para themes.js)
export function markDirty() {
  // Guardar inmediatamente cuando hay cambios
  saveLocal();
}

// Cargar al inicio
loadLocal();
