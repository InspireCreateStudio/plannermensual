'use strict';
// =====================================================================
//  Mi Planner — Casa › Gastos de casa: todos los gastos del hogar,
//  por categoría (supermercado, suscripciones, colegio…), con el
//  movimiento del banco subido desde un CSV o Excel.
// =====================================================================
UI.cgBuscar = ''; // la búsqueda no se guarda de una vez para otra
const CATS_CASA = ['Supermercado', 'Casa (alquiler o hipoteca)', 'Hogar y bricolaje', 'Luz, agua y gas', 'Internet y móvil', 'Suscripciones', 'Colegio', 'Extraescolares', 'Transporte', 'Coche', 'Salud y farmacia', 'Ropa', 'Ocio', 'Restaurantes', 'Seguros', 'Mascotas', 'Regalos', 'Viajes', 'Impuestos y tasas', 'Otros'];
// Palabras que delatan la categoría (además de lo que tú vayas corrigiendo, que se recuerda)
const PISTAS_CASA = [
  ['Supermercado', /mercadona|lidl|eroski|carrefour|\bdia\b|alcampo|aldi|\bbm\b|caprabo|consum|hipercor|ahorramas|gadis|simply|supermerc|super\b|froiz|bonpreu|condis|masymas|spar|frutas?|carnic|panader|pescader/],
  ['Suscripciones', /netflix|spotify|hbo|\bmax\b|disney|prime video|amazon prime|apple\.com|icloud|google (one|storage)|youtube|audible|kindle unlimited|storytel|movistar\+|filmin|dazn|canva|chatgpt|openai|patreon|suscrip/],
  ['Luz, agua y gas', /iberdrola|endesa|naturgy|repsol luz|holaluz|octopus|totalenergies|\bluz\b|\bagua\b|\bgas\b|aguas de|amvisa|canal de isabel|consorcio de aguas|electric/],
  ['Internet y móvil', /movistar|vodafone|orange|\bjazztel|masmovil|\bpepephone|\bdigi\b|lowi|simyo|euskaltel|yoigo|o2\b|finetwork|fibra/],
  ['Casa (alquiler o hipoteca)', /alquiler|hipoteca|prestamo hipot|comunidad de propietarios|comunidad prop/],
  ['Hogar y bricolaje', /ferreter|leroy|ikea|bricomart|bauhaus|brico|aki\b|conforama|jysk|maisons du monde|tiger|merkamueble|mueble|electrodomest|mediamarkt|worten/],
  ['Colegio', /colegio|ikastola|escuela|ampa|comedor|guarderia|haurreskola|matricula|libros de texto|uniforme/],
  ['Extraescolares', /extraescolar|academia|natacion|futbol|danza|ballet|musica|ingles|kumon|polideportivo|club deportivo/],
  ['Transporte', /renfe|\bbus\b|autobus|tuvisa|bizkaibus|metro|euskotren|taxi|cabify|uber|blablacar|parking|aparcamiento|peaje|ota\b/],
  ['Coche', /repsol|cepsa|\bbp\b|galp|shell|petronor|gasolin|carburante|taller|itv|neumatic|lavado/],
  ['Salud y farmacia', /farmacia|dentist|clinica|medic|optica|fisio|hospital|sanitas|adeslas|asisa|dkv/],
  ['Ropa', /zara|primark|h&m|\bhm\b|mango|kiabi|decathlon|bershka|pull&bear|stradivarius|lefties|shein|vinted|calzado|zapater/],
  ['Restaurantes', /restaurante|bar\b|cafeter|pizzer|burger|mcdonald|telepizza|glovo|just eat|uber eats|deliveroo|kebab/],
  ['Ocio', /cine|teatro|entradas|ticketmaster|museo|parque|steam|playstation|nintendo|libreria|fnac|casa del libro/],
  ['Seguros', /seguro|mapfre|axa|allianz|mutua|linea directa|generali|zurich|reale|ocaso|santalucia/],
  ['Mascotas', /veterinar|tiendanimal|kiwoko|zooplus|mascota/],
  ['Impuestos y tasas', /hacienda|agencia tributaria|ayuntamiento|ibi\b|impuesto|tasa|diputacion|ivtm|basuras/],
  ['Viajes', /booking|airbnb|ryanair|vueling|iberia|hotel|edreams|renfe viajeros|alsa/],
];
const normCasa = (t) => String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();
const claveConcepto = (t) => normCasa(t).replace(/\d+/g, ' ').replace(/[^a-z ]/g, ' ').split(' ').filter(w => w.length > 2 && !['compra', 'pago', 'tarjeta', 'tarj', 'tjta', 'operacion', 'num', 'recibo', 'transferencia', 'bizum', 'cargo', 'adeudo', 'com', 'tpv', 'con', 'del', 'los', 'las', 'www'].includes(w)).slice(0, 3).join(' ');
function adivinarCat(concepto) {
  const c = normCasa(concepto), k = claveConcepto(concepto);
  // Primero las tuyas (las escritas a mano, las más largas antes), luego las aprendidas al corregir, luego las de serie
  const reglas = (D.reglasCasa || []).slice().sort((a, b) => (b.mano ? 1 : 0) - (a.mano ? 1 : 0) || b.clave.length - a.clave.length);
  const r = reglas.find(x => x.clave && (k === x.clave || c.includes(x.clave)));
  const vale = (cat) => catsCasa().includes(cat) ? cat : 'Otros';
  if (r) return vale(r.cat);
  const p = PISTAS_CASA.find(([, re]) => re.test(c));
  if (!p) return 'Otros';
  const ren = (D.listas && D.listas.catCasaRen) || {};
  return vale(ren[p[0]] || p[0]);
}
function recordarCat(concepto, cat) {
  const k = claveConcepto(concepto); if (!k) return;
  D.reglasCasa = (D.reglasCasa || []).filter(x => x.clave !== k);
  D.reglasCasa.push({ clave: k, cat });
}
const eurC = (v) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(Math.round((Number(v) || 0) * 100) / 100);
const catsCasa = () => [...new Set([...(D.listas.catCasa || CATS_CASA), ...(D.gastosCasa || []).map(g => g.cat).filter(Boolean)])];
const colorCatC = (c) => { let h = 0; for (const ch of String(c)) h = (h * 31 + ch.charCodeAt(0)) % 360; return h; };

VISTAS.gastos = (cont) => {
  cont.innerHTML = `<div class="pagina ancha">${cabecera('💶 Gastos de casa', '')}<div id="cg-cuerpo"></div></div>`;
  casaGastos($('#cg-cuerpo', cont));
};

