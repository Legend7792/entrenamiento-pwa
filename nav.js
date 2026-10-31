// nav.js — Control del historial del navegador (botón "atrás" del móvil)
//
// Problema que resuelve: antes cada pantalla hacía pushState y volverMenu()
// también, así que el historial crecía sin parar y "atrás" no salía de la app.
//
// Reglas ahora:
//  - Al ENTRAR en una pantalla secundaria se llama a navPush() (1 entrada).
//  - Al VOLVER al menú desde un botón se llama a navLimpiar(): retrocede de golpe
//    todas las entradas que la app añadió (un solo popstate, que se ignora).
//  - Con el botón "atrás" del sistema, app.js recibe popstate y cambia de pantalla.

let _profundidad = 0;
let _ignorarPopstate = false;

export function navPush(estado = {}) {
  try {
    // Tras recargar la página (o reabrirla desde la caché de ida/vuelta) el navegador conserva la
    // entrada que la app añadió antes; se reutiliza en vez de apilar otra.
    if (_profundidad === 0 && history.state && history.state.gym) {
      history.replaceState({ gym: true, ...estado }, '');
      _profundidad = 1;
      return;
    }
    history.pushState({ gym: true, ...estado }, '');
    _profundidad++;
  } catch { /* sin history API */ }
}

export function navProfundidad() { return _profundidad; }

// Un popstate = una entrada menos (lo llama el listener de popstate de app.js)
export function navRegistrarPop() { if (_profundidad > 0) _profundidad--; }

// Retrocede todas las entradas añadidas por la app (deja la pila como al abrir).
export function navLimpiar() {
  if (_profundidad <= 0) return;
  const n = _profundidad;
  _profundidad = 0;
  _ignorarPopstate = true;
  history.go(-n);
  // Seguridad: si el navegador no emite popstate, no dejar la bandera colgada
  setTimeout(() => { _ignorarPopstate = false; }, 1500);
}

// Retrocede UNA entrada (botón ← interno de una subpantalla). Devuelve true si
// hubo entrada que retroceder; entonces popstate hará el cambio de pantalla.
export function navAtras() {
  if (_profundidad <= 0) return false;
  history.back();
  return true;
}

// Lo llama el listener de popstate: true = este evento lo provocamos nosotros.
export function navConsumirPopstateIgnorado() {
  if (_ignorarPopstate) { _ignorarPopstate = false; return true; }
  return false;
}

window.navPush = navPush;
