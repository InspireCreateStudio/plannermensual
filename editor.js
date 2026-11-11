'use strict';
// =====================================================================
//  Planner — fichas para crear y editar: tareas, piezas de redes,
//  eventos, ideas y objetivos. Un único constructor de formularios.
// =====================================================================

// campos: [{k, t, tipo: texto|area|fecha|hora|select|num|check|lista, op, ancho: 'medio'|'tercio', ph, ayuda}]
function formulario(obj, campos) {
  return `<div class="form">${campos.map(c => {
    if (c.tipo === 'sep') return `<h4 class="sep-form">${esc(c.t)}</h4>`;
    if (c.tipo === 'pasos') return `<div class="campo pasos-ed" data-k="${c.k}"><span>${esc(c.t)}</span><ul>${(obj[c.k] || []).map(p => filaPasoEd(p)).join('')}</ul>
      <input class="nuevo-paso" placeholder="Añadir una tarea y pulsar Enter"></div>`;
    const v = obj[c.k] ?? '';
    const id = 'f-' + c.k;
    const cl = `campo ${c.ancho || ''}`;
    let input;
    if (c.tipo === 'area') input = `<textarea id="${id}" data-k="${c.k}" rows="${c.filas || 3}" placeholder="${esc(c.ph || '')}">${esc(v)}</textarea>`;
    else if (c.tipo === 'select') {
      const ops = [...(c.op || [])];
      if (v && !ops.includes(v)) ops.unshift(v);
      input = `<select id="${id}" data-k="${c.k}">${c.vacio !== false ? '<option value=""></option>' : ''}${ops.map(o => `<option${o === v ? ' selected' : ''}>${esc(o)}</option>`).join('')}</select>`;
    } else if (c.tipo === 'check') return `<label class="${cl} check"><input type="checkbox" id="${id}" data-k="${c.k}"${v ? ' checked' : ''}><span>${esc(c.t)}</span></label>`;
    else if (c.tipo === 'lista') input = `<input id="${id}" data-k="${c.k}" value="${esc(v)}" list="${id}-l" placeholder="${esc(c.ph || '')}"><datalist id="${id}-l">${(c.op || []).map(o => `<option value="${esc(o)}">`).join('')}</datalist>`;
    else input = `<input id="${id}" data-k="${c.k}" type="${{ fecha: 'date', hora: 'time', num: 'number' }[c.tipo] || 'text'}"${c.tipo === 'num' ? ' step="any" inputmode="decimal"' : ''} value="${esc(v)}" placeholder="${esc(c.ph || '')}"${c.k === 'tarea' || c.k === 'titulo' || c.k === 'texto' ? ' autofocus' : ''}>`;
    return `<label class="${cl}"><span>${esc(c.t)}</span>${input}${c.ayuda ? `<small>${c.ayuda}</small>` : ''}</label>`;
  }).join('')}</div>`;
}
const filaPasoEd = (p) => `<li data-id="${esc(p.id || uid())}"><input type="checkbox"${p.hecho ? ' checked' : ''} aria-label="Hecho"><input class="texto-paso" value="${esc(p.t)}"><button type="button" class="icono" data-mover-paso="-1" title="Subir">↑</button><button type="button" class="icono" data-mover-paso="1" title="Bajar">↓</button><button type="button" class="icono" data-quitar-paso title="Quitar">✕</button></li>`;
function enlazarPasosEd(m) {
  $$('.pasos-ed', m).forEach(ed => {
    const ul = $('ul', ed), nuevo = $('.nuevo-paso', ed);
    nuevo.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter') return;
      e.preventDefault(); e.stopPropagation();
      const t = nuevo.value.trim(); if (!t) return;
      ul.insertAdjacentHTML('beforeend', filaPasoEd({ id: uid(), t, hecho: false })); nuevo.value = '';
    });
    ul.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.classList.contains('texto-paso')) { e.preventDefault(); e.stopPropagation(); nuevo.focus(); } });
    ul.addEventListener('click', (e) => {
      const b = e.target.closest('[data-quitar-paso]'); if (b) { b.closest('li').remove(); return; }
      const mv = e.target.closest('[data-mover-paso]'); if (!mv) return;
      const li = mv.closest('li');
      if (mv.dataset.moverPaso === '-1' && li.previousElementSibling) li.parentNode.insertBefore(li, li.previousElementSibling);
      if (mv.dataset.moverPaso === '1' && li.nextElementSibling) li.parentNode.insertBefore(li.nextElementSibling, li);
    });
  });
}
function leerFormulario(m, campos, obj) {
  campos.forEach(c => {
    if (!c.k) return;
    if (c.tipo === 'pasos') {
      const ed = $(`.pasos-ed[data-k="${c.k}"]`, m); if (!ed) return;
      const pend = $('.nuevo-paso', ed).value.trim();
      const pasos = $$('li', ed).map(li => ({ id: li.dataset.id, t: $('.texto-paso', li).value.trim(), hecho: $('input[type=checkbox]', li).checked })).filter(p => p.t);
      if (pend) pasos.push({ id: uid(), t: pend, hecho: false });
      if (pasos.length) obj[c.k] = pasos; else delete obj[c.k];
      return;
    }
    const i = $(`[data-k="${c.k}"]`, m); if (!i) return;
    let v = c.tipo === 'check' ? i.checked : i.value;
    if (c.tipo === 'num') v = v === '' ? '' : Number(v);
    if (typeof v === 'string') v = v.trim();
    if (v === '' || v === false) delete obj[c.k]; else obj[c.k] = v;
  });
  return obj;
}
// Ficha genérica: título, campos y botones (Guardar, Borrar, extras)
function ficha({ titulo, obj, campos, onGuardar, onBorrar, extras = [], clase = '' }) {
  const copia = JSON.parse(JSON.stringify(obj));
  modal(`<h3>${titulo}</h3>${formulario(copia, campos)}
    <div class="pie">${onBorrar ? '<button class="btn peligro-suave" id="fi-borrar">Borrar</button>' : ''}<span class="hueco"></span>
    ${extras.map((x, i) => `<button class="btn" data-extra="${i}">${x.t}</button>`).join('')}
    <button class="btn" data-cerrar>Cancelar</button><button class="btn prim" id="fi-ok">Guardar</button></div>`, {
    clase: 'ficha ' + clase,
    alAbrir: (m, cerrar) => {
      const ok = () => { const r = leerFormulario(m, campos, copia); if (onGuardar(r) !== false) cerrar(); };
      $('#fi-ok', m).onclick = ok;
      m.addEventListener('keydown', (e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) ok(); if (e.key === 'Enter' && e.target.tagName === 'INPUT' && e.target.type !== 'checkbox') { e.preventDefault(); ok(); } });
      if (onBorrar) $('#fi-borrar', m).onclick = async () => { if (await onBorrar()) cerrar(); };
      $$('[data-extra]', m).forEach(b => b.onclick = () => { const r = leerFormulario(m, campos, copia); extras[+b.dataset.extra].fn(r, cerrar, m); });
      enlazarPasosEd(m);
      campos.forEach(c => { if (c.alCambiar) { const i = $(`[data-k="${c.k}"]`, m); if (i) i.addEventListener('change', () => c.alCambiar(i.value, m)); } });
    }
  });
}

