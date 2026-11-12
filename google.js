'use strict';
// =====================================================================
//  Planner — Google: sincronizar con Google Drive (móvil y ordenador
//  iguales) y traer eventos y turnos de Google Calendar.
//  Todo se guarda en «planner.json», en la carpeta privada de la app en
//  tu Drive (no se ve entre tus archivos). El ID de cliente puede ser el
//  mismo que el de Novelia Studio: las dos apps viven en la misma web.
// =====================================================================

const GOOGLE_CLIENT_ID = ''; // se puede dejar fijo aquí; si no, se pega en Ajustes
const SCOPES = 'https://www.googleapis.com/auth/drive.appdata https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/calendar.events';
const ARCHIVO = 'planner.json';

const GG = {
  e: (() => { try { return JSON.parse(localStorage.getItem('planner:google')) || {}; } catch (e) { return {}; } })(),
  guardarE() { try { localStorage.setItem('planner:google', JSON.stringify(this.e)); } catch (e) {} },
  get clientId() { return GOOGLE_CLIENT_ID || this.e.clientId || ''; },
  token: null, caduca: 0, ocupado: false, aplicando: false,
  listo() { return !!(this.e.conectado && this.clientId); },
};
if (!GG.e.disp) { GG.e.disp = uid(); GG.guardarE(); }
try { const t = JSON.parse(localStorage.getItem('planner:token')); if (t && t.caduca > Date.now() + 60000) { GG.token = t.token; GG.caduca = t.caduca; } } catch (e) {}

// ---------- permiso de Google ----------
function cargarGIS() {
  if (window.google && google.accounts && google.accounts.oauth2) return Promise.resolve();
  return new Promise((res, rej) => { const s = el('script', { src: 'https://accounts.google.com/gsi/client', async: true }); s.onload = res; s.onerror = () => rej(new Error('sin conexión')); document.head.append(s); });
}
let clienteToken = null, esperandoToken = null;
async function pedirToken(interactivo) {
  if (GG.token && GG.caduca > Date.now() + 60000) return GG.token;
  if (!GG.clientId) throw new Error('falta-id');
  await cargarGIS();
  if (!clienteToken) clienteToken = google.accounts.oauth2.initTokenClient({
    client_id: GG.clientId, scope: SCOPES,
    callback: (r) => { const w = esperandoToken; esperandoToken = null; if (!w) return; if (r.error) w.rej(new Error(r.error)); else { GG.token = r.access_token; GG.caduca = Date.now() + (r.expires_in || 3600) * 1000; GG.calendario = google.accounts.oauth2.hasGrantedAllScopes(r, 'https://www.googleapis.com/auth/calendar.readonly'); try { localStorage.setItem('planner:token', JSON.stringify({ token: GG.token, caduca: GG.caduca })); } catch (e) {} w.res(GG.token); } },
    error_callback: (e) => { const w = esperandoToken; esperandoToken = null; if (w) w.rej(new Error((e && e.type) || 'cancelado')); },
  });
  return new Promise((res, rej) => { esperandoToken = { res, rej }; clienteToken.requestAccessToken({ prompt: interactivo ? 'consent' : '' }); });
}
async function api(url, opts = {}) {
  const t = await pedirToken(false);
  const r = await fetch(url, { ...opts, headers: { Authorization: 'Bearer ' + t, ...(opts.headers || {}) } });
  if (r.status === 401) { GG.token = null; localStorage.removeItem('planner:token'); throw new Error('token'); }
  if (!r.ok) {
    let detalle = ''; try { const j = await r.clone().json(); detalle = (j.error && (j.error.message || j.error.status)) || ''; } catch (e) {}
    const err = new Error(r.status === 403 ? 'permiso' : 'google ' + r.status); err.detalle = `${r.status}${detalle ? ' · ' + detalle : ''}`; throw err;
  }
  return r;
}
const hayToken = () => GG.token && GG.caduca > Date.now() + 30000;

