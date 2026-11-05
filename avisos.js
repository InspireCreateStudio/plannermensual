'use strict';
// =====================================================================
//  Planner — avisos: notificaciones de las tareas (y eventos) con hora.
//  No hay servidor, así que solo avisa mientras la app está abierta o
//  instalada y en segundo plano. Para avisos seguros: Google Calendar.
// =====================================================================

const AVISOS = ['A la hora', '10 min antes', '30 min antes', '1 hora antes', 'Ese día a las 9:00', 'El día antes a las 20:00'];
const MIN_AVISO = { 'A la hora': 0, '10 min antes': 10, '30 min antes': 30, '1 hora antes': 60 };

// Cuándo toca avisar (Date) o null si no se puede (p. ej. «10 min antes» sin hora)
function momentoAviso(fecha, hora, aviso) {
  if (!fecha || !aviso) return null;
  const [a, m, d] = fecha.split('-').map(Number);
  if (aviso === 'Ese día a las 9:00') return new Date(a, m - 1, d, 9, 0);
  if (aviso === 'El día antes a las 20:00') return new Date(a, m - 1, d - 1, 20, 0);
  if (!/^\d{1,2}:\d{2}/.test(hora || '') || !(aviso in MIN_AVISO)) return null;
  const [h, mi] = hora.split(':').map(Number);
  return new Date(a, m - 1, d, h, mi - MIN_AVISO[aviso]);
}
function porAvisar() {
  const out = [];
  D.tareas.forEach(t => {
    if (!t.aviso || esHecho(t.estado) || esAnulada(t.estado)) return;
    const cuando = momentoAviso(t.fecha, t.hora, t.aviso);
    if (cuando) out.push({ clave: `t:${t.id}:${t.fecha}:${t.hora || ''}:${t.aviso}`, cuando, titulo: t.tarea, cuerpo: `${t.hora ? t.hora + ' · ' : ''}${catDe(t.cat).e} ${catDe(t.cat).n}`, vista: 'tareas' });
  });
  const ev = D.ajustes.avisoEventos;
  if (ev) D.eventos.forEach(e => {
    if (e.tipo === 'Recurrente' || e.mantener === 'No' || esHecho(e.estado || '')) return;
    const cuando = momentoAviso(e.fecha, e.hora, ev);
    if (cuando) out.push({ clave: `e:${e.id}:${e.fecha}:${e.hora || ''}:${ev}`, cuando, titulo: e.titulo, cuerpo: `${e.hora ? e.hora + ' · ' : ''}${e.cal || 'Evento'}`, vista: 'eventos' });
  });
  (D.candidaturas || []).forEach(c => {
    if (!c.seguimiento || /Descartada|Oferta/.test(c.estado || '')) return;
    const cuando = momentoAviso(c.seguimiento, '', 'Ese día a las 9:00');
    if (cuando) out.push({ clave: `c:${c.id}:${c.seguimiento}`, cuando, titulo: `Preguntar por tu candidatura en ${c.empresa}`, cuerpo: c.puesto || '', vista: 'empleo' });
  });
  return out;
}
const leerAvisados = () => { try { return JSON.parse(localStorage.getItem('planner:avisados') || '{}'); } catch (e) { return {}; } };
const guardarAvisados = (o) => { try { localStorage.setItem('planner:avisados', JSON.stringify(o)); } catch (e) { /* sin almacenamiento */ } };

