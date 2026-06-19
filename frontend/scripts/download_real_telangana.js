#!/usr/bin/env node
/**
 * Downloads accurate Telangana districts polygons from the open-source
 * geohacker/india project and writes a slimmed geojson to
 * frontend/public/telangana_districts.geojson.
 *
 * Each feature is augmented with the schema PunjabMap.js expects
 * (ST_NAME, DIST_NAME, AC_NAME, PC_NAME) so the existing renderer
 * works without code changes.
 */
const fs = require('fs');
const path = require('path');
const https = require('https');

const URL = 'https://raw.githubusercontent.com/geohacker/india/master/district/india_district.geojson';
const OUT = path.join(__dirname, '..', 'public', 'telangana_districts.geojson');

/* District-name canonicalisation. Some districts split into multiple
 * polygons in the source — we normalise to a stable upper-case key the
 * rest of the app uses. */
const NORMALISE = {
  'KOMARAM BHEEM ASIFABAD': 'KUMURAM BHEEM ASIFABAD',
  'KUMARAM BHEEM': 'KUMURAM BHEEM ASIFABAD',
  'KOMARAM BHEEM': 'KUMURAM BHEEM ASIFABAD',
  'RAJANNA': 'RAJANNA SIRCILLA',
  'BHADRADRI': 'BHADRADRI KOTHAGUDEM',
  'MEDCHAL MALKAJGIRI': 'MEDCHAL-MALKAJGIRI',
  'MEDCHAL': 'MEDCHAL-MALKAJGIRI',
  'JAYASHANKAR': 'JAYASHANKAR BHUPALPALLY',
  'JOGULAMBA': 'JOGULAMBA GADWAL',
  'YADADRI': 'YADADRI BHUVANAGIRI',
  'WARANGAL RURAL': 'WARANGAL RURAL',
  'WARANGAL': 'WARANGAL URBAN',
};

/* 7 ACs of Karimnagar Lok Sabha PC — what we paint in red on the map.
 * If a district falls into BSK's PC we mark PC_NAME = 'KARIMNAGAR'. */
const KARIMNAGAR_PC_DISTRICTS = new Set([
  'KARIMNAGAR',
  'RAJANNA SIRCILLA',
  // Husnabad sits inside SIDDIPET district — but only the Husnabad assembly
  // segment belongs to Karimnagar PC, so we keep SIDDIPET *outside* the PC
  // highlight and rely on AC-level highlighting elsewhere.
]);

function download(url) {
  return new Promise((resolve, reject) => {
    const get = (u) => {
      https.get(u, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return get(res.headers.location);
        }
        if (res.statusCode !== 200) {
          return reject(new Error(`HTTP ${res.statusCode} for ${u}`));
        }
        const chunks = [];
        let received = 0;
        res.on('data', (c) => {
          chunks.push(c);
          received += c.length;
          if (received % (4 * 1024 * 1024) < c.length) {
            process.stdout.write(`  downloaded ${(received / 1024 / 1024).toFixed(1)} MB…\r`);
          }
        });
        res.on('end', () => {
          process.stdout.write('\n');
          resolve(Buffer.concat(chunks).toString('utf8'));
        });
        res.on('error', reject);
      }).on('error', reject);
    };
    get(url);
  });
}

(async () => {
  console.log(`Downloading ${URL}…`);
  const raw = await download(URL);
  console.log(`Got ${(raw.length / 1024 / 1024).toFixed(1)} MB; parsing…`);
  const data = JSON.parse(raw);

  /* The geohacker file is pre-2014 — Telangana's 10 historical districts are
   * still grouped under "Andhra Pradesh". After bifurcation those 10 became
   * Telangana state. The reference map uses exactly these legacy boundaries
   * (the 10 districts that became 33 sub-districts later). Karimnagar
   * district is in this list. */
  const LEGACY_TELANGANA = new Set([
    'Adilabad', 'Hyderabad', 'Karimnagar', 'Khammam', 'Mahbubnagar',
    'Medak', 'Nalgonda', 'Nizamabad', 'Rangareddy', 'Ranga Reddy', 'Warangal'
  ].map((n) => n.toLowerCase()));

  const isTelangana = (props) => {
    const st = String(props.NAME_1 || props.ST_NM || props.STATE || '').toLowerCase();
    const dist = String(props.NAME_2 || props.DISTRICT || '').toLowerCase();
    if (st === 'telangana') return true;
    // Pre-2014 file: pull the 10 legacy Telangana districts from Andhra Pradesh
    return st === 'andhra pradesh' && LEGACY_TELANGANA.has(dist);
  };

  const tg = data.features.filter((f) => isTelangana(f.properties));
  console.log(`Found ${tg.length} Telangana features.`);
  if (tg.length === 0) {
    console.error('No Telangana features matched. Property keys on first feature:', Object.keys(data.features[0].properties));
    process.exit(1);
  }

  /* Augment + normalise properties */
  const cleaned = tg.map((f, i) => {
    const dn0 = String(
      f.properties.NAME_2 || f.properties.DISTRICT || f.properties.DIST_NM || f.properties.district || ''
    ).toUpperCase().trim().replace(/^RANGA REDDY$/, 'RANGAREDDY');
    const distName = NORMALISE[dn0] || dn0;
    const inBskPC = KARIMNAGAR_PC_DISTRICTS.has(distName);

    return {
      type: 'Feature',
      properties: {
        OBJECTID: i + 1,
        ST_CODE: '36',
        ST_NAME: 'TELANGANA',
        DT_CODE: String(i + 1).padStart(2, '0'),
        DIST_NAME: distName,
        AC_NO: 100 + i,
        AC_NAME: distName
          .toLowerCase()
          .replace(/\b\w/g, (c) => c.toUpperCase()),
        PC_NO: inBskPC ? 4 : 10 + i,
        PC_NAME: inBskPC ? 'KARIMNAGAR' : distName,
        PC_ID: inBskPC ? 3604 : 3700 + i,
        STATUS: null,
        Shape_Leng: 1,
        Shape_Area: 1,
      },
      geometry: f.geometry,
    };
  });

  const out = { type: 'FeatureCollection', features: cleaned };
  fs.writeFileSync(OUT, JSON.stringify(out));
  console.log(`✔ Wrote ${cleaned.length} districts → ${path.relative(process.cwd(), OUT)} (${(fs.statSync(OUT).size / 1024).toFixed(0)} KB)`);

  console.log('\nDistricts in file:');
  const names = [...new Set(cleaned.map((f) => f.properties.DIST_NAME))].sort();
  names.forEach((n) => console.log(`  · ${n}${KARIMNAGAR_PC_DISTRICTS.has(n) ? '   ← Karimnagar PC' : ''}`));
})().catch((e) => {
  console.error('Download failed:', e.message);
  process.exit(1);
});
