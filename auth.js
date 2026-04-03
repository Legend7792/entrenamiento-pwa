// auth.js
import { supabase } from "./cloud.js";
import { userState, saveLocal, syncFromCloud, syncToCloud, obtenerInfoNube } from "./userState.js";
import { showToast, showConfirm, showAlert } from "./ui.js";

// Flag para distinguir logout manual del automático
let _logoutManual = false;

// ── Listener Supabase — solo actualiza token, NUNCA baja datos ──
supabase.auth.onAuthStateChange((event, session) => {
  if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
    if (session) { userState.sessionToken = session.access_token; saveLocal(); }
  } else if (event === "SIGNED_OUT") {
    if (_logoutManual) { _logoutManual = false; }
  }
});

// ── Helpers de pantalla ──────────────────────────────
export function mostrarPantallaAuth() {
  document.getElementById("pantalla-auth")?.classList.remove("oculto");
  document.getElementById("pantalla-perfil")?.classList.add("oculto");
  document.getElementById("menu")?.classList.add("oculto");
}

export function mostrarMenu() {
  ["pantalla-auth","pantalla-perfil","pantalla-dia","pantalla-historial",
   "pantalla-detalle","pantalla-medidas","pantalla-audio","pantalla-editor",
   "pantalla-resumen","pantalla-ai-import","pantalla-guia-tempo",
   "pantalla-estadisticas","pantalla-progreso","pantalla-progresion-rutina"
  ].forEach(id => document.getElementById(id)?.classList.add("oculto"));
  document.getElementById("menu")?.classList.remove("oculto");
}

export function mostrarPerfil() {
  history.pushState({ pantalla: "perfil" }, "");
  ["pantalla-auth","menu","pantalla-dia","pantalla-historial","pantalla-detalle",
   "pantalla-medidas","pantalla-audio","pantalla-editor","pantalla-resumen",
   "pantalla-ai-import","pantalla-guia-tempo","pantalla-estadisticas",
   "pantalla-progreso","pantalla-progresion-rutina"
  ].forEach(id => document.getElementById(id)?.classList.add("oculto"));
  document.getElementById("pantalla-perfil")?.classList.remove("oculto");

  const cont = document.getElementById("perfil-contenido");
  if (cont) {
    const email = userState.email || "Sin cuenta";
    const esSinCuenta = !userState.uid;
    // Timestamp de última subida local
    const ultimaSubida = localStorage.getItem("_syncedAt");
    const fechaSubida  = ultimaSubida
      ? new Date(ultimaSubida).toLocaleString("es-ES", { day:"2-digit", month:"short", hour:"2-digit", minute:"2-digit" })
      : "Nunca";

    cont.innerHTML = `
      <div class="perfil-info">
        <p id="user-email-label">👤 ${email}</p>
      </div>
      ${!esSinCuenta ? `
      <div class="perfil-seccion">
        <h3>🔄 Sincronización</h3>
        <p style="font-size:12px;color:var(--text-secondary);margin-bottom:8px;">
          Última subida desde este dispositivo: <strong>${fechaSubida}</strong>
        </p>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px;">
          <button onclick="syncSubir(this)" class="btn-secondary" style="flex:1;">
            ⬆️ Subir a la nube
          </button>
          <button onclick="syncBajar(this)" style="flex:1;background:var(--warning);color:#000;">
            ⬇️ Bajar de la nube
          </button>
        </div>
        <p style="font-size:11px;color:var(--text-secondary);">
          ⬆️ Guarda los datos de <em>este</em> dispositivo en la nube.<br>
          ⬇️ Reemplaza los datos de <em>este</em> dispositivo con los de la nube.
        </p>
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
        <p style="color:var(--text-secondary);font-size:14px;">Estás usando la app sin cuenta. Los datos se guardan localmente.</p>
        <button onclick="mostrarPantallaAuth()" class="btn-secondary">Crear cuenta / Iniciar sesión</button>
      </div>`}`;
  }
}