// ---------- Drive ----------
const huella = (v) => { const s = JSON.stringify(v); let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36) + s.length.toString(36); };
const sinMarca = () => { const c = { ...D }; delete c.cambiado; return c; };
async function archivoRemoto() {
  const r = await api(`https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=name%3D'${ARCHIVO}'&fields=files(id,modifiedTime,appProperties)&orderBy=modifiedTime%20desc`);
  const j = await r.json(); return (j.files || [])[0] || null;
}
async function subir(remoto) {
  await guardarYa();
  const fecha = new Date().toISOString();
  const cuerpo = JSON.stringify({ app: 'planner', tipo: 'sincro', version: 1, fecha, disp: GG.e.disp, datos: D });
  const props = { fecha, disp: GG.e.disp };
  const lim = 'planner' + uid();
  const meta = remoto ? { appProperties: props } : { name: ARCHIVO, parents: ['appDataFolder'], appProperties: props };
  const multi = `--${lim}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(meta)}\r\n--${lim}\r\nContent-Type: application/json\r\n\r\n${cuerpo}\r\n--${lim}--`;
  await api(remoto ? `https://www.googleapis.com/upload/drive/v3/files/${remoto.id}?uploadType=multipart` : 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
    { method: remoto ? 'PATCH' : 'POST', headers: { 'Content-Type': `multipart/related; boundary=${lim}` }, body: multi });
  GG.e.base = fecha; GG.e.sucio = 0; GG.e.ultima = Date.now(); GG.e.huella = huella(sinMarca()); GG.guardarE();
}
async function traerRemoto(remoto) {
  const r = await api(`https://www.googleapis.com/drive/v3/files/${remoto.id}?alt=media`);
  const j = await r.json();
  if (!j || !j.datos) throw new Error('archivo');
  // Si mientras se descargaba has cambiado algo aquí, no lo piso: pregunto
  if (GG.e.sucio) { GG.e.sucio = GG.e.sucio || Date.now(); GG.guardarE(); GG.ocupado = false; return conflicto(remoto); }
  GG.aplicando = true;
  D = completar(j.datos);
  await Store.set('datos', D);
  GG.aplicando = false;
  GG.e.base = j.fecha; GG.e.sucio = 0; GG.e.ultima = Date.now(); GG.e.huella = huella(sinMarca()); GG.guardarE();
  aplicarTema(); pintar();
}
async function sincronizar(manual) {
  if (!GG.listo() || GG.ocupado || !navigator.onLine || $('#sc-este')) return;
  if (!hayToken() && !manual) { estadoSincro('Toca para conectar'); return; }
  GG.ocupado = true; estadoSincro('Sincronizando…');
  try {
    const remoto = await archivoRemoto();
    const fechaR = remoto && remoto.appProperties && remoto.appProperties.fecha;
    const otro = remoto && fechaR !== GG.e.base;
    if (!remoto) await subir(null);
    else if (otro && !GG.e.sucio) { estadoSincro('Trayendo cambios…'); await traerRemoto(remoto); aviso('Traído lo último de Google Drive'); }
    else if (otro && GG.e.sucio) { GG.ocupado = false; estadoSincro('Hay cambios en los dos sitios'); return conflicto(remoto); }
    else if (GG.e.sucio) await subir(remoto);
    estadoSincro('');
    if (manual) aviso('Sincronizado con Google Drive');
  } catch (e) {
    const m = e.message;
    estadoSincro(m === 'falta-id' ? 'Falta configurar' : /token|popup|cancel|access_denied|interaction/.test(m) ? 'Toca para conectar' : !navigator.onLine ? 'Sin conexión' : 'No se ha podido');
    if (manual) aviso(m === 'falta-id' ? 'Falta el ID de cliente de Google (Ajustes)' : 'No he podido sincronizar: ' + motivoGoogle(e));
  } finally { GG.ocupado = false; }
}
function conflicto(remoto) {
  const f = new Date(remoto.appProperties.fecha).toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' });
  modal(`<h3>Hay cambios en los dos sitios</h3><p class="suave">Has cambiado cosas aquí y en otro aparato (el ${esc(f)}). No puedo juntarlas, así que dime con cuál me quedo. La otra te la descargo como copia, para que no pierdas nada.</p>
    <div class="pie" style="flex-wrap:wrap"><button class="btn" data-cerrar>Ahora no</button><button class="btn" id="sc-otro">Lo del otro aparato</button><button class="btn prim" id="sc-este">Lo de este aparato</button></div>`, {
    alAbrir: (m, cerrar) => {
      $('#sc-este', m).onclick = async () => { cerrar(); try { GG.ocupado = true; const r = await api(`https://www.googleapis.com/drive/v3/files/${remoto.id}?alt=media`); descargar(await r.blob(), `Planner · lo del otro aparato ${hoy()}.json`); await subir(remoto); aviso('Guardado lo de este aparato'); } catch (e) { console.error(e); aviso('No he podido subirlo: ' + motivoGoogle(e)); } finally { GG.ocupado = false; estadoSincro(''); } };
      $('#sc-otro', m).onclick = async () => { cerrar(); try { await hacerCopia('lo de este aparato'); await traerRemoto(remoto); aviso('Traído lo del otro aparato'); } catch (e) { console.error(e); aviso('No he podido traerlo: ' + motivoGoogle(e)); } };
    }
  });
}
const subirPronto = debounce(() => { if (GG.listo() && hayToken()) sincronizar(); }, 20000);
alGuardar.push(() => {
  if (GG.aplicando || !GG.e.conectado) return;
  const h = huella(sinMarca());
  if (h !== GG.e.huella) { if (!GG.e.sucio) { GG.e.sucio = Date.now(); GG.guardarE(); } estadoSincro(''); subirPronto(); }
});
async function conectar() {
  try { await pedirToken(!GG.e.conectado); GG.e.conectado = true; GG.guardarE(); await sincronizar(true); }
  catch (e) { aviso(e.message === 'falta-id' ? 'Falta el ID de cliente de Google: míralo en Ajustes' : 'No se ha conectado con Google'); estadoSincro(e.message === 'falta-id' ? 'Falta configurar' : 'Toca para conectar'); }
}
function estadoSincro(t) {
  let b = $('#sincro-pill');
  if (!GG.e.conectado) { if (b) b.remove(); return; }
  if (!b) { b = el('button', { id: 'sincro-pill', class: 'sincro-pill', title: 'Sincronizar con Google Drive', onclick: () => conectar() }); document.body.append(b); }
  const hace = GG.e.ultima ? Math.round((Date.now() - GG.e.ultima) / 60000) : null;
  b.textContent = t || (GG.e.sucio ? '☁ Cambios sin subir' : hace === null ? '☁ Drive' : `☁ Al día${hace < 1 ? '' : hace < 60 ? ` · hace ${hace} min` : ''}`);
  b.classList.toggle('alerta', /conectar|configurar|podido|dos sitios/.test(t));
  b.classList.toggle('girando', /…$/.test(t));
}

