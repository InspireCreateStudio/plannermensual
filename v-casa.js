'use strict';
// =====================================================================
//  Planner — Casa: lista de la compra, menú del mes (con el batch de
//  cocina por semanas) y las tareas de casa.
// =====================================================================

VISTAS.casa = (cont) => {
  const p = UI.cPest || 'compra';
  const pend = D.compra.filter(c => !c.comprado).length;
  cont.innerHTML = `<div class="pagina ancha casa">${cabecera('🏡 Casa', '')}
    ${pestanas([['compra', `🛒 Lista de la compra${pend ? ` (${pend})` : ''}`], ['menu', '🍽️ Menú'], ['tareas', '🏡 Tareas de casa']], p, 'cPest')}
    <div id="ca-cuerpo"></div></div>`;
  enlazarPestanas(cont);
  const c = $('#ca-cuerpo', cont);
  if (p === 'menu') casaMenu(c); else if (p === 'tareas') casaTareas(c); else casaCompra(c);
};

// ---------- lista de la compra ----------
// Añade un artículo; si ya estaba (comprado), lo vuelve a poner y recuerda su súper y su tipo
function anadirCompra(a, sup = '', cat = '') {
  const previo = D.compra.find(i => quitarTildes(i.articulo) === quitarTildes(a));
  if (previo) { previo.comprado = false; if (sup) previo.super = sup; if (cat) previo.cat = cat; }
  else D.compra.push({ id: uid(), articulo: a, super: sup, cat, comprado: false });
}
function casaCompra(c) {
  const porSuper = UI.cAgrupar !== 'cat';
  const grupos = new Map();
  const orden = porSuper ? D.listas.supers : D.listas.catCompra;
  D.compra.forEach(i => { const k = (porSuper ? i.super : i.cat) || 'Sin elegir'; if (!grupos.has(k)) grupos.set(k, []); grupos.get(k).push(i); });
  const claves = [...grupos.keys()].sort((a, b) => (orden.indexOf(a) + 1 || 99) - (orden.indexOf(b) + 1 || 99));
  const comprados = D.compra.filter(i => i.comprado).length;
  c.innerHTML = `<form class="captura tarjeta" id="co-form">
      <input id="co-art" placeholder="Añadir a la lista… (p. ej. leche)" autocomplete="off">
      <select id="co-super" aria-label="Supermercado"><option value="">Súper…</option>${D.listas.supers.map(s => `<option${s === UI.cUltSuper ? ' selected' : ''}>${esc(s)}</option>`).join('')}</select>
      <select id="co-cat" aria-label="Categoría"><option value="">Tipo…</option>${D.listas.catCompra.map(s => `<option>${esc(s)}</option>`).join('')}</select>
      <button class="btn prim">Añadir</button></form>
    <div class="barra-filtros"><div class="segmentado"><button data-agr="super" class="${porSuper ? 'on' : ''}">Por súper</button><button data-agr="cat" class="${!porSuper ? 'on' : ''}">Por tipo</button></div><span class="hueco"></span>
      <button class="btn peq" id="co-copiar">Copiar lista</button>${comprados ? `<button class="btn peq" id="co-limpiar">Quitar comprados (${comprados})</button>` : ''}</div>
    <div class="compra">${claves.map(k => `<section class="tarjeta"><h2>${esc(k)}</h2><ul>${grupos.get(k).sort((a, b) => a.comprado - b.comprado).map(i => `
      <li class="${i.comprado ? 'hecho' : ''}" data-art="${i.id}"><label><input type="checkbox"${i.comprado ? ' checked' : ''}> <span>${esc(i.articulo)}</span></label><small>${esc((porSuper ? i.cat : i.super) || '')}</small><button class="icono" data-quitar title="Quitar">✕</button></li>`).join('')}</ul></section>`).join('') || '<p class="vacio">La lista está vacía</p>'}</div>`;
  $('#co-form', c).onsubmit = (e) => {
    e.preventDefault();
    const a = $('#co-art', c).value.trim(); if (!a) return;
    // Si ya lo compraste antes, recuerda su súper y su tipo
    anadirCompra(a, $('#co-super', c).value, $('#co-cat', c).value);
    UI.cUltSuper = $('#co-super', c).value; guardarUI(); cambio();
    setTimeout(() => $('#co-art').focus(), 40);
  };
  $$('[data-agr]', c).forEach(b => b.onclick = () => { UI.cAgrupar = b.dataset.agr; guardarUI(); pintar(); });
  $$('[data-art]', c).forEach(li => {
    const i = D.compra.find(x => x.id === li.dataset.art);
    $('input', li).onchange = (e) => { i.comprado = e.target.checked; cambio(); };
    $('[data-quitar]', li).onclick = () => borrarConDeshacer('compra', i.id, `«${i.articulo}» quitado`);
  });
  $('#co-copiar', c).onclick = async () => {
    const txt = claves.map(k => `${k}:\n${grupos.get(k).filter(i => !i.comprado).map(i => '- ' + i.articulo).join('\n')}`).filter(t => t.includes('- ')).join('\n\n');
    try { await navigator.clipboard.writeText(txt); aviso('Lista copiada: pégala en WhatsApp o donde quieras'); } catch (e) { aviso('No he podido copiarla'); }
  };
  if ($('#co-limpiar', c)) $('#co-limpiar', c).onclick = () => {
    const antes = [...D.compra]; D.compra = D.compra.filter(i => !i.comprado); cambio();
    aviso('Comprados quitados', { t: 'Deshacer', fn: () => { D.compra = antes; cambio(); } });
  };
}

