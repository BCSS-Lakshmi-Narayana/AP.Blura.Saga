/**
 * seed_constituency_master.js
 * ─────────────────────────────────────────────────────────────────────
 * Seeds the ConstituencyMaster collection with:
 *   • All 175 ACs from ap_mlas.json (canonical name, MLA name + party)
 *   • LS seat mapping from ls_to_ac.json
 *   • A best-effort AC → district mapping (built from the known
 *     LS-seat / district correspondence; districts with no clean 1:1 map
 *     are left null for the admin to fill via the API or admin UI)
 *   • Curated mandals / villages / aliases / keywords for the high-traffic
 *     ACs that the auto-routing engine demos against (Tirupati first —
 *     "Road near Alipiri is damaged" → must route to TIRUPATI)
 *
 * Idempotent: re-running updates names + party + LS + district but does
 * NOT clobber any mandals / villages / keywords the admin has already
 * customised through the API (use --replace to force overwrite).
 *
 *   node backend/scripts/seed_constituency_master.js
 *   node backend/scripts/seed_constituency_master.js --replace
 *   node backend/scripts/seed_constituency_master.js --dry-run
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');

const ConstituencyMaster = require('../src/models/ConstituencyMaster');
const AP_MLAS = require('../src/data/ap_mlas.json');
const LS_TO_AC = require('../src/data/ls_to_ac.json');

const normKey = (v) => String(v || '').toLowerCase()
    .replace(/\([^)]*\)/g, ' ')
    .replace(/[^a-z0-9]+/g, '').trim();

/* ─── LS slug → district  (the LS seat is named after its anchor district
       in AP; this is the best deterministic map without external data) ─ */
const LS_TO_DISTRICT = {
    amalapuram:      'Dr. B.R. Ambedkar Konaseema',
    anakapalli:      'Anakapalli',
    anantapur:       'Anantapur',
    araku:           'Alluri Sitharama Raju',
    bapatla:         'Bapatla',
    chittoor:        'Chittoor',
    eluru:           'Eluru',
    guntur:          'Guntur',
    hindupur:        'Sri Sathya Sai',
    kadapa:          'YSR Kadapa',
    kakinada:        'Kakinada',
    kurnool:         'Kurnool',
    machilipatnam:   'Krishna',
    nandyal:         'Nandyal',
    narasapuram:     'West Godavari',
    narasaraopet:    'Palnadu',
    nellore:         'Sri Potti Sriramulu Nellore',
    ongole:          'Prakasam',
    rajahmundry:     'East Godavari',
    rajampet:        'Annamayya',
    srikakulam:      'Srikakulam',
    tirupati:        'Tirupati',
    vijayawada:      'NTR',
    visakhapatnam:   'Visakhapatnam',
    vizianagaram:    'Vizianagaram',
};

/* ─── Reverse: AC → LS  (built from ls_to_ac.json) ───────────────── */
const AC_TO_LS = (() => {
    const map = {};
    for (const [ls, acs] of Object.entries(LS_TO_AC)) {
        for (const ac of acs) map[normKey(ac)] = ls;
    }
    return map;
})();

/* ─── Curated mandals / villages / keywords per AC ───────────────── *
 * Initial set covers the user's running example (TIRUPATI) plus the
 * top-traffic political ACs. Admin can extend via the bulk-import API
 * (POST /api/admin/constituency-master/bulk).
 */
