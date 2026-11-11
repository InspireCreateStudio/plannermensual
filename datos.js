'use strict';
// =====================================================================
//  Planner — cómo son los datos, listas por defecto y los cálculos
//  que en el Excel hacían las fórmulas (plazo, franja, atrasadas…).
// =====================================================================

const CATS = {
  novela:     { n: 'Novela',            e: '📒', color: '#8a5aa3', estados: 'novela',     hecho: '✅Completada', energia: '⚡ Alta', detalle: 'Tarea del día' },
  web:        { n: 'Web',               e: '🌐', color: '#3b7ea1', estados: 'web',        hecho: '⚡Lanzado' },
  newsletter: { n: 'Newsletter y blog', e: '✉️', color: '#c0703a', estados: 'newsletter', hecho: '🚀Enviada' },
  formacion:  { n: 'Formación',         e: '🎓', color: '#4f8a5b', estados: 'formacion',  hecho: '✅Completada', energia: '🔋 Media', detalle: 'Qué harás ese día' },
  club:       { n: 'Club de lectura',   e: '📚', color: '#b0477a', estados: 'club',       hecho: '✅Completada' },
  etsy:       { n: 'Etsy',              e: '🛍️', color: '#cf8a1f', estados: 'etsy',       hecho: '🛒Publicado' },
  ninos:      { n: 'Niños',             e: '🧒', color: '#2a998b', estados: 'ninos',      hecho: '✅Completada' },
  casa:       { n: 'Casa',              e: '🏡', color: '#80684f', estados: 'casa',       hecho: '✅Completada' },
  medicos:    { n: 'Médicos',           e: '🩺', color: '#c2453d', estados: 'medicos',    hecho: '✅Completada', persona: true },
};
const CAT_REDES = { n: 'Redes', e: '📱', color: '#d0587e', estados: 'redes', hecho: '✅Completada' };
// Colores de serie (para «Volver a los de serie»)
const COLOR_ACENTO = '#9c4f35';
const COLORES_SERIE = Object.fromEntries([...Object.entries(CATS).map(([k, c]) => [k, c.color]), ['redes', '#d0587e'], ['eventos', '#5b6bb5']]);
const CAT_EVENTO = { n: 'Eventos', e: '📅', color: '#5b6bb5' };
const CAT_TRABAJO = { n: 'Otros trabajos', e: '🖋️', color: '#6b7d3a' };
const catDe = (k) => CATS[k] || (k === 'redes' ? CAT_REDES : k === 'eventos' ? CAT_EVENTO : k === 'trabajos' ? CAT_TRABAJO : { n: k, e: '•', color: '#888' });

// ---------- tus categorías: cambiarles el nombre, ocultarlas y añadir nuevas (Ajustes) ----------
const CATS_SERIE = Object.fromEntries(Object.entries(CATS).map(([k, c]) => [k, { n: c.n, e: c.e }]));
const ESTADOS_NUEVA = ['💭Pendiente', '✍🏻En curso', '✅Completada', '❌Cancelada'];
const COLORES_NUEVAS = ['#5b7fc7', '#c75b8f', '#6f9a3f', '#c4902c', '#3f9a9a', '#8a5bc7', '#c76a3f'];
const ajustesCat = () => (typeof D !== 'undefined' && D && D.ajustes) || {};
function aplicarCategorias() {
  const A = ajustesCat(), P = A.categorias || {}, extra = A.catsExtra || [];
  // Las añadidas que ya se han quitado
  Object.keys(CATS).forEach(k => { if (!CATS_SERIE[k] && !extra.some(x => x.k === k)) delete CATS[k]; });
  extra.forEach(x => {
    CATS[x.k] = Object.assign(CATS[x.k] || { color: x.color }, { estados: x.k, hecho: '✅Completada', colorSerie: x.color });
    if (D && D.listas && D.listas.estados && !D.listas.estados[x.k]) D.listas.estados[x.k] = [...ESTADOS_NUEVA];
  });
  Object.keys(CATS).forEach(k => {
    const s = CATS_SERIE[k] || extra.find(x => x.k === k), p = P[k] || {};
    CATS[k].n = p.n || s.n; CATS[k].e = p.e || s.e;
  });
}
const catRenombrada = (k) => !!(ajustesCat().categorias || {})[k];
const catOculta = (k) => (ajustesCat().catsOcultas || []).includes(k);
// Las que se ven en Tareas, al crear una tarea y en el Calendario (más la de la tarea abierta, aunque esté oculta)
const catsVisibles = (incluir) => Object.keys(CATS).filter(k => !catOculta(k) || k === incluir);

