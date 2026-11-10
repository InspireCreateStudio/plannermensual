'use strict';
// =====================================================================
//  Planner — Ajustes: Google, copias, importar del Excel, accesos
//  rápidos, calendarios y las listas de los desplegables (lo que era
//  la pestaña Config).
// =====================================================================

const LISTAS_EDITABLES = [
  ['Estados', [...Object.keys(CATS).map(k => [`estados.${k}`, `${CATS[k].e} ${CATS[k].n}`]), ['estados.redes', '📱 Redes (tareas)'], ['estados.eventos', '📅 Eventos'], ['estados.descarga', '🧠 Descarga mental'], ['estados.objetivos', '🎯 Objetivos']]],
  ['Tareas', [['prioridad', 'Prioridad'], ['energia', 'Energía'], ['personas', 'Personas (Médicos)']]],
  ['Descarga y objetivos', [['catDescarga', 'Categorías de la descarga'], ['catObjetivos', 'Categorías de objetivos']]],
  ['Newsletter', [['segmentos', 'Segmentos'], ['tiposNews', 'Tipos'], ['librosNews', 'Libros']]],
  ['Redes', [['formatos', 'Formatos'], ['donde', 'Dónde'], ['pilares', 'Pilares'], ['objetivosRRSS', 'Objetivos']]],
  ['Compra', [['catCompra', 'Tipos de producto'], ['supers', 'Supermercados']]],
];
const leerLista = (ruta) => ruta.split('.').reduce((o, k) => o && o[k], D.listas) || [];
const ponerLista = (ruta, v) => { const p = ruta.split('.'); const ult = p.pop(); p.reduce((o, k) => o[k], D.listas)[ult] = v; };

