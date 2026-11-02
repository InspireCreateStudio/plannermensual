'use strict';
// =====================================================================
//  Planner — arranque: carga tus datos, menú (también el de abajo en
//  el móvil), atajos, copia automática y modo sin conexión.
// =====================================================================

const VERSION_APP = '1.8';

(async function arrancar() {
  try { D = await Store.get('datos'); } catch (e) { console.error(e); }
  const primeraVez = !D;
  D = completar(D || datosVacios());
  aplicarTema();

  // Menú lateral (y de abajo en el móvil)
  const rail = $('#rail');
  $$('#rail button[data-vista]').forEach(b => b.onclick = () => { cerrarMas(); irA(b.dataset.vista); });
  const PRINCIPALES = ['inicio', 'calendario', 'tareas', 'descarga'];
  $$('#rail button[data-vista]').forEach(b => { if (!PRINCIPALES.includes(b.dataset.vista)) b.classList.add('secundario'); });
  const mas = el('div', { class: 'btn-mas', role: 'button', tabindex: '0', html: '<svg viewBox="0 0 24 24"><circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/></svg>Más' });
  rail.append(mas);
  const hoja = el('div', { class: 'hoja-mas' });
  $$('#rail button.secundario').forEach(b => { const c = b.cloneNode(true); c.classList.remove('secundario', 'abajo'); c.onclick = () => { cerrarMas(); irA(c.dataset.vista); }; hoja.append(c); });
  const fondo = el('div', { class: 'velo-movil' }); document.body.append(fondo, hoja);
  const cerrarMas = () => { hoja.classList.remove('on'); fondo.classList.remove('on'); };
  mas.onclick = (e) => { e.stopPropagation(); const on = !hoja.classList.contains('on'); hoja.classList.toggle('on', on); fondo.classList.toggle('on', on); };
  fondo.onclick = cerrarMas;
  new MutationObserver(() => {
    const v = (rail.querySelector('button.secundario.on') || {}).dataset;
    mas.classList.toggle('on', !!v);
    $$('button', hoja).forEach(b => b.classList.toggle('on', !!v && b.dataset.vista === v.vista));
  }).observe(rail, { subtree: true, attributes: true, attributeFilter: ['class'] });

  // Botón flotante: nueva tarea (o pieza/evento según la sección)
  $('#fab').onclick = () => {
    if (vistaActual === 'redes') return editarPieza({ fecha: hoy(), formato: 'Post', donde: 'Instagram', prioridad: '🟠Media' }, { nueva: true });
    if (vistaActual === 'eventos') return editarEvento({ fecha: hoy() }, { nueva: true });
    if (vistaActual === 'descarga') return apunteRapido();
    if (vistaActual === 'calendario') return nuevaTarea({ fecha: UI.calDia || hoy() });
    if (vistaActual === 'casa') return nuevaTarea({ cat: 'casa' });
    if (vistaActual === 'tareas' && UI.tCat === 'rapida') { const n = rapidaVisible(); if (n) n.focus(); return; }
    nuevaTarea(vistaActual === 'tareas' && UI.tCat in CATS ? { cat: UI.tCat } : {});
  };

  // Enlaces internos (#calendario, #objetivos…)
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (a && VISTAS[a.getAttribute('href').slice(1)]) { e.preventDefault(); irA(a.getAttribute('href').slice(1)); }
  });
  window.addEventListener('hashchange', () => { const v = location.hash.slice(1); if (VISTAS[v] && v !== vistaActual) irA(v); });

  // Atajos de teclado (no mientras escribes)
  document.addEventListener('keydown', (e) => {
    if (e.target.closest('input,textarea,select,[contenteditable]') || e.metaKey || e.ctrlKey || e.altKey || $('.velo')) return;
    if (e.key === 'n') { e.preventDefault(); $('#fab').click(); }
    else if (e.key === 'a') { e.preventDefault(); apunteRapido(); }
    else if (e.key === 'h') irA('inicio');
    else if (e.key === 'c') irA('calendario');
    else if (e.key === 't') irA('tareas');
  });

  // Deslizar en el calendario para cambiar de mes (móvil)
  let x0 = null;
  $('#main').addEventListener('touchstart', (e) => { x0 = e.target.closest('.mes, .tabla-turnos') ? e.touches[0].clientX : null; }, { passive: true });
  $('#main').addEventListener('touchend', (e) => {
    if (x0 === null) return;
    const dx = e.changedTouches[0].clientX - x0; x0 = null;
    if (Math.abs(dx) < 70) return;
    const sig = dx < 0 ? 1 : -1;
    if (vistaActual === 'calendario') { UI.calMes = sumarMeses(UI.calMes || mesDe(hoy()), (UI.calModo === 'año' ? 12 : 1) * sig); }
    else if (vistaActual === 'redes') { UI.rMes = sumarMeses(UI.rMes || mesDe(hoy()), sig); }
    else if (vistaActual === 'turnos') { UI.dMes = sumarMeses(UI.dMes || mesDe(hoy()), sig); }
    else return;
    guardarUI(); pintar();
  }, { passive: true });

  // A medianoche (o al volver a la app otro día) se repinta para que «hoy» sea hoy
  let diaPintado = hoy();
  document.addEventListener('visibilitychange', () => { if (!document.hidden && hoy() !== diaPintado) { diaPintado = hoy(); pintar(); } });
  setInterval(() => { if (hoy() !== diaPintado) { diaPintado = hoy(); pintar(); } }, 60000);

  const inicial = location.hash.slice(1);
  irA(VISTAS[inicial] ? inicial : (UI.vista || 'inicio'));
  if (primeraVez) { await guardarYa(); bienvenida(); }

  // Copia automática
  const dias = D.ajustes.copiaDias ?? 7;
  if (!primeraVez && dias > 0 && (D.tareas.length || D.eventos.length) && Date.now() - (D.ajustes.ultimaCopia || 0) > dias * 86400000) {
    setTimeout(() => { hacerCopia('automática'); aviso('He guardado tu copia de seguridad en Descargas'); }, 5000);
  }

  if (typeof arrancarGoogle === 'function') arrancarGoogle();
  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    // Cuando hay versión nueva: se instala sola y la app se recarga al momento (si no estás escribiendo en una ventana)
    const habia = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.addEventListener('controllerchange', () => { if (!habia || window._recargando) return; window._recargando = true; guardarYa().finally(() => { if (!document.querySelector('.velo')) location.reload(); else aviso('Hay una versión nueva: cierra y abre la app para tenerla'); }); });
    navigator.serviceWorker.register('sw.js').then(reg => { reg.update().catch(() => {}); document.addEventListener('visibilitychange', () => { if (!document.hidden) reg.update().catch(() => {}); }); }).catch(() => {});
  }
})();

function bienvenida() {
  modal(`<div class="bienvenida"><div class="logo-grande">P</div><h3>Tu planner, ahora como app</h3>
    <p class="suave">Todo lo del Planner Mensual de Excel: Inicio, calendario, tareas por categoría, descarga mental, objetivos, redes, casa y menú, eventos y turnos. Funciona sin conexión y se instala en el móvil.</p>
    <p class="suave">Si tienes un archivo <b>planner-importar.json</b> con tus datos de Excel, cárgalo; si no, empieza en blanco y lo vas rellenando.</p></div>
    <div class="pie" style="flex-wrap:wrap"><button class="btn" data-cerrar>Empezar en blanco</button><button class="btn prim" id="bv-imp">Cargar mis datos del Excel</button></div>`, {
    alAbrir: (m, cerrar) => {
      $('#bv-imp', m).onclick = () => { cerrar(); elegirArchivo((j) => { if (!j || j.app !== 'planner' || !j.datos) return aviso('Ese archivo no es del Planner'); importarDatos(j, 'sustituir'); aviso('¡Listo! Ya tienes aquí tus datos del Excel'); irA('inicio'); }); };
    }
  });
}