const FORMATO_E = { Reel: '🎬', Carrusel: '🗂️', Post: '📷', Story: '⭕' };
const COMIDAS = [['desayuno', '🥐 Desayuno'], ['almuerzo', '🍎 Almuerzo'], ['comida', '🍲 Comida'], ['merienda', '🧃 Merienda'], ['cena', '🌙 Cena']];
const REVISION = ['🎬 Batch de la semana hecho', '📅 Eventos revisados con el calendario', '✉️ Newsletter programada', '💡 Ideas suficientes en el banco', '🧠 Descarga mental procesada'];

function datosVacios() {
  return {
    app: 'planner', version: 1,
    tareas: [], rapida: [], candidaturas: [], habitos: [], habitosReg: {}, recetas: {}, descarga: [], objetivos: [], eventos: [], ideas: [], batch: [], compra: [],
    trabajos: [], ayuntamiento: tareasAytoIniciales(), ayto: { puesto: '', inicio: '' },
    menu: {}, cocina: {}, congelador: ['Pollo troceado', 'Carne picada', 'Pescado blanco'], despensa: ['Arroz', 'Pasta', 'Legumbres'],
    revision: {},
    calendarios: [
      { nombre: 'TRABAJO', punto: '🟠' }, { nombre: 'FAMILIA', punto: '🔵' }, { nombre: 'MÉDICOS', punto: '🔴' },
      { nombre: 'COLEGIO', punto: '🟢' }, { nombre: 'CITAS', punto: '🟡' }, { nombre: 'EXTRAESCOLARES', punto: '⚪' }],
    clave: ['TRABAJO'],
    dispo: {
      dias: {},
      // A partir de esta fecha, el turno y las extraescolares salen de las reglas
      reglasDesde: '',
      rotacion: { lunes: '', turno: 'MAÑANA' },
      franjas: { 'MAÑANA': 'Tarde libre', 'TARDE': 'Mañana libre' },
      actividades: [],
    },
    enlaces: [
      { t: '📆 Google Calendar', url: 'https://calendar.google.com' },
      { t: '🎨 Canva', url: 'https://www.canva.com/' }],
    listas: listasPorDefecto(),
    ajustes: { copiaDias: 7, tema: 'auto', diasClave: 4, nombre: '', avisos: false, avisoEventos: '' },
  };
}
function listasPorDefecto() {
  return {
    estados: {
      novela: ['💭Pendiente', '✍🏻En curso', '✅Completada', '❌Cancelada'],
      formacion: ['💭Pendiente', '✍🏻En curso', '✅Completada', '❌Cancelada'],
      web: ['💡Idea', '📈En proceso', '📝Pendiente diseño', '⏱️Programado', '⚡Lanzado', '⛔Eliminada'],
      newsletter: ['💡Idea', '📝Redactada', '⏱️Programada', '🚀Enviada', '⏸️ En borradores', '✅Completada', '🚀Atrasada', '❌Cancelada', '🌐Publicado'],
      etsy: ['💡Idea', '📈 En proceso', '🛒Publicado'],
      redes: ['💭Pendiente', '📈 En curso', '✅Completada'],
      club: ['📝To do', '📈 En proceso', '✅Completada'],
      ninos: ['🐾Pendiente', '📈 En curso', '✅Completada'],
      casa: ['🏡Pendiente', '📈 En curso', '✅Completada'],
      medicos: ['🩺Pendiente', '📈 En curso', '✅Completada'],
      eventos: ['💭Pendiente', '✅Completada', '❌Cancelada'],
      descarga: ['⏸️Sin procesar', '📂Movida a su pestaña', '⛔Descartada', '📝To do', '📈 En proceso', '✅Completada'],
      objetivos: ['🎯Pendiente', '📈En curso', '✅Conseguido', '⏸️Aplazado', '⛔Descartado'],
    },
    prioridad: ['🔴Alta', '🟠Media', '🔵Baja'],
    energia: ['⚡ Alta', '🔋 Media', '🪫 Baja'],
    catDescarga: ['📖Novela', 'Web', '📤Newsletter', '📲Redes sociales', '🛒Etsy', '📚Club de Lectura', '👣Niños', '🏡Casa', '🩺Médicos', '🎓Formación'],
    personas: ['Yo', 'Pareja', 'Hijo/a', 'Familia'],
    catCompra: ['Frescos', 'Congelados', 'Despensa', 'Limpieza', 'Higiene y cuidado personal', 'Bebidas', 'Otros'],
    supers: ['Mercadona', 'Carrefour', 'Frutería / mercado', 'Lidl', 'Otro'],
    segmentos: ['Toda la lista', 'Lectores VIP', 'Club de lectura', 'Nuevos suscriptores', 'Compradores', 'Newsletter mensual', 'Solo novedades'],
    tiposNews: ['Lanzamiento', 'Newsletter regular', 'Promoción', 'Reseña/Recomendación', 'Encuesta', 'Anuncio'],
    librosNews: ['Ninguno', 'Varios / toda la serie'],
    catObjetivos: ['Novela', 'Formación', 'Web', 'Newsletter', 'Blog', 'Redes sociales', 'Etsy', 'Club de Lectura', 'Niños', 'Casa', 'Médicos', 'Personal'],
    formatos: ['Reel', 'Carrusel', 'Post', 'Story'],
    donde: ['Instagram', 'IG + TikTok', 'Stories'],
    pilares: ['Educar', 'Conectar', 'Inspirar', 'Vender'],
    objetivosRRSS: ['Alcance', 'Fidelización', 'Venta'],
  };
}
// Rellena lo que falte (datos de una versión anterior o de una importación parcial)
function completar(d) {
  const base = datosVacios();
  if (d.ajustes && d.ajustes.nombre === undefined) d.ajustes.nombre = (d.calendarios || []).some(c => c.nombre === 'MARTA LOBO') ? 'Marta' : '';
  // «Qué suelo tener» se separa en Congelador y Despensa: lo que llevaba ❄️ pasa al congelador
  if (d.congelador === undefined && Array.isArray(d.despensa)) {
    const limpio = (x) => x.replace(/^(❄️|❄|🥫)\s*/u, '').trim();
    d.congelador = d.despensa.filter(x => /^❄/u.test(x)).map(limpio).filter(Boolean);
    d.despensa = d.despensa.filter(x => !/^❄/u.test(x)).map(limpio).filter(Boolean);
  }
  Object.keys(base).forEach(k => { if (d[k] === undefined) d[k] = base[k]; });
  Object.keys(base.dispo).forEach(k => { if (d.dispo[k] === undefined) d.dispo[k] = base.dispo[k]; });
  Object.keys(base.ajustes).forEach(k => { if (d.ajustes[k] === undefined) d.ajustes[k] = base.ajustes[k]; });
  const L = base.listas;
  Object.keys(L).forEach(k => { if (d.listas[k] === undefined) d.listas[k] = L[k]; });
  Object.keys(L.estados).forEach(k => { if (!d.listas.estados[k]) d.listas.estados[k] = L.estados[k]; });
  // Calendarios que aparecen en eventos pero no están en la lista
  d.eventos.forEach(e => { if (e.cal && !d.calendarios.some(c => c.nombre === e.cal)) d.calendarios.push({ nombre: e.cal, punto: '⚪' }); });
  d.calendarios.forEach(c => { if (!c.punto) c.punto = '⚪'; });
  // El Excel tenía un carácter invisible en «🟠​Media»
  const limpia = (s) => typeof s === 'string' ? s.replace(/​/g, '') : s;
  d.listas.prioridad = d.listas.prioridad.map(limpia);
  d.tareas.forEach(t => { t.prioridad = limpia(t.prioridad); });
  d.batch.forEach(b => { b.prioridad = limpia(b.prioridad); });
  // Tareas de Instagram que se importaron en «Web» antes de que las tareas pudieran ir en Redes
  d.tareas.forEach(t => {
    if (t.cat !== 'web' || !/^Instagram:/.test(t.tarea || '')) return;
    t.cat = 'redes'; t.tarea = t.tarea.replace(/^Instagram:\s*/, ''); t.tarea = t.tarea.charAt(0).toUpperCase() + t.tarea.slice(1);
    if (!d.listas.estados.redes.includes(t.estado)) t.estado = esHecho(t.estado) ? '✅Completada' : d.listas.estados.redes[0];
    if (/categoría de tareas de redes/.test(t.notas || '')) delete t.notas;
  });
  return d;
}

