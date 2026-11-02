// auth.js — Cuentas y sincronización manual
import { getSupabase } from "./cloud.js";
import { userState, saveLocal, syncFromCloud, syncToCloud, obtenerInfoNube, esClaveSincronizable, sincronizarSiHaceFalta } from "./userState.js";
import { showToast, showConfirm, escapeHtml } from "./ui.js";
import { navPush, navLimpiar } from "./nav.js";

const PANTALLAS_SECUNDARIAS = [
  "pantalla-auth", "pantalla-perfil", "pantalla-dia", "pantalla-historial",
  "pantalla-detalle", "pantalla-medidas", "pantalla-audio", "pantalla-editor",
  "pantalla-resumen", "pantalla-ai-import", "pantalla-guia-tempo",
  "pantalla-estadisticas", "pantalla-progreso", "pantalla-progresion-rutina"
];

// ── Helpers de pantalla ──────────────────────────────
export function mostrarPantallaAuth() {
  document.getElementById("pantalla-auth")?.classList.remove("oculto");
  document.getElementById("pantalla-perfil")?.classList.add("oculto");
  document.getElementById("menu")?.classList.add("oculto");
}

export function mostrarMenu() {
  navLimpiar();
  PANTALLAS_SECUNDARIAS.forEach(id => document.getElementById(id)?.classList.add("oculto"));
  document.getElementById("menu")?.classList.remove("oculto");
}

// Menú de arranque: el listener de app.js (document) se ejecuta ANTES que el de este archivo (window)
// y puede haber restaurado ya una pantalla (sesión a mitad, acceso directo). En ese caso no se tapa.
function mostrarMenuInicial() {
  const hayPantalla = PANTALLAS_SECUNDARIAS.some(id => {
    const el = document.getElementById(id);
    return el && !el.classList.contains("oculto");
  });
  if (!hayPantalla) mostrarMenu();
}