const CURATED = {
    TIRUPATI: {
        mandals: [
            { name: 'Tirupati Urban',        aliases: ['Tirupathi Urban', 'తిరుపతి అర్బన్'] },
            { name: 'Tirupati Rural',        aliases: ['Tirupathi Rural'] },
            { name: 'Renigunta',             aliases: ['Renigunta Mandal', 'రేణిగుంట'] },
            { name: 'Chandragiri',           aliases: ['చంద్రగిరి'] },
        ],
        villages: [
            { name: 'Alipiri',               aliases: ['Alipiri Footpath', 'Alipiri Mettu', 'అలిపిరి'] },
            { name: 'Tirumala',              aliases: ['Tirumala Hills', 'TTD', 'తిరుమల'] },
            { name: 'Padmavathi Nagar',      aliases: ['Padmavati Nagar'] },
            { name: 'Korlagunta',            aliases: [] },
            { name: 'K T Road',              aliases: ['K.T.Road', 'KT Road'] },
            { name: 'Bairagi Patteda',       aliases: [] },
            { name: 'Renigunta Airport',     aliases: ['Tirupati Airport'] },
            { name: 'SV University',         aliases: ['Sri Venkateswara University', 'SVU'] },
        ],
        keywords: [
            'TTD', 'Tirumala', '#tirupati', '#TTD', 'Padmavathi',
            'Govindaraja Swamy', 'Bhumana Karunakar Reddy',
            'Padalu Mokku', 'Sapthagiri', 'Tirupati Laddu',
        ],
    },
    VIJAYAWADA_CENTRAL: {
        mandals: [
            { name: 'Vijayawada Central',    aliases: ['VJW Central'] },
        ],
        villages: [
            { name: 'Benz Circle',           aliases: [] },
            { name: 'MG Road',               aliases: ['M.G.Road', 'Mahatma Gandhi Road'] },
            { name: 'Eluru Road',            aliases: [] },
        ],
        keywords: ['VJW', 'Vijayawada', 'Bezawada', '#vijayawada'],
    },
    MANGALAGIRI: {
        mandals: [
            { name: 'Mangalagiri',           aliases: ['మంగళగిరి'] },
            { name: 'Tadepalli',             aliases: [] },
        ],
        villages: [
            { name: 'Amaravati',             aliases: ['Amaravathi', 'AP Capital', 'అమరావతి'] },
            { name: 'Tullur',                aliases: [] },
            { name: 'Velagapudi',            aliases: ['AP Secretariat'] },
            { name: 'Nara Lokesh',           aliases: ['Lokesh'] },
        ],
        keywords: ['Amaravati', 'AP Capital', 'Nara Lokesh', '#amaravati', '#mangalagiri'],
    },
    GUNTUR_EAST: {
        mandals: [
            { name: 'Guntur East',           aliases: [] },
        ],
        villages: [
            { name: 'Brodipet',              aliases: [] },
            { name: 'Lakshmipuram',          aliases: [] },
        ],
        keywords: ['Guntur', '#guntur'],
    },
    TENALI: {
        mandals: [
            { name: 'Tenali',                aliases: ['తెనాలి'] },
        ],
        villages: [
            { name: 'Tenali Town',           aliases: [] },
        ],
        keywords: ['Tenali', '#tenali'],
    },
    VISAKHAPATNAM_NORTH: {
        mandals: [
            { name: 'Visakhapatnam North',   aliases: ['Vizag North'] },
        ],
        villages: [
            { name: 'MVP Colony',            aliases: [] },
            { name: 'Madhurawada',           aliases: [] },
        ],
        keywords: ['Vizag', 'Visakhapatnam', '#vizag', '#visakhapatnam'],
    },
    KUPPAM: {
        mandals: [
            { name: 'Kuppam',                aliases: ['కుప్పం'] },
            { name: 'Gudipalle',             aliases: [] },
            { name: 'Ramakuppam',            aliases: [] },
            { name: 'Santhipuram',           aliases: [] },
        ],
        villages: [
            { name: 'Chandrababu Naidu',     aliases: ['CBN', 'N. Chandrababu Naidu'] },
        ],
        keywords: ['Kuppam', 'CBN', 'Chandrababu', '#kuppam', '#cbn'],
    },
};

/* ─── builder ────────────────────────────────────────────────────── */

// Normalise CURATED keys to ac_key (e.g. 'VIJAYAWADA_CENTRAL' → 'vijayawadacentral')
const CURATED_BY_KEY = Object.fromEntries(
    Object.entries(CURATED).map(([k, v]) => [normKey(k), v])
);

const buildRow = (mla) => {
    const acName = String(mla.constituency || '').trim().toUpperCase();
    const acKey = normKey(acName);
    const ls = AC_TO_LS[acKey] || null;
    const district = ls ? (LS_TO_DISTRICT[ls] || null) : null;
    const curated = CURATED_BY_KEY[acKey] || {};
    return {
        ac_name: acName,
        ac_key:  acKey,
        district,
        district_key:  district ? normKey(district) : null,
        lok_sabha:     ls,
        lok_sabha_key: ls ? normKey(ls) : null,
        mla_name:  mla.mla   || null,
        mla_party: mla.party || null,
        mp_name:   null,
        mp_party:  null,
        mandals:   curated.mandals  || [],
        villages:  curated.villages || [],
        keywords:  curated.keywords || [],
        is_active: true,
    };
};

