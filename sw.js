/* Southwark Heating app - service worker (v2026-10-14)
   ALWAYS loads the newest app from the internet when there is signal (network first),
   and only falls back to the saved copy when offline. Old saved copies are deleted. */
const CACHE = 'swh-app-2026-10-14';
self.addEventListener('install', e => { self.skipWaiting(); });
self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET') return;
  const u = new URL(r.url);
  if (u.origin !== location.origin) return;            // Supabase, Stripe, CDNs: never touched
  e.respondWith((async () => {
    try {
      const fresh = await fetch(r, { cache: 'no-store' });
      if (fresh && fresh.ok && (r.mode === 'navigate' || /\.(html|js|png|webmanifest|svg|jpg)$/.test(u.pathname) || u.pathname.endsWith('/'))) {
        const c = await caches.open(CACHE); c.put(r, fresh.clone());
      }
      return fresh;
    } catch (err) {
      const hit = await caches.match(r) || (r.mode === 'navigate' ? await caches.match('index.html') || await caches.match('./') : null);
      if (hit) return hit;
      throw err;
    }
  })());
});