function fmtFecha(iso, conAnio = false) {
  if (!iso) return "fecha desconocida";
  const o = { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" };
  if (conAnio) o.year = "numeric";
  return new Date(iso).toLocaleString("es-ES", o);
}

export function mostrarPerfil() {
  navPush({ pantalla: "perfil" });
  PANTALLAS_SECUNDARIAS.filter(id => id !== "pantalla-perfil")
    .concat(["menu"]).forEach(id => document.getElementById(id)?.classList.add("oculto"));
  document.getElementById("pantalla-perfil")?.classList.remove("oculto");

  const cont = document.getElementById("perfil-contenido");
  if (cont) {
    const email = escapeHtml(userState.email || "Sin cuenta");
    const esSinCuenta = !userState.uid;
    const fechaSubida = localStorage.getItem("_syncedAt") ? fmtFecha(localStorage.getItem("_syncedAt")) : "Nunca";

    cont.innerHTML = `
      <div class="perfil-info">
        <p id="user-email-label">👤 ${email}</p>
      </div>
      ${!esSinCuenta ? `
      <div class="perfil-seccion">
        <h3>🔄 Sincronización</h3>
        <p style="font-size:12px;color:var(--text-secondary);margin-bottom:8px;">
          Última sincronización de este dispositivo: <strong>${escapeHtml(fechaSubida)}</strong>
        </p>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px;">
          <button onclick="syncSubir(this)" class="btn-secondary" style="flex:1;">
            ⬆️ Subir a la nube
          </button>
          <button onclick="syncBajar(this)" style="flex:1;background:var(--warning);color:var(--on-warning);">
            ⬇️ Traer de la nube
          </button>
        </div>
        <p style="font-size:11px;color:var(--text-secondary);">
          ⬆️ Guarda los datos de <em>este</em> dispositivo. Si otro dispositivo subió datos más nuevos, te lo dirá y podrás fusionarlos (no se pierde nada).<br>
          ⬇️ Trae los datos de la nube y los <em>fusiona</em> con los de este dispositivo: el historial y las medidas se unen; rutinas, pesos y ajustes de la nube mandan.
        </p>
      </div>
      <div class="perfil-seccion">
        <h3>🔑 Cambiar contraseña</h3>
        <input id="nueva-password" type="password" placeholder="Nueva contraseña (mín. 8 caracteres)" autocomplete="new-password" />
        <input id="confirmar-password" type="password" placeholder="Confirmar nueva contraseña" autocomplete="new-password" />
        <button onclick="cambiarPassword()">Cambiar contraseña</button>
      </div>
      <div class="perfil-seccion">
        <button onclick="logout()" class="btn-danger" style="width:100%;margin-top:8px;">🚪 Cerrar sesión</button>
      </div>` : `
      <div class="perfil-seccion">
        <p style="color:var(--text-secondary);font-size:14px;">Estás usando la app sin cuenta. Los datos se guardan solo en este dispositivo.</p>
        <button onclick="mostrarPantallaAuth()" class="btn-secondary">Crear cuenta / Iniciar sesión</button>
      </div>`}`;
  }
}

// ── Formularios ──────────────────────────────────────
window.mostrarFormLogin    = () => { document.getElementById("auth-login")?.classList.remove("oculto"); document.getElementById("auth-registro")?.classList.add("oculto"); document.getElementById("auth-recuperar")?.classList.add("oculto"); };
window.mostrarFormRegistro = () => { document.getElementById("auth-login")?.classList.add("oculto"); document.getElementById("auth-registro")?.classList.remove("oculto"); document.getElementById("auth-recuperar")?.classList.add("oculto"); };
window.mostrarFormRecuperar= () => { document.getElementById("auth-login")?.classList.add("oculto"); document.getElementById("auth-registro")?.classList.add("oculto"); document.getElementById("auth-recuperar")?.classList.remove("oculto"); };
// "Usar sin cuenta" se recuerda: la próxima vez la app abre directamente en el menú
window.usarSinCuenta       = () => { try { localStorage.setItem("gym_modoLocal", "1"); } catch {} mostrarMenu(); };

const MIN_PASS = 8;

async function clienteNube() {
  try { return await getSupabase(); }
  catch {
    const e = new Error("No se pudo conectar con el servicio de cuentas. Comprueba tu conexión e inténtalo de nuevo.");
    e.esConexion = true;
    throw e;
  }
}

// ── Registro ─────────────────────────────────────────
window.register = async function () {
  const email = document.getElementById("reg-email")?.value.trim();
  const pass  = document.getElementById("reg-pass")?.value;
  if (!email || !pass) { showToast("Completa todos los campos", "warning"); return; }
  if (pass.length < MIN_PASS) { showToast(`La contraseña debe tener al menos ${MIN_PASS} caracteres`, "warning"); return; }
  try {
    const sb = await clienteNube();
    const { data, error } = await sb.auth.signUp({
      email, password: pass,
      options: { emailRedirectTo: window.location.origin + window.location.pathname }
    });
    if (error) { showToast(error.message.includes("already registered") ? "Email ya registrado. Inicia sesión." : "Error: " + error.message, "warning"); return; }
    if (data.session) {
      _guardarSesion(data.session);
      // Cuenta nueva: subir los datos locales que ya tenga el usuario
      await syncToCloud({ mezclar: true }).catch(() => {});
      mostrarMenu();
      showToast("Cuenta creada correctamente", "success");
    } else {
      showToast("Cuenta creada. Revisa tu email.", "info");
      window.mostrarFormLogin();
    }
  } catch (err) { showToast("Error: " + err.message, "error"); }
};

// ── Login ─────────────────────────────────────────────
function claveSyncLocales() {
  const claves = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (esClaveSincronizable(k)) claves.push(k);
  }
  return claves;
}

function refrescarVistasTrasSync() {
  if (typeof window.recargarConfig === "function") window.recargarConfig();
  if (typeof window.renderizarBotonesDias === "function") window.renderizarBotonesDias();
  if (typeof window.renderizarBannerDeload === "function") window.renderizarBannerDeload();
  if (typeof window.renderizarSelectorRutinas === "function") window.renderizarSelectorRutinas();
  const t = localStorage.getItem("tema");
  const sel = document.getElementById("selector-temas-sidebar");
  if (t && sel) sel.value = t;
  if (t && typeof window.aplicarTemaGuardado === "function") window.aplicarTemaGuardado();
}

async function _bajarTrasLogin(reemplazar) {
  try {
    await syncFromCloud({ reemplazar });
    refrescarVistasTrasSync();
  } catch (e) {
    // Cuenta sin datos en la nube todavía o sin conexión: se queda lo local
    console.log("Sin datos en nube aún o sin conexión:", e.message);
    if (!reemplazar && userState.uid) { try { localStorage.setItem("gym_dirty", "1"); } catch {} }
  }
}

