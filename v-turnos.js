'use strict';
// =====================================================================
//  Planner — Turnos y disponibilidad: el turno de tu pareja, tu franja
//  libre de cada día y las extraescolares. La franja sale sola (semana
//  de mañana → tarde libre; semana de tarde → mañana libre) y se puede
//  cambiar a mano un día concreto.
// =====================================================================

VISTAS.turnos = (cont) => {
  if (!UI.dMes) UI.dMes = mesDe(hoy());
  const ym = UI.dMes, H = hoy();
  const dias = [];
  for (let d = 1; d <= diasDelMes(ym); d++) dias.push(`${ym}-${pad(d)}`);
  const R = D.dispo;
  const conGoogle = typeof GG !== 'undefined' && GG.listo();

  cont.innerHTML = `<div class="pagina turnos">${cabecera('🕘 Turnos y disponibilidad', 'Cuándo tienes la mañana o la tarde libre, y las extraescolares de los niños. Las tareas de cada día te muestran su franja.',
    conGoogle ? '<button class="btn" id="tu-google">↻ Traer turnos de Google Calendar</button>' : '')}
    <div class="nav-cal"><button class="icono" id="tu-ant">‹</button><h2 class="titulo-cal">${nombreMes(ym)}</h2><button class="icono" id="tu-sig">›</button><button class="btn peq" id="tu-hoy">Este mes</button></div>
    <div class="tabla-turnos">
      <div class="fila cab"><span>Día</span><span>Turno pareja</span><span>Tu franja</span><span>Extraescolares</span><span>Notas</span></div>
      ${dias.map(f => {
        const d = R.dias[f] || {}; const t = turnoDe(f); const fr = franjaDe(f); const ex = extraDe(f); const finde = diaSemana(f) >= 5;
        return `<div class="fila ${finde ? 'finde' : ''} ${f === H ? 'hoy' : ''}" data-f="${f}">
          <span class="dia"><b>${aFecha(f).getDate()}</b> ${DIAS[diaSemana(f)].slice(0, 3)}</span>
          <span><select data-k="turno" aria-label="Turno">${[['', finde ? '—' : 'Sin turno'], ['MAÑANA', 'Mañana'], ['TARDE', 'Tarde']].map(([v, tx]) => `<option value="${v}"${v === t ? ' selected' : ''}>${tx}</option>`).join('')}${t && !['MAÑANA', 'TARDE'].includes(t) ? `<option selected>${esc(t)}</option>` : ''}</select>${d.turno === undefined && t ? '<i class="tenue" title="Sale de la rotación">↻</i>' : ''}</span>
          <span><input data-k="franja" value="${esc(d.franja || '')}" placeholder="${esc(d.franja ? '' : fr)}" list="tu-franjas" aria-label="Franja"></span>
          <span><input data-k="extra" value="${esc(d.extra !== undefined ? d.extra : '')}" placeholder="${esc(d.extra === undefined ? ex : '')}" aria-label="Extraescolares"></span>
          <span><input data-k="notas" value="${esc(d.notas || '')}" aria-label="Notas"></span>
        </div>`;
      }).join('')}
    </div>
    <datalist id="tu-franjas">${FRANJAS_OP.map(o => `<option value="${o}">`).join('')}</datalist>
    <p class="tenue">En gris, lo que sale solo; escribe encima para cambiar solo ese día. Borra lo escrito para volver a lo automático.</p>

    <section class="tarjeta reglas"><h2>Reglas</h2>
      <div class="form">
        <label class="campo medio"><span>Una semana de referencia (su lunes)</span><input type="date" id="tu-ref" value="${esc(R.rotacion.lunes || '')}"></label>
        <label class="campo medio"><span>Turno esa semana</span><select id="tu-reft"><option value="MAÑANA"${R.rotacion.turno === 'MAÑANA' ? ' selected' : ''}>Mañana</option><option value="TARDE"${R.rotacion.turno === 'TARDE' ? ' selected' : ''}>Tarde</option></select></label>
        <label class="campo medio"><span>Si tu pareja tiene turno de mañana, tú tienes…</span>${selFranja('tu-frm', R.franjas['MAÑANA'])}</label>
        <label class="campo medio"><span>Si tiene turno de tarde, tú tienes…</span>${selFranja('tu-frt', R.franjas['TARDE'])}</label>
        <label class="campo"><span>Usar las reglas a partir del</span><input type="date" id="tu-desde" value="${esc(R.reglasDesde || '')}"><small>Antes de esa fecha manda lo que hay apuntado día a día (lo que traje del Excel o de Google Calendar). Los turnos van alternando cada semana.</small></label>
      </div>
      <h4 class="sep-form">Extraescolares</h4>
      <div class="actividades">${(R.actividades || []).map((a, i) => `<div class="actividad" data-a="${i}">
        <input data-ak="que" value="${esc(a.que || '')}" placeholder="Actividad" aria-label="Actividad">
        <input data-ak="quien" value="${esc(a.quien || '')}" placeholder="Quién" list="tu-personas" aria-label="Quién">
        <span class="dias-sem">${DIAS_C.map((d, j) => `<button data-ad="${j + 1}" class="${(a.dias || []).includes(j + 1) ? 'on' : ''}">${d}</button>`).join('')}</span>
        <input data-ak="ini" type="time" value="${esc(a.ini || '')}" aria-label="Empieza"><input data-ak="fin" type="time" value="${esc(a.fin || '')}" aria-label="Acaba">
        <input data-ak="hasta" type="date" value="${esc(a.hasta || '')}" title="Hasta (opcional)" aria-label="Hasta">
        <button class="icono" data-aquitar title="Quitar">✕</button></div>`).join('')}</div>
      <datalist id="tu-personas">${D.listas.personas.map(p => `<option value="${esc(p)}">`).join('')}</datalist>
      <button class="btn peq" id="tu-addact">+ Extraescolar</button>
    </section></div>`;

  $('#tu-ant', cont).onclick = () => { UI.dMes = sumarMeses(ym, -1); guardarUI(); pintar(); };
  $('#tu-sig', cont).onclick = () => { UI.dMes = sumarMeses(ym, 1); guardarUI(); pintar(); };
  $('#tu-hoy', cont).onclick = () => { UI.dMes = mesDe(hoy()); guardarUI(); pintar(); };
  if ($('#tu-google', cont)) $('#tu-google', cont).onclick = () => GG.traerTurnos(ym);
  $$('.tabla-turnos .fila[data-f]', cont).forEach(fl => {
    const f = fl.dataset.f;
    $$('[data-k]', fl).forEach(i => i.onchange = () => {
      const d = R.dias[f] || (R.dias[f] = {});
      const v = i.value.trim();
      if (i.dataset.k === 'turno') d.turno = v; // vacío = «sin turno» explícito
      else if (i.dataset.k === 'extra') { if (v) d.extra = v; else delete d.extra; }
      else if (v) d[i.dataset.k] = v; else delete d[i.dataset.k];
      if (!Object.keys(d).length) delete R.dias[f];
      cambio();
    });
  });
  const regla = (id, fn) => { $(id, cont).onchange = (e) => { fn(e.target.value); cambio(); }; };
  regla('#tu-ref', v => { R.rotacion.lunes = v ? lunesDe(v) : ''; });
  regla('#tu-reft', v => { R.rotacion.turno = v; });
  const reglaFranja = (id, turno) => { $(id, cont).onchange = async (e) => {
    let v = e.target.value;
    if (v === '__otra') { v = await pedirTexto('Escribe tu franja', R.franjas[turno] || '', 'Por ejemplo: Solo mañana disponible'); if (v === null) return pintar(); }
    R.franjas[turno] = v; cambio(); }; };
  reglaFranja('#tu-frm', 'MAÑANA');
  reglaFranja('#tu-frt', 'TARDE');
  regla('#tu-desde', v => { R.reglasDesde = v; });
  $$('.actividad', cont).forEach(n => {
    const a = R.actividades[+n.dataset.a];
    $$('[data-ak]', n).forEach(i => i.onchange = () => { const v = i.value.trim(); if (v) a[i.dataset.ak] = v; else delete a[i.dataset.ak]; cambio(); });
    $$('[data-ad]', n).forEach(b => b.onclick = () => { const d = +b.dataset.ad; a.dias = (a.dias || []).includes(d) ? a.dias.filter(x => x !== d) : [...(a.dias || []), d].sort(); cambio(); });
    $('[data-aquitar]', n).onclick = () => { R.actividades.splice(+n.dataset.a, 1); cambio(); };
  });
  $('#tu-addact', cont).onclick = () => { R.actividades.push({ que: '', quien: '', dias: [] }); cambio(); };
};

function selFranja(id, v = '') {
  const ops = FRANJAS_OP.includes(v) || !v ? FRANJAS_OP : [v, ...FRANJAS_OP];
  return `<select id="${id}"><option value=""${!v ? ' selected' : ''}>—</option>${ops.map(o => `<option${o === v ? ' selected' : ''}>${esc(o)}</option>`).join('')}<option value="__otra">✏️ Escribir otra…</option></select>`;
}
