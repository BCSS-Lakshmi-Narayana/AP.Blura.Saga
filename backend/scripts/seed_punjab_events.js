/**
 * seed_punjab_events.js
 * Seeds Punjab-relevant events into the Events collection.
 * Run: node scripts/seed_punjab_events.js
 */
require('dotenv').config();
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.DB_NAME || 'punjab-government';

if (!MONGODB_URI) {
  console.error('❌  MONGODB_URI not set in .env');
  process.exit(1);
}

// ──────────────────────────────────────────────────────────────────────────────
// Inline minimal schema so the script doesn't depend on compiled models
// ──────────────────────────────────────────────────────────────────────────────
const { v4: uuidv4 } = require('uuid');

const eventKeywordSchema = new mongoose.Schema(
  { keyword: String, language: { type: String, default: 'all' } },
  { _id: false }
);

const eventSchema = new mongoose.Schema({
  id:          { type: String, default: uuidv4, unique: true },
  name:        { type: String, required: true },
  description: { type: String, default: '' },
  start_date:  { type: Date },
  end_date:    { type: Date },
  location:    { type: String, default: '' },
  keywords:    { type: [eventKeywordSchema], default: [] },
  platforms:   { type: [String], default: ['youtube', 'x', 'facebook', 'instagram'] },
  status:      { type: String, default: 'active' },
  auto_archive:{ type: Boolean, default: false },
  origin:      { type: String, default: 'manual' },
  created_by:  { type: String, default: 'seed_script' },
  created_at:  { type: Date, default: Date.now },
  updated_at:  { type: Date, default: Date.now },
  report_pdf_url: { type: String, default: null }
});

const Event = mongoose.models.Event || mongoose.model('Event', eventSchema);

// ──────────────────────────────────────────────────────────────────────────────
// Punjab Event Data — 10 real ongoing / upcoming events
// ──────────────────────────────────────────────────────────────────────────────
const now = new Date();
const d = (offsetDays) => {
  const dt = new Date(now);
  dt.setDate(dt.getDate() + offsetDays);
  return dt;
};