// ---------- menú del mes ----------
function casaMenu(c) {
  if (!UI.mMes) UI.mMes = mesDe(hoy());
  const ym = UI.mMes, H = hoy();
  const semanas = semanasDelMes(ym);
  const verComidas = UI.mComidas || ['comida', 'cena'];
  c.innerHTML = `<div class="nav-cal"><button class="icono" id="me-ant">‹</button><h2 class="titulo-cal">${nombreMes(ym)}</h2><button class="icono" id="me-sig">›</button>
      <span class="hueco"></span><span class="tenue">Ver:</span>${COMIDAS.map(([k, t]) => `<label class="check-peq"><input type="checkbox" data-com="${k}"${verComidas.includes(k) ? ' checked' : ''}> ${t}</label>`).join('')}</div>
    <datalist id="me-platos">${[...new Set(Object.values(D.menu).flatMap(m => Object.values(m)))].sort().map(p => `<option value="${esc(p)}">`).join('')}</datalist>
    <datalist id="me-cong">${D.congelador.map(p => `<option value="${esc(p)}">`).join('')}</datalist>
    <datalist id="me-tengo">${D.despensa.map(p => `<option value="${esc(p)}">`).join('')}</datalist>
    ${semanas.map((s, i) => {
      const k = s[0]; const co = D.cocina[k] || {};
      return `<section class="tarjeta semana-menu">
        <div class="t-cab"><h2>🍽️ Semana ${i + 1} · ${fechaDM(s[0])} – ${fechaDM(s[6])}</h2><button class="btn peq" data-hacer-compra="${k}">🛒 Preparar la compra</button></div>
        <div class="cocina"><label class="campo tercio"><span>🍳 Batch: qué cocinas</span><input data-coc="${k}" data-ck="cocinas" value="${esc(co.cocinas || '')}" placeholder="p. ej. lentejas + albóndigas"></label>
          <label class="campo tercio"><span>❄️ Qué tengo en el congelador</span><input data-coc="${k}" data-ck="congelador" value="${esc(co.congelador || '')}" list="me-cong"></label>
          <label class="campo tercio"><span>🥫 Qué tengo en la despensa</span><input data-coc="${k}" data-ck="tengo" value="${esc(co.tengo || '')}" list="me-tengo"></label></div>
        <div class="tabla-menu" style="--n:${verComidas.length}"><div></div>${COMIDAS.filter(([k]) => verComidas.includes(k)).map(([, t]) => `<div class="cab">${t}</div>`).join('')}
          ${s.map(f => `<div class="dia-menu ${mesDe(f) !== ym ? 'fuera' : ''} ${f === H ? 'hoy' : ''}">${may(DIAS[diaSemana(f)]).slice(0, 3)} ${aFecha(f).getDate()}</div>${COMIDAS.filter(([k]) => verComidas.includes(k)).map(([cm]) => `<input data-dia="${f}" data-comida="${cm}" value="${esc((D.menu[f] || {})[cm] || '')}" list="me-platos" aria-label="${cm} ${f}">`).join('')}`).join('')}
        </div></section>`;
    }).join('')}
    <section class="tarjeta"><h2>⚙️ Qué suelo tener (para elegir rápido)</h2>
      <div class="cocina"><label class="campo medio"><span>❄️ Congelador</span><textarea id="me-cong-l" rows="6">${esc(D.congelador.join('\n'))}</textarea></label>
        <label class="campo medio"><span>🥫 Despensa</span><textarea id="me-desp" rows="6">${esc(D.despensa.join('\n'))}</textarea></label></div>
      <p class="tenue">Una cosa por línea.</p></section>`;
  $('#me-ant', c).onclick = () => { UI.mMes = sumarMeses(ym, -1); guardarUI(); pintar(); };
  $('#me-sig', c).onclick = () => { UI.mMes = sumarMeses(ym, 1); guardarUI(); pintar(); };
  $$('[data-com]', c).forEach(b => b.onchange = () => { UI.mComidas = $$('[data-com]:checked', c).map(x => x.dataset.com); if (!UI.mComidas.length) UI.mComidas = ['comida']; guardarUI(); pintar(); });
  $$('[data-comida]', c).forEach(i => i.onchange = () => {
    const f = i.dataset.dia; const m = D.menu[f] || (D.menu[f] = {});
    if (i.value.trim()) m[i.dataset.comida] = i.value.trim(); else delete m[i.dataset.comida];
    if (!Object.keys(m).length) delete D.menu[f];
    cambio(false);
  });
  $$('[data-coc]', c).forEach(i => i.onchange = () => {
    const k = i.dataset.coc; const o = D.cocina[k] || (D.cocina[k] = {});
    o[i.dataset.ck] = i.value.trim(); if (!o.cocinas && !o.tengo && !o.congelador) delete D.cocina[k];
    cambio(false);
  });
  $$('[data-hacer-compra]', c).forEach(b => b.onclick = () => compraDelMenu(b.dataset.hacerCompra));
  $('#me-desp', c).onchange = (e) => { D.despensa = e.target.value.split('\n').map(s => s.trim()).filter(Boolean); cambio(false); };
  $('#me-cong-l', c).onchange = (e) => { D.congelador = e.target.value.split('\n').map(s => s.trim()).filter(Boolean); cambio(false); };
}

