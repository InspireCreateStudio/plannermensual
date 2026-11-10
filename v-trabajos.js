'use strict';
// =====================================================================
//  Planner — Otros trabajos: encargos de corrección, maquetación,
//  diseño de portadas y lectura beta, en columnas. Cada encargo tiene
//  su fecha límite (sale en Calendario e Inicio) y la lista de lo que
//  necesitas para hacerlo.
// =====================================================================

const TIPOS_TRABAJO = [
  ['correccion', '✍️', 'Correcciones'],
  ['maquetacion', '📐', 'Maquetaciones'],
  ['portada', '🎨', 'Diseño de portadas'],
  ['beta', '📖', 'Lectura beta'],
];
const ESTADOS_TRABAJO = ['📥 Pendiente', '✏️ En curso', '⏳ Esperando a la autora', '📤 Entregado', '❌ Cancelada'];
const tipoTrabajo = (k) => TIPOS_TRABAJO.find(t => t[0] === k) || TIPOS_TRABAJO[0];

// Lo que suele hacer falta en cada tipo de encargo (se puede editar en cada uno)
function pasosTrabajo(tipo) {
  const L = {
    correccion: ['Recibir el manuscrito en Word', 'Acordar tipo de corrección (ortotipográfica o de estilo) y precio', 'Primera lectura', 'Corregir con control de cambios', 'Resolver dudas con la autora', 'Entregar el archivo corregido', 'Enviar la factura'],
    maquetacion: ['Recibir el texto final ya corregido', 'Medidas, márgenes y dónde se imprime (KDP o imprenta)', 'Tipografías y estilo de los capítulos', 'Páginas de cortesía: legales, ISBN y dedicatoria', 'Maquetar la versión en papel (PDF)', 'Maquetar el ebook (ePub)', 'Revisión de la autora', 'Entregar los archivos finales', 'Enviar la factura'],
    portada: ['Brief: género, tono y referencias', 'Título, subtítulo y nombre de autora', 'Medidas y número de páginas (para el lomo)', 'Texto de contraportada', 'ISBN y código de barras', 'Primeras propuestas', 'Revisiones', 'Entregar la portada digital y el archivo para imprenta', 'Enviar la factura'],
    beta: ['Recibir el manuscrito', 'Acordar qué tipo de comentarios quiere', 'Leer', 'Apuntar comentarios por capítulo', 'Enviar el informe de lectura', 'Enviar la factura (si es de pago)'],
  }[tipo] || [];
  return L.map(t => ({ id: uid(), t, hecho: false }));
}

function editarTrabajo(o, { nueva = false } = {}) {
  const obj = { estado: ESTADOS_TRABAJO[0], tipo: 'correccion', ...o };
  obj.tipoTxt = tipoTrabajo(obj.tipo)[2];
  obj.cobradoTxt = obj.cobrado ? 'Sí' : 'No';
  if (nueva && !obj.pasos) obj.pasos = pasosTrabajo(obj.tipo);
  const pasosIniciales = (obj.pasos || []).map(p => p.t).join('|');
  const campos = [
    { k: 'titulo', t: 'Libro / encargo', tipo: 'texto' },
    { k: 'tipoTxt', t: 'Tipo', tipo: 'select', op: TIPOS_TRABAJO.map(t => t[2]), vacio: false, ancho: 'medio' },
    { k: 'estado', t: 'Estado', tipo: 'select', op: ESTADOS_TRABAJO, vacio: false, ancho: 'medio' },
    { k: 'cliente', t: 'Autora / cliente', tipo: 'texto', ancho: 'medio' },
    { k: 'contacto', t: 'Contacto (email o teléfono)', tipo: 'texto', ancho: 'medio' },
    { k: 'encargo', t: 'Fecha de encargo', tipo: 'fecha', ancho: 'medio' },
    { k: 'fecha', t: 'Fecha límite de entrega', tipo: 'fecha', ancho: 'medio' },
    { k: 'extension', t: 'Palabras o páginas', tipo: 'texto', ancho: 'medio', ph: 'p. ej. 85.000 palabras' },
    { k: 'precio', t: 'Precio (€)', tipo: 'num', ancho: 'medio' },
    { k: 'cobradoTxt', t: '¿Cobrado?', tipo: 'select', op: ['No', 'Sí'], vacio: false, ancho: 'medio' },
    { k: 'archivos', t: 'Enlace a los archivos', tipo: 'texto', ancho: 'medio', ph: 'Drive, WeTransfer…' },
    { k: 'pasos', t: 'Lo que necesito', tipo: 'pasos' },
    { k: 'notas', t: 'Notas', tipo: 'area' },
  ];
  ficha({
    titulo: nueva ? 'Nuevo encargo' : 'Encargo', obj, campos,
    onGuardar: (r) => {
      if (!r.titulo) { aviso('Escribe el libro o el encargo'); return false; }
      const fin = { ...r, id: o.id || uid(), tipo: (TIPOS_TRABAJO.find(t => t[2] === r.tipoTxt) || TIPOS_TRABAJO[0])[0], cobrado: r.cobradoTxt === 'Sí' };
      delete fin.tipoTxt; delete fin.cobradoTxt;
      // Si al crearlo cambias el tipo y no has tocado la lista, se pone la lista de ese tipo
      if (nueva && fin.tipo !== obj.tipo && (fin.pasos || []).map(p => p.t).join('|') === pasosIniciales) fin.pasos = pasosTrabajo(fin.tipo);
      if (nueva) D.trabajos.push(fin); else { const i = D.trabajos.findIndex(x => x.id === o.id); D.trabajos[i] = fin; }
      cambio();
    },
    onBorrar: nueva ? null : async () => { borrarConDeshacer('trabajos', o.id, 'Encargo borrado'); return true; },
  });
}

