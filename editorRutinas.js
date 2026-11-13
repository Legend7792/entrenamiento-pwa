import { showToast, showConfirm, showPrompt, escapeHtml } from "./ui.js";
// editorRutinas.js — v99 (arrastrar para reordenar, duplicar día)
import {
  saveRutinaUsuario, loadRutinaUsuario, getAllRutinasUsuario,
  deleteRutinaUsuario, generarIdRutina, RUTINA_BASE_ID,
  restaurarRutinaBase, reordenarEjercicioRutina, reordenarDiaRutina, duplicarDiaRutina,
  nombreDiaRepetido, duplicarRutina, exportarRutinaJSON, importarRutinaDesdeJSON, normalizarRutina,
  copiarDiasEntreRutinas
} from "./rutinaUsuario.js";
import { habilitarOrdenar } from "./ordenar.js";
import { PLANTILLAS } from "./plantillas.js";
import { renderizarSelectorRutinas } from "./selectorRutinas.js";
import { navPush, navLimpiar, navAtras, navCerrar, navTope } from "./nav.js";
import { opcionesMusculo, opcionesSubzona } from "./musculos.js";
import { PROGRESION, INTENSIDAD, metodoIntPorId, nombreProg } from "./metodos.js";

// Escapado seguro para texto y atributos (incluye comillas)
const esc = escapeHtml;

let rutinaEditando   = null;
let rutinaEditandoId = null;
let diaEditando      = null;
let ejEditandoIdx    = null;
let _borrador        = null;   // lo escrito (sin guardar) en el formulario de editar ejercicio: sobrevive a un reordenado

// ── Asa de arrastre (⋮⋮): sustituye a las flechas ⬆️⬇️. Las flechas del teclado también funcionan sobre ella ──
const ICONO_ASA = `<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false"><g fill="currentColor"><circle cx="9" cy="6" r="2"/><circle cx="15" cy="6" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="15" cy="12" r="2"/><circle cx="9" cy="18" r="2"/><circle cx="15" cy="18" r="2"/></g></svg>`;
function asaHTML(tipo, idx, nombre, total) {
  return `<button type="button" class="asa-orden" data-asa="${tipo}" data-idx="${idx}" title="Arrastra para reordenar"
    aria-label="Reordenar «${esc(nombre)}», posición ${idx + 1} de ${total}. Arrastra, o usa las flechas arriba y abajo del teclado">${ICONO_ASA}</button>`;
}
function enfocarAsa(tipo, idx) {
  setTimeout(() => document.querySelector(`.asa-orden[data-asa="${tipo}"][data-idx="${idx}"]`)?.focus(), 0);
}
// Dónde queda un elemento (índice i) cuando otro pasa de `desde` a `hasta`
function indiceTrasMover(i, desde, hasta) {
  if (i === desde) return hasta;
  if (desde < hasta && i > desde && i <= hasta) return i - 1;
  if (desde > hasta && i >= hasta && i < desde) return i + 1;
  return i;
}

window.abrirEditorRutinas = function () {
  navPush();
  document.querySelectorAll('section[id^="pantalla-"], #menu').forEach(el => el.classList.add('oculto'));
  document.getElementById("pantalla-editor").classList.remove("oculto");
  renderListaRutinas();
};

function renderListaRutinas() {
  const cont    = document.getElementById("contenido-editor");
  const rutinas = getAllRutinasUsuario();
  cont.innerHTML = `<div class="gestor-rutinas"><h3>Mis Rutinas</h3>
    <div class="lista-rutinas">
      ${Object.keys(rutinas).length === 0
        ? `<p class="texto-vacio">No tienes rutinas.</p>`
        : Object.keys(rutinas).map(id => {
            const r = rutinas[id]; const esBase = id === RUTINA_BASE_ID;
            return `<div class="rutina-card">
              <div class="rutina-card-info"><h4>${esBase?'📋':'✏️'} ${esc(r.nombre)}</h4><p>${r.dias.length} día(s)</p></div>
              <div class="acciones-rutina-card">
                <button onclick="editarRutina('${esc(id)}')">✏️ Editar</button>
                <button onclick="exportarRutina('${esc(id)}')" title="Exportar JSON" aria-label="Exportar JSON">📤</button>
                <button onclick="imprimirRutina('${esc(id)}')" title="Imprimir / guardar PDF" aria-label="Imprimir o guardar como PDF">🖨️</button>
                ${esBase
                  ? `<button onclick="restaurarRutinaBaseBtn()" style="background:var(--warning);color:#000;" title="Restaurar">🔄</button>`
                  : `<button onclick="clonarRutina('${esc(id)}')" title="Duplicar">📋</button>
                     <button class="btn-danger" onclick="borrarRutinaCompleta('${esc(id)}')">🗑️</button>`}
              </div></div>`;
          }).join('')}
    </div>
    <div class="botones-editor-rutinas">
      <button onclick="crearNuevaRutina()">➕ Nueva rutina</button>
      <button onclick="abrirPlantillas()" class="btn-secondary">📚 Desde plantilla</button>
      <button onclick="document.getElementById('input-importar-json').click()" class="btn-secondary">📥 Importar JSON</button>
      <input type="file" id="input-importar-json" accept=".json" style="display:none" onchange="importarDesdeArchivoJSON(this)">
      <button onclick="volverMenuDesdeEditor()" class="btn-secondary">← Volver al menú</button>
    </div></div>`;
}

window.exportarRutina = (id) => { exportarRutinaJSON(id); showToast('Rutina exportada','success'); };

window.importarDesdeArchivoJSON = function(input) {
  const f = input.files[0]; if(!f) return;
  importarRutinaDesdeJSON(f,(nuevoId,err)=>{
    if(err){ showToast('Error: '+err,'error'); }
    else { showToast('Rutina importada','success'); renderizarSelectorRutinas(); renderListaRutinas(); dispararCambioRutina(); }
  });
  input.value='';
};

window.clonarRutina = (id) => { const nId=duplicarRutina(id); if(nId){ showToast('Rutina duplicada','success'); renderizarSelectorRutinas(); renderListaRutinas(); dispararCambioRutina(); } };
window.restaurarRutinaBaseBtn = () => {
  showConfirm("¿Restaurar la rutina base? Se perderán todos los cambios.", () => {
    if (restaurarRutinaBase()) {
      showToast('Rutina base restaurada', 'success');
      renderizarSelectorRutinas();
      renderListaRutinas();
    }
  });
};