// ---------- Google Calendar ----------
const GCAL = 'https://www.googleapis.com/calendar/v3';
const cfgCal = () => D.ajustes.gcal || (D.ajustes.gcal = { cals: [], meses: 6 });
async function listarCalendarios() {
  const r = await api(`${GCAL}/users/me/calendarList?minAccessRole=reader&maxResults=250`);
  return ((await r.json()).items || []).map(c => ({ id: c.id, nombre: c.summaryOverride || c.summary, color: c.backgroundColor, escribir: c.accessRole === 'owner' || c.accessRole === 'writer', principal: !!c.primary }));
}
async function eventosDe(calId, desde, hasta) {
  let out = [], pt = '';
  do {
    const r = await api(`${GCAL}/calendars/${encodeURIComponent(calId)}/events?singleEvents=true&orderBy=startTime&maxResults=2500&timeMin=${encodeURIComponent(new Date(desde + 'T00:00:00').toISOString())}&timeMax=${encodeURIComponent(new Date(hasta + 'T23:59:59').toISOString())}${pt ? '&pageToken=' + pt : ''}`);
    const j = await r.json(); out = out.concat(j.items || []); pt = j.nextPageToken || '';
  } while (pt);
  return out.filter(e => e.status !== 'cancelled');
}
// Fecha y hora de un evento en tu hora local
function cuandoEs(ev) {
  if (ev.start.date) {
    const fin = sumarDias(ev.end.date, -1);
    return { fecha: ev.start.date, hasta: fin > ev.start.date ? fin : '', hora: 'Todo el día', ini: '', finH: '' };
  }
  const a = new Date(ev.start.dateTime), b = new Date(ev.end.dateTime);
  const hm = (d) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  return { fecha: aStr(a), hasta: aStr(b) > aStr(a) ? aStr(b) : '', hora: hm(a), ini: hm(a), finH: hm(b) };
}
const normal = (s) => quitarTildes(String(s || '').replace(/[^\p{L}\p{N} ]/gu, ' ')).replace(/\s+/g, ' ').trim();

