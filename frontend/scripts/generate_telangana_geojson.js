#!/usr/bin/env node
/**
 * Generates frontend/public/telangana_ac.geojson — a stylised cartogram of
 * Telangana's 33 districts and the 7 Assembly Constituencies of Karimnagar
 * Lok Sabha PC (Shri Bandi Sanjay Kumar's seat).
 *
 * Each polygon is an irregular 8-vertex shape centred on the real lat/lon
 * of that district/AC, with a small jitter so adjacent polygons don't form
 * a perfect grid. The output matches the property schema PunjabMap.js
 * already expects: ST_NAME, DIST_NAME, AC_NO, AC_NAME, PC_NO, PC_NAME.
 */
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, '..', 'public', 'telangana_ac.geojson');

/* ────── Karimnagar Lok Sabha PC — 7 Assembly Segments (BSK's seat) ── */
const KARIMNAGAR_ACS = [
  { ac_no: 1, ac_name: 'Karimnagar',      district: 'KARIMNAGAR',       lon: 79.137, lat: 18.435, r: 0.090 },
  { ac_no: 2, ac_name: 'Choppadandi (SC)',district: 'KARIMNAGAR',       lon: 78.971, lat: 18.485, r: 0.085 },
  { ac_no: 3, ac_name: 'Vemulawada',      district: 'RAJANNA SIRCILLA', lon: 78.866, lat: 18.490, r: 0.085 },
  { ac_no: 4, ac_name: 'Sircilla',        district: 'RAJANNA SIRCILLA', lon: 78.811, lat: 18.388, r: 0.085 },
  { ac_no: 5, ac_name: 'Manakondur (SC)', district: 'KARIMNAGAR',       lon: 79.183, lat: 18.353, r: 0.085 },
  { ac_no: 6, ac_name: 'Husnabad',        district: 'SIDDIPET',         lon: 79.063, lat: 18.060, r: 0.090 },
  { ac_no: 7, ac_name: 'Huzurabad',       district: 'KARIMNAGAR',       lon: 79.385, lat: 18.245, r: 0.090 },
];

/* ────── 33 districts of Telangana, approximate centroids ─────────── */
const DISTRICTS = [
  // district name, centroid lon, lat, radius (~ size)
  ['ADILABAD',                78.530, 19.665, 0.42],
  ['KUMURAM BHEEM ASIFABAD',  79.350, 19.350, 0.40],
  ['MANCHERIAL',              79.430, 18.870, 0.30],
  ['NIRMAL',                  78.345, 19.095, 0.32],
  ['NIZAMABAD',               78.094, 18.671, 0.34],
  ['KAMAREDDY',               78.342, 18.318, 0.32],
  ['JAGTIAL',                 78.911, 18.792, 0.30],
  ['PEDDAPALLI',              79.378, 18.614, 0.30],
  ['RAJANNA SIRCILLA',        78.811, 18.388, 0.26],
  ['KARIMNAGAR',              79.137, 18.435, 0.26],
  ['JAYASHANKAR BHUPALPALLY', 79.940, 18.430, 0.38],
  ['MULUGU',                  80.230, 18.190, 0.34],
  ['BHADRADRI KOTHAGUDEM',    80.620, 17.555, 0.50],
  ['MAHABUBABAD',             80.030, 17.595, 0.36],
  ['WARANGAL URBAN',          79.585, 18.000, 0.24],
  ['WARANGAL RURAL',          79.700, 17.890, 0.26],
  ['JANGAON',                 79.155, 17.725, 0.28],
  ['YADADRI BHUVANAGIRI',     78.880, 17.510, 0.30],
  ['MEDCHAL-MALKAJGIRI',      78.583, 17.522, 0.20],
  ['HYDERABAD',               78.480, 17.385, 0.18],
  ['RANGAREDDY',              78.290, 17.220, 0.34],
  ['VIKARABAD',               77.910, 17.337, 0.34],
  ['SANGAREDDY',              78.085, 17.620, 0.34],
  ['SIDDIPET',                78.852, 18.103, 0.32],
  ['MEDAK',                   78.270, 18.045, 0.30],
  ['KHAMMAM',                 80.150, 17.250, 0.40],
  ['SURYAPET',                79.620, 17.140, 0.34],
  ['NALGONDA',                79.270, 17.054, 0.42],
  ['MAHBUBNAGAR',             77.985, 16.748, 0.36],
  ['JOGULAMBA GADWAL',        77.795, 16.235, 0.34],
  ['WANAPARTHY',              78.062, 16.362, 0.30],
  ['NAGARKURNOOL',            78.330, 16.485, 0.36],
  ['NARAYANPET',              77.495, 16.745, 0.30],
];

/* ─── helper: 8-vertex irregular polygon around a centroid ───────── */
function hexPolygon(cx, cy, radius, seed) {
  // deterministic pseudo-random jitter from a seed so output is stable
  let s = seed * 9301 + 49297;
  const rand = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
  const verts = 8;
  const pts = [];
  for (let i = 0; i < verts; i++) {
    const angle = (i / verts) * Math.PI * 2;
    const jitter = 0.85 + rand() * 0.30; // 0.85–1.15
    const x = cx + Math.cos(angle) * radius * jitter;
    const y = cy + Math.sin(angle) * radius * jitter * 0.85; // slightly flatter
    pts.push([Number(x.toFixed(5)), Number(y.toFixed(5))]);
  }
  pts.push(pts[0]); // close
  return [pts];
}

const features = [];
let oid = 1;

/* ── 7 Karimnagar PC ACs: drawn as the Karimnagar PC focus area ── */
KARIMNAGAR_ACS.forEach((ac) => {
  features.push({
    type: 'Feature',
    properties: {
      OBJECTID: oid++,
      ST_CODE: '36',
      ST_NAME: 'TELANGANA',
      DT_CODE: '01',
      DIST_NAME: ac.district,
      AC_NO: ac.ac_no,
      AC_NAME: ac.ac_name,
      PC_NO: 4,
      PC_NAME: 'KARIMNAGAR',
      PC_ID: 3604,
      STATUS: null,
      Shape_Leng: 1.0,
      Shape_Area: ac.r * ac.r * 2.5,
    },
    geometry: { type: 'Polygon', coordinates: hexPolygon(ac.lon, ac.lat, ac.r, ac.ac_no * 31) },
  });
});

/* ── For every OTHER Telangana district, one representative AC polygon ── */
DISTRICTS.forEach((row, idx) => {
  const [distName, lon, lat, r] = row;

  // Skip the 3 districts whose visible area is already taken by Karimnagar
  // PC ACs — Karimnagar, Rajanna Sircilla, Siddipet partially covered.
  // We still add a backdrop polygon for them so map looks complete.
  const acName = distName
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());

  features.push({
    type: 'Feature',
    properties: {
      OBJECTID: oid++,
      ST_CODE: '36',
      ST_NAME: 'TELANGANA',
      DT_CODE: String(10 + idx).padStart(2, '0'),
      DIST_NAME: distName,
      AC_NO: 100 + idx,
      AC_NAME: acName,
      PC_NO: 10 + Math.floor(idx / 7),
      PC_NAME: distName,
      PC_ID: 3700 + idx,
      STATUS: null,
      Shape_Leng: 1.0,
      Shape_Area: r * r * 2.5,
    },
    geometry: { type: 'Polygon', coordinates: hexPolygon(lon, lat, r, idx * 17 + 7) },
  });
});

const out = { type: 'FeatureCollection', features };

fs.writeFileSync(OUT, JSON.stringify(out));
console.log(`✔ Wrote ${features.length} features → ${path.relative(process.cwd(), OUT)}`);
