// sw.js — caching removed. Caching was a PWA offline cache that precached the
// whole app shell; it kept serving stale code until the cache name changed.
// This file is now a one-shot kill switch: any browser that still has the old
// worker registered will fetch this, wipe all caches, unregister itself, and
// reload so the app always loads the latest code straight from the network.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => caches.delete(k)));
    await self.registration.unregister();
    const clients = await self.clients.matchAll({ type: "window" });
    clients.forEach((c) => c.navigate(c.url));
  })());
});