// ---------- tareas ----------
function camposTarea(cat) {
  const C = catDe(cat);
  const base = [
    { k: 'tarea', t: 'Tarea', tipo: 'texto' },
    { k: 'cat', t: 'Categoría', tipo: 'select', op: [...catsVisibles(cat).map(k => CATS[k].e + ' ' + CATS[k].n), CAT_REDES.e + ' ' + CAT_REDES.n], vacio: false, ancho: 'medio' },
    { k: 'fecha', t: 'Fecha', tipo: 'fecha', ancho: 'medio' },
  ];
  if (C.detalle) base.push({ k: 'detalle', t: C.detalle, tipo: 'texto', ph: 'p. ej. 09:30–14:00 · Edición caps. 10-18' });
  if (cat !== 'newsletter') base.push({ k: 'hora', t: 'Hora', tipo: 'hora', ancho: 'tercio' });
  base.push(
    { k: 'estado', t: 'Estado', tipo: 'select', op: estadosDe(cat), vacio: false, ancho: cat === 'newsletter' ? 'tercio' : 'tercio' },
    { k: 'prioridad', t: 'Prioridad', tipo: 'select', op: D.listas.prioridad, ancho: 'tercio' },
    { k: 'energia', t: 'Energía', tipo: 'select', op: D.listas.energia, ancho: 'tercio' },
  );
  if (C.persona) base.push({ k: 'persona', t: 'Persona', tipo: 'select', op: D.listas.personas, ancho: 'medio' });
  if (cat === 'newsletter') base.push(
    { k: 'hora', t: 'Hora', tipo: 'hora', ancho: 'tercio' },
    { k: 'canal', t: 'Canal', tipo: 'select', op: ['✉️ Newsletter', '📝 Blog'], ancho: 'tercio' },
    { k: 'tema', t: 'Tema / gancho', tipo: 'texto' },
    { k: 'idea', t: 'Idea clave', tipo: 'area', filas: 2 },
    { tipo: 'sep', t: 'Newsletter' },
    { k: 'asunto', t: 'Asunto', tipo: 'texto' },
    { k: 'segmento', t: 'Segmento', tipo: 'select', op: D.listas.segmentos, ancho: 'tercio' },
    { k: 'tipo', t: 'Tipo', tipo: 'select', op: D.listas.tiposNews, ancho: 'tercio' },
    { k: 'libro', t: 'Libro', tipo: 'lista', op: D.listas.librosNews, ancho: 'tercio' },
    { k: 'automatizacion', t: 'Automatización', tipo: 'texto', ancho: 'medio' },
    { k: 'destinatarios', t: 'Destinatarios', tipo: 'num', ancho: 'medio' },
    { tipo: 'sep', t: 'Resultados' },
    { k: 'apertura', t: 'Apertura %', tipo: 'num', ancho: 'tercio' },
    { k: 'clics', t: 'Clics', tipo: 'num', ancho: 'tercio' },
    { k: 'bajas', t: 'Bajas', tipo: 'num', ancho: 'tercio' },
    { k: 'ventas', t: 'Ventas atribuidas', tipo: 'num', ancho: 'medio' },
    { k: 'ingresos', t: 'Ingresos (€)', tipo: 'num', ancho: 'medio' },
    { tipo: 'sep', t: 'Blog' },
    { k: 'url', t: 'URL del post', tipo: 'texto', ancho: 'medio' },
    { k: 'seo', t: 'Palabra clave SEO', tipo: 'texto', ancho: 'medio' },
  );
  base.push({ k: 'repetir', t: '🔁 Repetir', tipo: 'select', op: REPETIR, ancho: 'medio' }, { k: 'aviso', t: '🔔 Avisarme', tipo: 'select', op: AVISOS, ancho: 'medio' });
  base.push({ k: 'pasos', t: 'Tareas', tipo: 'pasos' });
  base.push({ k: 'notas', t: 'Notas', tipo: 'area', filas: 2 });
  return base;
}
const catPorEtiqueta = (s) => (s === 'redes' || s === CAT_REDES.e + ' ' + CAT_REDES.n) ? 'redes' : Object.keys(CATS).find(k => s === CATS[k].e + ' ' + CATS[k].n || s === k) || 'novela';
function editarTarea(t, { nueva = false } = {}) {
  const obj = { ...t, cat: catDe(t.cat).e + ' ' + catDe(t.cat).n };
  if (nueva) { if (!obj.estado) obj.estado = estadoInicial(t.cat); if (!obj.energia && catDe(t.cat).energia) obj.energia = catDe(t.cat).energia; }
  const campos = camposTarea(t.cat);
  campos[1].alCambiar = (v, m) => {
    // Al cambiar de categoría, rehace la ficha con sus campos
    const parcial = leerFormulario(m, campos, { ...obj });
    const cat = catPorEtiqueta(v);
    if (!estadosDe(cat).includes(parcial.estado)) parcial.estado = estadoInicial(cat);
    m.closest('.velo').remove();
    editarTarea({ ...t, ...parcial, cat }, { nueva });
  };
  ficha({
    titulo: nueva ? 'Nueva tarea' : 'Tarea',
    obj, campos,
    onGuardar: (r) => {
      if (!r.tarea) { aviso('Escribe la tarea'); return false; }
      r.cat = catPorEtiqueta(r.cat);
      const fin = { ...r, id: t.id || uid() };
      const ahoraHecha = esHecho(fin.estado) && !esHecho(t.estado || '');
      if (nueva) D.tareas.push(fin);
      else { const i = D.tareas.findIndex(x => x.id === t.id); if (i >= 0) D.tareas[i] = fin; else D.tareas.push(fin); }
      if (ahoraHecha) avisoRepeticion(repetirTarea(fin));
      cambio();
      if (nueva) aviso(`Apuntada en ${catDe(fin.cat).n}${fin.fecha ? ' · ' + fechaCorta(fin.fecha) : ''}`);
    },
    onBorrar: nueva ? null : async () => { borrarConDeshacer('tareas', t.id, 'Tarea borrada'); return true; },
    extras: nueva ? [] : [
      { t: '📅 Posponer', fn: async (r, cerrar) => { const f = await pedirFecha('¿A qué día la pasas?', r.fecha); if (!f) return; cerrar(); const o = D.tareas.find(x => x.id === t.id); if (o && r.tarea) { Object.keys(o).forEach(k => { if (k !== 'id') delete o[k]; }); Object.assign(o, r, { cat: catPorEtiqueta(r.cat) }); } posponerTarea(t.id, f); } },
      { t: 'Duplicar', fn: (r, cerrar) => { cerrar(); editarTarea({ ...r, siguiente: undefined, cat: catPorEtiqueta(r.cat), id: null, estado: estadoInicial(catPorEtiqueta(r.cat)) }, { nueva: true }); } }],
  });
}
function posponerTarea(id, f) {
  const t = D.tareas.find(x => x.id === id); if (!t) return;
  const antes = t.fecha; t.fecha = f; cambio();
  aviso(`Pasada al ${fechaLarga(f).toLowerCase()}`, { t: 'Deshacer', fn: () => { t.fecha = antes; cambio(); } });
}
// Saca una de las tareas de dentro y la apunta sola en otro día
function posponerPaso(t, i, f) {
  const [p] = t.pasos.splice(i, 1); if (!t.pasos.length) delete t.pasos;
  const nueva = { id: uid(), tarea: p.t, cat: t.cat, fecha: f, prioridad: t.prioridad, energia: t.energia, estado: estadoInicial(t.cat), notas: `Venía de «${t.tarea}»` };
  D.tareas.push(nueva); cambio();
  aviso(`«${p.t}» pasa al ${fechaLarga(f).toLowerCase()}`, { t: 'Deshacer', fn: () => { D.tareas = D.tareas.filter(x => x.id !== nueva.id); (t.pasos || (t.pasos = [])).splice(i, 0, p); cambio(); } });
}
function nuevaTarea(pre = {}) {
  const cat = pre.cat || UI.ultimaCat || 'novela';
  editarTarea({ fecha: hoy(), prioridad: '🟠Media', ...pre, cat }, { nueva: true });
}
function borrarConDeshacer(lista, id, texto) {
  const i = D[lista].findIndex(o => o.id === id); if (i < 0) return;
  const [o] = D[lista].splice(i, 1);
  cambio();
  aviso(texto, { t: 'Deshacer', fn: () => { D[lista].splice(i, 0, o); cambio(); } });
}