GG.traerEventos = async (manual) => {
  const C = cfgCal();
  const elegidos = C.cals.filter(c => c.usar);
  if (!elegidos.length) { if (manual) elegirCalendarios(); return; }
  if (!hayToken() && !manual) return;
  const desde = sumarDias(hoy(), -14), hasta = sumarDias(hoy(), 31 * (C.meses || 6));
  try {
    if (manual) aviso('Trayendo de Google Calendar…');
    let nuevos = 0, cambiados = 0, quitados = 0;
    for (const c of elegidos) {
      const evs = await eventosDe(c.id, desde, hasta);
      const vistos = new Set();
      const recur = new Map();
      evs.forEach(ev => {
        if (ev.recurringEventId) { if (!recur.has(ev.recurringEventId)) recur.set(ev.recurringEventId, []); recur.get(ev.recurringEventId).push(ev); return; }
        const q = cuandoEs(ev);
        const gid = 'g:' + ev.id;
        vistos.add(gid);
        let e = D.eventos.find(x => x.gcalId === gid);
        // Uno igual que vino del Excel: se enlaza en vez de duplicarlo
        if (!e) e = D.eventos.find(x => !x.gcalId && x.fecha === q.fecha && normal(x.titulo) === normal(ev.summary));
        if (!e) { D.eventos.push({ id: uid(), gcalId: gid, gcalCal: c.id, cal: c.local, titulo: ev.summary || '(sin título)', tipo: 'Puntual', fecha: q.fecha, hasta: q.hasta || undefined, hora: q.hora, notas: '', mantener: 'Sí', estado: '' }); nuevos++; return; }
        e.gcalId = gid; e.gcalCal = c.id;
        if (!e.tocado) {
          const antes = JSON.stringify([e.fecha, e.hora, e.titulo, e.hasta]);
          Object.assign(e, { fecha: q.fecha, hora: q.hora, cal: c.local });
          if (normal(e.titulo) !== normal(ev.summary)) e.titulo = ev.summary || e.titulo;
          if (q.hasta) e.hasta = q.hasta; else delete e.hasta;
          if (antes !== JSON.stringify([e.fecha, e.hora, e.titulo, e.hasta])) cambiados++;
        }
      });
      // Las repeticiones (extraescolares, rutinas): una sola fila «Recurrente»
      recur.forEach((lista, rid) => {
        const gid = 'gr:' + rid; vistos.add(gid);
        const dias = [...new Set(lista.map(ev => diaSemana(cuandoEs(ev).fecha)))].sort();
        const q = cuandoEs(lista[0]);
        const patron = `${dias.map(d => may(DIAS[d])).join(dias.length > 1 ? ', ' : '').replace(/, ([^,]+)$/, ' y $1')}${q.ini ? ' ' + q.ini : ''}`;
        const ultima = cuandoEs(lista[lista.length - 1]).fecha;
        let e = D.eventos.find(x => x.gcalId === gid) || D.eventos.find(x => !x.gcalId && x.tipo === 'Recurrente' && normal(x.titulo) === normal(lista[0].summary));
        if (!e) { D.eventos.push({ id: uid(), gcalId: gid, cal: c.local, titulo: lista[0].summary || '(sin título)', tipo: 'Recurrente', hora: patron, notas: `Hasta el ${fechaDM(ultima)}.`, mantener: 'Sí' }); nuevos++; return; }
        e.gcalId = gid;
        if (!e.tocado) { e.hora = patron; e.notas = `Hasta el ${fechaDM(ultima)}.`; e.cal = c.local; }
      });
      // Lo que ya no está en Google (y no has tocado aquí) se quita
      D.eventos = D.eventos.filter(e => {
        if (!e.gcalId || e.cal !== c.local || vistos.has(e.gcalId) || e.tocado) return true;
        if (e.tipo !== 'Recurrente' && (e.fecha < desde || e.fecha > hasta)) return true;
        quitados++; return false;
      });
      if (!D.calendarios.some(x => x.nombre === c.local)) D.calendarios.push({ nombre: c.local, punto: '⚪' });
    }
    C.ultima = Date.now();
    cambio();
    if (manual || nuevos || cambiados || quitados) aviso(nuevos || cambiados || quitados ? `Google Calendar: ${[nuevos && plural(nuevos, 'nuevo', 'nuevos'), cambiados && plural(cambiados, 'cambiado', 'cambiados'), quitados && plural(quitados, 'quitado', 'quitados')].filter(Boolean).join(', ')}` : 'Google Calendar: todo al día');
  } catch (e) {
    if (manual) aviso(e.message === 'permiso' ? 'Google no me deja leer el calendario: vuelve a conectar y acepta el permiso del calendario' : e.message === 'falta-id' ? 'Falta configurar Google (Ajustes)' : 'No he podido leer Google Calendar');
  }
};

