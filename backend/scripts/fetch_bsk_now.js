#!/usr/bin/env node
/**
 * One-shot BSK content fetch.
 *
 *   node scripts/fetch_bsk_now.js               # all platforms
 *   node scripts/fetch_bsk_now.js x             # only X / Twitter
 *   node scripts/fetch_bsk_now.js facebook
 *   node scripts/fetch_bsk_now.js instagram
 *   node scripts/fetch_bsk_now.js youtube
 *
 * Reads active BSK keywords from the Keyword collection, hits every working
 * platform (RapidAPI X is the most reliable on the current plan), runs each
 * post through Ollama for sentiment + topic categorisation, and writes
 * everything into the Grievance collection so the dashboard / map / grid
 * have real content to render.
 */
require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../src/config/db');
const { fetchKeywordGrievances } = require('../src/services/grievanceService');

const platform = (process.argv[2] || '').toLowerCase() || null;

async function main() {
  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║  BSK WATCH · ONE-SHOT KEYWORD FETCH                      ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log(platform ? `Platform filter: ${platform}` : 'Platform filter: ALL\n');

  await connectDB();

  const start = Date.now();
  const result = await fetchKeywordGrievances(platform);
  const took = ((Date.now() - start) / 1000).toFixed(1);

  console.log('\n──────── RESULT ────────');
  console.log(`  Keywords searched : ${result.keywordsSearched}`);
  console.log(`  New grievances    : ${result.newGrievances}`);
  console.log(`  Time              : ${took}s\n`);

  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error('Fetch failed:', err);
  process.exit(1);
});
