'use strict';
// =====================================================================
//  Planner — Inicio (lo que era la pestaña Resumen)
// =====================================================================

VISTAS.inicio = (cont) => {
  const H = hoy();
  const lunes = lunesDe(H), domingo = sumarDias(lunes, 6);
  const todo = elementos();
  const deHoy = todo.filter(x => x.fecha === H).sort(ordenFecha);
  // Atrasadas: las de esta semana van dentro de «Hoy»; las de semanas anteriores, en su propia tarjeta
  const atras = todo.filter(x => atrasada(x) && x.fecha >= lunes).sort(ordenFecha);
  const atrasViejas = todo.filter(x => atrasada(x) && x.fecha < lunes).sort(ordenFecha);
  const semana = todo.filter(x => x.fecha > H && x.fecha <= domingo).sort(ordenFecha);
  const urgentes = todo.filter(x => x.tipo !== 'evento' && pendiente(x) && x.fecha && x.fecha <= domingo && /Alta/.test(x.prioridad || '')).sort(ordenFecha);
  const ligeras = todo.filter(x => x.tipo !== 'evento' && pendiente(x) && x.fecha >= lunes && x.fecha <= domingo && /Baja/.test(x.energia || '')).sort(ordenFecha);
  const fr = franjaDe(H), ex = extraDe(H);
  const h = new Date().getHours();
  const saludo = h < 6 ? 'Buenas noches' : h < 14 ? 'Buenos días' : h < 21 ? 'Buenas tardes' : 'Buenas noches';

  // --- avisos de un vistazo ---
  const avisos = [];
  const clave = D.eventos.filter(e => e.tipo !== 'Recurrente' && e.mantener !== 'No' && e.fecha >= H && D.clave.includes(e.cal)).sort((a, b) => a.fecha.localeCompare(b.fecha));
  if (clave[0]) { const n = diasEntre(H, clave[0].fecha); avisos.push(n === 0 ? `🎉 ¡Hoy es el día! ${esc(clave[0].titulo)}` : `⏳ Faltan ${plural(n, 'día', 'días')} para ${esc(clave[0].titulo)}`); }
  const piezasSemana = D.batch.filter(b => b.fecha >= lunes && b.fecha <= domingo);
  avisos.push(piezasSemana.length ? `📲 Redes esta semana: ${plural(piezasSemana.length, 'pieza', 'piezas')} · ${piezasSemana.filter(b => b.programado || b.publicado).length} listas` : '📲 Redes esta semana: nada programado, toca batch');
  const news = D.tareas.filter(t => t.cat === 'newsletter' && t.fecha && pendiente(t)).sort((a, b) => a.fecha.localeCompare(b.fecha))[0];
  if (news) avisos.push(news.fecha < H ? `<span class="rojo">⚠️ Newsletter atrasada (${fechaDM(news.fecha)}): ${esc(news.tarea)}</span>` : `✉️ Próxima newsletter (${fechaDM(news.fecha)}): ${esc(news.tarea)}`);
  const sinUsar = D.ideas.filter(i => !D.batch.some(b => String(b.idea) === String(i.n))).length;
  avisos.push(`💡 Banco de ideas: ${plural(sinUsar, 'idea sin usar', 'ideas sin usar')}${sinUsar < 5 ? ' · toca pasar el prompt de pilares' : ''}`);
  const tocaEm = D.candidaturas.filter(candToca);
  if (tocaEm.length) avisos.push(`<a href="#empleo">💼 Toca preguntar por ${tocaEm.length === 1 ? 'tu candidatura en ' + esc(tocaEm[0].empresa || tocaEm[0].puesto) : tocaEm.length + ' candidaturas'}</a>`);
  const sinProc = D.descarga.filter(d => /Sin procesar/.test(d.estado || '')).length;
  if (sinProc) avisos.push(`🧠 Descarga mental: ${plural(sinProc, 'apunte sin procesar', 'apuntes sin procesar')}`);
  try { if (window.avisosGastos) avisos.push(...window.avisosGastos()); } catch (e) { console.error(e); }

  // --- objetivos y progreso del mes ---
  const ym = mesDe(H);
  const [Y, Mm] = ym.split('-').map(Number);
  const objs = D.objetivos.filter(o => o.anio === Y && (o.periodo || 'mes') === 'mes' && o.mes === Mm);
  // Los del trimestre y del año, para tenerlos a la vista
  const objsLargos = D.objetivos.filter(o => o.anio === Y && ((o.periodo === 'trimestre' && o.trimestre === Math.ceil(Mm / 3)) || o.periodo === 'año') && !esAnulada(o.estado));
  const delMes = todo.filter(x => mesDe(x.fecha) === ym && x.tipo !== 'evento' && !esAnulada(x.estado));
  const porCat = {};
  delMes.forEach(x => { const c = porCat[x.cat] || (porCat[x.cat] = { t: 0, h: 0 }); c.t++; if (esHecho(x.estado)) c.h++; });
  const totH = delMes.filter(x => esHecho(x.estado)).length;

  // --- revisión del domingo ---
  const rev = D.revision[lunes] || {};
  const fechasClave = D.eventos.filter(e => e.tipo !== 'Recurrente' && e.mantener !== 'No' && e.fecha >= H && D.clave.includes(e.cal)).sort((a, b) => a.fecha.localeCompare(b.fecha)).slice(0, D.ajustes.diasClave || 4);

  cont.innerHTML = `<div class="pagina inicio"><div class="apps-barra"></div>
    <header class="cab-pag hola"><div><h1>${saludo}${(n => n ? ', ' + esc(n) : '')(D.ajustes.nombre || String((D.perfil && D.perfil.nombre) || '').trim().split(/\s+/)[0])}</h1>
      <p class="sub">${fechaLarga(H)}${fr ? ` · <b>${iconoFranja(fr)} ${esc(fr)}</b>` : ''}${ex ? ` · 🧒 ${esc(ex)}` : ''}</p></div>
      <div class="acciones-pag"><button class="btn" id="in-apunte">🧠 Apuntar algo</button><button class="btn prim" id="in-nueva">+ Tarea</button></div></header>
    ${tarjetaPerfil()}
    <div class="avisos-in">${avisos.map(a => `<div>${a}</div>`).join('')}</div>
    <div class="rejilla-in">
      <div class="col">
        <section class="tarjeta"><div class="t-cab"><h2>📌 Hoy</h2><span class="tenue">${deHoy.length ? plural(deHoy.filter(pendiente).length, 'pendiente', 'pendientes') : ''}</span></div>
          <div class="lista" id="in-hoy">${deHoy.length ? deHoy.map(x => filaElemento(x, { fecha: false, plazoVis: false })).join('') : '<p class="vacio">🎉 No tienes nada apuntado para hoy</p>'}</div>
          ${atras.length ? `<details class="atrasadas" ${UI.verAtras ? 'open' : ''}><summary>⏰ ${plural(atras.length, 'atrasada', 'atrasadas')} de esta semana</summary><div class="lista" id="in-atras">${atras.map(x => filaElemento(x)).join('')}</div></details>` : ''}
        </section>
        ${atrasViejas.length ? `<section class="tarjeta"><div class="t-cab"><h2>⏳ Pendiente de otras semanas</h2><span class="tenue">${plural(atrasViejas.length, 'tarea', 'tareas')} · hazla, cámbiala de día o anúlala</span></div>
          <div class="lista" id="in-viejas">${atrasViejas.map(x => filaElemento(x)).join('')}</div></section>` : ''}
        <section class="tarjeta"><div class="t-cab"><h2>📅 Lo que queda de semana</h2><a href="#calendario" class="enlace">Calendario</a></div>
          <div id="in-semana">${semana.length ? agruparPorDia(semana) : '<p class="vacio">Nada más apuntado hasta el domingo</p>'}</div></section>
        <section class="tarjeta"><div class="t-cab"><h2>🔥 Urgente: prioridad alta hasta el domingo</h2></div>
          <div class="lista" id="in-urg">${urgentes.length ? urgentes.map(x => filaElemento(x)).join('') : '<p class="vacio">🎉 Nada urgente esta semana</p>'}</div></section>
        <section class="tarjeta"><div class="t-cab"><h2>🪫 Si hoy vas justa de energía</h2></div>
          <div class="lista" id="in-lig">${ligeras.length ? ligeras.map(x => filaElemento(x)).join('') : '<p class="vacio">Esta semana no tienes tareas ligeras pendientes</p>'}</div></section>
      </div>
      <div class="col">
        ${tarjetaHabitosHoy()}
        <section class="tarjeta">${miniMes(ym)}</section>
        <section class="tarjeta"><div class="t-cab"><h2>📝 Lista rápida</h2><a href="#" class="enlace" id="in-rapida">Abrir</a></div>${listaRapidaHTML({ compacta: true })}</section>
        <section class="tarjeta"><div class="t-cab"><h2>⭐ Próximas fechas clave</h2><a href="#eventos" class="enlace">Eventos</a></div>
          ${fechasClave.length ? `<ul class="claves">${fechasClave.map(e => `<li><b>${fechaDM(e.fecha)}</b><span>${puntoCal(e.cal)} ${esc(e.titulo)}</span><i>${diasEntre(H, e.fecha) === 0 ? 'hoy' : 'en ' + plural(diasEntre(H, e.fecha), 'día', 'días')}</i></li>`).join('')}</ul>` : '<p class="vacio">Sin fechas clave próximas</p>'}</section>
        <section class="tarjeta"><div class="t-cab"><h2>🎯 Objetivos de ${MESES[Mm - 1]} · ${objs.filter(o => esHecho(o.estado)).length}/${objs.length}</h2><a href="#objetivos" class="enlace">Ver todos</a></div>
          ${objs.length ? `<ul class="objs">${objs.map(o => `<li data-obj="${o.id}" class="${esHecho(o.estado) ? 'hecho' : ''}"><button class="check" data-ocheck>${esHecho(o.estado) ? '✓' : ''}</button><span>${esc(o.texto)}</span><small>${esc(o.cat || '')}</small></li>`).join('')}</ul>` : '<p class="vacio">Sin objetivos para este mes. <a href="#objetivos">Apuntar</a></p>'}
          ${objsLargos.length ? `<p class="tenue" style="margin:10px 0 4px;font-size:12px">Del trimestre y del año</p><ul class="objs">${objsLargos.map(o => `<li data-obj="${o.id}" class="${esHecho(o.estado) ? 'hecho' : ''}"><button class="check" data-ocheck>${esHecho(o.estado) ? '✓' : ''}</button><span>${esc(o.texto)}</span><small>${o.periodo === 'año' ? 'Año' : o.trimestre + '.º trim.'}</small></li>`).join('')}</ul>` : ''}</section>
        <section class="tarjeta"><div class="t-cab"><h2>📊 Progreso de ${MESES[Mm - 1]}</h2><span class="tenue">${totH} de ${delMes.length}</span></div>
          <div class="progresos">${Object.entries(porCat).sort((a, b) => b[1].t - a[1].t).map(([k, v]) => `<div class="prog" style="--c:${catDe(k).color}"><span>${catDe(k).e} ${esc(catDe(k).n)}</span><div class="barra"><i style="width:${Math.round(v.h / v.t * 100)}%"></i></div><b>${v.h}/${v.t}</b></div>`).join('') || '<p class="vacio">Aún no hay tareas este mes</p>'}</div></section>
        <section class="tarjeta"><div class="t-cab"><h2>🧹 Revisión del domingo</h2><span class="tenue">semana del ${fechaDM(lunes)} · ${Object.values(rev).filter(Boolean).length}/${REVISION.length}</span></div>
          <ul class="revision">${REVISION.map((r, i) => `<li><label><input type="checkbox" data-rev="${i}"${rev[i] ? ' checked' : ''}> ${r}</label></li>`).join('')}</ul></section>
        <section class="tarjeta"><div class="t-cab"><h2>🔗 Accesos rápidos</h2><a href="#ajustes" class="enlace">Editar</a></div>
          <div class="enlaces">${D.enlaces.map(e => `<a href="${esc(e.url)}" target="_blank" rel="noopener">${esc(e.t)}</a>`).join('')}</div></section>
      </div>
    </div></div>`;

  enlazarItems($('#in-hoy', cont), deHoy);
  if ($('#in-atras', cont)) { enlazarItems($('#in-atras', cont), atras); $('details.atrasadas', cont).ontoggle = (e) => { UI.verAtras = e.target.open; guardarUI(); }; }
  if ($('#in-viejas', cont)) enlazarItems($('#in-viejas', cont), atrasViejas);
  enlazarItems($('#in-semana', cont), semana);
  enlazarItems($('#in-urg', cont), urgentes);
  enlazarItems($('#in-lig', cont), ligeras);
  if ($('#in-perfil', cont)) $('#in-perfil', cont).onclick = () => irA('ajustes');
  $('#in-nueva', cont).onclick = () => nuevaTarea();
  $('#in-apunte', cont).onclick = () => apunteRapido();
  $$('[data-rev]', cont).forEach(c => c.onchange = () => { const r = D.revision[lunes] || (D.revision[lunes] = {}); r[c.dataset.rev] = c.checked; cambio(); });
  $$('[data-obj]', cont).forEach(li => {
    const o = D.objetivos.find(x => x.id === li.dataset.obj);
    li.onclick = (e) => {
      if (e.target.closest('[data-ocheck]')) { o.estado = esHecho(o.estado) ? D.listas.estados.objetivos[0] : '✅Conseguido'; cambio(); return; }
      editarObjetivo(o);
    };
  });
  enlazarListaRapida(cont);
  enlazarHabitosHoy(cont);
  $('#in-rapida', cont).onclick = (e) => { e.preventDefault(); UI.tCat = 'rapida'; guardarUI(); irA('tareas'); };
  enlazarMiniMes(cont);
};