GG.traerTurnos = async (ym) => {
  const C = cfgCal();
  if (!C.turnos && !C.extra) { elegirCalendarios(); return; }
  const desde = primeroMes(ym), hasta = `${ym}-${pad(diasDelMes(ym))}`;
  try {
    const R = D.dispo;
    if (C.turnos) {
      const evs = await eventosDe(C.turnos, desde, hasta);
      evs.forEach(ev => {
        const s = quitarTildes(ev.summary || '');
        const t = /manana/.test(s) ? 'MAÑANA' : /tarde/.test(s) ? 'TARDE' : /noche/.test(s) ? 'NOCHE' : '';
        if (!t) return;
        const q = cuandoEs(ev);
        for (let f = q.fecha; f <= (q.hasta || q.fecha) && f <= hasta; f = sumarDias(f, 1)) {
          if (f < desde || diaSemana(f) >= 5) continue;
          (R.dias[f] = R.dias[f] || {}).turno = t;
        }
      });
    }
    if (C.extra) {
      const evs = await eventosDe(C.extra, desde, hasta);
      const porDia = {};
      evs.forEach(ev => { const q = cuandoEs(ev); (porDia[q.fecha] = porDia[q.fecha] || []).push(`${ev.summary}${q.ini ? ` ${q.ini}-${q.finH}` : ''}`); });
      for (let f = desde; f <= hasta; f = sumarDias(f, 1)) {
        const d = R.dias[f] || (R.dias[f] = {});
        d.extra = (porDia[f] || []).join('; ');
        if (!d.extra && diaSemana(f) >= 5) delete d.extra;
        if (!Object.keys(d).length) delete R.dias[f];
      }
    }
    cambio(); aviso(`Turnos de ${nombreMes(ym)} traídos de Google Calendar`);
  } catch (e) { aviso(e.message === 'permiso' ? 'Falta el permiso del calendario: vuelve a conectar Google' : 'No he podido leer Google Calendar'); }
};