// ---------- tareas de casa ----------
function casaTareas(c) {
  const lista = elementos({ conEventos: false, conPiezas: false }).filter(x => x.cat === 'casa' && (UI.cVerHechas || pendiente(x))).sort(ordenFecha);
  c.innerHTML = `<div class="barra-filtros"><button class="btn prim" id="ct-nueva">+ Tarea de casa</button><span class="hueco"></span><label class="check-peq"><input type="checkbox" id="ct-hechas"${UI.cVerHechas ? ' checked' : ''}> ver hechas</label></div>
    <div class="lista grande" id="ct-lista">${lista.map(x => filaElemento(x, { franja: true, notas: true })).join('') || '<p class="vacio">Nada pendiente en casa 🎉</p>'}</div>`;
  enlazarItems($('#ct-lista', c), lista);
  $('#ct-nueva', c).onclick = () => nuevaTarea({ cat: 'casa' });
  $('#ct-hechas', c).onchange = (e) => { UI.cVerHechas = e.target.checked; guardarUI(); pintar(); };
}

// ---------- del menú a la lista de la compra ----------
const claveReceta = (p) => quitarTildes(p).toLowerCase().replace(/\s+/g, ' ').trim();
const partirLista = (s) => (s || '').split(/[,\n;]+/).map(x => x.trim()).filter(Boolean);
function platosDeSemana(lunes) {
  const ps = [];
  for (let i = 0; i < 7; i++) Object.values(D.menu[sumarDias(lunes, i)] || {}).forEach(p => ps.push(p));
  partirLista(((D.cocina[lunes] || {}).cocinas || '').replace(/\s\+\s/g, ',')).forEach(p => ps.push(p));
  const vistos = new Set();
  return ps.filter(p => { const k = claveReceta(p); if (!k || vistos.has(k)) return false; vistos.add(k); return true; });
}
function compraDelMenu(lunes) {
  const platos = platosDeSemana(lunes);
  if (!platos.length) { aviso('Esa semana aún no tiene menú'); return; }
  modal(`<h3>🛒 Compra de la semana del ${fechaDM(lunes)}</h3>
    <p class="suave" style="margin-top:0">Lo que lleva cada plato, separado por comas. Lo que escribas se queda guardado para las próximas semanas.</p>
    <div class="form">${platos.map((p, i) => `<label class="campo"><span>${esc(p)}</span><input data-plato="${i}" value="${esc((D.recetas[claveReceta(p)] || []).join(', '))}" placeholder="p. ej. lentejas, zanahoria, chorizo"></label>`).join('')}</div>
    <div class="pie"><button class="btn" data-cerrar>Cancelar</button><button class="btn prim" id="cm-sig">Siguiente</button></div>`, {
    clase: 'ficha',
    alAbrir: (m, cerrar) => {
      $('#cm-sig', m).onclick = () => {
        const todos = new Map();
        platos.forEach((p, i) => {
          const ing = partirLista($(`[data-plato="${i}"]`, m).value);
          if (ing.length) D.recetas[claveReceta(p)] = ing; else delete D.recetas[claveReceta(p)];
          ing.forEach(x => { const k = quitarTildes(x).toLowerCase(); if (!todos.has(k)) todos.set(k, { x, platos: [] }); todos.get(k).platos.push(p); });
        });
        cambio(false); cerrar();
        if (!todos.size) { aviso('No has puesto ingredientes'); return; }
        elegirCompra([...todos.values()]);
      };
    }
  });
}
function elegirCompra(lista) {
  const yaEnLista = (x) => D.compra.some(i => !i.comprado && quitarTildes(i.articulo).toLowerCase() === quitarTildes(x).toLowerCase());
  modal(`<h3>¿Qué te falta?</h3><p class="suave" style="margin-top:0">Quita lo que ya tienes en casa.</p>
    <ul class="elegir-compra">${lista.map((o, i) => `<li><label><input type="checkbox" data-ing="${i}"${yaEnLista(o.x) ? '' : ' checked'}> <span>${esc(o.x)}</span></label><small>${yaEnLista(o.x) ? 'ya está en la lista' : esc(o.platos.join(', '))}</small></li>`).join('')}</ul>
    <div class="pie"><button class="btn" data-cerrar>Cancelar</button><button class="btn prim" id="ec-ok">Añadir a la compra</button></div>`, {
    clase: 'ficha',
    alAbrir: (m, cerrar) => {
      const contar = () => { $('#ec-ok', m).textContent = `Añadir ${$$('[data-ing]:checked', m).length} a la compra`; };
      m.addEventListener('change', contar); contar();
      $('#ec-ok', m).onclick = () => {
        const sel = $$('[data-ing]:checked', m).map(c => lista[+c.dataset.ing].x);
        sel.forEach(x => anadirCompra(x)); cambio(); cerrar();
        aviso(`${plural(sel.length, 'cosa añadida', 'cosas añadidas')} a la compra`, { t: 'Ver', fn: () => { UI.cPest = 'compra'; guardarUI(); irA('casa'); } });
      };
    }
  });
}
