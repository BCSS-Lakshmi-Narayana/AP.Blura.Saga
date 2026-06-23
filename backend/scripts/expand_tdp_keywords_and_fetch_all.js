/**
 * expand_tdp_keywords_and_fetch_all.js
 * ─────────────────────────────────────────────────────────────────────
 * Round 2 of ingestion: broadens the keyword set to scrape much more
 * TDP-relevant content, then runs `fetchKeywordGrievances(null)` so all
 * four platforms (FB, IG, YT, X) get hit, not just X.
 *
 *   node backend/scripts/expand_tdp_keywords_and_fetch_all.js          # seed only
 *   node backend/scripts/expand_tdp_keywords_and_fetch_all.js --fetch  # seed + fetch
 *   node backend/scripts/expand_tdp_keywords_and_fetch_all.js --fetch --platform x
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');

const Keyword = require('../src/models/Keyword');

const RUN_FETCH = process.argv.includes('--fetch');
const platformArgIdx = process.argv.indexOf('--platform');
const PLATFORM = platformArgIdx >= 0 ? process.argv[platformArgIdx + 1] : null;

// Broad TDP / Andhra Pradesh political vocabulary. Mixing English, Telugu
// transliterations, hashtags, handles, scheme names, and AP-specific themes
// so the keyword fetch hits as much content as possible across all platforms.
const KEYWORDS = [
    // Senior TDP leadership
    'Yanamala Ramakrishnudu', 'Yanamala',
    'Ashok Gajapathi Raju', 'Gajapathi Raju',
    'Kollu Ravindra', 'Ravula Sridhar Reddy',
    'Atchannaidu', 'Kinjarapu Atchannaidu',
    'Devineni Uma', 'Payyavula Keshav',
    'Anagani Satya Prasad', 'Nara Bhuvaneswari', 'Bhuvaneshwari',
    'Yarlagadda Lakshmi Prasad',
    'Nara Brahmani',

    // Cabinet ministers (TDP/NDA in AP 2024 government)
    'Lokesh Nara minister', 'IT Minister AP',
    'Information Technology Minister Andhra Pradesh',

    // Coalition / BJP-AP figures often tagged with TDP
    'Daggubati Purandeswari', 'Purandeswari',
    'Somu Veerraju',
    'Kanna Lakshminarayana',

    // JSP / Pawan Kalyan ecosystem
    'Nadendla Manohar', 'Konidela Pawan',
    '#JaiPawanKalyan', '#JSP', '#JanaSenani',
    'Jana Senani', 'JaiSenani',

    // Party tokens & coalition
    'NDA AP', 'NDA Andhra Pradesh', 'BJP Andhra',
    'CMOAndhraPradesh', '@CMOAndhraPradesh',
    '@JaiTDP', '@TDPMP', '@TDPVijayawada',

    // Government schemes & flagship programs
    'Pasupu Kumkuma', 'Anna Canteen', 'Annadata Sukhibhava',
    'Talliki Vandanam', 'Adarsana', 'Super Six',
    'Skill Development Andhra Pradesh',
    'Free RTC bus women', 'Mega DSC',
    'Land Titling Act repeal', 'AP Job Calendar',

    // Major AP cities & political hotspots
    'Vijayawada', 'Visakhapatnam', 'Guntur',
    'Tirupati', 'Kakinada', 'Rajahmundry', 'Nellore',
    'Anantapur', 'Kurnool', 'Kadapa', 'Eluru',
    'Srikakulam', 'Vizianagaram', 'Ongole', 'Chittoor',

    // Key issue/agenda themes
    'Amaravati Capital', 'Polavaram',
    'Land Acquisition Amaravati',
    'AP State Capital',
    'Special Status Andhra',
    'Reverse Brain Drain',
    'AP Industries', 'AP Investments',

    // Telugu language tokens (transliterated for X/IG search)
    'చంద్రబాబు', 'నారా లోకేష్', 'పవన్ కల్యాణ్',
    'తెలుగుదేశం', 'జనసేన', 'అమరావతి',
    'ఎన్డీఏ', 'ఏపీ సీఎం',

    // Hashtag-heavy political clusters
    '#AmaravatiCapital', '#TeluguDesam', '#TeluguDesamParty',
    '#NDAAndhraPradesh', '#NDAAndhraPradeshGovt',
    '#TeamCBN', '#TeamLokesh', '#TeamPawanKalyan',
    '#Pithapuram', '#Kuppam', '#Mangalagiri',
    '#AndhraPradeshPolitics', '#APPolitics',
    '#APGovernment', '#APCM',

    // Opposition (so we still catch attacks against TDP/CBN)
    'YSRCP', 'Jagan Mohan Reddy', 'YS Jagan', '@ysjagan',
    'YSR Congress', 'PSR', 'Jagan Reddy',
    '#YSRCP', '#JaganReddy',
];

async function upsertKeywords() {
    let added = 0, reactivated = 0, kept = 0;
    for (const raw of KEYWORDS) {
        const kw = String(raw).trim();
        if (!kw) continue;
        let kind = 'keyword';
        if (kw.startsWith('@')) kind = 'handle';
        else if (kw.startsWith('#')) kind = 'hashtag';

        const existing = await Keyword.findOne({ keyword: kw, kind });
        if (existing) {
            if (!existing.is_active) {
                existing.is_active = true;
                await existing.save();
                reactivated += 1;
            } else {
                kept += 1;
            }
            continue;
        }
        await Keyword.create({
            keyword: kw,
            kind,
            category: 'other',
            language: 'all',
            is_party_wide: true,
            is_active: true,
            owner_user_id: 'system_seed',
            weight: 3,
        });
        added += 1;
    }
    return { added, reactivated, kept };
}

async function main() {
    if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI missing');
    const dbName = process.env.DB_NAME ? String(process.env.DB_NAME).trim() : undefined;
    await mongoose.connect(process.env.MONGODB_URI, dbName ? { dbName } : undefined);
    console.log(`[expand] connected (db=${dbName || 'default'})`);

    const summary = await upsertKeywords();
    console.log('[expand] keywords:', summary);
    const total = await Keyword.countDocuments({ is_active: true });
    console.log('[expand] active keywords total:', total);

    if (RUN_FETCH) {
        const grievanceService = require('../src/services/grievanceService');
        console.log(`[expand] running fetchKeywordGrievances(${PLATFORM ? `'${PLATFORM}'` : 'null /* ALL platforms */'})`);
        const t0 = Date.now();
        try {
            const result = await grievanceService.fetchKeywordGrievances(PLATFORM);
            console.log('[expand] fetch result:', result, 'ms:', Date.now() - t0);
        } catch (err) {
            console.error('[expand] fetch failed:', err.message);
        }
    } else {
        console.log('[expand] (skip fetch — re-run with --fetch to pull content immediately)');
    }

    await mongoose.disconnect();
    console.log('[expand] done');
}

main().catch((err) => { console.error('[expand] failed:', err); process.exit(1); });
