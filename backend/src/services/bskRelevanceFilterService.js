/**
 * bskRelevanceFilterService
 *
 * Fast single-pass relevance gate that decides whether a tweet is about
 * N. Chandrababu Naidu (CBN) and the TDP leadership in Andhra Pradesh.
 * Heuristic first; ambiguous text falls through to the RapidAPI
 * ChatGPT-42 endpoint via `rapidApiLLMService`.
 *
 * NOTE: the output key `is_bsk` and the `target` enum values
 * ('bsk' | 'bsk_son' | 'bjp_telangana' | 'unrelated') are LEGACY identifiers
 * kept unchanged for backward compatibility with the Grievance model and
 * downstream services. Their canonical meaning is now:
 *   bsk           → primary TDP leader (Chandrababu Naidu)
 *   bsk_son       → secondary TDP leader (Nara Lokesh)
 *   bjp_telangana → TDP / NDA Andhra Pradesh machinery
 *
 * Input  : raw tweet text (string)
 * Output : {
 *            is_bsk:           boolean,
 *            confidence:       number 0..1,
 *            stance:           'positive' | 'negative' | 'neutral' | 'unknown',
 *            topic:            short string  (e.g. "Amaravati", "welfare scheme"),
 *            reason:           one-line natural-language explanation,
 *            target:           'bsk' | 'bsk_son' | 'bjp_telangana' | 'unrelated',
 *          }
 *
 * Heuristic fast-path: any tweet text containing an unambiguous TDP-leader
 * token (name variants, official handle) returns true without hitting the
 * LLM, with confidence inferred from the matched token.
 *
 * If RapidAPI is unreachable or returns garbage we fall back to the
 * heuristic — so the pipeline keeps producing data even if the LLM is down.
 */
const { chatJson } = require('./rapidApiLLMService');

const LLM_TIMEOUT = parseInt(process.env.BSK_FILTER_TIMEOUT_MS || '20000', 10);

// ─── Heuristic tokens — case-insensitive substring match ───────────
const HARD_BSK_TOKENS = [
  // English name variants — primary TDP leader
  'chandrababu', 'chandra babu', 'chandrababu naidu', 'cbn',
  '@ncbn', 'nara chandrababu',
  // Secondary TDP leader (Nara Lokesh)
  'nara lokesh', 'lokesh', '@naralokesh',
  // Telugu
  'చంద్రబాబు', 'నారా లోకేష్',
  // Hindi
  'चंद्रबाबू', 'नारा लोकेश',
  // Hashtags
  '#chandrababu', '#cbn', '#naralokesh', '#tdp',
];

const SOFT_BSK_TOKENS = [
  // TDP / NDA Andhra Pradesh context that often appears with the leadership
  'tdp', 'telugu desam',
  'ap cm', 'andhra cm', 'chief minister andhra',
  'amaravati', 'nda andhra',
];

function heuristicMatch(text) {
  const lower = String(text || '').toLowerCase();
  for (const t of HARD_BSK_TOKENS) {
    if (lower.includes(t)) return { matched: true, strength: 'hard', token: t };
  }
  for (const t of SOFT_BSK_TOKENS) {
    if (lower.includes(t)) return { matched: true, strength: 'soft', token: t };
  }
  return { matched: false };
}

