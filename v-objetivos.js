'use strict';
// =====================================================================
//  Planner — Objetivos: las metas del mes, del trimestre y del año
//  (no las tareas del día). Cada periodo muestra sus objetivos y
//  cuántas tareas llevas hechas.
// =====================================================================

function tareasDeObjetivo(cat, ym, lista) {
  const s = quitarTildes(cat);
  const f = /novela/.test(s) ? x => x.cat === 'novela' : /formacion/.test(s) ? x => x.cat === 'formacion' : /^web/.test(s) ? x => x.cat === 'web'
    : /newsletter/.test(s) ? x => x.cat === 'newsletter' && !/Blog/i.test(x.ref.canal || '') : /blog/.test(s) ? x => x.cat === 'newsletter' && /Blog/i.test(x.ref.canal || '')
    : /redes/.test(s) ? x => x.cat === 'redes' : /etsy/.test(s) ? x => x.cat === 'etsy' : /club/.test(s) ? x => x.cat === 'club' : /nino/.test(s) ? x => x.cat === 'ninos'
    : /casa/.test(s) ? x => x.cat === 'casa' : /medic/.test(s) ? x => x.cat === 'medicos' : null;
  if (!f) return null;
  const meses = Array.isArray(ym) ? ym : [ym];
  return lista.filter(x => meses.includes(mesDe(x.fecha)) && f(x) && !esAnulada(x.estado));
}

