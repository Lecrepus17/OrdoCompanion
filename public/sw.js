/* eslint-disable no-restricted-globals */
const CACHE_NAME = 'ordo-companion-pwa-v1';
const SHELL_ASSETS = ['/', '/manifest.json', '/favicon.png', '/icon-512.png', '/icon.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) =>
        Promise.all(
          SHELL_ASSETS.map((asset) =>
            cache.add(asset).catch(() => {
              // Ignora falhas individuais durante pré-cache (ex: dev server)
            })
          )
        )
      )
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith('ordo-companion-pwa-') && key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event && event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

function shouldBypassCache(url) {
  if (url.origin !== self.location.origin) return true;
  if (url.pathname.endsWith('/version.json') || url.pathname === '/version.json') return true;
  if (url.pathname.startsWith('/pdfs/')) return true;
  return false;
}

function isStaticAsset(pathname) {
  return (
    pathname.startsWith('/_expo/static/') ||
    pathname.startsWith('/pdfjs/') ||
    pathname.startsWith('/assets/') ||
    pathname === '/favicon.png' ||
    pathname === '/icon-512.png' ||
    pathname === '/icon.png' ||
    pathname === '/manifest.json'
  );
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (!request || request.method !== 'GET') return;

  let url;
  try {
    url = new URL(request.url);
  } catch {
    return;
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;
  if (shouldBypassCache(url)) return;

  // Navegação / Documentos HTML: Network-First com fallback offline para o shell cacheado
  if (request.mode === 'navigate' || request.destination === 'document') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy)).catch(() => {});
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          if (cached) return cached;
          const shell = await caches.match('/');
          return shell || Response.error();
        })
    );
    return;
  }

  // Bundles estáticos, fontes, PDF.js e ícones: Stale-While-Revalidate
  if (isStaticAsset(url.pathname)) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(request);
        const fetchPromise = fetch(request)
          .then((networkRes) => {
            if (networkRes && networkRes.ok) {
              cache.put(request, networkRes.clone()).catch(() => {});
            }
            return networkRes;
          })
          .catch(() => cached);

        return cached || fetchPromise;
      })
    );
  }
});
