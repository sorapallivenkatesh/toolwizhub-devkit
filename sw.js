// sw.js — DevKit service worker. Everything is tiny and client-side, so the
// whole app shell is precached for full offline use.
const CACHE = "devkit-v2";
const CORE = [
  "./", "index.html", "css/styles.css",
  "js/main.js", "js/util.js", "js/devutil.js",
  "js/tools-encode.js", "js/tools-tokens.js", "js/tools-time.js", "js/tools-text.js", "js/tools-convert.js",
  "manifest.webmanifest",
  "assets/logo-icon.webp", "assets/logo-full.webp", "assets/logo-horizontal.webp", "assets/favicon.webp",
];
self.addEventListener("install", (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE)).then(() => self.skipWaiting())); });
self.addEventListener("activate", (e) => { e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", (e) => {
  const { request } = e;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== location.origin) return;
  if (request.mode === "navigate") { e.respondWith(fetch(request).catch(() => caches.match("index.html"))); return; }
  e.respondWith(caches.match(request).then((cached) => {
    const network = fetch(request).then((res) => { if (res && res.status === 200) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(request, copy)); } return res; }).catch(() => cached);
    return cached || network;
  }));
});
