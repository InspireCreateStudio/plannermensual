'use strict';
// =====================================================================
//  Planner — Tareas: todas juntas o por categoría (Novela, Web,
//  Newsletter…). Sustituye a las pestañas de cada categoría, a
//  «Lista de tareas» y a «Vista global».
// =====================================================================

const FILTROS_ESTADO = [['pendientes', 'Pendientes'], ['atrasadas', 'Atrasadas'], ['semana', 'Esta semana'], ['sinfecha', 'Sin fecha'], ['hechas', 'Hechas'], ['todas', 'Todas']];

VISTAS.tareas = (cont) => {
  const cat = UI.tCat || 'todas', est = UI.tEstado || 'pendientes', orden = UI.tOrden || 'fecha', mes = UI.tMes || '';
  const q = quitarTildes(UI.tBuscar || '');
  const H = hoy(), lunes = lunesDe(H), domingo = sumarDias(lunes, 6);
  let lista = elementos({ conEventos: cat === 'eventos' || (cat === 'todas' && !!UI.tConEventos) });
  const cuentaCat = {};
  lista.filter(pendiente).forEach(x => { cuentaCat[x.cat] = (cuentaCat[x.cat] || 0) + 1; });
  if (cat !== 'todas') lista = lista.filter(x => x.cat === cat);
  if (mes) lista = lista.filter(x => mesDe(x.fecha) === mes);
  if (q) lista = lista.filter(x => quitarTildes([x.titulo, x.sub, x.notas, x.ref.tema, x.ref.asunto].join(' ')).includes(q));
  const filtro = {
    pendientes: pendiente, atrasadas: atrasada, hechas: x => esHecho(x.estado), todas: () => true,
    semana: x => x.fecha >= lunes && x.fecha <= domingo, sinfecha: x => !x.fecha,
  }[est] || pendiente;
  lista = lista.filter(filtro);
  const comparar = orden === 'prioridad' ? (a, b) => nivelPrioridad(a.prioridad) - nivelPrioridad(b.prioridad) || ordenFecha(a, b)
    : orden === 'categoria' ? (a, b) => catDe(a.cat).n.localeCompare(catDe(b.cat).n) || ordenFecha(a, b)
    : orden === 'energia' ? (a, b) => nivelEnergia(b.energia) - nivelEnergia(a.energia) || ordenFecha(a, b)
    : est === 'hechas' ? (a, b) => -ordenFecha(a, b) : ordenFecha;
  lista.sort(comparar);

  // Meses con algo, para el selector
  const meses = [...new Set(elementos({ conEventos: false }).map(x => mesDe(x.fecha)).filter(Boolean))].sort();
  const cats = [['todas', 'Todas'], ['rapida', '📝 Lista rápida'], ...Object.keys(CATS).map(k => [k, `${CATS[k].e} ${CATS[k].n}`]), ['redes', `${CAT_REDES.e} Redes`], ['eventos', `${CAT_EVENTO.e} Eventos`]];
  if (cat === 'rapida') {
    cont.innerHTML = `<div class="pagina tareas">
      ${cabecera('📝 Lista rápida', 'Cosas sueltas sin fecha ni categoría: apúntalas y táchalas.', '')}
      <div class="chips-cat">${cats.map(([k, t]) => `<button data-cat="${k}" class="${k === cat ? 'on' : ''}" style="--c:${k === 'todas' || k === 'rapida' ? 'var(--acento)' : catDe(k).color}">${t}</button>`).join('')}</div>
      <section class="tarjeta">${listaRapidaHTML()}</section></div>`;
    $$('[data-cat]', cont).forEach(b => b.onclick = () => { UI.tCat = b.dataset.cat; if (b.dataset.cat in CATS) UI.ultimaCat = b.dataset.cat; guardarUI(); pintar(); });
    enlazarListaRapida(cont);
    if (!D.rapida.length) $('.rapida-nueva', cont).focus();
    return;
  }
  const C = cat !== 'todas' ? catDe(cat) : null;

  cont.innerHTML = `<div class="pagina tareas">
    ${cabecera(C ? `${C.e} ${esc(C.n)}` : 'Tareas', C ? subCat(cat) : 'Todas tus tareas juntas: elige una categoría para ver solo las suyas.',
      `<button class="btn prim" id="ta-nueva">+ ${cat === 'redes' ? 'Pieza' : cat === 'eventos' ? 'Evento' : 'Tarea'}</button>`)}
    <div class="chips-cat">${cats.map(([k, t]) => `<button data-cat="${k}" class="${k === cat ? 'on' : ''}" style="--c:${k === 'todas' || k === 'rapida' ? 'var(--acento)' : catDe(k).color}">${t}${k === 'rapida' && D.rapida.some(r => !r.hecho) ? `<i>${D.rapida.filter(r => !r.hecho).length}</i>` : ''}${cuentaCat[k] && k !== 'todas' ? `<i>${cuentaCat[k]}</i>` : ''}</button>`).join('')}</div>
    <div class="barra-filtros">
      <div class="segmentado">${FILTROS_ESTADO.map(([k, t]) => `<button data-est="${k}" class="${k === est ? 'on' : ''}">${t}</button>`).join('')}</div>
      <select id="ta-mes" aria-label="Mes"><option value="">Todos los meses</option>${meses.map(m => `<option value="${m}"${m === mes ? ' selected' : ''}>${nombreMes(m)}</option>`).join('')}</select>
      <select id="ta-orden" aria-label="Ordenar"><option value="fecha">Por fecha</option><option value="prioridad"${orden === 'prioridad' ? ' selected' : ''}>Por prioridad</option><option value="categoria"${orden === 'categoria' ? ' selected' : ''}>Por categoría</option><option value="energia"${orden === 'energia' ? ' selected' : ''}>Por energía</option></select>
      <input type="search" id="ta-buscar" placeholder="Buscar…" value="${esc(UI.tBuscar || '')}">
      ${cat === 'todas' ? `<label class="check-peq"><input type="checkbox" id="ta-ev"${UI.tConEventos ? ' checked' : ''}> con eventos</label>` : ''}
    </div>
    ${cat === 'newsletter' ? resumenNewsletter() : ''}
    <div class="leyenda tenue"><span class="ley atrasada">Atrasada</span><span class="ley pronto">Vence en 7 días</span><span>${plural(lista.length, 'tarea', 'tareas')}</span></div>
    <div class="lista grande" id="ta-lista">${lista.length ? listaAgrupada(lista, orden, est) : `<p class="vacio">${est === 'pendientes' ? '🎉 No tienes nada pendiente aquí' : 'No hay nada con estos filtros'}</p>`}</div>
  </div>`;

  enlazarItems($('#ta-lista', cont), lista);
  $$('[data-cat]', cont).forEach(b => b.onclick = () => { UI.tCat = b.dataset.cat; if (b.dataset.cat in CATS) UI.ultimaCat = b.dataset.cat; guardarUI(); pintar(); });
  $$('[data-est]', cont).forEach(b => b.onclick = () => { UI.tEstado = b.dataset.est; guardarUI(); pintar(); });
  $('#ta-mes', cont).onchange = (e) => { UI.tMes = e.target.value; guardarUI(); pintar(); };
  $('#ta-orden', cont).onchange = (e) => { UI.tOrden = e.target.value; guardarUI(); pintar(); };
  const b = $('#ta-buscar', cont);
  b.oninput = debounce(() => { UI.tBuscar = b.value; guardarUI(); pintar(); const n = $('#ta-buscar'); n.focus(); n.setSelectionRange(n.value.length, n.value.length); }, 250);
  if ($('#ta-ev', cont)) $('#ta-ev', cont).onchange = (e) => { UI.tConEventos = e.target.checked; guardarUI(); pintar(); };
  $('#ta-nueva', cont).onclick = () => {
    if (cat === 'redes') editarPieza({ fecha: hoy(), formato: 'Post', donde: 'Instagram', prioridad: '🟠Media' }, { nueva: true });
    else if (cat === 'eventos') editarEvento({ fecha: hoy() }, { nueva: true });
    else nuevaTarea(cat in CATS ? { cat } : {});
  };
};