/* ─── main ───────────────────────────────────────────────────────── */

const main = async () => {
    const argv = process.argv.slice(2);
    const replace = argv.includes('--replace');
    const dryRun  = argv.includes('--dry-run');

    const seeds = [];
    const seen = new Set();
    for (const mla of AP_MLAS) {
        const row = buildRow(mla);
        if (seen.has(row.ac_key)) continue;
        seen.add(row.ac_key);
        seeds.push(row);
    }

    console.log(`\n╔═══════════════════════════════════════════════════════════╗`);
    console.log(`║  SEED · ConstituencyMaster                                ║`);
    console.log(`║  ACs: ${String(seeds.length).padStart(3)}    mode: ${(replace ? 'REPLACE' : 'MERGE  ').padEnd(8)}${dryRun ? '  (DRY-RUN)' : ''}     ║`);
    console.log(`╚═══════════════════════════════════════════════════════════╝\n`);

    if (dryRun) {
        const sample = seeds.find((s) => s.ac_name === 'TIRUPATI') || seeds[0];
        console.log('Sample (TIRUPATI):', JSON.stringify(sample, null, 2));
        process.exit(0);
    }

    const uri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/blura';
    const dbName = process.env.DB_NAME ? String(process.env.DB_NAME).trim() : undefined;
    await mongoose.connect(uri, dbName ? { dbName } : undefined);

    let created = 0, updated = 0, errors = 0;
    try {
        for (const seed of seeds) {
            try {
                const existing = await ConstituencyMaster.findOne({ ac_key: seed.ac_key });
                if (existing) {
                    // MERGE mode: keep admin-edited mandals/villages/keywords/mp_name
                    // unless --replace is passed.
                    const patch = {
                        ac_name: seed.ac_name,
                        district: existing.district || seed.district,
                        district_key: existing.district_key || seed.district_key,
                        lok_sabha: seed.lok_sabha || existing.lok_sabha,
                        lok_sabha_key: seed.lok_sabha_key || existing.lok_sabha_key,
                        mla_name: seed.mla_name,
                        mla_party: seed.mla_party,
                        updated_at: new Date(),
                    };
                    if (replace) {
                        patch.mandals  = seed.mandals;
                        patch.villages = seed.villages;
                        patch.keywords = seed.keywords;
                    } else {
                        if ((existing.mandals  || []).length === 0 && seed.mandals.length  > 0) patch.mandals  = seed.mandals;
                        if ((existing.villages || []).length === 0 && seed.villages.length > 0) patch.villages = seed.villages;
                        if ((existing.keywords || []).length === 0 && seed.keywords.length > 0) patch.keywords = seed.keywords;
                    }
                    await ConstituencyMaster.updateOne({ ac_key: seed.ac_key }, { $set: patch });
                    updated += 1;
                } else {
                    seed.created_at = new Date();
                    seed.updated_at = new Date();
                    await ConstituencyMaster.create(seed);
                    created += 1;
                }
            } catch (err) {
                errors += 1;
                console.error(`  ✖ ${seed.ac_name}: ${err.message}`);
            }
        }
    } finally {
        await mongoose.disconnect();
    }

    console.log(`\n┌─ SUMMARY ────────────────┐`);
    console.log(`│  created : ${String(created).padStart(5)}         │`);
    console.log(`│  updated : ${String(updated).padStart(5)}         │`);
    console.log(`│  errors  : ${String(errors).padStart(5)}         │`);
    console.log(`└──────────────────────────┘\n`);

    console.log(`Curated coverage:`);
    for (const acName of Object.keys(CURATED)) {
        const c = CURATED[acName];
        console.log(`  ${acName.padEnd(22)} mandals=${(c.mandals||[]).length} villages=${(c.villages||[]).length} keywords=${(c.keywords||[]).length}`);
    }
    console.log('');
    process.exit(errors === 0 ? 0 : 1);
};

main().catch((err) => { console.error('[seed] crashed:', err); process.exit(1); });
