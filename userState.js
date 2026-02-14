// userState.js
import { saveUserToCloud, loadUserFromCloud } from "./cloud.js";

export const userState = {
  uid: null,
  email: null,
  isDirty: false // marca si hay cambios sin sincronizar
};

const LOCAL_KEY = "userState";

// Cargar estado del usuario desde localStorage
export function loadLocal() {
  const saved = localStorage.getItem(LOCAL_KEY);
  if (saved) {
    const parsed = JSON.parse(saved);
    userState.uid = parsed.uid;
    userState.email = parsed.email;
  }
}

// Guardar estado del usuario en localStorage
export function saveLocal() {
  localStorage.setItem(LOCAL_KEY, JSON.stringify({
    uid: userState.uid,
    email: userState.email
  }));
}

// Marcar que hay cambios pendientes
export function markDirty() {
  userState.isDirty = true;
}

// Sincronizar datos con la nube
export async function syncToCloud() {
  if (!userState.uid) {
    console.warn("No hay usuario logueado para sincronizar");
    return false;
  }

  try {
    // Recopilar TODOS los datos locales
    const datosLocales = {
      config: localStorage.getItem("config"),
      historial: localStorage.getItem("historial"),
      historialMedidas: localStorage.getItem("historialMedidas"),
      timers: localStorage.getItem("timers"),
      rutinaUsuario: localStorage.getItem("rutinaUsuario"),
      tema: localStorage.getItem("tema") // para cuando añadamos temas
    };

    await saveUserToCloud(userState.uid, datosLocales);
    userState.isDirty = false;
    console.log("✅ Sincronización exitosa");
    return true;
  } catch (error) {
    console.error("❌ Error en sincronización:", error);
    return false;
  }
}

// Cargar datos desde la nube
export async function syncFromCloud() {
  if (!userState.uid) {
    console.warn("No hay usuario logueado");
    return false;
  }

  try {
    const datos = await loadUserFromCloud(userState.uid);
    
    if (!datos) {
      console.log("Primera vez del usuario, no hay datos en la nube");
      return true; // No es error, solo no hay datos aún
    }

    // Restaurar datos locales
    if (datos.config) localStorage.setItem("config", datos.config);
    if (datos.historial) localStorage.setItem("historial", datos.historial);
    if (datos.historialMedidas) localStorage.setItem("historialMedidas", datos.historialMedidas);
    if (datos.timers) localStorage.setItem("timers", datos.timers);
    if (datos.rutinaUsuario) localStorage.setItem("rutinaUsuario", datos.rutinaUsuario);
    if (datos.tema) localStorage.setItem("tema", datos.tema);

    console.log("✅ Datos cargados desde la nube");
    return true;
  } catch (error) {
    console.error("❌ Error cargando desde la nube:", error);
    return false;
  }
}

// Inicializar al cargar la app
loadLocal();