async function elegirCalendarios() {
  let lista;
  try { lista = await listarCalendarios(); } catch (e) { aviso(e.message === 'permiso' ? 'Falta el permiso del calendario: vuelve a conectar Google' : 'No he podido ver tus calendarios de Google'); return; }
  const C = cfgCal();
  const locales = D.calendarios.map(c => c.nombre);
  const sugerir = (n) => { const s = normal(n); return locales.find(l => normal(l) === s) || locales.find(l => s.includes(normal(l)) || normal(l).includes(s)) || n.toUpperCase(); };
  modal(`<h3>Calendarios de Google</h3><p class="suave">Marca los que quieres traer a <b>Eventos</b> y con qué nombre. Y dime cuál tiene los turnos de tu pareja y cuál las extraescolares, para rellenar <b>Turnos</b>.</p>
    <div class="gcals">${lista.map((g, i) => { const ya = C.cals.find(c => c.id === g.id); return `<div class="gcal" data-i="${i}"><label class="check-peq"><input type="checkbox" data-usar${ya ? (ya.usar ? ' checked' : '') : ''}> <i style="background:${esc(g.color || '#999')}"></i> ${esc(g.nombre)}</label>
      <input data-local value="${esc(ya ? ya.local : sugerir(g.nombre))}" list="gc-locales" aria-label="Nombre aquí"></div>`; }).join('')}</div>
    <datalist id="gc-locales">${locales.map(l => `<option value="${esc(l)}">`).join('')}</datalist>
    <div class="form"><label class="campo medio"><span>Turnos de tu pareja</span><select id="gc-turnos"><option value="">Ninguno</option>${lista.map(g => `<option value="${esc(g.id)}"${C.turnos === g.id ? ' selected' : ''}>${esc(g.nombre)}</option>`).join('')}</select></label>
      <label class="campo medio"><span>Extraescolares</span><select id="gc-extra"><option value="">Ninguno</option>${lista.map(g => `<option value="${esc(g.id)}"${C.extra === g.id ? ' selected' : ''}>${esc(g.nombre)}</option>`).join('')}</select></label>
      <label class="campo medio"><span>Guardar en Google las citas que apunte aquí, en</span><select id="gc-destino"><option value="">No guardar en Google</option>${lista.filter(g => g.escribir).map(g => `<option value="${esc(g.id)}"${C.destino === g.id ? ' selected' : ''}>${esc(g.nombre)}</option>`).join('')}</select></label>
      <label class="campo medio"><span>Traer eventos de los próximos</span><select id="gc-meses">${[3, 6, 9, 12].map(n => `<option value="${n}"${(C.meses || 6) === n ? ' selected' : ''}>${n} meses</option>`).join('')}</select></label></div>
    <div class="pie"><button class="btn" data-cerrar>Cancelar</button><button class="btn prim" id="gc-ok">Guardar y traer</button></div>`, {
    clase: 'ancha',
    alAbrir: (m, cerrar) => {
      $('#gc-ok', m).onclick = () => {
        C.cals = $$('.gcal', m).map(n => { const g = lista[+n.dataset.i]; return { id: g.id, nombre: g.nombre, local: $('[data-local]', n).value.trim() || g.nombre.toUpperCase(), usar: $('[data-usar]', n).checked }; }).filter(c => c.usar || C.cals.some(x => x.id === c.id));
        C.turnos = $('#gc-turnos', m).value; C.extra = $('#gc-extra', m).value; C.destino = $('#gc-destino', m).value; C.meses = +$('#gc-meses', m).value;
        cambio(); cerrar(); GG.traerEventos(true);
      };
    }
  });
}

// ---------- guardar en Google Calendar lo que apuntas aquí ----------
const zonaHoraria = () => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Madrid'; } catch (e) { return 'Europe/Madrid'; } };
GG.puedeEscribir = () => GG.listo() && !!cfgCal().destino;
// Calendario de Google de un evento: el suyo si vino de allí; si no, el elegido para guardar
const calGoogleDe = (e) => e.gcalCal || ((cfgCal().cals || []).find(c => c.local === e.cal) || {}).id || cfgCal().destino;
function cuerpoGoogle(e) {
  const b = { summary: e.titulo, description: e.notas || '' };
  const m = /^(\d{1,2}):(\d{2})/.exec(e.hora || '');
  if (m && e.fecha) {
    const ini = `${e.fecha}T${pad(+m[1])}:${m[2]}:00`;
    const f = new Date(+e.fecha.slice(0, 4), +e.fecha.slice(5, 7) - 1, +e.fecha.slice(8, 10), +m[1] + 1, +m[2]);
    const fin = `${aStr(f)}T${pad(f.getHours())}:${pad(f.getMinutes())}:00`;
    b.start = { dateTime: ini, timeZone: zonaHoraria() }; b.end = { dateTime: fin, timeZone: zonaHoraria() };
  } else { b.start = { date: e.fecha }; b.end = { date: sumarDias(e.hasta && e.hasta > e.fecha ? e.hasta : e.fecha, 1) }; }
  return b;
}
GG.guardarEvento = async (e) => {
  if (!e.fecha || e.tipo === 'Recurrente') { aviso('Solo puedo guardar en Google los eventos con fecha (no los recurrentes)'); return false; }
  try {
    try { await pedirToken(false); } catch (x) { await pedirToken(true); }
    const cal = calGoogleDe(e);
    if (!cal) { aviso('Elige en Ajustes › Calendarios de Google dónde guardar las citas'); return false; }
    const id = /^g:/.test(e.gcalId || '') ? e.gcalId.slice(2) : '';
    const r = await api(`${GCAL}/calendars/${encodeURIComponent(cal)}/events${id ? '/' + encodeURIComponent(id) : ''}`, { method: id ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpoGoogle(e)) });
    const j = await r.json();
    const o = D.eventos.find(x => x.id === e.id) || e;
    o.gcalId = 'g:' + j.id; o.gcalCal = cal; delete o.tocado;
    cambio(false);
    aviso(id ? 'Cambiado también en Google Calendar' : 'Guardado también en Google Calendar');
    return true;
  } catch (x) {
    console.error(x);
    aviso(x.message === 'permiso' ? 'Google no me deja escribir en el calendario: en Ajustes, desconecta y vuelve a conectar Google aceptando todos los permisos' : 'No he podido guardarlo en Google Calendar: ' + motivoGoogle(x));
    return false;
  }
};
GG.borrarEvento = async (e) => {
  if (!/^g:/.test(e.gcalId || '')) return;
  try { await api(`${GCAL}/calendars/${encodeURIComponent(calGoogleDe(e))}/events/${encodeURIComponent(e.gcalId.slice(2))}`, { method: 'DELETE' }); aviso('Borrado también de Google Calendar'); }
  catch (x) { aviso('No he podido borrarlo de Google Calendar: ' + motivoGoogle(x)); }
};

