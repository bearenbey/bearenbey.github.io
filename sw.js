/* iSwitch service worker: network first, cache as offline fallback.
   Always tries the network, so a push to GitHub shows up on the next load. */
const CACHE = 'iswitch-v1';
const SHELL = ['./', 'index.html', 'css/style.css', 'js/app.js', 'data/games.json', 'manifest.webmanifest', 'img/icon-192.png'];
const SCOPE = new URL('./', self.location).pathname;

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    for (const key of await caches.keys()) if (key !== CACHE) await caches.delete(key);
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', e => {
  const req = e.request;
  const url = new URL(req.url);
  // Only this site's own files; covers from Wikipedia etc. go straight to the network.
  if (req.method !== 'GET' || url.origin !== self.location.origin || !url.pathname.startsWith(SCOPE)) return;
  e.respondWith((async () => {
    try {
      const res = await fetch(req);
      if (res.ok) {
        const copy = res.clone();
        e.waitUntil(caches.open(CACHE).then(c => c.put(url.pathname === SCOPE ? 'index.html' : req, copy)));
      }
      return res;
    } catch (err) {
      const hit = await caches.match(req, { ignoreSearch: true });
      if (hit) return hit;
      if (req.mode === 'navigate' && (url.pathname === SCOPE || url.pathname === `${SCOPE}index.html`)) {
        return (await caches.match('index.html')) || Response.error();
      }
      return Response.error();
    }
  })());
});
