/**
 * seed_tdp_keywords_and_fetch.js
 * ─────────────────────────────────────────────────────────────────────
 * One-shot bootstrap to get the ingestion pipeline producing TDP-relevant
 * content. Inserts:
 *   • Keyword rows  — names, hashtags, party tokens, regional themes
 *   • Source rows   — official handles to monitor (CBN, Lokesh, Pawan Kalyan,
 *                     JSP, TDP, etc.) across X / Facebook / Instagram /
 *                     YouTube. Idempotent — re-running is safe.
 *
 * Then, when invoked with --fetch, calls grievanceService.fetchKeywordGrievances('x')
 * to do an immediate pull instead of waiting for the 10-min scheduler tick.
 *
 *   node backend/scripts/seed_tdp_keywords_and_fetch.js
 *   node backend/scripts/seed_tdp_keywords_and_fetch.js --fetch
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');

const Keyword = require('../src/models/Keyword');
const Source = require('../src/models/Source');

const RUN_FETCH = process.argv.includes('--fetch');

const KEYWORDS = [
    // Primary political figures — kind:'keyword' so text search hits them.
    { keyword: 'Chandrababu Naidu',   kind: 'keyword', category: 'other', language: 'all' },
    { keyword: 'Chandrababu',         kind: 'keyword', category: 'other', language: 'all' },
    { keyword: 'CBN',                 kind: 'keyword', category: 'other', language: 'all' },
    { keyword: 'Nara Lokesh',         kind: 'keyword', category: 'other', language: 'all' },
    { keyword: 'Lokesh Nara',         kind: 'keyword', category: 'other', language: 'all' },
    { keyword: 'Pawan Kalyan',        kind: 'keyword', category: 'other', language: 'all' },
    { keyword: 'Deputy CM Pawan',     kind: 'keyword', category: 'other', language: 'all' },

    // Parties / coalitions
    { keyword: 'TDP',                 kind: 'keyword', category: 'other', language: 'all' },
    { keyword: 'Telugu Desam',        kind: 'keyword', category: 'other', language: 'all' },
    { keyword: 'Telugu Desam Party',  kind: 'keyword', category: 'other', language: 'all' },
    { keyword: 'Jana Sena',           kind: 'keyword', category: 'other', language: 'all' },
    { keyword: 'JSP',                 kind: 'keyword', category: 'other', language: 'all' },
    { keyword: 'NDA Andhra',          kind: 'keyword', category: 'other', language: 'all' },

    // Handles (kind:'handle' so ingestion knows to match a username)
    { keyword: '@ncbn',               kind: 'handle',  category: 'other', language: 'all' },
    { keyword: '@naralokesh',         kind: 'handle',  category: 'other', language: 'all' },
    { keyword: '@PawanKalyan',        kind: 'handle',  category: 'other', language: 'all' },
    { keyword: '@JaiTDP',             kind: 'handle',  category: 'other', language: 'all' },
    { keyword: '@JanaSenaParty',      kind: 'handle',  category: 'other', language: 'all' },

    // Hashtags
    { keyword: '#TDP',                kind: 'hashtag', category: 'other', language: 'all' },
    { keyword: '#CBN',                kind: 'hashtag', category: 'other', language: 'all' },
    { keyword: '#Chandrababu',        kind: 'hashtag', category: 'other', language: 'all' },
    { keyword: '#NaraLokesh',         kind: 'hashtag', category: 'other', language: 'all' },
    { keyword: '#PawanKalyan',        kind: 'hashtag', category: 'other', language: 'all' },
    { keyword: '#JanaSena',           kind: 'hashtag', category: 'other', language: 'all' },

    // Regional / agenda themes the TDP camp consistently engages with.
    { keyword: 'Amaravati',           kind: 'keyword', category: 'other', language: 'all' },
    { keyword: 'AP CM',               kind: 'keyword', category: 'other', language: 'all' },
    { keyword: 'Andhra Pradesh CM',   kind: 'keyword', category: 'other', language: 'all' },
    { keyword: 'TDP Bharosa',         kind: 'keyword', category: 'other', language: 'all' },
];

const SOURCES = [
    { platform: 'x',         identifier: '@ncbn',           display_name: 'N Chandrababu Naidu',     category: 'political' },
    { platform: 'x',         identifier: '@naralokesh',     display_name: 'Nara Lokesh',             category: 'political' },
    { platform: 'x',         identifier: '@PawanKalyan',    display_name: 'Pawan Kalyan',            category: 'political' },
    { platform: 'x',         identifier: '@JaiTDP',         display_name: 'TDP (Official)',          category: 'political' },
    { platform: 'x',         identifier: '@JanaSenaParty',  display_name: 'Jana Sena Party',         category: 'political' },
    { platform: 'instagram', identifier: 'ncbn',            display_name: 'N Chandrababu Naidu',     category: 'political' },
    { platform: 'instagram', identifier: 'naralokesh',      display_name: 'Nara Lokesh',             category: 'political' },
    { platform: 'instagram', identifier: 'pawankalyan',     display_name: 'Pawan Kalyan',            category: 'political' },
    { platform: 'facebook',  identifier: 'NCBNOfficial',    display_name: 'N Chandrababu Naidu',     category: 'political' },
    { platform: 'facebook',  identifier: 'naralokesh',      display_name: 'Nara Lokesh',             category: 'political' },
    { platform: 'facebook',  identifier: 'PawanKalyan',     display_name: 'Pawan Kalyan',            category: 'political' },
    { platform: 'youtube',   identifier: '@TDPOfficialAP',  display_name: 'TDP Official',            category: 'political' },
    { platform: 'youtube',   identifier: '@JanaSenaParty',  display_name: 'Jana Sena Party',         category: 'political' },
];

async function upsertKeywords() {
    let added = 0, kept = 0;
    for (const k of KEYWORDS) {
        const existing = await Keyword.findOne({ keyword: k.keyword, kind: k.kind });
        if (existing) {
            if (!existing.is_active) {
                existing.is_active = true;
                await existing.save();
            }
            kept += 1;
            continue;
        }
        await Keyword.create({
            ...k,
            is_party_wide: true,
            is_active: true,
            owner_user_id: 'system_seed',
            weight: 5,
        });
        added += 1;
    }
    return { added, kept };
}

async function upsertSources() {
    let added = 0, kept = 0;
    for (const s of SOURCES) {
        const existing = await Source.findOne({ platform: s.platform, identifier: s.identifier });
        if (existing) {
            if (!existing.is_active) {
                existing.is_active = true;
                await existing.save();
            }
            kept += 1;
            continue;
        }
        try {
            await Source.create({ ...s, created_by: 'system_seed', is_active: true });
            added += 1;
        } catch (err) {
            if (err.code !== 11000) console.warn(`source ${s.identifier} insert failed:`, err.message);
        }
    }
    return { added, kept };
}

async function main() {
    if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI missing');
    const dbName = process.env.DB_NAME ? String(process.env.DB_NAME).trim() : undefined;
    await mongoose.connect(process.env.MONGODB_URI, dbName ? { dbName } : undefined);
    console.log(`[seed-tdp] connected (db=${dbName || 'default'})`);

    const kwSummary  = await upsertKeywords();
    const srcSummary = await upsertSources();
    console.log('[seed-tdp] keywords:', kwSummary);
    console.log('[seed-tdp] sources :', srcSummary);

    if (RUN_FETCH) {
        const grievanceService = require('../src/services/grievanceService');
        console.log('[seed-tdp] running fetchKeywordGrievances("x") — this hits RapidAPI for every keyword variant…');
        const t0 = Date.now();
        try {
            const result = await grievanceService.fetchKeywordGrievances('x');
            console.log('[seed-tdp] X fetch result:', result, 'ms:', Date.now() - t0);
        } catch (err) {
            console.error('[seed-tdp] X fetch failed:', err.message);
        }
    } else {
        console.log('[seed-tdp] (skip fetch — re-run with --fetch to pull content immediately)');
    }

    await mongoose.disconnect();
    console.log('[seed-tdp] done');
}

main().catch((err) => {
    console.error('[seed-tdp] failed:', err);
    process.exit(1);
});