VISTAS.trabajos = (cont) => {
  const H = hoy();
  const verTodos = !!UI.trVerTodos;
  const activo = (j) => !esHecho(j.estado) && !esAnulada(j.estado);
  const L = D.trabajos;
  const finSemana = sumarDias(lunesDe(H), 6);
  const enCurso = L.filter(activo);
  const estaSemana = enCurso.filter(j => j.fecha && j.fecha <= finSemana);
  const cobrado = L.filter(j => j.cobrado).reduce((s, j) => s + (Number(j.precio) || 0), 0);
  const porCobrar = L.filter(j => !j.cobrado && !esAnulada(j.estado) && esHecho(j.estado)).reduce((s, j) => s + (Number(j.precio) || 0), 0);
  const euros = (n) => n.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });

  const tarjeta = (j) => {
    const p = plazo(j.fecha, j.estado);
    const ps = j.pasos || [], h = ps.filter(x => x.hecho).length;
    return `<div class="trabajo ${activo(j) ? '' : 'cerrado'} ${p.c}" data-tid="${esc(j.id)}">
      <div class="tr-t">${esc(j.titulo || 'Sin título')}</div>
      ${j.cliente ? `<div class="tenue tr-s">${esc(j.cliente)}</div>` : ''}
      <div class="tr-chips">
        ${j.fecha ? `<span class="plazo ${p.c}" title="Fecha límite">${activo(j) && p.t ? p.t : '📅 ' + fechaCorta(j.fecha)}</span>` : '<span class="tenue">Sin fecha límite</span>'}
        <span>${esc(j.estado || '')}</span>
        ${ps.length ? `<span title="Lo que necesito">☑ ${h}/${ps.length}</span>` : ''}
        ${j.precio ? `<span>${euros(Number(j.precio))}${j.cobrado ? ' · cobrado' : ''}</span>` : ''}
      </div>
    </div>`;
  };

  cont.innerHTML = `<div class="pagina ancha">
    ${cabecera('🖋️ Otros trabajos', 'Encargos de corrección, maquetación, portadas y lectura beta. Las fechas límite salen también en Calendario e Inicio.',
      `<button class="btn" id="tr-ver">${verTodos ? 'Ocultar terminados' : 'Ver terminados'}</button><button class="btn prim" id="tr-nuevo">+ Encargo</button>`)}
    <div class="tr-resumen">
      <div class="tarjeta"><b>${enCurso.length}</b><span>en marcha</span></div>
      <div class="tarjeta"><b>${estaSemana.length}</b><span>entregas esta semana</span></div>
      <div class="tarjeta"><b>${euros(porCobrar)}</b><span>entregado, por cobrar</span></div>
      <div class="tarjeta"><b>${euros(cobrado)}</b><span>cobrado</span></div>
    </div>
    <div class="tr-columnas">${TIPOS_TRABAJO.map(([k, e, n]) => {
      const xs = L.filter(j => j.tipo === k && (verTodos || activo(j))).sort((a, b) => (activo(b) - activo(a)) || (a.fecha || '9999').localeCompare(b.fecha || '9999'));
      return `<section class="tarjeta tr-col"><div class="t-cab"><h2>${e} ${n}</h2><button class="icono" data-tnuevo="${k}" title="Nuevo encargo de ${esc(n.toLowerCase())}">＋</button></div>
        ${xs.map(tarjeta).join('') || '<p class="vacio">Nada en marcha</p>'}</section>`;
    }).join('')}</div>
  </div>`;

  $('#tr-nuevo', cont).onclick = () => editarTrabajo({}, { nueva: true });
  $('#tr-ver', cont).onclick = () => { UI.trVerTodos = !verTodos; guardarUI(); pintar(); };
  $$('[data-tnuevo]', cont).forEach(b => b.onclick = () => editarTrabajo({ tipo: b.dataset.tnuevo }, { nueva: true }));
  $$('[data-tid]', cont).forEach(n => n.onclick = () => { const j = L.find(x => x.id === n.dataset.tid); if (j) editarTrabajo(j); });
};