// ── Formularios ──────────────────────────────────────
window.mostrarFormLogin    = () => { document.getElementById("auth-login")?.classList.remove("oculto"); document.getElementById("auth-registro")?.classList.add("oculto"); document.getElementById("auth-recuperar")?.classList.add("oculto"); };
window.mostrarFormRegistro = () => { document.getElementById("auth-login")?.classList.add("oculto"); document.getElementById("auth-registro")?.classList.remove("oculto"); document.getElementById("auth-recuperar")?.classList.add("oculto"); };
window.mostrarFormRecuperar= () => { document.getElementById("auth-login")?.classList.add("oculto"); document.getElementById("auth-registro")?.classList.add("oculto"); document.getElementById("auth-recuperar")?.classList.remove("oculto"); };
window.usarSinCuenta       = () => mostrarMenu();

// ── Registro ─────────────────────────────────────────
window.register = async function () {
  const email = document.getElementById("reg-email")?.value.trim();
  const pass  = document.getElementById("reg-pass")?.value;
  if (!email || !pass) { showToast("Completa todos los campos", "warning"); return; }
  if (pass.length < 6) { showToast("La contraseña debe tener al menos 6 caracteres", "warning"); return; }
  try {
    const { data, error } = await supabase.auth.signUp({
      email, password: pass,
      options: { emailRedirectTo: window.location.origin + window.location.pathname }
    });
    if (error) { showToast(error.message.includes("already registered") ? "Email ya registrado. Inicia sesión." : "Error: " + error.message, "warning"); return; }
    if (data.session) {
      _guardarSesion(data.session);
      // Registro nuevo: subir los datos locales que ya tenga el usuario
      await syncToCloud().catch(() => {});
      mostrarMenu();
      showToast("Cuenta creada correctamente", "success");
    } else {
      showToast("Cuenta creada. Revisa tu email.", "info");
      mostrarFormLogin();
    }
  } catch (err) { showToast("Error: " + err.message, "error"); }
};

// ── Login ─────────────────────────────────────────────
window.login = async function () {
  const email = document.getElementById("login-email")?.value.trim();
  const pass  = document.getElementById("login-pass")?.value;
  if (!email || !pass) { showToast("Completa todos los campos", "warning"); return; }
  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password: pass });
    if (error) {
      showToast(
        error.message.includes("Invalid login credentials") ? "Email o contraseña incorrectos" :
        error.message.includes("Email not confirmed")       ? "Verifica tu email primero" :
        "Error: " + error.message, "error");
      return;
    }
    _guardarSesion(data.session);

    // Login explícito: bajar datos de la nube (primera vez en este dispositivo o sesión nueva)
    // Aquí sí es seguro porque el usuario acaba de autenticarse a propósito
    try {
      await syncFromCloud();
      if (typeof window.recargarConfig === "function") window.recargarConfig();
      if (typeof window.renderizarBotonesDias === "function") window.renderizarBotonesDias();
    } catch (e) {
      console.log("Sin datos en nube aún o sin conexión:", e.message);
    }

    mostrarMenu();
    showToast("Sesión iniciada correctamente", "success");
  } catch (err) { showToast("Error: " + err.message, "error"); }
};

// ── Logout ────────────────────────────────────────────
window.logout = async function () {
  showConfirm("¿Cerrar sesión? Los datos locales se mantendrán.", async () => {
    try {
      _logoutManual = true;
      if (userState.uid && navigator.onLine) {
        await syncToCloud().catch(e => console.warn("Sync pre-logout:", e));
      }
      await supabase.auth.signOut().catch(e => console.warn("SignOut:", e));
    } finally {
      userState.uid = null; userState.email = null; userState.sessionToken = null;
      localStorage.removeItem("userState");
      location.reload();
    }
  });
};

