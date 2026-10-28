/*
  Service worker for the Audiomics Voice Recording page.

  Purpose: let the page reload with no Wi-Fi once it has been opened
  once. It caches the page on install and answers every same-origin
  request from the cache first, falling back to the network (and
  caching the result) when something is not cached yet.

  Host this file in the same folder as audiomics-recorder.html.
  If you rename the HTML file, update PAGE below.

  Bump CACHE_NAME whenever the HTML changes so the iPad fetches the
  new version instead of the cached copy.
*/

const CACHE_NAME = 'audiomics-recorder-v3.2';
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
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (response.ok && new URL(event.request.url).origin === self.location.origin) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        }
        return response;
      });
    })
  );
});
