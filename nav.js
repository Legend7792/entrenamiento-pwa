// nav.js — Botón "atrás" del móvil y pila de pantallas/paneles
//
// Modelo (v98):
//  * PILA LÓGICA (_logica): lo que el usuario "tiene abierto" encima del menú: pantallas
//    ({pantalla:'stats'}), niveles del editor ({pantalla:'editor', nivel:'dia'}) y capas
//    ({capa:'sidebar'}: paneles laterales y diálogos).
//  * ENTRADAS REALES (_real): las que la app ha añadido al historial del navegador.
//    Debe cumplirse  _real = _obsoletas + _logica.length.
//  * _obsoletas: entradas que ya estaban al arrancar (p. ej. tras recargar la página dentro de
//    una pantalla). No se pueden quitar sin recargar; la primera pantalla que se abra las reutiliza.
//  * sincronizar() es la ÚNICA función que toca el historial: si sobran entradas retrocede de
//    golpe (un solo history.go), si faltan las añade. Se ejecuta una vez por turno de eventos, así
//    que cerrar un panel y abrir una pantalla en el mismo clic no produce idas y vueltas.
//  * Las capas (paneles laterales y diálogos) se registran solas: navVigilarCapas() observa su
//    clase CSS, de modo que da igual quién las abra o las cierre (botón, toque fuera, Escape,
//    gesto de borde o botón atrás).
//
// Uso:
//   navPush(estado)     → al ABRIR una pantalla o nivel.
//   navCerrar(filtro)   → cuando la app cierra por su cuenta un nivel (sin botón atrás).
//   navLimpiar()        → volver al menú: vacía toda la pila.
//   navAtras()          → botón ← interno: retrocede una entrada (popstate hace el cambio visual).
//   navRegistrarPop(st) → lo llama el listener de popstate; devuelve qué se cerró.

let _logica = [];
let _real = 0;
let _obsoletas = 0;
let _esperando = false;      // hay un history.go() en vuelo
let _ignorar = false;        // el próximo popstate lo provocó la propia app
let _programado = false;
let _seguridad = null;

try {
  if (history.state && history.state.gym && Number(history.state.n) > 0) {
    _real = Number(history.state.n);
    _obsoletas = _real;
  }
} catch { /* sin history API */ }

function leerReal() {
  try {
    const st = history.state;
    return st && st.gym ? (Number(st.n) || 0) : 0;
  } catch { return 0; }
}

function programar() {
  if (_programado) return;
  _programado = true;
  setTimeout(() => { _programado = false; sincronizar(); }, 0);
}

function sincronizar() {
  if (_esperando) return;                       // al terminar la travesía en curso se vuelve a llamar
  const objetivo = _obsoletas + _logica.length;
  const sobran = _real - objetivo;
  try {
    if (sobran > 0) {
      _esperando = true;
      _ignorar = true;
      clearTimeout(_seguridad);
      _seguridad = setTimeout(() => {           // si el navegador no emite popstate, no quedarse colgado
        _esperando = false; _ignorar = false;
        _real = leerReal();
        _obsoletas = Math.max(0, Math.min(_obsoletas, _real - _logica.length));
        programar();
      }, 1500);
      history.go(-sobran);
    } else if (sobran < 0) {
      for (let i = 0; i < -sobran; i++) {
        _real++;
        history.pushState({ gym: true, n: _real }, '');
      }
    }
  } catch { /* sin history API */ }
}

export function navPush(estado = {}) {
  if (_logica.length === 0 && _obsoletas > 0) _obsoletas--;   // reutiliza una entrada antigua
  _logica.push({ ...estado });
  programar();
}

// Cierra desde la app (no por el botón atrás) el elemento más reciente que cumpla el filtro.
// Sin filtro: el último de la pila.
export function navCerrar(filtro) {
  let idx = -1;
  if (!filtro) idx = _logica.length - 1;
  else {
    for (let i = _logica.length - 1; i >= 0; i--) {
      if (Object.keys(filtro).every(k => _logica[i][k] === filtro[k])) { idx = i; break; }
    }
  }
  if (idx < 0) return false;
  _logica.splice(idx, 1);
  programar();
  return true;
}

// Última pantalla/nivel abierto (ignora paneles y diálogos)
export function navTopePantalla() {
  for (let i = _logica.length - 1; i >= 0; i--) if (!_logica[i].capa) return _logica[i];
  return null;
}
export function navProfundidad() { return _logica.length; }
export function navTope() { return _logica.length ? _logica[_logica.length - 1] : null; }

// Volver al menú: vacía la pila (las entradas del historial se retiran de una vez)
export function navLimpiar() {
  const quedan = _logica.filter(x => x.capa);   // un panel/diálogo aún abierto sigue siendo cerrable con "atrás"
  if (quedan.length === _logica.length) return;
  _logica = quedan;
  programar();
}

// Botón ← interno: retrocede UNA entrada; popstate hará el cambio de pantalla.
export function navAtras() {
  if (!_logica.length || _real <= _obsoletas) return false;
  try { history.back(); return true; } catch { return false; }
}

// Lo llama el listener de popstate. Devuelve:
//   { ignorar: true }   → el evento lo provocó la propia app (sincronizar)
//   { sobrante: true }  → entrada sobrante o antigua: sin efecto visible
//   { item }            → elemento de la pila que se cerró con el botón atrás
export function navRegistrarPop(estado) {
  const antes = _real;
  _real = estado && estado.gym ? (Number(estado.n) || 0) : 0;
  if (_ignorar) {
    _ignorar = false; _esperando = false; clearTimeout(_seguridad);
    _obsoletas = Math.max(0, Math.min(_obsoletas, _real - _logica.length));
    programar();                                // por si quedaron cambios pendientes durante la travesía
    return { ignorar: true };
  }
  if (_real > antes) { programar(); return { sobrante: true }; }   // "adelante": se deshace solo
  if (!_logica.length || antes > _logica.length + _obsoletas) {
    _obsoletas = Math.max(0, Math.min(_obsoletas, _real - _logica.length));
    programar();
    return { sobrante: true };
  }
  return { item: _logica.pop() };
}

// Registra solas las capas (paneles y diálogos): al aparecer añaden una entrada, al ocultarse la quitan.
// defs: [{ id, abierta: (elemento) => boolean }]
export function navVigilarCapas(defs) {
  if (typeof MutationObserver === 'undefined') return;
  defs.forEach(({ id, abierta }) => {
    const el = document.getElementById(id);
    if (!el) return;
    let estaba = !!abierta(el);
    if (estaba) navPush({ capa: id });
    new MutationObserver(() => {
      const ahora = !!abierta(el);
      if (ahora === estaba) return;
      estaba = ahora;
      if (ahora) navPush({ capa: id });
      else navCerrar({ capa: id });
    }).observe(el, { attributes: true, attributeFilter: ['class'] });
  });
}

window.navPush = navPush;