// ---------- tarjeta en Ajustes ----------
function tarjetaGoogle() {
  const E = GG.e, C = (D.ajustes.gcal || {});
  return `<section class="tarjeta" id="aj-google"><h2>Google: móvil, ordenador y calendario</h2>
    ${E.conectado ? `<p style="margin-top:0">Conectada a Google.${E.ultima ? ` Última sincronización: ${new Date(E.ultima).toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' })}.` : ''}${E.sucio ? ' <b>Hay cambios sin subir.</b>' : ''}</p>
      <div class="fila-btns"><button class="btn prim" id="gg-ya">Sincronizar ahora</button><button class="btn" id="gg-cals">Calendarios de Google…</button><button class="btn" id="gg-off">Desconectar este aparato</button></div>
      <p class="tenue">${(C.cals || []).filter(c => c.usar).length ? `Trae a Eventos: ${C.cals.filter(c => c.usar).map(c => esc(c.nombre)).join(', ')}.` : 'Aún no has elegido qué calendarios traer.'}${C.destino ? ' Las citas que apuntes aquí se pueden guardar también en Google.' : ' Para guardar aquí citas que también salgan en Google, elige el calendario en «Calendarios de Google…».'}${C.ultima ? ` Última vez: ${new Date(C.ultima).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })}.` : ''}</p>`
    : `<p style="margin-top:0">Guarda tu planner en tu Google Drive para tenerlo igual en el móvil y en el ordenador, y trae solos los eventos y los turnos de Google Calendar.</p>
      <button class="btn prim" id="gg-on"${GG.clientId ? '' : ' disabled'}>Conectar con Google</button>`}
    <details style="margin-top:12px"${GG.clientId ? '' : ' open'}><summary class="suave" style="cursor:pointer">${GG.clientId ? 'Configuración de Google' : 'Antes de conectar: configurar Google (una sola vez)'}</summary>
      <p class="suave" style="font-size:13px">Si ya tienes un ID de cliente de Google para otra app en esta misma web, puedes usar el mismo: solo añade el paso 2.</p>
      <ol class="suave pasos-g">
        <li>Entra en <b>console.cloud.google.com</b> con tu cuenta y crea un proyecto (por ejemplo «Mis apps»).</li>
        <li>En «APIs y servicios» › «Biblioteca», habilita <b>Google Drive API</b> y <b>Google Calendar API</b>.</li>
        <li>En «Pantalla de consentimiento de OAuth»: tipo <b>Externo</b>, tu correo, y en «Usuarios de prueba» añade tu cuenta.</li>
        <li>En «Credenciales» › «Crear credenciales» › <b>ID de cliente de OAuth</b> › <b>Aplicación web</b>. En «Orígenes de JavaScript autorizados» pon <b>${esc(location.origin)}</b>.</li>
        <li>Copia el <b>ID de cliente</b> (acaba en .apps.googleusercontent.com) y pégalo aquí (o pásamelo y lo dejo puesto en la app).</li></ol>
      <label class="campo"><span>ID de cliente de Google</span><input id="gg-id" value="${esc(E.clientId || GOOGLE_CLIENT_ID)}" placeholder="123456-abc.apps.googleusercontent.com"${GOOGLE_CLIENT_ID ? ' disabled' : ''}></label>
      <p class="tenue" style="font-size:12px;margin:0">Google te dirá que la app «no está verificada»: es normal, es tu propia app. Pulsa «Continuar».</p></details></section>`;
}
function enlazarGoogle(cont) {
  const c = $('#aj-google', cont); if (!c) return;
  const rehacer = () => pintar();
  if ($('#gg-id', c)) $('#gg-id', c).onchange = (e) => { GG.e.clientId = e.target.value.trim(); clienteToken = null; GG.guardarE(); rehacer(); };
  if ($('#gg-on', c)) $('#gg-on', c).onclick = async () => {
    if (!(await preguntar('¿Conectar con Google?', 'Si en tu Drive ya hay un planner de otro aparato, me lo traigo y sustituye a lo que hay aquí (antes te descargo una copia). Si no hay nada, subo lo de este aparato.', 'Conectar'))) return;
    try {
      await pedirToken(true);
      const remoto = await archivoRemoto();
      GG.e.conectado = true;
      if (remoto) { await hacerCopia('antes de sincronizar'); GG.e.base = null; GG.e.sucio = 0; GG.guardarE(); await traerRemoto(remoto); aviso('Traído tu planner de Google Drive'); }
      else { GG.e.sucio = Date.now(); GG.guardarE(); await sincronizar(true); }
      rehacer();
      if (!(D.ajustes.gcal && D.ajustes.gcal.cals && D.ajustes.gcal.cals.length)) setTimeout(elegirCalendarios, 500);
    } catch (e) { aviso('No se ha conectado con Google'); }
  };
  if ($('#gg-ya', c)) $('#gg-ya', c).onclick = async () => { await conectar(); rehacer(); };
  if ($('#gg-cals', c)) $('#gg-cals', c).onclick = async () => { try { await pedirToken(false); } catch (e) { try { await pedirToken(true); } catch (e2) { return aviso('No se ha conectado con Google'); } } elegirCalendarios(); };
  if ($('#gg-off', c)) $('#gg-off', c).onclick = () => { GG.e.conectado = false; GG.token = null; localStorage.removeItem('planner:token'); GG.guardarE(); estadoSincro(''); rehacer(); aviso('Desconectado. Tus datos siguen aquí y en Drive.'); };
}