function casaGastos(c) {
  if (!D.gastosCasa) D.gastosCasa = [];
  const mes = UI.cgMes || hoy().slice(0, 7), Y = mes.slice(0, 4), vista = UI.cgVista || 'mes';
  const delMes = D.gastosCasa.filter(g => (g.fecha || '').startsWith(mes)).sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));
  const filtro = UI.cgCat || '';
  const filas = filtro ? delMes.filter(g => g.cat === filtro) : delMes;
  const total = delMes.reduce((a, g) => a + (+g.importe || 0), 0);
  const mesAnt = (() => { const d = aFecha(mes + '-01'); d.setMonth(d.getMonth() - 1); return aStr(d).slice(0, 7); })();
  const totalAnt = D.gastosCasa.filter(g => (g.fecha || '').startsWith(mesAnt)).reduce((a, g) => a + (+g.importe || 0), 0);
  const delAnio = D.gastosCasa.filter(g => (g.fecha || '').startsWith(Y));
  const mesesConGasto = new Set(delAnio.map(g => g.fecha.slice(0, 7))).size || 1;
  const porCat = {}; delMes.forEach(g => { porCat[g.cat || 'Otros'] = (porCat[g.cat || 'Otros'] || 0) + (+g.importe || 0); });
  const cats = Object.entries(porCat).sort((a, b) => b[1] - a[1]), maxC = Math.max(1, ...cats.map(x => x[1]));
  const nombreM = (m) => `${MESES[+m.slice(5) - 1]} ${m.slice(0, 4)}`;
  const pill = (cat) => `<span class="pill-cc" style="--h:${colorCatC(cat)}">${esc(cat || 'Otros')}</span>`;
  // Resumen del año: categorías × meses
  const anioCat = () => {
    const xs = delAnio.filter(g => (g.cat || 'Otros') === filtro).sort((a, b) => a.fecha.localeCompare(b.fecha));
    if (!xs.length) return `<p class="vacio">No hay gastos de ${esc(filtro)} en ${Y}.</p>`;
    const meses = Array.from({ length: 12 }, (_, i) => `${Y}-${pad(i + 1)}`);
    const tm = meses.map(m => xs.filter(g => g.fecha.startsWith(m)).reduce((s, g) => s + +g.importe, 0));
    const tot = tm.reduce((a, b) => a + b, 0), conG = tm.filter(Boolean).length || 1, max = Math.max(...tm, 1);
    const totalAnio = delAnio.reduce((s, g) => s + +g.importe, 0);
    const porConc = {}; xs.forEach(g => { const k = claveConcepto(g.concepto) || normCasa(g.concepto); (porConc[k] = porConc[k] || { n: 0, t: 0, nom: g.concepto }).n++; porConc[k].t += +g.importe; });
    const conc = Object.values(porConc).sort((a, b) => b.t - a.t);
    return `<div class="cifras cg-cifras"><div><span>${esc(filtro)} en ${Y}</span><b>${eurC(tot)}</b><small>${Math.round(tot / (totalAnio || 1) * 100)} % de todo lo gastado</small></div>
        <div><span>Media al mes</span><b>${eurC(tot / conG)}</b><small>${plural(conG, 'mes con gastos', 'meses con gastos')}</small></div>
        <div><span>Apuntes</span><b>${xs.length}</b><small>el mayor, ${eurC(Math.max(...xs.map(g => +g.importe)))}</small></div></div>
      <div class="cg-meses">${meses.map((m, i) => `<button class="cg-mesbar${tm[i] ? '' : ' cero'}" data-cgir="${m}" title="Ver ${MESES[i]}"><i style="--alto:${Math.round(tm[i] / max * 100)}%;--h:${colorCatC(filtro)}"></i><b>${tm[i] ? new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0 }).format(tm[i]) : ''}</b><span>${MESES_C[i]}</span></button>`).join('')}</div>
      ${conc.length > 1 ? `<h3 class="cg-h3">Por concepto</h3><div class="cg-conc">${conc.slice(0, 12).map(c => `<div><span>${esc(c.nom)}</span><small class="tenue">${c.n} ×</small><b>${eurC(c.t)}</b></div>`).join('')}</div>` : ''}
      <h3 class="cg-h3">Todos los gastos de ${esc(filtro)} en ${Y}</h3>
      <div class="tabla-wrap"><table class="tabla cg-tabla"><thead><tr><th>Fecha</th><th>Concepto</th><th class="num">Importe</th></tr></thead><tbody>
      ${meses.map((m, i) => { const ms = xs.filter(g => g.fecha.startsWith(m)); return ms.length ? `<tr class="cg-sub"><td colspan="2">${MESES[i]}</td><td class="num">${eurC(tm[i])}</td></tr>` + ms.map(g => `<tr data-id="${g.id}"><td>${+g.fecha.slice(8)} ${MESES_C[i]}</td><td>${esc(g.concepto)}${g.notas ? `<small class="bloque">${esc(g.notas)}</small>` : ''}</td><td class="num">${eurC(g.importe)}</td></tr>`).join('') : ''; }).join('')}
      </tbody><tfoot><tr><td></td><td><b>Total ${Y}</b></td><td class="num"><b>${eurC(tot)}</b></td></tr></tfoot></table></div>`;
  };
  const anio = () => {
    const meses = Array.from({ length: 12 }, (_, i) => `${Y}-${pad(i + 1)}`);
    const cs = [...new Set(delAnio.map(g => g.cat || 'Otros'))].sort((a, b) => delAnio.filter(g => (g.cat || 'Otros') === b).reduce((s, g) => s + +g.importe, 0) - delAnio.filter(g => (g.cat || 'Otros') === a).reduce((s, g) => s + +g.importe, 0));
    const v = (cat, m) => delAnio.filter(g => (g.cat || 'Otros') === cat && g.fecha.startsWith(m)).reduce((s, g) => s + +g.importe, 0);
    const tm = (m) => delAnio.filter(g => g.fecha.startsWith(m)).reduce((s, g) => s + +g.importe, 0);
    const n0 = (x) => x ? new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0 }).format(x) : '<span class="tenue">·</span>';
    return !delAnio.length ? `<p class="vacio">Aún no hay gastos de casa en ${Y}.</p>` : `<div class="tabla-wrap"><table class="tabla cg-anio"><thead><tr><th>Categoría</th>${meses.map(m => `<th class="num">${MESES_C[+m.slice(5) - 1]}</th>`).join('')}<th class="num">Total</th><th class="num">Al mes</th></tr></thead>
      <tbody>${cs.map(cat => { const t = meses.reduce((s, m) => s + v(cat, m), 0); return `<tr data-cgfila="${esc(cat)}" title="Ver todo lo de ${esc(cat)}"><td>${pill(cat)}</td>${meses.map(m => `<td class="num">${n0(v(cat, m))}</td>`).join('')}<td class="num"><b>${eurC(t)}</b></td><td class="num">${eurC(t / mesesConGasto)}</td></tr>`; }).join('')}</tbody>
      <tfoot><tr><td><b>Total</b></td>${meses.map(m => `<td class="num"><b>${n0(tm(m))}</b></td>`).join('')}<td class="num"><b>${eurC(delAnio.reduce((s, g) => s + +g.importe, 0))}</b></td><td class="num">${eurC(delAnio.reduce((s, g) => s + +g.importe, 0) / mesesConGasto)}</td></tr></tfoot></table></div>
      <p class="nota">En euros. «Al mes» es la media de los meses en los que hay gastos apuntados (${mesesConGasto}).</p>`;
  };
  // Buscar un concepto en todos los gastos (de cualquier fecha) y pasarlos a una categoría
  const busca = normCasa(UI.cgBuscar || '');
  const encontrados = busca ? D.gastosCasa.filter(g => normCasa(g.concepto + ' ' + (g.notas || '')).includes(busca)).sort((a, b) => (b.fecha || '').localeCompare(a.fecha || '')) : [];
  const buscar = () => {
    if (!encontrados.length) return `<p class="vacio">Ningún gasto tiene «${esc(UI.cgBuscar)}» en el concepto.</p>`;
    const cuentaCat = {}; encontrados.forEach(g => { cuentaCat[g.cat || 'Otros'] = (cuentaCat[g.cat || 'Otros'] || 0) + 1; });
    const masUsada = Object.entries(cuentaCat).sort((a, b) => b[1] - a[1])[0][0];
    const regla = (D.reglasCasa || []).find(r => r.clave === busca);
    return `<div class="cg-pasar"><b>${plural(encontrados.length, 'gasto', 'gastos')} con «${esc(UI.cgBuscar)}»</b> · ${eurC(encontrados.reduce((s, g) => s + +g.importe, 0))}
        <span class="hueco"></span><span>Pasarlos todos a</span>
        <select id="cg-pcat">${catsCasa().map(x => `<option${x === (regla ? regla.cat : masUsada) ? ' selected' : ''}>${esc(x)}</option>`).join('')}</select>
        <label class="cg-recordar"><input type="checkbox" id="cg-precord" checked> y también los que lleguen</label>
        <button class="btn prim" id="cg-paplicar">Pasar</button></div>
      ${regla ? `<p class="nota">Ya tienes guardado que «${esc(regla.clave)}» va a ${esc(regla.cat)}.</p>` : ''}
      <div class="tabla-wrap"><table class="tabla cg-tabla"><thead><tr><th>Fecha</th><th>Concepto</th><th>Categoría</th><th class="num">Importe</th></tr></thead><tbody>
      ${encontrados.map(g => `<tr data-id="${g.id}"><td>${g.fecha ? +g.fecha.slice(8) + ' ' + MESES_C[+g.fecha.slice(5, 7) - 1] + ' ' + g.fecha.slice(2, 4) : ''}</td><td>${esc(g.concepto)}</td><td>${pill(g.cat)}</td><td class="num">${eurC(g.importe)}</td></tr>`).join('')}
      </tbody></table></div>`;
  };
  c.innerHTML = `<div class="cg-cab">
      <div class="cg-mes"><button class="btn peq" id="cg-ant" aria-label="Mes anterior">‹</button><b>${vista === 'anio' ? Y : nombreM(mes)}</b><button class="btn peq" id="cg-sig" aria-label="Mes siguiente">›</button></div>
      <div class="segmentado peq"><button class="${vista === 'mes' ? 'on' : ''}" data-cgv="mes">Mes</button><button class="${vista === 'anio' ? 'on' : ''}" data-cgv="anio">Resumen del año</button></div>
      <select id="cg-filtro" class="cg-filtro${filtro ? ' on' : ''}" aria-label="Tipo de gasto"><option value="">Todos los gastos</option>${catsCasa().map(x => `<option${x === filtro ? ' selected' : ''}>${esc(x)}</option>`).join('')}</select>
      <input type="search" id="cg-buscar" class="cg-buscar" placeholder="🔍 Buscar concepto…" value="${esc(UI.cgBuscar || '')}" aria-label="Buscar concepto">
      <span class="hueco"></span>
      <button class="btn" id="cg-csv">⬆️ Subir movimientos del banco</button><button class="btn prim" id="cg-nuevo">+ Gasto</button>
      <input type="file" id="cg-file" accept=".csv,.txt,.xlsx,.xls,text/csv" hidden></div>
    ${busca ? buscar() : vista === 'anio' ? (filtro ? anioCat() : anio()) : `
    <div class="cifras cg-cifras"><div><span>Gastado en ${MESES[+mes.slice(5) - 1]}</span><b>${eurC(total)}</b>${totalAnt ? `<small class="${total > totalAnt ? 'rojo' : 'verde-t'}">${total > totalAnt ? '▲' : '▼'} ${eurC(Math.abs(total - totalAnt))} que el mes anterior</small>` : ''}</div>
      <div><span>Media al mes en ${Y}</span><b>${eurC(delAnio.reduce((s, g) => s + +g.importe, 0) / mesesConGasto)}</b></div>
      <div><span>Lo que más</span><b>${cats[0] ? esc(cats[0][0]) : '—'}</b>${cats[0] ? `<small>${eurC(cats[0][1])}</small>` : ''}</div></div>
    ${cats.length ? `<div class="cg-cats">${cats.map(([cat, v]) => `<button class="cg-cat${filtro === cat ? ' on' : ''}" data-cgcat="${esc(cat)}"><span>${pill(cat)}</span><i style="--w:${Math.round(v / maxC * 100)}%;--h:${colorCatC(cat)}"></i><b>${eurC(v)}</b><small>${Math.round(v / (total || 1) * 100)} %</small></button>`).join('')}</div>` : ''}
    ${filtro ? `<p class="nota">Solo ${esc(filtro)} · <a href="#" id="cg-todas">ver todas</a></p>` : ''}
    ${filas.length ? `<div class="tabla-wrap"><table class="tabla cg-tabla"><thead><tr><th>Fecha</th><th>Concepto</th><th>Categoría</th><th class="num">Importe</th><th></th></tr></thead><tbody>
      ${filas.map(g => `<tr data-id="${g.id}"><td>${g.fecha ? +g.fecha.slice(8) + ' ' + MESES_C[+g.fecha.slice(5, 7) - 1] : ''}</td><td><b>${esc(g.concepto)}</b>${g.periodicidad && g.periodicidad !== 'Puntual' ? ` <span class="pill-cc gris">${esc(g.periodicidad)}</span>` : ''}${g.notas ? `<small class="bloque">${esc(g.notas)}</small>` : ''}</td>
        <td><select class="cg-sel" data-cgset="${g.id}" style="--h:${colorCatC(g.cat)}">${catsCasa().map(x => `<option${x === g.cat ? ' selected' : ''}>${esc(x)}</option>`).join('')}</select></td><td class="num"><b>${eurC(g.importe)}</b></td>
        <td><button class="btn-x" data-cgdel="${g.id}" title="Borrar" aria-label="Borrar">×</button></td></tr>`).join('')}
      </tbody><tfoot><tr><td></td><td><b>Total${filtro ? ' ' + esc(filtro) : ''}</b></td><td></td><td class="num"><b>${eurC(filas.reduce((s, g) => s + +g.importe, 0))}</b></td><td></td></tr></tfoot></table></div>`
      : `<div class="vacio"><p>No hay gastos de casa en ${nombreM(mes)}.</p><p class="tenue">Apúntalos con <b>+ Gasto</b> o sube el archivo de movimientos de tu banco: la app separa los gastos, los clasifica (supermercado, suscripciones, colegio…) y aprende de lo que corrijas.</p></div>`}`}`;

  const bq = $('#cg-buscar', c); let tBq;
  bq.oninput = () => { clearTimeout(tBq); tBq = setTimeout(() => { UI.cgBuscar = bq.value; pintar(); const n = $('#cg-buscar'); if (n) { n.focus(); n.setSelectionRange(n.value.length, n.value.length); } }, 250); };
  bq.onkeydown = (e) => { if (e.key === 'Escape') { UI.cgBuscar = ''; pintar(); } };
  const pa = $('#cg-paplicar', c);
  if (pa) pa.onclick = () => {
    const cat = $('#cg-pcat', c).value, recordar = $('#cg-precord', c).checked;
    const antes = encontrados.map(g => [g, g.cat]), reglasAntes = (D.reglasCasa || []).slice();
    encontrados.forEach(g => { g.cat = cat; });
    if (recordar) { D.reglasCasa = (D.reglasCasa || []).filter(r => r.clave !== busca); D.reglasCasa.push({ clave: busca, cat, mano: true }); }
    cambio();
    aviso(`${plural(encontrados.length, 'gasto pasado', 'gastos pasados')} a ${cat}${recordar ? '; los próximos irán solos' : ''}`, { t: 'Deshacer', fn: () => { antes.forEach(([g, c0]) => g.cat = c0); D.reglasCasa = reglasAntes; cambio(); } });
  };
  const mover = (k) => { const d = aFecha(mes + '-01'); d.setMonth(d.getMonth() + (vista === 'anio' ? 12 * k : k)); UI.cgMes = aStr(d).slice(0, 7); guardarUI(); pintar(); };
  $('#cg-ant', c).onclick = () => mover(-1); $('#cg-sig', c).onclick = () => mover(1);
  $('#cg-filtro', c).onchange = (e) => { UI.cgCat = e.target.value; guardarUI(); pintar(); };
  $$('[data-cgir]', c).forEach(b => b.onclick = () => { UI.cgMes = b.dataset.cgir; UI.cgVista = 'mes'; guardarUI(); pintar(); });
  $$('.cg-anio [data-cgfila]', c).forEach(tr => tr.onclick = () => { UI.cgCat = tr.dataset.cgfila; guardarUI(); pintar(); });
  $$('[data-cgv]', c).forEach(b => b.onclick = () => { UI.cgVista = b.dataset.cgv; guardarUI(); pintar(); });
  $$('[data-cgcat]', c).forEach(b => b.onclick = () => { UI.cgCat = UI.cgCat === b.dataset.cgcat ? '' : b.dataset.cgcat; guardarUI(); pintar(); });
  const td = $('#cg-todas', c); if (td) td.onclick = (e) => { e.preventDefault(); UI.cgCat = ''; guardarUI(); pintar(); };
  $('#cg-nuevo', c).onclick = () => editarGastoCasa({ fecha: mes === hoy().slice(0, 7) ? hoy() : mes + '-01', periodicidad: 'Puntual' }, true);
  $('#cg-csv', c).onclick = () => $('#cg-file', c).click();
  $('#cg-file', c).onchange = (e) => { const f = e.target.files[0]; e.target.value = ''; if (f) importarBanco(f); };
  $$('[data-cgset]', c).forEach(s => s.onchange = () => {
    const g = D.gastosCasa.find(x => x.id === s.dataset.cgset); if (!g) return;
    g.cat = s.value; recordarCat(g.concepto, g.cat);
    // Lo mismo para los demás movimientos con el mismo comercio que estaban en «Otros»
    const k = claveConcepto(g.concepto); let otros = 0;
    D.gastosCasa.forEach(x => { if (x !== g && x.cat === 'Otros' && k && claveConcepto(x.concepto) === k) { x.cat = g.cat; otros++; } });
    cambio(); if (otros) aviso(`También he puesto ${plural(otros, 'otro gasto', 'otros gastos')} de «${g.concepto}» en ${g.cat}. La próxima vez lo clasifico solo.`);
  });
  $$('[data-cgdel]', c).forEach(b => b.onclick = () => { const antes = D.gastosCasa.slice(); D.gastosCasa = D.gastosCasa.filter(x => x.id !== b.dataset.cgdel); cambio(); aviso('Gasto borrado', { t: 'Deshacer', fn: () => { D.gastosCasa = antes; cambio(); } }); });
  $$('.cg-tabla tbody tr', c).forEach(tr => tr.onclick = (e) => { if (e.target.closest('select,button,a')) return; const g = D.gastosCasa.find(x => x.id === tr.dataset.id); if (g) editarGastoCasa(g, false); });
}

