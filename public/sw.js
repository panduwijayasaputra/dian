const CACHE_NAME = 'dian-v1'

const PRECACHE_URLS = [
  '/offline',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
]

// Last-resort inline fallback if /offline itself wasn't cached yet
const OFFLINE_FALLBACK_HTML = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Offline - DIAN</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    body { font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #f8fafc; color: #1e293b; text-align: center; gap: 16px; padding: 16px; }
    h1 { font-size: 1.5rem; font-weight: 700; margin: 0; }
    p { font-size: 0.875rem; color: #64748b; max-width: 300px; margin: 0; }
    a { margin-top: 8px; padding: 8px 20px; border: 1px solid #e2e8f0; border-radius: 6px; text-decoration: none; font-size: 0.875rem; color: #1e293b; }
  </style>
</head>
<body>
  <h1>Anda sedang offline</h1>
  <p>Silakan periksa koneksi internet Anda dan coba lagi.</p>
  <a href="/documents">Kembali ke Dokumen</a>
</body>
</html>`

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      // allSettled instead of addAll — one failed URL won't abort the whole precache
      .then((cache) => Promise.allSettled(PRECACHE_URLS.map((url) => cache.add(url))))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Only handle same-origin requests
  if (url.origin !== self.location.origin) return

  // Pass through non-GET requests (covers Next.js server actions which use POST)
  if (request.method !== 'GET') return

  // Pass through API routes — network only, no caching
  if (url.pathname.startsWith('/api/')) return

  // Cache-first for Next.js static assets (content-addressed, safe to cache forever)
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached
        return fetch(request)
          .then((response) => {
            if (response.ok) {
              const clone = response.clone()
              caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
            }
            return response
          })
          .catch(() => Response.error())
      }),
    )
    return
  }

  // Network-first for everything else (navigation, public assets)
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const clone = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
        }
        return response
      })
      .catch(async () => {
        const cached = await caches.match(request)
        if (cached) return cached

        if (request.mode === 'navigate') {
          // Try the cached /offline page first, fall back to inline HTML
          const offlinePage = await caches.match('/offline')
          if (offlinePage) return offlinePage
          return new Response(OFFLINE_FALLBACK_HTML, {
            headers: { 'Content-Type': 'text/html; charset=utf-8' },
          })
        }

        return Response.error()
      }),
  )
})