// ---------- estados ----------
const RE_HECHO = /Completada|Lanzado|Enviada|Publicado|Conseguido|Entregado/i;
const RE_ANULADA = /Cancelada|Descartad|Eliminada/i;
const esHecho = (estado) => RE_HECHO.test(estado || '');
const esAnulada = (estado) => RE_ANULADA.test(estado || '');
const estadosDe = (cat) => (D.listas.estados[catDe(cat).estados || cat] || []);
const estadoInicial = (cat) => estadosDe(cat)[0] || '';
function estadoHecho(t) {
  if (t.cat === 'newsletter' && /Blog/i.test(t.canal || '')) return '🌐Publicado';
  return catDe(t.cat).hecho || '✅Completada';
}
const nivelPrioridad = (p) => /Alta/i.test(p || '') ? 1 : /Media/i.test(p || '') ? 2 : /Baja/i.test(p || '') ? 3 : 4;
const nivelEnergia = (e) => /Alta/i.test(e || '') ? 1 : /Media/i.test(e || '') ? 2 : /Baja/i.test(e || '') ? 3 : 2;

// Plazo como en la columna «⏰ Plazo» del Excel
function plazo(fecha, estado) {
  if (!fecha || esAnulada(estado)) return { t: '', c: '' };
  if (esHecho(estado)) return { t: '✅ Hecho', c: 'hecho' };
  const n = diasEntre(hoy(), fecha);
  if (n === 0) return { t: '⏰ Hoy', c: 'hoy' };
  if (n > 0) return { t: n === 1 ? 'Mañana' : `Quedan ${n} días`, c: n <= 7 ? 'pronto' : '' };
  return { t: `Atrasada ${plural(-n, 'día', 'días')}`, c: 'atrasada' };
}

