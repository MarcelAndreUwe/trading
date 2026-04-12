/**
 * Trading Cockpit - Service Worker
 * Stale-While-Revalidate fuer statische Assets
 * Network-First fuer API-Calls
 */

const CACHE_NAME = 'trading-cockpit-v1';
const STATIC_ASSETS = [
  './',
  './index.html',
  './css/custom.css',
  './js/app.js',
  './js/tax-engine.js',
  './js/api-client.js',
  './js/chart-manager.js',
  './js/modules/tax-drag.js',
  './js/modules/break-even.js',
  './js/modules/net-profit.js',
  './js/modules/price-levels.js',
  './js/modules/volatility-check.js',
  './js/modules/dca-comparison.js',
  './js/modules/advisory.js',
  './js/utils/formatters.js',
  './js/utils/storage.js',
  './js/utils/glossary.js',
  './js/data/german-stocks.js',
  './manifest.json'
];

// Install: Cache statische Assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate: Alte Caches loeschen
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// Fetch: Stale-While-Revalidate fuer eigene Assets, Network-First fuer APIs
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // API-Calls: Network-First mit Cache-Fallback
  if (url.hostname === 'financialmodelingprep.com' ||
      url.hostname === 'api.allorigins.win' ||
      url.hostname === 'query1.finance.yahoo.com') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Statische Assets: Stale-While-Revalidate
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const fetchPromise = fetch(event.request).then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        return response;
      }).catch(() => cached);

      return cached || fetchPromise;
    })
  );
});
