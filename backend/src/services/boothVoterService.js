/**
 * boothVoterService
 * ─────────────────────────────────────────────────────────────────────
 * Booth-level (polling-station) voter demographics, sourced from real
 * 2024 electoral roll exports converted to JSON
 * (see backend/scripts/booth-voter-import/convert_booths.py).
 *
 * Coverage is partial per constituency -- only booths whose source file
 * was available get included. `coverage` on each response reports how
 * many of the constituency's total booths are present.
 */

const KUPPAM = require('../data/boothVoters/kuppam.json');
const MANGALAGIRI = require('../data/boothVoters/mangalagiri.json');

const normalizeConstituencyKey = (name) =>
  String(name || '')
    .toLowerCase()
    .replace(/\([^)]*\)/g, ' ')
    .replace(/[^a-z0-9]/g, '')
    .trim();

// Total official booth/part count per constituency (for coverage reporting),
// independent of how many we've actually sourced so far.
const TOTAL_BOOTHS = {
  kuppam: 240,
  mangalagiri: 303,
};

const BOOTH_DATA = {
  kuppam: KUPPAM,
  mangalagiri: MANGALAGIRI,
};

const hasBoothData = (constituency) => {
  const key = normalizeConstituencyKey(constituency);
  return Boolean(BOOTH_DATA[key] && BOOTH_DATA[key].length);
};

const getBoothsByConstituency = (constituency) => {
  const key = normalizeConstituencyKey(constituency);
  const rows = BOOTH_DATA[key];
  if (!rows || !rows.length) return null;
  const total = TOTAL_BOOTHS[key] || rows.length;
  return {
    constituency,
    key,
    booths: rows,
    coverage: {
      collected: rows.length,
      total_booths: total,
      pct: Math.round((rows.length / total) * 100),
    },
  };
};

module.exports = {
  hasBoothData,
  getBoothsByConstituency,
  normalizeConstituencyKey,
};
