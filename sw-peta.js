// FARM AXIS service worker — app shell + cache tile untuk koneksi lapangan
const VER = 'farmaxis-v2';
const SHELL_CACHE = VER + '-shell';
const TILE_CACHE = VER + '-tiles';
const TILE_LIMIT = 400; // batas jumlah tile tersimpan

const SHELL = [
  '/peta-poktan.html',
  '/vendor/leaflet/leaflet.css',
  '/vendor/leaflet/leaflet.js',
  '/vendor/supabase.js',
  '/vendor/fonts.css',
  '/vendor/fonts/orbitron-500-latin.woff2',
  '/vendor/fonts/orbitron-700-latin.woff2',
  '/vendor/fonts/orbitron-900-latin.woff2',
  '/vendor/fonts/share-tech-mono-400-latin.woff2',
  '/manifest-peta.webmanifest',
  '/icons/farmaxis-192.png',
  '/icons/farmaxis-512.png',
  '/icons/farmaxis-180.png'
];

const TILE_HOSTS = ['server.arcgisonline.com', 'basemaps.cartocdn.com'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(SHELL_CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => !k.startsWith(VER)).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// HTML: network-first (update langsung terlihat; offline pakai cache)
async function networkFirst(req){
  const cache = await caches.open(SHELL_CACHE);
  try {
    const res = await fetch(req);
    if(res.ok) cache.put(req, res.clone());
    return res;
  } catch(err) {
    const hit = await cache.match(req, { ignoreSearch: true });
    if(hit) return hit;
    throw err;
  }
}

// aset vendor: cache-first (isi path berubah hanya jika nama file berubah)
async function cacheFirst(req){
  const cache = await caches.open(SHELL_CACHE);
  const hit = await cache.match(req);
  if(hit) return hit;
  const res = await fetch(req);
  if(res.ok) cache.put(req, res.clone());
  return res;
}

// tile peta: cache-first + batas jumlah; fetch ulang pakai CORS supaya
// response tidak opaque (opaque menggelembungkan kuota storage)
async function tileFetch(req){
  const cache = await caches.open(TILE_CACHE);
  const hit = await cache.match(req.url);
  if(hit) return hit;
  try {
    const res = await fetch(new Request(req.url, { mode: 'cors' }));
    if(res.ok){
      cache.put(req.url, res.clone());
      trimTiles(cache); // tanpa await — jangan tahan response
    }
    return res;
  } catch(err) {
    return fetch(req); // fallback: biarkan browser yang urus
  }
}

async function trimTiles(cache){
  const keys = await cache.keys();
  if(keys.length <= TILE_LIMIT) return;
  // hapus yang paling lama (urutan keys ≈ urutan masuk)
  await Promise.all(keys.slice(0, keys.length - TILE_LIMIT).map(k => cache.delete(k)));
}

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if(e.request.method !== 'GET') return;

  if(TILE_HOSTS.some(h => url.hostname.endsWith(h))){
    e.respondWith(tileFetch(e.request));
    return;
  }
  if(url.origin === self.location.origin){
    if(url.pathname === '/peta-poktan.html'){
      e.respondWith(networkFirst(e.request));
      return;
    }
    if(url.pathname.startsWith('/vendor/')){
      e.respondWith(cacheFirst(e.request));
      return;
    }
  }
  // lainnya (Supabase REST, halaman lain): langsung ke jaringan
});
