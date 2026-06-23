/**
 * constituencyIntelligenceController
 * ─────────────────────────────────────────────────────────────────────
 * "Constituency War Room" — party-strategist intelligence across all
 * 175 Andhra Pradesh assembly constituencies.
 *
 * Aggregates the existing Grievance collection (ingested social mentions +
 * citizen grievances) BY CONSTITUENCY and joins it with the MLA reference
 * dataset to produce a ranked, filterable view of:
 *   • neutral public sentiment per seat (positive/negative/neutral)
 *   • grievance volume & negative-mention pressure
 *   • the top civic issues being raised
 *
 * Sentiment here is NEUTRAL per-constituency (analysis.sentiment), i.e.
 * about the seat/MLA on their own merits — NOT the TDP-relative score.
 */

const Grievance = require('../models/Grievance');
const {
  getAllMlas,
  getMlaByConstituency,
  normalizeConstituencyKey,
  classifyIssues,
  ISSUE_CATEGORIES,
} = require('../services/mlaReferenceService');

/* RBAC helper: clamp a constituency list to the caller's allowed scope. */
const scopeMlaList = (mlas, scope) => {
  if (!scope || scope.canSeeAll) return mlas;
  const allowed = scope.constituencyKeys || new Set();
  return mlas.filter((m) => allowed.has(normalizeConstituencyKey(m.constituency)));
};

const isInScope = (constituency, scope) => {
  if (!scope || scope.canSeeAll) return true;
  return (scope.constituencyKeys || new Set()).has(normalizeConstituencyKey(constituency));
};

/* ─── helpers ─────────────────────────────────────────────────────── */

const buildBaseMatch = (days) => {
  const match = {
    is_active: true,
    'detected_location.constituency': { $exists: true, $nin: [null, ''] },
  };
  const windowDays = Number(days);
  if (Number.isFinite(windowDays) && windowDays > 0) {
    const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);
    match.post_date = { $gte: since };
  }
  return match;
};

// Sentiment index in [-100, 100]: net positivity share.
const sentimentIndex = (pos, neg, total) =>
  total > 0 ? Math.round(((pos - neg) / total) * 100) : 0;

const SENTIMENT_BUCKET = (idx, total) => {
  if (total === 0) return 'no_data';
  if (idx <= -25) return 'critical';
  if (idx < 0) return 'negative';
  if (idx < 25) return 'mixed';
  return 'positive';
};

/* ─── GET /api/constituency-intel/leaderboard ─────────────────────────
 * Ranked list of every constituency with sentiment + grievance pressure.
 * Query: ?party=TDP&alliance=NDA&district=GUNTUR&sort=negative|volume|index
 *        &order=asc|desc&days=30&limit=200
 */
