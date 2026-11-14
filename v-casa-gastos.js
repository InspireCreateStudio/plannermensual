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
  const reglas = (D.reglasCasa || []).filter(x => x.cat && x.cat !== ES_ING).sort((a, b) => (b.mano ? 1 : 0) - (a.mano ? 1 : 0) || b.clave.length - a.clave.length);
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
// Ingresos: palabras que delatan que un movimiento es dinero que entra
const ES_ING = '➕ Ingreso';
const PISTA_ING = /nomina|salario|sueldo|abono|ingreso|transferencia (recibida|a su favor|a favor)|bizum (recibido|de )|devoluci|reembolso|reintegro de|pension|prestacion|lanbide|sepe|subsidio|intereses|dividendo|ayuda familiar/;
function esIngresoConcepto(concepto) {
  const c = normCasa(concepto), k = claveConcepto(concepto);
  const r = (D.reglasCasa || []).filter(x => x.clave && (k === x.clave || c.includes(x.clave))).sort((a, b) => (b.mano ? 1 : 0) - (a.mano ? 1 : 0) || b.clave.length - a.clave.length)[0];
  if (r) return r.cat === ES_ING;
  return PISTA_ING.test(c);
}
// Pasar un apunte de gastos a ingresos y al revés
function gastoAIngreso(g) {
  D.gastosCasa = (D.gastosCasa || []).filter(x => x.id !== g.id);
  (D.ingresosCasa = D.ingresosCasa || []).push({ id: g.id, fecha: g.fecha, concepto: g.concepto, importe: Math.abs(+g.importe || 0), notas: g.notas || '', origen: g.origen === 'fijo' ? '' : (g.origen || '') });
}
function ingresoAGasto(i, cat) {
  D.ingresosCasa = (D.ingresosCasa || []).filter(x => x.id !== i.id);
  (D.gastosCasa = D.gastosCasa || []).push({ id: i.id, fecha: i.fecha, concepto: i.concepto, importe: Math.abs(+i.importe || 0), notas: i.notas || '', cat: cat || adivinarCat(i.concepto), periodicidad: 'Puntual', origen: i.origen || '' });
}
const reglaTipo = (concepto, ingreso) => {
  const k = claveConcepto(concepto) || normCasa(concepto); if (!k) return;
  D.reglasCasa = (D.reglasCasa || []).filter(x => !(x.clave === k && (x.cat === ES_ING || ingreso)));
  if (ingreso) D.reglasCasa.push({ clave: k, cat: ES_ING, mano: true });
};
// Orden alfabético, con «Otros» siempre al final
const ordenCats = (xs) => xs.slice().sort((a, b) => (a === 'Otros') - (b === 'Otros') || a.localeCompare(b, 'es', { sensitivity: 'base' }));
const catsCasa = () => ordenCats([...new Set([...(D.listas.catCasa || CATS_CASA), ...(D.gastosCasa || []).map(g => g.cat).filter(Boolean)])]);
const colorCatC = (c) => { let h = 0; for (const ch of String(c)) h = (h * 31 + ch.charCodeAt(0)) % 360; return h; };

