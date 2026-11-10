'use strict';
// =====================================================================
//  Planner — Trabajo Ayuntamiento: lo que hay que hacer cuando te den
//  el puesto, por fases. Sin fechas: se van tachando.
// =====================================================================

const FASES_AYTO = [
  ['noticia', '📬 Cuando te llegue el nombramiento'],
  ['papeles', '📄 Documentación para la toma de posesión'],
  ['primeros', '🏛️ Primeros días en el puesto'],
  ['casa', '🏡 Organización en casa'],
];
// Tareas de partida (se pueden editar, borrar o añadir más)
function tareasAytoIniciales() {
  const t = (grupo, texto) => ({ id: uid(), grupo, t: texto, hecho: false });
  return [
    t('noticia', 'Leer bien la resolución de nombramiento y apuntar el plazo para la toma de posesión'),
    t('noticia', 'Llamar a Personal / Recursos Humanos y pedir la lista de documentos que necesitan'),
    t('noticia', 'Pedir cita para la toma de posesión'),
    t('noticia', 'Avisar a Lanbide de que empiezas a trabajar (sobre todo si cobras alguna prestación)'),
    t('papeles', 'DNI (original y copia)'),
    t('papeles', 'Título de Técnico Superior en Administración y Finanzas (original y copia compulsada)'),
    t('papeles', 'Número de afiliación a la Seguridad Social'),
    t('papeles', 'Número de cuenta (IBAN) para la nómina'),
    t('papeles', 'Declaración jurada de no haber sido separada del servicio ni estar inhabilitada'),
    t('papeles', 'Declaración de incompatibilidades (y pedir la compatibilidad si sigues con otra actividad, como Etsy o tus libros)'),
    t('papeles', 'Certificado o reconocimiento médico, si lo piden'),
    t('papeles', 'Certificado de delitos de naturaleza sexual, si el puesto trata con menores'),
    t('papeles', 'Fotos tamaño carné'),
    t('primeros', 'Firmar la toma de posesión y guardar una copia'),
    t('primeros', 'Rellenar el modelo 145 del IRPF con tu situación familiar'),
    t('primeros', 'Preguntar por Elkarkidetza (la previsión social de las administraciones vascas)'),
    t('primeros', 'Pedir accesos: correo, intranet y fichaje'),
    t('primeros', 'Preguntar el horario, el calendario laboral y cómo se piden vacaciones y días de asuntos propios'),
    t('primeros', 'Leer el convenio o acuerdo regulador del ayuntamiento'),
    t('primeros', 'Revisar la primera nómina'),
    t('casa', 'Reorganizar horarios de los niños: cole, extraescolares y quién recoge'),
    t('casa', 'Poner el nuevo horario en Turnos del Planner'),
    t('casa', 'Retirar las candidaturas abiertas en Empleo'),
  ];
}

VISTAS.ayuntamiento = (cont) => {
  const A = D.ayto;
  const L = D.ayuntamiento;
  const hechas = L.filter(x => x.hecho).length;
  const pct = L.length ? Math.round(hechas / L.length * 100) : 0;
  const H = hoy();
  const faltan = A.inicio ? diasEntre(H, A.inicio) : null;
  const fila = (x) => `<li class="${x.hecho ? 'hecho' : ''}" data-aid="${esc(x.id)}"><button class="check" data-acheck aria-label="${x.hecho ? 'Desmarcar' : 'Marcar hecha'}">${x.hecho ? '✓' : ''}</button><span class="rt" data-aedit title="Pulsa para editar">${esc(x.t)}</span><button class="icono" data-aquitar title="Borrar">✕</button></li>`;

  cont.innerHTML = `<div class="pagina">
    ${cabecera('🏛️ Trabajo Ayuntamiento', 'Todo lo que tendrás que hacer cuando te den el puesto, para no olvidarte de nada.', '')}
    <div style="display:flex;flex-direction:column;gap:14px">
    <section class="tarjeta">
      <div class="form"><label class="campo medio"><span>Puesto</span><input id="ay-puesto" value="${esc(A.puesto || '')}" placeholder="p. ej. Auxiliar administrativa"></label>
        <label class="campo medio"><span>Toma de posesión / primer día</span><input id="ay-inicio" type="date" value="${esc(A.inicio || '')}"></label></div>
      <p class="tenue" style="margin:4px 0 8px">${faltan === null ? 'Cuando sepas la fecha, apúntala aquí.' : faltan > 0 ? `Empiezas en <b>${plural(faltan, 'día', 'días')}</b>.` : faltan === 0 ? '<b>¡Hoy es el primer día!</b>' : 'Ya estás en el puesto.'} ${hechas} de ${L.length} tareas hechas.</p>
      <div class="barra"><i style="width:${pct}%"></i></div>
    </section>
    ${FASES_AYTO.map(([g, titulo]) => {
      const xs = L.filter(x => x.grupo === g);
      return `<section class="tarjeta"><div class="t-cab"><h2>${titulo}</h2><span class="tenue">${xs.filter(x => x.hecho).length}/${xs.length}</span></div>
        <div class="rapida"><ul>${xs.map(fila).join('')}</ul>
        <input class="rapida-nueva" data-anueva="${g}" placeholder="Añadir una tarea y pulsar Enter…" aria-label="Añadir tarea a ${esc(titulo)}"></div></section>`;
    }).join('')}
    ${L.length && hechas === L.length ? '<p class="vacio">🎉 ¡Todo listo! Enhorabuena por el puesto.</p>' : ''}
  </div></div>`;

  $('#ay-puesto', cont).onchange = (e) => { A.puesto = e.target.value.trim(); cambio(false); };
  $('#ay-inicio', cont).onchange = (e) => { A.inicio = e.target.value; cambio(); };
  $$('[data-anueva]', cont).forEach(inp => inp.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    const t = inp.value.trim(); if (!t) return;
    const g = inp.dataset.anueva;
    L.push({ id: uid(), grupo: g, t, hecho: false }); cambio();
    requestAnimationFrame(() => { const n = $(`[data-anueva="${g}"]`, cont); if (n) n.focus(); });
  }));
  cont.onclick = (e) => {
    const li = e.target.closest('[data-aid]'); if (!li) return;
    const x = L.find(y => y.id === li.dataset.aid); if (!x) return;
    if (e.target.closest('[data-acheck]')) { x.hecho = !x.hecho; cambio(); return; }
    if (e.target.closest('[data-aquitar]')) { borrarConDeshacer('ayuntamiento', x.id, 'Borrada: ' + x.t); return; }
    if (e.target.closest('[data-aedit]')) pedirTexto('Editar tarea', x.t).then(t => { if (t && t.trim()) { x.t = t.trim(); cambio(); } });
  };
};
