// Planner — funciona sin conexión.
// Sirve los archivos guardados y, si hay internet, se trae la versión nueva para la próxima vez.
const VERSION = 'planner-v11';
const ARCHIVOS = ['./', './index.html', './app.css', './base.js', './datos.js', './editor.js', './v-inicio.js', './v-tareas.js', './v-rapida.js', './v-calendario.js',
  './v-descarga.js', './v-objetivos.js', './v-redes.js', './v-casa.js', './v-eventos.js', './v-turnos.js', './v-ajustes.js', './google.js', './arranque.js',
  './manifest.webmanifest', './iconos/32.png', './iconos/180.png', './iconos/192.png', './iconos/512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(ARCHIVOS.map(u => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
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
