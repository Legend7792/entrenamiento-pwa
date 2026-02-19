// auth.js - VERSIÓN CORREGIDA COMPLETA
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
    
    if (error) {
      if (error.message.includes('User already registered')) {
        alert('⚠️ Este email ya está registrado. Si no has verificado tu email, usa el botón "📧 Reenviar email de verificación".');
        return;
      }
      throw error;
    }

    // Verificar si hay sesión
    if (data.session) {
      // Verificación desactivada → sesión inmediata
      userState.uid = data.user.id;
      userState.email = email;
      userState.sessionToken = data.session.access_token;
      saveLocal();
      
      await syncToCloud();
      
      // Resetear SOLO la pantalla, mantener datos
      const estadoActual = JSON.parse(localStorage.getItem("estadoApp")) || {};
      estadoActual.pantalla = "menu";
      estadoActual.diaActual = null;
      localStorage.setItem("estadoApp", JSON.stringify(estadoActual));
      
      alert("✅ Cuenta creada correctamente");
      mostrarMenu();
    } else {
      // Verificación activada → sin sesión hasta verificar
      alert("✅ Cuenta creada. Revisa tu email (y carpeta spam) para verificar tu cuenta.");
    }
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
    
    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        alert("❌ Email o contraseña incorrectos. Si no has verificado tu email, usa el botón de reenvío.");
      } else if (error.message.includes('Email not confirmed')) {
        alert("⚠️ Debes verificar tu email antes de iniciar sesión. Usa el botón '📧 Reenviar email de verificación'.");
      } else {
        alert("❌ Error al iniciar sesión: " + error.message);
      }
      return;
    }

    userState.uid = data.user.id;
    userState.email = data.user.email;
    userState.sessionToken = data.session.access_token;
    saveLocal();
    
    await syncFromCloud();
    
    // Resetear SOLO la pantalla, mantener datos
    const estadoActual = JSON.parse(localStorage.getItem("estadoApp")) || {};
    estadoActual.pantalla = "menu";
    estadoActual.diaActual = null;
    localStorage.setItem("estadoApp", JSON.stringify(estadoActual));
    
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
    if (userState.uid && navigator.onLine) {
      try {
        await syncToCloud();
        console.log('✅ Datos sincronizados antes de cerrar sesión');
      } catch (syncError) {
        console.warn('⚠️ No se pudo sincronizar antes de cerrar sesión:', syncError);
      }
    }
    
    try {
      await supabase.auth.signOut();
      console.log('✅ Sesión cerrada en Supabase');
    } catch (signOutError) {
      console.warn('⚠️ No se pudo cerrar sesión en Supabase:', signOutError);
    }
    
  } catch (error) {
    console.error("Error durante logout:", error);
  } finally {
    userState.uid = null;
    userState.email = null;
    userState.sessionToken = null;
    localStorage.removeItem("userState");
    
    console.log('✅ Estado local limpiado');
    location.reload();
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

// Reenviar email de verificación
window.reenviarVerificacion = async function() {
  const email = document.getElementById("user-email").value.trim();
  
  if (!email) {
    alert("⚠️ Por favor ingresa tu email");
    return;
  }
  
  try {
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email
    });
    
    if (error) {
      if (error.message.includes('already confirmed') || error.message.includes('Email already confirmed')) {
        alert('✅ Esta cuenta ya está verificada. Puedes iniciar sesión directamente.');
      } else if (error.message.includes('not found') || error.message.includes('User not found')) {
        alert('❌ No existe una cuenta con este email. Regístrate primero.');
      } else {
        throw error;
      }
    } else {
      alert('✅ Email de verificación reenviado. Revisa tu bandeja de entrada y carpeta de spam.');
    }
  } catch (error) {
    alert('❌ Error: ' + error.message);
  }
};

// Enviar email de recuperación
window.recuperarPassword = async function() {
  const email = document.getElementById("user-email").value.trim();
  
  if (!email) {
    alert("⚠️ Por favor ingresa tu email");
    return;
  }
  
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'https://legend7792.github.io/entrenamiento-pwa/'
    });
    
    if (error) throw error;
    
    alert('✅ Email de recuperación enviado. Revisa tu bandeja de entrada y spam.');
  } catch (error) {
    alert('❌ Error: ' + error.message);
  }
};

// Cambiar contraseña
window.cambiarPassword = async function() {
  const nuevaPassword = document.getElementById("nueva-password").value;
  const confirmarPassword = document.getElementById("confirmar-password").value;
  
  if (!nuevaPassword || !confirmarPassword) {
    alert("⚠️ Completa ambos campos");
    return;
  }
  
  if (nuevaPassword.length < 6) {
    alert("⚠️ La contraseña debe tener al menos 6 caracteres");
    return;
  }
  
  if (nuevaPassword !== confirmarPassword) {
    alert("❌ Las contraseñas no coinciden");
    return;
  }
  
  try {
    const { error } = await supabase.auth.updateUser({
      password: nuevaPassword
    });
    
    if (error) throw error;
    
    document.getElementById("nueva-password").value = "";
    document.getElementById("confirmar-password").value = "";
    
    alert('✅ Contraseña actualizada correctamente');
  } catch (error) {
    alert('❌ Error al cambiar contraseña: ' + error.message);
  }
};