function agruparPorDia(lista) {
  const dias = [...new Set(lista.map(x => x.fecha))];
  return dias.map(f => `<div class="grupo-dia"><h4>${fechaLarga(f)}${franjaDe(f) ? ` <span class="tenue">· ${iconoFranja(franjaDe(f))} ${esc(franjaDe(f))}</span>` : ''}</h4><div class="lista">${lista.filter(x => x.fecha === f).map(x => filaElemento(x, { fecha: false, plazoVis: false })).join('')}</div></div>`).join('');
}

// Calendario pequeño con puntos por día
function miniMes(ym) {
  const H = hoy();
  const cuenta = {};
  elementos({ desde: primeroMes(ym), hasta: `${ym}-${pad(diasDelMes(ym))}` }).forEach(x => { cuenta[x.fecha] = (cuenta[x.fecha] || 0) + 1; });
  return `<div class="t-cab"><h2>🗓️ ${nombreMes(ym)}</h2><a href="#calendario" class="enlace">Abrir</a></div>
  <div class="mini-mes">${DIAS_C.map(d => `<b>${d}</b>`).join('')}${semanasDelMes(ym).flat().map(f => `<button data-dia="${f}" class="${mesDe(f) !== ym ? 'fuera' : ''} ${f === H ? 'hoy' : ''}">${aFecha(f).getDate()}${cuenta[f] ? `<i>${'•'.repeat(Math.min(3, cuenta[f]))}</i>` : ''}</button>`).join('')}</div>`;
}
function enlazarMiniMes(cont) {
  $$('.mini-mes [data-dia]', cont).forEach(b => b.onclick = () => { UI.calMes = mesDe(b.dataset.dia); UI.calDia = b.dataset.dia; irA('calendario'); });
}

// Apunte rápido a la descarga mental
function apunteRapido() {
  modal(`<h3>🧠 Apuntar algo</h3><p class="suave" style="margin-top:0">Sin pensar en categoría ni fecha: ya lo ordenarás en Descarga.</p>
    <label class="campo"><input id="ap-t" placeholder="Lo que tengas en la cabeza…" autofocus></label>
    <div class="pie"><button class="btn" data-cerrar>Cancelar</button><button class="btn prim" id="ap-ok">Apuntar</button></div>`, {
    alAbrir: (m, cerrar) => {
      const ok = () => { const t = $('#ap-t', m).value.trim(); if (!t) return; D.descarga.unshift({ id: uid(), fecha: hoy(), tarea: t, estado: D.listas.estados.descarga[0] }); cambio(); cerrar(); aviso('Apuntado en Descarga'); };
      $('#ap-ok', m).onclick = ok; $('#ap-t', m).onkeydown = (e) => { if (e.key === 'Enter') ok(); };
    }
  });
}