async function notificar({ titulo, cuerpo, clave, vista }) {
  aviso(`🔔 ${titulo}${cuerpo ? ' · ' + cuerpo : ''}`, { t: 'Ver', fn: () => irA(vista) });
  if (!D.ajustes.avisos || !('Notification' in window) || Notification.permission !== 'granted') return;
  const op = { body: cuerpo, icon: 'iconos/192.png', badge: 'iconos/48.png', tag: clave, data: { vista } };
  try {
    const reg = navigator.serviceWorker && await navigator.serviceWorker.getRegistration();
    if (reg) await reg.showNotification(titulo, op); else new Notification(titulo, op);
  } catch (e) { try { new Notification(titulo, op); } catch (e2) { /* nada */ } }
}
// Revisa cada 30 s; avisa de lo que toque desde hace menos de 6 horas
function revisarAvisos() {
  if (!D) return;
  const ahora = Date.now(), hechos = leerAvisados();
  let cambiado = false;
  porAvisar().forEach(x => {
    const t = x.cuando.getTime();
    if (t > ahora || ahora - t > 6 * 3600e3 || hechos[x.clave]) return;
    hechos[x.clave] = ahora; cambiado = true; notificar(x);
  });
  Object.keys(hechos).forEach(k => { if (ahora - hechos[k] > 14 * 864e5) { delete hechos[k]; cambiado = true; } });
  if (cambiado) guardarAvisados(hechos);
}
function arrancarAvisos() {
  // Lo que ya pasó al instalar esto no se avisa de golpe
  if (!localStorage.getItem('planner:avisados')) { const h = {}; const ahora = Date.now(); porAvisar().forEach(x => { if (x.cuando.getTime() <= ahora) h[x.clave] = ahora; }); guardarAvisados(h); }
  revisarAvisos();
  setInterval(revisarAvisos, 30e3);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) revisarAvisos(); });
  if (navigator.serviceWorker) navigator.serviceWorker.addEventListener('message', (e) => { if (e.data && e.data.vista && VISTAS[e.data.vista]) irA(e.data.vista); });
}
async function activarAvisos() {
  if (!('Notification' in window)) { aviso('Este navegador no permite avisos'); return false; }
  const p = await Notification.requestPermission();
  if (p !== 'granted') { aviso('No has dado permiso. Puedes darlo en los ajustes del navegador para esta página.'); return false; }
  D.ajustes.avisos = true; cambio();
  notificar({ titulo: 'Avisos activados', cuerpo: 'Así te llegarán los avisos del Planner', clave: 'prueba', vista: 'ajustes' });
  return true;
}
function tarjetaAvisos() {
  const A = D.ajustes, soporte = 'Notification' in window, perm = soporte ? Notification.permission : 'no';
  const activos = A.avisos && perm === 'granted';
  return `<section class="tarjeta"><h2>🔔 Avisos</h2>
    <p class="suave" style="margin-top:0">En cada tarea eliges <b>Avisarme</b> (a la hora, 10 min antes…). Te llega una notificación si el Planner está abierto o instalado en el móvil o el ordenador. Si la app está cerrada del todo no puede avisarte: para citas importantes, guárdalas también en Google Calendar.</p>
    <p>${!soporte ? '⚠️ Este navegador no permite notificaciones.' : activos ? '✅ Avisos activados en este aparato.' : perm === 'denied' ? '⛔ Has bloqueado los avisos para esta página: actívalos desde el candado de la barra de direcciones.' : 'Los avisos están apagados en este aparato.'}</p>
    <div class="fila-btns">${soporte && !activos && perm !== 'denied' ? '<button class="btn prim" id="av-activar">Activar avisos</button>' : ''}${activos ? '<button class="btn" id="av-probar">Probar</button><button class="btn" id="av-apagar">Apagar</button>' : ''}</div>
    <label class="campo"><span>Avisar también de los eventos con hora</span><select id="av-ev"><option value="">No</option>${['A la hora', '10 min antes', '30 min antes', '1 hora antes', 'El día antes a las 20:00'].map(o => `<option${o === A.avisoEventos ? ' selected' : ''}>${o}</option>`).join('')}</select></label>
  </section>`;
}
function enlazarTarjetaAvisos(cont) {
  const b = (id, fn) => { const x = $(id, cont); if (x) x.onclick = fn; };
  b('#av-activar', async () => { await activarAvisos(); pintar(); });
  b('#av-probar', () => notificar({ titulo: 'Prueba de aviso', cuerpo: 'Si ves esto, los avisos funcionan', clave: 'prueba-' + Date.now(), vista: 'ajustes' }));
  b('#av-apagar', () => { D.ajustes.avisos = false; cambio(); });
  const s = $('#av-ev', cont); if (s) s.onchange = (e) => { D.ajustes.avisoEventos = e.target.value; cambio(false); };
}
