// OXYCORP Service Worker — Offline caching + 3G optimisation
const CACHE_STATIC = 'oxycorp-static-v2';
const CACHE_DYNAMIC = 'oxycorp-dynamic-v2';
const CACHE_IMAGES = 'oxycorp-images-v2';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/advisor.html',
  '/market-intelligence.html',
  '/career-analysis.html',
  '/roadmap.html',
  '/submit-music.html',
  '/skill-assessment.html',
  '/coaches.html',
  '/guidance.html',
  '/coach-dashboard.html',
  '/style.css',
  '/global.css',
  '/main.js',
  '/shared.js',
  '/icon-512.png',
  '/offline.html',
  'https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,400;0,500;0,700;1,400&family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap'
];

// API routes to cache with stale-while-revalidate (browseable offline)
const CACHEABLE_API = [
  '/api/coaches',
  '/api/market-intelligence',
  '/ml/market-trends',
];

// ── Install ──────────────────────────────────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_STATIC).then(cache => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// ── Activate — prune old caches ───────────────────────────────────────────────
self.addEventListener('activate', event => {
  const KEEP = [CACHE_STATIC, CACHE_DYNAMIC, CACHE_IMAGES];
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => !KEEP.includes(k)).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ── Fetch ─────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle same-origin + googleapis fonts
  if (url.origin !== self.location.origin && !url.hostname.includes('googleapis.com')) {
    return;
  }

  // Images — cache-first, serve low-quality placeholder offline
  if (request.destination === 'image') {
    event.respondWith(handleImage(request));
    return;
  }

  // Cacheable API — stale-while-revalidate so users see data instantly
  if (CACHEABLE_API.some(path => url.pathname.startsWith(path))) {
    event.respondWith(staleWhileRevalidate(request, CACHE_DYNAMIC));
    return;
  }

  // Other API calls — network-first, offline JSON fallback
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/ml/')) {
    event.respondWith(networkFirstApi(request));
    return;
  }

  // Static assets — cache-first, then network
  event.respondWith(cacheFirstStatic(request));
});

// ── Strategies ────────────────────────────────────────────────────────────────

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  const networkFetch = fetch(request).then(response => {
    if (response.ok) cache.put(request, response.clone());
    return response;
  }).catch(() => null);

  // Return cached immediately; background-refresh for next visit
  return cached || await networkFetch || offlineApiResponse();
}

async function networkFirstApi(request) {
  try {
    const response = await fetch(request);
    return response;
  } catch {
    return offlineApiResponse();
  }
}

async function cacheFirstStatic(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_STATIC);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    // HTML pages → offline fallback
    if (request.headers.get('accept')?.includes('text/html')) {
      return caches.match('/offline.html');
    }
  }
}

async function handleImage(request) {
  const cache = await caches.open(CACHE_IMAGES);
  const cached = await cache.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    // Return a 1×1 transparent PNG as placeholder
    return new Response(
      atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='),
      { headers: { 'Content-Type': 'image/png' } }
    );
  }
}

function offlineApiResponse() {
  return new Response(
    JSON.stringify({ offline: true, error: 'You are offline. Showing cached data.' }),
    { headers: { 'Content-Type': 'application/json' } }
  );
}
