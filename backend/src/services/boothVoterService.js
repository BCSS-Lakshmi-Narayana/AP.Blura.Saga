/**
 * boothVoterService
 * ─────────────────────────────────────────────────────────────────────
 * Booth-level (polling-station) voter data sourced from the ECI 2025
 * Final Roll exports.
 *
 *  - `<key>.summary.json`      : one row per booth with elector counts
 *                                (drives the booth list + analytics).
 *  - `voters/<key>/<part>.json`: the full voter roll for that booth
 *                                (name, voter id, relation, house, age,
 *                                gender). Loaded lazily, per booth, and
 *                                cached in memory — the full set is ~500k
 *                                rows / 66MB so it must never be required
 *                                up front.
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data', 'boothVoters');

const normalizeConstituencyKey = (name) =>
  String(name || '')
    .toLowerCase()
    .replace(/\([^)]*\)/g, ' ')
    .replace(/[^a-z0-9]/g, '')
    .trim();

// Constituencies we have a booth summary for. Value is the on-disk key.
const SUMMARY_KEYS = {
  kuppam: 'kuppam',
  mangalagiri: 'mangalagiri',
};

// Cache the (small) summaries and the (large) per-booth voter rolls so we
// only hit disk + JSON.parse once per file for the life of the process.
const summaryCache = new Map();
const voterCache = new Map();

const loadSummary = (key) => {
  if (summaryCache.has(key)) return summaryCache.get(key);
  const file = path.join(DATA_DIR, `${key}.summary.json`);
  let rows = null;
  try {
    rows = JSON.parse(fs.readFileSync(file, 'utf-8'));
  } catch (err) {
    rows = null;
  }
  summaryCache.set(key, rows);
  return rows;
};

const hasBoothData = (constituency) => {
  const key = SUMMARY_KEYS[normalizeConstituencyKey(constituency)];
  if (!key) return false;
  const rows = loadSummary(key);
  return Boolean(rows && rows.length);
};

const getBoothsByConstituency = (constituency) => {
  const key = SUMMARY_KEYS[normalizeConstituencyKey(constituency)];
  if (!key) return null;
  const rows = loadSummary(key);
  if (!rows || !rows.length) return null;
  // The 2025 Final Roll is the complete set of parts for the seat, so the
  // number of booths we hold is also the official total — coverage is 100%.
  const total = rows.length;
  return {
    constituency,
    key,
    booths: rows,
    coverage: {
      collected: rows.length,
      total_booths: total,
      pct: total ? Math.round((rows.length / total) * 100) : 0,
    },
  };
};

const loadVoterRoll = (key, part) => {
  const cacheKey = `${key}/${part}`;
  if (voterCache.has(cacheKey)) return voterCache.get(cacheKey);
  const file = path.join(DATA_DIR, 'voters', key, `${part}.json`);
  let rows = null;
  try {
    rows = JSON.parse(fs.readFileSync(file, 'utf-8'));
  } catch (err) {
    rows = null;
  }
  voterCache.set(cacheKey, rows);
  return rows;
};

const genderBucket = (g) => {
  const v = String(g || '').trim().toLowerCase();
  if (v === 'male') return 'male';
  if (v === 'female') return 'female';
  if (v.includes('third') || v === 'tg') return 'third';
  return 'other';
};

/**
 * Paginated + searchable voter roll for one booth.
 * opts: { page=1, pageSize=50, search='', gender='' }
 * Returns null when the constituency/booth has no roll on disk.
 */
const getBoothVoters = (constituency, part, opts = {}) => {
  const key = SUMMARY_KEYS[normalizeConstituencyKey(constituency)];
  if (!key) return null;
  const partNum = Number(part);
  if (!Number.isFinite(partNum)) return null;

  const all = loadVoterRoll(key, partNum);
  if (!all) return null;

  const page = Math.max(1, Number(opts.page) || 1);
  const pageSize = Math.min(200, Math.max(1, Number(opts.pageSize) || 50));
  const search = String(opts.search || '').trim().toLowerCase();
  const genderFilter = String(opts.gender || '').trim().toLowerCase();

  // Whole-booth gender breakdown (before any filtering) for the header chips.
  const counts = { male: 0, female: 0, third: 0, other: 0 };
  for (const v of all) counts[genderBucket(v.gender)] += 1;

  let rows = all;
  if (search) {
    rows = rows.filter((v) =>
      String(v.name || '').toLowerCase().includes(search) ||
      String(v.voter_id || '').toLowerCase().includes(search) ||
      String(v.relation || '').toLowerCase().includes(search) ||
      String(v.house_no || '').toLowerCase().includes(search));
  }
  if (genderFilter && genderFilter !== 'all') {
    rows = rows.filter((v) => genderBucket(v.gender) === genderFilter);
  }

  const total = rows.length;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const start = (page - 1) * pageSize;
  const voters = rows.slice(start, start + pageSize);

  // Booth summary row (locality / polling station) for context in the header.
  const summary = (loadSummary(key) || []).find((b) => b.part === partNum) || null;

  return {
    constituency,
    key,
    part: partNum,
    summary,
    counts,
    totalUnfiltered: all.length,
    total,
    page,
    pageSize,
    pages,
    voters,
  };
};

module.exports = {
  hasBoothData,
  getBoothsByConstituency,
  getBoothVoters,
  normalizeConstituencyKey,
};