// ---------- arranque ----------
function arrancarGoogle() {
  if (!GG.e.conectado) return;
  estadoSincro('');
  const alDia = () => {
    sincronizar();
    const C = D.ajustes.gcal;
    if (C && C.cals && C.cals.some(c => c.usar) && Date.now() - (C.ultima || 0) > 6 * 3600000) GG.traerEventos(false);
  };
  if (hayToken()) alDia();
  else {
    estadoSincro('Toca para conectar');
    // Google necesita un toque para renovar el permiso: el primero que des en la app
    document.addEventListener('click', function uno() { document.removeEventListener('click', uno, true); pedirToken(false).then(alDia).catch(() => {}); }, true);
  }
  setInterval(() => { if (!document.hidden && hayToken()) sincronizar(); }, 120000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden && hayToken()) sincronizar(); else if (document.hidden && GG.e.sucio && hayToken()) sincronizar(); });
}

// Explicación de un error de Google en palabras normales
function motivoGoogle(e) {
  const m = (e && e.message) || '';
  if (m === 'falta-id') return 'falta el ID de cliente de Google (Ajustes)';
  if (m === 'token' || /popup|interaction|cancel/.test(m)) return 'Google necesita que vuelvas a conectar: pulsa «☁» arriba y acepta';
  if (/access_denied/.test(m)) return 'Google no ha dado permiso (¿has elegido la cuenta correcta y marcado la casilla de Drive?)';
  if (m === 'permiso') return `Google no deja usar Drive con este permiso: desconecta en Ajustes y vuelve a conectar marcando la casilla de Google Drive (${(e.detalle || '403')})`;
  if (!navigator.onLine) return 'no hay conexión';
  return (e && e.detalle) ? `Google respondió ${e.detalle}` : m || 'error desconocido';
}
