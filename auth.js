// auth.js — completo y limpio
import { supabase } from "./cloud.js";
import { userState, saveLocal, syncFromCloud, syncToCloud } from "./userState.js";
import { showToast, showConfirm } from "./ui.js";

// Flag para distinguir logout manual del automático
let _logoutManual = false;

// ── Listener de cambios de sesión Supabase ──────────
// Se activa cuando Supabase renueva el token, expira la sesión, etc.
// REGLA: nunca redirigir a auth automáticamente; solo actualizar el token local.
supabase.auth.onAuthStateChange((event, session) => {
  if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
    // Token renovado: actualizar solo el token local, no tocar la pantalla
    if (session) {
      userState.sessionToken = session.access_token;
      saveLocal();
    }
  } else if (event === "SIGNED_OUT") {
    if (_logoutManual) {
      // Logout manual: ya gestionado en window.logout → location.reload()
      _logoutManual = false;
    }
    // Si NO fue manual (token expirado, error de red, etc.):
    // NO redirigir al auth. El usuario sigue en su pantalla.
    // La próxima vez que intente sincronizar verá un toast de error.
  }
});

// ── Helpers de pantalla ─────────────────────────────
export function mostrarPantallaAuth() {
  document.getElementById("pantalla-auth")?.classList.remove("oculto");
  document.getElementById("pantalla-perfil")?.classList.add("oculto");
  document.getElementById("menu")?.classList.add("oculto");
}

export function mostrarMenu() {
  // Ocultar absolutamente todo antes de mostrar el menú
  ['pantalla-auth','pantalla-perfil','pantalla-dia','pantalla-historial',
   'pantalla-detalle','pantalla-medidas','pantalla-audio','pantalla-editor',
   'pantalla-resumen','pantalla-ai-import','pantalla-guia-tempo',
   'pantalla-estadisticas','pantalla-progreso','pantalla-progresion-rutina'
  ].forEach(id => document.getElementById(id)?.classList.add('oculto'));
  document.getElementById("menu")?.classList.remove("oculto");
}

export function mostrarPerfil() {
  history.pushState({ pantalla: "perfil" }, "");
  ["pantalla-auth","menu","pantalla-dia","pantalla-historial","pantalla-detalle",
   "pantalla-medidas","pantalla-audio","pantalla-editor","pantalla-resumen",
   "pantalla-ai-import","pantalla-guia-tempo","pantalla-estadisticas",
   "pantalla-progreso","pantalla-progresion-rutina"]
    .forEach(id => document.getElementById(id)?.classList.add("oculto"));
  document.getElementById("pantalla-perfil")?.classList.remove("oculto");

  // Renderizar contenido dinámico del perfil
  const cont = document.getElementById("perfil-contenido");
  if (cont) {
    const email = userState.email || "Sin cuenta";
    const esSinCuenta = !userState.uid;
    cont.innerHTML = `
      <div class="perfil-info">
        <p id="user-email-label">👤 ${email}</p>
      </div>
      ${!esSinCuenta ? `
      <div class="perfil-seccion">
        <h3>🔄 Sincronización</h3>
        <button onclick="syncNow(event)" class="btn-secondary">Sincronizar datos</button>
      </div>
      <div class="perfil-seccion">
        <h3>🔑 Cambiar contraseña</h3>
        <input id="nueva-password" type="password" placeholder="Nueva contraseña (mín. 6 caracteres)" />
        <input id="confirmar-password" type="password" placeholder="Confirmar nueva contraseña" />
        <button onclick="cambiarPassword()">Cambiar contraseña</button>
      </div>
      <div class="perfil-seccion">
        <button onclick="logout()" class="btn-danger" style="width:100%;margin-top:8px;">🚪 Cerrar sesión</button>
      </div>` : `
      <div class="perfil-seccion">
        <p style="color:var(--text-secondary);font-size:14px;">Estás usando la app sin cuenta. Los datos se guardan localmente en este dispositivo.</p>
        <button onclick="mostrarPantallaAuth()" class="btn-secondary">Crear cuenta / Iniciar sesión</button>
      </div>`}`;
  }
}

// ── Formularios de auth ─────────────────────────────
window.mostrarFormLogin = function () {
  document.getElementById("auth-login")?.classList.remove("oculto");
  document.getElementById("auth-registro")?.classList.add("oculto");
  document.getElementById("auth-recuperar")?.classList.add("oculto");
};
window.mostrarFormRegistro = function () {
  document.getElementById("auth-login")?.classList.add("oculto");
  document.getElementById("auth-registro")?.classList.remove("oculto");
  document.getElementById("auth-recuperar")?.classList.add("oculto");
};
window.mostrarFormRecuperar = function () {
  document.getElementById("auth-login")?.classList.add("oculto");
  document.getElementById("auth-registro")?.classList.add("oculto");
  document.getElementById("auth-recuperar")?.classList.remove("oculto");
};