// ---------- piezas de redes (Batch) ----------
const ideaDe = (b) => (b.idea !== '' && b.idea != null) ? D.ideas.find(i => String(i.n) === String(b.idea)) : null;
const temaPieza = (b) => b.tema || (ideaDe(b) || {}).tema || '';
const ganchoPieza = (b) => b.gancho || (ideaDe(b) || {}).gancho || '';
function estadoPieza(b) {
  if (b.publicado) return '📳Publicado';
  if (b.programado) return '⏱️Programada';
  if (b.grabado) return '🚀Diseñado';
  if (b.editado || b.captionListo || b.guion || b.caption) return '📈 En proceso';
  return '💡Idea';
}
const energiaPieza = (b) => b.energia || (/Reel/i.test(b.formato || '') ? '⚡ Alta' : /Story/i.test(b.formato || '') ? '🪫 Baja' : '🔋 Media');
const PASOS_PIEZA = [['grabado', 'Grabado / diseñado'], ['editado', 'Editado'], ['captionListo', 'Caption listo'], ['programado', 'Programado'], ['publicado', 'Publicado']];

// ---------- disponibilidad: turno, franja y extraescolares ----------
function turnoDe(f) {
  const d = D.dispo.dias[f];
  if (d && d.turno !== undefined) return d.turno;
  const R = D.dispo;
  if (!R.reglasDesde || f < R.reglasDesde || diaSemana(f) >= 5 || !R.rotacion || !R.rotacion.lunes) return '';
  const semanas = Math.round(diasEntre(R.rotacion.lunes, lunesDe(f)) / 7);
  const otro = R.rotacion.turno === 'MAÑANA' ? 'TARDE' : 'MAÑANA';
  return ((semanas % 2) + 2) % 2 === 0 ? R.rotacion.turno : otro;
}
function franjaDe(f) {
  const d = D.dispo.dias[f];
  if (d && d.franja) return d.franja;
  if (diaSemana(f) >= 5) return 'Fin de semana';
  const t = turnoDe(f);
  if (!t) return '';
  return D.dispo.franjas[t] || '';
}
function extraDe(f) {
  const d = D.dispo.dias[f];
  if (d && d.extra !== undefined) return d.extra;
  const R = D.dispo;
  if (!R.reglasDesde || f < R.reglasDesde) return '';
  const ds = diaSemana(f) + 1;
  return (R.actividades || []).filter(a => (a.dias || []).includes(ds) && (!a.desde || f >= a.desde) && (!a.hasta || f <= a.hasta))
    .sort((a, b) => (a.ini || '').localeCompare(b.ini || ''))
    .map(a => `${a.que} ${a.quien}${a.ini ? ` ${a.ini}${a.fin ? '-' + a.fin : ''}` : ''}`.trim()).join('; ');
}
const FRANJAS_OP = ['Mañana libre', 'Tarde libre', 'Mañana/Tarde libre', 'Solo mañana disponible', 'Solo tarde disponible', 'Día libre', 'Festivo', 'Sin hueco'];
const iconoFranja = (fr) => !fr ? '' : /Solo mañana/i.test(fr) ? '☀️' : /Solo tarde/i.test(fr) ? '🌙' : /Mañana\s*\/\s*Tarde|D[ií]a libre/i.test(fr) ? '🌤️' : /^Mañana/i.test(fr) ? '☀️' : /^Tarde/i.test(fr) ? '🌙' : /Fin de semana/i.test(fr) ? '🛋️' : /Festivo/i.test(fr) ? '🎉' : /Sin hueco/i.test(fr) ? '⛔' : '🕘';

