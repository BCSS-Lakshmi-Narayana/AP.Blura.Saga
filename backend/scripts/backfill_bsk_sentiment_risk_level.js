/**
 * backfill_bsk_sentiment_risk_level.js
 * ─────────────────────────────────────────────────────────────────────
 * Root-cause fix for: "positive alerts show up under Negative, negative
 * alerts show up under Positive" on the Alerts page.
 *
 * The Alerts page's Negative/Moderate/Positive pills filter on
 * Alert.risk_level (high/medium/low) — see frontend/src/pages/Alerts.js.
 * Before this fix, analysisService.js only ever ELEVATED risk_level for
 * anti_bsk stances; it never set risk_level from bsk_sentiment in the
 * other direction. So a post that was genuinely pro_bsk (good for
 * TDP/CBN) could still carry a "high" risk_level left over from Pass A's
 * generic moderation score (e.g. it mentioned violence/crime), and land
 * under "Negative". Likewise anti_bsk_indirect content could sit at
 * "medium" instead of "high".
 *
 * analysisService.js now derives risk_level directly and symmetrically
 * from llm_analysis.bsk_sentiment for every NEW analysis:
 *   negative -> high (75)   moderate -> medium (50)   positive -> low (20)
 *
 * This script re-applies that same deterministic mapping to EXISTING
 * Alert / Analysis / Content documents that already have
 * llm_analysis.bsk_sentiment stored, so already-ingested alerts get
 * reclassified into the correct bucket without re-spending LLM calls.
 * Documents with no bsk_sentiment stored (pre-dating the political
 * pipeline, or velocity/event alerts that never go through it) are left
 * untouched.
 *
 *   node backend/scripts/backfill_bsk_sentiment_risk_level.js --dry-run
 *   node backend/scripts/backfill_bsk_sentiment_risk_level.js
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');

const Alert = require('../src/models/Alert');
const Analysis = require('../src/models/Analysis');
const Content = require('../src/models/Content');

const DRY = process.argv.includes('--dry-run');

// Same bands used by analysisService.js and alertController's
// analysis-override endpoint (RISK_LEVEL_SCORE_MAP).
const BUCKET = {
    negative: { risk_level: 'high', score: 75 },
    moderate: { risk_level: 'medium', score: 50 },
    // Legacy alias saved before the neutral -> moderate migration.
    neutral: { risk_level: 'medium', score: 50 },
    positive: { risk_level: 'low', score: 20 },
};

const bucketFor = (bskSentiment) => BUCKET[bskSentiment] || BUCKET.moderate;

async function main() {
    const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
    if (!uri) throw new Error('Set MONGODB_URI in backend/.env first.');
    const dbName = process.env.DB_NAME ? String(process.env.DB_NAME).trim() : undefined;
    await mongoose.connect(uri, dbName ? { dbName } : undefined);
    console.log(`[backfill] connected to db="${mongoose.connection.db.databaseName}". dry-run=${DRY}`);

    const targets = await Alert.find({ 'llm_analysis.bsk_sentiment': { $exists: true, $ne: null } })
        .select('id content_id analysis_id risk_level llm_analysis.bsk_sentiment')
        .lean();

    console.log(`[backfill] scanning ${targets.length} alert(s) with a stored bsk_sentiment.`);

    let alertsToFix = 0;
    let analysesUpdated = 0;
    let contentsUpdated = 0;
    const byBucketChange = {};

    for (const t of targets) {
        const sentiment = t.llm_analysis && t.llm_analysis.bsk_sentiment;
        const bucket = bucketFor(sentiment);
        if (t.risk_level === bucket.risk_level) continue; // already correct

        alertsToFix += 1;
        const changeKey = `${sentiment}: ${t.risk_level} -> ${bucket.risk_level}`;
        byBucketChange[changeKey] = (byBucketChange[changeKey] || 0) + 1;

        if (DRY) continue;

        await Alert.updateOne(
            { _id: t._id },
            { $set: { risk_level: bucket.risk_level, 'threat_details.risk_score': bucket.score } }
        );
        await Alert.updateOne(
            { _id: t._id, llm_analysis: { $ne: null } },
            { $set: { 'llm_analysis.score': bucket.score } }
        );

        if (t.analysis_id) {
            const res = await Analysis.updateOne(
                { id: t.analysis_id },
                { $set: { risk_level: bucket.risk_level, risk_score: bucket.score } }
            );
            if (res.modifiedCount) analysesUpdated += 1;
            await Analysis.updateOne(
                { id: t.analysis_id, llm_analysis: { $ne: null } },
                { $set: { 'llm_analysis.score': bucket.score } }
            );
        }
        if (t.content_id) {
            const res = await Content.updateOne(
                { id: t.content_id },
                { $set: { risk_level: bucket.risk_level, risk_score: bucket.score } }
            );
            if (res.modifiedCount) contentsUpdated += 1;
        }
    }

    console.log('[backfill] bucket changes:', JSON.stringify(byBucketChange, null, 2));
    console.log('[backfill] result:', JSON.stringify({
        scanned: targets.length,
        alertsToFix,
        alertsUpdated: DRY ? 0 : alertsToFix,
        analysesUpdated: DRY ? 0 : analysesUpdated,
        contentsUpdated: DRY ? 0 : contentsUpdated,
    }, null, 2));

    await mongoose.disconnect();
    console.log('[backfill] done.');
}

main().catch((err) => {
    console.error('[backfill] failed:', err);
    process.exit(1);
});