window.login = async function () {
  const email = document.getElementById("login-email")?.value.trim();
  const pass  = document.getElementById("login-pass")?.value;
  if (!email || !pass) { showToast("Completa todos los campos", "warning"); return; }
  try {
    const sb = await clienteNube();
    const { data, error } = await sb.auth.signInWithPassword({ email, password: pass });
    if (error) {
      showToast(
        error.message.includes("Invalid login credentials") ? "Email o contraseña incorrectos" :
        error.message.includes("Email not confirmed")       ? "Verifica tu email primero" :
        "Error: " + error.message, "error");
      return;
    }

    const ultimoUid = localStorage.getItem("gym_ultimoUid");
    const otraCuenta = ultimoUid && ultimoUid !== data.session.user.id && claveSyncLocales().length > 0;

    if (otraCuenta) {
      // Los datos locales pertenecen a OTRA cuenta: no mezclarlos con esta
      showConfirm(
        "Este dispositivo tiene datos de otra cuenta.\n\nSi continúas, se reemplazarán por los de esta cuenta (los de la otra cuenta siguen en su nube si llegaste a sincronizarlos).\n\n¿Continuar?",
        async () => {
          claveSyncLocales().forEach(k => localStorage.removeItem(k));
          _guardarSesion(data.session);
          await _bajarTrasLogin(true);
          mostrarMenu();
          showToast("Sesión iniciada correctamente", "success");
        },
        async () => { await sb.auth.signOut().catch(() => {}); showToast("Inicio de sesión cancelado", "info"); },
        "Reemplazar", "Cancelar"
      );
      return;
    }

    _guardarSesion(data.session);
    // Misma cuenta (o primera vez): se FUSIONA con lo local, no se borra nada
    await _bajarTrasLogin(false);
    mostrarMenu();
    showToast("Sesión iniciada correctamente", "success");
  } catch (err) { showToast("Error: " + err.message, "error"); }
};

// ── Logout ────────────────────────────────────────────
window.logout = async function () {
  showConfirm("¿Cerrar sesión? Los datos locales se mantendrán en este dispositivo.", async () => {
    try {
      // Último intento de guardar cambios pendientes (si hay conflicto no se pisa nada)
      await sincronizarSiHaceFalta();
      const sb = await getSupabase().catch(() => null);
      if (sb) await sb.auth.signOut().catch(e => console.warn("SignOut:", e));
    } finally {
      // Aunque signOut falle (sin conexión), borrar el token local: si no, la app
      // volvería a iniciar sesión sola al recargar.
      const aBorrar = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k.startsWith("supabase.") || k.startsWith("sb-")) aBorrar.push(k);
      }
      aBorrar.forEach(k => localStorage.removeItem(k));
      userState.uid = null; userState.email = null;
      localStorage.removeItem("userState");
      localStorage.removeItem("gym_modoLocal");
      location.reload();
    }
  });
};

// ── Subir a la nube (con detección de conflicto) ──────
window.syncSubir = async function (btn) {
  if (!userState.uid) { showToast("No hay sesión activa", "info"); return; }
  const reset = () => { if (btn) { btn.disabled = false; btn.textContent = "⬆️ Subir a la nube"; } };
  if (btn) { btn.disabled = true; btn.textContent = "⏳ Subiendo..."; }
  try {
    await syncToCloud();
    mostrarPerfil();
    showToast("⬆️ Datos subidos a la nube correctamente", "success");
  } catch (err) {
    reset();
    if (err.code === "CONFLICT") {
      showConfirm(
        `⚠️ La nube tiene datos subidos desde otro dispositivo (${fmtFecha(err.syncedAtNube, true)}).\n\n` +
        `Si subes sin más, esos datos se pisarían. Puedes FUSIONAR:\n` +
        `• Historial y medidas de ambos se unen\n` +
        `• Rutinas, pesos y ajustes de ESTE dispositivo mandan\n\n¿Fusionar y subir?`,
        async () => {
          try {
            await syncToCloud({ mezclar: true });
            refrescarVistasTrasSync();
            mostrarPerfil();
            showToast("✅ Datos fusionados y subidos", "success");
          } catch (e2) { showToast("Error al fusionar: " + e2.message, "error"); }
        },
        () => {}, "Fusionar y subir", "Cancelar"
      );
    } else {
      showToast("Error al subir: " + err.message, "error");
    }
  }
};

