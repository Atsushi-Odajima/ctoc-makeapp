/* DayNet service worker.
 * Caches ONLY public static files (build assets, brand images, fonts) and offline.html.
 * Never caches: /api/* (including media tokens and DMs), HTML pages, post content,
 * cross-origin media. New versions wait until the user chooses to update.
 * Push notifications are not implemented; this worker never requests permission. */
const STATIC_CACHE = "daynet-static-v4-1"
const PRECACHE = ["/offline.html", "/brand/logo_mark.svg", "/fonts/daynet-fonts.css", "/fonts/BIZUDPGothic-Regular-base.woff2"]

self.addEventListener("install", event => {
  event.waitUntil(caches.open(STATIC_CACHE).then(cache => cache.addAll(PRECACHE)))
})

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith("daynet-") && k !== STATIC_CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener("message", event => {
  if (event.data === "SKIP_WAITING") self.skipWaiting()
})

function isStaticAsset(url) {
  return url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/brand/") || url.pathname.startsWith("/fonts/")
}

self.addEventListener("fetch", event => {
  const request = event.request
  if (request.method !== "GET") return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return
  if (url.pathname.startsWith("/api/")) return

  if (request.mode === "navigate") {
    // Network only for pages (they can contain private content); offline fallback page only.
    event.respondWith(fetch(request).catch(() => caches.match("/offline.html")))
    return
  }
  if (isStaticAsset(url) && !url.search) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(cache =>
        cache.match(request).then(hit => hit || fetch(request).then(response => {
          if (response.ok && response.type === "basic") cache.put(request, response.clone())
          return response
        })),
      ),
    )
  }
})