// ---------- piezas de redes ----------
function editarPieza(b, { nueva = false } = {}) {
  const ideas = D.ideas.map(i => `${i.n} · ${i.tema}`);
  const obj = { ...b, ideaTxt: ideaDe(b) ? `${ideaDe(b).n} · ${ideaDe(b).tema}` : '' };
  const campos = [
    { k: 'ideaTxt', t: 'Idea del banco', tipo: 'lista', op: ideas, ph: 'Elige una idea o escribe el tema abajo' },
    { k: 'tema', t: 'Tema (si no viene del banco)', tipo: 'texto', ancho: 'medio' },
    { k: 'fecha', t: 'Fecha de publicación', tipo: 'fecha', ancho: 'medio' },
    { k: 'formato', t: 'Formato', tipo: 'select', op: D.listas.formatos, ancho: 'tercio' },
    { k: 'donde', t: 'Dónde', tipo: 'select', op: D.listas.donde, ancho: 'tercio' },
    { k: 'prioridad', t: 'Prioridad', tipo: 'select', op: D.listas.prioridad, ancho: 'tercio' },
    { k: 'gancho', t: 'Gancho', tipo: 'texto', ph: (ideaDe(b) || {}).gancho || '' },
    { k: 'guion', t: 'Guion / texto de slides', tipo: 'area', filas: 4 },
    { k: 'caption', t: 'Caption', tipo: 'area', filas: 3 },
    { k: 'cta', t: 'CTA', tipo: 'texto', ancho: 'medio' },
    { k: 'audio', t: 'Audio', tipo: 'texto', ancho: 'medio' },
    { k: 'hashtags', t: 'Hashtags', tipo: 'area', filas: 2 },
    { tipo: 'sep', t: 'Hecho' },
    ...PASOS_PIEZA.map(([k, t]) => ({ k, t, tipo: 'check', ancho: 'tercio' })),
    { k: 'notas', t: 'Notas', tipo: 'area', filas: 2 },
  ];
  ficha({
    titulo: nueva ? 'Nueva pieza' : 'Pieza de redes', obj, campos, clase: 'ancha',
    onGuardar: (r) => {
      const m = String(r.ideaTxt || '').match(/^(\d+)\s*·/);
      r.idea = m ? Number(m[1]) : '';
      delete r.ideaTxt;
      if (r.idea && !r.gancho) delete r.gancho;
      if (!r.idea && !r.tema) { aviso('Elige una idea o escribe un tema'); return false; }
      const fin = { ...r, id: b.id || uid() };
      if (nueva) D.batch.push(fin); else { const i = D.batch.findIndex(x => x.id === b.id); D.batch[i] = fin; }
      cambio();
    },
    onBorrar: nueva ? null : async () => { borrarConDeshacer('batch', b.id, 'Pieza borrada'); return true; },
  });
}
function editarIdea(i, { nueva = false } = {}) {
  const campos = [
    { k: 'tema', t: 'Tema', tipo: 'texto' },
    { k: 'pilar', t: 'Pilar', tipo: 'select', op: D.listas.pilares, ancho: 'tercio' },
    { k: 'objetivo', t: 'Objetivo', tipo: 'select', op: D.listas.objetivosRRSS, ancho: 'tercio' },
    { k: 'formato', t: 'Formato', tipo: 'select', op: D.listas.formatos, ancho: 'tercio' },
    { k: 'gancho', t: 'Gancho de apertura', tipo: 'texto' },
    { k: 'porque', t: 'Por qué le importa a mi lectora', tipo: 'area', filas: 2 },
    { k: 'enfoque', t: 'Mi enfoque único', tipo: 'area', filas: 2 },
  ];
  ficha({
    titulo: nueva ? 'Nueva idea' : `Idea nº ${i.n}`, obj: i, campos,
    onGuardar: (r) => {
      if (!r.tema) { aviso('Escribe el tema'); return false; }
      if (nueva) D.ideas.push({ ...r, id: uid(), n: Math.max(0, ...D.ideas.map(x => Number(x.n) || 0)) + 1 });
      else Object.assign(D.ideas.find(x => x.id === i.id), r, { id: i.id, n: i.n });
      cambio();
    },
    onBorrar: nueva ? null : async () => {
      if (D.batch.some(b => String(b.idea) === String(i.n)) && !(await preguntar('Esta idea está en el batch', 'Las piezas que la usan se quedarán sin tema. ¿Borrarla igualmente?', 'Borrar', true))) return false;
      borrarConDeshacer('ideas', i.id, 'Idea borrada'); return true;
    },
    extras: nueva ? [] : [{ t: 'Pasar al batch', fn: (r, cerrar) => { cerrar(); editarPieza({ idea: i.n, formato: i.formato, donde: 'Instagram', prioridad: '🟠Media', fecha: '' }, { nueva: true }); } }],
  });
}

