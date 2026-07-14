/**
 * voterProfileService
 * ─────────────────────────────────────────────────────────────────────
 * Read-only reference layer over verified public election data for all
 * 175 Andhra Pradesh assembly constituencies (2024 cycle).
 *
 * Sources (see each record's data_sources field):
 *   - 2024 candidate-level results: ECI-derived dataset (cross-verified
 *     against ECI/Wikipedia figures for spot-checked seats).
 *   - District / Lok Sabha / SC-ST reservation: Wikipedia "List of
 *     constituencies of the Andhra Pradesh Legislative Assembly", parsed
 *     from raw wikitext (citing ECI Delimitation Order, 2008).
 *   - MLA bio fields (party, alliance, criminal cases, education, assets,
 *     liabilities): existing ap_mlas.json roster (ADR/ECI-sourced).
 *
 * NOT included because no genuine public dataset exists at this
 * granularity — see mlaReferenceService for the same caveat:
 *   - 2014/2019 historical results (would need a paid/authenticated
 *     dataset; flagged as pending, not fabricated)
 *   - Age-group distribution, household count, SC/ST/BC population %,
 *     religion breakdown, booth-level data, mandal/village lists
 */

const RAW_VOTER_PROFILES = require('../data/ap_voter_profiles_2024.json');
const VERIFIED_ELECTORS = require('../data/ap_ac_electors_verified.json');
const SOCIOECONOMIC_LATEST = require('../data/ap_socioeconomic_latest.json');

const normalizeConstituencyKey = (name) =>
  String(name || '')
    .toLowerCase()
    .replace(/\([^)]*\)/g, ' ')
    .replace(/[^a-z0-9]/g, '')
    .trim();

// Merge verified gender-split elector counts onto each profile, keyed by AC
// NUMBER (not name) — AP has genuinely duplicate constituency names across
// districts (two Prathipadu: AC 36 & 93; two Gannavaram: AC 46 & 71), so a
// name-keyed join would cross-contaminate those pairs.
// Also merge the latest available socio-economic indicators (PLFS 2023-24 via
// the AP Government's own Socio Economic Survey 2024-25) — this replaced the
// earlier Census-2011 district-level worker-classification proxy, which was
// 14 years stale. Trade-off: this newer source is state-level only, so every
// AC currently shows the same statewide figures — see SOCIOECONOMIC_LATEST._meta.
const SE = SOCIOECONOMIC_LATEST.statewide;
const AP_VOTER_PROFILES = RAW_VOTER_PROFILES.map((p) => {
  const e = VERIFIED_ELECTORS[String(p.ac_number)];
  return {
    ...p,
    electors_male: e ? e.electors_male : null,
    electors_female: e ? e.electors_female : null,
    electors_other: e ? e.electors_other : null,
    electors_total: e ? e.electors_total : null,
    electors_source: e ? e.source : null,
    socio_economic: {
      ...SE,
      vintage: SOCIOECONOMIC_LATEST._meta.vintage,
      granularity: SOCIOECONOMIC_LATEST._meta.granularity,
      source: SOCIOECONOMIC_LATEST._meta.source,
    },
  };
});

const PROFILE_BY_KEY = AP_VOTER_PROFILES.reduce((acc, p) => {
  acc[p.key] = p;
  return acc;
}, {});

const getAllVoterProfiles = () => AP_VOTER_PROFILES;

const getVoterProfileByConstituency = (name) => {
  const key = normalizeConstituencyKey(name);
  return PROFILE_BY_KEY[key] || null;
};

/** Which sections of the standard 9-part voter-profile spec are populated vs pending, for UI messaging. */
const DATA_COVERAGE = {
  electoral_profile: 'partial', // total votes polled yes; registered electors/M-F split/polling stations pending per-seat sourcing
  demographic_profile: 'pending',
  community_social_profile: 'unavailable', // not published by any official source at AC granularity
  socio_economic_profile: 'statewide', // latest (PLFS 2023-24 via AP Socio Economic Survey 2024-25), but state-level not per-AC
  geographic_profile: 'partial', // district + Lok Sabha yes; mandals/villages/wards pending
  election_intelligence: 'partial', // 2024 full results yes; 2014/2019 pending
  public_issues_profile: 'derived', // comes from the grievance/sentiment pipeline, not this dataset
  booth_level_profile: 'unavailable',
  citizen_engagement_metrics: 'unavailable',
};

module.exports = {
  AP_VOTER_PROFILES,
  normalizeConstituencyKey,
  getAllVoterProfiles,
  getVoterProfileByConstituency,
  DATA_COVERAGE,
};
