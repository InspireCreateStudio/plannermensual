// Planner — funciona sin conexión.
// Sirve los archivos guardados y, si hay internet, se trae la versión nueva para la próxima vez.
const VERSION = 'planner-v39';
const ARCHIVOS = ['./', './index.html', './apps.js', './app.css', './base.js', './datos.js', './avisos.js', './editor.js', './v-inicio.js', './v-tareas.js', './v-rapida.js', './v-calendario.js',
  './v-descarga.js', './v-objetivos.js', './v-redes.js', './v-casa.js', './v-casa-gastos.js', './v-eventos.js', './v-turnos.js', './v-habitos.js', './v-empleo.js', './v-ayuntamiento.js', './v-trabajos.js', './v-ajustes.js', './copia-drive.js', './google.js', './perfil.js', './arranque.js',
  './manifest.webmanifest', './iconos/32.png', './iconos/180.png', './iconos/192.png', './iconos/512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(ARCHIVOS.map(u => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('planner-') && k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  e.respondWith(caches.open(VERSION).then(async (c) => {
    const guardada = await c.match(e.request, { ignoreSearch: true });
    const red = fetch(e.request, { cache: 'no-cache' }).then(r => { if (r && r.ok) c.put(e.request, r.clone()); return r; }).catch(() => null);
    return guardada || (await red) || c.match('./index.html');
  }));
});

// Al tocar un aviso: abre (o enfoca) el Planner en su sección
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const vista = (e.notification.data || {}).vista || 'inicio';
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(cs => {
    const c = cs.find(x => x.url.startsWith(self.registration.scope));
    if (c) { c.postMessage({ vista }); return c.focus(); }
    return self.clients.openWindow('./#' + vista);
  }));
});