// ---------- eventos ----------
function editarEvento(e, { nueva = false } = {}) {
  const campos = [
    { k: 'titulo', t: 'Evento', tipo: 'texto' },
    { k: 'cal', t: 'Calendario', tipo: 'select', op: D.calendarios.map(c => c.nombre), ancho: 'medio' },
    { k: 'tipo', t: 'Tipo', tipo: 'select', op: ['Puntual', 'Recurrente'], vacio: false, ancho: 'medio' },
    { k: 'fecha', t: 'Fecha', tipo: 'fecha', ancho: 'tercio' },
    { k: 'hasta', t: 'Hasta (si dura varios días)', tipo: 'fecha', ancho: 'tercio' },
    { k: 'hora', t: 'Hora o patrón', tipo: 'texto', ph: '17:30 · Todo el día · Martes y jueves 17:45', ancho: 'tercio' },
    { k: 'estado', t: 'Estado', tipo: 'select', op: D.listas.estados.eventos, ancho: 'medio' },
    { k: 'mantener', t: 'Mostrar en Inicio y calendario', tipo: 'select', op: ['Sí', 'No', 'Pendiente'], vacio: false, ancho: 'medio' },
    { k: 'notas', t: 'Notas', tipo: 'area', filas: 2 },
  ];
  const conG = typeof GG !== 'undefined' && GG.listo() && (GG.puedeEscribir() || /^g:/.test(e.gcalId || ''));
  if (conG) campos.push({ k: 'enGoogle', t: /^g:/.test(e.gcalId || '') ? 'Cambiar también en Google Calendar' : 'Guardar también en Google Calendar', tipo: 'check' });
  const obj = { mantener: 'Sí', tipo: 'Puntual', ...e };
  if (conG) obj.enGoogle = /^g:/.test(e.gcalId || '') ? true : nueva;
  ficha({
    titulo: nueva ? 'Nuevo evento' : 'Evento', obj, campos,
    onGuardar: (r) => {
      if (!r.titulo) { aviso('Escribe el evento'); return false; }
      const aGoogle = !!r.enGoogle; delete r.enGoogle;
      const fin = { ...e, ...r, id: e.id || uid() }; delete fin.enGoogle;
      ['hasta', 'notas', 'estado', 'hora', 'fecha'].forEach(k => { if (!(k in r)) delete fin[k]; });
      if (fin.gcalId) fin.tocado = true;
      if (aGoogle) setTimeout(() => GG.guardarEvento(fin), 0);
      if (nueva) D.eventos.push(fin); else { const i = D.eventos.findIndex(x => x.id === e.id); D.eventos[i] = fin; }
      cambio();
    },
    onBorrar: nueva ? null : async () => {
      if (/^g:/.test(e.gcalId || '') && typeof GG !== 'undefined' && GG.listo() && await preguntar('¿Borrarlo también de Google Calendar?', 'Si pulsas Cancelar lo borro solo de aquí (y volverá a aparecer la próxima vez que traiga los eventos de Google).', 'Borrar de los dos sitios', true)) GG.borrarEvento(e);
      borrarConDeshacer('eventos', e.id, 'Evento borrado'); return true;
    },
  });
}

