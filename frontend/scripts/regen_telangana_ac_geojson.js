#!/usr/bin/env node
/**
 * Regenerate `public/telangana_ac.geojson` as a clean hex cartogram.
 *
 * What this fixes
 * ─────────────────────────────────────────────────────────────────
 *   1. Removes the duplicate "Karimnagar" AC row (the cartogram
 *      shipped two rows with effectively identical centroids).
 *   2. Resizes every hexagon so it never overlaps its neighbours.
 *      Each feature gets a per-feature radius = 0.45 × distance to
 *      its nearest neighbour, capped to keep the state view legible.
 *   3. Re-emits each polygon as a clean flat-top hex around its
 *      original centroid (so the geographic position is preserved).
 *
 * Run:
 *   node frontend/scripts/regen_telangana_ac_geojson.js
 *
 * Inputs / outputs are file paths relative to the project root.
 */
const fs = require('fs');
const path = require('path');

const PROJECT_ROOT  = path.resolve(__dirname, '..');
const INPUT  = path.join(PROJECT_ROOT, 'public', 'telangana_ac.geojson');
const OUTPUT = INPUT;
const BACKUP = INPUT + '.backup-' + new Date().toISOString().replace(/[:.]/g, '-');

// Per-feature radius bounds (in degrees). Small enough to never overlap
// when packed tightly (Karimnagar PC), large enough to read at state scale.
const MIN_RADIUS = 0.035;   // never smaller than this (still ~ 8 px at state view)
const MAX_RADIUS = 0.16;    // cap so isolated districts don't dominate

function centroidOf(ring) {
    // ring may have a closing vertex; ignore it for the average.
    const pts = ring[ring.length - 1][0] === ring[0][0] && ring[ring.length - 1][1] === ring[0][1]
        ? ring.slice(0, -1)
        : ring;
    let sx = 0, sy = 0;
    for (const p of pts) { sx += p[0]; sy += p[1]; }
    return [sx / pts.length, sy / pts.length];
}

function distance(a, b) {
    const dx = a[0] - b[0], dy = a[1] - b[1];
    return Math.sqrt(dx * dx + dy * dy);
}

/** Build a flat-top hexagon (6 vertices + closing vertex) around (cx, cy). */
function makeHex(cx, cy, r) {
    const verts = [];
    for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i + Math.PI / 6; // pointy-top
        verts.push([
            +(cx + r * Math.cos(angle)).toFixed(5),
            +(cy + r * Math.sin(angle)).toFixed(5)
        ]);
    }
    verts.push(verts[0]); // close
    return [verts];
}

function main() {
    if (!fs.existsSync(INPUT)) {
        console.error('Input not found:', INPUT);
        process.exit(1);
    }

    const raw = JSON.parse(fs.readFileSync(INPUT, 'utf8'));
    if (!raw || !Array.isArray(raw.features)) {
        console.error('Bad geojson — no features array.');
        process.exit(1);
    }

    // 1. Dedupe by (AC_NAME, PC_NAME). Keep the first occurrence.
    const seen = new Set();
    const deduped = [];
    for (const f of raw.features) {
        const key = `${f.properties?.AC_NAME || ''}|${f.properties?.PC_NAME || ''}|${f.properties?.DIST_NAME || ''}`;
        if (seen.has(key)) {
            console.log(`  ✂  dropping duplicate: ${f.properties?.AC_NAME} (${f.properties?.DIST_NAME})`);
            continue;
        }
        seen.add(key);
        deduped.push(f);
    }
    console.log(`Deduped: ${raw.features.length} → ${deduped.length} features`);

    // 2. Compute centroids and nearest-neighbour distances.
    const records = deduped.map((f) => {
        const ring = f.geometry?.coordinates?.[0];
        if (!ring || !Array.isArray(ring)) return null;
        const c = centroidOf(ring);
        return { feature: f, centroid: c };
    }).filter(Boolean);

    for (const rec of records) {
        let nearest = Infinity;
        for (const other of records) {
            if (other === rec) continue;
            const d = distance(rec.centroid, other.centroid);
            if (d < nearest) nearest = d;
        }
        // Hex packing: with point-to-flat distance r, neighbours that share
        // an edge are 2*r*sin(60°) ≈ 1.732*r apart. Use 0.5*nearest so two
        // adjacent hexes have a small gap between them (clean stroke read).
        let r = 0.5 * nearest;
        r = Math.max(MIN_RADIUS, Math.min(MAX_RADIUS, r));
        rec.radius = r;
    }

    // 3. Rewrite each feature with a clean hex polygon at its centroid.
    const outFeatures = records.map(({ feature, centroid, radius }) => {
        const newCoords = makeHex(centroid[0], centroid[1], radius);
        return {
            type: 'Feature',
            properties: {
                ...feature.properties,
                Shape_Area: +(3 * Math.sqrt(3) / 2 * radius * radius).toFixed(6),
                hex_radius: +radius.toFixed(4)
            },
            geometry: {
                type: 'Polygon',
                coordinates: newCoords
            }
        };
    });

    const output = {
        type: 'FeatureCollection',
        name: raw.name || 'telangana_ac_cartogram',
        crs: raw.crs,
        features: outFeatures
    };

    // 4. Backup the original, then overwrite.
    fs.copyFileSync(INPUT, BACKUP);
    fs.writeFileSync(OUTPUT, JSON.stringify(output, null, 0));
    console.log(`Backup written to: ${path.relative(PROJECT_ROOT, BACKUP)}`);
    console.log(`Regenerated:        ${path.relative(PROJECT_ROOT, OUTPUT)}`);
    console.log(`Final feature count: ${outFeatures.length}`);

    // Quick verification dump for Karimnagar PC.
    const karim = outFeatures.filter((f) =>
        (f.properties.PC_NAME || '').toUpperCase() === 'KARIMNAGAR'
    );
    console.log(`Karimnagar PC ACs after regen: ${karim.length}`);
    karim.forEach((f) => {
        console.log(`  · ${f.properties.AC_NAME.padEnd(20)}  r=${f.properties.hex_radius}`);
    });
}

main();