// ---------- todo junto (lo que en el Excel era «Vista global») ----------
// Cada elemento: { tipo, id, cat, fecha, hora, titulo, sub, estado, prioridad, energia, notas, ref }
function elementos({ desde, hasta, conEventos = true, conPiezas = true, conTrabajos = true } = {}) {
  const sinRango = !desde && !hasta;
  const dentro = (f) => f ? (!desde || f >= desde) && (!hasta || f <= hasta) : sinRango;
  const out = [];
  D.tareas.forEach(t => {
    if (!dentro(t.fecha)) return;
    out.push({ tipo: 'tarea', id: t.id, cat: t.cat, fecha: t.fecha, hora: t.hora || '', titulo: t.tarea, sub: t.detalle || '', estado: t.estado, prioridad: t.prioridad, energia: t.energia || catDe(t.cat).energia || '', notas: t.notas, ref: t });
  });
  if (conPiezas) D.batch.forEach(b => {
    if (!dentro(b.fecha)) return;
    out.push({ tipo: 'pieza', id: b.id, cat: 'redes', fecha: b.fecha, hora: '', titulo: `${FORMATO_E[b.formato] || ''} ${b.formato || 'Pieza'}: ${temaPieza(b) || 'sin tema'}`.trim(), sub: b.donde || '', estado: estadoPieza(b), prioridad: b.prioridad, energia: energiaPieza(b), notas: b.notas, ref: b });
  });
  // Encargos de Otros trabajos: salen el día de su fecha límite
  if (conTrabajos) (D.trabajos || []).forEach(j => {
    if (!dentro(j.fecha)) return;
    const tt = typeof tipoTrabajo === 'function' ? tipoTrabajo(j.tipo) : ['', '🖋️', ''];
    out.push({ tipo: 'trabajo', id: j.id, cat: 'trabajos', fecha: j.fecha, hora: '', titulo: `${tt[1]} Entrega: ${j.titulo || 'encargo'}`, sub: j.cliente || '', estado: j.estado, prioridad: '', energia: '', notas: j.notas, ref: j });
  });
  if (conEventos) D.eventos.forEach(e => {
    if (e.tipo === 'Recurrente' || e.mantener === 'No' || !e.fecha) return;
    const fin = e.hasta && e.hasta > e.fecha ? e.hasta : e.fecha;
    if (!dentro(e.fecha) && !(desde && e.fecha < desde && fin >= desde)) return;
    out.push({ tipo: 'evento', id: e.id, cat: 'eventos', fecha: e.fecha, hora: /^\d/.test(e.hora || '') ? e.hora : '', titulo: e.titulo, sub: e.cal || '', estado: e.estado || '', prioridad: '', energia: '', notas: e.notas, ref: e, punto: puntoCal(e.cal) });
  });
  return out;
}
const puntoCal = (nombre) => ((D.calendarios || []).find(c => c.nombre === nombre) || {}).punto || '';
const ordenFecha = (a, b) => (a.fecha || '9999').localeCompare(b.fecha || '9999') || (a.hora || '99').localeCompare(b.hora || '99') || nivelPrioridad(a.prioridad) - nivelPrioridad(b.prioridad);
const pendiente = (x) => !esHecho(x.estado) && !esAnulada(x.estado) && !(x.tipo === 'evento' && x.fecha && ((x.ref && x.ref.hasta) || x.fecha) < hoy());
const atrasada = (x) => x.tipo !== 'evento' && pendiente(x) && x.fecha && x.fecha < hoy();

