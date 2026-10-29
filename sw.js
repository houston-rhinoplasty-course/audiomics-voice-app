/*
  Service worker for the Audiomics Voice Recording page.

  Purpose: let the page reload with no Wi-Fi once it has been opened
  once. The page is fetched from the network first (so updates reach
  the iPad as soon as it is online) and cached; the cached copy is
  used only when the network is unavailable.

  Host this file in the same folder as audiomics-recorder.html.
  If you rename the HTML file, update PAGE below.

  Bump CACHE_NAME when the HTML changes; old caches are deleted on
  activation.
*/

const CACHE_NAME = 'audiomics-recorder-v4.1';
const PAGE = './audiomics-recorder.html';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll([PAGE]))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  // Remove caches from older versions.
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const sameOrigin = new URL(event.request.url).origin === self.location.origin;

  // The page itself: network first, so an iPad that is online always
  // gets the newest version; the cached copy is used only offline.
  // (v4.0 and earlier were cache-first, which kept iPads on an old
  // version after updates.)
  if (event.request.mode === 'navigate' || event.request.destination === 'document') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.ok && sameOrigin) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(() => caches.match(event.request).then((c) => c || caches.match(PAGE)))
    );
    return;
  }

  // Anything else: cache first, then network.
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (response.ok && sameOrigin) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        }
        return response;
      });
    })
  );
});
