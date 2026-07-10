// FARM AXIS — statistik NDVI per sektor dari Sentinel-2 L2A (COG publik AWS,
// via STAC Earth Search — tanpa API key). Respons di-cache CDN Vercel 3 hari.
import { fromUrl } from 'geotiff';
import proj4 from 'proj4';
import SECTORS from './poktan-data.js';

export const config = { maxDuration: 30 };

const STAC = 'https://earth-search.aws.element84.com/v1/search';
// kelas SCL yang dibuang: 0 nodata, 1 saturasi, 3 bayangan awan, 8/9 awan, 10 sirus
const BAD_SCL = new Set([0, 1, 3, 8, 9, 10]);
const CLOUD_SCL = new Set([3, 8, 9, 10]);

function inPoly(x, y, ring){
  let inside = false;
  for(let i = 0, j = ring.length - 1; i < ring.length; j = i++){
    const [xi, yi] = ring[i], [xj, yj] = ring[j];
    if((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi)
      inside = !inside;
  }
  return inside;
}

async function readBand(url, bbox, W, H, maxResM){
  const tiff = await fromUrl(url);
  const full = await tiff.getImage(0);
  const [ox, oy] = full.getOrigin();
  const [rx, ry] = full.getResolution(); // ry negatif (baris turun)
  const fw = full.getWidth(), fh = full.getHeight();
  const px0 = Math.max(0, Math.floor((bbox[0] - ox) / rx));
  const py0 = Math.max(0, Math.floor((bbox[3] - oy) / ry));
  const px1 = Math.min(fw, Math.ceil((bbox[2] - ox) / rx));
  const py1 = Math.min(fh, Math.ceil((bbox[1] - oy) / ry));
  if(px1 <= px0 || py1 <= py0) throw new Error('poligon di luar cakupan citra');
  // pakai overview terkasar yang resolusinya masih <= maxResM — jauh lebih hemat unduhan
  const count = await tiff.getImageCount();
  let img = full, scale = 1;
  for(let i = 1; i < count; i++){
    const cand = await tiff.getImage(i);
    const s = fw / cand.getWidth();
    if(Math.abs(rx) * s <= maxResM + 0.01 && s > scale){ img = cand; scale = s; }
  }
  const win = [Math.floor(px0 / scale), Math.floor(py0 / scale),
               Math.max(Math.floor(px0 / scale) + 1, Math.ceil(px1 / scale)),
               Math.max(Math.floor(py0 / scale) + 1, Math.ceil(py1 / scale))];
  const data = await img.readRasters({ window: win, width: W, height: H, resampleMethod: 'nearest' });
  return data[0];
}

async function computeForItem(item, ringLonLat){
  const epsg = item.properties['proj:epsg'];
  const zone = epsg % 100;
  proj4.defs('EPSG:' + epsg,
    `+proj=utm +zone=${zone} ${epsg >= 32700 ? '+south ' : ''}+datum=WGS84 +units=m +no_defs`);
  const toUtm = proj4('EPSG:4326', 'EPSG:' + epsg);
  const ring = ringLonLat.map(c => toUtm.forward([c[0], c[1]]));
  const xs = ring.map(p => p[0]), ys = ring.map(p => p[1]);
  const pad = 20;
  const bbox = [Math.min(...xs) - pad, Math.min(...ys) - pad, Math.max(...xs) + pad, Math.max(...ys) + pad];
  const W = Math.min(96, Math.max(10, Math.round((bbox[2] - bbox[0]) / 20)));
  const H = Math.min(96, Math.max(10, Math.round((bbox[3] - bbox[1]) / 20)));

  const [red, nir, scl] = await Promise.all([
    readBand(item.assets.red.href, bbox, W, H, 20),
    readBand(item.assets.nir.href, bbox, W, H, 20),
    readBand(item.assets.scl.href, bbox, W, H, 20)
  ]);

  // baseline >= 4.0 menyimpan DN dengan offset -1000 bila belum diterapkan
  const baseline = parseFloat(item.properties['s2:processing_baseline'] || '0');
  const offset = (baseline >= 4 && item.properties['earthsearch:boa_offset_applied'] === false) ? -1000 : 0;

  const dx = (bbox[2] - bbox[0]) / W, dy = (bbox[3] - bbox[1]) / H;
  let sum = 0, valid = 0, cloudy = 0, total = 0;
  for(let r = 0; r < H; r++){
    const y = bbox[3] - (r + 0.5) * dy;
    for(let c = 0; c < W; c++){
      const x = bbox[0] + (c + 0.5) * dx;
      if(!inPoly(x, y, ring)) continue;
      total++;
      const s = scl[r * W + c];
      if(CLOUD_SCL.has(s)) cloudy++;
      if(BAD_SCL.has(s)) continue;
      const rv = red[r * W + c] + offset, nv = nir[r * W + c] + offset;
      if(rv <= 0 || nv <= 0 || rv + nv === 0) continue;
      sum += (nv - rv) / (nv + rv);
      valid++;
    }
  }
  if(total === 0) throw new Error('poligon terlalu kecil untuk grid citra');
  return {
    ndvi: valid ? sum / valid : null,
    validFrac: valid / total,
    cloudFrac: cloudy / total,
    pixels: valid
  };
}

export default async function handler(req, res){
  try {
    const name = String(req.query.name || '');
    const sec = SECTORS.find(d => d.name === name);
    if(!sec){ res.status(404).json({ error: 'sektor tidak dikenal' }); return; }
    const ring = sec.coords;

    const now = new Date();
    const from = new Date(now.getTime() - 60 * 864e5); // 60 hari ke belakang
    const search = await fetch(STAC, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        collections: ['sentinel-2-l2a'],
        intersects: { type: 'Polygon', coordinates: [ring] },
        datetime: from.toISOString() + '/' + now.toISOString(),
        limit: 8,
        sortby: [{ field: 'properties.datetime', direction: 'desc' }],
        query: { 'eo:cloud_cover': { lt: 85 } }
      })
    });
    if(!search.ok) throw new Error('STAC ' + search.status);
    const items = (await search.json()).features || [];
    if(!items.length){ res.status(404).json({ error: 'tidak ada citra 60 hari terakhir' }); return; }

    // proses 4 scene terbaru PARALEL, lalu pilih: yang terbaru dengan cukup
    // piksel bebas awan; kalau semua berawan, yang piksel validnya terbanyak
    const settled = await Promise.allSettled(items.slice(0, 5).map(item =>
      computeForItem(item, ring).then(st => ({ item, st }))));
    const cands = settled
      .filter(x => x.status === 'fulfilled' && x.value.st.ndvi !== null)
      .map(({ value: { item, st } }) => ({
        name: sec.name,
        ndvi: Math.round(st.ndvi * 100) / 100,
        sceneDate: item.properties.datetime.slice(0, 10),
        cloudCover: Math.round(st.cloudFrac * 100),
        validFrac: Math.round(st.validFrac * 100) / 100,
        pixels: st.pixels
      }));
    if(!cands.length){ res.status(502).json({ error: 'semua scene tertutup awan' }); return; }
    const best = cands.find(c => c.validFrac >= 0.35) ||
                 cands.slice().sort((a, b) => b.validFrac - a.validFrac)[0];
    best.lowConfidence = best.validFrac < 0.35;

    res.setHeader('Cache-Control', 's-maxage=259200, stale-while-revalidate=86400');
    res.status(200).json(best);
  } catch(e) {
    res.status(500).json({ error: String((e && e.message) || e) });
  }
}
