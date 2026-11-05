'use strict';
// =====================================================================
//  Planner — Empleo: las ofertas a las que te apuntas, en qué punto
//  está cada una y cuándo volver a preguntar.
// =====================================================================

const ESTADOS_CAND = ['📤 Enviada', '👀 Vista', '📞 Entrevista', '⏳ Esperando respuesta', '🎉 Oferta', '❌ Descartada'];
const VIAS_CAND = ['Lanbide', 'InfoJobs', 'LinkedIn', 'Indeed', 'Web de la empresa', 'Email', 'En persona', 'ETT', 'Un contacto', 'Otra'];
const candActiva = (c) => !/Descartada|Oferta/.test(c.estado || '');
const candToca = (c) => candActiva(c) && c.seguimiento && c.seguimiento <= hoy();

VISTAS.empleo = (cont) => {
  const H = hoy(), ver = UI.emVer || 'activas';
  const todas = [...D.candidaturas].sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));
  const lista = todas.filter(c => ver === 'todas' ? true : ver === 'cerradas' ? !candActiva(c) : candActiva(c));
  const toca = todas.filter(candToca);
  const ym = mesDe(H);
  const delMes = todas.filter(c => mesDe(c.fecha) === ym).length;
  const entrevistas = todas.filter(c => /Entrevista/.test(c.estado || '') || (c.entrevista && c.entrevista >= H)).length;
  const fila = (c) => {
    const dias = c.fecha ? diasEntre(c.fecha, H) : null;
    return `<div class="evento cand ${candActiva(c) ? '' : 'apagado'}" data-cand="${c.id}">
      <div class="ev-fecha">${c.fecha ? `<b>${aFecha(c.fecha).getDate()}</b><span>${MESES[aFecha(c.fecha).getMonth()].slice(0, 3)}</span>` : '<span>—</span>'}</div>
      <div class="cuerpo"><div class="t1">${esc(c.empresa || 'Sin empresa')}${c.puesto ? ` <span class="tenue">· ${esc(c.puesto)}</span>` : ''}</div>
        <div class="t2"><span>${esc(c.estado || '')}</span>${c.via ? `<span>${esc(c.via)}</span>` : ''}${dias !== null ? `<span class="tenue">${dias === 0 ? 'hoy' : 'hace ' + plural(dias, 'día', 'días')}</span>` : ''}${c.entrevista && c.entrevista >= H ? `<span>📞 entrevista ${fechaCorta(c.entrevista)}${c.horaEntrevista ? ' ' + esc(c.horaEntrevista) : ''}</span>` : ''}${c.seguimiento && candActiva(c) ? `<span class="${c.seguimiento <= H ? 'rojo' : ''}">🔔 preguntar ${c.seguimiento <= H ? 'ya' : fechaCorta(c.seguimiento)}</span>` : ''}</div></div>
      ${c.enlace ? `<a class="btn peq" href="${esc(c.enlace)}" target="_blank" rel="noopener" data-no-abrir>Oferta ↗</a>` : ''}</div>`;
  };
  cont.innerHTML = `<div class="pagina eventos empleo">${cabecera('💼 Empleo', 'Las ofertas a las que te apuntas: en qué punto está cada una y cuándo volver a preguntar.', '<button class="btn prim" id="em-nueva">+ Candidatura</button>')}
    <div class="cifras-em"><div class="tarjeta"><b>${delMes}</b><span>enviadas en ${MESES[aFecha(H).getMonth()]}</span></div><div class="tarjeta"><b>${todas.filter(candActiva).length}</b><span>en marcha</span></div><div class="tarjeta"><b>${entrevistas}</b><span>entrevistas</span></div><div class="tarjeta"><b>${todas.length}</b><span>en total</span></div></div>
    ${toca.length ? `<section class="tarjeta toca-em"><h2>🔔 Toca preguntar</h2><div class="lista">${toca.map(fila).join('')}</div></section>` : ''}
    <div class="barra-filtros"><div class="segmentado">${[['activas', 'En marcha'], ['cerradas', 'Cerradas'], ['todas', 'Todas']].map(([k, t]) => `<button data-emver="${k}" class="${k === ver ? 'on' : ''}">${t}</button>`).join('')}</div></div>
    <div class="lista grande">${lista.map(fila).join('') || `<p class="vacio">${todas.length ? 'Nada aquí' : 'Aún no has apuntado ninguna candidatura. Pulsa «+ Candidatura» cuando te apuntes a una oferta.'}</p>`}</div>
  </div>`;
  $('#em-nueva', cont).onclick = () => editarCandidatura({ fecha: H, estado: ESTADOS_CAND[0], seguimiento: sumarDias(H, 7) }, { nueva: true });
  $$('[data-emver]', cont).forEach(b => b.onclick = () => { UI.emVer = b.dataset.emver; guardarUI(); pintar(); });
  $$('[data-cand]', cont).forEach(n => n.onclick = (e) => { if (e.target.closest('[data-no-abrir]')) return; editarCandidatura(D.candidaturas.find(c => c.id === n.dataset.cand)); });
};

