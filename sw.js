/* Shazim service worker — offline-first */
const V='shazim-v1';
const CORE=['./','./index.html','./manifest.json','./css/styles.css','./js/i18n.js','./js/store.js','./js/ui.js','./js/views-home.js','./js/views-scan.js','./js/views-stock.js','./js/views-log.js','./js/views-reports.js','./js/views-admin.js','./js/app.js','./icons/icon-192.png','./icons/icon-512.png','./data/articles.json'];
self.addEventListener('install',e=>{
  e.waitUntil(caches.open(V).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting()).catch(()=>self.skipWaiting()));
});
self.addEventListener('activate',e=>{
  e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==V).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET') return;
  e.respondWith(
    caches.match(e.request).then(hit=>{
      if(hit) return hit;
      return fetch(e.request).then(res=>{
        const cp=res.clone();
        caches.open(V).then(c=>c.put(e.request,cp)).catch(()=>{});
        return res;
      }).catch(()=>caches.match('./index.html'));
    })
  );
});
