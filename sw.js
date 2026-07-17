/* Service Worker — Laporan Pertanian + FARM AXIS (SATU SW untuk satu origin;
   dua SW berebut scope '/' saling menghapus cache & registrasi).
   Strategi:
   - Navigasi (HTML)      : network-first + revalidasi (cache:'no-cache'),
                            di-cache per-halaman, fallback cache saat offline
   - Aset same-origin/CDN : stale-while-revalidate
   - Tile peta (Esri/CARTO): cache-first, maks 400 entri (offline di lapangan)
   - Supabase / /api/ / POST: TIDAK di-cache (selalu jaringan)
*/
const VERSION = 'v2.0.3';
const SHELL_CACHE = `shell-${VERSION}`;
const RUNTIME_CACHE = `runtime-${VERSION}`;
const TILE_CACHE = `tiles-${VERSION}`;
const TILE_LIMIT = 400;

const SHELL_ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png',
  // FARM AXIS (peta-poktan)
  './peta-poktan.html',
  './manifest-peta.webmanifest',
  './vendor/leaflet/leaflet.css',
  './vendor/leaflet/leaflet.js',
  './vendor/leaflet-rotate/leaflet-rotate.js',
  './vendor/supabase.js',
  './vendor/fonts.css',
  './vendor/fonts/orbitron-500-latin.woff2',
  './vendor/fonts/orbitron-700-latin.woff2',
  './vendor/fonts/orbitron-900-latin.woff2',
  './vendor/fonts/share-tech-mono-400-latin.woff2',
];

const TILE_HOSTS = ['server.arcgisonline.com', 'basemaps.cartocdn.com'];

self.addEventListener('install', (event) => {
  // no-cache: precache selalu revalidasi ke server, jangan ambil dari cache HTTP basi
  event.waitUntil(
    caches.open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL_ASSETS.map((u) => new Request(u, { cache: 'no-cache' }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  const keep = [SHELL_CACHE, RUNTIME_CACHE, TILE_CACHE];
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => !keep.includes(k)).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

function isSupabaseOrApi(url) {
  return url.hostname.endsWith('.supabase.co') ||
         url.hostname.endsWith('.supabase.in') ||
         url.pathname.startsWith('/rest/') ||
         url.pathname.startsWith('/auth/') ||
         url.pathname.startsWith('/api/');
}

// kunci cache navigasi per halaman — dulu semua navigasi ditimpa ke index.html,
// sehingga membuka peta-poktan merusak shell offline aplikasi Laporan
function shellKeyFor(url) {
  return url.pathname === '/peta-poktan.html' ? './peta-poktan.html' : './index.html';
}

// tile peta: cache-first + batas entri; fetch ulang pakai CORS supaya response
// tidak opaque (opaque menggelembungkan kuota storage)
async function tileFetch(req) {
  const cache = await caches.open(TILE_CACHE);
  const hit = await cache.match(req.url);
  if (hit) return hit;
  try {
    const res = await fetch(new Request(req.url, { mode: 'cors' }));
    if (res.ok) {
      cache.put(req.url, res.clone());
      trimTiles(cache); // tanpa await — jangan tahan response
    }
    return res;
  } catch (err) {
    return fetch(req);
  }
}

async function trimTiles(cache) {
  const keys = await cache.keys();
  if (keys.length <= TILE_LIMIT) return;
  await Promise.all(keys.slice(0, keys.length - TILE_LIMIT).map((k) => cache.delete(k)));
}

self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Hanya tangani GET; biarkan POST/PUT/DELETE langsung ke jaringan.
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Jangan pernah cache panggilan data Supabase / API.
  if (isSupabaseOrApi(url)) return;

  // Tile peta satelit/label → cache-first dengan batas.
  if (TILE_HOSTS.some((h) => url.hostname.endsWith(h))) {
    event.respondWith(tileFetch(req));
    return;
  }

  // Navigasi halaman → network-first (revalidasi), fallback cache saat offline.
  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      const cache = await caches.open(SHELL_CACHE);
      try {
        const res = await fetch(req.url, { cache: 'no-cache' });
        if (res.ok) cache.put(shellKeyFor(url), res.clone());
        return res;
      } catch (err) {
        const hit = await cache.match(shellKeyFor(url), { ignoreSearch: true });
        return hit || cache.match('./');
      }
    })());
    return;
  }

  // Aset lain (same-origin & CDN) → stale-while-revalidate.
  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req)
        .then((res) => {
          if (res && (res.ok || res.type === 'opaque')) {
            const copy = res.clone();
            caches.open(RUNTIME_CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