// ---------- utilidades comunes ----------
// Un gasto puede estar repartido entre varias categorías (g.partes = [{cat, importe}])
const trozos = (g) => (g.partes && g.partes.length) ? g.partes : [{ cat: g.cat || 'Otros', importe: +g.importe || 0 }];
const deCat = (g, cat) => trozos(g).filter(t => (t.cat || 'Otros') === cat).reduce((s, t) => s + (+t.importe || 0), 0);
const tieneCat = (g, cat) => trozos(g).some(t => (t.cat || 'Otros') === cat);
const sumaG = (gs) => gs.reduce((s, g) => s + (+g.importe || 0), 0);
const sumaCat = (gs, cat) => cat ? gs.reduce((s, g) => s + deCat(g, cat), 0) : sumaG(gs);
const sumaPorCat = (gs) => { const o = {}; gs.forEach(g => trozos(g).forEach(t => { const k = t.cat || 'Otros'; o[k] = (o[k] || 0) + (+t.importe || 0); })); return o; };
const sumaMes = (m, k) => { const d = new Date(+m.slice(0, 4), +m.slice(5) - 1 + k, 1); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`; };
const eurG = (v) => `<span class="cg-menos">−${eurC(Math.abs(+v || 0))}</span>`; // gasto: rojo y con −
const eurI = (v) => `<span class="cg-mas">+${eurC(Math.abs(+v || 0))}</span>`; // ingreso: verde y con +
const eurS = (v) => (+v || 0) < 0 ? eurG(v) : eurI(v);
const n0C = (x) => new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0 }).format(x);
const catSubs = () => { const ren = (D.listas && D.listas.catCasaRen) || {}; return ren['Suscripciones'] || 'Suscripciones'; };

// ---------- gastos fijos: se apuntan solos cada mes ----------
const venceEn = (f, m) => {
  const n = +m.slice(5), base = +(f.mes || (f.desde || m).slice(5));
  if (f.cada === 'Anual') return n === base;
  if (f.cada === 'Trimestral') return ((n - base) % 3 + 3) % 3 === 0;
  return true;
};
function generarFijos() {
  if (!D.gastosCasa) D.gastosCasa = [];
  const tope = hoy().slice(0, 7); let n = 0;
  (D.fijosCasa || []).forEach(f => {
    if (f.activo === false) return;
    f.hechos = f.hechos || [];
    let m = f.desde || tope, vueltas = 0;
    while (m <= tope && vueltas++ < 240) {
      if ((!f.hasta || m <= f.hasta) && venceEn(f, m) && !f.hechos.includes(m)) {
        D.gastosCasa.push({ id: uid(), fecha: `${m}-${pad(Math.min(+f.dia || 1, diasDelMes(m)))}`, concepto: f.concepto, importe: +f.importe || 0, cat: f.cat || adivinarCat(f.concepto), periodicidad: f.cada || 'Mensual', origen: 'fijo', fijo: f.id });
        f.hechos.push(m); n++;
      }
      m = sumaMes(m, 1);
    }
  });
  return n;
}
const claveFijo = (f) => normCasa(f.clave || '') || claveConcepto(f.concepto);
const fijoDe = (concepto) => { const c = normCasa(concepto), k = claveConcepto(concepto); return (D.fijosCasa || []).find(f => { const cl = claveFijo(f); return cl && (c.includes(cl) || k === cl); }); };

// ---------- avisos de presupuesto (Inicio) ----------
window.avisosGastos = () => {
  const P = D.presupuestosCasa || {}, m = hoy().slice(0, 7);
  const gs = (D.gastosCasa || []).filter(g => (g.fecha || '').startsWith(m) && (g.fecha || '') <= hoy());
  const por = sumaPorCat(gs);
  return Object.entries(P).filter(([c, p]) => +p > 0 && (por[c] || 0) >= +p * 0.85).sort((a, b) => (por[b[0]] / b[1]) - (por[a[0]] / a[1]))
    .map(([c, p]) => (por[c] || 0) > +p ? `<a href="#gastos" class="rojo">💶 ${esc(c)}: te has pasado del presupuesto (${eurC(por[c])} de ${eurC(p)})</a>` : `<a href="#gastos">💶 ${esc(c)}: llevas ${eurC(por[c])} de ${eurC(p)} este mes</a>`);
};

VISTAS.gastos = (cont) => {
  cont.innerHTML = `<div class="pagina ancha">${cabecera('💶 Gastos de casa', '')}<div id="cg-cuerpo"></div></div>`;
  casaGastos($('#cg-cuerpo', cont));
};

function casaGastos(c) {
  if (!D.gastosCasa) D.gastosCasa = [];
  if (!D.ingresosCasa) D.ingresosCasa = [];
  if (generarFijos()) cambio(false);
  const mes = UI.cgMes || hoy().slice(0, 7), Y = mes.slice(0, 4), vista = UI.cgVista || 'mes';
  const P = D.presupuestosCasa || {};
  const delMes = D.gastosCasa.filter(g => (g.fecha || '').startsWith(mes)).sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));
  const filtro = UI.cgCat || '';
  const filas = filtro ? delMes.filter(g => tieneCat(g, filtro)) : delMes;
  const total = sumaG(delMes);
  const mesAnt = sumaMes(mes, -1);
  const totalAnt = sumaG(D.gastosCasa.filter(g => (g.fecha || '').startsWith(mesAnt)));
  const delAnio = D.gastosCasa.filter(g => (g.fecha || '').startsWith(Y));
  const ingMes = D.ingresosCasa.filter(g => (g.fecha || '').startsWith(mes)).sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));
  const ingAnio = D.ingresosCasa.filter(g => (g.fecha || '').startsWith(Y));
  const hayIngresos = D.ingresosCasa.length > 0;
  const mesesConGasto = new Set(delAnio.map(g => g.fecha.slice(0, 7))).size || 1;
  const porCat = sumaPorCat(delMes);
  Object.keys(P).forEach(k => { if (+P[k] > 0 && !(k in porCat) && catsCasa().includes(k)) porCat[k] = 0; });
  const cats = Object.entries(porCat).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'es')), maxC = Math.max(1, ...cats.map(([k, v]) => Math.max(v, +P[k] || 0)));
  const nombreM = (m) => `${MESES[+m.slice(5) - 1]} ${m.slice(0, 4)}`;
  const pill = (cat) => `<span class="pill-cc" style="--h:${colorCatC(cat)}">${esc(cat || 'Otros')}</span>`;
  const fechaC = (f, conAnio) => f ? `${+f.slice(8)} ${MESES_C[+f.slice(5, 7) - 1]}${conAnio ? ' ' + f.slice(2, 4) : ''}` : '';

  // Resumen del año: categorías × meses
  const anio = () => {
    const meses = Array.from({ length: 12 }, (_, i) => `${Y}-${pad(i + 1)}`);
    const totC = sumaPorCat(delAnio);
    const cs = Object.keys(totC).sort((a, b) => totC[b] - totC[a]);
    const v = (cat, m) => sumaCat(delAnio.filter(g => g.fecha.startsWith(m)), cat);
    const tm = (m) => sumaG(delAnio.filter(g => g.fecha.startsWith(m)));
    const im = (m) => sumaG(ingAnio.filter(g => g.fecha.startsWith(m)));
    const n0 = (x) => x ? n0C(x) : '<span class="tenue">·</span>';
    const totAnio = sumaG(delAnio), totIng = sumaG(ingAnio);
    return !delAnio.length ? `<p class="vacio">Aún no hay gastos de casa en ${Y}.</p>` : `<div class="tabla-wrap"><table class="tabla cg-anio"><thead><tr><th>Categoría</th>${meses.map(m => `<th class="num">${MESES_C[+m.slice(5) - 1]}</th>`).join('')}<th class="num">Total</th><th class="num">Al mes</th>${Object.keys(P).length ? '<th class="num">Presup.</th>' : ''}</tr></thead>
      <tbody>${cs.map(cat => { const t = totC[cat], pm = +P[cat] || 0; return `<tr data-cgfila="${esc(cat)}" title="Ver todo lo de ${esc(cat)}"><td>${pill(cat)}</td>${meses.map(m => { const x = v(cat, m); return `<td class="num cg-rojo${pm && x > pm ? ' pasado' : ''}">${x ? '−' + n0C(x) : n0(0)}</td>`; }).join('')}<td class="num"><b>${eurG(t)}</b></td><td class="num">${eurG(t / mesesConGasto)}</td>${Object.keys(P).length ? `<td class="num tenue">${pm ? n0C(pm) : ''}</td>` : ''}</tr>`; }).join('')}</tbody>
      <tfoot><tr><td><b>Gastos</b></td>${meses.map(m => `<td class="num cg-rojo"><b>${tm(m) ? '−' + n0C(tm(m)) : n0(0)}</b></td>`).join('')}<td class="num"><b>${eurG(totAnio)}</b></td><td class="num">${eurG(totAnio / mesesConGasto)}</td>${Object.keys(P).length ? '<td></td>' : ''}</tr>
      ${ingAnio.length ? `<tr class="cg-ing"><td><b>Ingresos</b></td>${meses.map(m => `<td class="num cg-verde">${im(m) ? '+' + n0C(im(m)) : n0(0)}</td>`).join('')}<td class="num"><b>${eurI(totIng)}</b></td><td class="num">${eurI(totIng / mesesConGasto)}</td>${Object.keys(P).length ? '<td></td>' : ''}</tr>
      <tr class="cg-aho"><td><b>Ahorro</b></td>${meses.map(m => { const a = im(m) - tm(m); return `<td class="num ${a < 0 ? 'cg-rojo' : 'cg-verde'}">${im(m) || tm(m) ? (a < 0 ? '−' : '+') + n0C(Math.abs(a)) : '<span class="tenue">·</span>'}</td>`; }).join('')}<td class="num"><b>${eurS(totIng - totAnio)}</b></td><td class="num">${eurS((totIng - totAnio) / mesesConGasto)}</td>${Object.keys(P).length ? '<td></td>' : ''}</tr>` : ''}</tfoot></table></div>
      <p class="nota">En euros. «Al mes» es la media de los meses en los que hay gastos apuntados (${mesesConGasto}). Pulsa una categoría para ver todo lo suyo.</p>`;
  };
  const anioCat = () => {
    const xs = delAnio.filter(g => tieneCat(g, filtro)).sort((a, b) => a.fecha.localeCompare(b.fecha));
    if (!xs.length) return `<p class="vacio">No hay gastos de ${esc(filtro)} en ${Y}.</p>`;
    const meses = Array.from({ length: 12 }, (_, i) => `${Y}-${pad(i + 1)}`);
    const tm = meses.map(m => sumaCat(xs.filter(g => g.fecha.startsWith(m)), filtro));
    const tot = tm.reduce((a, b) => a + b, 0), conG = tm.filter(Boolean).length || 1, pm = +P[filtro] || 0, max = Math.max(...tm, pm, 1);
    const totalAnio = sumaG(delAnio);
    const porConc = {}; xs.forEach(g => { const k = claveConcepto(g.concepto) || normCasa(g.concepto); (porConc[k] = porConc[k] || { n: 0, t: 0, nom: g.concepto }).n++; porConc[k].t += deCat(g, filtro); });
    const conc = Object.values(porConc).sort((a, b) => b.t - a.t);
    return `<div class="cifras cg-cifras"><div><span>${esc(filtro)} en ${Y}</span><b>${eurG(tot)}</b><small>${Math.round(tot / (totalAnio || 1) * 100)} % de todo lo gastado</small></div>
        <div><span>Media al mes</span><b>${eurG(tot / conG)}</b><small>${pm ? `presupuesto ${eurC(pm)} · ${tm.filter(x => x > pm).length ? plural(tm.filter(x => x > pm).length, 'mes pasado', 'meses pasados') : 'nunca te has pasado'}` : plural(conG, 'mes con gastos', 'meses con gastos')}</small></div>
        <div><span>Apuntes</span><b>${xs.length}</b><small>el mayor, ${eurG(Math.max(...xs.map(g => deCat(g, filtro))))}</small></div></div>
      <div class="cg-meses">${pm ? `<em class="cg-linea" style="--p:${Math.round(pm / max * 100)}%" title="Presupuesto ${eurC(pm)}"></em>` : ''}${meses.map((m, i) => `<button class="cg-mesbar${tm[i] ? '' : ' cero'}${pm && tm[i] > pm ? ' pasado' : ''}" data-cgir="${m}" title="Ver ${MESES[i]}"><i style="--alto:${Math.round(tm[i] / max * 100)}%;--h:${colorCatC(filtro)}"></i><b>${tm[i] ? n0C(tm[i]) : ''}</b><span>${MESES_C[i]}</span></button>`).join('')}</div>
      ${conc.length > 1 ? `<h3 class="cg-h3">Por concepto</h3><div class="cg-conc">${conc.slice(0, 12).map(c => `<div><span>${esc(c.nom)}</span><small class="tenue">${c.n} ×</small><b>${eurG(c.t)}</b></div>`).join('')}</div>` : ''}
      <h3 class="cg-h3">Todos los gastos de ${esc(filtro)} en ${Y}</h3>
      <div class="tabla-wrap"><table class="tabla cg-tabla"><thead><tr><th>Fecha</th><th>Concepto</th><th class="num">Importe</th></tr></thead><tbody>
      ${meses.map((m, i) => { const ms = xs.filter(g => g.fecha.startsWith(m)); return ms.length ? `<tr class="cg-sub"><td colspan="2">${MESES[i]}</td><td class="num">${eurG(tm[i])}</td></tr>` + ms.map(g => `<tr data-id="${g.id}"><td>${fechaC(g.fecha)}</td><td>${esc(g.concepto)}${g.partes ? ` <small class="tenue">(parte de ${eurG(g.importe)})</small>` : ''}${g.notas ? `<small class="bloque">${esc(g.notas)}</small>` : ''}</td><td class="num">${eurG(deCat(g, filtro))}</td></tr>`).join('') : ''; }).join('')}
      </tbody><tfoot><tr><td></td><td><b>Total ${Y}</b></td><td class="num"><b>${eurG(tot)}</b></td></tr></tfoot></table></div>`;
  };
  // Suscripciones: lo que pagas cada mes o cada año
  const suscripciones = () => {
    const sc = catSubs(), hoyM = hoy().slice(0, 7), desde = sumaMes(hoyM, -11);
    const todos = D.gastosCasa.filter(g => tieneCat(g, sc) && (g.fecha || '') <= hoy()).sort((a, b) => a.fecha.localeCompare(b.fecha));
    const grupos = {};
    todos.forEach(g => { const k = claveConcepto(g.concepto) || normCasa(g.concepto); (grupos[k] = grupos[k] || []).push(g); });
    (D.fijosCasa || []).filter(f => f.activo !== false && f.cat === sc).forEach(f => { const k = claveFijo(f); if (!grupos[k] && !Object.keys(grupos).some(x => x.includes(k) || k.includes(x))) grupos[k] = []; grupos[k].fijo = f; });
    const filasS = Object.entries(grupos).map(([k, gs]) => {
      const ult = gs[gs.length - 1], meses = new Set(gs.map(g => g.fecha.slice(0, 7)));
      const imp = ult ? deCat(ult, sc) : +gs.fijo.importe || 0;
      const fijo = gs.fijo || fijoDe(ult ? ult.concepto : '');
      // cada cuánto: por el fijo si lo hay; si no, por los meses en los que aparece
      let cada = fijo ? (fijo.cada || 'Mensual') : '';
      if (!cada) { const ms = [...meses].sort(); const saltos = ms.slice(1).map((m, i) => { const a = ms[i]; return (+m.slice(0, 4) - +a.slice(0, 4)) * 12 + (+m.slice(5) - +a.slice(5)); }); const med = saltos.length ? saltos.sort((a, b) => a - b)[Math.floor(saltos.length / 2)] : 0; cada = !saltos.length ? 'Mensual' : med <= 1 ? 'Mensual' : med <= 4 ? 'Trimestral' : 'Anual'; }
      const factorAnio = { Mensual: 12, Trimestral: 4, Anual: 1, 'Una vez': 0 }[cada] ?? 12;
      const ultAnio = gs.filter(g => g.fecha.slice(0, 7) >= desde).reduce((s, g) => s + deCat(g, sc), 0);
      const alAnio = cada === 'Una vez' ? ultAnio : imp * factorAnio;
      // cambio de precio: el último importe distinto del actual
      let cambioP = null;
      for (let i = gs.length - 2; i >= 0; i--) { const a = deCat(gs[i], sc); if (Math.abs(a - imp) > 0.005) { cambioP = { de: a, a: imp, cuando: gs[i + 1].fecha }; break; } }
      const dias = ult ? Math.round((aFecha(hoy()) - aFecha(ult.fecha)) / 864e5) : null;
      const parada = ult && cada === 'Mensual' && dias > 45;
      return { k, nom: ult ? ult.concepto : gs.fijo.concepto, imp, cada, alAnio, alMes: alAnio / 12, cambioP, ult, parada, fijo };
    }).sort((a, b) => (a.parada - b.parada) || b.alAnio - a.alAnio);
    const activas = filasS.filter(s => !s.parada && s.cada !== 'Una vez');
    const totMes = activas.reduce((s, x) => s + x.alMes, 0);
    if (!filasS.length) return `<div class="vacio"><p>No hay gastos en «${esc(sc)}».</p><p class="tenue">Cuando subas los movimientos del banco, Netflix, Spotify, iCloud, el gimnasio… irán aquí solos. Si alguna no cae, búscala con 🔍 y pásala a ${esc(sc)}.</p></div>`;
    return `<div class="cifras cg-cifras"><div><span>Tus suscripciones te cuestan</span><b>${eurG(totMes)}</b><small>al mes</small></div>
        <div><span>Al año</span><b>${eurG(totMes * 12)}</b><small>${plural(activas.length, 'suscripción activa', 'suscripciones activas')}</small></div>
        <div><span>Han subido de precio</span><b>${filasS.filter(s => s.cambioP && s.cambioP.a > s.cambioP.de).length}</b><small>${filasS.filter(s => s.parada).length ? plural(filasS.filter(s => s.parada).length, 'parece dada de baja', 'parecen dadas de baja') : 'en el último año'}</small></div></div>
      <div class="tabla-wrap"><table class="tabla cg-subs"><thead><tr><th>Suscripción</th><th>Cada</th><th>Último cobro</th><th class="num">Precio</th><th class="num">Al año</th><th>Precio antes</th><th></th></tr></thead><tbody>
      ${filasS.map(s => `<tr class="${s.parada ? 'parada' : ''}"><td><b>${esc(s.nom)}</b>${s.parada ? ' <span class="pill-cc gris">sin cobros desde hace ' + plural(Math.round((aFecha(hoy()) - aFecha(s.ult.fecha)) / 864e5 / 30), 'mes', 'meses') + '</span>' : ''}${s.fijo ? ' <span class="pill-cc gris">🔁 fijo</span>' : ''}</td>
        <td>${esc(s.cada === 'Mensual' ? 'Mes' : s.cada === 'Trimestral' ? 'Trimestre' : s.cada === 'Anual' ? 'Año' : 'Una vez')}</td><td>${s.ult ? fechaC(s.ult.fecha, true) : '<span class="tenue">aún no</span>'}</td>
        <td class="num"><b>${eurG(s.imp)}</b></td><td class="num">${eurG(s.alAnio)}</td>
        <td>${s.cambioP ? `<span class="${s.cambioP.a > s.cambioP.de ? 'rojo' : 'verde-t'}">${s.cambioP.a > s.cambioP.de ? '▲ subió' : '▼ bajó'} de ${eurC(s.cambioP.de)} (${MESES_C[+s.cambioP.cuando.slice(5, 7) - 1]} ${s.cambioP.cuando.slice(2, 4)})</span>` : '<span class="tenue">igual</span>'}</td>
        <td><button class="btn peq" data-cgver="${esc(s.k)}">Ver</button></td></tr>`).join('')}
      </tbody></table></div>
      <p class="nota">«Al año» es el precio actual × las veces que se cobra. Las que no se cobran desde hace más de mes y medio salen en gris y no cuentan en el total.</p>`;
  };
  // Selección de varios apuntes (gastos «g:id» e ingresos «i:id») para cambiarlos de golpe
  const SELC = window.SELC || (window.SELC = new Set());
  [...SELC].forEach(k => { const [t, id] = [k[0], k.slice(2)]; if (!(t === 'g' ? D.gastosCasa : D.ingresosCasa).some(x => x.id === id)) SELC.delete(k); });
  const chk = (k) => `<td class="cg-chk"><input type="checkbox" data-sel="${k}"${SELC.has(k) ? ' checked' : ''} aria-label="Seleccionar"></td>`;
  const chkTodos = (ks) => `<th class="cg-chk"><input type="checkbox" data-selall="${ks.join(',')}"${ks.length && ks.every(k => SELC.has(k)) ? ' checked' : ''} title="Seleccionar todos" aria-label="Seleccionar todos"></th>`;
  const barraSel = () => {
    if (!SELC.size) return '';
    const nG = [...SELC].filter(k => k[0] === 'g').length, nI = SELC.size - nG;
    const tG = [...SELC].filter(k => k[0] === 'g').reduce((s, k) => s + (+(D.gastosCasa.find(x => x.id === k.slice(2)) || {}).importe || 0), 0);
    const tI = [...SELC].filter(k => k[0] === 'i').reduce((s, k) => s + (+(D.ingresosCasa.find(x => x.id === k.slice(2)) || {}).importe || 0), 0);
    return `<div class="cg-selbar"><b>${[nG ? plural(nG, 'gasto', 'gastos') : '', nI ? plural(nI, 'ingreso', 'ingresos') : ''].filter(Boolean).join(' y ')} ${SELC.size === 1 ? 'elegido' : 'elegidos'}</b>${nG ? ' ' + eurG(tG) : ''}${nI ? ' ' + eurI(tI) : ''}
      <span class="hueco"></span>
      ${nG ? '<button class="btn" data-selacc="ing">➕ Pasar a ingresos</button>' : ''}
      <select id="cg-selcat"><option value="">${nI && !nG ? 'Pasar a gastos de…' : 'Cambiar categoría a…'}</option>${catsCasa().map(x => `<option>${esc(x)}</option>`).join('')}</select>
      <button class="btn" data-selacc="del">🗑 Borrar</button><button class="btn peq" data-selacc="nada">Quitar selección</button></div>`;
  };
  // Buscar un concepto en todos los gastos (de cualquier fecha) y pasarlos a una categoría
  const busca = normCasa(UI.cgBuscar || '');
  const encontrados = busca ? D.gastosCasa.filter(g => normCasa(g.concepto + ' ' + (g.notas || '')).includes(busca)).sort((a, b) => (b.fecha || '').localeCompare(a.fecha || '')) : [];
  const encontradosI = busca ? (D.ingresosCasa || []).filter(g => normCasa(g.concepto + ' ' + (g.notas || '')).includes(busca)).sort((a, b) => (b.fecha || '').localeCompare(a.fecha || '')) : [];
  const buscar = () => {
    if (!encontrados.length && !encontradosI.length) return `<p class="vacio">Ningún gasto ni ingreso tiene «${esc(UI.cgBuscar)}» en el concepto.</p>`;
    const cuentaCat = {}; encontrados.forEach(g => { cuentaCat[g.cat || 'Otros'] = (cuentaCat[g.cat || 'Otros'] || 0) + 1; });
    const masUsada = encontrados.length >= encontradosI.length && encontrados.length ? Object.entries(cuentaCat).sort((a, b) => b[1] - a[1])[0][0] : ES_ING;
    const regla = (D.reglasCasa || []).find(r => r.clave === busca);
    const todos = [...encontrados.map(g => ({ g, ing: false })), ...encontradosI.map(g => ({ g, ing: true }))].sort((a, b) => (b.g.fecha || '').localeCompare(a.g.fecha || ''));
    return `<div class="cg-pasar"><b>${[encontrados.length ? plural(encontrados.length, 'gasto', 'gastos') : '', encontradosI.length ? plural(encontradosI.length, 'ingreso', 'ingresos') : ''].filter(Boolean).join(' y ')} con «${esc(UI.cgBuscar)}»</b>${encontrados.length ? ' · ' + eurG(sumaG(encontrados)) : ''}${encontradosI.length ? ' · ' + eurI(sumaG(encontradosI)) : ''}
        <span class="hueco"></span><span>Pasarlos todos a</span>
        <select id="cg-pcat"><option value="${ES_ING}"${(regla ? regla.cat : masUsada) === ES_ING ? ' selected' : ''}>➕ Ingresos</option><optgroup label="Gastos">${catsCasa().map(x => `<option${x === (regla ? regla.cat : masUsada) ? ' selected' : ''}>${esc(x)}</option>`).join('')}</optgroup></select>
        <label class="cg-recordar"><input type="checkbox" id="cg-precord" checked> y también los que lleguen</label>
        <button class="btn prim" id="cg-paplicar">Pasar</button></div>
      ${regla ? `<p class="nota">Ya tienes guardado que «${esc(regla.clave)}» va a ${esc(regla.cat)}.</p>` : ''}
      ${barraSel()}
      <div class="tabla-wrap"><table class="tabla cg-tabla"><thead><tr>${chkTodos(todos.map(({ g, ing }) => (ing ? 'i:' : 'g:') + g.id))}<th>Fecha</th><th>Concepto</th><th>Categoría</th><th class="num">Importe</th></tr></thead><tbody>
      ${todos.map(({ g, ing }) => ing ? `<tr data-ing="${g.id}">${chk('i:' + g.id)}<td>${fechaC(g.fecha, true)}</td><td>${esc(g.concepto)}</td><td><span class="pill-cc cg-pill-ing">➕ Ingreso</span></td><td class="num">${eurI(g.importe)}</td></tr>`
        : `<tr data-id="${g.id}">${chk('g:' + g.id)}<td>${fechaC(g.fecha, true)}</td><td>${esc(g.concepto)}</td><td>${trozos(g).map(t => pill(t.cat)).join(' ')}</td><td class="num">${eurG(g.importe)}</td></tr>`).join('')}
      </tbody></table></div>`;
  };
  // Comparativa de ingresos y gastos: mes a mes (con el año anterior) y año a año
  const comparativa = () => {
    const G = D.gastosCasa, I = D.ingresosCasa || [];
    const sumM = (xs, m) => sumaG(xs.filter(g => (g.fecha || '').startsWith(m) && (g.fecha || '') <= hoy()));
    const meses = Array.from({ length: 12 }, (_, i) => `${Y}-${pad(i + 1)}`);
    const fil = meses.map(m => { const i = sumM(I, m), g = sumM(G, m), gAnt = sumM(G, sumaMes(m, -12)), iAnt = sumM(I, sumaMes(m, -12)); return { m, i, g, a: i - g, gAnt, iAnt }; });
    const conDatos = fil.filter(f => f.i || f.g);
    if (!conDatos.length && !G.length && !I.length) return `<div class="vacio"><p>Aún no hay ingresos ni gastos para comparar.</p></div>`;
    const max = Math.max(1, ...fil.map(f => Math.max(f.i, f.g)));
    const tI = fil.reduce((s, f) => s + f.i, 0), tG = fil.reduce((s, f) => s + f.g, 0), nM = conDatos.length || 1;
    const pct = (a, b) => b ? Math.round(a / b * 100) : null;
    const dif = (x, ant, gasto) => { if (!ant || !x) return '<span class="tenue">—</span>'; const d = x - ant, p = Math.round(d / ant * 100); const malo = gasto ? d > 0 : d < 0; return `<span class="${malo ? 'cg-rojo' : 'cg-verde'}">${d > 0 ? '▲' : '▼'} ${Math.abs(p)} %</span>`; };
    const mejor = conDatos.slice().sort((a, b) => b.a - a.a)[0], peor = conDatos.slice().sort((a, b) => b.g - a.g)[0];
    // año a año
    const anios = [...new Set([...G, ...I].map(g => (g.fecha || '').slice(0, 4)).filter(Boolean))].sort();
    const porAnio = anios.map(y => { const gs = G.filter(g => g.fecha.startsWith(y) && g.fecha <= hoy()), is = I.filter(g => g.fecha.startsWith(y) && g.fecha <= hoy()); const n = new Set([...gs, ...is].map(g => g.fecha.slice(0, 7))).size || 1; return { y, i: sumaG(is), g: sumaG(gs), n }; });
    const maxA = Math.max(1, ...porAnio.map(a => Math.max(a.i, a.g)));
    return `<div class="cifras cg-cifras cuatro"><div><span>Entró en ${Y}</span><b>${eurI(tI)}</b><small>${eurC(tI / nM)} al mes de media</small></div>
        <div><span>Gastado en ${Y}</span><b>${eurG(tG)}</b><small>${eurC(tG / nM)} al mes de media</small></div>
        <div><span>Ahorrado en ${Y}</span><b>${eurS(tI - tG)}</b><small>${tI ? pct(tI - tG, tI) + ' % de lo que entró' : 'sin ingresos apuntados'}</small></div>
        <div><span>Mejor mes</span><b>${mejor ? MESES[+mejor.m.slice(5) - 1] : '—'}</b><small>${mejor ? 'ahorraste ' + eurC(mejor.a) : ''}${peor && peor !== mejor ? ` · más gasto: ${MESES[+peor.m.slice(5) - 1]}` : ''}</small></div></div>
      <h3 class="cg-h3">Mes a mes</h3>
      <div class="cg-comp">${fil.map(f => `<button class="cg-compmes" data-cgir="${f.m}" title="Ver ${MESES[+f.m.slice(5) - 1]}"><span class="cg-par"><i class="ing" style="--alto:${Math.round(f.i / max * 100)}%"></i><i class="gas" style="--alto:${Math.round(f.g / max * 100)}%"></i></span><b class="${f.a < 0 ? 'cg-rojo' : f.a > 0 ? 'cg-verde' : 'tenue'}">${f.i || f.g ? (f.a < 0 ? '−' : '+') + n0C(Math.abs(f.a)) : ''}</b><small>${MESES_C[+f.m.slice(5) - 1]}</small></button>`).join('')}</div>
      <p class="cg-leyenda"><span><i class="ing"></i> Ingresos</span><span><i class="gas"></i> Gastos</span><span>Debajo, lo ahorrado ese mes</span></p>
      <div class="tabla-wrap"><table class="tabla cg-comptab"><thead><tr><th>Mes</th><th class="num">Ingresos</th><th class="num">Gastos</th><th class="num">Ahorro</th><th class="num">% ahorro</th><th class="num">Gastos ${+Y - 1}</th><th class="num">Gastos vs ${+Y - 1}</th><th class="num">Ingresos vs ${+Y - 1}</th></tr></thead><tbody>
      ${fil.map(f => `<tr data-cgir="${f.m}" class="${f.i || f.g ? '' : 'vacio-f'}"><td class="cap">${MESES[+f.m.slice(5) - 1]}</td><td class="num">${f.i ? eurI(f.i) : '<span class="tenue">—</span>'}</td><td class="num">${f.g ? eurG(f.g) : '<span class="tenue">—</span>'}</td><td class="num">${f.i || f.g ? `<b>${eurS(f.a)}</b>` : ''}</td><td class="num">${f.i ? `<span class="${f.a < 0 ? 'cg-rojo' : 'cg-verde'}">${pct(f.a, f.i)} %</span>` : ''}</td><td class="num tenue">${f.gAnt ? '−' + eurC(f.gAnt) : '—'}</td><td class="num">${dif(f.g, f.gAnt, true)}</td><td class="num">${dif(f.i, f.iAnt, false)}</td></tr>`).join('')}
      </tbody><tfoot><tr><td><b>Total ${Y}</b></td><td class="num"><b>${eurI(tI)}</b></td><td class="num"><b>${eurG(tG)}</b></td><td class="num"><b>${eurS(tI - tG)}</b></td><td class="num">${tI ? pct(tI - tG, tI) + ' %' : ''}</td><td class="num tenue">${(() => { const x = fil.reduce((s, f) => s + f.gAnt, 0); return x ? '−' + eurC(x) : '—'; })()}</td><td></td><td></td></tr></tfoot></table></div>
      ${porAnio.length ? `<h3 class="cg-h3">Año a año</h3>
      <div class="tabla-wrap"><table class="tabla cg-comptab"><thead><tr><th>Año</th><th></th><th class="num">Ingresos</th><th class="num">Gastos</th><th class="num">Ahorro</th><th class="num">% ahorro</th><th class="num">Gasto medio al mes</th><th class="num">Gastos vs año anterior</th></tr></thead><tbody>
      ${porAnio.map((a, k) => `<tr data-cganio="${a.y}" class="${a.y === Y ? 'sel' : ''}"><td><b>${a.y}</b>${a.y === hoy().slice(0, 4) ? ' <small class="tenue">(hasta hoy)</small>' : ''}</td><td class="cg-abarra"><i class="ing" style="--w:${Math.round(a.i / maxA * 100)}%"></i><i class="gas" style="--w:${Math.round(a.g / maxA * 100)}%"></i></td><td class="num">${eurI(a.i)}</td><td class="num">${eurG(a.g)}</td><td class="num"><b>${eurS(a.i - a.g)}</b></td><td class="num">${a.i ? pct(a.i - a.g, a.i) + ' %' : '—'}</td><td class="num">${eurC(a.g / a.n)}</td><td class="num">${k ? dif(a.g / a.n, porAnio[k - 1].g / porAnio[k - 1].n, true) + ' <small class="tenue">al mes</small>' : '<span class="tenue">—</span>'}</td></tr>`).join('')}
      </tbody></table></div><p class="nota">Solo cuenta lo ya pasado (no los fijos «previstos»). «Gastos vs año anterior» compara el gasto medio al mes, para que un año a medias no salga engañoso.</p>` : ''}`;
  };
  // Vista del mes
  const vistaMes = () => {
    const ingT = sumaG(ingMes);
    const cifras = hayIngresos
      ? `<div class="cifras cg-cifras cuatro"><div><span>Entró en ${MESES[+mes.slice(5) - 1]}</span><b>${eurI(ingT)}</b><small>${plural(ingMes.length, 'ingreso', 'ingresos')}</small></div>
        <div><span>Gastado</span><b>${eurG(total)}</b>${totalAnt ? `<small class="${total > totalAnt ? 'rojo' : 'verde-t'}">${total > totalAnt ? '▲' : '▼'} ${eurC(Math.abs(total - totalAnt))} que el mes anterior</small>` : ''}</div>
        <div><span>Ahorrado</span><b>${eurS(ingT - total)}</b><small>${ingT ? Math.round((ingT - total) / ingT * 100) + ' % de lo que entró' : 'sin ingresos apuntados'}</small></div>
        <div><span>Lo que más</span><b>${cats[0] && cats[0][1] ? esc(cats[0][0]) : '—'}</b>${cats[0] && cats[0][1] ? `<small>${eurG(cats[0][1])}</small>` : ''}</div></div>`
      : `<div class="cifras cg-cifras"><div><span>Gastado en ${MESES[+mes.slice(5) - 1]}</span><b>${eurG(total)}</b>${totalAnt ? `<small class="${total > totalAnt ? 'rojo' : 'verde-t'}">${total > totalAnt ? '▲' : '▼'} ${eurC(Math.abs(total - totalAnt))} que el mes anterior</small>` : ''}</div>
        <div><span>Media al mes en ${Y}</span><b>${eurG(sumaG(delAnio) / mesesConGasto)}</b></div>
        <div><span>Lo que más</span><b>${cats[0] && cats[0][1] ? esc(cats[0][0]) : '—'}</b>${cats[0] && cats[0][1] ? `<small>${eurG(cats[0][1])}</small>` : ''}</div></div>`;
    const barra = ([cat, v]) => {
      const pm = +P[cat] || 0, est = pm ? (v > pm ? ' pasado' : v >= pm * 0.85 ? ' cerca' : ' bien') : '';
      return `<button class="cg-cat${filtro === cat ? ' on' : ''}${est}" data-cgcat="${esc(cat)}"><span>${pill(cat)}</span><span class="cg-barra"><i style="--w:${Math.round(v / maxC * 100)}%;--h:${colorCatC(cat)}"></i>${pm ? `<em style="--p:${Math.round(pm / maxC * 100)}%" title="Presupuesto ${eurC(pm)}"></em>` : ''}</span><b>${eurG(v)}</b><small>${pm ? `de ${n0C(pm)} €` : Math.round(v / (total || 1) * 100) + ' %'}</small></button>`;
    };
    const filaGasto = (g) => {
      const previsto = (g.fecha || '') > hoy();
      const catCelda = g.partes ? `<span class="cg-partes" title="Repartido">${g.partes.map(t => pill(`${t.cat} ${n0C(t.importe)}`)).join(' ')}</span>`
        : `<select class="cg-sel" data-cgset="${g.id}" style="--h:${colorCatC(g.cat)}">${catsCasa().map(x => `<option${x === g.cat ? ' selected' : ''}>${esc(x)}</option>`).join('')}</select>`;
      return `<tr data-id="${g.id}" class="${previsto ? 'previsto' : ''}${SELC.has('g:' + g.id) ? ' sel' : ''}">${chk('g:' + g.id)}<td>${fechaC(g.fecha)}</td><td><b>${esc(g.concepto)}</b>${g.fijo ? ' <span class="pill-cc gris" title="Gasto fijo: se apunta solo">🔁</span>' : g.periodicidad && g.periodicidad !== 'Puntual' ? ` <span class="pill-cc gris">${esc(g.periodicidad)}</span>` : ''}${previsto ? ' <span class="pill-cc gris">previsto</span>' : ''}${g.notas ? `<small class="bloque">${esc(g.notas)}</small>` : ''}</td>
        <td>${catCelda}</td><td class="num"><b>${eurG(filtro && g.partes ? deCat(g, filtro) : g.importe)}</b>${filtro && g.partes ? `<small class="bloque tenue">de ${eurG(g.importe)}</small>` : ''}</td>
        <td><button class="btn-x" data-cgdel="${g.id}" title="Borrar" aria-label="Borrar">×</button></td></tr>`;
    };
    return `${cifras}
    ${cats.length ? `<div class="cg-cats">${cats.map(barra).join('')}</div>` : ''}
    ${filtro ? `<p class="nota">Solo ${esc(filtro)} · <a href="#" id="cg-todas">ver todas</a></p>` : ''}
    ${barraSel()}
    ${filas.length ? `<div class="tabla-wrap"><table class="tabla cg-tabla"><thead><tr>${chkTodos(filas.map(g => 'g:' + g.id))}<th>Fecha</th><th>Concepto</th><th>Categoría</th><th class="num">Importe</th><th></th></tr></thead><tbody>
      ${filas.map(filaGasto).join('')}
      </tbody><tfoot><tr><td></td><td></td><td><b>Total${filtro ? ' ' + esc(filtro) : ''}</b></td><td></td><td class="num"><b>${eurG(sumaCat(filas, filtro))}</b></td><td></td></tr></tfoot></table></div>`
      : `<div class="vacio"><p>No hay gastos de casa en ${nombreM(mes)}.</p><p class="tenue">Apúntalos con <b>+ Gasto</b> o sube el archivo de movimientos de tu banco: la app separa los gastos, los clasifica (supermercado, suscripciones, colegio…) y aprende de lo que corrijas.</p></div>`}
    ${ingMes.length ? `<h3 class="cg-h3">Ingresos de ${MESES[+mes.slice(5) - 1]}</h3><div class="tabla-wrap"><table class="tabla cg-tabla cg-ingt"><thead><tr>${chkTodos(ingMes.map(g => 'i:' + g.id))}<th>Fecha</th><th>Concepto</th><th class="num">Importe</th><th></th></tr></thead><tbody>
      ${ingMes.map(g => `<tr data-ing="${g.id}" class="${SELC.has('i:' + g.id) ? 'sel' : ''}">${chk('i:' + g.id)}<td>${fechaC(g.fecha)}</td><td>${esc(g.concepto)}</td><td class="num"><b>${eurI(g.importe)}</b></td><td><button class="btn-x" data-ingdel="${g.id}" title="Borrar" aria-label="Borrar">×</button></td></tr>`).join('')}
      </tbody><tfoot><tr><td></td><td></td><td><b>Total ingresos</b></td><td class="num"><b>${eurI(ingT)}</b></td><td></td></tr></tfoot></table></div>` : ''}`;
  };

  c.innerHTML = `<div class="cg-cab">
      <div class="cg-mes"><button class="btn peq" id="cg-ant" aria-label="Anterior">‹</button><b>${vista === 'anio' || vista === 'comp' ? Y : vista === 'subs' ? 'Último año' : nombreM(mes)}</b><button class="btn peq" id="cg-sig" aria-label="Siguiente">›</button></div>
      <div class="segmentado peq"><button class="${vista === 'mes' ? 'on' : ''}" data-cgv="mes">Mes</button><button class="${vista === 'anio' ? 'on' : ''}" data-cgv="anio">Año</button><button class="${vista === 'subs' ? 'on' : ''}" data-cgv="subs">Suscripciones</button><button class="${vista === 'comp' ? 'on' : ''}" data-cgv="comp">Comparativa</button></div>
      ${vista === 'subs' || vista === 'comp' ? '' : `<select id="cg-filtro" class="cg-filtro${filtro ? ' on' : ''}" aria-label="Tipo de gasto"><option value="">Todos los gastos</option>${catsCasa().map(x => `<option${x === filtro ? ' selected' : ''}>${esc(x)}</option>`).join('')}</select>`}
      <input type="search" id="cg-buscar" class="cg-buscar" placeholder="🔍 Buscar concepto…" value="${esc(UI.cgBuscar || '')}" aria-label="Buscar concepto"></div>
    <div class="cg-cab cg-acc">
      <button class="btn prim" id="cg-nuevo">+ Gasto</button><button class="btn" id="cg-ning">+ Ingreso</button>
      <button class="btn" id="cg-csv">⬆️ Subir movimientos del banco</button>
      <span class="hueco"></span>
      <button class="btn" id="cg-fijos" title="Gastos que se apuntan solos cada mes">🔁 Fijos${(D.fijosCasa || []).length ? ' · ' + (D.fijosCasa || []).filter(f => f.activo !== false).length : ''}</button>
      <button class="btn" id="cg-excel">⬇️ Excel</button>
      <input type="file" id="cg-file" accept=".csv,.txt,.xlsx,.xls,text/csv" hidden></div>
    ${busca ? buscar() : vista === 'comp' ? comparativa() : vista === 'subs' ? suscripciones() : vista === 'anio' ? (filtro ? anioCat() : anio()) : vistaMes()}`;

  const bq = $('#cg-buscar', c); let tBq;
  bq.oninput = () => { clearTimeout(tBq); tBq = setTimeout(() => { UI.cgBuscar = bq.value; pintar(); const n = $('#cg-buscar'); if (n) { n.focus(); n.setSelectionRange(n.value.length, n.value.length); } }, 250); };
  bq.onkeydown = (e) => { if (e.key === 'Escape') { UI.cgBuscar = ''; pintar(); } };
  const pa = $('#cg-paplicar', c);
  if (pa) pa.onclick = () => {
    const cat = $('#cg-pcat', c).value, recordar = $('#cg-precord', c).checked;
    const copia = JSON.stringify({ g: D.gastosCasa, i: D.ingresosCasa || [], r: D.reglasCasa || [] });
    const n = encontrados.length + encontradosI.length;
    if (cat === ES_ING) encontrados.forEach(g => gastoAIngreso(g));
    else { encontrados.forEach(g => { g.cat = cat; delete g.partes; }); encontradosI.forEach(i => ingresoAGasto(i, cat)); }
    if (recordar) { D.reglasCasa = (D.reglasCasa || []).filter(r => r.clave !== busca); D.reglasCasa.push({ clave: busca, cat, mano: true }); }
    cambio();
    aviso(`${plural(n, 'apunte pasado', 'apuntes pasados')} a ${cat === ES_ING ? 'ingresos' : cat}${recordar ? '; los próximos irán solos' : ''}`, { t: 'Deshacer', fn: () => { const a = JSON.parse(copia); D.gastosCasa = a.g; D.ingresosCasa = a.i; D.reglasCasa = a.r; cambio(); } });
  };
  const mover = (k) => { UI.cgMes = sumaMes(mes, vista === 'anio' || vista === 'comp' ? 12 * k : k); guardarUI(); pintar(); };
  $('#cg-ant', c).onclick = () => mover(-1); $('#cg-sig', c).onclick = () => mover(1);
  if (vista === 'subs') { $('#cg-ant', c).style.visibility = 'hidden'; $('#cg-sig', c).style.visibility = 'hidden'; }
  const fl = $('#cg-filtro', c); if (fl) fl.onchange = (e) => { UI.cgCat = e.target.value; guardarUI(); pintar(); };
  $$('[data-cganio]', c).forEach(tr => tr.onclick = () => { UI.cgMes = tr.dataset.cganio + UI.cgMes.slice(4); if (!UI.cgMes || UI.cgMes.length !== 7) UI.cgMes = tr.dataset.cganio + '-01'; guardarUI(); pintar(); });
  $$('[data-cgir]', c).forEach(b => b.onclick = () => { UI.cgMes = b.dataset.cgir; UI.cgVista = 'mes'; guardarUI(); pintar(); });
  $$('.cg-anio [data-cgfila]', c).forEach(tr => tr.onclick = () => { UI.cgCat = tr.dataset.cgfila; guardarUI(); pintar(); });
  $$('[data-sel]', c).forEach(x => x.onchange = () => { if (x.checked) SELC.add(x.dataset.sel); else SELC.delete(x.dataset.sel); pintar(); });
  $$('[data-selall]', c).forEach(x => x.onchange = () => { x.dataset.selall.split(',').filter(Boolean).forEach(k => x.checked ? SELC.add(k) : SELC.delete(k)); pintar(); });
  const hacerSel = (fn, texto) => {
    const copia = JSON.stringify({ g: D.gastosCasa, i: D.ingresosCasa || [] }), ks = [...SELC];
    const gs = ks.filter(k => k[0] === 'g').map(k => D.gastosCasa.find(x => x.id === k.slice(2))).filter(Boolean);
    const is = ks.filter(k => k[0] === 'i').map(k => D.ingresosCasa.find(x => x.id === k.slice(2))).filter(Boolean);
    fn(gs, is); SELC.clear(); cambio();
    aviso(texto, { t: 'Deshacer', fn: () => { const a = JSON.parse(copia); D.gastosCasa = a.g; D.ingresosCasa = a.i; ks.forEach(k => SELC.add(k)); cambio(); } });
  };
  $$('[data-selacc]', c).forEach(b => b.onclick = () => {
    const a = b.dataset.selacc;
    if (a === 'nada') { SELC.clear(); pintar(); return; }
    if (a === 'ing') hacerSel((gs) => gs.forEach(g => gastoAIngreso(g)), `${plural([...SELC].filter(k => k[0] === 'g').length, 'gasto pasado', 'gastos pasados')} a ingresos`);
    if (a === 'del') hacerSel((gs, is) => { const sg = new Set(gs.map(x => x.id)), si = new Set(is.map(x => x.id)); D.gastosCasa = D.gastosCasa.filter(x => !sg.has(x.id)); D.ingresosCasa = (D.ingresosCasa || []).filter(x => !si.has(x.id)); }, `${plural(SELC.size, 'apunte borrado', 'apuntes borrados')}`);
  });
  const sc = $('#cg-selcat', c); if (sc) sc.onchange = () => { const cat = sc.value; if (!cat) return; hacerSel((gs, is) => { gs.forEach(g => { g.cat = cat; delete g.partes; }); is.forEach(i => ingresoAGasto(i, cat)); }, `${plural(SELC.size, 'apunte pasado', 'apuntes pasados')} a ${cat}`); };
  $$('[data-cgv]', c).forEach(b => b.onclick = () => { SELC.clear(); UI.cgVista = b.dataset.cgv; UI.cgBuscar = ''; guardarUI(); pintar(); });
  $$('[data-cgcat]', c).forEach(b => b.onclick = () => { UI.cgCat = UI.cgCat === b.dataset.cgcat ? '' : b.dataset.cgcat; guardarUI(); pintar(); });
  $$('[data-cgver]', c).forEach(b => b.onclick = () => { UI.cgBuscar = b.dataset.cgver; pintar(); });
  const td = $('#cg-todas', c); if (td) td.onclick = (e) => { e.preventDefault(); UI.cgCat = ''; guardarUI(); pintar(); };
  const fechaNueva = () => mes === hoy().slice(0, 7) ? hoy() : mes + '-01';
  $('#cg-nuevo', c).onclick = () => editarGastoCasa({ fecha: fechaNueva(), periodicidad: 'Puntual', cat: filtro || '' }, true);
  $('#cg-ning', c).onclick = () => editarIngresoCasa({ fecha: fechaNueva() }, true);
  $('#cg-fijos', c).onclick = () => ventanaFijos();
  $('#cg-excel', c).onclick = () => exportarGastosExcel(Y);
  $('#cg-csv', c).onclick = () => $('#cg-file', c).click();
  $('#cg-file', c).onchange = (e) => { const f = e.target.files[0]; e.target.value = ''; if (f) importarBanco(f); };
  $$('[data-cgset]', c).forEach(s => s.onchange = () => {
    const g = D.gastosCasa.find(x => x.id === s.dataset.cgset); if (!g) return;
    g.cat = s.value; recordarCat(g.concepto, g.cat);
    // Lo mismo para los demás movimientos con el mismo comercio que estaban en «Otros»
    const k = claveConcepto(g.concepto); let otros = 0;
    D.gastosCasa.forEach(x => { if (x !== g && !x.partes && x.cat === 'Otros' && k && claveConcepto(x.concepto) === k) { x.cat = g.cat; otros++; } });
    cambio(); if (otros) aviso(`También he puesto ${plural(otros, 'otro gasto', 'otros gastos')} de «${g.concepto}» en ${g.cat}. La próxima vez lo clasifico solo.`);
  });
  $$('[data-cgdel]', c).forEach(b => b.onclick = () => { const antes = D.gastosCasa.slice(); D.gastosCasa = D.gastosCasa.filter(x => x.id !== b.dataset.cgdel); cambio(); aviso('Gasto borrado', { t: 'Deshacer', fn: () => { D.gastosCasa = antes; cambio(); } }); });
  $$('[data-ingdel]', c).forEach(b => b.onclick = () => { const antes = D.ingresosCasa.slice(); D.ingresosCasa = D.ingresosCasa.filter(x => x.id !== b.dataset.ingdel); cambio(); aviso('Ingreso borrado', { t: 'Deshacer', fn: () => { D.ingresosCasa = antes; cambio(); } }); });
  $$('.cg-tabla tbody tr[data-id]', c).forEach(tr => tr.onclick = (e) => { if (e.target.closest('select,button,a,input,.cg-chk')) return; const g = D.gastosCasa.find(x => x.id === tr.dataset.id); if (g) editarGastoCasa(g, false); });
  $$('tr[data-ing]', c).forEach(tr => tr.onclick = (e) => { if (e.target.closest('button,input,.cg-chk')) return; const g = D.ingresosCasa.find(x => x.id === tr.dataset.ing); if (g) editarIngresoCasa(g, false); });
}

function editarGastoCasa(g, nuevo) {
  ficha({
    titulo: nuevo ? 'Nuevo gasto de casa' : 'Gasto de casa', obj: { ...g, tipo: 'Gasto' },
    campos: [
      { k: 'concepto', t: 'Concepto', tipo: 'lista', op: [...new Set((D.gastosCasa || []).map(x => x.concepto))].slice(-200) },
      { k: 'importe', t: 'Importe (€)', tipo: 'num', ancho: 'medio' },
      { k: 'fecha', t: 'Fecha', tipo: 'fecha', ancho: 'medio' },
      { k: 'tipo', t: 'Es', tipo: 'select', op: ['Gasto', 'Ingreso'], vacio: false, ancho: 'medio' },
      { k: 'cat', t: g.partes ? 'Categoría (está repartido)' : 'Categoría', tipo: 'lista', op: catsCasa(), ancho: 'medio' },
      { k: 'periodicidad', t: 'Se repite', tipo: 'select', op: ['Puntual', 'Mensual', 'Trimestral', 'Anual'], vacio: false, ancho: 'medio' },
      { k: 'notas', t: 'Notas', tipo: 'texto' },
    ],
    extras: [{ t: '÷ Repartir en categorías', fn: (r, cerrar) => { const fin = guardarGastoCasa(g, r); if (!fin) return; cerrar(); repartirGasto(fin); } }],
    onGuardar: (r) => {
      if (r.tipo === 'Ingreso') { // era un ingreso: se pasa a Ingresos (y los próximos con ese concepto también)
        if (!r.concepto) { aviso('Escribe el concepto'); return false; }
        const x = { ...g, ...r, id: g.id || uid(), importe: Math.abs(+r.importe || 0), fecha: r.fecha || hoy() };
        if (!nuevo) D.gastosCasa = D.gastosCasa.filter(y => y.id !== g.id);
        gastoAIngreso(x); reglaTipo(x.concepto, true); cambio();
        aviso(`«${x.concepto}» pasa a ingresos (+${eurC(x.importe)}). Los próximos con ese concepto irán solos.`); return;
      }
      if (!guardarGastoCasa(g, r)) return false;
    },
    onBorrar: nuevo ? null : () => { D.gastosCasa = D.gastosCasa.filter(x => x.id !== g.id); cambio(); return true; },
  });
}
function guardarGastoCasa(g, r) {
  if (!r.concepto) { aviso('Escribe el concepto'); return null; }
  const fin = { ...g, ...r, id: g.id || uid(), importe: Math.abs(+r.importe || 0), cat: r.cat || adivinarCat(r.concepto), fecha: r.fecha || hoy() }; delete fin.tipo;
  if (fin.partes) { // si cambia el importe, se ajusta la última parte
    const resto = fin.importe - fin.partes.slice(0, -1).reduce((s, t) => s + +t.importe, 0);
    if (resto > 0) fin.partes = [...fin.partes.slice(0, -1), { ...fin.partes[fin.partes.length - 1], importe: Math.round(resto * 100) / 100 }]; else delete fin.partes;
  }
  if (r.cat && !fin.partes) recordarCat(fin.concepto, fin.cat);
  // Si se repite y aún no es fijo, se convierte en gasto fijo: se apuntará solo
  if (fin.periodicidad && fin.periodicidad !== 'Puntual' && !fin.fijo) {
    const m = fin.fecha.slice(0, 7), f = { id: uid(), concepto: fin.concepto, importe: fin.importe, cat: fin.cat, cada: fin.periodicidad, dia: +fin.fecha.slice(8), mes: +m.slice(5), desde: m, hechos: [m], clave: claveConcepto(fin.concepto), activo: true };
    (D.fijosCasa = D.fijosCasa || []).push(f); fin.fijo = f.id;
    aviso(`«${fin.concepto}» se apuntará solo ${fin.periodicidad === 'Mensual' ? 'cada mes' : fin.periodicidad === 'Trimestral' ? 'cada trimestre' : 'cada año'} (lo ves en 🔁 Fijos)`);
  }
  if (!D.gastosCasa) D.gastosCasa = [];
  const k = D.gastosCasa.findIndex(x => x.id === fin.id);
  if (k >= 0) D.gastosCasa[k] = fin; else D.gastosCasa.push(fin);
  cambio();
  return fin;
}

// Repartir un gasto entre varias categorías (p. ej. súper: comida + material escolar)
function repartirGasto(g) {
  let partes = (g.partes || [{ cat: g.cat || 'Otros', importe: +g.importe }]).map(t => ({ ...t }));
  if (partes.length === 1) partes.push({ cat: '', importe: 0 });
  const total = +g.importe || 0;
  modal(`<h3>Repartir «${esc(g.concepto)}» (${eurC(total)})</h3><p class="suave">Pon cuánto va a cada categoría. Lo que quede sin repartir se queda en la primera.</p><div id="rp-lista"></div>
    <button class="btn peq" id="rp-mas">+ Otra categoría</button><p id="rp-falta" class="nota"></p>
    <div class="pie">${g.partes ? '<button class="btn" id="rp-quitar">Quitar el reparto</button>' : ''}<span class="hueco"></span><button class="btn" data-cerrar>Cancelar</button><button class="btn prim" id="rp-ok">Guardar</button></div>`, {
    alAbrir: (m, cerrar) => {
      const pinta = () => {
        $('#rp-lista', m).innerHTML = partes.map((t, i) => `<div class="rp-fila"><select data-rpc="${i}"><option value="">Elige…</option>${catsCasa().map(x => `<option${x === t.cat ? ' selected' : ''}>${esc(x)}</option>`).join('')}</select><input type="number" step="0.01" min="0" data-rpi="${i}" value="${t.importe || ''}" placeholder="€">${i ? `<button class="btn-x" data-rpx="${i}" aria-label="Quitar">×</button>` : '<span></span>'}</div>`).join('');
        const suma = partes.reduce((s, t) => s + (+t.importe || 0), 0), falta = Math.round((total - suma) * 100) / 100;
        $('#rp-falta', m).innerHTML = falta > 0 ? `Falta por repartir: <b>${eurC(falta)}</b> (irá a la primera)` : falta < 0 ? `<span class="rojo">Te pasas en ${eurC(-falta)}</span>` : 'Todo repartido ✓';
        $$('[data-rpc]', m).forEach(s => s.onchange = () => { partes[+s.dataset.rpc].cat = s.value; pinta(); });
        $$('[data-rpi]', m).forEach(s => s.onchange = () => { partes[+s.dataset.rpi].importe = Math.abs(+s.value || 0); pinta(); });
        $$('[data-rpx]', m).forEach(b => b.onclick = () => { partes.splice(+b.dataset.rpx, 1); pinta(); });
      };
      pinta();
      $('#rp-mas', m).onclick = () => { partes.push({ cat: '', importe: 0 }); pinta(); };
      const q = $('#rp-quitar', m); if (q) q.onclick = () => { delete g.partes; cambio(); cerrar(); aviso('Reparto quitado'); };
      $('#rp-ok', m).onclick = () => {
        let ps = partes.filter(t => t.cat && +t.importe > 0).map(t => ({ cat: t.cat, importe: Math.round(+t.importe * 100) / 100 }));
        if (!partes[0].cat) { aviso('Elige la categoría de la primera parte'); return; }
        const suma = ps.reduce((s, t) => s + t.importe, 0);
        if (suma - total > 0.005) { aviso('Las partes suman más que el gasto'); return; }
        const falta = Math.round((total - suma) * 100) / 100;
        if (falta > 0) { const p0 = ps.find(t => t.cat === partes[0].cat); if (p0) p0.importe = Math.round((p0.importe + falta) * 100) / 100; else ps.unshift({ cat: partes[0].cat, importe: falta }); }
        // juntar repetidas
        const j = {}; ps.forEach(t => { j[t.cat] = Math.round(((j[t.cat] || 0) + t.importe) * 100) / 100; }); ps = Object.entries(j).map(([cat, importe]) => ({ cat, importe }));
        if (ps.length < 2) { delete g.partes; g.cat = ps[0] ? ps[0].cat : g.cat; }
        else { g.partes = ps; g.cat = ps.slice().sort((a, b) => b.importe - a.importe)[0].cat; }
        cambio(); cerrar(); aviso(ps.length < 2 ? 'Guardado' : `Repartido en ${ps.length} categorías`);
      };
    }
  });
}

function editarIngresoCasa(g, nuevo) {
  ficha({
    titulo: nuevo ? 'Nuevo ingreso' : 'Ingreso', obj: { ...g, tipo: 'Ingreso' },
    campos: [
      { k: 'concepto', t: 'Concepto', tipo: 'lista', op: [...new Set((D.ingresosCasa || []).map(x => x.concepto))].slice(-100) },
      { k: 'importe', t: 'Importe (€)', tipo: 'num', ancho: 'medio' },
      { k: 'fecha', t: 'Fecha', tipo: 'fecha', ancho: 'medio' },
      { k: 'tipo', t: 'Es', tipo: 'select', op: ['Ingreso', 'Gasto'], vacio: false, ancho: 'medio' },
      { k: 'cat', t: 'Categoría (si es gasto)', tipo: 'lista', op: catsCasa(), ancho: 'medio' },
      { k: 'notas', t: 'Notas', tipo: 'texto' },
    ],
    onGuardar: (r) => {
      if (!r.concepto) { aviso('Escribe el concepto'); return false; }
      if (r.tipo === 'Gasto') { // era un gasto: se pasa a Gastos
        const x = { ...g, ...r, id: g.id || uid(), importe: Math.abs(+r.importe || 0), fecha: r.fecha || hoy() };
        if (!nuevo) D.ingresosCasa = D.ingresosCasa.filter(y => y.id !== g.id);
        ingresoAGasto(x, r.cat); reglaTipo(x.concepto, false); if (r.cat) recordarCat(x.concepto, r.cat); cambio();
        aviso(`«${x.concepto}» pasa a gastos (−${eurC(x.importe)})`); return;
      }
      const fin = { ...g, ...r, id: g.id || uid(), importe: Math.abs(+r.importe || 0), fecha: r.fecha || hoy() }; delete fin.tipo; delete fin.cat;
      if (!D.ingresosCasa) D.ingresosCasa = [];
      const k = D.ingresosCasa.findIndex(x => x.id === fin.id);
      if (k >= 0) D.ingresosCasa[k] = fin; else D.ingresosCasa.push(fin);
      cambio();
    },
    onBorrar: nuevo ? null : () => { D.ingresosCasa = D.ingresosCasa.filter(x => x.id !== g.id); cambio(); return true; },
  });
}

// ---------- ventana de gastos fijos ----------
function ventanaFijos() {
  modal(`<h3>🔁 Gastos fijos</h3><p class="suave">Se apuntan solos el día que toca (el del mes en curso sale como «previsto»). Cuando subes el archivo del banco, el cargo real se junta con el previsto: no se cuenta dos veces.</p><div id="fj-lista"></div>
    <div class="pie"><button class="btn prim" id="fj-nuevo">+ Gasto fijo</button><span class="hueco"></span><button class="btn" data-cerrar>Cerrar</button></div>`, {
    clase: 'ancha',
    alAbrir: (m, cerrar) => {
      const pinta = () => {
        const fs = (D.fijosCasa || []).slice().sort((a, b) => (a.activo === false) - (b.activo === false) || a.concepto.localeCompare(b.concepto, 'es'));
        const alMes = fs.filter(f => f.activo !== false).reduce((s, f) => s + (+f.importe || 0) / ({ Mensual: 1, Trimestral: 3, Anual: 12 }[f.cada || 'Mensual'] || 1), 0);
        $('#fj-lista', m).innerHTML = fs.length ? `<div class="tabla-wrap"><table class="tabla cg-tabla"><thead><tr><th>Concepto</th><th>Categoría</th><th>Cuándo</th><th class="num">Importe</th><th></th></tr></thead><tbody>
          ${fs.map(f => `<tr data-fj="${f.id}" class="${f.activo === false ? 'parada' : ''}"><td><b>${esc(f.concepto)}</b>${f.activo === false ? ' <span class="pill-cc gris">en pausa</span>' : ''}<small class="bloque tenue">en el banco: «${esc(claveFijo(f))}»</small></td><td><span class="pill-cc" style="--h:${colorCatC(f.cat)}">${esc(f.cat || 'Otros')}</span></td>
            <td>${f.cada === 'Anual' ? `cada año, ${+f.dia || 1} de ${MESES[(+f.mes || 1) - 1]}` : f.cada === 'Trimestral' ? `cada 3 meses, día ${+f.dia || 1}` : `cada mes, día ${+f.dia || 1}`}</td><td class="num"><b>${eurG(f.importe)}</b></td>
            <td><button class="btn-x" data-fjdel="${f.id}" title="Borrar" aria-label="Borrar">×</button></td></tr>`).join('')}
          </tbody><tfoot><tr><td colspan="3"><b>Al mes (de media)</b></td><td class="num"><b>${eurG(alMes)}</b></td><td></td></tr></tfoot></table></div>`
          : '<p class="vacio">Aún no tienes gastos fijos. Añade el alquiler, la luz, el colegio, las suscripciones… o marca «Se repite» en cualquier gasto.</p>';
        $$('[data-fj]', m).forEach(tr => tr.onclick = (e) => { if (e.target.closest('button')) return; editarFijo(D.fijosCasa.find(f => f.id === tr.dataset.fj), pinta); });
        $$('[data-fjdel]', m).forEach(b => b.onclick = () => {
          const antes = D.fijosCasa.slice(); D.fijosCasa = D.fijosCasa.filter(f => f.id !== b.dataset.fjdel);
          // los previstos que aún no han pasado se quitan; lo ya pagado se queda
          const prevAntes = D.gastosCasa.slice(); D.gastosCasa = D.gastosCasa.filter(g => !(g.fijo === b.dataset.fjdel && g.origen === 'fijo' && g.fecha > hoy()));
          cambio(); pinta(); aviso('Gasto fijo borrado (lo ya apuntado se queda)', { t: 'Deshacer', fn: () => { D.fijosCasa = antes; D.gastosCasa = prevAntes; cambio(); pinta(); } });
        });
      };
      pinta();
      $('#fj-nuevo', m).onclick = () => editarFijo(null, pinta);
    }
  });
}
function editarFijo(f, despues) {
  const nuevo = !f, hoyM = hoy().slice(0, 7);
  const base = f ? { ...f, mesN: MESES[(+f.mes || 1) - 1], desdeF: (f.desde || hoyM) + '-01', activo: f.activo !== false } : { cada: 'Mensual', dia: +hoy().slice(8), mesN: MESES[+hoyM.slice(5) - 1], desdeF: hoyM + '-01', activo: true };
  ficha({
    titulo: nuevo ? 'Nuevo gasto fijo' : 'Gasto fijo', obj: base,
    campos: [
      { k: 'concepto', t: 'Concepto', tipo: 'lista', op: [...new Set((D.gastosCasa || []).map(x => x.concepto))].slice(-200) },
      { k: 'importe', t: 'Importe (€)', tipo: 'num', ancho: 'medio' },
      { k: 'cat', t: 'Categoría', tipo: 'lista', op: catsCasa(), ancho: 'medio' },
      { k: 'cada', t: 'Se repite', tipo: 'select', op: ['Mensual', 'Trimestral', 'Anual'], vacio: false, ancho: 'medio' },
      { k: 'dia', t: 'Día del mes', tipo: 'num', ancho: 'medio' },
      { k: 'mesN', t: 'Mes (si es anual o trimestral)', tipo: 'select', op: MESES, vacio: false, ancho: 'medio' },
      { k: 'desdeF', t: 'Desde', tipo: 'fecha', ancho: 'medio' },
      { k: 'clave', t: 'Palabra con la que sale en el banco (para juntarlo con el cargo real)', tipo: 'texto' },
      { k: 'activo', t: 'Activo (desmárcalo para pausarlo)', tipo: 'check' },
    ],
    onGuardar: (r) => {
      if (!r.concepto) { aviso('Escribe el concepto'); return false; }
      const fin = { ...(f || {}), id: f ? f.id : uid(), concepto: r.concepto, importe: Math.abs(+r.importe || 0), cat: r.cat || adivinarCat(r.concepto), cada: r.cada || 'Mensual', dia: Math.min(31, Math.max(1, +r.dia || 1)), mes: MESES.indexOf(r.mesN) + 1 || 1, desde: (r.desdeF || hoy()).slice(0, 7), clave: normCasa(r.clave || '') || claveConcepto(r.concepto), activo: !!r.activo, hechos: f ? f.hechos || [] : [] };
      if (nuevo) {
        // si el gasto ya está apuntado este mes (p. ej. del banco), no se duplica
        D.gastosCasa.filter(g => !g.fijo && (g.fecha || '') >= fin.desde && fijoDe.call(null, g.concepto) === undefined && (normCasa(g.concepto).includes(fin.clave) || claveConcepto(g.concepto) === fin.clave)).forEach(g => { g.fijo = fin.id; if (!fin.hechos.includes(g.fecha.slice(0, 7))) fin.hechos.push(g.fecha.slice(0, 7)); });
      } else {
        // los previstos futuros se actualizan con el nuevo importe/categoría
        D.gastosCasa.forEach(g => { if (g.fijo === fin.id && g.origen === 'fijo' && g.fecha > hoy()) { g.importe = fin.importe; g.cat = fin.cat; g.concepto = fin.concepto; } });
      }
      D.fijosCasa = (D.fijosCasa || []).filter(x => x.id !== fin.id).concat(fin);
      generarFijos(); cambio(); if (despues) despues();
    },
  });
}

// ---------- descargar a Excel ----------
async function exportarGastosExcel(Y) {
  const gs = (D.gastosCasa || []).filter(g => (g.fecha || '').startsWith(Y)).sort((a, b) => a.fecha.localeCompare(b.fecha));
  const ins = (D.ingresosCasa || []).filter(g => (g.fecha || '').startsWith(Y)).sort((a, b) => a.fecha.localeCompare(b.fecha));
  if (!gs.length && !ins.length) { aviso(`No hay gastos en ${Y} para descargar`); return; }
  const fechaES = (f) => `${f.slice(8)}/${f.slice(5, 7)}/${f.slice(0, 4)}`;
  const filasG = [['Fecha', 'Concepto', 'Categoría', 'Importe (€)', 'Se repite', 'Notas']];
  gs.forEach(g => trozos(g).forEach((t, i, arr) => filasG.push([fechaES(g.fecha), g.concepto + (arr.length > 1 ? ` (parte ${i + 1} de ${arr.length})` : ''), t.cat || 'Otros', Math.round(+t.importe * 100) / 100, g.fijo ? 'Fijo' : (g.periodicidad || 'Puntual'), g.notas || ''])));
  const totC = sumaPorCat(gs), cs = Object.keys(totC).sort((a, b) => totC[b] - totC[a]);
  const meses = Array.from({ length: 12 }, (_, i) => `${Y}-${pad(i + 1)}`);
  const filasR = [['Categoría', ...MESES_C, 'Total', 'Presupuesto al mes']];
  cs.forEach(c => filasR.push([c, ...meses.map(m => Math.round(sumaCat(gs.filter(g => g.fecha.startsWith(m)), c) * 100) / 100), Math.round(totC[c] * 100) / 100, +(D.presupuestosCasa || {})[c] || '']));
  filasR.push(['Total gastos', ...meses.map(m => Math.round(sumaG(gs.filter(g => g.fecha.startsWith(m))) * 100) / 100), Math.round(sumaG(gs) * 100) / 100, '']);
  if (ins.length) {
    filasR.push(['Ingresos', ...meses.map(m => Math.round(sumaG(ins.filter(g => g.fecha.startsWith(m))) * 100) / 100), Math.round(sumaG(ins) * 100) / 100, '']);
    filasR.push(['Ahorro', ...meses.map(m => Math.round((sumaG(ins.filter(g => g.fecha.startsWith(m))) - sumaG(gs.filter(g => g.fecha.startsWith(m)))) * 100) / 100), Math.round((sumaG(ins) - sumaG(gs)) * 100) / 100, '']);
  }
  const filasI = [['Fecha', 'Concepto', 'Importe (€)', 'Notas'], ...ins.map(g => [fechaES(g.fecha), g.concepto, Math.round(+g.importe * 100) / 100, g.notas || ''])];
  try {
    const X = await cargarExcel();
    const wb = X.utils.book_new();
    const hoja = (filas, anchos) => { const h = X.utils.aoa_to_sheet(filas); h['!cols'] = anchos.map(w => ({ wch: w })); return h; };
    X.utils.book_append_sheet(wb, hoja(filasR, [26, ...meses.map(() => 9), 11, 12]), `Resumen ${Y}`);
    X.utils.book_append_sheet(wb, hoja(filasG, [11, 44, 22, 11, 10, 30]), `Gastos ${Y}`);
    if (ins.length) X.utils.book_append_sheet(wb, hoja(filasI, [11, 40, 11, 30]), `Ingresos ${Y}`);
    X.writeFile(wb, `Gastos de casa ${Y}.xlsx`);
  } catch (e) {
    // Sin internet para cargar el lector de Excel: CSV que Excel abre igual
    const csv = '﻿' + filasG.map(f => f.map(v => typeof v === 'number' ? String(v).replace('.', ',') : `"${String(v).replace(/"/g, '""')}"`).join(';')).join('\r\n');
    descargar(new Blob([csv], { type: 'text/csv;charset=utf-8' }), `Gastos de casa ${Y}.csv`);
    aviso('Sin conexión para hacer el Excel: te he descargado un CSV que Excel abre igual');
  }
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
    const lista = (todosPositivos ? mov.filter(m => !esIngresoConcepto(m.concepto)) : gastos).map(m => ({ fecha: m.fecha, concepto: m.concepto, importe: Math.abs(m.imp) }));
    const ya = new Set((D.gastosCasa || []).map(g => `${g.fecha}|${normCasa(g.concepto)}|${(+g.importe).toFixed(2)}`));
    const nuevos = lista.filter(g => !ya.has(`${g.fecha}|${normCasa(g.concepto)}|${g.importe.toFixed(2)}`)).map(g => ({ ...g, cat: adivinarCat(g.concepto) }));
    const repes = lista.length - nuevos.length;
    // Gastos fijos: el cargo real se junta con el previsto de ese mes
    const usados = new Set();
    nuevos.forEach(g => { const f = fijoDe(g.concepto); if (!f) return; g.fijoId = f.id; g.cat = f.cat || g.cat;
      const prev = (D.gastosCasa || []).find(x => x.fijo === f.id && x.origen === 'fijo' && x.fecha.slice(0, 7) === g.fecha.slice(0, 7) && !usados.has(x.id));
      if (prev) { g.junta = prev.id; usados.add(prev.id); } });
    const juntados = nuevos.filter(g => g.junta).length;
    // Ingresos (nóminas, bizums que te hacen…): se pueden guardar para ver el ahorro
    const yaI = new Set((D.ingresosCasa || []).map(g => `${g.fecha}|${normCasa(g.concepto)}|${(+g.importe).toFixed(2)}`));
    const ingNuevos = mov.filter(m => todosPositivos ? esIngresoConcepto(m.concepto) : m.imp > 0).map(m => ({ fecha: m.fecha, concepto: m.concepto, importe: m.imp })).filter(g => !yaI.has(`${g.fecha}|${normCasa(g.concepto)}|${g.importe.toFixed(2)}`));
    const porCat = {}; nuevos.forEach(g => { porCat[g.cat] = (porCat[g.cat] || 0) + 1; });
    const desde = nuevos.map(g => g.fecha).sort()[0], hasta = nuevos.map(g => g.fecha).sort().pop();
    modal(`<h3>Movimientos de ${esc(f.name)}</h3>
      <p>He encontrado <b>${plural(nuevos.length, 'gasto nuevo', 'gastos nuevos')}</b>${desde ? ` (del ${+desde.slice(8)} ${MESES_C[+desde.slice(5, 7) - 1]} al ${+hasta.slice(8)} ${MESES_C[+hasta.slice(5, 7) - 1]} ${hasta.slice(0, 4)})` : ''}.
        ${repes ? ` ${plural(repes, 'ya estaba apuntado', 'ya estaban apuntados')}.` : ''}${juntados ? ` ${juntados === 1 ? 'Uno es' : juntados + ' son'} de tus gastos fijos y se ${juntados === 1 ? 'junta' : 'juntan'} con el previsto (no se cuenta dos veces).` : ''}</p>
      ${ingNuevos.length ? `<label class="cg-recordar cg-ingchk"><input type="checkbox" id="cg-ingok" checked> Guardar también ${ingNuevos.length === 1 ? 'el ingreso' : `los ${ingNuevos.length} ingresos`} (${eurI(sumaG(ingNuevos))}: nóminas, bizums que te hacen…) para ver lo que ahorras</label>` : ''}
      ${todosPositivos ? '<p class="nota">El archivo no distingue gastos e ingresos (todo va en positivo). He separado como ingresos los que lo parecen (nóminas, abonos, devoluciones…). Si se cuela alguno, después ábrelo y cambia «Es» a Ingreso, o búscalo con 🔍 y pásalo a ➕ Ingresos.</p>' : ''}
      ${nuevos.length ? `<p class="suave">Así los he clasificado (luego puedes cambiar cualquiera y aprendo para la próxima):</p>
      <div class="cg-prev">${Object.entries(porCat).sort((a, b) => b[1] - a[1]).map(([cat, n]) => `<span class="pill-cc" style="--h:${colorCatC(cat)}">${esc(cat)} · ${n}</span>`).join(' ')}</div>
      <div class="cg-prev-lista">${nuevos.slice(0, 200).map((g, i) => `<label><input type="checkbox" data-i="${i}" checked> <span>${+g.fecha.slice(8)} ${MESES_C[+g.fecha.slice(5, 7) - 1]}</span> <span>${esc(g.concepto)}${g.fijoId ? ' <span class="pill-cc gris">🔁</span>' : ''}</span> <b>${eurG(g.importe)}</b></label>`).join('')}</div>` : ''}
      <div class="pie"><button class="btn" data-cerrar>Cancelar</button>${nuevos.length || ingNuevos.length ? '<button class="btn prim" id="cg-imp">Importar</button>' : ''}</div>`, {
      clase: 'ancha',
      alAbrir: (m, cerrar) => {
        const b = $('#cg-imp', m); if (!b) return;
        b.onclick = () => {
          const sel = $$('[data-i]', m).filter(x => x.checked).map(x => nuevos[+x.dataset.i]).concat(nuevos.slice(200));
          if (!D.gastosCasa) D.gastosCasa = [];
          const copiaG = JSON.stringify(D.gastosCasa), copiaF = JSON.stringify(D.fijosCasa || []), copiaI = JSON.stringify(D.ingresosCasa || []);
          let n = 0;
          sel.forEach(g => {
            const { junta, fijoId, ...datos } = g;
            if (junta) { const x = D.gastosCasa.find(y => y.id === junta); if (x) { Object.assign(x, { fecha: datos.fecha, concepto: datos.concepto, importe: datos.importe, origen: 'banco' }); n++; return; } }
            const x = { id: uid(), ...datos, periodicidad: 'Puntual', origen: 'banco' };
            if (fijoId) { const f = (D.fijosCasa || []).find(y => y.id === fijoId); if (f) { x.fijo = f.id; x.periodicidad = f.cada || 'Mensual'; f.hechos = f.hechos || []; if (!f.hechos.includes(x.fecha.slice(0, 7))) f.hechos.push(x.fecha.slice(0, 7)); } }
            D.gastosCasa.push(x); n++;
          });
          // si un fijo sube de precio en el banco, los próximos previstos usan el precio nuevo
          sel.filter(g => g.fijoId).forEach(g => { const f = (D.fijosCasa || []).find(y => y.id === g.fijoId); if (f && Math.abs(+f.importe - g.importe) > 0.005 && g.fecha.slice(0, 7) >= (f.desde || '')) f.importe = g.importe; });
          const ingOk = $('#cg-ingok', m);
          let ni = 0; if (ingOk && ingOk.checked) { if (!D.ingresosCasa) D.ingresosCasa = []; ingNuevos.forEach(g => { D.ingresosCasa.push({ id: uid(), ...g, origen: 'banco' }); ni++; }); }
          cerrar(); UI.cgMes = hasta ? hasta.slice(0, 7) : UI.cgMes; UI.cgCat = ''; UI.cgVista = 'mes'; guardarUI(); cambio();
          aviso(`${plural(n, 'gasto importado', 'gastos importados')}${ni ? ` y ${plural(ni, 'ingreso', 'ingresos')}` : ''}`, { t: 'Deshacer', fn: () => { D.gastosCasa = JSON.parse(copiaG); D.fijosCasa = JSON.parse(copiaF); D.ingresosCasa = JSON.parse(copiaI); cambio(); } });
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
  const lista = () => { const L = D.listas.catCasa || (D.listas.catCasa = CATS_CASA.slice()); const o = ordenCats(L); L.splice(0, L.length, ...o); return L; };
  const cuenta = (cat) => (D.gastosCasa || []).filter(g => g.cat === cat).length;
  const seccion = () => {
    const cats = lista();
    const reglas = (D.reglasCasa || []).slice().sort((a, b) => a.cat.localeCompare(b.cat) || a.clave.localeCompare(b.clave));
    const opts = (sel) => `<option value="${ES_ING}"${sel === ES_ING ? ' selected' : ''}>➕ Es un ingreso</option>` + cats.map(x => `<option${x === sel ? ' selected' : ''}>${esc(x)}</option>`).join('');
    return `<section class="tarjeta" id="aj-gastos" style="grid-column:1/-1"><h2>💶 Gastos de casa</h2>
      <div class="ajg">
        <div><h3>Categorías</h3><p class="suave">Cambia el nombre (se cambia también en los gastos ya apuntados), añade las tuyas o quita las que no uses (sus gastos pasan a «Otros»). En «€/mes» pon tu presupuesto: en Gastos verás la marca y te aviso en Inicio al acercarte.</p>
          <div class="ajg-cats">${cats.map((c, i) => `<div class="ajg-fila"><span class="pill-cc" style="--h:${colorCatC(c)}">&nbsp;</span><input data-cat="${i}" value="${esc(c)}" aria-label="Nombre de la categoría"><input type="number" min="0" step="1" class="ajg-pres" data-pres="${esc(c)}" value="${(D.presupuestosCasa || {})[c] || ''}" placeholder="€/mes" title="Presupuesto al mes (vacío = sin límite)" aria-label="Presupuesto al mes"><small class="tenue">${cuenta(c) || ''}</small>${c === 'Otros' ? '<span></span>' : `<button class="btn-x" data-catdel="${i}" title="Quitar" aria-label="Quitar">×</button>`}</div>`).join('')}</div>
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
    (D.gastosCasa || []).forEach(g => { if (g.cat === viejo) g.cat = nuevo; (g.partes || []).forEach(t => { if (t.cat === viejo) t.cat = nuevo; }); });
    (D.reglasCasa || []).forEach(r => { if (r.cat === viejo) r.cat = nuevo; });
    (D.fijosCasa || []).forEach(f => { if (f.cat === viejo) f.cat = nuevo; });
    const P = D.presupuestosCasa || {}; if (viejo in P) { if (!(nuevo in P)) P[nuevo] = P[viejo]; delete P[viejo]; }
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
      const L = lista(), i = +b.dataset.catdel, cat = L[i], antes = JSON.stringify({ L, g: D.gastosCasa, r: D.reglasCasa, f: D.fijosCasa || [], p: D.presupuestosCasa || {} });
      L.splice(i, 1); if (!L.includes('Otros')) L.push('Otros');
      (D.gastosCasa || []).forEach(g => { if (g.cat === cat) g.cat = 'Otros'; (g.partes || []).forEach(t => { if (t.cat === cat) t.cat = 'Otros'; }); });
      (D.fijosCasa || []).forEach(f => { if (f.cat === cat) f.cat = 'Otros'; });
      if (D.presupuestosCasa) delete D.presupuestosCasa[cat];
      D.reglasCasa = (D.reglasCasa || []).filter(x => x.cat !== cat);
      repinta();
      aviso(`Categoría «${cat}» quitada`, { t: 'Deshacer', fn: () => { const a = JSON.parse(antes); D.listas.catCasa = a.L; D.gastosCasa = a.g; D.reglasCasa = a.r; D.fijosCasa = a.f; D.presupuestosCasa = a.p; repinta(); } });
    });
    $$('[data-pres]', t).forEach(inp => inp.onchange = () => { const P = D.presupuestosCasa || (D.presupuestosCasa = {}); const v = Math.abs(+inp.value || 0); if (v) P[inp.dataset.pres] = v; else delete P[inp.dataset.pres]; cambio(false); aviso(v ? `Presupuesto de ${inp.dataset.pres}: ${eurC(v)} al mes` : `Sin presupuesto para ${inp.dataset.pres}`); });
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
      let n = 0;
      if (cat === ES_ING) (D.gastosCasa || []).filter(g => normCasa(g.concepto).includes(k)).forEach(g => { gastoAIngreso(g); n++; });
      else { (D.gastosCasa || []).forEach(g => { if (normCasa(g.concepto).includes(k) && g.cat !== cat) { g.cat = cat; n++; } }); (D.ingresosCasa || []).filter(i => normCasa(i.concepto).includes(k)).forEach(i => { ingresoAGasto(i, cat); n++; }); }
      repinta(); if (n) aviso(`${plural(n, 'apunte cambiado', 'apuntes cambiados')} a ${cat === ES_ING ? 'ingresos' : cat}`);
    };
    $('#ajg-addreg', t).onclick = addReg; $('#ajg-npal', t).onkeydown = (e) => { if (e.key === 'Enter') addReg(); };
    $$('[data-rk]', t).forEach(inp => inp.onchange = () => {
      const r = D.reglasCasa.find(x => x.clave === inp.dataset.rk), k = normCasa(inp.value);
      if (!r) return; if (!k) { D.reglasCasa = D.reglasCasa.filter(x => x !== r); } else { r.clave = k; r.mano = true; } repinta();
    });
    $$('[data-rc]', t).forEach(sel => sel.onchange = () => { const r = D.reglasCasa.find(x => x.clave === sel.dataset.rc); if (r) { r.cat = sel.value; repinta(); } });
    $$('[data-rdel]', t).forEach(b => b.onclick = () => { const antes = D.reglasCasa.slice(); D.reglasCasa = D.reglasCasa.filter(x => x.clave !== b.dataset.rdel); repinta(); aviso('Concepto quitado', { t: 'Deshacer', fn: () => { D.reglasCasa = antes; repinta(); } }); });
    $('#ajg-aplicar', t).onclick = () => {
      const copia = JSON.stringify({ g: D.gastosCasa || [], i: D.ingresosCasa || [] }); let n = 0;
      (D.gastosCasa || []).filter(g => !g.partes && (D.reglasCasa || []).some(r => r.cat === ES_ING && r.clave && normCasa(g.concepto).includes(r.clave))).forEach(g => { gastoAIngreso(g); n++; });
      (D.gastosCasa || []).forEach(g => { if (g.partes) return; const c = adivinarCat(g.concepto); if (c !== 'Otros' && c !== g.cat) { g.cat = c; n++; } else if (!catsCasa().includes(g.cat)) { g.cat = 'Otros'; n++; } });
      repinta(); aviso(n ? `${plural(n, 'apunte reclasificado', 'apuntes reclasificados')}` : 'Todo estaba ya bien clasificado', n ? { t: 'Deshacer', fn: () => { const a = JSON.parse(copia); D.gastosCasa = a.g; D.ingresosCasa = a.i; repinta(); } } : undefined);
    };
  }
  const orig = VISTAS.ajustes;
  VISTAS.ajustes = function (cont) {
    const r = orig.apply(this, arguments);
    try { const rej = cont.querySelector('.rejilla'); if (rej && !cont.querySelector('#aj-gastos')) { rej.insertAdjacentHTML('beforeend', seccion()); enlazar(cont); } } catch (e) { console.error(e); }
    return r;
  };
})();