// ── Subir a la nube ───────────────────────────────────
window.syncSubir = async function (btn) {
  if (!userState.uid) { showToast("No hay sesión activa", "info"); return; }
  if (btn) { btn.disabled = true; btn.textContent = "⏳ Subiendo..."; }
  try {
    await syncToCloud();
    // Refrescar perfil para mostrar nuevo timestamp
    mostrarPerfil();
    showToast("⬆️ Datos subidos a la nube correctamente", "success");
  } catch (err) {
    showToast("Error al subir: " + err.message, "error");
    if (btn) { btn.disabled = false; btn.textContent = "⬆️ Subir a la nube"; }
  }
};

// ── Bajar de la nube — con confirmación y timestamp ──
window.syncBajar = async function (btn) {
  if (!userState.uid) { showToast("No hay sesión activa", "info"); return; }
  if (btn) { btn.disabled = true; btn.textContent = "⏳ Consultando..."; }

  let info = null;
  try {
    info = await obtenerInfoNube();
  } catch (e) {
    showToast("No se pudo consultar la nube: " + e.message, "error");
    if (btn) { btn.disabled = false; btn.textContent = "⬇️ Bajar de la nube"; }
    return;
  }

  if (btn) { btn.disabled = false; btn.textContent = "⬇️ Bajar de la nube"; }

  if (!info) {
    showToast("No hay datos guardados en la nube para esta cuenta.", "info");
    return;
  }

  const fechaNube = info.syncedAt
    ? new Date(info.syncedAt).toLocaleString("es-ES", { day:"2-digit", month:"short", year:"numeric", hour:"2-digit", minute:"2-digit" })
    : "fecha desconocida";

  const local = localStorage.getItem("_syncedAt");
  const fechaLocal = local
    ? new Date(local).toLocaleString("es-ES", { day:"2-digit", month:"short", year:"numeric", hour:"2-digit", minute:"2-digit" })
    : "nunca subido";

  const msg =
    `⬇️ BAJAR DE LA NUBE\n\n` +
    `Datos en la nube: ${fechaNube} (${info.numSesiones} sesiones)\n` +
    `Datos locales subidos: ${fechaLocal}\n\n` +
    `⚠️ Esto REEMPLAZARÁ todos los datos de este dispositivo con los de la nube.\n` +
    `Los datos locales actuales se perderán.\n\n` +
    `¿Continuar?`;

  showConfirm(msg, async () => {
    if (btn) { btn.disabled = true; btn.textContent = "⏳ Bajando..."; }
    try {
      await syncFromCloud();
      if (typeof window.recargarConfig === "function") window.recargarConfig();
      if (typeof window.renderizarBotonesDias === "function") window.renderizarBotonesDias();
      if (typeof window.renderizarBannerDeload === "function") window.renderizarBannerDeload();
      mostrarPerfil();
      showToast("⬇️ Datos de la nube cargados correctamente", "success");
    } catch (err) {
      showToast("Error al bajar: " + err.message, "error");
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = "⬇️ Bajar de la nube"; }
    }
  });
};

// ── Sincronizar ahora (para compatibilidad) ──────────
window.syncNow = window.syncSubir;

// ── Reenviar verificación ─────────────────────────────
window.reenviarVerificacion = async function () {
  const email = document.getElementById("login-email")?.value.trim();
  if (!email) { showToast("Introduce tu email primero", "warning"); return; }
  try {
    const { error } = await supabase.auth.resend({ type: "signup", email });
    if (error) { showToast("Error: " + error.message, "error"); }
    else { showToast("Email reenviado. Revisa también el spam.", "success"); }
  } catch (err) { showToast("Error: " + err.message, "error"); }
};

// ── Recuperar contraseña ──────────────────────────────
window.recuperarPassword = async function () {
  const email = document.getElementById("rec-email")?.value.trim();
  if (!email) { showToast("Introduce tu email", "warning"); return; }
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + window.location.pathname
    });
    if (error) throw error;
    showToast("Email de recuperación enviado.", "success");
  } catch (err) { showToast("Error: " + err.message, "error"); }
};

