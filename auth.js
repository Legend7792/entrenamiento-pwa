// auth.js - CON RESTAURACIÓN OFFLINE
import { supabase } from "./cloud.js";
import { userState, saveLocal, syncFromCloud, syncToCloud } from "./userState.js";

// Mostrar pantalla de autenticación
export function mostrarPantallaAuth() {
  document.getElementById("pantalla-auth").classList.remove("oculto");
  document.getElementById("pantalla-perfil").classList.add("oculto");
  document.getElementById("menu").classList.add("oculto");
}

// Mostrar menú principal
export function mostrarMenu() {
  document.getElementById("pantalla-auth").classList.add("oculto");
  document.getElementById("pantalla-perfil").classList.add("oculto");
  document.getElementById("menu").classList.remove("oculto");
}

// Mostrar perfil
export function mostrarPerfil() {
  history.pushState({ pantalla: 'perfil' }, "");

  document.getElementById("pantalla-auth").classList.add("oculto");
  document.getElementById("menu").classList.add("oculto");
  document.getElementById("pantalla-dia").classList.add("oculto");
  document.getElementById("pantalla-historial").classList.add("oculto");
  document.getElementById("pantalla-detalle").classList.add("oculto");
  document.getElementById("pantalla-medidas").classList.add("oculto");
  
  document.getElementById("pantalla-perfil").classList.remove("oculto");
  document.getElementById("user-email-label").innerText = `Usuario: ${userState.email}`;
}

// Registrar usuario
window.register = async function () {
  const email = document.getElementById("user-email").value.trim();
  const pass = document.getElementById("user-pass").value;

  if (!email || !pass) {
    alert("Por favor completa todos los campos");
    return;
  }

  if (pass.length < 6) {
    alert("La contraseña debe tener al menos 6 caracteres");
    return;
  }

  try {
    const { data, error } = await supabase.auth.signUp({ 
      email, 
      password: pass 
    });
    
    if (error) throw error;

    alert("✅ Cuenta creada. Revisa tu email para confirmar (si Supabase lo requiere)");
    
    userState.uid = data.user.id;
    userState.email = email;
    userState.sessionToken = data.session.access_token;
    saveLocal();
    
    await syncToCloud();
    
    mostrarMenu();
  } catch (error) {
    alert("❌ Error al registrar: " + error.message);
  }
};

// Iniciar sesión
window.login = async function () {
  const email = document.getElementById("user-email").value.trim();
  const pass = document.getElementById("user-pass").value;

  if (!email || !pass) {
    alert("Por favor completa todos los campos");
    return;
  }

  try {
    const { data, error } = await supabase.auth.signInWithPassword({ 
      email, 
      password: pass 
    });
    
    if (error) throw error;

    userState.uid = data.user.id;
    userState.email = email;
    userState.sessionToken = data.session.access_token;
    saveLocal();
    
    await syncFromCloud();
    
    mostrarMenu();
    location.reload();
  } catch (error) {
    alert("❌ Error al iniciar sesión: " + error.message);
  }
};

// Cerrar sesión
window.logout = async function () {
  if (!confirm("¿Cerrar sesión? Los datos locales se mantendrán.")) return;
  
  try {
    await syncToCloud();
    await supabase.auth.signOut();
    
    // Limpiar estado
    userState.uid = null;
    userState.email = null;
    userState.sessionToken = null;
    localStorage.removeItem("userState");
    
    location.reload();
  } catch (error) {
    console.error("Error cerrando sesión:", error);
    alert("Error al cerrar sesión");
  }
};

// Sincronizar manualmente
window.syncNow = async function () {
  if (!userState.uid) {
    alert("No hay sesión activa");
    return;
  }
  
  const btn = event.target;
  btn.disabled = true;
  btn.innerText = "Sincronizando...";
  
  try {
    await syncToCloud();
    alert("✅ Sincronización completada");
  } catch (error) {
    alert("❌ Error en sincronización: " + error.message);
  } finally {
    btn.disabled = false;
    btn.innerText = "Sincronizar";
  }
};

// Verificar sesión al cargar
window.addEventListener("DOMContentLoaded", async () => {
  // PRIMERO: Verificar si hay sesión guardada en localStorage
  if (userState.uid && userState.email) {
    console.log("📱 Sesión offline detectada:", userState.email);
    mostrarMenu();
    return;
  }
  
  // SEGUNDO: Si no hay sesión local, intentar con Supabase
  try {
    const { data } = await supabase.auth.getSession();
    
    if (data.session) {
      userState.uid = data.session.user.id;
      userState.email = data.session.user.email;
      userState.sessionToken = data.session.access_token;
      saveLocal();
      mostrarMenu();
    } else {
      mostrarPantallaAuth();
    }
  } catch (error) {
    console.log("Sin conexión y sin sesión local");
    mostrarPantallaAuth();
  }
});

window.mostrarPerfil = mostrarPerfil;