window.crearNuevaRutina = function() {
  showPrompt("Nombre de la rutina:", "ej: Mi Rutina", (nombre) => { const id=generarIdRutina(); saveRutinaUsuario({nombre:nombre.trim(),dias:[]},id); editarRutina(id); });
};

// ── Impresión: hoja con la rutina para llevar al gimnasio o guardar como PDF ──
window.imprimirRutina = function(id) {
  const r = loadRutinaUsuario(id);
  if (!r || !r.dias?.length) { showToast('La rutina no tiene días para imprimir','warning'); return; }
  const filaCeldas = n => Array.from({length:n},()=>'<td class="imp-blanco"></td>').join('');
  const html = `<h1>${esc(r.nombre)}</h1>
    <p class="imp-sub">Gym Tracker · ${new Date().toLocaleDateString('es-ES')}</p>
    ${r.dias.map(d => `
      <h2>${esc(d.nombre)}</h2>
      <table class="imp-tabla">
        <thead><tr><th>Ejercicio</th><th>Series × reps</th><th>Peso</th><th>Desc.</th><th>Tempo</th><th>Series hechas (reps)</th></tr></thead>
        <tbody>${d.ejercicios.map(ej => {
          const peso = ej.alFallo ? 'Al fallo' : `${window.pesoConfigActual ? window.pesoConfigActual(id, d.nombre, ej.nombre, ej.peso) : ej.peso} kg`;
          const reps = ej.alFallo ? 'Al fallo' : `${ej.repsMin}${ej.repsMax !== ej.repsMin ? '-' + ej.repsMax : ''}`;
          return `<tr><td><strong>${esc(ej.nombre)}</strong>${ej.notas ? `<br><small>${esc(ej.notas)}</small>` : ''}</td>
            <td>${esc(ej.series)} × ${esc(reps)}</td><td>${esc(peso)}</td><td>${esc(ej.descanso || '')}${ej.descanso ? ' s' : ''}</td>
            <td>${esc(ej.tempo || '')}</td>${filaCeldas(1)}</tr>`;
        }).join('')}</tbody>
      </table>`).join('')}`;
  let cont = document.getElementById('vista-impresion');
  if (!cont) { cont = document.createElement('div'); cont.id = 'vista-impresion'; document.body.appendChild(cont); }
  cont.innerHTML = html;
  document.body.classList.add('imprimiendo');
  const limpiar = () => { document.body.classList.remove('imprimiendo'); cont.innerHTML = ''; window.removeEventListener('afterprint', limpiar); };
  window.addEventListener('afterprint', limpiar);
  // Pequeña espera para que el navegador pinte antes de abrir el diálogo
  setTimeout(() => { try { window.print(); } catch { limpiar(); showToast('No se pudo abrir la impresión','error'); } }, 150);
};

// ── Plantillas: rutinas de partida con los pesos a 0 (se rellenan al entrenar) ──
window.abrirPlantillas = function() {
  navPush({ pantalla: 'editor', nivel: 'plantillas' });
  const cont = document.getElementById("contenido-editor");
  cont.innerHTML = `<div class="gestor-rutinas"><h3>📚 Plantillas</h3>
    <p class="import-hint">Se crea una copia que puedes editar libremente. Los pesos empiezan en 0: ponlos en la pantalla del día la primera vez que entrenes.</p>
    <div class="lista-rutinas">
      ${Object.entries(PLANTILLAS).map(([id, t]) => `
        <div class="rutina-card">
          <div class="rutina-card-info"><h4>${esc(t.titulo)}</h4>
            <p>${esc(t.descripcion)}</p>
            <p>${t.rutina.dias.map(d => esc(d.nombre)).join(' · ')}</p></div>
          <div class="acciones-rutina-card"><button onclick="usarPlantilla('${esc(id)}')">➕ Crear</button></div>
        </div>`).join('')}
    </div>
    <div class="botones-editor-rutinas"><button onclick="volverListaRutinas()" class="btn-secondary">← Volver</button></div>
  </div>`;
};

window.usarPlantilla = function(plantillaId) {
  const t = PLANTILLAS[plantillaId];
  const rutina = t && normalizarRutina(JSON.parse(JSON.stringify(t.rutina)));
  if (!rutina) { showToast('Plantilla no disponible','error'); return; }
  const id = generarIdRutina();
  saveRutinaUsuario(rutina, id);
  renderizarSelectorRutinas();
  showToast(`Rutina "${rutina.nombre}" creada`,'success');
  editarRutina(id);
};

window.editarRutina = (id) => {
  navCerrar({ nivel: 'plantillas' });                 // al crear desde plantilla, la rutina sustituye al nivel "plantillas"
  navPush({ pantalla: 'editor', nivel: 'rutina' });
  rutinaEditandoId=id; rutinaEditando=loadRutinaUsuario(id); renderEditorRutina();
};

function renderEditorRutina() {
  const cont=document.getElementById("contenido-editor"); const esBase=rutinaEditandoId===RUTINA_BASE_ID;
  const tieneDeload = rutinaEditando.tieneDeload === true;
  cont.innerHTML = `<div class="editor-header">
    <h3>${esc(rutinaEditando.nombre)}</h3>
    ${!esBase?`<button onclick="cambiarNombreRutina()" class="btn-icon">✏️</button>`:''}
    <button onclick="volverListaRutinas()" class="btn-secondary">← Volver</button></div>

  <div class="config-rutina-deload">
    <label class="deload-toggle-label">
      <input type="checkbox" id="rutina-tiene-deload" ${tieneDeload ? 'checked' : ''}
        onchange="toggleDeloadRutina(this.checked)">
      💤 Usar Deload con esta rutina
    </label>
    <small class="deload-toggle-hint">
      ${tieneDeload
        ? 'Deload habilitado. El contador de semanas y el estado son independientes por rutina.'
        : 'Sin deload: no aparecerá el banner ni se aplicarán reducciones de carga.'}
    </small>
  </div>

  <div class="config-rutina-deload">
    <label class="form-label" for="rutina-metodo-prog">📈 Método de progresión de la rutina</label>
    <select id="rutina-metodo-prog" onchange="cambiarMetodoProgRutina(this.value)">
      ${PROGRESION.map(p => `<option value="${esc(p.id)}" ${(rutinaEditando.metodoProg||'doble')===p.id?'selected':''}>${esc(p.nombre)}</option>`).join('')}
    </select>
    <small class="deload-toggle-hint">${esc(PROGRESION.find(p => p.id === (rutinaEditando.metodoProg||'doble')).resumen)} Cada ejercicio puede usar otro método en sus opciones avanzadas.</small>
  </div>

  <div class="lista-dias">
    ${rutinaEditando.dias.length===0
      ? `<p class="texto-vacio">Sin días. Añade uno abajo.</p>`
      : rutinaEditando.dias.map((d,i)=>`<div class="dia-card">
          ${rutinaEditando.dias.length>1?asaHTML('dia', i, d.nombre, rutinaEditando.dias.length):''}
          <div class="dia-card-info"><h4>📅 ${esc(d.nombre)}</h4><p>${d.ejercicios.length} ejercicio(s)</p></div>
          <div class="acciones-dia-card">
            <button onclick="editarDia(${i})">✏️ Editar</button>
            <button onclick="duplicarDia(${i})" class="btn-secondary" title="Duplicar este día" aria-label="Duplicar el día ${esc(d.nombre)}">📑</button>
            <button class="btn-danger" onclick="borrarDia(${i})" aria-label="Borrar el día ${esc(d.nombre)}">🗑️</button>
          </div></div>`).join('')}
  </div><button onclick="añadirNuevoDia()">➕ Añadir día</button>
  <button onclick="abrirCopiarDias()" class="btn-secondary">📥 Copiar días de otra rutina</button>`;
  habilitarOrdenar(cont.querySelector('.lista-dias'), { item: '.dia-card', asa: '.asa-orden', alSoltar: alSoltarDia });
}

