const CACHE = 'ml2-v3';
const CACHE_ASSETS = ['icon-192.png', 'icon-512.png', 'manifest.json'];

self.addEventListener('install', e=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CACHE_ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e=>{
  e.waitUntil(caches.keys().then(keys=>
    Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))
  ));
  self.clients.claim();
});

self.addEventListener('fetch', e=>{
  if(e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  
  // index.html — NUNCA cachear, siempre red
  if(url.pathname.endsWith('/') || url.pathname.endsWith('index.html')){
    e.respondWith(
      fetch(e.request, {cache: 'no-store'}).catch(()=>caches.match(e.request))
    );
    return;
  }
  
  // Iconos y manifest — cachear
  if(CACHE_ASSETS.some(a=>url.pathname.endsWith(a))){
    e.respondWith(
      caches.match(e.request).then(cached=>cached||fetch(e.request))
    );
    return;
  }
  
  // Todo lo demás — siempre red
  e.respondWith(fetch(e.request).catch(()=>caches.match(e.request)));
});

// ── Notificaciones Push ──
self.addEventListener('push', e=>{
  if(!e.data) return;
  const data = e.data.json();
  const options = {
    body: data.body || '',
    icon: 'icon-192.png',
    badge: 'icon-192.png',
    vibrate: [200, 100, 200],
    data: data,
    actions: [{ action: 'abrir', title: '👁 Ver' }]
  };
  e.waitUntil(
    self.registration.showNotification(data.title || 'ML2', options)
  );
});

self.addEventListener('notificationclick', e=>{
  e.notification.close();
  e.waitUntil(
    clients.matchAll({type:'window'}).then(list=>{
      for(const client of list){
        if(client.url.includes('PREVISION') && 'focus' in client)
          return client.focus();
      }
      if(clients.openWindow)
        return clients.openWindow('https://jamaloufari1-creator.github.io/PREVISION/');
    })
  );
});