// ── Cambiar contraseña ────────────────────────────────
window.cambiarPassword = async function () {
  const nueva     = document.getElementById("nueva-password")?.value;
  const confirmar = document.getElementById("confirmar-password")?.value;
  if (!nueva || !confirmar) { showToast("Completa ambos campos", "warning"); return; }
  if (nueva.length < 6) { showToast("Mínimo 6 caracteres", "warning"); return; }
  if (nueva !== confirmar) { showToast("Las contraseñas no coinciden", "error"); return; }
  try {
    const { error } = await supabase.auth.updateUser({ password: nueva });
    if (error) throw error;
    document.getElementById("nueva-password").value = "";
    document.getElementById("confirmar-password").value = "";
    showToast("Contraseña actualizada", "success");
  } catch (err) { showToast("Error: " + err.message, "error"); }
};

// ── Helper privado ────────────────────────────────────
function _guardarSesion(session) {
  userState.uid          = session.user.id;
  userState.email        = session.user.email;
  userState.sessionToken = session.access_token;
  saveLocal();
  const estado = JSON.parse(localStorage.getItem("estadoApp") || "{}");
  estado.pantalla = "menu"; estado.diaActual = null;
  localStorage.setItem("estadoApp", JSON.stringify(estado));
}

// ── Sidebar perfil ────────────────────────────────────
function renderSidebarPerfilAuth() {
  const cont = document.getElementById("sidebar-perfil-info");
  if (!cont) return;
  let us = {};
  try { us = JSON.parse(localStorage.getItem("userState") || "{}"); } catch {}
  const logueado = !!us.uid;
  cont.innerHTML = `
    <div class="sidebar-perfil-email">
      ${logueado ? `<span>👤 ${us.email}</span>` : `<span style="color:var(--text-secondary);font-size:12px;">Sin cuenta — datos locales</span>`}
    </div>
    <div class="sidebar-perfil-btns">
      <button onclick="toggleSidebar(); mostrarPerfil()">${logueado ? "⚙️ Perfil / Sincronización" : "🔑 Iniciar sesión"}</button>
      ${logueado ? `<button onclick="logout()" class="btn-danger" style="margin-top:4px;">🚪 Cerrar sesión</button>` : ""}
    </div>`;
}
window.renderSidebarPerfil = renderSidebarPerfilAuth;

// ── Inicialización (DOMContentLoaded) ─────────────────
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
      } else { showToast("Link inválido. Solicita uno nuevo.", "warning"); mostrarPantallaAuth(); }
    } catch (err) { showToast("Error: " + err.message, "error"); mostrarPantallaAuth(); }
    return;
  }

  // Verificación de email
  if (accessToken && type === "signup") {
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;
      if (data.session) {
        _guardarSesion(data.session);
        try { await syncFromCloud(); } catch {}
        window.location.hash = "";
        mostrarMenu();
        showToast("Email verificado. ¡Bienvenido!", "success");
      } else { showToast("No se pudo verificar. Intenta iniciar sesión.", "warning"); mostrarPantallaAuth(); }
    } catch (err) { showToast("Error: " + err.message, "error"); mostrarPantallaAuth(); }
    return;
  }

  // ── Sesión local guardada → mostrar menú SIN bajar datos ──────────────────
  // NUNCA llamar syncFromCloud() automáticamente al arrancar.
  // El usuario decide cuándo bajar datos con el botón "⬇️ Bajar de la nube".
  if (userState.uid && userState.email) {
    mostrarMenu();
    // Solo actualizar token en background, sin tocar datos
    supabase.auth.getSession().then(({ data }) => {
      if (data?.session) {
        userState.sessionToken = data.session.access_token;
        saveLocal();
      }
    }).catch(() => {});
    return;
  }

  // Sin sesión local → intentar recuperar de Supabase
  try {
    const { data } = await supabase.auth.getSession();
    if (data?.session) {
      _guardarSesion(data.session);
      mostrarMenu();
    } else {
      mostrarPantallaAuth();
    }
  } catch { mostrarPantallaAuth(); }
});

window.mostrarPerfil       = mostrarPerfil;
window.mostrarPantallaAuth = mostrarPantallaAuth;