// ---------- tareas que se repiten ----------
const REPETIR = ['Cada día', 'Entre semana (lun-vie)', 'Cada semana', 'Cada 2 semanas', 'Cada mes', 'Cada año'];
function siguienteFecha(f, rep) {
  if (rep === 'Cada día') return sumarDias(f, 1);
  if (/^Entre semana/.test(rep)) { let n = sumarDias(f, 1); while (diaSemana(n) >= 5) n = sumarDias(n, 1); return n; }
  if (rep === 'Cada semana') return sumarDias(f, 7);
  if (rep === 'Cada 2 semanas') return sumarDias(f, 14);
  const d = aFecha(f), dia = d.getDate();
  if (rep === 'Cada mes') { const fin = new Date(d.getFullYear(), d.getMonth() + 2, 0).getDate(); return aStr(new Date(d.getFullYear(), d.getMonth() + 1, Math.min(dia, fin))); }
  if (rep === 'Cada año') return aStr(new Date(d.getFullYear() + 1, d.getMonth(), dia));
  return '';
}
// Al marcar hecha una tarea que se repite, apunta la siguiente (una sola vez)
function repetirTarea(t) {
  if (!t.repetir || !t.fecha) return null;
  if (t.siguiente && D.tareas.some(x => x.id === t.siguiente)) return null;
  const n = JSON.parse(JSON.stringify(t));
  n.id = uid(); n.fecha = siguienteFecha(t.fecha, t.repetir); n.estado = estadoInicial(t.cat);
  delete n.siguiente; delete n.gid;
  ['apertura', 'clics', 'bajas', 'ventas', 'ingresos'].forEach(k => delete n[k]);
  (n.pasos || []).forEach(p => { p.hecho = false; p.id = uid(); });
  D.tareas.push(n); t.siguiente = n.id;
  return n;
}
// Si la desmarcas, quita la siguiente que se había apuntado (si aún no la has hecho)
function deshacerRepeticion(t) {
  if (!t.siguiente) return;
  const i = D.tareas.findIndex(x => x.id === t.siguiente);
  if (i >= 0 && !esHecho(D.tareas[i].estado)) D.tareas.splice(i, 1);
  delete t.siguiente;
}
function avisoRepeticion(n) { if (n) setTimeout(() => aviso(`🔁 La siguiente queda para el ${fechaLarga(n.fecha).toLowerCase()}`), 50); }