function editarCandidatura(c, { nueva = false } = {}) {
  const campos = [
    { k: 'empresa', t: 'Empresa', tipo: 'texto', ancho: 'medio' },
    { k: 'puesto', t: 'Puesto', tipo: 'texto', ancho: 'medio' },
    { k: 'fecha', t: 'Me apunté el', tipo: 'fecha', ancho: 'tercio' },
    { k: 'via', t: 'Por dónde', tipo: 'lista', op: VIAS_CAND, ancho: 'tercio' },
    { k: 'estado', t: 'Estado', tipo: 'select', op: ESTADOS_CAND, vacio: false, ancho: 'tercio' },
    { k: 'seguimiento', t: '🔔 Volver a preguntar el', tipo: 'fecha', ancho: 'medio', ayuda: 'Ese día te sale en Inicio y te aviso.' },
    { k: 'entrevista', t: '📞 Entrevista el', tipo: 'fecha', ancho: 'tercio' },
    { k: 'horaEntrevista', t: 'Hora', tipo: 'hora', ancho: 'tercio' },
    { k: 'enlace', t: 'Enlace a la oferta', tipo: 'texto', ph: 'https://…' },
    { k: 'contacto', t: 'Contacto (persona, teléfono, email)', tipo: 'texto' },
    { k: 'notas', t: 'Notas', tipo: 'area', filas: 3 },
  ];
  // Campo de hora al lado de la fecha de entrevista: deja hueco
  campos[5].ancho = 'tercio';
  ficha({
    titulo: nueva ? 'Nueva candidatura' : 'Candidatura', obj: c, campos,
    onGuardar: (r) => {
      if (!r.empresa && !r.puesto) { aviso('Escribe al menos la empresa o el puesto'); return false; }
      const fin = { ...r, id: c.id || uid() };
      if (/Descartada|Oferta/.test(fin.estado)) delete fin.seguimiento;
      const i = D.candidaturas.findIndex(x => x.id === fin.id);
      if (i >= 0) D.candidaturas[i] = fin; else D.candidaturas.push(fin);
      const ev = sincronizarEntrevista(fin);
      cambio();
      if (ev && typeof GG !== 'undefined' && GG.puedeEscribir()) setTimeout(() => GG.guardarEvento(ev), 0);
    },
    onBorrar: nueva ? null : async () => { D.eventos = D.eventos.filter(e => e.candId !== c.id); borrarConDeshacer('candidaturas', c.id, 'Candidatura borrada'); return true; },
    extras: nueva ? [] : [{ t: '✔️ Ya he preguntado', fn: (r, cerrar) => {
      const o = D.candidaturas.find(x => x.id === c.id); if (!o) return;
      Object.assign(o, r); o.seguimiento = sumarDias(hoy(), 7);
      o.notas = `${o.notas ? o.notas + '\n' : ''}${fechaDM(hoy())}: pregunté`; cambio(); cerrar();
      aviso(`Te lo vuelvo a recordar el ${fechaLarga(o.seguimiento).toLowerCase()}`);
    } }],
  });
}
// La entrevista sale también en Eventos, Calendario e Inicio
function sincronizarEntrevista(c) {
  let e = D.eventos.find(x => x.candId === c.id);
  if (!c.entrevista) { if (e) D.eventos = D.eventos.filter(x => x !== e); return; }
  if (!e) { e = { id: uid(), candId: c.id, tipo: 'Puntual', cal: 'EMPLEO' }; D.eventos.push(e); }
  Object.assign(e, { titulo: `📞 Entrevista · ${c.empresa || c.puesto}`, fecha: c.entrevista, hora: c.horaEntrevista || '', notas: c.puesto || '' });
  if (!D.calendarios.some(k => k.nombre === 'EMPLEO')) D.calendarios.push({ nombre: 'EMPLEO', punto: '💼' });
  return e;
}
