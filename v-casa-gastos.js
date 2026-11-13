'use strict';
// =====================================================================
//  Mi Planner — Casa › Gastos de casa: todos los gastos del hogar,
//  por categoría (supermercado, suscripciones, colegio…), con el
//  movimiento del banco subido desde un CSV o Excel.
// =====================================================================
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
  const r = (D.reglasCasa || []).find(x => x.clave && (k === x.clave || c.includes(x.clave)));
  if (r) return r.cat;
  const p = PISTAS_CASA.find(([, re]) => re.test(c));
  return p ? p[0] : 'Otros';
}
function recordarCat(concepto, cat) {
  const k = claveConcepto(concepto); if (!k) return;
  D.reglasCasa = (D.reglasCasa || []).filter(x => x.clave !== k);
  D.reglasCasa.push({ clave: k, cat });
}
const eurC = (v) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(Math.round((Number(v) || 0) * 100) / 100);
const catsCasa = () => [...new Set([...(D.listas.catCasa || CATS_CASA), ...(D.gastosCasa || []).map(g => g.cat).filter(Boolean)])];
const colorCatC = (c) => { let h = 0; for (const ch of String(c)) h = (h * 31 + ch.charCodeAt(0)) % 360; return h; };

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
  const anio = () => {
    const meses = Array.from({ length: 12 }, (_, i) => `${Y}-${pad(i + 1)}`);
    const cs = [...new Set(delAnio.map(g => g.cat || 'Otros'))].sort((a, b) => delAnio.filter(g => (g.cat || 'Otros') === b).reduce((s, g) => s + +g.importe, 0) - delAnio.filter(g => (g.cat || 'Otros') === a).reduce((s, g) => s + +g.importe, 0));
    const v = (cat, m) => delAnio.filter(g => (g.cat || 'Otros') === cat && g.fecha.startsWith(m)).reduce((s, g) => s + +g.importe, 0);
    const tm = (m) => delAnio.filter(g => g.fecha.startsWith(m)).reduce((s, g) => s + +g.importe, 0);
    const n0 = (x) => x ? new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0 }).format(x) : '<span class="tenue">·</span>';
    return !delAnio.length ? `<p class="vacio">Aún no hay gastos de casa en ${Y}.</p>` : `<div class="tabla-wrap"><table class="tabla cg-anio"><thead><tr><th>Categoría</th>${meses.map(m => `<th class="num">${MESES_C[+m.slice(5) - 1]}</th>`).join('')}<th class="num">Total</th><th class="num">Al mes</th></tr></thead>
      <tbody>${cs.map(cat => { const t = meses.reduce((s, m) => s + v(cat, m), 0); return `<tr><td>${pill(cat)}</td>${meses.map(m => `<td class="num">${n0(v(cat, m))}</td>`).join('')}<td class="num"><b>${eurC(t)}</b></td><td class="num">${eurC(t / mesesConGasto)}</td></tr>`; }).join('')}</tbody>
      <tfoot><tr><td><b>Total</b></td>${meses.map(m => `<td class="num"><b>${n0(tm(m))}</b></td>`).join('')}<td class="num"><b>${eurC(delAnio.reduce((s, g) => s + +g.importe, 0))}</b></td><td class="num">${eurC(delAnio.reduce((s, g) => s + +g.importe, 0) / mesesConGasto)}</td></tr></tfoot></table></div>
      <p class="nota">En euros. «Al mes» es la media de los meses en los que hay gastos apuntados (${mesesConGasto}).</p>`;
  };
  c.innerHTML = `<div class="cg-cab">
      <div class="cg-mes"><button class="btn peq" id="cg-ant" aria-label="Mes anterior">‹</button><b>${vista === 'anio' ? Y : nombreM(mes)}</b><button class="btn peq" id="cg-sig" aria-label="Mes siguiente">›</button></div>
      <div class="segmentado peq"><button class="${vista === 'mes' ? 'on' : ''}" data-cgv="mes">Mes</button><button class="${vista === 'anio' ? 'on' : ''}" data-cgv="anio">Resumen del año</button></div>
      <span class="hueco"></span>
      <button class="btn" id="cg-csv">⬆️ Subir movimientos del banco</button><button class="btn prim" id="cg-nuevo">+ Gasto</button>
      <input type="file" id="cg-file" accept=".csv,.txt,.xlsx,.xls,text/csv" hidden></div>
    ${vista === 'anio' ? anio() : `
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

  const mover = (k) => { const d = aFecha(mes + '-01'); d.setMonth(d.getMonth() + (vista === 'anio' ? 12 * k : k)); UI.cgMes = aStr(d).slice(0, 7); guardarUI(); pintar(); };
  $('#cg-ant', c).onclick = () => mover(-1); $('#cg-sig', c).onclick = () => mover(1);
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
function fechaBanco(v) {
  if (typeof v === 'number' && v > 20000 && v < 80000) return aStr(new Date(Math.round((v - 25569) * 864e5)));
  const t = String(v || '').trim();
  let m = t.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/); if (m) return `${m[1]}-${pad(+m[2])}-${pad(+m[3])}`;
  m = t.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})/); if (m) return `${m[3].length === 2 ? '20' + m[3] : m[3]}-${pad(+m[2])}-${pad(+m[1])}`;
  return '';
}
function analizarBanco(filas) {
  const nc = (t) => normCasa(t);
  const esCab = (f) => { const h = f.map(nc); return h.some(x => /fecha|date|f\. ?valor|f\. ?operacion/.test(x)) && h.some(x => /importe|amount|cantidad|cargo|debe|abono|haber|movimiento/.test(x)); };
  const hi = filas.findIndex(esCab);
  if (hi < 0) throw new Error('No encuentro las columnas de fecha e importe. Exporta los movimientos de tu banco en CSV o Excel (con cabecera).');
  const h = filas[hi].map(nc), datos = filas.slice(hi + 1);
  const col = (...res) => { for (const re of res) { const i = h.findIndex(x => re.test(x)); if (i >= 0) return i; } return -1; };
  const cF = col(/^fecha( de)? operacion|^f\. ?operacion|^fecha$|^date$|^fecha/, /f\. ?valor|valor/);
  const cC = col(/concepto|descripcion|description|detalle|movimiento|comercio|beneficiario|observaciones|^texto/);
  const cC2 = col(/mas datos|información adicional|observaciones|referencia/);
  const cI = col(/^importe|amount|cantidad|^euros|^eur/);
  const cCargo = col(/cargo|debe|gasto|salida/), cAbono = col(/abono|haber|ingreso|entrada/);
  if (cF < 0 || (cI < 0 && cCargo < 0)) throw new Error('No encuentro la fecha o el importe en el archivo.');
  const mov = [];
  datos.forEach(f => {
    const fecha = fechaBanco(f[cF]); if (!fecha) return;
    let imp = cI >= 0 ? numBanco(f[cI]) : (numBanco(f[cCargo]) ? -Math.abs(numBanco(f[cCargo])) : Math.abs(numBanco(f[cAbono]) || 0));
    if (isNaN(imp) || !imp) return;
    const concepto = [cC >= 0 ? f[cC] : '', cC2 >= 0 && cC2 !== cC ? f[cC2] : ''].map(x => String(x || '').trim()).filter(Boolean).join(' · ').replace(/\s+/g, ' ').slice(0, 140) || 'Movimiento';
    mov.push({ fecha, concepto, imp });
  });
  if (!mov.length) throw new Error('El archivo no tiene movimientos que pueda leer.');
  return mov;
}
async function importarBanco(f) {
  try {
    let filas;
    if (/\.xlsx?$/i.test(f.name)) {
      const X = await cargarExcel();
      const wb = X.read(new Uint8Array(await f.arrayBuffer()), { type: 'array' });
      filas = X.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, raw: true, defval: '' });
    } else {
      const buf = await f.arrayBuffer();
      let txt = new TextDecoder('utf-8').decode(buf);
      if (txt.includes('�')) txt = new TextDecoder('windows-1252').decode(buf); // bancos que exportan en Latin-1
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
