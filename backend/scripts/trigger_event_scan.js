/**
 * trigger_event_scan.js
 * Updates all events to use only X (working) platform and triggers a scan.
 * Run: node scripts/trigger_event_scan.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const path = require('path');

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.DB_NAME || 'punjab-government';

if (!MONGODB_URI) { console.error('❌  MONGODB_URI not set'); process.exit(1); }

// Only X is confirmed working. YouTube quota is exceeded. Facebook/Instagram need separate subscriptions.
const PLATFORMS_TO_USE = ['x'];

async function main() {
  await mongoose.connect(MONGODB_URI, { dbName: DB_NAME });
  console.log(`✅  Connected to MongoDB: ${DB_NAME}\n`);

  // Use actual Event model from our source tree (so event.save() works)
  const Event = require(path.join(__dirname, '../src/models/Event'));
  const Settings = mongoose.connection.collection('settings');
  const settings = await Settings.findOne({ id: 'global_settings' });

  // Update all non-archived events to use only working platforms
  const updateResult = await Event.updateMany(
    { status: { $ne: 'archived' } },
    { $set: { platforms: PLATFORMS_TO_USE, status: 'active' } }
  );
  console.log(`🔧 Updated ${updateResult.modifiedCount} events → platforms: [${PLATFORMS_TO_USE.join(', ')}]`);
  console.log('   (YouTube quota exceeded today; Facebook/Instagram need separate RapidAPI subscriptions)\n');

  const { scanEventOnce } = require(path.join(__dirname, '../src/services/eventMonitorService'));

  // Fetch all active events as proper Mongoose docs
  const now = new Date();
  const events = await Event.find({
    status: 'active',
    $or: [
      { start_date: null, end_date: null },
      { start_date: { $lte: now }, end_date: { $gte: now } }
    ]
  });

  console.log(`📋 Found ${events.length} active events in date range\n`);

  let totalScanned = 0, totalIngested = 0, totalAlerts = 0;

  for (const event of events) {
    console.log(`\n🔍 Scanning: ${event.name}`);
    console.log(`   Location: ${event.location}`);
    console.log(`   Keywords: ${(event.keywords || []).slice(0, 3).map(k => k.keyword).join(', ')}...`);
    try {
      const result = await scanEventOnce({ event, settings });
      totalScanned += result.scanned || 0;
      totalIngested += result.ingested || 0;
      totalAlerts += result.alerts || 0;
      console.log(`   📊 Scanned: ${result.scanned} | New content: ${result.ingested} | Alerts: ${result.alerts}`);
    } catch (err) {
      console.error(`   ❌ Error: ${err.message}`);
    }
  }

  console.log(`\n══════════════════════════════════════`);
  console.log(`✅ Scan Complete!`);
  console.log(`   Total Posts Scanned : ${totalScanned}`);
  console.log(`   New Posts Ingested  : ${totalIngested}`);
  console.log(`   Alerts Raised       : ${totalAlerts}`);
  console.log(`══════════════════════════════════════\n`);

  if (totalIngested === 0 && totalScanned > 0) {
    console.log('ℹ️  All scanned content already existed in DB (no new posts this run).');
  } else if (totalScanned === 0) {
    console.log('⚠️  No posts were scanned. Check RAPIDAPI_KEY and RAPIDAPI_HOST in .env');
  }

  await mongoose.disconnect();
}

main().catch(err => { console.error('Fatal:', err.message); process.exit(1); });
