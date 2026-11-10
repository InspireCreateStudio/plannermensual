'use strict';
// =====================================================================
//  Planner — Eventos y citas: lo que viene de tus calendarios (médicos,
//  familia, colegio, club, eventos de autora…). Se pueden traer de
//  Google Calendar o apuntar a mano.
// =====================================================================

VISTAS.eventos = (cont) => {
  const H = hoy();
  const ver = UI.eVer || 'proximos';
  const ocultos = new Set(UI.eOcultos || []);
  const puntuales = D.eventos.filter(e => e.tipo !== 'Recurrente' && !ocultos.has(e.cal || ''));
  const lista = puntuales.filter(e => ver === 'pasados' ? (e.hasta || e.fecha || '') < H : ver === 'todos' ? true : !e.fecha || (e.hasta || e.fecha) >= H)
    .sort((a, b) => (a.fecha || '9999').localeCompare(b.fecha || '9999') * (ver === 'pasados' ? -1 : 1) || (a.hora || '').localeCompare(b.hora || ''));
  const recurrentes = D.eventos.filter(e => e.tipo === 'Recurrente' && !ocultos.has(e.cal || ''));
  const grupos = new Map();
  lista.forEach(e => { const k = e.fecha ? mesDe(e.fecha) : ''; if (!grupos.has(k)) grupos.set(k, []); grupos.get(k).push(e); });
  // Solo los calendarios que tienen algún evento; los demás, con «+ N sin eventos»
  const usos = new Map(); D.eventos.forEach(e => { if (e.cal) usos.set(e.cal, (usos.get(e.cal) || 0) + 1); });
  const todosCals = [...new Set([...D.calendarios.map(c => c.nombre), ...usos.keys()])];
  const sinUso = todosCals.filter(c => !usos.has(c));
  const cals = UI.eTodosCals ? todosCals : todosCals.filter(c => usos.has(c));
  const conGoogle = typeof GG !== 'undefined' && GG.listo();

  const fila = (e) => `<div class="evento ${esHecho(e.estado) ? 'hecho' : ''} ${esAnulada(e.estado) ? 'anulada' : ''} ${e.mantener === 'No' ? 'apagado' : ''}" data-ev="${e.id}">
    <div class="ev-fecha">${e.fecha ? `<b>${aFecha(e.fecha).getDate()}</b><span>${DIAS[diaSemana(e.fecha)].slice(0, 3)}</span>` : '<span>—</span>'}</div>
    <div class="cuerpo"><div class="t1">${puntoCal(e.cal) || '•'} ${esc(e.titulo)}</div>
      <div class="t2">${e.hora ? `<span>${esc(e.hora)}</span>` : ''}<span>${esc(e.cal || '')}</span>${e.hasta && e.hasta !== e.fecha ? `<span>hasta el ${fechaCorta(e.hasta)}</span>` : ''}${e.notas ? `<span class="tenue">${esc(e.notas)}</span>` : ''}${e.estado ? `<span>${esc(e.estado)}</span>` : ''}${e.mantener === 'No' ? '<span class="tenue">oculto en Inicio</span>' : ''}${e.gcalId ? '<span class="tenue" title="Viene de Google Calendar">G</span>' : ''}</div></div>
    ${e.fecha && e.fecha >= H ? `<span class="plazo ${diasEntre(H, e.fecha) <= 7 ? 'pronto' : ''}">${diasEntre(H, e.fecha) === 0 ? 'hoy' : 'en ' + plural(diasEntre(H, e.fecha), 'día', 'días')}</span>` : ''}</div>`;

  cont.innerHTML = `<div class="pagina eventos">${cabecera('⭐ Eventos y citas', 'Lo de tus calendarios: médicos, familia, colegio, club y tus eventos de autora.',
    `${conGoogle ? '<button class="btn" id="ev-google">↻ Traer de Google Calendar</button>' : ''}<button class="btn prim" id="ev-nuevo">+ Evento</button>`)}
    <div class="chips-cat">${cals.map(c => `<button data-cal="${esc(c)}" class="${ocultos.has(c) ? '' : 'on'}" style="--c:var(--acento)">${puntoCal(c)} ${esc(may(c.toLowerCase()))}${usos.has(c) ? ` <small class="tenue">${usos.get(c)}</small>` : ''}</button>`).join('')}${sinUso.length ? `<button data-todoscals class="tenue" style="border-style:dashed">${UI.eTodosCals ? 'Ocultar los que no tienen eventos' : `+ ${sinUso.length} sin eventos`}</button>` : ''}</div>
    <div class="barra-filtros"><div class="segmentado">${[['proximos', 'Próximos'], ['pasados', 'Pasados'], ['todos', 'Todos']].map(([k, t]) => `<button data-ver="${k}" class="${k === ver ? 'on' : ''}">${t}</button>`).join('')}</div>
      ${!conGoogle ? '<span class="tenue">Para traerlos solos de Google Calendar, conecta Google en Ajustes.</span>' : ''}</div>
    <div class="lista grande">${[...grupos].map(([k, es]) => `<h3 class="mes-sep">${k ? nombreMes(k) : 'Sin fecha'}</h3>${es.map(fila).join('')}`).join('') || '<p class="vacio">No hay eventos aquí</p>'}</div>
    ${recurrentes.length ? `<h3 class="mes-sep">🔁 Recurrentes</h3><div class="lista grande">${recurrentes.map(e => `<div class="evento" data-ev="${e.id}"><div class="ev-fecha"><span>🔁</span></div><div class="cuerpo"><div class="t1">${puntoCal(e.cal) || '•'} ${esc(e.titulo)}</div><div class="t2"><span>${esc(e.hora || '')}</span><span>${esc(e.cal || '')}</span>${e.notas ? `<span class="tenue">${esc(e.notas)}</span>` : ''}</div></div></div>`).join('')}</div>` : ''}
  </div>`;

  $('#ev-nuevo', cont).onclick = () => editarEvento({ fecha: hoy() }, { nueva: true });
  if ($('#ev-google', cont)) $('#ev-google', cont).onclick = () => GG.traerEventos(true);
  $$('[data-ver]', cont).forEach(b => b.onclick = () => { UI.eVer = b.dataset.ver; guardarUI(); pintar(); });
  $$('[data-cal]', cont).forEach(b => b.onclick = () => { const s = new Set(UI.eOcultos || []); s.has(b.dataset.cal) ? s.delete(b.dataset.cal) : s.add(b.dataset.cal); UI.eOcultos = [...s]; guardarUI(); pintar(); });
  if ($('[data-todoscals]', cont)) $('[data-todoscals]', cont).onclick = () => { UI.eTodosCals = !UI.eTodosCals; guardarUI(); pintar(); };
  $$('[data-ev]', cont).forEach(n => n.onclick = () => editarEvento(D.eventos.find(e => e.id === n.dataset.ev)));
};