function subCat(cat) {
  const t = { novela: 'Escritura, edición y todo lo de tus novelas.', web: 'Cambios y novedades de tu web.', newsletter: 'Cada envío y cada entrada del blog, con sus resultados.',
    formacion: 'Cursos y formaciones: qué harás cada día.', club: 'Tu club de lectura.', etsy: 'Tu tienda de Etsy.', ninos: 'Compras, reuniones, autorizaciones…',
    casa: 'Recados y cosas de casa. La lista de la compra está en Casa.', medicos: 'Citas y revisiones de toda la familia.', redes: 'Las piezas del batch y las tareas de redes. Guion, caption y pasos en Redes.', eventos: 'Citas y eventos del calendario.' };
  return t[cat] || '';
}
function listaAgrupada(lista, orden, est) {
  if (orden !== 'fecha') return lista.map(x => filaElemento(x, { franja: true, notas: true })).join('');
  const grupos = new Map();
  lista.forEach(x => { const k = x.fecha ? mesDe(x.fecha) : ''; if (!grupos.has(k)) grupos.set(k, []); grupos.get(k).push(x); });
  return [...grupos].map(([k, xs]) => `<h3 class="mes-sep">${k ? nombreMes(k) : 'Sin fecha'}<span class="tenue"> · ${xs.length}</span></h3>${xs.map(x => filaElemento(x, { franja: true, notas: true })).join('')}`).join('');
}
// Cifras de la newsletter (apertura, clics, ventas) de los envíos hechos
function resumenNewsletter() {
  const env = D.tareas.filter(t => t.cat === 'newsletter' && /Newsletter/i.test(t.canal || '') && esHecho(t.estado));
  if (!env.length) return '';
  const conAp = env.filter(t => t.apertura !== undefined && t.apertura !== '');
  const ap = conAp.length ? conAp.reduce((a, t) => a + Number(t.apertura), 0) / conAp.length : null;
  const ctr = env.filter(t => t.clics && t.destinatarios).map(t => t.clics / t.destinatarios);
  const ventas = env.reduce((a, t) => a + (Number(t.ventas) || 0), 0), ingresos = env.reduce((a, t) => a + (Number(t.ingresos) || 0), 0);
  return `<div class="cifras"><div><b>${env.length}</b><span>envíos hechos</span></div><div><b>${ap == null ? '—' : ap.toLocaleString('es-ES', { maximumFractionDigits: 1 }) + ' %'}</b><span>apertura media</span></div>
    <div><b>${ctr.length ? (ctr.reduce((a, b) => a + b, 0) / ctr.length * 100).toLocaleString('es-ES', { maximumFractionDigits: 1 }) + ' %' : '—'}</b><span>CTR medio</span></div>
    <div><b>${ventas}</b><span>ventas atribuidas</span></div><div><b>${ingresos.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</b><span>ingresos</span></div></div>`;
}