VISTAS.objetivos = (cont) => {
  const H = hoy();
  const Y = UI.oAnio || aFecha(H).getFullYear();
  const vista = UI.oVista || 'mes';
  const todo = elementos({ desde: `${Y}-01-01`, hasta: `${Y}-12-31`, conEventos: false });
  const estados = D.listas.estados.objetivos;
  const mesHoy = aFecha(H).getMonth() + 1, triHoy = Math.ceil(mesHoy / 3), esteAnio = aFecha(H).getFullYear() === Y;

  // Una tarjeta de periodo: sus objetivos y las tareas de esos meses
  const tarjeta = ({ titulo, actual, objs, meses, add }) => {
    const del = todo.filter(x => meses.includes(mesDe(x.fecha)) && !esAnulada(x.estado));
    return `<section class="tarjeta mes-obj ${actual ? 'actual' : ''}">
      <div class="t-cab"><h3>${titulo}${actual ? ` <span class="pill">${vista === 'mes' ? 'este mes' : vista === 'trimestre' ? 'este trimestre' : 'este año'}</span>` : ''}</h3><button class="icono" data-add='${JSON.stringify(add)}' title="Añadir objetivo">＋</button></div>
      <p class="tenue cifras-mes">🎯 ${objs.filter(o => esHecho(o.estado)).length}/${objs.length} conseguidos · ✅ ${del.filter(x => esHecho(x.estado)).length}/${del.length} tareas</p>
      <ul class="objs">${objs.map(o => {
        const ts = tareasDeObjetivo(o.cat, meses, todo);
        return `<li data-obj="${o.id}" class="${esHecho(o.estado) ? 'hecho' : ''} ${esAnulada(o.estado) ? 'anulada' : ''}"><button class="check" data-ocheck>${esHecho(o.estado) ? '✓' : ''}</button>
          <span>${esc(o.texto)}<small>${esc(o.cat || '')}${ts ? ` · ${plural(ts.length, 'tarea', 'tareas')}, ${ts.filter(x => esHecho(x.estado)).length} ✅` : ''}</small></span>
          <select data-oest aria-label="Estado">${estados.map(e => `<option${e === o.estado ? ' selected' : ''}>${esc(e)}</option>`).join('')}</select></li>`;
      }).join('') || '<li class="vacio">Sin objetivos</li>'}</ul>
    </section>`;
  };
  const delAnio = D.objetivos.filter(o => o.anio === Y);
  const mesesDe = (t) => [0, 1, 2].map(i => `${Y}-${pad((t - 1) * 3 + 1 + i)}`);
  let cuerpo;
  if (vista === 'trimestre') {
    cuerpo = `<div class="meses-obj obj-tri">${[1, 2, 3, 4].map(t => tarjeta({ titulo: TRIMESTRES[t - 1].replace(/^(\S+) trimestre/, '$1 trimestre'), actual: esteAnio && t === triHoy,
      objs: delAnio.filter(o => periodoObj(o) === 'trimestre' && o.trimestre === t), meses: mesesDe(t), add: { periodo: 'trimestre', trimestre: t } })).join('')}</div>`;
  } else if (vista === 'año') {
    cuerpo = `<div class="obj-anio">${tarjeta({ titulo: `Objetivos de ${Y}`, actual: esteAnio, objs: delAnio.filter(o => periodoObj(o) === 'año'),
      meses: MESES.map((_, i) => `${Y}-${pad(i + 1)}`), add: { periodo: 'año' } })}</div>`;
  } else {
    cuerpo = `<div class="meses-obj">${MESES.map((m, i) => {
      const mes = i + 1, ym = `${Y}-${pad(mes)}`;
      const objs = delAnio.filter(o => periodoObj(o) === 'mes' && o.mes === mes);
      const hayTareas = todo.some(x => mesDe(x.fecha) === ym && !esAnulada(x.estado));
      if (!objs.length && !hayTareas && ym < mesDe(H)) return '';
      return tarjeta({ titulo: may(m), actual: mesDe(H) === ym, objs, meses: [ym], add: { periodo: 'mes', mes } });
    }).join('')}</div>`;
  }
  const subt = { mes: 'Las metas de cada mes', trimestre: 'Las metas de cada trimestre', 'año': 'Las metas del año' }[vista] + ' (lo que quieres conseguir), no las tareas del día a día.';

  cont.innerHTML = `<div class="pagina ancha objetivos">
    ${cabecera('🎯 Objetivos', subt,
      `<div class="nav-cal"><button class="icono" id="ob-ant">‹</button><h2 class="titulo-cal">${Y}</h2><button class="icono" id="ob-sig">›</button></div><button class="btn prim" id="ob-nuevo">+ Objetivo</button>`)}
    <div class="barra-filtros"><div class="segmentado">${PERIODOS_OBJ.map(([k, t]) => `<button data-ovista="${k}" class="${k === vista ? 'on' : ''}">${t} <small class="tenue">${delAnio.filter(o => periodoObj(o) === k).length}</small></button>`).join('')}</div></div>
    ${cuerpo}</div>`;

  $('#ob-ant', cont).onclick = () => { UI.oAnio = Y - 1; guardarUI(); pintar(); };
  $('#ob-sig', cont).onclick = () => { UI.oAnio = Y + 1; guardarUI(); pintar(); };
  $$('[data-ovista]', cont).forEach(b => b.onclick = () => { UI.oVista = b.dataset.ovista; guardarUI(); pintar(); });
  const base = { periodo: vista, anio: Y, estado: estados[0] };
  if (vista === 'mes') base.mes = esteAnio ? mesHoy : 1;
  if (vista === 'trimestre') base.trimestre = esteAnio ? triHoy : 1;
  $('#ob-nuevo', cont).onclick = () => editarObjetivo({ ...base }, { nueva: true });
  $$('[data-add]', cont).forEach(b => b.onclick = () => editarObjetivo({ anio: Y, estado: estados[0], ...JSON.parse(b.dataset.add) }, { nueva: true }));
  $$('[data-obj]', cont).forEach(li => {
    const o = D.objetivos.find(x => x.id === li.dataset.obj);
    li.onclick = (e) => {
      if (e.target.closest('select')) return;
      if (e.target.closest('[data-ocheck]')) { o.estado = esHecho(o.estado) ? estados[0] : '✅Conseguido'; cambio(); return; }
      editarObjetivo(o);
    };
    $('[data-oest]', li).onchange = (e) => { o.estado = e.target.value; cambio(); };
  });
};
