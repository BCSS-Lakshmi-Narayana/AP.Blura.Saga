/**
 * voterProfileController
 * ─────────────────────────────────────────────────────────────────────
 * Serves the verified public voter/election profile per AC (see
 * voterProfileService for sourcing and coverage caveats).
 */

const {
  getAllVoterProfiles,
  getVoterProfileByConstituency,
  normalizeConstituencyKey,
  DATA_COVERAGE,
} = require('../services/voterProfileService');
const { getBoothsByConstituency, getBoothVoters } = require('../services/boothVoterService');

const isInScope = (constituency, scope) => {
  if (!scope || scope.canSeeAll) return true;
  return (scope.constituencyKeys || new Set()).has(normalizeConstituencyKey(constituency));
};

/* GET /api/voter-profiles — list all seats (RBAC-scoped), summary fields only. */
const listVoterProfiles = (req, res) => {
  try {
    const { party, district } = req.query;
    let rows = getAllVoterProfiles();

    if (!req.scope || !req.scope.canSeeAll) {
      const allowed = (req.scope && req.scope.constituencyKeys) || new Set();
      rows = rows.filter((p) => allowed.has(p.key));
    }
    if (party) rows = rows.filter((p) => String(p.mla.party).toUpperCase() === String(party).toUpperCase());
    if (district) rows = rows.filter((p) => String(p.district).toUpperCase() === String(district).toUpperCase());

    const summary = rows.map((p) => ({
      ac_number: p.ac_number,
      constituency: p.constituency,
      key: p.key,
      district: p.district,
      reserved_category: p.reserved_category,
      lok_sabha: p.lok_sabha,
      mla_name: p.mla.name,
      party: p.mla.party,
      alliance: p.mla.alliance,
      vote_share_2024: p.election_2024.winner ? p.election_2024.winner.vote_pct : null,
      margin_2024: p.election_2024.margin,
    }));

    return res.json({ success: true, count: summary.length, data: summary, coverage: DATA_COVERAGE });
  } catch (err) {
    console.error('[voterProfile] list error:', err.message);
    return res.status(500).json({ success: false, message: 'Failed to list voter profiles' });
  }
};

/* GET /api/voter-profiles/:constituency — full profile for one seat. */
const getVoterProfile = (req, res) => {
  try {
    const { constituency } = req.params;
    const decoded = decodeURIComponent(constituency || '');

    if (!isInScope(decoded, req.scope)) {
      return res.status(403).json({
        success: false,
        code: 'CONSTITUENCY_FORBIDDEN',
        message: 'You are not authorized to view this constituency',
      });
    }

    const profile = getVoterProfileByConstituency(decoded);
    if (!profile) {
      return res.status(404).json({ success: false, message: `No voter profile found for "${decoded}"` });
    }

    return res.json({ success: true, data: profile, coverage: DATA_COVERAGE });
  } catch (err) {
    console.error('[voterProfile] detail error:', err.message);
    return res.status(500).json({ success: false, message: 'Failed to load voter profile' });
  }
};

/* GET /api/voter-profiles/:constituency/booths — booth (polling-station)
 * level voter demographics for one seat, where sourced. 404 if we don't
 * have booth-level data collected for this constituency yet. */
const getBoothLevelData = (req, res) => {
  try {
    const { constituency } = req.params;
    const decoded = decodeURIComponent(constituency || '');

    if (!isInScope(decoded, req.scope)) {
      return res.status(403).json({
        success: false,
        code: 'CONSTITUENCY_FORBIDDEN',
        message: 'You are not authorized to view this constituency',
      });
    }

    const result = getBoothsByConstituency(decoded);
    if (!result) {
      return res.status(404).json({
        success: false,
        message: `No booth-level data collected for "${decoded}" yet`,
      });
    }

    return res.json({ success: true, ...result });
  } catch (err) {
    console.error('[voterProfile] booth-level error:', err.message);
    return res.status(500).json({ success: false, message: 'Failed to load booth-level data' });
  }
};

/* GET /api/voter-profiles/:constituency/booths/:part/voters — the full
 * voter roll for one booth, paginated + searchable + gender-filterable.
 * Query: page, pageSize, search, gender (all|male|female|third|other). */
const getBoothVotersHandler = (req, res) => {
  try {
    const { constituency, part } = req.params;
    const decoded = decodeURIComponent(constituency || '');

    if (!isInScope(decoded, req.scope)) {
      return res.status(403).json({
        success: false,
        code: 'CONSTITUENCY_FORBIDDEN',
        message: 'You are not authorized to view this constituency',
      });
    }

    const result = getBoothVoters(decoded, part, {
      page: req.query.page,
      pageSize: req.query.pageSize,
      search: req.query.search,
      gender: req.query.gender,
    });

    if (!result) {
      return res.status(404).json({
        success: false,
        message: `No voter roll on record for "${decoded}" booth ${part}`,
      });
    }

    return res.json({ success: true, ...result });
  } catch (err) {
    console.error('[voterProfile] booth-voters error:', err.message);
    return res.status(500).json({ success: false, message: 'Failed to load booth voter list' });
  }
};

module.exports = { listVoterProfiles, getVoterProfile, getBoothLevelData, getBoothVoters: getBoothVotersHandler };