const getLeaderboard = async (req, res) => {
  try {
    const { party, alliance, district, sort = 'negative', order, days, limit } = req.query;

    const agg = await Grievance.aggregate([
      { $match: buildBaseMatch(days) },
      {
        $group: {
          _id: '$detected_location.constituency',
          total: { $sum: 1 },
          positive: { $sum: { $cond: [{ $eq: ['$analysis.sentiment', 'positive'] }, 1, 0] } },
          negative: { $sum: { $cond: [{ $eq: ['$analysis.sentiment', 'negative'] }, 1, 0] } },
          neutral: { $sum: { $cond: [{ $in: ['$analysis.sentiment', ['neutral', 'moderate']] }, 1, 0] } },
          high_priority: {
            $sum: { $cond: [{ $in: ['$complaint.priority', ['high', 'critical']] }, 1, 0] },
          },
        },
      },
    ]);

    // Index aggregation results by normalized constituency key.
    const statsByKey = new Map();
    for (const row of agg) {
      statsByKey.set(normalizeConstituencyKey(row._id), row);
    }

    // Start from the full MLA roster so every seat appears, even with 0 data.
    // RBAC: non-super-admin scoped users see only their assigned constituencies.
    const roster = scopeMlaList(getAllMlas(), req.scope);
    let rows = roster.map((mla) => {
      const stat = statsByKey.get(mla.key) || { total: 0, positive: 0, negative: 0, neutral: 0, high_priority: 0 };
      const total = stat.total || 0;
      const idx = sentimentIndex(stat.positive, stat.negative, total);
      return {
        constituency: mla.constituency,
        key: mla.key,
        mla: mla.mla,
        party: mla.party,
        alliance: mla.alliance,
        criminalCases: mla.criminalCases ?? null,
        grievances: total,
        positive: stat.positive || 0,
        negative: stat.negative || 0,
        neutral: stat.neutral || 0,
        high_priority: stat.high_priority || 0,
        negative_share: total > 0 ? Math.round((stat.negative / total) * 100) : 0,
        sentiment_index: idx,
        bucket: SENTIMENT_BUCKET(idx, total),
      };
    });

    // Filters
    if (party) rows = rows.filter((r) => String(r.party).toUpperCase() === String(party).toUpperCase());
    if (alliance) rows = rows.filter((r) => String(r.alliance).toUpperCase() === String(alliance).toUpperCase());

    // Sorting
    const dir = order === 'asc' ? 1 : -1;
    const sorters = {
      negative: (a, b) => (a.negative - b.negative) || (a.negative_share - b.negative_share),
      volume: (a, b) => a.grievances - b.grievances,
      index: (a, b) => a.sentiment_index - b.sentiment_index,
      priority: (a, b) => a.high_priority - b.high_priority,
    };
    const sorter = sorters[sort] || sorters.negative;
    rows.sort((a, b) => sorter(a, b) * dir);

    const max = Number(limit);
    if (Number.isFinite(max) && max > 0) rows = rows.slice(0, max);

    return res.json({
      success: true,
      count: rows.length,
      window_days: Number(days) || null,
      sort,
      order: order === 'asc' ? 'asc' : 'desc',
      data: rows,
    });
  } catch (err) {
    console.error('[constituencyIntel] leaderboard error:', err.message);
    return res.status(500).json({ success: false, message: 'Failed to build leaderboard' });
  }
};

/* ─── GET /api/constituency-intel/summary ─────────────────────────────
 * State-level rollup: party-wise sentiment, hotspot count, top issues.
 */
const getSummary = async (req, res) => {
  try {
    const { days } = req.query;
    const baseMatch = buildBaseMatch(days);

    const [byParty, totals, recentNeg] = await Promise.all([
      // Party-wise sentiment via constituency join done in JS below.
      Grievance.aggregate([
        { $match: baseMatch },
        {
          $group: {
            _id: '$detected_location.constituency',
            positive: { $sum: { $cond: [{ $eq: ['$analysis.sentiment', 'positive'] }, 1, 0] } },
            negative: { $sum: { $cond: [{ $eq: ['$analysis.sentiment', 'negative'] }, 1, 0] } },
            total: { $sum: 1 },
          },
        },
      ]),
      Grievance.aggregate([
        { $match: baseMatch },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            positive: { $sum: { $cond: [{ $eq: ['$analysis.sentiment', 'positive'] }, 1, 0] } },
            negative: { $sum: { $cond: [{ $eq: ['$analysis.sentiment', 'negative'] }, 1, 0] } },
            neutral: { $sum: { $cond: [{ $in: ['$analysis.sentiment', ['neutral', 'moderate']] }, 1, 0] } },
          },
        },
      ]),
      // Sample of recent negative grievance text for statewide issue trends.
      Grievance.find({ ...baseMatch, 'analysis.sentiment': 'negative' })
        .select('content.text analysis.category')
        .sort({ post_date: -1 })
        .limit(1500)
        .lean(),
    ]);

    // Party-wise rollup (join constituency → party).
    const partyAgg = {};
    let hotspots = 0;
    for (const row of byParty) {
      const mla = getMlaByConstituency(row._id);
      const party = mla?.party || 'UNKNOWN';
      if (!partyAgg[party]) partyAgg[party] = { party, seats: 0, grievances: 0, positive: 0, negative: 0 };
      partyAgg[party].seats += 1;
      partyAgg[party].grievances += row.total;
      partyAgg[party].positive += row.positive;
      partyAgg[party].negative += row.negative;
      const idx = sentimentIndex(row.positive, row.negative, row.total);
      if (row.total >= 5 && idx <= -25) hotspots += 1;
    }
    const partyBreakdown = Object.values(partyAgg).map((p) => ({
      ...p,
      sentiment_index: sentimentIndex(p.positive, p.negative, p.grievances),
    })).sort((a, b) => b.grievances - a.grievances);

    // Statewide top issues from recent negative sample.
    const issueCounts = Object.fromEntries(ISSUE_CATEGORIES.map((c) => [c, 0]));
    for (const g of recentNeg) {
      for (const cat of classifyIssues(g?.content?.text)) issueCounts[cat] += 1;
    }
    const topIssues = Object.entries(issueCounts)
      .filter(([, n]) => n > 0)
      .map(([issue, count]) => ({ issue, count }))
      .sort((a, b) => b.count - a.count);

    const t = totals[0] || { total: 0, positive: 0, negative: 0, neutral: 0 };

    return res.json({
      success: true,
      window_days: Number(days) || null,
      totals: {
        ...t,
        sentiment_index: sentimentIndex(t.positive, t.negative, t.total),
        constituencies_with_data: byParty.length,
        hotspots,
      },
      party_breakdown: partyBreakdown,
      top_issues: topIssues,
    });
  } catch (err) {
    console.error('[constituencyIntel] summary error:', err.message);
    return res.status(500).json({ success: false, message: 'Failed to build summary' });
  }
};

