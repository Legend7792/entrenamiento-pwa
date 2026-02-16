// userState.js - ACTUALIZADO PARA USAR TABLA "usuarios"
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
  if (!userState.uid) return;
  
  const { data, error } = await supabase
    .from("usuarios")  // ← CAMBIADO de "user_data" a "usuarios"
    .select("*")
    .eq("id", userState.uid)  // ← CAMBIADO de "user_id" a "id"
    .single();

  if (error) {
    console.log("No hay datos en la nube (primera vez)");
    return;
  }

  if (data && data.data) {  // ← CAMBIADO de "local_storage" a "data"
    const cloudData = typeof data.data === 'string' 
      ? JSON.parse(data.data) 
      : data.data;
    
    // Restaurar datos en localStorage
    Object.keys(cloudData).forEach(key => {
      if (key !== "userState") {
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
    if (key !== "userState") {
      localData[key] = localStorage.getItem(key);
    }
  }

  const { error } = await supabase
    .from("usuarios")  // ← CAMBIADO de "user_data" a "usuarios"
    .upsert({
      id: userState.uid,  // ← CAMBIADO de "user_id" a "id"
      data: localData     // ← CAMBIADO de "local_storage" a "data"
    });

  if (error) {
    console.error("Error sincronizando:", error);
    throw error;
  }
  
  console.log("Datos sincronizados a la nube");
}

// Marcar como modificado
export function markDirty() {
  saveLocal();
}

// Cargar al inicio
loadLocal();
