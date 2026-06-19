require('dotenv').config();
const mongoose = require('mongoose');

// Usage:
//   node scripts/delete_recent_grievances.js            -> dry-run (lists what would be deleted)
//   node scripts/delete_recent_grievances.js --apply    -> actually deletes
//   node scripts/delete_recent_grievances.js --hours=2 --apply

const args = process.argv.slice(2);
const apply = args.includes('--apply');
const hoursArg = args.find(a => a.startsWith('--hours='));
const hours = hoursArg ? Number(hoursArg.split('=')[1]) : 2;

if (!Number.isFinite(hours) || hours <= 0) {
  console.error(`Invalid --hours value: ${hours}`);
  process.exit(1);
}

(async () => {
  if (!process.env.MONGODB_URI) {
    console.error('MONGODB_URI not set in .env');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI);
  const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
  console.log(`[DeleteRecent] Cutoff: ${cutoff.toISOString()} (last ${hours}h)`);
  console.log(`[DeleteRecent] Mode: ${apply ? 'APPLY (destructive)' : 'DRY-RUN'}`);

  const db = mongoose.connection.db;
  const dbs = await db.admin().listDatabases();
  let grandTotal = 0;

  for (const d of dbs.databases) {
    if (['admin', 'local', 'config'].includes(d.name)) continue;
    const conn = mongoose.connection.useDb(d.name, { useCache: false });
    const cols = await conn.db.listCollections().toArray();
    if (!cols.find(c => c.name === 'grievances')) continue;

    const filter = { detected_date: { $gte: cutoff } };
    const col = conn.db.collection('grievances');
    const count = await col.countDocuments(filter);
    if (count === 0) {
      console.log(`[${d.name}] no grievances in window`);
      continue;
    }

    // Show a small sample so you can sanity-check before applying
    const sample = await col
      .find(filter, { projection: { id: 1, complaint_code: 1, platform: 1, tagged_account: 1, detected_date: 1, _id: 0 } })
      .sort({ detected_date: -1 })
      .limit(5)
      .toArray();
    console.log(`[${d.name}] matches=${count}`);
    console.log('  sample:', sample);

    if (apply) {
      const res = await col.deleteMany(filter);
      console.log(`[${d.name}] deleted=${res.deletedCount}`);
      grandTotal += res.deletedCount;
    } else {
      grandTotal += count;
    }
  }

  console.log(`[DeleteRecent] ${apply ? 'Deleted' : 'Would delete'} ${grandTotal} grievance(s) total`);
  await mongoose.disconnect();
})().catch(e => {
  console.error(e);
  process.exit(1);
});
