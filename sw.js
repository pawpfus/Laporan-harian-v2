/* Service Worker — Laporan Pertanian PWA
   Strategi:
   - Navigasi (HTML)      : network-first, fallback ke index.html cache (offline shell)
   - Aset same-origin     : stale-while-revalidate (ikon, manifest)
   - CDN (font, ikon, css): stale-while-revalidate
   - Supabase / API / POST: TIDAK di-cache (selalu jaringan)
*/
const VERSION = 'v1.0.3';
const SHELL_CACHE = `shell-${VERSION}`;
const RUNTIME_CACHE = `runtime-${VERSION}`;

const SHELL_ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== SHELL_CACHE && k !== RUNTIME_CACHE)
          .map((k) => caches.delete(k))
      )
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
         url.pathname.startsWith('/auth/');
}

self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Hanya tangani GET; biarkan POST/PUT/DELETE langsung ke jaringan.
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Jangan pernah cache panggilan data Supabase / API.
  if (isSupabaseOrApi(url)) return;

  // Navigasi halaman → network-first, fallback shell saat offline.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(SHELL_CACHE).then((c) => c.put('./index.html', copy));
          return res;
        })
        .catch(() => caches.match('./index.html', { ignoreSearch: true })
          .then((r) => r || caches.match('./')))
    );
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