VISTAS.ajustes = (cont) => {
  const A = D.ajustes;
  cont.innerHTML = `<div class="pagina ajustes">${cabecera('⚙️ Ajustes', '')}
    <div class="rejilla r2">
      <section class="tarjeta"><h2>Tú</h2>
        <label class="campo"><span>Tu nombre (para el saludo)</span><input id="aj-nombre" value="${esc(A.nombre || '')}" placeholder="Tu nombre"></label>
        <label class="campo"><span>Aspecto</span><select id="aj-tema"><option value="auto">Como el sistema</option><option value="claro"${A.tema === 'claro' ? ' selected' : ''}>Claro</option><option value="noche"${A.tema === 'noche' ? ' selected' : ''}>Oscuro</option></select></label>
        <label class="campo"><span>Fechas clave que se ven en Inicio</span><input id="aj-claves" type="number" min="1" max="10" value="${A.diasClave || 4}"></label>
      </section>
      ${tarjetaColores()}
      ${tarjetaAvisos()}
      ${typeof tarjetaGoogle === 'function' ? tarjetaGoogle() : ''}
      <section class="tarjeta"><h2>Copias de seguridad</h2>
        <p class="suave" style="margin-top:0">Tus datos viven en este navegador. Guarda una copia de vez en cuando (y conecta Google para tenerlos también en el móvil).</p>
        <div class="fila-btns"><button class="btn prim" id="aj-copia">Descargar copia ahora</button><button class="btn" id="aj-rest">Restaurar una copia…</button></div>
        <label class="campo"><span>Copia automática a Descargas</span><select id="aj-auto">${[[0, 'Nunca'], [1, 'Cada día'], [7, 'Cada semana'], [30, 'Cada mes']].map(([v, t]) => `<option value="${v}"${(A.copiaDias ?? 7) === v ? ' selected' : ''}>${t}</option>`).join('')}</select></label>
        <p class="tenue">${A.ultimaCopia ? 'Última copia: ' + new Date(A.ultimaCopia).toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' }) : 'Aún no has hecho ninguna copia.'}</p>
      </section>
      <section class="tarjeta"><h2>Traer datos del Excel</h2>
        <p class="suave" style="margin-top:0">Si tienes un archivo de importación (<b>planner-importar.json</b>) hecho a partir de un Planner Mensual de Excel, cárgalo aquí.</p>
        <button class="btn" id="aj-imp">Importar archivo…</button>
        <p class="tenue">Puedes juntarlo con lo que ya tienes (no duplica nada) o sustituirlo todo.</p>
      </section>
      <section class="tarjeta"><h2>Accesos rápidos</h2>
        <p class="suave" style="margin-top:0">Uno por línea: <code>Texto | dirección</code></p>
        <textarea id="aj-enl" rows="8">${esc(D.enlaces.map(e => `${e.t} | ${e.url}`).join('\n'))}</textarea>
      </section>
      <section class="tarjeta"><h2>Calendarios</h2>
        <p class="suave" style="margin-top:0">El punto de color de cada calendario y cuáles cuentan como <b>fechas clave</b> (las que salen en Inicio con cuenta atrás).</p>
        <div id="aj-cals">${D.calendarios.map((c, i) => `<div class="cal-fila" data-i="${i}"><input data-c="punto" value="${esc(c.punto || '')}" class="punto-in" aria-label="Punto"><input data-c="nombre" value="${esc(c.nombre)}" aria-label="Nombre"><label class="check-peq"><input type="checkbox" data-clave${D.clave.includes(c.nombre) ? ' checked' : ''}> clave</label><button class="icono" data-quitar title="Quitar">✕</button></div>`).join('')}</div>
        <button class="btn peq" id="aj-addcal">+ Calendario</button>
      </section>
    </div>
    <section class="tarjeta" style="margin-top:18px"><h2>Listas de los desplegables</h2>
      <p class="suave" style="margin-top:0">Lo que era la pestaña Config. Una opción por línea; el emoji del principio es parte del nombre. <b>Ojo:</b> en los estados, lo que lleva «Completada», «Enviada», «Publicado», «Lanzado» o «Conseguido» cuenta como hecho, y «Cancelada», «Descartada» o «Eliminada» como anulado.</p>
      ${LISTAS_EDITABLES.map(([g, ls]) => `<h4 class="sep-form">${g}</h4><div class="listas">${ls.map(([ruta, t]) => `<label class="campo"><span>${t}</span><textarea data-lista="${ruta}" rows="${Math.min(9, Math.max(3, leerLista(ruta).length + 1))}">${esc(leerLista(ruta).join('\n'))}</textarea></label>`).join('')}</div>`).join('')}
      <button class="btn peq" id="aj-listas-def">Volver a las listas de serie</button>
    </section>
    <section class="tarjeta peligro-zona"><h2>Empezar de cero</h2><p class="suave" style="margin-top:0">Borra todos los datos de este aparato (antes te descargo una copia).</p><button class="btn peligro" id="aj-borrar">Borrar todo</button></section>
    <p class="tenue pie-app">Planner · versión ${VERSION_APP}</p>
  </div>`;

  enlazarTarjetaAvisos(cont);
  $('#aj-nombre', cont).onchange = (e) => { A.nombre = e.target.value.trim(); cambio(false); };
  $('#aj-tema', cont).onchange = (e) => { A.tema = e.target.value; aplicarTema(); cambio(false); };
  $('#aj-claves', cont).onchange = (e) => { A.diasClave = Math.max(1, Math.min(10, +e.target.value || 4)); cambio(false); };
  $('#aj-auto', cont).onchange = (e) => { A.copiaDias = +e.target.value; cambio(false); };
  $('#aj-copia', cont).onclick = () => hacerCopia();
  $('#aj-rest', cont).onclick = () => elegirArchivo(async (j) => {
    if (!j || j.app !== 'planner' || !j.datos) return aviso('Ese archivo no es una copia del Planner');
    if (j.tipo === 'importar-excel') return importarConPregunta(j);
    if (!(await preguntar('¿Restaurar esta copia?', `Es del ${new Date(j.fecha).toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' })}. Sustituye todo lo que hay ahora (antes te descargo una copia de lo actual).`, 'Restaurar'))) return;
    await hacerCopia('antes de restaurar');
    D = completar(j.datos); cambio(); aviso('Copia restaurada');
  });
  $('#aj-imp', cont).onclick = () => elegirArchivo((j) => {
    if (!j || j.app !== 'planner' || !j.datos) return aviso('Ese archivo no es del Planner');
    importarConPregunta(j);
  });
  $('#aj-enl', cont).onchange = (e) => {
    D.enlaces = e.target.value.split('\n').map(l => l.split('|')).filter(p => p[0].trim()).map(([t, ...u]) => ({ t: t.trim(), url: u.join('|').trim() }));
    cambio(false);
  };
  $$('.cal-fila', cont).forEach(f => {
    const c = D.calendarios[+f.dataset.i];
    $$('[data-c]', f).forEach(i => i.onchange = () => {
      const antes = c.nombre; c[i.dataset.c] = i.value.trim();
      if (i.dataset.c === 'nombre' && antes !== c.nombre) { D.eventos.forEach(e => { if (e.cal === antes) e.cal = c.nombre; }); D.clave = D.clave.map(n => n === antes ? c.nombre : n); }
      cambio(false);
    });
    $('[data-clave]', f).onchange = (e) => { D.clave = D.clave.filter(n => n !== c.nombre); if (e.target.checked) D.clave.push(c.nombre); cambio(false); };
    $('[data-quitar]', f).onclick = async () => {
      // Al quitar un calendario se van también sus eventos (si no, volvería a aparecer) y deja de traerse de Google
      const n = D.eventos.filter(e => e.cal === c.nombre).length;
      if (n && !(await preguntar(`¿Quitar «${c.nombre}»?`, `Tiene ${plural(n, 'evento', 'eventos')}. Se borran también de aquí (no de Google Calendar).`, 'Quitar calendario y eventos', true))) return;
      D.eventos = D.eventos.filter(e => e.cal !== c.nombre);
      D.clave = D.clave.filter(x => x !== c.nombre);
      const G = D.ajustes.gcal; if (G && G.cals) G.cals.forEach(g => { if (g.local === c.nombre) g.usar = false; });
      D.calendarios = D.calendarios.filter(x => x !== c);
      cambio();
    };
  });
  $('#aj-addcal', cont).onclick = async () => { const n = await pedirTexto('Nuevo calendario', '', 'Nombre'); if (n) { D.calendarios.push({ nombre: n.toUpperCase(), punto: '⚪' }); cambio(); } };
  $$('[data-lista]', cont).forEach(t => t.onchange = () => {
    const v = t.value.split('\n').map(s => s.trim()).filter(Boolean);
    if (!v.length) { aviso('Una lista no puede quedarse vacía'); t.value = leerLista(t.dataset.lista).join('\n'); return; }
    ponerLista(t.dataset.lista, v); cambio(false);
  });
  $('#aj-listas-def', cont).onclick = async () => { if (await preguntar('¿Volver a las listas de serie?', 'Se pierden los cambios que hayas hecho en los desplegables. Tus tareas no se tocan.', 'Volver')) { D.listas = listasPorDefecto(); cambio(); } };
  $('#aj-borrar', cont).onclick = async () => {
    if (!(await preguntar('¿Borrar todo?', 'Se borran todas tus tareas, eventos, menús… de este aparato. Antes te descargo una copia.', 'Borrar todo', true))) return;
    await hacerCopia('antes de borrar');
    const aj = D.ajustes; D = datosVacios(); D.ajustes = aj; cambio(); aviso('Todo borrado. Tienes la copia en Descargas.');
  };
  enlazarColores(cont);
  if (typeof enlazarGoogle === 'function') enlazarGoogle(cont);
};