// ---------- objetivos ----------
const PERIODOS_OBJ = [['mes', 'Mensual'], ['trimestre', 'Trimestral'], ['año', 'Anual']];
const TRIMESTRES = ['1.º trimestre (ene–mar)', '2.º trimestre (abr–jun)', '3.º trimestre (jul–sep)', '4.º trimestre (oct–dic)'];
const periodoObj = (o) => o.periodo || 'mes';
function editarObjetivo(o, { nueva = false } = {}) {
  const anios = [];
  for (let y = new Date().getFullYear() - 1; y <= new Date().getFullYear() + 3; y++) anios.push(String(y));
  const mesBase = o.mes || (o.trimestre ? (o.trimestre - 1) * 3 + 1 : new Date().getMonth() + 1);
  const obj = { ...o, tipoTxt: PERIODOS_OBJ.find(p => p[0] === periodoObj(o))[1], mesTxt: may(MESES[mesBase - 1]), triTxt: TRIMESTRES[(o.trimestre || Math.ceil(mesBase / 3)) - 1], anio: String(o.anio || '') };
  // Según el tipo, se ve el mes, el trimestre o ninguno
  const ver = (v, m) => {
    const p = (PERIODOS_OBJ.find(x => x[1] === v) || PERIODOS_OBJ[0])[0];
    [['mesTxt', p === 'mes'], ['triTxt', p === 'trimestre']].forEach(([k, si]) => { const c = $(`[data-k="${k}"]`, m); if (c) c.closest('.campo').style.display = si ? '' : 'none'; });
  };
  const campos = [
    { k: 'texto', t: 'Objetivo', tipo: 'texto' },
    { k: 'cat', t: 'Categoría', tipo: 'select', op: D.listas.catObjetivos, ancho: 'medio' },
    { k: 'estado', t: 'Estado', tipo: 'select', op: D.listas.estados.objetivos, vacio: false, ancho: 'medio' },
    { k: 'tipoTxt', t: 'Tipo', tipo: 'select', op: PERIODOS_OBJ.map(p => p[1]), vacio: false, ancho: 'medio', alCambiar: ver },
    { k: 'anio', t: 'Año', tipo: 'select', op: anios, vacio: false, ancho: 'medio' },
    { k: 'mesTxt', t: 'Mes', tipo: 'select', op: MESES.map(may), vacio: false, ancho: 'medio' },
    { k: 'triTxt', t: 'Trimestre', tipo: 'select', op: TRIMESTRES, vacio: false, ancho: 'medio' },
  ];
  const leer = (r) => {
    const per = (PERIODOS_OBJ.find(x => x[1] === r.tipoTxt) || PERIODOS_OBJ[0])[0];
    const fin = { id: o.id || uid(), texto: r.texto, cat: r.cat || '', estado: r.estado, periodo: per, anio: Number(r.anio) };
    if (per === 'mes') fin.mes = MESES.indexOf((r.mesTxt || '').toLowerCase()) + 1;
    if (per === 'trimestre') fin.trimestre = TRIMESTRES.indexOf(r.triTxt) + 1;
    return fin;
  };
  ficha({
    titulo: nueva ? 'Nuevo objetivo' : 'Objetivo', obj, campos,
    onGuardar: (r) => {
      if (!r.texto) { aviso('Escribe el objetivo'); return false; }
      const fin = leer(r);
      if (nueva) D.objetivos.push(fin); else { const i = D.objetivos.findIndex(x => x.id === o.id); D.objetivos[i] = fin; }
      cambio();
    },
    onBorrar: nueva ? null : async () => { borrarConDeshacer('objetivos', o.id, 'Objetivo borrado'); return true; },
    extras: nueva ? [] : [{ t: 'Repetir en el siguiente', fn: (r, cerrar) => {
      const f = leer(r); const n = { ...f, id: uid(), estado: D.listas.estados.objetivos[0] };
      if (f.periodo === 'mes') { n.mes = f.mes === 12 ? 1 : f.mes + 1; n.anio = f.mes === 12 ? f.anio + 1 : f.anio; }
      else if (f.periodo === 'trimestre') { n.trimestre = f.trimestre === 4 ? 1 : f.trimestre + 1; n.anio = f.trimestre === 4 ? f.anio + 1 : f.anio; }
      else n.anio = f.anio + 1;
      D.objetivos.push(n); cambio(); cerrar();
      aviso(f.periodo === 'mes' ? 'Copiado al mes siguiente' : f.periodo === 'trimestre' ? 'Copiado al trimestre siguiente' : 'Copiado al año siguiente');
    } }],
  });
  const m = document.body.lastElementChild; const s = $('[data-k="tipoTxt"]', m); if (s) ver(s.value, m);
}