/* ─── GET /api/constituency-intel/:constituency ───────────────────────
 * Per-seat detail: MLA bio + neutral sentiment + top issues +
 * recent negative mentions (evidence).
 */
const getConstituencyDetail = async (req, res) => {
  try {
    const { constituency } = req.params;
    const { days } = req.query;
    const decoded = decodeURIComponent(constituency || '');
    const mla = getMlaByConstituency(decoded);

    // RBAC: scoped users can only fetch detail for their own seat.
    if (!isInScope(decoded, req.scope)) {
      return res.status(403).json({
        success: false,
        code: 'CONSTITUENCY_FORBIDDEN',
        message: 'You are not authorized to view this constituency',
      });
    }

    const baseMatch = {
      ...buildBaseMatch(days),
      'detected_location.constituency': mla ? new RegExp(`^${mla.constituency}$`, 'i') : decoded,
    };

    const [counts, recent] = await Promise.all([
      Grievance.aggregate([
        { $match: baseMatch },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            positive: { $sum: { $cond: [{ $eq: ['$analysis.sentiment', 'positive'] }, 1, 0] } },
            negative: { $sum: { $cond: [{ $eq: ['$analysis.sentiment', 'negative'] }, 1, 0] } },
            neutral: { $sum: { $cond: [{ $in: ['$analysis.sentiment', ['neutral', 'moderate']] }, 1, 0] } },
            high_priority: { $sum: { $cond: [{ $in: ['$complaint.priority', ['high', 'critical']] }, 1, 0] } },
          },
        },
      ]),
      Grievance.find(baseMatch)
        .select('content.text analysis.sentiment posted_by.handle posted_by.display_name platform post_date tweet_id')
        .sort({ post_date: -1 })
        .limit(400)
        .lean(),
    ]);

    const c = counts[0] || { total: 0, positive: 0, negative: 0, neutral: 0, high_priority: 0 };

    // Top issues from this seat's grievance text.
    const issueCounts = Object.fromEntries(ISSUE_CATEGORIES.map((cat) => [cat, 0]));
    for (const g of recent) {
      for (const cat of classifyIssues(g?.content?.text)) issueCounts[cat] += 1;
    }
    const topIssues = Object.entries(issueCounts)
      .filter(([, n]) => n > 0)
      .map(([issue, count]) => ({ issue, count }))
      .sort((a, b) => b.count - a.count);

    const recentNegative = recent
      .filter((g) => g?.analysis?.sentiment === 'negative')
      .slice(0, 15)
      .map((g) => ({
        text: g?.content?.text || '',
        handle: g?.posted_by?.handle || null,
        display_name: g?.posted_by?.display_name || null,
        platform: g.platform,
        post_date: g.post_date,
        tweet_id: g.tweet_id,
      }));

    return res.json({
      success: true,
      window_days: Number(days) || null,
      mla: mla || { constituency: decoded },
      sentiment: {
        ...c,
        sentiment_index: sentimentIndex(c.positive, c.negative, c.total),
        bucket: SENTIMENT_BUCKET(sentimentIndex(c.positive, c.negative, c.total), c.total),
      },
      top_issues: topIssues,
      recent_negative: recentNegative,
    });
  } catch (err) {
    console.error('[constituencyIntel] detail error:', err.message);
    return res.status(500).json({ success: false, message: 'Failed to build constituency detail' });
  }
};

module.exports = {
  getLeaderboard,
  getSummary,
  getConstituencyDetail,
};