/* ─── LLM call (RapidAPI ChatGPT-42) ──────────────────────────── */
async function askLLM(tweetText) {
  const prompt = `You are filtering tweets for a Telugu Desam Party (TDP) media-monitoring system in Andhra Pradesh.
The primary subject is N. Chandrababu Naidu (CBN), TDP national president and Chief Minister of
Andhra Pradesh. The secondary subject is Nara Lokesh, TDP leader and minister. The TDP leads the
NDA alliance in AP (with BJP and Jana Sena). The main opposition is the YSRCP led by Y. S. Jagan
Mohan Reddy.

TWEET (verbatim, may be English / Telugu / Hindi or transliterated):
"""
${String(tweetText || '').slice(0, 800)}
"""

Decide whether this tweet is meaningfully about Chandrababu Naidu, Nara Lokesh, or the immediate
TDP / NDA Andhra Pradesh machinery around them. A tweet that merely mentions Andhra politics
generically is NOT relevant. A tweet that targets, defends, mocks, praises, or reports on the TDP
leadership IS relevant.

The JSON keys below are fixed identifiers — map: "bsk" = Chandrababu Naidu, "bsk_son" = Nara Lokesh,
"bjp_telangana" = TDP / NDA AP machinery.

Reply with EXACTLY one JSON object on a single line, no prose, no markdown:
{"is_bsk": true|false, "confidence": 0.0-1.0, "stance": "positive"|"negative"|"neutral"|"unknown", "target": "bsk"|"bsk_son"|"bjp_telangana"|"unrelated", "topic": "short label", "reason": "one short sentence"}`;

  try {
    return await chatJson({
      prompt,
      temperature: 0.1,
      maxTokens: 400,
      timeoutMs: LLM_TIMEOUT,
    });
  } catch (err) {
    return { __error: err.message || 'rapidapi call failed' };
  }
}

/* ─── public API ─────────────────────────────────────────────── */
async function checkRelevance(tweetText, { allowLLM = true } = {}) {
  const text = String(tweetText || '').trim();
  if (!text) {
    return { is_bsk: false, confidence: 0, stance: 'unknown', target: 'unrelated', topic: '', reason: 'empty text' };
  }

  // 1. Heuristic fast-path
  const heur = heuristicMatch(text);
  if (heur.matched && heur.strength === 'hard') {
    return {
      is_bsk: true,
      confidence: 0.95,
      stance: 'unknown',
      target: text.toLowerCase().includes('lokesh') ? 'bsk_son' : 'bsk',
      topic: 'name match',
      reason: `Matched token "${heur.token}"`,
      heuristic: true,
    };
  }

  // 2. LLM gate (skip on demand for speed-only runs)
  if (!allowLLM) {
    return heur.matched
      ? { is_bsk: true, confidence: 0.55, stance: 'unknown', target: 'bjp_telangana', topic: 'soft match', reason: `Soft token "${heur.token}"`, heuristic: true }
      : { is_bsk: false, confidence: 0.05, stance: 'unknown', target: 'unrelated', topic: '', reason: 'no token, llm skipped', heuristic: true };
  }

  const llm = await askLLM(text);
  if (!llm || llm.__error) {
    // Fall back to heuristic if RapidAPI broken
    return heur.matched
      ? { is_bsk: true, confidence: 0.5, stance: 'unknown', target: 'bjp_telangana', topic: 'soft match (llm down)', reason: `RapidAPI unreachable; soft heuristic on "${heur.token}"`, heuristic: true, llm_error: llm?.__error }
      : { is_bsk: false, confidence: 0.1, stance: 'unknown', target: 'unrelated', topic: '', reason: 'no match + llm unreachable', heuristic: true, llm_error: llm?.__error };
  }

  // Sanitise LLM output
  return {
    is_bsk:     !!llm.is_bsk,
    confidence: Math.max(0, Math.min(1, Number(llm.confidence) || 0)),
    stance:     ['positive', 'negative', 'neutral', 'unknown'].includes(llm.stance) ? llm.stance : 'unknown',
    target:     ['bsk', 'bsk_son', 'bjp_telangana', 'unrelated'].includes(llm.target) ? llm.target : 'unrelated',
    topic:      String(llm.topic || '').slice(0, 80),
    reason:     String(llm.reason || '').slice(0, 200),
    heuristic:  false,
  };
}

module.exports = {
  checkRelevance,
  heuristicMatch,
  HARD_BSK_TOKENS,
  SOFT_BSK_TOKENS,
};
