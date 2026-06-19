/**
 * Delete overly broad keywords that are leaking irrelevant content.
 * Run: node scripts/cleanup-broad-keywords.js
 */
require('dotenv').config();
const mongoose = require('mongoose');

const BROAD_KEYWORDS = [
  'BJP Telangana',
  '#BJP4Telangana',
  'BJPTelangana',
  'Karimnagar',
  'MP Karimnagar',
  'Karimnagar MP',
  'BSK',
  'బండి',
  '#POCSO',
  '#POCSOCASE',
  'Bandi son POCSO',
  'Bandi Bhageerath POCSO',
  'POCSO Bandi Sanjay son',
  '#Absconding',
  'Bandi son absconding',
  'Bandi Bhageerath absconding',
  '#JusticeForVictim',
  '#BetiBachao',
  'honey trap Bandi',
  'honeytrap Bandi Sanjay',
  'extortion Bandi Sanjay',
  'political hit job Bandi',
  'Bandi Sanjay resign',
  'Bandi Sanjay must resign',
  'resign Bandi Sanjay MoS',
  'arrest Bandi son',
  'SIT Bandi Sanjay',
  'CBI Bandi Sanjay',
  'Pet Basheerabad police Bandi',
  'Karimnagar police Bandi',
  'Revanth Reddy Bandi',
  'Manchu Manoj Bandi',
  'sanjayannakosam',
  '#BJP4BharatMata',
  '#BetiBachaoFromBJP',
  'bandi bageerath',
  '#bandisanjayson',
];

async function run() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/bsk-watch';
  await mongoose.connect(mongoUri);
  console.log('Connected to MongoDB');

  const Keyword = require('../src/models/Keyword');

  // Case-insensitive exact match for each broad keyword
  const result = await Keyword.deleteMany({
    keyword: { $in: BROAD_KEYWORDS.map(k => new RegExp(`^${k}$`, 'i')) }
  });

  console.log(`Deleted ${result.deletedCount} broad keywords`);

  // Show remaining keywords
  const remaining = await Keyword.find({ is_active: true }).select('keyword').lean();
  console.log(`\nRemaining ${remaining.length} keywords:`);
  remaining.forEach(k => console.log('  -', k.keyword));

  await mongoose.disconnect();
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