function editarGastoCasa(g, nuevo) {
  ficha({
    titulo: nuevo ? 'Nuevo gasto de casa' : 'Gasto de casa', obj: { ...g },
    campos: [
      { k: 'concepto', t: 'Concepto', tipo: 'lista', op: [...new Set((D.gastosCasa || []).map(x => x.concepto))].slice(-200) },
      { k: 'importe', t: 'Importe (€)', tipo: 'num', ancho: 'medio' },
      { k: 'fecha', t: 'Fecha', tipo: 'fecha', ancho: 'medio' },
      { k: 'cat', t: 'Categoría', tipo: 'lista', op: catsCasa(), ancho: 'medio' },
      { k: 'periodicidad', t: 'Se repite', tipo: 'select', op: ['Puntual', 'Mensual', 'Trimestral', 'Anual'], vacio: false, ancho: 'medio' },
      { k: 'notas', t: 'Notas', tipo: 'texto' },
    ],
    onGuardar: (r) => {
      if (!r.concepto) { aviso('Escribe el concepto'); return false; }
      const fin = { ...g, ...r, id: g.id || uid(), importe: Math.abs(+r.importe || 0), cat: r.cat || adivinarCat(r.concepto), fecha: r.fecha || hoy() };
      if (r.cat) recordarCat(fin.concepto, fin.cat);
      if (!D.gastosCasa) D.gastosCasa = [];
      const k = D.gastosCasa.findIndex(x => x.id === fin.id);
      if (k >= 0) D.gastosCasa[k] = fin; else D.gastosCasa.push(fin);
      cambio();
    },
    onBorrar: nuevo ? null : () => { D.gastosCasa = D.gastosCasa.filter(x => x.id !== g.id); cambio(); return true; },
  });
}