// Abre la ficha que toque para un elemento de la lista común
function abrirElemento(x) {
  if (x.tipo === 'pieza') editarPieza(x.ref);
  else if (x.tipo === 'evento') editarEvento(x.ref);
  else if (x.tipo === 'trabajo') editarTrabajo(x.ref);
  else editarTarea(x.ref);
}

// ---------- fila de un elemento (Inicio, Calendario, Tareas) ----------
function chipCat(cat, corto = false) {
  const c = catDe(cat);
  return `<span class="chip-cat" style="--c:${c.color}">${c.e}${corto ? '' : ' ' + esc(c.n)}</span>`;
}
function filaElemento(x, { fecha = true, franja = false, plazoVis = true, notas = false } = {}) {
  const hecho = esHecho(x.estado), anul = esAnulada(x.estado);
  const p = x.tipo === 'evento' && x.fecha < hoy() ? { t: '', c: '' } : plazo(x.fecha, x.estado);
  const fr = franja && x.fecha ? franjaDe(x.fecha) : '';
  return `<div class="item ${hecho ? 'hecho' : ''} ${anul ? 'anulada' : ''} ${p.c}" data-tipo="${x.tipo}" data-id="${x.id}" style="--c:${catDe(x.cat).color}" ${x.tipo !== 'evento' ? 'draggable="true"' : ''}>
    <button class="check" data-check title="${hecho ? 'Marcar como pendiente' : 'Marcar como hecha'}" aria-label="Hecha">${hecho ? '✓' : ''}</button>
    <div class="cuerpo">
      <div class="t1">${x.punto ? `<span class="punto">${x.punto}</span>` : ''}${x.hora ? `<span class="hora">${esc(x.hora)}</span>` : ''}${esc(x.titulo) || '<i class="tenue">sin título</i>'}</div>
      <div class="t2">${chipCat(x.cat, true)}${fecha && x.fecha ? `<span>${fechaCorta(x.fecha)}</span>` : ''}${x.sub ? `<span>${esc(x.sub)}</span>` : ''}${x.estado && !hecho ? `<span>${esc(x.estado)}</span>` : ''}${fr ? `<span>${iconoFranja(fr)} ${esc(fr)}</span>` : ''}${x.ref && x.ref.repetir ? `<span title="${esc(x.ref.repetir)}">🔁</span>` : ''}${x.ref && x.ref.aviso && !hecho ? `<span title="Aviso: ${esc(x.ref.aviso)}">🔔</span>` : ''}${notas && x.notas ? `<span class="tenue">${esc(x.notas)}</span>` : ''}${pasosChip(x)}</div>
      ${pasosAbiertos(x)}
    </div>
    <div class="lado">${x.prioridad && /Alta/.test(x.prioridad) && !hecho ? '<span class="prio" title="Prioridad alta">!</span>' : ''}${plazoVis && p.t && p.c !== 'hecho' ? `<span class="plazo ${p.c}">${p.t}</span>` : ''}${x.energia && /Baja/.test(x.energia) && !hecho ? '<span title="Energía baja">🪫</span>' : ''}</div>
  </div>`;
}
// Subtareas: «☑ 2/5» y, al tocarlo, la lista para ir marcando
const ABIERTOS = new Set();
function pasosChip(x) {
  const ps = (x.ref && x.ref.pasos) || []; if (!ps.length) return '';
  const h = ps.filter(p => p.hecho).length;
  return `<button class="pasos-chip ${h === ps.length ? 'completo' : ''}" data-pasos title="Ver las tareas">☑ ${h}/${ps.length}</button>`;
}
function pasosAbiertos(x) {
  const ps = (x.ref && x.ref.pasos) || [];
  if (!ps.length || !ABIERTOS.has(x.id)) return '';
  return `<ul class="pasos-lista">${ps.map((p, i) => `<li class="${p.hecho ? 'hecho' : ''}"><label><input type="checkbox" data-paso="${i}"${p.hecho ? ' checked' : ''}> <span>${esc(p.t)}</span></label><span class="acc-paso">${i ? `<button data-pmov="${i}" data-dir="-1" title="Subir">↑</button>` : ''}${i < ps.length - 1 ? `<button data-pmov="${i}" data-dir="1" title="Bajar">↓</button>` : ''}${x.tipo === 'tarea' && !p.hecho ? `<button data-ppos="${i}" title="Pasar a otro día">📅</button>` : ''}</span></li>`).join('')}</ul>`;
}
// Clic en la casilla → hecho; clic en el resto → abrir ficha
function enlazarItems(cont, lista) {
  const porClave = new Map(lista.map(x => [x.tipo + ':' + x.id, x]));
  cont.onclick = cont.onclick || null;
  $$('.item[data-id]', cont).forEach(n => {
    const x = porClave.get(n.dataset.tipo + ':' + n.dataset.id); if (!x) return;
    n.onclick = (e) => {
      if (e.target.closest('[data-pasos]')) { e.stopPropagation(); ABIERTOS.has(x.id) ? ABIERTOS.delete(x.id) : ABIERTOS.add(x.id); pintar(); return; }
      const cp = e.target.closest('[data-paso]');
      if (cp) {
        e.stopPropagation();
        const p = x.ref.pasos[+cp.dataset.paso]; p.hecho = cp.checked; cambio();
        if (x.ref.pasos.every(q => q.hecho) && !esHecho(x.ref.estado)) aviso('Todas las tareas hechas', { t: 'Marcar tarea hecha', fn: () => alternarHecho(x) });
        return;
      }
      const pm = e.target.closest('[data-pmov]');
      if (pm) {
        e.stopPropagation(); const i = +pm.dataset.pmov, j = i + +pm.dataset.dir, ps = x.ref.pasos;
        if (j >= 0 && j < ps.length) { [ps[i], ps[j]] = [ps[j], ps[i]]; cambio(); }
        return;
      }
      const pp = e.target.closest('[data-ppos]');
      if (pp) { e.stopPropagation(); pedirFecha(`¿A qué día pasas «${x.ref.pasos[+pp.dataset.ppos].t}»?`, x.ref.fecha).then(f => { if (f) posponerPaso(x.ref, +pp.dataset.ppos, f); }); return; }
      if (e.target.closest('.pasos-lista')) { e.stopPropagation(); return; }
      if (e.target.closest('[data-check]')) {
        e.stopPropagation();
        const ahora = alternarHecho(x);
        if (!ahora) aviso('¡Hecho!', { t: 'Deshacer', fn: () => alternarHecho({ ...x, ref: x.ref }) });
        return;
      }
      abrirElemento(x);
    };
    n.ondragstart = (e) => { e.dataTransfer.setData('text/plain', n.dataset.tipo + ':' + n.dataset.id); e.dataTransfer.effectAllowed = 'move'; n.classList.add('arrastrando'); };
    n.ondragend = () => n.classList.remove('arrastrando');
  });
}