// ── Sin cuenta ──────────────────────────────────────
window.usarSinCuenta = function () {
  mostrarMenu();
};

// ── Registrar ───────────────────────────────────────
window.register = async function () {
  const email = document.getElementById("reg-email")?.value.trim();
  const pass  = document.getElementById("reg-pass")?.value;

  if (!email || !pass) {
    showToast("Completa todos los campos", "warning");
    return;
  }
  if (pass.length < 6) {
    showToast("La contraseña debe tener al menos 6 caracteres", "warning");
    return;
  }

  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password: pass,
      options: { emailRedirectTo: window.location.origin + window.location.pathname }
    });

    if (error) {
      if (error.message.includes("already registered")) {
        showToast("Este email ya está registrado. Inicia sesión.", "warning");
      } else {
        showToast("Error al registrar: " + error.message, "error");
      }
      return;
    }

    if (data.session) {
      _guardarSesion(data.session);
      await syncToCloud();
      mostrarMenu();
      showToast("Cuenta creada correctamente", "success");
    } else {
      showToast("Cuenta creada. Revisa tu email para verificarla.", "info");
      mostrarFormLogin();
    }
  } catch (err) {
    showToast("Error al registrar: " + err.message, "error");
  }
};

// ── Login ────────────────────────────────────────────
window.login = async function () {
  const email = document.getElementById("login-email")?.value.trim();
  const pass  = document.getElementById("login-pass")?.value;

  if (!email || !pass) {
    showToast("Completa todos los campos", "warning");
    return;
  }

  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password: pass });

    if (error) {
      if (error.message.includes("Invalid login credentials")) {
        showToast("Email o contraseña incorrectos", "error");
      } else if (error.message.includes("Email not confirmed")) {
        showToast("Debes verificar tu email. Revisa tu bandeja de entrada.", "warning");
      } else {
        showToast("Error al iniciar sesión: " + error.message, "error");
      }
      return;
    }

    _guardarSesion(data.session);
    await syncFromCloud();

    if (typeof window.recargarConfig === "function") window.recargarConfig();
    if (typeof window.renderizarBotonesDias === "function") window.renderizarBotonesDias();

    mostrarMenu();
    showToast("Sesión iniciada correctamente", "success");
  } catch (err) {
    showToast("Error al iniciar sesión: " + err.message, "error");
  }
};

// ── Logout ───────────────────────────────────────────
window.logout = async function () {
  showConfirm("¿Cerrar sesión? Los datos locales se mantendrán.", async () => {
    try {
      _logoutManual = true; // marcar como logout intencional
      if (userState.uid && navigator.onLine) {
        await syncToCloud().catch(e => console.warn("Sync pre-logout:", e));
      }
      await supabase.auth.signOut().catch(e => console.warn("SignOut:", e));
    } finally {
      userState.uid = null;
      userState.email = null;
      userState.sessionToken = null;
      localStorage.removeItem("userState");
      location.reload();
    }
  });
};

// ── Sincronizar manualmente ──────────────────────────
window.syncNow = async function (e) {
  if (!userState.uid) {
    showToast("No hay sesión activa", "info");
    return;
  }
  const btn = e && e.target;
  if (btn) { btn.disabled = true; btn.innerText = "Sincronizando..."; }
  try {
    await syncToCloud();
    showToast("Sincronización completada", "success");
  } catch (err) {
    showToast("Error en sincronización: " + err.message, "error");
  } finally {
    if (btn) { btn.disabled = false; btn.innerText = "Sincronizar"; }
  }
};

// ── Reenviar verificación ────────────────────────────
window.reenviarVerificacion = async function () {
  const email = document.getElementById("login-email")?.value.trim();
  if (!email) {
    showToast("Introduce tu email primero", "warning");
    return;
  }
  try {
    const { error } = await supabase.auth.resend({ type: "signup", email });
    if (error) {
      if (error.message.includes("confirmed")) {
        showToast("Esta cuenta ya está verificada. Puedes iniciar sesión.", "info");
      } else if (error.message.includes("not found")) {
        showToast("No existe una cuenta con este email.", "error");
      } else {
        showToast("Error: " + error.message, "error");
      }
    } else {
      showToast("Email reenviado. Revisa también el spam.", "success");
    }
  } catch (err) {
    showToast("Error: " + err.message, "error");
  }
};

