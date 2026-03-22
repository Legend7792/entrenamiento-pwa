import { showToast, showConfirm, showPrompt } from "./ui.js";
// editorRutinas.js
import {
  saveRutinaUsuario, loadRutinaUsuario, getAllRutinasUsuario,
  deleteRutinaUsuario, generarIdRutina, RUTINA_BASE_ID,
  restaurarRutinaBase, moverEjercicioRutina,
  duplicarRutina, exportarRutinaJSON, importarRutinaDesdeJSON
} from "./rutinaUsuario.js";
import { renderizarSelectorRutinas } from "./selectorRutinas.js";

// Escapado XSS local (misma función que app.js)
function esc(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = String(text);
  return div.innerHTML;
}

let rutinaEditando   = null;
let rutinaEditandoId = null;
let diaEditando      = null;
let ejEditandoIdx    = null;

window.abrirEditorRutinas = function () {
  history.pushState({}, '');
  ['pantalla-auth','pantalla-perfil','pantalla-dia','pantalla-historial',
   'pantalla-detalle','pantalla-medidas','pantalla-audio','pantalla-resumen',
   'pantalla-ai-import','pantalla-guia-tempo','pantalla-estadisticas',
   'pantalla-progreso','pantalla-progresion-rutina','menu'
  ].forEach(id => document.getElementById(id)?.classList.add('oculto'));
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
                <button onclick="editarRutina('${id}')">✏️ Editar</button>
                <button onclick="exportarRutina('${id}')" title="JSON">📤</button>
                ${esBase
                  ? `<button onclick="restaurarRutinaBaseBtn()" style="background:var(--warning);color:#000;" title="Restaurar">🔄</button>`
                  : `<button onclick="clonarRutina('${id}')" title="Duplicar">📋</button>
                     <button class="btn-danger" onclick="borrarRutinaCompleta('${id}')">🗑️</button>`}
              </div></div>`;
          }).join('')}
    </div>
    <div class="botones-editor-rutinas">
      <button onclick="crearNuevaRutina()">➕ Nueva rutina</button>
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

window.editarRutina = (id) => { rutinaEditandoId=id; rutinaEditando=loadRutinaUsuario(id); renderEditorRutina(); };

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

  <div class="lista-dias">
    ${rutinaEditando.dias.length===0
      ? `<p class="texto-vacio">Sin días. Añade uno abajo.</p>`
      : rutinaEditando.dias.map((d,i)=>`<div class="dia-card">
          <div class="dia-card-info"><h4>📅 ${esc(d.nombre)}</h4><p>${d.ejercicios.length} ejercicio(s)</p></div>
          <div class="acciones-dia-card">
            <button onclick="editarDia(${i})">✏️ Editar</button>
            <button class="btn-danger" onclick="borrarDia(${i})">🗑️</button>
          </div></div>`).join('')}
  </div><button onclick="añadirNuevoDia()">➕ Añadir día</button>`;
}

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
  const fn=(n)=>{ rutinaEditando.dias.push({nombre:n.trim(),ejercicios:[],tieneTimer:true,tieneCronometro:false}); saveRutinaUsuario(rutinaEditando,rutinaEditandoId); dispararCambioRutina(); renderEditorRutina(); };
  showPrompt("Nombre del día:", `Día ${rutinaEditando.dias.length+1}`, fn);
};

window.borrarDia = function(i) {
  const fn=()=>{ rutinaEditando.dias.splice(i,1); saveRutinaUsuario(rutinaEditando,rutinaEditandoId); dispararCambioRutina(); renderEditorRutina(); };
  showConfirm(`¿Borrar "${rutinaEditando.dias[i].nombre}"?`, fn);
};

window.editarDia = (i) => { diaEditando=i; ejEditandoIdx=null; renderFormularioDia(); };

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