const EVENTS = [
  {
    name: 'Punjab Budget Session 2025-26',
    description: 'Annual budget session of Punjab Vidhan Sabha presenting the state budget for fiscal year 2025-26.',
    location: 'Punjab Vidhan Sabha, Chandigarh',
    start_date: d(-5),
    end_date: d(10),
    keywords: [
      { keyword: 'Punjab Budget', language: 'en' },
      { keyword: 'Punjab Vidhan Sabha', language: 'en' },
      { keyword: 'ਪੰਜਾਬ ਬਜਟ', language: 'hi' },
      { keyword: '#PunjabBudget2025', language: 'en' },
      { keyword: 'AAP Budget Punjab', language: 'en' },
      { keyword: 'Bhagwant Mann Budget', language: 'en' },
    ],
    platforms: ['youtube', 'x', 'facebook', 'instagram'],
  },
  {
    name: 'Anti-Drug Campaign Punjab',
    description: "Government's ongoing state-wide anti-narcotics drive targeting drug trafficking networks across Punjab districts.",
    location: 'Punjab (State-wide)',
    start_date: d(-30),
    end_date: d(30),
    keywords: [
      { keyword: 'Punjab anti drug', language: 'en' },
      { keyword: 'Drug Free Punjab', language: 'en' },
      { keyword: '#DrugFreePunjab', language: 'en' },
      { keyword: 'ਨਸ਼ਾ ਮੁਕਤ ਪੰਜਾਬ', language: 'hi' },
      { keyword: 'Punjab narcotics', language: 'en' },
      { keyword: 'Punjab police drug raid', language: 'en' },
    ],
    platforms: ['youtube', 'x', 'facebook', 'instagram'],
  },
  {
    name: 'Bhagat Singh Jayanti Celebrations',
    description: 'State celebrations marking the birth anniversary of Shaheed Bhagat Singh across Punjab.',
    location: 'Khatkar Kalan, SBS Nagar, Punjab',
    start_date: d(-2),
    end_date: d(3),
    keywords: [
      { keyword: 'Bhagat Singh Jayanti', language: 'en' },
      { keyword: 'Shaheed Bhagat Singh', language: 'en' },
      { keyword: '#BhagatSingh', language: 'en' },
      { keyword: 'ਭਗਤ ਸਿੰਘ ਜਨਮ ਦਿਵਸ', language: 'hi' },
      { keyword: 'Khatkar Kalan', language: 'en' },
    ],
    platforms: ['youtube', 'x', 'facebook'],
  },
  {
    name: 'Punjab Farmers Protest Monitoring',
    description: 'Monitoring social media sentiment around ongoing farmer-related protests and agitations in Punjab.',
    location: 'Amritsar, Ludhiana, Patiala',
    start_date: d(-15),
    end_date: d(20),
    keywords: [
      { keyword: 'Punjab farmers protest', language: 'en' },
      { keyword: 'ਕਿਸਾਨ ਅੰਦੋਲਨ', language: 'hi' },
      { keyword: '#KisanAndolan', language: 'en' },
      { keyword: 'Punjab kisan', language: 'en' },
      { keyword: 'SKM Punjab', language: 'en' },
      { keyword: 'MSP Punjab', language: 'en' },
    ],
    platforms: ['youtube', 'x', 'facebook', 'instagram'],
  },
  {
    name: 'Guru Nanak Dev Ji Gurpurab',
    description: 'State celebrations of Guru Nanak Dev Ji Gurpurab — Sikh religious festival across Punjab.',
    location: 'Amritsar, Anandpur Sahib, Punjab',
    start_date: d(-1),
    end_date: d(4),
    keywords: [
      { keyword: 'Guru Nanak Jayanti', language: 'en' },
      { keyword: 'Gurpurab', language: 'en' },
      { keyword: '#GuruNanakJayanti', language: 'en' },
      { keyword: 'ਗੁਰੂ ਨਾਨਕ ਜਯੰਤੀ', language: 'hi' },
      { keyword: 'Waheguru', language: 'en' },
      { keyword: 'Golden Temple Amritsar', language: 'en' },
    ],
    platforms: ['youtube', 'x', 'facebook', 'instagram'],
  },
  {
    name: 'Punjab Police Recruitment Drive 2025',
    description: 'Monitoring social media coverage of Punjab Police Sub-Inspector and Constable recruitment drives.',
    location: 'Punjab (State-wide)',
    start_date: d(-10),
    end_date: d(25),
    keywords: [
      { keyword: 'Punjab Police Recruitment 2025', language: 'en' },
      { keyword: 'Punjab SI recruitment', language: 'en' },
      { keyword: '#PunjabPoliceJobs', language: 'en' },
      { keyword: 'ਪੰਜਾਬ ਪੁਲਿਸ ਭਰਤੀ', language: 'hi' },
      { keyword: 'PPSC Punjab', language: 'en' },
    ],
    platforms: ['youtube', 'x', 'facebook'],
  },
  {
    name: 'AAP Punjab Government Anniversary',
    description: "Monitoring coverage of AAP-led Punjab government's third-year anniversary events and programme launches.",
    location: 'Chandigarh, Punjab',
    start_date: d(-3),
    end_date: d(5),
    keywords: [
      { keyword: 'AAP Punjab government', language: 'en' },
      { keyword: 'Bhagwant Mann government', language: 'en' },
      { keyword: '#AAPPunjab', language: 'en' },
      { keyword: 'ਆਮ ਆਦਮੀ ਪਾਰਟੀ ਪੰਜਾਬ', language: 'hi' },
      { keyword: 'Punjab CM Bhagwant Mann', language: 'en' },
    ],
    platforms: ['youtube', 'x', 'facebook', 'instagram'],
  },
  {
    name: 'Ludhiana Industrial Summit 2025',
    description: 'Monitoring coverage of trade fair and industrial summit in Ludhiana to boost Punjab economy.',
    location: 'Ludhiana, Punjab',
    start_date: d(2),
    end_date: d(7),
    keywords: [
      { keyword: 'Ludhiana Industrial Summit', language: 'en' },
      { keyword: 'Punjab Industry', language: 'en' },
      { keyword: '#LudhianaIndustry', language: 'en' },
      { keyword: 'Punjab investment', language: 'en' },
      { keyword: 'Made in Punjab', language: 'en' },
    ],
    platforms: ['youtube', 'x', 'facebook'],
  },
  {
    name: 'Punjab Bypoll Elections 2025',
    description: 'Monitoring social media coverage and sentiment around Punjab by-elections in multiple constituencies.',
    location: 'Punjab (Multiple Constituencies)',
    start_date: d(-7),
    end_date: d(14),
    keywords: [
      { keyword: 'Punjab bypoll', language: 'en' },
      { keyword: 'Punjab by-elections 2025', language: 'en' },
      { keyword: '#PunjabElections', language: 'en' },
      { keyword: 'ਪੰਜਾਬ ਉਪ ਚੋਣ', language: 'hi' },
      { keyword: 'Punjab ECI', language: 'en' },
      { keyword: 'Punjab voting', language: 'en' },
    ],
    platforms: ['youtube', 'x', 'facebook', 'instagram'],
  },
  {
    name: 'Baisakhi Festival Punjab 2025',
    description: 'Monitoring sentiment and coverage of Baisakhi festival celebrations across Punjab — major cultural event.',
    location: 'Amritsar, Anandpur Sahib, Punjab',
    start_date: d(5),
    end_date: d(10),
    keywords: [
      { keyword: 'Baisakhi 2025', language: 'en' },
      { keyword: 'Vaisakhi Punjab', language: 'en' },
      { keyword: '#Baisakhi2025', language: 'en' },
      { keyword: 'ਵਿਸਾਖੀ', language: 'hi' },
      { keyword: 'Baisakhi Amritsar', language: 'en' },
      { keyword: 'Punjab harvest festival', language: 'en' },
    ],
    platforms: ['youtube', 'x', 'facebook', 'instagram'],
  },
];

// ──────────────────────────────────────────────────────────────────────────────
async function main() {
  const conn = await mongoose.connect(MONGODB_URI, { dbName: DB_NAME });
  console.log(`✅  Connected to MongoDB: ${DB_NAME}`);

  let inserted = 0;
  let skipped = 0;

  for (const ev of EVENTS) {
    const existing = await Event.findOne({ name: ev.name });
    if (existing) {
      console.log(`  ⏭   Skip (already exists): ${ev.name}`);
      skipped++;
      continue;
    }

    await Event.create({ ...ev, id: uuidv4() });
    console.log(`  ✅  Created: ${ev.name}`);
    inserted++;
  }

  console.log(`\n🎉  Done — ${inserted} events inserted, ${skipped} skipped.`);
  await conn.disconnect();
}

main().catch((err) => {
  console.error('❌  Seed failed:', err.message);
  process.exit(1);
});