// ── Recuperar contraseña ─────────────────────────────
window.recuperarPassword = async function () {
  const email = document.getElementById("rec-email")?.value.trim();
  if (!email) {
    showToast("Introduce tu email", "warning");
    return;
  }
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + window.location.pathname
    });
    if (error) throw error;
    showToast("Email de recuperación enviado. Revisa tu bandeja y spam.", "success");
  } catch (err) {
    showToast("Error: " + err.message, "error");
  }
};

// ── Cambiar contraseña ───────────────────────────────
window.cambiarPassword = async function () {
  const nueva     = document.getElementById("nueva-password")?.value;
  const confirmar = document.getElementById("confirmar-password")?.value;

  if (!nueva || !confirmar) { showToast("Completa ambos campos", "warning"); return; }
  if (nueva.length < 6)    { showToast("La contraseña debe tener al menos 6 caracteres", "warning"); return; }
  if (nueva !== confirmar) { showToast("Las contraseñas no coinciden", "error"); return; }

  try {
    const { error } = await supabase.auth.updateUser({ password: nueva });
    if (error) throw error;
    document.getElementById("nueva-password").value   = "";
    document.getElementById("confirmar-password").value = "";
    showToast("Contraseña actualizada correctamente", "success");
  } catch (err) {
    showToast("Error al cambiar contraseña: " + err.message, "error");
  }
};

// ── Helper privado ───────────────────────────────────
function _guardarSesion(session) {
  userState.uid          = session.user.id;
  userState.email        = session.user.email;
  userState.sessionToken = session.access_token;
  saveLocal();
  const estado = JSON.parse(localStorage.getItem("estadoApp") || "{}");
  estado.pantalla  = "menu";
  estado.diaActual = null;
  localStorage.setItem("estadoApp", JSON.stringify(estado));
}

// ── Inicialización (DOMContentLoaded) ────────────────
window.addEventListener("DOMContentLoaded", async () => {
  const hashParams  = new URLSearchParams(window.location.hash.substring(1));
  const accessToken = hashParams.get("access_token");
  const type        = hashParams.get("type");

  // Link recuperación contraseña
  if (window.location.hash.includes("reset-password") || (accessToken && type === "recovery")) {
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;
      if (data.session) {
        _guardarSesion(data.session);
        window.location.hash = "";
        mostrarPerfil();
        showToast("Ahora puedes establecer tu nueva contraseña abajo.", "info");
        setTimeout(() => document.getElementById("nueva-password")?.focus(), 500);
      } else {
        showToast("No se pudo procesar el link. Solicita uno nuevo.", "warning");
        mostrarPantallaAuth();
      }
    } catch (err) {
      showToast("Error: " + err.message, "error");
      mostrarPantallaAuth();
    }
    return;
  }

  // Verificación de email
  if (accessToken && type === "signup") {
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;
      if (data.session) {
        _guardarSesion(data.session);
        await syncFromCloud();
        window.location.hash = "";
        mostrarMenu();
        showToast("Email verificado. ¡Bienvenido!", "success");
      } else {
        showToast("No se pudo verificar el email. Intenta iniciar sesión.", "warning");
        mostrarPantallaAuth();
      }
    } catch (err) {
      showToast("Error al verificar: " + err.message, "error");
      mostrarPantallaAuth();
    }
    return;
  }

  // ── PRIORIDAD MÁXIMA: si hay sesión local guardada → mostrar menú siempre ──
  // Nunca redirigir a auth automáticamente si ya hubo un login previo.
  if (userState.uid && userState.email) {
    mostrarMenu();
    // Refrescar sesión Supabase en segundo plano (sin bloquear la UI)
    supabase.auth.getSession().then(({ data }) => {
      if (data?.session) {
        // Actualizar token silenciosamente
        userState.sessionToken = data.session.access_token;
        saveLocal();
      }
      // Si no hay sesión Supabase (offline, token expirado, etc.):
      // El usuario sigue en el menú. Los datos locales están intactos.
      // La sincronización fallará con toast cuando la intente manualmente.
    }).catch(() => {
      // Error de red u otro — ignorar, el usuario sigue en el menú
    });
    return;
  }

  // Sin sesión local → intentar recuperar de Supabase
  try {
    const { data } = await supabase.auth.getSession();
    if (data && data.session) {
      _guardarSesion(data.session);
      mostrarMenu();
    } else {
      mostrarPantallaAuth();
    }
  } catch {
    mostrarPantallaAuth();
  }
});

window.mostrarPerfil       = mostrarPerfil;
window.mostrarPantallaAuth = mostrarPantallaAuth;
