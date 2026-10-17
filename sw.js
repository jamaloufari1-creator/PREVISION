importScripts("https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js");

const VERSION = '2.0';
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(
  caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k))))
));
self.addEventListener('fetch', e => e.respondWith(fetch(e.request)));

// Número sobre el icono de la app con la app cerrada: cada aviso que llega suma uno.
// La app, al abrirse, pone el número real de mensajes sin leer (_actualizarBadgeIconoApp).
self.addEventListener('push', e => {
  if (!('setAppBadge' in self.navigator)) return;
  e.waitUntil(caches.open('ml2-badge').then(async c => {
    const r = await c.match('/n');
    const n = (r ? parseInt(await r.text(), 10) || 0 : 0) + 1;
    await c.put('/n', new Response(String(n)));
    await self.navigator.setAppBadge(n);
  }).catch(() => {}));
});