// Marcar hecho / deshacer, sea tarea, pieza o evento
function alternarHecho(x) {
  const r = x.ref;
  if (x.tipo === 'pieza') { r.publicado = !r.publicado; if (r.publicado) { r.grabado = r.editado = r.captionListo = r.programado = true; } }
  else if (x.tipo === 'evento') r.estado = esHecho(r.estado) ? '' : '✅Completada';
  else if (x.tipo === 'trabajo') r.estado = esHecho(r.estado) ? '✏️ En curso' : '📤 Entregado';
  else {
    r.estado = esHecho(r.estado) ? estadoInicial(r.cat) : estadoHecho(r);
    if (esHecho(r.estado)) avisoRepeticion(repetirTarea(r)); else deshacerRepeticion(r);
  }
  cambio();
  return pendiente({ estado: x.tipo === 'pieza' ? estadoPieza(r) : r.estado });
}
function buscarRef(tipo, id) {
  const lista = tipo === 'pieza' ? D.batch : tipo === 'evento' ? D.eventos : tipo === 'trabajo' ? D.trabajos : D.tareas;
  return lista.find(o => o.id === id);
}

// ---------- importar el archivo convertido del Excel ----------
function importarDatos(j, modo) {
  const nuevo = j.datos || {};
  if (modo === 'sustituir') {
    const aj = { ...(D ? D.ajustes : datosVacios().ajustes) };
    if (!aj.nombre) delete aj.nombre; // se deduce de los datos importados
    D = completar({ ...datosVacios(), ...nuevo, listas: { ...listasPorDefecto(), ...(nuevo.listas || {}) }, ajustes: aj });
  } else {
    // Juntar: añade lo que no esté (por id) y no toca lo que ya tienes
    ['tareas', 'rapida', 'candidaturas', 'habitos', 'descarga', 'objetivos', 'eventos', 'ideas', 'batch', 'compra', 'ayuntamiento', 'trabajos'].forEach(k => {
      const ids = new Set(D[k].map(o => o.id));
      (nuevo[k] || []).forEach(o => { if (!ids.has(o.id)) D[k].push(o); });
    });
    ['menu', 'cocina'].forEach(k => Object.entries(nuevo[k] || {}).forEach(([f, v]) => { if (!D[k][f]) D[k][f] = v; }));
    if (nuevo.dispo) {
      Object.entries(nuevo.dispo.dias || {}).forEach(([f, v]) => { if (!D.dispo.dias[f]) D.dispo.dias[f] = v; });
      ['reglasDesde', 'rotacion', 'franjas', 'actividades'].forEach(k => { if (nuevo.dispo[k] && (!D.dispo[k] || (Array.isArray(D.dispo[k]) && !D.dispo[k].length))) D.dispo[k] = nuevo.dispo[k]; });
    }
    if (nuevo.listas) Object.entries(nuevo.listas).forEach(([k, v]) => {
      if (k === 'estados') Object.entries(v).forEach(([c, l]) => { D.listas.estados[c] = [...new Set([...(D.listas.estados[c] || []), ...l])]; });
      else if (Array.isArray(v)) D.listas[k] = [...new Set([...(D.listas[k] || []), ...v])];
    });
    if (nuevo.despensa) D.despensa = [...new Set([...D.despensa, ...nuevo.despensa])];
    if (nuevo.congelador) D.congelador = [...new Set([...(D.congelador || []), ...nuevo.congelador])];
    if (nuevo.calendarios) nuevo.calendarios.forEach(c => { if (!D.calendarios.some(x => x.nombre === c.nombre)) D.calendarios.push(c); });
    if (nuevo.enlaces && nuevo.enlaces.length) nuevo.enlaces.forEach(e => { if (/^https?:/.test(e.url) && !D.enlaces.some(x => x.url === e.url)) D.enlaces.push(e); });
  }
  completar(D);
  cambio();
}