function elegirArchivo(fn) {
  const i = el('input', { type: 'file', accept: '.json,application/json' });
  i.onchange = async () => {
    const f = i.files[0]; if (!f) return;
    try { fn(JSON.parse(await f.text())); } catch (e) { aviso('No he podido leer ese archivo'); }
  };
  i.click();
}
function importarConPregunta(j) {
  const d = j.datos || {};
  const n = (k) => (d[k] || []).length;
  const diasMenu = Object.keys(d.menu || {}).sort();
  const partes = [[n('tareas'), 'tarea', 'tareas'], [n('eventos'), 'evento', 'eventos'], [n('batch'), 'pieza de redes', 'piezas de redes'], [n('ideas'), 'idea', 'ideas'],
    [n('objetivos'), 'objetivo', 'objetivos'], [n('descarga'), 'apunte', 'apuntes'], [Object.keys((d.dispo || {}).dias || {}).length, 'día de turnos', 'días de turnos'],
    [diasMenu.length, 'día de menú', 'días de menú'], [n('compra'), 'cosa de la compra', 'cosas de la compra']].filter(x => x[0]).map(([c, a, b]) => plural(c, a, b));
  const soloMenu = diasMenu.length && partes.length === 1;
  modal(`<h3>${soloMenu ? 'Importar menú' : 'Importar datos'}</h3>
    <p class="suave">El archivo trae ${partes.join(', ').replace(/, ([^,]*)$/, ' y $1') || 'nada que importar'}${diasMenu.length ? ` (del ${fechaCorta(diasMenu[0])} al ${fechaCorta(diasMenu[diasMenu.length - 1])})` : ''}.</p>
    <div class="opciones-imp">
      <label><input type="radio" name="imp" value="juntar" checked> <b>Juntar</b> con lo que ya tengo <small>Añade lo que falte; lo que ya tienes no se toca. Importar dos veces no duplica.</small></label>
      ${soloMenu ? '' : '<label><input type="radio" name="imp" value="sustituir"> <b>Sustituir</b> todo <small>Te descargo antes una copia de lo actual.</small></label>'}</div>
    <div class="pie"><button class="btn" data-cerrar>Cancelar</button><button class="btn prim" id="im-ok">Importar</button></div>`, {
    alAbrir: (m, cerrar) => {
      $('#im-ok', m).onclick = async () => {
        const modo = $('input[name=imp]:checked', m).value;
        cerrar();
        if (modo === 'sustituir' && (D.tareas.length || D.eventos.length)) await hacerCopia('antes de importar');
        importarDatos(j, modo);
        if (soloMenu) { aviso(`Menú importado: ${plural(diasMenu.length, 'día', 'días')}`); irA('casa', { ui: { cPest: 'menu', mMes: mesDe(diasMenu[diasMenu.length - 1]) } }); }
        else { aviso('Datos importados'); irA('inicio'); }
      };
    }
  });
}
async function hacerCopia(motivo) {
  const d = new Date();
  const nombre = `Planner · Copia ${aStr(d)} ${pad(d.getHours())}h${pad(d.getMinutes())}${motivo ? ' (' + motivo + ')' : ''}.json`;
  await guardarYa();
  descargar(new Blob([JSON.stringify({ app: 'planner', tipo: 'copia', version: 1, fecha: d.toISOString(), datos: D })], { type: 'application/json' }), nombre);
  D.ajustes.ultimaCopia = Date.now(); guardarPronto();
  if (!motivo) aviso('Copia guardada en Descargas');
}
function aplicarTema() {
  const t = D && D.ajustes.tema;
  const noche = t === 'noche' || (t !== 'claro' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.dataset.theme = noche ? 'noche' : 'claro';
  aplicarColores(noche);
}

// ---------- colores ----------
const PALETAS = [
  ['Terracota', '#9c4f35'], ['Salvia', '#5d7a62'], ['Bosque', '#2f5d50'], ['Rosa', '#b0506f'], ['Frambuesa', '#a3324f'],
  ['Lavanda', '#7462a3'], ['Azul', '#3d6a9e'], ['Petróleo', '#1f6b72'], ['Mostaza', '#a1761a'], ['Grafito', '#45464a'],
];
const hexARgb = (h) => { h = h.replace('#', ''); if (h.length === 3) h = h.split('').map(c => c + c).join(''); return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16)); };
const rgbAHex = (r) => '#' + r.map(x => Math.round(Math.max(0, Math.min(255, x))).toString(16).padStart(2, '0')).join('');
const mezclar = (a, b, p) => { const x = hexARgb(a), y = hexARgb(b); return rgbAHex(x.map((v, i) => v * p + y[i] * (1 - p))); };
const luz = (h) => { const [r, g, b] = hexARgb(h).map(v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }); return .2126 * r + .7152 * g + .0722 * b; };
const contraste = (a, b) => { const x = luz(a), y = luz(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };
// Texto que se lee bien encima de un color
const textoSobre = (h) => contraste(h, '#ffffff') >= contraste(h, '#1c1916') ? '#ffffff' : '#1c1916';
function coloresDe() { return (D && D.ajustes.colores) || {}; }
function aplicarColores(noche = document.documentElement.dataset.theme === 'noche') {
  const C = coloresDe();
  // Categorías
  Object.keys(CATS).forEach(k => { CATS[k].color = (C.cats || {})[k] || COLORES_SERIE[k]; });
  CAT_REDES.color = (C.cats || {}).redes || COLORES_SERIE.redes;
  CAT_EVENTO.color = (C.cats || {}).eventos || COLORES_SERIE.eventos;
  // Color principal (en oscuro, más claro para que se lea sobre fondo negro)
  const base = C.acento || COLOR_ACENTO;
  let ac = base;
  if (noche) { ac = mezclar(base, '#ffffff', .62); if (contraste(ac, '#24211d') < 4.5) ac = mezclar(base, '#ffffff', .45); }
  const claro = noche ? mezclar(base, '#1c1916', .3) : mezclar(base, '#ffffff', .16);
  let st = document.getElementById('estilo-colores');
  if (!st) { st = document.createElement('style'); st.id = 'estilo-colores'; document.head.append(st); }
  st.textContent = `:root, :root[data-theme="noche"] { --acento: ${ac}; --acento-claro: ${claro}; --sobre-acento: ${textoSobre(ac)}; }`;
  const m = $('meta[name=theme-color]'); if (m) m.content = noche ? '#1c1916' : base;
}
function tarjetaColores() {
  const C = coloresDe(), ac = C.acento || COLOR_ACENTO;
  const cats = [...Object.keys(CATS).map(k => [k, CATS[k].e + ' ' + CATS[k].n]), ['redes', '📱 Redes'], ['eventos', '📅 Eventos']];
  return `<section class="tarjeta" id="aj-colores" style="grid-column:1/-1"><h2>Colores</h2>
    <p class="suave" style="margin-top:0">El color principal se usa en botones, el día de hoy, el menú y los avisos. Cada categoría tiene el suyo en las tareas y el calendario. Se guardan con tus datos, así que salen igual en el móvil.</p>
    <h4>Color principal</h4>
    <div class="colores-pre">${PALETAS.map(([n, c]) => `<button data-pre="${c}" class="${c.toLowerCase() === ac.toLowerCase() ? 'on' : ''}" style="--m:${c}"><i></i>${n}</button>`).join('')}
      <label class="color-fila" style="border:0;padding:0;gap:6px"><input type="color" id="col-acento" value="${ac}" aria-label="Otro color"><span class="suave" style="flex:none">Otro…</span></label></div>
    <div class="muestra"><button class="btn prim" type="button">Botón</button><span class="pill">etiqueta</span><span class="plazo hoy">⏰ Hoy</span><span class="rail-muestra" style="color:var(--acento);font-weight:600">Texto destacado</span></div>
    <h4>Categorías</h4>
    <div class="colores-cats">${cats.map(([k, t]) => { const v = k === 'redes' ? CAT_REDES.color : k === 'eventos' ? CAT_EVENTO.color : CATS[k].color; return `<div class="color-fila"><span class="chip-cat">${esc(t)}</span><input type="color" data-colcat="${k}" value="${v}" aria-label="Color de ${esc(t)}">${(C.cats || {})[k] ? `<button class="icono" data-colserie="${k}" title="Volver al de serie">↺</button>` : ''}</div>`; }).join('')}</div>
    <div class="fila-btns" style="margin:12px 0 0"><button class="btn peq" id="col-serie">Volver a los colores de serie</button></div></section>`;
}
function enlazarColores(cont) {
  const c = $('#aj-colores', cont); if (!c) return;
  const C = () => D.ajustes.colores || (D.ajustes.colores = {});
  const guardar = debounce(() => cambio(false), 300);
  const ponerAcento = (v, repintar) => { C().acento = v; aplicarColores(); $$('[data-pre]', c).forEach(b => b.classList.toggle('on', b.dataset.pre.toLowerCase() === v.toLowerCase())); if (repintar) cambio(); else guardar(); };
  $$('[data-pre]', c).forEach(b => b.onclick = () => { $('#col-acento', c).value = b.dataset.pre; ponerAcento(b.dataset.pre); });
  $('#col-acento', c).oninput = (e) => ponerAcento(e.target.value);
  $$('[data-colcat]', c).forEach(i => {
    i.oninput = () => { const o = C(); o.cats = o.cats || {}; o.cats[i.dataset.colcat] = i.value; aplicarColores(); guardar(); };
    i.onchange = () => cambio();
  });
  $$('[data-colserie]', c).forEach(b => b.onclick = () => { delete (C().cats || {})[b.dataset.colserie]; aplicarColores(); cambio(); });
  $('#col-serie', c).onclick = () => { delete D.ajustes.colores; aplicarColores(); cambio(); aviso('Colores de serie'); };
}
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => aplicarTema());