// ── Traer de la nube (fusiona) — con confirmación e info previa ──
window.syncBajar = async function (btn) {
  if (!userState.uid) { showToast("No hay sesión activa", "info"); return; }
  const reset = () => { if (btn) { btn.disabled = false; btn.textContent = "⬇️ Traer de la nube"; } };
  if (btn) { btn.disabled = true; btn.textContent = "⏳ Consultando..."; }

  let info = null;
  try {
    info = await obtenerInfoNube();
  } catch (e) {
    showToast("No se pudo consultar la nube: " + e.message, "error");
    reset();
    return;
  }
  reset();

  if (!info) {
    showToast("No hay datos guardados en la nube para esta cuenta.", "info");
    return;
  }

  const msg =
    `⬇️ TRAER DE LA NUBE\n\n` +
    `Datos en la nube: ${fmtFecha(info.syncedAt, true)} (${info.numSesiones} sesiones)\n` +
    `Última sincronización de este dispositivo: ${localStorage.getItem("_syncedAt") ? fmtFecha(localStorage.getItem("_syncedAt"), true) : "nunca"}\n\n` +
    `Se FUSIONARÁ con lo de este dispositivo:\n` +
    `• Historial y medidas: se unen (no se pierde nada)\n` +
    `• Rutinas, pesos y ajustes: mandan los de la nube\n\n` +
    `¿Continuar?`;

  showConfirm(msg, async () => {
    if (btn) { btn.disabled = true; btn.textContent = "⏳ Trayendo..."; }
    try {
      await syncFromCloud();
      refrescarVistasTrasSync();
      mostrarPerfil();
      showToast("⬇️ Datos de la nube fusionados correctamente", "success");
    } catch (err) {
      showToast("Error al traer: " + err.message, "error");
    } finally {
      reset();
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
    const sb = await clienteNube();
    const { error } = await sb.auth.resend({ type: "signup", email });
    if (error) { showToast("Error: " + error.message, "error"); }
    else { showToast("Email reenviado. Revisa también el spam.", "success"); }
  } catch (err) { showToast("Error: " + err.message, "error"); }
};

// ── Recuperar contraseña ──────────────────────────────
window.recuperarPassword = async function () {
  const email = document.getElementById("rec-email")?.value.trim();
  if (!email) { showToast("Introduce tu email", "warning"); return; }
  try {
    const sb = await clienteNube();
    const { error } = await sb.auth.resetPasswordForEmail(email, {
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
  if (nueva.length < MIN_PASS) { showToast(`Mínimo ${MIN_PASS} caracteres`, "warning"); return; }
  if (nueva !== confirmar) { showToast("Las contraseñas no coinciden", "error"); return; }
  try {
    const sb = await clienteNube();
    const { error } = await sb.auth.updateUser({ password: nueva });
    if (error) throw error;
    document.getElementById("nueva-password").value = "";
    document.getElementById("confirmar-password").value = "";
    showToast("Contraseña actualizada", "success");
  } catch (err) { showToast("Error: " + err.message, "error"); }
};

// ── Helper privado ────────────────────────────────────
function _guardarSesion(session) {
  userState.uid   = session.user.id;
  userState.email = session.user.email;
  saveLocal();
  try {
    localStorage.setItem("gym_ultimoUid", session.user.id);
    localStorage.removeItem("gym_modoLocal");
  } catch {}
  let estado = {};
  try { estado = JSON.parse(localStorage.getItem("estadoApp") || "{}") || {}; } catch {}
  estado.pantalla = "menu"; estado.diaActual = null;
  localStorage.setItem("estadoApp", JSON.stringify(estado));
}

// ── Inicialización (DOMContentLoaded) ─────────────────
window.addEventListener("DOMContentLoaded", async () => {
  const hashParams  = new URLSearchParams(window.location.hash.substring(1));
  const accessToken = hashParams.get("access_token");
  const type        = hashParams.get("type");

  // Link recuperación contraseña
  if (window.location.hash.includes("reset-password") || (accessToken && type === "recovery")) {
    try {
      const sb = await clienteNube(); // crear el cliente procesa el token de la URL
      const { data, error } = await sb.auth.getSession();
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
      const sb = await clienteNube();
      const { data, error } = await sb.auth.getSession();
      if (error) throw error;
      if (data.session) {
        _guardarSesion(data.session);
        await _bajarTrasLogin(false);
        window.location.hash = "";
        mostrarMenu();
        showToast("Email verificado. ¡Bienvenido!", "success");
      } else { showToast("No se pudo verificar. Intenta iniciar sesión.", "warning"); mostrarPantallaAuth(); }
    } catch (err) { showToast("Error: " + err.message, "error"); mostrarPantallaAuth(); }
    return;
  }

  // Sesión local guardada → menú SIN tocar datos. Si hay cambios pendientes, el
  // arranque (app.js) los sube después, sin pisar datos más nuevos de la nube.
  if (userState.uid && userState.email) {
    mostrarMenuInicial();
    return;
  }

  // Modo "sin cuenta" recordado → directo al menú (sin cargar nada de la nube)
  if (localStorage.getItem("gym_modoLocal") === "1") {
    mostrarMenuInicial();
    return;
  }

  // Sin sesión local → intentar recuperar una sesión de Supabase
  try {
    const sb = await getSupabase();
    const { data } = await sb.auth.getSession();
    if (data?.session) {
      _guardarSesion(data.session);
      mostrarMenuInicial();
    } else {
      mostrarPantallaAuth();
    }
  } catch { mostrarPantallaAuth(); }
});

window.mostrarPerfil       = mostrarPerfil;
window.mostrarPantallaAuth = mostrarPantallaAuth;
