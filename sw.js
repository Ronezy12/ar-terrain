/* Service worker : l'appli s'ouvre et fonctionne sans réseau. */
var CACHE = 'ar-terrain-v37';
var SHELL = ['./', 'index.html', 'manifest.webmanifest', 'logo.png', 'lib/data.js', 'lib/icons.js', 'lib/pdf.js', 'vendor/jspdf.umd.min.js', 'vendor/three.min.js',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/maskable-512.png', 'icons/apple-touch-icon.png', 'icons/favicon-32.png'];
self.addEventListener('install', function (e) { e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(SHELL); }).then(function () { return self.skipWaiting(); })); });
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) { return Promise.all(ks.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); })); }).then(function () { return self.clients.claim(); }));
});
self.addEventListener('fetch', function (e) {
  var req = e.request; if (req.method !== 'GET') return;
  var url = new URL(req.url);
  // Page : réseau d'abord (pour avoir la dernière version), cache si pas de réseau
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req, { cache: 'no-store' }).then(function (r) { var cp = r.clone(); caches.open(CACHE).then(function (c) { c.put('index.html', cp); }); return r; }).catch(function () { return caches.match('index.html'); }));
    return;
  }
  // Fichiers de l'appli et polices : cache d'abord, mise à jour en arrière-plan
  if (url.pathname.slice(-12) === 'version.json') { e.respondWith(fetch(req, { cache: 'no-store' })); return; }
  if (url.origin === location.origin || /fonts\.(googleapis|gstatic)\.com$/.test(url.hostname)) {
    e.respondWith(caches.match(req).then(function (hit) {
      var net = fetch(req).then(function (r) { if (r && (r.ok || r.type === 'opaque')) { var cp = r.clone(); caches.open(CACHE).then(function (c) { c.put(req, cp); }); } return r; }).catch(function () { return hit; });
      return hit || net;
    }));
  }
});

/* Notifications en arrière-plan (Web Push) : le CRM envoie, le téléphone affiche même appli fermée */
self.addEventListener('push', function (e) {
  var d = {}; try { d = e.data ? e.data.json() : {}; } catch (err) { d = { body: e.data ? e.data.text() : '' }; }
  var title = d.title || 'Nouvelle intervention';
  var opts = { body: d.body || 'Ouvrez l\'appli pour voir le détail', icon: 'icons/icon-192.png', badge: 'icons/icon-192.png', tag: d.tag || (d.id_rdv ? 'rdv-' + d.id_rdv : 'ar-terrain'), renotify: true, data: { url: d.url || (d.id_rdv ? './?rdv=' + d.id_rdv : './'), id_rdv: d.id_rdv || null } };
  e.waitUntil(self.registration.showNotification(title, opts).then(function () {
    return self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (cs) { cs.forEach(function (c) { c.postMessage({ type: 'crm-refresh', id_rdv: d.id_rdv || null }); }); });
  }));
});
self.addEventListener('notificationclick', function (e) {
  e.notification.close();
  var data = e.notification.data || {}, url = new URL(data.url || './', self.registration.scope).href;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (cs) {
    for (var i = 0; i < cs.length; i++) { if (cs[i].url.indexOf(self.registration.scope) === 0) { cs[i].postMessage({ type: 'crm-refresh', id_rdv: data.id_rdv, open: true }); return cs[i].focus(); } }
    return self.clients.openWindow(url);
  }));
});
/* Android : relève périodique quand le système l'autorise */
self.addEventListener('periodicsync', function (e) {
  if (e.tag !== 'rdv-refresh') return;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (cs) { cs.forEach(function (c) { c.postMessage({ type: 'crm-refresh' }); }); }));
});