// ========================================
// INICIALIZACIÓN Y MANEJO DE SESIÓN
// ========================================
window.addEventListener("DOMContentLoaded", async () => {
  const hashParams = new URLSearchParams(window.location.hash.substring(1));
  const accessToken = hashParams.get('access_token');
  const type = hashParams.get('type');
  const fullHash = window.location.hash;
  
  // CASO 1: Hash personalizado de recuperación
  if (fullHash === '#reset-password' || fullHash.includes('reset-password')) {
    console.log('🔍 Detectado hash personalizado de recuperación');
    
    try {
      const { data, error } = await supabase.auth.getSession();
      
      if (error) throw error;
      
      if (data.session) {
        userState.uid = data.session.user.id;
        userState.email = data.session.user.email;
        userState.sessionToken = data.session.access_token;
        saveLocal();
        
        window.location.hash = '';
        mostrarPerfil();
        
        alert('🔑 Ahora puedes establecer tu nueva contraseña abajo.');
        
        setTimeout(() => {
          const inputPassword = document.getElementById('nueva-password');
          if (inputPassword) {
            inputPassword.scrollIntoView({ behavior: 'smooth', block: 'center' });
            inputPassword.focus();
          }
        }, 500);
        
        return;
      } else {
        alert('⚠️ No se pudo procesar el link. Intenta solicitar uno nuevo.');
        mostrarPantallaAuth();
        return;
      }
    } catch (error) {
      console.error('Error con link de recuperación:', error);
      alert('❌ Error: ' + error.message);
      mostrarPantallaAuth();
      return;
    }
  }
  
  // CASO 2: Link de verificación de email
  if (accessToken && type === 'signup') {
    console.log('🔍 Detectado link de verificación de email');
    
    try {
      const { data, error } = await supabase.auth.getSession();
      
      if (error) throw error;
      
      if (data.session) {
        userState.uid = data.session.user.id;
        userState.email = data.session.user.email;
        userState.sessionToken = data.session.access_token;
        saveLocal();
        
        await syncFromCloud();
        
        window.location.hash = '';
        
        // Resetear SOLO la pantalla
        const estadoActual = JSON.parse(localStorage.getItem("estadoApp")) || {};
        estadoActual.pantalla = "menu";
        estadoActual.diaActual = null;
        localStorage.setItem("estadoApp", JSON.stringify(estadoActual));
        
        alert('✅ Email verificado correctamente. ¡Bienvenido!');
        mostrarMenu();
        return;
      } else {
        alert('⚠️ No se pudo verificar el email. Intenta iniciar sesión manualmente.');
        mostrarPantallaAuth();
        return;
      }
    } catch (error) {
      console.error('Error verificando email:', error);
      alert('❌ Error al verificar: ' + error.message);
      mostrarPantallaAuth();
      return;
    }
  }
  
  // CASO 3: Link de recuperación con access_token
  if (accessToken && (type === 'recovery' || type === 'magiclink')) {
    console.log('🔍 Detectado link de recuperación con access_token');
    
    try {
      const { data, error } = await supabase.auth.getSession();
      
      if (error) throw error;
      
      if (data.session) {
        userState.uid = data.session.user.id;
        userState.email = data.session.user.email;
        userState.sessionToken = data.session.access_token;
        saveLocal();
        
        window.location.hash = '';
        mostrarPerfil();
        
        alert('🔑 Ahora puedes establecer tu nueva contraseña abajo.');
        
        setTimeout(() => {
          const inputPassword = document.getElementById('nueva-password');
          if (inputPassword) {
            inputPassword.scrollIntoView({ behavior: 'smooth', block: 'center' });
            inputPassword.focus();
          }
        }, 500);
        
        return;
      } else {
        alert('⚠️ No se pudo procesar el link. Intenta solicitar uno nuevo.');
        mostrarPantallaAuth();
        return;
      }
    } catch (error) {
      console.error('Error con link de recuperación:', error);
      alert('❌ Error: ' + error.message);
      mostrarPantallaAuth();
      return;
    }
  }
  
  // CASO 4: Sesión offline
  if (userState.uid && userState.email) {
    console.log("📱 Sesión offline detectada:", userState.email);
    mostrarMenu();
    return;
  }
  
  // CASO 5: Sesión online
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

// ========================================
// ORDENAR EJERCICIOS
// ========================================

function moverEjercicioArriba(ejercicioIndex) {
  if (!rutinaEditando || diaEditando === null) return;
  
  const exito = moverEjercicio(rutinaEditandoId, diaEditando, ejercicioIndex, 'arriba');
  
  if (exito) {
    rutinaEditando = loadRutinaUsuario(rutinaEditandoId);
    renderEditorDia();
  }
}

function moverEjercicioAbajo(ejercicioIndex) {
  if (!rutinaEditando || diaEditando === null) return;
  
  const exito = moverEjercicio(rutinaEditandoId, diaEditando, ejercicioIndex, 'abajo');
  
  if (exito) {
    rutinaEditando = loadRutinaUsuario(rutinaEditandoId);
    renderEditorDia();
  }
}

window.moverEjercicioArriba = moverEjercicioArriba;
window.moverEjercicioAbajo = moverEjercicioAbajo;

// ========================================
// RESTAURAR RUTINA BASE
// ========================================

window.restaurarRutinaBaseOriginal = function() {
  const exito = restaurarRutinaBase();
  
  if (exito) {
    // Si estamos editando la rutina base, recargar
    if (rutinaEditandoId === RUTINA_BASE_ID) {
      editarRutina(RUTINA_BASE_ID);
    }
    
    // Actualizar selector
    renderizarSelectorRutinas();
  }
};

window.mostrarPerfil = mostrarPerfil;