function alSoltarDia(desde, hasta, via) {
  if (!reordenarDiaRutina(rutinaEditandoId, desde, hasta)) return;
  rutinaEditando = loadRutinaUsuario(rutinaEditandoId);
  dispararCambioRutina();
  renderEditorRutina();
  if (via === 'teclado') enfocarAsa('dia', hasta);
}

// Duplica un día justo debajo del original, con el mismo contenido y los mismos pesos de trabajo actuales
window.duplicarDia = function(i) {
  const r = duplicarDiaRutina(rutinaEditandoId, i);
  if (!r) { showToast('No se pudo duplicar el día','error'); return; }
  window.copiarConfigDia?.(rutinaEditandoId, r.nombreOrigen, r.nombre, r.ejercicios);
  rutinaEditando = loadRutinaUsuario(rutinaEditandoId);
  dispararCambioRutina();
  renderEditorRutina();
  const tarjeta = document.querySelectorAll('.lista-dias .dia-card')[r.indice];
  if (tarjeta) { tarjeta.classList.add('dia-nuevo'); tarjeta.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
  showToast(`Día duplicado: «${r.nombre}»`, 'success');
};

window.cambiarMetodoProgRutina = function(id) {
  if (!PROGRESION.some(p => p.id === id)) return;
  if (id === 'doble') delete rutinaEditando.metodoProg; else rutinaEditando.metodoProg = id;
  saveRutinaUsuario(rutinaEditando, rutinaEditandoId);
  dispararCambioRutina();
  renderEditorRutina();
  showToast(`Progresión de la rutina: ${nombreProg(id)}`, 'success');
};

// ── Copiar días completos desde otra rutina ──
let _copiarOrigenId = null;
window.abrirCopiarDias = function() {
  const otras = Object.entries(getAllRutinasUsuario()).filter(([id, r]) => id !== rutinaEditandoId && r?.dias?.length);
  if (!otras.length) { showToast('No hay otra rutina con días para copiar','info'); return; }
  navPush({ pantalla: 'editor', nivel: 'dia' });
  _copiarOrigenId = otras[0][0];
  renderCopiarDias();
};

function renderCopiarDias() {
  const otras = Object.entries(getAllRutinasUsuario()).filter(([id, r]) => id !== rutinaEditandoId && r?.dias?.length);
  const origen = loadRutinaUsuario(_copiarOrigenId);
  const cont = document.getElementById('contenido-editor');
  cont.innerHTML = `<div class="gestor-rutinas"><h3>📥 Copiar días a «${esc(rutinaEditando.nombre)}»</h3>
    <label class="form-label" for="copiar-origen">Copiar desde la rutina</label>
    <select id="copiar-origen" onchange="cambiarOrigenCopia(this.value)">
      ${otras.map(([id, r]) => `<option value="${esc(id)}" ${id === _copiarOrigenId ? 'selected' : ''}>${esc(r.nombre)}</option>`).join('')}
    </select>
    <p class="import-hint">Se copian los ejercicios, tempos, notas, métodos y descansos, junto con los pesos de trabajo actuales. Si el nombre del día ya existe aquí, la copia se llamará «… (copia)».</p>
    <div class="lista-rutinas">
      ${origen.dias.map((d, i) => `<label class="rutina-card" style="cursor:pointer;">
        <div class="rutina-card-info"><h4><input type="checkbox" class="copiar-dia-check" value="${i}"> 📅 ${esc(d.nombre)}</h4><p>${d.ejercicios.length} ejercicio(s)</p></div></label>`).join('')}
    </div>
    <div class="botones-editor-rutinas">
      <button onclick="confirmarCopiarDias()">📥 Copiar los días marcados</button>
      <button onclick="volverListaDias()" class="btn-secondary">← Cancelar</button>
    </div></div>`;
}
window.cambiarOrigenCopia = function(id) { _copiarOrigenId = id; renderCopiarDias(); };
window.confirmarCopiarDias = function() {
  const indices = [...document.querySelectorAll('.copiar-dia-check:checked')].map(c => Number(c.value));
  if (!indices.length) { showToast('Marca al menos un día','warning'); return; }
  const origen = loadRutinaUsuario(_copiarOrigenId);
  const hechos = copiarDiasEntreRutinas(_copiarOrigenId, indices, rutinaEditandoId);
  if (!hechos) { showToast('No se pudo copiar','error'); return; }
  // Pesos, descansos e incrementos de trabajo van por nombre de día y de ejercicio: se llevan a la rutina de destino
  hechos.forEach((h, k) => window.copiarConfigEntreRutinas?.(_copiarOrigenId, h.nombreOrigen, rutinaEditandoId, h.nombre, h.ejercicios));
  rutinaEditando = loadRutinaUsuario(rutinaEditandoId);
  dispararCambioRutina();
  showToast(`${hechos.length} día(s) copiado(s) desde «${origen.nombre}»`,'success');
  volverListaDias();
};

window.cambiarNombreRutina = function() {
  const fn=(n)=>{ rutinaEditando.nombre=n.trim(); saveRutinaUsuario(rutinaEditando,rutinaEditandoId); dispararCambioRutina(); renderEditorRutina(); };
  showPrompt("Nuevo nombre:", "", fn, rutinaEditando.nombre);
};

window.toggleDeloadRutina = function(activo) {
  rutinaEditando.tieneDeload = activo;
  saveRutinaUsuario(rutinaEditando, rutinaEditandoId);
  dispararCambioRutina();
  renderEditorRutina();
  showToast(activo ? '💤 Deload habilitado para esta rutina' : 'Deload desactivado para esta rutina', 'success');
};

window.borrarRutinaCompleta = function(id) {
  const r=loadRutinaUsuario(id);
  const fn=()=>{ deleteRutinaUsuario(id); if(localStorage.getItem("rutinaActiva")===id) localStorage.setItem("rutinaActiva",RUTINA_BASE_ID); dispararCambioRutina(); renderizarSelectorRutinas(); renderListaRutinas(); showToast('Rutina eliminada','info'); };
  showConfirm(`¿Borrar "${r.nombre}"? No se puede deshacer.`, fn);
};

window.añadirNuevoDia = function() {
  // Pesos, notas e historial se guardan por nombre de día: dos días con el mismo nombre se mezclarían
  const fn=(n)=>{
    const nombre = n.trim();
    if (nombreDiaRepetido(rutinaEditando.dias, nombre)) { showToast(`Ya hay un día llamado "${nombre}" en esta rutina`,'warning'); return; }
    rutinaEditando.dias.push({nombre,ejercicios:[],tieneTimer:true,tieneCronometro:false}); saveRutinaUsuario(rutinaEditando,rutinaEditandoId); dispararCambioRutina(); renderEditorRutina(); };
  let sugerido = rutinaEditando.dias.length+1;
  while (nombreDiaRepetido(rutinaEditando.dias, `Día ${sugerido}`)) sugerido++;
  showPrompt("Nombre del día:", `Día ${sugerido}`, fn);
};

window.borrarDia = function(i) {
  const fn=()=>{ rutinaEditando.dias.splice(i,1); saveRutinaUsuario(rutinaEditando,rutinaEditandoId); dispararCambioRutina(); renderEditorRutina(); };
  showConfirm(`¿Borrar "${rutinaEditando.dias[i].nombre}"?`, fn);
};

window.editarDia = (i) => { navPush({ pantalla: 'editor', nivel: 'dia' }); diaEditando=i; ejEditandoIdx=null; renderFormularioDia(); };

// ─────────────────────────────────────────────────
// FORMULARIO DÍA — con edición de ejercicios existentes
// ─────────────────────────────────────────────────
function descansoInteligente(repsMax) {
  if(!repsMax||repsMax<=5) return 180;
  if(repsMax<=8) return 150;
  if(repsMax<=12) return 90;
  return 60;
}
window.descansoInteligente = descansoInteligente;


// ─────────────────────────────────────────────────
// CAMPOS AVANZADOS DE UN EJERCICIO (v105)
// ids: edición → edit-<campo>-<idx> · alta → ej-<campo>   (campo = letras minúsculas, ver capturarCampos)
// ─────────────────────────────────────────────────
const idc = (modo, campo, idx) => modo === 'edit' ? `edit-${campo}-${idx}` : `ej-${campo}`;

function paramsIntHTML(modo, idx, metodoId, valores = {}) {
  const m = metodoIntPorId(metodoId);
  if (!m || !m.params.length) return '';
  const campos = ['mintuno', 'mintdos'];
  return `<div class="metodo-param">${m.params.map((par, i) => `
    <div class="form-col"><label class="form-label" for="${idc(modo, campos[i], idx)}">${esc(par.etiqueta)}</label>
      <input id="${idc(modo, campos[i], idx)}" type="number" inputmode="numeric" min="${par.min}" max="${par.max}" value="${esc(valores[par.id] ?? par.defecto)}"></div>`).join('')}</div>`;
}

function tieneAvanzado(ej) {
  return !!(ej.calentamiento || ej.notasEj || ej.subzona || ej.alt || ej.msgMin || ej.metodoProg || ej.metodoInt);
}

function bloqueMusculoHTML(modo, idx, ej) {
  return `<div class="form-row">
    <div class="form-col"><label class="form-label" for="${idc(modo, 'musculo', idx)}">Grupo muscular</label>
      <select id="${idc(modo, 'musculo', idx)}" onchange="actualizarSubzonas('${modo}', ${idx})">${opcionesMusculo(ej.musculo || '', esc)}</select></div>
    <div class="form-col"><label class="form-label" for="${idc(modo, 'subzona', idx)}">Subzona (opcional)</label>
      <select id="${idc(modo, 'subzona', idx)}">${opcionesSubzona(ej.musculo || '', ej.subzona || '', esc)}</select></div>
  </div>`;
}

function bloqueAvanzadoHTML(modo, idx, ej) {
  const mp = ej.metodoProg || null;
  const mi = ej.metodoInt || null;
  return `<details class="metodos-ej" ${tieneAvanzado(ej) ? 'open' : ''}>
    <summary>⚙️ Opciones avanzadas del ejercicio</summary>
    <label class="form-label" for="${idc(modo, 'notasej', idx)}">📝 Nota del ejercicio (se muestra a la derecha, bajo el músculo)</label>
    <input id="${idc(modo, 'notasej', idx)}" maxlength="200" placeholder="Ej: asiento en el hueco 4, agarre estrecho" value="${esc(ej.notasEj || '')}">
    <label class="form-label-check"><input type="checkbox" id="${idc(modo, 'cal', idx)}" ${ej.calentamiento ? 'checked' : ''}> 🔥 Mostrar calentamiento sugerido en este ejercicio</label>

    <label class="form-label" for="${idc(modo, 'alt', idx)}">🔄 Alternar con otros ejercicios (nombre del grupo)</label>
    <input id="${idc(modo, 'alt', idx)}" maxlength="40" placeholder="Ej: Press de pecho" value="${esc(ej.alt || '')}">
    <small class="import-hint">Los ejercicios del mismo día con el mismo nombre de grupo se turnan: cada sesión aparece solo el que hiciste hace más tiempo (o el que nunca hiciste).</small>

    <label class="form-label" for="${idc(modo, 'mprog', idx)}">📈 Método de progresión</label>
    <select id="${idc(modo, 'mprog', idx)}" onchange="actualizarParamsProg('${modo}', ${idx})">
      <option value="">Usar el de la rutina</option>
      ${PROGRESION.map(p => `<option value="${esc(p.id)}" ${mp?.id === p.id ? 'selected' : ''}>${esc(p.nombre)}</option>`).join('')}
    </select>
    <div id="${idc(modo, 'mprogparams', idx)}">${mp?.id === 'triple' ? paramsProgHTML(modo, idx, mp.params?.extraMax) : ''}</div>

    <label class="form-label" for="${idc(modo, 'mint', idx)}">🔥 Método de intensidad</label>
    <select id="${idc(modo, 'mint', idx)}" onchange="actualizarParamsInt('${modo}', ${idx})">
      <option value="">Ninguno</option>
      ${INTENSIDAD.map(m => `<option value="${esc(m.id)}" ${mi?.id === m.id ? 'selected' : ''}>${esc(m.nombre)}</option>`).join('')}
    </select>
    <div id="${idc(modo, 'mintparams', idx)}">${mi ? paramsIntHTML(modo, idx, mi.id, mi.params) : ''}</div>
    <small class="import-hint">Cambia las series y los descansos de este ejercicio al abrir el día. Más información en 📖 Guía → Métodos.</small>

    <label class="form-label" for="${idc(modo, 'msgmin', idx)}">⚠️ Mensaje si no llegas al mínimo de reps (opcional)</label>
    <input id="${idc(modo, 'msgmin', idx)}" maxlength="160" placeholder="Si lo dejas vacío se usa el mensaje general" value="${esc(ej.msgMin || '')}">
  </details>`;
}

function paramsProgHTML(modo, idx, extraMax) {
  return `<div class="metodo-param"><div class="form-col"><label class="form-label" for="${idc(modo, 'mprogx', idx)}">Series extra máximas</label>
    <input id="${idc(modo, 'mprogx', idx)}" type="number" inputmode="numeric" min="0" max="5" value="${esc(extraMax ?? 2)}"></div></div>`;
}

window.actualizarSubzonas = function (modo, idx) {
  const mus = document.getElementById(idc(modo, 'musculo', idx))?.value || '';
  const sub = document.getElementById(idc(modo, 'subzona', idx));
  if (sub) sub.innerHTML = opcionesSubzona(mus, '', esc);
};
window.actualizarParamsProg = function (modo, idx) {
  const id = document.getElementById(idc(modo, 'mprog', idx))?.value;
  const cont = document.getElementById(idc(modo, 'mprogparams', idx));
  if (cont) cont.innerHTML = id === 'triple' ? paramsProgHTML(modo, idx, 2) : '';
};
window.actualizarParamsInt = function (modo, idx) {
  const id = document.getElementById(idc(modo, 'mint', idx))?.value;
  const cont = document.getElementById(idc(modo, 'mintparams', idx));
  if (cont) cont.innerHTML = id ? paramsIntHTML(modo, idx, id) : '';
};

// Lee los campos avanzados del formulario. Devuelve { campos } con los valores listos (undefined = quitar) o { error }.
function leerAvanzado(modo, idx) {
  const v = campo => document.getElementById(idc(modo, campo, idx));
  const out = {};
  const nota = v('notasej')?.value.trim();
  out.notasEj = nota ? nota.slice(0, 200) : undefined;
  out.calentamiento = v('cal')?.checked ? true : undefined;
  const sub = v('subzona')?.value;
  out.subzona = sub || undefined;
  const alt = v('alt')?.value.trim();
  out.alt = alt ? alt.slice(0, 40) : undefined;
  const msg = v('msgmin')?.value.trim();
  out.msgMin = msg ? msg.slice(0, 160) : undefined;

  const mp = v('mprog')?.value;
  if (mp) {
    out.metodoProg = { id: mp };
    if (mp === 'triple') {
      const x = Number(v('mprogx')?.value);
      if (!Number.isInteger(x) || x < 0 || x > 5) return { error: 'Las series extra máximas deben ser un número entero entre 0 y 5' };
      out.metodoProg.params = { extraMax: x };
    }
  } else out.metodoProg = undefined;

  const mi = v('mint')?.value;
  if (mi) {
    const def = metodoIntPorId(mi);
    const params = {};
    const campos = ['mintuno', 'mintdos'];
    for (let i = 0; i < def.params.length; i++) {
      const par = def.params[i];
      const n = Number(v(campos[i])?.value);
      if (!Number.isInteger(n) || n < par.min || n > par.max) return { error: `${par.etiqueta}: debe ser un número entero entre ${par.min} y ${par.max}` };
      params[par.id] = n;
    }
    out.metodoInt = { id: mi, params };
  } else out.metodoInt = undefined;
  return { campos: out };
}

// Aplica los campos leídos sobre un ejercicio (los undefined se eliminan)
function aplicarAvanzado(ej, campos) {
  Object.entries(campos).forEach(([k, val]) => { if (val === undefined) delete ej[k]; else ej[k] = val; });
  return ej;
}

function formatDescEj(ej) {
  const desc = ej.descanso
    ? `⏱ ${Math.floor(ej.descanso/60)}:${String(ej.descanso%60).padStart(2,'0')}`
    : `<span class="sin-descanso">⚠️ sin descanso</span>`;
  const extra = `${ej.calentamiento?' · 🔥':''}${ej.alt?` · 🔄 ${esc(ej.alt)}`:''}${ej.metodoInt?` · ⚙️ ${esc(metodoIntPorId(ej.metodoInt.id)?.nombre.split(' (')[0] || '')}`:''}${ej.metodoProg?` · 📈 ${esc(nombreProg(ej.metodoProg.id))}`:''}`;
  return ej.alFallo
    ? `${ej.series}×Al fallo &nbsp;${desc}${ej.tempo?` · ${esc(ej.tempo)}`:''}${ej.notas?' · 📋':''}${extra}`
    : `${ej.series}×${ej.repsMin}-${ej.repsMax} — ${ej.peso}kg &nbsp;${desc}${ej.tempo?` · ${esc(ej.tempo)}`:''}${extra}`;
}

function renderFormularioDia() {
  const dia=rutinaEditando.dias[diaEditando];
  const cont=document.getElementById("contenido-editor");
  const total=dia.ejercicios.length;
  const sinDescanso=dia.ejercicios.some(e=>!e.descanso);

  cont.innerHTML = `<div class="editor-dia">
    <div class="editor-dia-header">
      <h3>📅 ${esc(dia.nombre)}</h3>
      <button onclick="cambiarNombreDia()" class="btn-icon" title="Renombrar">✏️</button>
    </div>
    <div class="config-dia">
      <label><input type="checkbox" id="dia-timer" ${dia.tieneTimer!==false?'checked':''} onchange="toggleTimer(this.checked)"> ⏱️ Timers de descanso por ejercicio</label>
      <label><input type="checkbox" id="dia-cronometro" ${dia.tieneCronometro?'checked':''} onchange="toggleCronometro(this.checked)"> ⏲️ Cronómetro HIT</label>
    </div>
    ${sinDescanso&&total>0?`<div class="aviso-migracion">⚠️ Ejercicios sin descanso configurado.
      <button onclick="migrarDescansosDia()" class="btn-migrar">✨ Asignar descansos automáticamente</button></div>`:''}
    <hr>
    <h4>Ejercicios <small style="color:var(--text-secondary);font-weight:normal;font-size:calc(12px*var(--fs));">(✏️ para editar cualquiera)</small></h4>
    <div class="lista-ejercicios-editor">
      ${total===0?`<p class="texto-vacio">Sin ejercicios.</p>`:dia.ejercicios.map((ej,idx)=>`
       <div class="ej-item">
        <div class="ejercicio-editor-card${ejEditandoIdx===idx?' editing':''}">
          ${total>1?asaHTML('ej', idx, ej.nombre, total):''}
          <div class="ej-editor-info">
            <strong>${esc(ej.nombre)}</strong>
            <span class="ej-editor-sub">${formatDescEj(ej)}</span>
            ${ej.notas?`<span class="ej-editor-notas">${esc(ej.notas.substring(0,65))}${ej.notas.length>65?'…':''}</span>`:''}
          </div>
          <div class="ej-editor-acciones">
            <button class="btn-icon btn-edit-ej" onclick="abrirFormEditarEj(${idx})" title="Editar">✏️</button>
            <button class="btn-danger btn-icon" onclick="borrarEjercicio(${idx})" aria-label="Borrar ejercicio ${esc(ej.nombre)}">🗑️</button>
          </div>
        </div>
        ${ejEditandoIdx===idx?`<div class="form-edit-ejercicio" id="form-editar-${idx}">
          <h5>✏️ Editando: ${esc(ej.nombre)}</h5>
          <input id="edit-nombre-${idx}" aria-label="Nombre del ejercicio" placeholder="Nombre *" value="${esc(ej.nombre)}" />
          <div class="form-row">
            <div class="form-col"><label class="form-label">Peso (kg)*</label><input id="edit-peso-${idx}" type="number" min="0" step="0.5" value="${ej.peso}" /></div>
            <div class="form-col"><label class="form-label">Series*</label><input id="edit-series-${idx}" type="number" min="1" value="${ej.series}" /></div>
          </div>
          <div class="form-row">
            <div class="form-col"><label class="form-label">Reps mín*</label><input id="edit-rmin-${idx}" type="number" min="1" value="${ej.repsMin}" /></div>
            <div class="form-col"><label class="form-label">Reps máx*</label><input id="edit-rmax-${idx}" type="number" min="1" value="${ej.repsMax}" /></div>
          </div>
          <div class="form-row">
            <div class="form-col"><label class="form-label">⏱ Descanso (seg)</label><input id="edit-desc-${idx}" type="number" min="0" value="${ej.descanso||''}" placeholder="90" /></div>
            <div class="form-col"><label class="form-label">Tempo</label><input id="edit-tempo-${idx}" placeholder="3-1-1" value="${esc(ej.tempo||'')}" /></div>
          </div>
          ${bloqueMusculoHTML("edit", idx, ej)}
          <label class="form-label">Notas técnicas</label>
          <textarea id="edit-notas-${idx}" rows="2">${esc(ej.notas||'')}</textarea>
          <label class="form-label-check"><input type="checkbox" id="edit-fallo-${idx}" ${ej.alFallo?'checked':''}> Al fallo</label>
          ${bloqueAvanzadoHTML("edit", idx, ej)}
          <div class="form-edit-btns">
            <button onclick="guardarEjercicioEditado(${idx})" class="btn-primary">💾 Guardar</button>
            <button onclick="cancelarEdicionEjercicio()" class="btn-secondary" aria-label="Cancelar edición">✕</button>
          </div></div>`:''}
       </div>
      `).join('')}
    </div>
    <hr>
    <h4>➕ Añadir ejercicio</h4>
    <div class="form-ejercicio">
      <input id="ej-nombre" aria-label="Nombre del ejercicio nuevo" placeholder="Nombre *" />
      <div class="form-row">
        <div class="form-col"><label class="form-label">Peso*</label><input id="ej-peso" type="number" min="0" step="0.5" placeholder="0" /></div>
        <div class="form-col"><label class="form-label">Series*</label><input id="ej-series" type="number" min="1" placeholder="3" /></div>
      </div>
      <div class="form-row">
        <div class="form-col"><label class="form-label">Reps mín*</label><input id="ej-reps-min" type="number" min="1" placeholder="8" /></div>
        <div class="form-col"><label class="form-label">Reps máx*</label><input id="ej-reps-max" type="number" min="1" placeholder="12" /></div>
      </div>
      <div class="form-row">
        <div class="form-col"><label class="form-label">⏱ Descanso (seg)</label><input id="ej-descanso" type="number" min="0" placeholder="90" /></div>
        <div class="form-col"><label class="form-label">Tempo</label><input id="ej-tempo" placeholder="3-1-1" /></div>
      </div>
      ${bloqueMusculoHTML("alta", 0, {})}
      <label class="form-label">Notas técnicas</label>
      <textarea id="ej-notas" rows="2" placeholder="Indicaciones de ejecución..."></textarea>
      <label class="form-label-check"><input type="checkbox" id="ej-fallo"> Al fallo</label>
      ${bloqueAvanzadoHTML("alta", 0, {})}
      <button onclick="añadirEjercicioADia()">➕ Añadir</button>
    </div>
    <hr>
    <button onclick="volverListaDias()" class="btn-secondary">← Volver a días</button>
  </div>`;
  habilitarOrdenar(cont.querySelector('.lista-ejercicios-editor'), { item: '.ej-item', asa: '.asa-orden', alSoltar: alSoltarEjercicio });
  restaurarBorrador();
}

// ── Reordenar ejercicios: no se pierde lo que el usuario haya escrito sin guardar ──
// Los ids de los campos de edición llevan el índice del ejercicio (edit-peso-2), que cambia al reordenar.
function capturarCampos() {
  const campos = {};
  document.querySelectorAll('#contenido-editor [id^="ej-"], #contenido-editor [id^="edit-"]').forEach(el => {
    if (el.type === 'checkbox') campos[el.id] = el.checked;
    else if ('value' in el) campos[el.id] = el.value;
  });
  return campos;
}
function restaurarBorrador() {
  const b = _borrador; _borrador = null;
  if (!b) return;
  Object.entries(b).forEach(([id, v]) => {
    const el = document.getElementById(id);
    if (!el) return;
    if (el.type === 'checkbox') el.checked = !!v; else el.value = v;
  });
}
function alSoltarEjercicio(desde, hasta, via) {
  const abierto = ejEditandoIdx;
  const nuevoAbierto = abierto === null ? null : indiceTrasMover(abierto, desde, hasta);
  const campos = capturarCampos();
  if (!reordenarEjercicioRutina(rutinaEditandoId, diaEditando, desde, hasta)) return;
  rutinaEditando = loadRutinaUsuario(rutinaEditandoId);
  ejEditandoIdx = nuevoAbierto;
  // Re-asignar los campos de edición a su índice nuevo
  _borrador = {};
  Object.entries(campos).forEach(([id, v]) => {
    const m = /^(edit-[a-z]+)-(\d+)$/.exec(id);
    if (!m) { _borrador[id] = v; return; }
    if (nuevoAbierto !== null && Number(m[2]) === abierto) _borrador[`${m[1]}-${nuevoAbierto}`] = v;
  });
  dispararCambioRutina();
  renderFormularioDia();
  if (via === 'teclado') enfocarAsa('ej', hasta);
}

// Los pesos y el historial se asocian al nombre del ejercicio dentro del día: no puede repetirse
// Valida los números de un ejercicio. Devuelve un mensaje de error o null.
// (los min/max de los <input> son solo pistas del navegador: no impiden guardar "-1" o "2.5" series)
function errorNumeros({ series, repsMin, repsMax, descanso, peso, alFallo }) {
  const entero = v => v !== '' && v !== undefined && Number.isInteger(Number(v));
  if (!entero(series) || Number(series) < 1 || Number(series) > 30) return 'Las series deben ser un número entero entre 1 y 30';
  if (!alFallo) {
    if (!entero(repsMin) || Number(repsMin) < 0 || Number(repsMin) > 999) return 'Las reps mínimas deben ser un número entero (0 o más)';
    if (!entero(repsMax) || Number(repsMax) < 1 || Number(repsMax) > 999) return 'Las reps máximas deben ser un número entero (1 o más)';
    const p = Number(peso);
    if (peso !== '' && peso !== undefined && (!Number.isFinite(p) || p < 0 || p > 9999)) return 'El peso debe estar entre 0 y 9999 kg';
  }
  if (descanso !== '' && descanso !== undefined && descanso !== null) {
    const d = Number(descanso);
    if (!Number.isFinite(d) || d < 0 || d > 3600) return 'El descanso debe estar entre 0 y 3600 segundos';
  }
  return null;
}

function nombreRepetido(dia, nombre, idxPropio) {
  const n = String(nombre).trim().toLowerCase();
  return dia.ejercicios.some((ej, i) => i !== idxPropio && String(ej.nombre).trim().toLowerCase() === n);
}

window.cancelarEdicionEjercicio = function() { ejEditandoIdx = null; renderFormularioDia(); };

window.abrirFormEditarEj = function(idx) {
  ejEditandoIdx = ejEditandoIdx===idx ? null : idx;
  renderFormularioDia();
  setTimeout(()=>{ const el=document.getElementById(`form-editar-${idx}`); if(el) el.scrollIntoView({behavior:'smooth',block:'center'}); },80);
};

window.guardarEjercicioEditado = function(idx) {
  const get=(id)=>document.getElementById(id);
  const nombre  = get(`edit-nombre-${idx}`)?.value.trim();
  const peso    = get(`edit-peso-${idx}`)?.value;
  const series  = get(`edit-series-${idx}`)?.value;
  const repsMin = get(`edit-rmin-${idx}`)?.value;
  const repsMax = get(`edit-rmax-${idx}`)?.value;
  const descV   = get(`edit-desc-${idx}`)?.value;
  const tempoV  = get(`edit-tempo-${idx}`)?.value.trim();
  const notasV  = get(`edit-notas-${idx}`)?.value.trim();
  const alFallo = get(`edit-fallo-${idx}`)?.checked;

  if(!nombre||!series){ showToast('Completa los campos obligatorios (nombre y series)','warning'); return; }
  if(!alFallo && (peso===''||peso===undefined||!repsMin||!repsMax)){ showToast('Completa los campos obligatorios','warning'); return; }
  if(Number(repsMin)>Number(repsMax) && !alFallo){ showToast('Reps mín no puede superar reps máx','warning'); return; }
  { const e = errorNumeros({ series, repsMin, repsMax, descanso: descV, peso, alFallo }); if (e) { showToast(e,'warning'); return; } }
  if(nombreRepetido(rutinaEditando.dias[diaEditando], nombre, idx)){ showToast(`Ya hay un ejercicio llamado "${nombre}" en este día`,'warning'); return; }

  const rm = alFallo ? (Number(repsMax)||30) : Number(repsMax);
  const musculoV = get(`edit-musculo-${idx}`)?.value || '';
  const av = leerAvanzado('edit', idx);
  if (av.error) { showToast(av.error,'warning'); return; }
  const diaObj = rutinaEditando.dias[diaEditando];
  const viejo = diaObj.ejercicios[idx];
  const nuevoPeso = alFallo ? 0 : (Number(peso)||0);
  const nuevoDescanso = descV ? Number(descV) : (viejo.descanso||descansoInteligente(rm));
  diaObj.ejercicios[idx]=aplicarAvanzado({
    ...viejo,
    nombre, peso:nuevoPeso,
    series:Number(series), repsMin:Number(repsMin), repsMax:rm,
    descanso: nuevoDescanso,
    tempo:tempoV, notas:notasV, alFallo, musculo:musculoV
  }, av.campos);
  // Los pesos/descansos guardados en la configuración tienen prioridad al entrenar:
  // se conservan al renombrar y se actualizan si el usuario los cambió aquí.
  if (nombre !== viejo.nombre) window.migrarClavesConfig?.(rutinaEditandoId, diaObj.nombre, viejo.nombre, diaObj.nombre, nombre);
  if (nuevoPeso !== (Number(viejo.peso)||0)) window.fijarPesoConfig?.(rutinaEditandoId, diaObj.nombre, nombre, nuevoPeso);
  if (descV && nuevoDescanso !== viejo.descanso) window.fijarDescansoConfig?.(rutinaEditandoId, diaObj.nombre, nombre, nuevoDescanso);
  saveRutinaUsuario(rutinaEditando,rutinaEditandoId);
  dispararCambioRutina();
  ejEditandoIdx=null;
  renderFormularioDia();
  showToast(`"${nombre}" actualizado`,'success');
};

window.migrarDescansosDia = function() {
  const dia=rutinaEditando.dias[diaEditando]; let n=0;
  dia.ejercicios.forEach(ej=>{ if(!ej.descanso){ ej.descanso=descansoInteligente(ej.repsMax); n++; } });
  if(n){ saveRutinaUsuario(rutinaEditando,rutinaEditandoId); dispararCambioRutina(); showToast(`${n} descanso(s) asignados`,'success'); renderFormularioDia(); }
};

window.añadirEjercicioADia = function() {
  const get=(id)=>document.getElementById(id)?.value;
  const nombre=get("ej-nombre")?.trim(); const pesoV=get("ej-peso"); const seriesV=get("ej-series");
  const rminV=get("ej-reps-min"); const rmaxV=get("ej-reps-max");
  const descV=get("ej-descanso"); const tempoV=get("ej-tempo")?.trim();
  const notasV=document.getElementById("ej-notas")?.value.trim();
  const alFallo=document.getElementById("ej-fallo")?.checked;
  const musculoV=document.getElementById("ej-musculo")?.value || '';
  if(!nombre||!seriesV){ showToast('Completa los campos obligatorios: nombre y series (*)','warning'); return; }
  if(!alFallo && (pesoV===''||pesoV===undefined||!rminV||!rmaxV)){ showToast('Completa todos los campos obligatorios (*)','warning'); return; }
  if(!alFallo && Number(rminV)>Number(rmaxV)){ showToast('Reps mín no puede superar reps máx','warning'); return; }
  { const e = errorNumeros({ series: seriesV, repsMin: rminV, repsMax: rmaxV, descanso: descV, peso: pesoV, alFallo }); if (e) { showToast(e,'warning'); return; } }
  if(nombreRepetido(rutinaEditando.dias[diaEditando], nombre, -1)){ showToast(`Ya hay un ejercicio llamado "${nombre}" en este día`,'warning'); return; }
  const rm = alFallo ? (Number(rmaxV)||30) : Number(rmaxV);
  const av = leerAvanzado('alta', 0);
  if (av.error) { showToast(av.error,'warning'); return; }
  rutinaEditando.dias[diaEditando].ejercicios.push(aplicarAvanzado({
    nombre, peso:alFallo?0:(Number(pesoV)||0), series:Number(seriesV),
    repsMin:Number(rminV), repsMax:rm,
    descanso:descV?Number(descV):descansoInteligente(rm),
    tempo:tempoV||'', notas:notasV||'', alFallo:alFallo||false, musculo:musculoV
  }, av.campos));
  saveRutinaUsuario(rutinaEditando,rutinaEditandoId);
  dispararCambioRutina();
  showToast(`"${nombre}" añadido`,'success');
  renderFormularioDia();
};

window.borrarEjercicio = function(idx) {
  const ej=rutinaEditando.dias[diaEditando].ejercicios[idx];
  const fn=()=>{ rutinaEditando.dias[diaEditando].ejercicios.splice(idx,1); saveRutinaUsuario(rutinaEditando,rutinaEditandoId); ejEditandoIdx=null; dispararCambioRutina(); renderFormularioDia(); };
  showConfirm(`¿Borrar "${ej.nombre}"?`, fn);
};

window.toggleTimer      = v => { rutinaEditando.dias[diaEditando].tieneTimer=v;      saveRutinaUsuario(rutinaEditando,rutinaEditandoId); dispararCambioRutina(); };
window.toggleCronometro = v => { rutinaEditando.dias[diaEditando].tieneCronometro=v; saveRutinaUsuario(rutinaEditando,rutinaEditandoId); dispararCambioRutina(); };
window.cambiarNombreDia = function() {
  const fn=(n)=>{
    const nuevo = (n||'').trim();
    const d = rutinaEditando.dias[diaEditando];
    if (!nuevo) { showToast('El nombre no puede estar vacío','warning'); return; }
    if (nuevo === d.nombre) return;
    if (nombreDiaRepetido(rutinaEditando.dias, nuevo, diaEditando)) { showToast(`Ya hay un día llamado "${nuevo}" en esta rutina`,'warning'); return; }
    window.renombrarDiaConfig?.(rutinaEditandoId, d.nombre, nuevo, d.ejercicios.map(e=>e.nombre));
    d.nombre = nuevo; saveRutinaUsuario(rutinaEditando,rutinaEditandoId); dispararCambioRutina(); renderFormularioDia(); };
  showPrompt("Nombre del día:", "", fn, rutinaEditando.dias[diaEditando].nombre);
};

// Subir un nivel: si hay entrada de historial para ese nivel se retrocede con ella (popstate llama a editorSubirNivel)
function _irListaDias()    { diaEditando=null; ejEditandoIdx=null; renderEditorRutina(); }
function _irListaRutinas() { rutinaEditando=rutinaEditandoId=diaEditando=ejEditandoIdx=null; renderListaRutinas(); }
window.volverListaDias    = () => { if (navTope()?.nivel === 'dia' && navAtras()) return; _irListaDias(); };
window.volverListaRutinas = () => {
  const n = navTope()?.nivel;
  if ((n === 'rutina' || n === 'plantillas') && navAtras()) return;
  _irListaRutinas();
};
window.editorSubirNivel = (nivel) => { if (nivel === 'dia') _irListaDias(); else _irListaRutinas(); };
window.volverMenuDesdeEditor = function() {
  navLimpiar();   // quita la entrada de historial que añadió abrirEditorRutinas
  document.querySelectorAll('section[id^="pantalla-"]').forEach(el => el.classList.add('oculto'));
  document.getElementById("menu").classList.remove("oculto");
  rutinaEditando=rutinaEditandoId=diaEditando=ejEditandoIdx=null;
  dispararCambioRutina();
};

function dispararCambioRutina() {
  window.dispatchEvent(new CustomEvent("cambio-rutina",{detail:{rutinaId:rutinaEditandoId||localStorage.getItem("rutinaActiva")}}));
}