// ---------- subir los movimientos del banco ----------
function leerCSVBanco(txt) {
  txt = txt.replace(/^﻿/, '');
  const lineas = txt.split(/\r?\n/).slice(0, 30).join('\n');
  const sep = [';', ',', '\t', '|'].sort((a, b) => lineas.split(b).length - lineas.split(a).length)[0];
  const filas = []; let fila = [], campo = '', q = false;
  for (let i = 0; i < txt.length; i++) {
    const ch = txt[i];
    if (q) { if (ch === '"') { if (txt[i + 1] === '"') { campo += '"'; i++; } else q = false; } else campo += ch; }
    else if (ch === '"') q = true;
    else if (ch === sep) { fila.push(campo); campo = ''; }
    else if (ch === '\n' || ch === '\r') { if (ch === '\r' && txt[i + 1] === '\n') i++; fila.push(campo); filas.push(fila); fila = []; campo = ''; }
    else campo += ch;
  }
  if (campo || fila.length) { fila.push(campo); filas.push(fila); }
  return filas.filter(f => f.some(x => String(x).trim()));
}
function numBanco(v) {
  if (typeof v === 'number') return v;
  let t = String(v ?? '').replace(/[€\s ]|EUR/gi, '');
  if (!t) return NaN;
  const neg = /^\(.*\)$/.test(t) || /-$/.test(t); t = t.replace(/[()]/g, '').replace(/-$/, '');
  if (/,\d{1,2}$/.test(t)) t = t.replace(/\./g, '').replace(',', '.'); else t = t.replace(/,/g, '');
  const n = parseFloat(t); return neg ? -Math.abs(n) : n;
}
const MESES_BANCO = { ene: 1, jan: 1, urt: 1, feb: 2, ots: 2, mar: 3, mart: 3, abr: 4, apr: 4, api: 4, may: 5, mai: 5, jun: 6, eka: 6, jul: 7, uzt: 7, ago: 8, aug: 8, abu: 8, sep: 9, set: 9, ira: 9, oct: 10, oto: 10, urr: 10, nov: 11, aza: 11, dic: 12, dec: 12, abe: 12 };
function fechaBanco(v) {
  if (v instanceof Date && !isNaN(v)) return aStr(v);
  if (typeof v === 'number' && v > 20000 && v < 80000) return aStr(new Date(Math.round((v - 25569) * 864e5)));
  const t = normCasa(v).replace(/^[a-z]+,? (?=\d)/, ''); // «lun, 13/11/2026»
  const ok = (y, m, d) => (m >= 1 && m <= 12 && d >= 1 && d <= 31 && y > 1990 && y < 2100) ? `${y}-${pad(m)}-${pad(d)}` : '';
  const y2 = (y) => y.length === 2 ? 2000 + +y : +y;
  let m = t.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/); if (m) return ok(+m[1], +m[2], +m[3]);
  m = t.match(/^(\d{4})(\d{2})(\d{2})\b/); if (m) return ok(+m[1], +m[2], +m[3]);
  m = t.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4}|\d{2})\b/); if (m) return ok(y2(m[3]), +m[2], +m[1]) || ok(y2(m[3]), +m[1], +m[2]);
  m = t.match(/^(\d{1,2})[-/. ]+(?:de )?([a-z]{3,})\.?[-/. ]+(?:de )?(\d{4}|\d{2})\b/); if (m && MESES_BANCO[m[2].slice(0, 3)]) return ok(y2(m[3]), MESES_BANCO[m[2].slice(0, 3)], +m[1]);
  m = t.match(/^([a-z]{3,})\.? (\d{1,2}),? (\d{4})/); if (m && MESES_BANCO[m[1].slice(0, 3)]) return ok(+m[3], MESES_BANCO[m[1].slice(0, 3)], +m[2]);
  return '';
}
function analizarBanco(filas) {
  const nc = (t) => normCasa(t);
  const muestra = (i) => filas.slice(i + 1, i + 41);
  const cuantasFechas = (i, c) => muestra(i).filter(f => fechaBanco(f[c])).length;
  const cuantosNum = (i, c) => muestra(i).filter(f => { const n = numBanco(f[c]); return !isNaN(n) && n !== 0 && !fechaBanco(f[c]); }).length;
  // La cabecera: la primera fila que nombra fecha e importe; si no hay, la fila justo antes de la primera con fecha
  let hi = filas.findIndex(f => { const h = f.map(nc); return h.some(x => /fecha|date|data|f\. ?valor|f\. ?oper|dia\b/.test(x)) && h.some(x => /importe|amount|cantidad|cargo|debe|abono|haber|movimiento|euros|eur\b|zenbat|kopurua/.test(x)); });
  if (hi < 0) { const p = filas.findIndex(f => f.some(x => fechaBanco(x)) && f.some(x => { const n = numBanco(x); return !isNaN(n) && n && !fechaBanco(x); })); hi = p > 0 ? p - 1 : -1; if (p === 0) { filas = [filas[0].map(() => ''), ...filas]; hi = 0; } }
  if (hi < 0) throw new Error('No encuentro la fecha y el importe de los movimientos en este archivo.');
  const h = filas[hi].map(nc), n = Math.max(...filas.slice(hi, hi + 40).map(f => f.length));
  const cols = Array.from({ length: n }, (_, i) => i);
  const porNombre = (re) => cols.filter(i => re.test(h[i] || ''));
  const mejor = (lista, cuenta) => lista.map(i => [i, cuenta(hi, i)]).filter(x => x[1]).sort((a, b) => b[1] - a[1])[0];
  // Fecha: la de operación si está; si no, la columna con más fechas
  const cF = (mejor(porNombre(/oper|^fecha$|^date$|^data$|fecha/), cuantasFechas) || mejor(cols, cuantasFechas) || [])[0];
  const noSaldo = (i) => !/saldo|balance|disponible|^saldo/.test(h[i] || '');
  const cI = (mejor(porNombre(/^importe|amount|cantidad|^euros?$|^eur$|importe|movimiento|zenbat|kopurua/).filter(noSaldo), cuantosNum) || [])[0];
  const cCargo = (mejor(porNombre(/cargo|debe|gasto|salida|debito|reintegro/), cuantosNum) || [])[0];
  const cAbono = (mejor(porNombre(/abono|haber|ingreso|entrada|credito/), cuantosNum) || [])[0];
  const cImp = cI ?? (cCargo === undefined && cAbono === undefined ? (mejor(cols.filter(i => i !== cF && noSaldo(i)), cuantosNum) || [])[0] : undefined);
  const cSigno = porNombre(/^signo|^tipo$|^d\/h$|debe\/haber|^\+\/-/)[0];
  if (cF === undefined || (cImp === undefined && cCargo === undefined && cAbono === undefined)) {
    throw new Error(`No sé leer este archivo: no encuentro ${cF === undefined ? 'la fecha' : 'el importe'}. Columnas que veo: ${filas[hi].filter(Boolean).slice(0, 8).join(' · ') || '(sin nombre)'}.`);
  }
  const cC = cols.find(i => /concepto|descripcion|description|detalle|comercio|beneficiario|ordenante|establecimiento|^texto|movimiento$|kontzeptua|deskribapena/.test(h[i] || '') && i !== cImp && i !== cF)
    ?? cols.filter(i => i !== cF && i !== cImp && i !== cCargo && i !== cAbono).map(i => [i, muestra(hi).reduce((s, f) => s + (/[a-z]/i.test(f[i] || '') ? String(f[i]).length : 0), 0)]).sort((a, b) => b[1] - a[1])[0]?.[0];
  const cC2 = cols.find(i => i !== cC && /mas datos|informacion adicional|observaciones|referencia ampliada|^notas?$/.test(h[i] || ''));
  const mov = [];
  filas.slice(hi + 1).forEach(f => {
    const fecha = fechaBanco(f[cF]); if (!fecha) return;
    let imp;
    if (cImp !== undefined) {
      imp = numBanco(f[cImp]);
      if (cSigno !== undefined && /^(d|debe|cargo|-)/i.test(String(f[cSigno]).trim())) imp = -Math.abs(imp);
    } else {
      const ca = cCargo !== undefined ? numBanco(f[cCargo]) : NaN, ab = cAbono !== undefined ? numBanco(f[cAbono]) : NaN;
      imp = !isNaN(ca) && ca ? -Math.abs(ca) : (!isNaN(ab) ? Math.abs(ab) : NaN);
    }
    if (isNaN(imp) || !imp) return;
    const concepto = [cC !== undefined ? f[cC] : '', cC2 !== undefined ? f[cC2] : ''].map(x => String(x ?? '').trim()).filter(Boolean).join(' · ').replace(/\s+/g, ' ').slice(0, 140) || 'Movimiento';
    mov.push({ fecha, concepto, imp });
  });
  if (!mov.length) {
    const ej = filas[hi + 1] || [];
    throw new Error(`No he podido leer los movimientos. Primera fila: ${ej.filter(x => String(x).trim()).slice(0, 6).join(' · ')}. Mándamela y lo ajusto.`);
  }
  return mov;
}
async function importarBanco(f) {
  try {
    let filas;
    const cab = new Uint8Array(await f.slice(0, 512).arrayBuffer());
    const cabTxt = String.fromCharCode(...cab).replace(/\u0000/g, '').trim().toLowerCase();
    // Hay bancos que llaman .csv a un Excel o a una página web con una tabla
    const pareceExcel = (cab[0] === 0x50 && cab[1] === 0x4B) || (cab[0] === 0xD0 && cab[1] === 0xCF) || /^<(\?xml|!doctype|html|table)/.test(cabTxt.replace(/^\W*(?=<)/, ''));
    const esHtml = /<table/i.test(cabTxt) || /^<(!doctype|html)/.test(cabTxt.replace(/^\W*(?=<)/, '')) || /\.html?$/i.test(f.name);
    if (esHtml) {
      const doc = new DOMParser().parseFromString(await f.text(), 'text/html');
      filas = [...doc.querySelectorAll('tr')].map(tr => [...tr.querySelectorAll('td,th')].map(td => td.textContent.trim())).filter(r => r.some(Boolean));
    } else if (/\.(xlsx?|ods)$/i.test(f.name) || pareceExcel) {
      const X = await cargarExcel();
      const wb = X.read(new Uint8Array(await f.arrayBuffer()), { type: 'array', cellDates: true });
      filas = X.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, raw: true, defval: '' });
    } else {
      const buf = await f.arrayBuffer();
      const by = new Uint8Array(buf.slice(0, 4));
      const u16 = (by[0] === 0xFF && by[1] === 0xFE) || (by[1] === 0 && by[0] !== 0) ? 'utf-16le' : (by[0] === 0xFE && by[1] === 0xFF) || (by[0] === 0 && by[1] !== 0) ? 'utf-16be' : '';
      let txt = new TextDecoder(u16 || 'utf-8').decode(buf);
      if (!u16 && txt.includes('\uFFFD')) txt = new TextDecoder('windows-1252').decode(buf); // bancos que exportan en Latin-1
      txt = txt.replace(/\u0000/g, '');
      filas = leerCSVBanco(txt);
    }
    const mov = analizarBanco(filas);
    const gastos = mov.filter(m => m.imp < 0), ingresos = mov.length - gastos.length;
    // Si el banco pone los gastos en positivo (sin signo), se ofrecen todos
    const todosPositivos = !gastos.length && mov.length;
    const lista = (todosPositivos ? mov : gastos).map(m => ({ fecha: m.fecha, concepto: m.concepto, importe: Math.abs(m.imp) }));
    const ya = new Set((D.gastosCasa || []).map(g => `${g.fecha}|${normCasa(g.concepto)}|${(+g.importe).toFixed(2)}`));
    const nuevos = lista.filter(g => !ya.has(`${g.fecha}|${normCasa(g.concepto)}|${g.importe.toFixed(2)}`)).map(g => ({ ...g, cat: adivinarCat(g.concepto) }));
    const repes = lista.length - nuevos.length;
    const porCat = {}; nuevos.forEach(g => { porCat[g.cat] = (porCat[g.cat] || 0) + 1; });
    const desde = nuevos.map(g => g.fecha).sort()[0], hasta = nuevos.map(g => g.fecha).sort().pop();
    modal(`<h3>Movimientos de ${esc(f.name)}</h3>
      <p>He encontrado <b>${plural(nuevos.length, 'gasto nuevo', 'gastos nuevos')}</b>${desde ? ` (del ${+desde.slice(8)} ${MESES_C[+desde.slice(5, 7) - 1]} al ${+hasta.slice(8)} ${MESES_C[+hasta.slice(5, 7) - 1]} ${hasta.slice(0, 4)})` : ''}.
        ${ingresos && !todosPositivos ? ` No importo ${ingresos === 1 ? 'el ingreso' : `los ${ingresos} ingresos`} (nóminas, bizums que te hacen…).` : ''}${repes ? ` ${plural(repes, 'ya estaba apuntado', 'ya estaban apuntados')}.` : ''}</p>
      ${todosPositivos ? '<p class="nota">El archivo no distingue gastos e ingresos (todo va en positivo): revisa la lista y quita los ingresos.</p>' : ''}
      ${nuevos.length ? `<p class="suave">Así los he clasificado (luego puedes cambiar cualquiera y aprendo para la próxima):</p>
      <div class="cg-prev">${Object.entries(porCat).sort((a, b) => b[1] - a[1]).map(([cat, n]) => `<span class="pill-cc" style="--h:${colorCatC(cat)}">${esc(cat)} · ${n}</span>`).join(' ')}</div>
      <div class="cg-prev-lista">${nuevos.slice(0, 200).map((g, i) => `<label><input type="checkbox" data-i="${i}" checked> <span>${+g.fecha.slice(8)} ${MESES_C[+g.fecha.slice(5, 7) - 1]}</span> <span>${esc(g.concepto)}</span> <b>${eurC(g.importe)}</b></label>`).join('')}</div>` : ''}
      <div class="pie"><button class="btn" data-cerrar>Cancelar</button>${nuevos.length ? '<button class="btn prim" id="cg-imp">Importar</button>' : ''}</div>`, {
      clase: 'ancha',
      alAbrir: (m, cerrar) => {
        const b = $('#cg-imp', m); if (!b) return;
        b.onclick = () => {
          const sel = $$('[data-i]', m).filter(x => x.checked).map(x => nuevos[+x.dataset.i]).concat(nuevos.slice(200));
          if (!D.gastosCasa) D.gastosCasa = [];
          const ids = sel.map(g => { const x = { id: uid(), ...g, periodicidad: 'Puntual', origen: 'banco' }; D.gastosCasa.push(x); return x.id; });
          cerrar(); UI.cgMes = hasta.slice(0, 7); UI.cgCat = ''; guardarUI(); cambio();
          aviso(`${plural(ids.length, 'gasto importado', 'gastos importados')}`, { t: 'Deshacer', fn: () => { const s = new Set(ids); D.gastosCasa = D.gastosCasa.filter(g => !s.has(g.id)); cambio(); } });
        };
      }
    });
  } catch (e) { aviso(e.message || 'No he podido leer el archivo'); }
}
function cargarExcel() {
  if (window.XLSX) return Promise.resolve(window.XLSX);
  return new Promise((ok, mal) => { const s = document.createElement('script'); s.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js'; s.onload = () => window.XLSX ? ok(window.XLSX) : mal(new Error('sin XLSX')); s.onerror = () => mal(new Error('No se ha podido cargar el lector de Excel: comprueba que tienes internet, o exporta en CSV.')); document.head.appendChild(s); });
}

// ---------- Ajustes › Gastos de casa: categorías y conceptos ----------
(function () {
  const lista = () => D.listas.catCasa || (D.listas.catCasa = CATS_CASA.slice());
  const cuenta = (cat) => (D.gastosCasa || []).filter(g => g.cat === cat).length;
  const seccion = () => {
    const cats = lista();
    const reglas = (D.reglasCasa || []).slice().sort((a, b) => a.cat.localeCompare(b.cat) || a.clave.localeCompare(b.clave));
    const opts = (sel) => cats.map(x => `<option${x === sel ? ' selected' : ''}>${esc(x)}</option>`).join('');
    return `<section class="tarjeta" id="aj-gastos" style="grid-column:1/-1"><h2>💶 Gastos de casa</h2>
      <div class="ajg">
        <div><h3>Categorías</h3><p class="suave">Cambia el nombre (se cambia también en los gastos ya apuntados), añade las tuyas o quita las que no uses (sus gastos pasan a «Otros»).</p>
          <div class="ajg-cats">${cats.map((c, i) => `<div class="ajg-fila"><span class="pill-cc" style="--h:${colorCatC(c)}">&nbsp;</span><input data-cat="${i}" value="${esc(c)}" aria-label="Nombre de la categoría"><small class="tenue">${cuenta(c) || ''}</small>${c === 'Otros' ? '<span></span>' : `<button class="btn-x" data-catdel="${i}" title="Quitar" aria-label="Quitar">×</button>`}</div>`).join('')}</div>
          <div class="ajg-nueva"><input id="ajg-ncat" placeholder="Nueva categoría (p. ej. Cumpleaños)"><button class="btn peq" id="ajg-addcat">+ Añadir</button></div>
          <button class="btn peq" id="ajg-def" style="margin-top:8px">Volver a las de serie</button></div>
        <div><h3>Conceptos</h3><p class="suave">Si el concepto del banco contiene estas palabras, el gasto va a esa categoría. Aquí también salen las que aprendo cuando corriges una.</p>
          <div class="ajg-nueva"><input id="ajg-npal" placeholder="Palabra del concepto (p. ej. ikastola, gimnasio)"><select id="ajg-ncatr">${opts('')}</select><button class="btn peq" id="ajg-addreg">+ Añadir</button></div>
          <div class="ajg-reglas">${reglas.length ? reglas.map(r => `<div class="ajg-fila r"><input data-rk="${esc(r.clave)}" value="${esc(r.clave)}" aria-label="Palabra"><span class="tenue">→</span><select data-rc="${esc(r.clave)}">${opts(r.cat)}</select><button class="btn-x" data-rdel="${esc(r.clave)}" title="Quitar" aria-label="Quitar">×</button></div>`).join('') : '<p class="vacio">Aún no hay conceptos tuyos.</p>'}</div>
          <button class="btn peq" id="ajg-aplicar" style="margin-top:8px">Volver a clasificar los gastos que tengo</button>
          <p class="nota" style="margin-top:8px">«Volver a clasificar» aplica estas palabras (y las de serie) a todos tus gastos; los que hayas cambiado a mano y no encajen con ninguna se quedan como están.</p></div>
      </div></section>`;
  };
  const repinta = () => { cambio(false); const t = document.getElementById('aj-gastos'); if (t) { t.outerHTML = seccion(); enlazar(document); } };
  const renombrar = (viejo, nuevo) => {
    (D.gastosCasa || []).forEach(g => { if (g.cat === viejo) g.cat = nuevo; });
    (D.reglasCasa || []).forEach(r => { if (r.cat === viejo) r.cat = nuevo; });
    const ren = D.listas.catCasaRen || (D.listas.catCasaRen = {});
    Object.keys(ren).forEach(k => { if (ren[k] === viejo) ren[k] = nuevo; });
    if (CATS_CASA.includes(viejo)) ren[viejo] = nuevo;
    if (UI.cgCat === viejo) { UI.cgCat = nuevo; guardarUI(); }
  };
  function enlazar(r) {
    const t = r.querySelector('#aj-gastos'); if (!t) return;
    $$('[data-cat]', t).forEach(inp => inp.onchange = () => {
      const L = lista(), i = +inp.dataset.cat, viejo = L[i], nuevo = inp.value.trim();
      if (!nuevo || nuevo === viejo) { inp.value = viejo; return; }
      if (L.includes(nuevo)) { // juntar dos categorías
        L.splice(i, 1); renombrar(viejo, nuevo); aviso(`«${viejo}» se ha juntado con «${nuevo}»`);
      } else { L[i] = nuevo; renombrar(viejo, nuevo); }
      repinta();
    });
    $$('[data-catdel]', t).forEach(b => b.onclick = () => {
      const L = lista(), i = +b.dataset.catdel, cat = L[i], antes = JSON.stringify({ L, g: D.gastosCasa, r: D.reglasCasa });
      L.splice(i, 1); if (!L.includes('Otros')) L.push('Otros');
      (D.gastosCasa || []).forEach(g => { if (g.cat === cat) g.cat = 'Otros'; });
      D.reglasCasa = (D.reglasCasa || []).filter(x => x.cat !== cat);
      repinta();
      aviso(`Categoría «${cat}» quitada`, { t: 'Deshacer', fn: () => { const a = JSON.parse(antes); D.listas.catCasa = a.L; D.gastosCasa = a.g; D.reglasCasa = a.r; repinta(); } });
    });
    const addCat = () => { const v = $('#ajg-ncat', t).value.trim(); if (!v) return; const L = lista(); if (L.includes(v)) { aviso('Ya existe'); return; } L.splice(Math.max(0, L.indexOf('Otros')), 0, v); repinta(); };
    $('#ajg-addcat', t).onclick = addCat; $('#ajg-ncat', t).onkeydown = (e) => { if (e.key === 'Enter') addCat(); };
    $('#ajg-def', t).onclick = () => {
      const quedan = [...new Set((D.gastosCasa || []).map(g => g.cat))].filter(c => !CATS_CASA.includes(c));
      D.listas.catCasa = [...CATS_CASA.filter(c => c !== 'Otros'), ...quedan, 'Otros']; D.listas.catCasaRen = {}; repinta();
      if (quedan.length) aviso(`He dejado ${plural(quedan.length, 'categoría tuya que tiene gastos', 'categorías tuyas que tienen gastos')}`);
    };
    const addReg = () => {
      const k = normCasa($('#ajg-npal', t).value); if (!k) return;
      const cat = $('#ajg-ncatr', t).value;
      D.reglasCasa = (D.reglasCasa || []).filter(x => x.clave !== k); D.reglasCasa.push({ clave: k, cat, mano: true });
      let n = 0; (D.gastosCasa || []).forEach(g => { if (normCasa(g.concepto).includes(k) && g.cat !== cat) { g.cat = cat; n++; } });
      repinta(); if (n) aviso(`${plural(n, 'gasto cambiado', 'gastos cambiados')} a ${cat}`);
    };
    $('#ajg-addreg', t).onclick = addReg; $('#ajg-npal', t).onkeydown = (e) => { if (e.key === 'Enter') addReg(); };
    $$('[data-rk]', t).forEach(inp => inp.onchange = () => {
      const r = D.reglasCasa.find(x => x.clave === inp.dataset.rk), k = normCasa(inp.value);
      if (!r) return; if (!k) { D.reglasCasa = D.reglasCasa.filter(x => x !== r); } else { r.clave = k; r.mano = true; } repinta();
    });
    $$('[data-rc]', t).forEach(sel => sel.onchange = () => { const r = D.reglasCasa.find(x => x.clave === sel.dataset.rc); if (r) { r.cat = sel.value; repinta(); } });
    $$('[data-rdel]', t).forEach(b => b.onclick = () => { const antes = D.reglasCasa.slice(); D.reglasCasa = D.reglasCasa.filter(x => x.clave !== b.dataset.rdel); repinta(); aviso('Concepto quitado', { t: 'Deshacer', fn: () => { D.reglasCasa = antes; repinta(); } }); });
    $('#ajg-aplicar', t).onclick = () => {
      const antes = (D.gastosCasa || []).map(g => g.cat); let n = 0;
      (D.gastosCasa || []).forEach(g => { const c = adivinarCat(g.concepto); if (c !== 'Otros' && c !== g.cat) { g.cat = c; n++; } else if (!catsCasa().includes(g.cat)) { g.cat = 'Otros'; n++; } });
      repinta(); aviso(n ? `${plural(n, 'gasto reclasificado', 'gastos reclasificados')}` : 'Todo estaba ya bien clasificado', n ? { t: 'Deshacer', fn: () => { D.gastosCasa.forEach((g, i) => g.cat = antes[i]); repinta(); } } : undefined);
    };
  }
  const orig = VISTAS.ajustes;
  VISTAS.ajustes = function (cont) {
    const r = orig.apply(this, arguments);
    try { const rej = cont.querySelector('.rejilla'); if (rej && !cont.querySelector('#aj-gastos')) { rej.insertAdjacentHTML('beforeend', seccion()); enlazar(cont); } } catch (e) { console.error(e); }
    return r;
  };
})();