function formatDescEj(ej) {
  const desc = ej.descanso
    ? `⏱ ${Math.floor(ej.descanso/60)}:${String(ej.descanso%60).padStart(2,'0')}`
    : `<span class="sin-descanso">⚠️ sin descanso</span>`;
  return ej.alFallo
    ? `${ej.series}×Al fallo &nbsp;${desc}${ej.tempo?` · ${esc(ej.tempo)}`:''}${ej.notas?' · 📋':''}`
    : `${ej.series}×${ej.repsMin}-${ej.repsMax} — ${ej.peso}kg &nbsp;${desc}${ej.tempo?` · ${esc(ej.tempo)}`:''}`;
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
    <h4>Ejercicios <small style="color:var(--text-secondary);font-weight:normal;">(✏️ para editar cualquiera)</small></h4>
    <div class="lista-ejercicios-editor">
      ${total===0?`<p class="texto-vacio">Sin ejercicios.</p>`:dia.ejercicios.map((ej,idx)=>`
        <div class="ejercicio-editor-card${ejEditandoIdx===idx?' editing':''}">
          <div class="orden-btns">
            <button onclick="moverEjercicioEditor(${idx},'arriba')" ${idx===0?'disabled':''}>⬆️</button>
            <button onclick="moverEjercicioEditor(${idx},'abajo')" ${idx===total-1?'disabled':''}>⬇️</button>
          </div>
          <div class="ej-editor-info">
            <strong>${esc(ej.nombre)}</strong>
            <span class="ej-editor-sub">${formatDescEj(ej)}</span>
            ${ej.notas?`<span class="ej-editor-notas">${esc(ej.notas.substring(0,65))}${ej.notas.length>65?'…':''}</span>`:''}
          </div>
          <div class="ej-editor-acciones">
            <button class="btn-icon btn-edit-ej" onclick="abrirFormEditarEj(${idx})" title="Editar">✏️</button>
            <button class="danger btn-icon" onclick="borrarEjercicio(${idx})">🗑️</button>
          </div>
        </div>
        ${ejEditandoIdx===idx?`<div class="form-edit-ejercicio" id="form-editar-${idx}">
          <h5>✏️ Editando: ${esc(ej.nombre)}</h5>
          <input id="edit-nombre-${idx}" placeholder="Nombre *" value="${esc(ej.nombre)}" />
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
          <label class="form-label">Notas técnicas</label>
          <textarea id="edit-notas-${idx}" rows="2">${esc(ej.notas||'')}</textarea>
          <label class="form-label-check"><input type="checkbox" id="edit-fallo-${idx}" ${ej.alFallo?'checked':''}> Al fallo</label>
          <div class="form-edit-btns">
            <button onclick="guardarEjercicioEditado(${idx})" class="btn-primary">💾 Guardar</button>
            <button onclick="ejEditandoIdx=null;renderFormularioDia()" class="btn-secondary">✕</button>
          </div></div>`:''}
      `).join('')}
    </div>
    <hr>
    <h4>➕ Añadir ejercicio</h4>
    <div class="form-ejercicio">
      <input id="ej-nombre" placeholder="Nombre *" />
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
      <label class="form-label">Notas técnicas</label>
      <textarea id="ej-notas" rows="2" placeholder="Indicaciones de ejecución..."></textarea>
      <label class="form-label-check"><input type="checkbox" id="ej-fallo"> Al fallo</label>
      <button onclick="añadirEjercicioADia()">➕ Añadir</button>
    </div>
    <hr>
    <button onclick="volverListaDias()" class="btn-secondary">← Volver a días</button>
  </div>`;
}

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

  const rm = alFallo ? (Number(repsMax)||30) : Number(repsMax);
  rutinaEditando.dias[diaEditando].ejercicios[idx]={
    ...rutinaEditando.dias[diaEditando].ejercicios[idx],
    nombre, peso:alFallo?0:(Number(peso)||0),
    series:Number(series), repsMin:Number(repsMin), repsMax:rm,
    descanso: descV ? Number(descV) : (rutinaEditando.dias[diaEditando].ejercicios[idx].descanso||descansoInteligente(rm)),
    tempo:tempoV, notas:notasV, alFallo
  };
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

window.moverEjercicioEditor = (idx,dir) => {
  if(moverEjercicioRutina(rutinaEditandoId,diaEditando,idx,dir)){ rutinaEditando=loadRutinaUsuario(rutinaEditandoId); ejEditandoIdx=null; renderFormularioDia(); }
};

window.añadirEjercicioADia = function() {
  const get=(id)=>document.getElementById(id)?.value;
  const nombre=get("ej-nombre")?.trim(); const pesoV=get("ej-peso"); const seriesV=get("ej-series");
  const rminV=get("ej-reps-min"); const rmaxV=get("ej-reps-max");
  const descV=get("ej-descanso"); const tempoV=get("ej-tempo")?.trim();
  const notasV=document.getElementById("ej-notas")?.value.trim();
  const alFallo=document.getElementById("ej-fallo")?.checked;
  if(!nombre||!seriesV){ showToast('Completa los campos obligatorios: nombre y series (*)','warning'); return; }
  if(!alFallo && (pesoV===''||pesoV===undefined||!rminV||!rmaxV)){ showToast('Completa todos los campos obligatorios (*)','warning'); return; }
  if(!alFallo && Number(rminV)>Number(rmaxV)){ showToast('Reps mín no puede superar reps máx','warning'); return; }
  const rm = alFallo ? (Number(rmaxV)||30) : Number(rmaxV);
  rutinaEditando.dias[diaEditando].ejercicios.push({
    nombre, peso:alFallo?0:(Number(pesoV)||0), series:Number(seriesV),
    repsMin:Number(rminV), repsMax:rm,
    descanso:descV?Number(descV):descansoInteligente(rm),
    tempo:tempoV||'', notas:notasV||'', alFallo:alFallo||false
  });
  saveRutinaUsuario(rutinaEditando,rutinaEditandoId);
  dispararCambioRutina();
  showToast(`"${nombre}" añadido`,'success');
  renderFormularioDia();
};

window.borrarEjercicio = function(idx) {
  const ej=rutinaEditando.dias[diaEditando].ejercicios[idx];
  const fn=()=>{ rutinaEditando.dias[diaEditando].ejercicios.splice(idx,1); saveRutinaUsuario(rutinaEditando,rutinaEditandoId); if(ejEditandoIdx===idx) ejEditandoIdx=null; renderFormularioDia(); };
  showConfirm(`¿Borrar "${ej.nombre}"?`, fn);
};

window.toggleTimer      = v => { rutinaEditando.dias[diaEditando].tieneTimer=v;      saveRutinaUsuario(rutinaEditando,rutinaEditandoId); };
window.toggleCronometro = v => { rutinaEditando.dias[diaEditando].tieneCronometro=v; saveRutinaUsuario(rutinaEditando,rutinaEditandoId); };
window.cambiarNombreDia = function() {
  const fn=(n)=>{ rutinaEditando.dias[diaEditando].nombre=n.trim(); saveRutinaUsuario(rutinaEditando,rutinaEditandoId); renderFormularioDia(); };
  showPrompt("Nombre del día:", "", fn, rutinaEditando.dias[diaEditando].nombre);
};

window.volverListaDias    = () => { diaEditando=null; ejEditandoIdx=null; renderEditorRutina(); };
window.volverListaRutinas = () => { rutinaEditando=rutinaEditandoId=null; renderListaRutinas(); };
window.volverMenuDesdeEditor = function() {
  ['pantalla-editor','pantalla-auth','pantalla-perfil','pantalla-dia',
   'pantalla-historial','pantalla-detalle','pantalla-medidas','pantalla-audio',
   'pantalla-resumen','pantalla-ai-import','pantalla-guia-tempo',
   'pantalla-estadisticas','pantalla-progreso','pantalla-progresion-rutina'
  ].forEach(id => document.getElementById(id)?.classList.add('oculto'));
  document.getElementById("menu").classList.remove("oculto");
  rutinaEditando=rutinaEditandoId=diaEditando=ejEditandoIdx=null;
  dispararCambioRutina();
};

function dispararCambioRutina() {
  window.dispatchEvent(new CustomEvent("cambio-rutina",{detail:{rutinaId:rutinaEditandoId||localStorage.getItem("rutinaActiva")}}));
}
