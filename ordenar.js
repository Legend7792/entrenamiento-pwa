// ordenar.js — Arrastrar para reordenar listas (dedo o ratón), con teclado como alternativa
//
// habilitarOrdenar(lista, { item, asa, alSoltar })
//   lista     elemento contenedor. Usa delegación de eventos: basta llamarlo una vez por contenedor
//             (si el contenedor se vuelve a crear, hay que llamarlo de nuevo con el nuevo).
//   item      selector de cada elemento reordenable (hijos DIRECTOS de la lista)
//   asa       selector del control de arrastre dentro de cada elemento (un botón con touch-action:none)
//   alSoltar  (desde, hasta, via) => void   — `hasta` es la posición FINAL del elemento;
//             via = 'arrastre' | 'teclado'. La función debe guardar y volver a dibujar la lista.
//
// Cómo funciona: al mover el dedo más de unos píxeles desde el asa, el elemento sigue al dedo y los demás
// se apartan; la lista se desplaza sola cerca de los bordes de la pantalla. Soltar confirma, Escape cancela.
// Con el asa enfocada, las flechas ↑/↓ del teclado mueven el elemento una posición.

const UMBRAL = 5;        // px que hay que mover antes de empezar a arrastrar (un toque suelto no hace nada)
const BORDE = 90;        // px junto al borde superior/inferior de la pantalla donde la lista se desplaza sola
const VEL_MAX = 16;      // px por fotograma como máximo en ese desplazamiento

export function habilitarOrdenar(lista, { item, asa, alSoltar }) {
  if (!lista || lista.__ordenarListo) return;
  lista.__ordenarListo = true;

  let ses = null;   // sesión de arrastre en curso

  const elementos = () => [...lista.children].filter(el => el.matches(item));

  // ── Teclado: con el asa enfocada, ↑ / ↓ mueven una posición ──
  lista.addEventListener('keydown', e => {
    if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
    const a = e.target.closest?.(asa);
    if (!a || !lista.contains(a)) return;
    const el = a.closest(item);
    const its = elementos();
    const desde = its.indexOf(el);
    const hasta = e.key === 'ArrowUp' ? desde - 1 : desde + 1;
    e.preventDefault();
    if (desde < 0 || hasta < 0 || hasta >= its.length) return;
    alSoltar(desde, hasta, 'teclado');
  });

  // ── Dedo / ratón ──
  lista.addEventListener('pointerdown', e => {
    if (ses) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    const a = e.target.closest?.(asa);
    if (!a || !lista.contains(a)) return;
    const el = a.closest(item);
    if (!el || el.parentElement !== lista) return;
    e.preventDefault();
    ses = { a, el, pid: e.pointerId, x0: e.clientX, y0: e.clientY, y: e.clientY, activo: false, raf: 0 };
    try { a.setPointerCapture(e.pointerId); } catch { /* sin captura: se sigue por la ventana */ }
    a.addEventListener('pointermove', mover);
    a.addEventListener('pointerup', soltar);
    a.addEventListener('pointercancel', cancelar);
    a.addEventListener('lostpointercapture', cancelar);
    a.addEventListener('contextmenu', bloquear);
    document.addEventListener('keydown', teclaEscape, true);
  });

  function bloquear(e) { e.preventDefault(); }
  function teclaEscape(e) { if (e.key === 'Escape' && ses) { e.preventDefault(); e.stopPropagation(); cancelar(); } }

  function mover(e) {
    if (!ses || e.pointerId !== ses.pid) return;
    ses.y = e.clientY;
    if (!ses.activo) {
      if (Math.abs(e.clientY - ses.y0) < UMBRAL && Math.abs(e.clientX - ses.x0) < UMBRAL) return;
      activar();
    }
    actualizar();
  }

  function activar() {
    const its = elementos();
    const desde = its.indexOf(ses.el);
    if (desde < 0) { limpiar(); return; }
    // Punto del elemento donde se agarró (se mide ANTES de plegar nada para que siga bajo el dedo)
    const antes = ses.el.getBoundingClientRect();
    const agarre = ses.y0 - antes.top;

    ses.activo = true;
    lista.classList.add('ord-activo');            // el CSS pliega los formularios abiertos mientras se arrastra
    const rects = its.map(x => x.getBoundingClientRect());
    const sy = window.scrollY;
    const r0 = rects[desde];
    let hueco = 0;
    if (its.length > 1) hueco = desde > 0 ? r0.top - rects[desde - 1].bottom : rects[1].top - r0.bottom;

    Object.assign(ses, {
      its, desde, to: desde, sy0: sy, r0, h: r0.height,
      agarre: Math.min(Math.max(agarre, 0), Math.max(r0.height - 4, 0)),
      tam: r0.height + Math.max(hueco, 0),
      centros: rects.map(r => r.top + sy + r.height / 2)
    });
    its.forEach((x, i) => { x.classList.add(i === desde ? 'ord-arrastrando' : 'ord-otro'); });
    ses.raf = requestAnimationFrame(bucle);
  }

  // Desplazamiento automático cerca de los bordes + reposicionado continuo
  function bucle() {
    if (!ses || !ses.activo) return;
    const alto = window.innerHeight;
    let dv = 0;
    if (ses.y < BORDE) dv = -Math.ceil(VEL_MAX * (BORDE - ses.y) / BORDE);
    else if (ses.y > alto - BORDE) dv = Math.ceil(VEL_MAX * (ses.y - (alto - BORDE)) / BORDE);
    if (dv) window.scrollBy(0, dv);
    actualizar();
    ses.raf = requestAnimationFrame(bucle);
  }

  function actualizar() {
    if (!ses || !ses.activo) return;
    const { y, agarre, r0, sy0, desde, h, tam, its, centros } = ses;
    const sy = window.scrollY;
    // El elemento sigue al dedo aunque la página se haya desplazado
    ses.el.style.transform = `translateY(${y - agarre - r0.top + (sy - sy0)}px)`;
    // Posición de destino: cuántos de los demás tienen su centro por encima del centro del arrastrado
    const centro = y - agarre + sy + h / 2;
    let to = 0;
    centros.forEach((c, i) => { if (i !== desde && c < centro) to++; });
    ses.to = to;
    its.forEach((x, i) => {
      if (i === desde) return;
      let d = 0;
      if (desde < to && i > desde && i <= to) d = -tam;
      else if (desde > to && i >= to && i < desde) d = tam;
      x.style.transform = d ? `translateY(${d}px)` : '';
    });
  }

  function soltar(e) {
    if (!ses || (e && e.pointerId !== ses.pid)) return;
    const { activo, desde, to } = ses;
    limpiar();
    if (activo && to !== desde) alSoltar(desde, to, 'arrastre');
  }

  function cancelar() {
    if (ses) limpiar();
  }

  function limpiar() {
    const s = ses;
    ses = null;
    cancelAnimationFrame(s.raf);
    s.a.removeEventListener('pointermove', mover);
    s.a.removeEventListener('pointerup', soltar);
    s.a.removeEventListener('pointercancel', cancelar);
    s.a.removeEventListener('lostpointercapture', cancelar);
    s.a.removeEventListener('contextmenu', bloquear);
    document.removeEventListener('keydown', teclaEscape, true);
    try { s.a.releasePointerCapture(s.pid); } catch { /* ya liberado */ }
    lista.classList.remove('ord-activo');
    (s.its || []).forEach(x => { x.style.transform = ''; x.classList.remove('ord-arrastrando', 'ord-otro'); });
  }
}
