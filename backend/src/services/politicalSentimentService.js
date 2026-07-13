/**
 * politicalSentimentService
 * ─────────────────────────────────────────────────────────────────────
 * Stage 4 of the target-aware grievance pipeline.
 *
 * Calls an LLM with a DYNAMIC, context-injected prompt that asks the
 * model to reason about the content RELATIVE TO N. Chandrababu Naidu
 * (CBN). The political-context snapshot from `politicalContextService`
 * is embedded into the prompt so the model knows:
 *   • who is mentioned
 *   • who is an ally vs opposition of CBN/TDP
 *   • which language(s) the text uses
 *   • whether civic-grievance signals are present
 *
 * The model returns a multi-dimensional verdict. We then deterministically
 * resolve the final `bsk_sentiment` from `stance` + `bsk_relevance` so the
 * output is consistent even if the LLM is a bit chatty.
 *
 *   analyzePoliticalSentiment(text, politicalContext, options)
 *     → {
 *         target_entity,
 *         target_entity_canonical,
 *         relevance_score,           // 0..1
 *         stance,                    // pro_bsk | anti_bsk |
 *                                    // pro_bsk_indirect | anti_bsk_indirect |
 *                                    // neutral | unrelated
 *         beneficiary,               // 'bsk'(legacy key for CBN) | 'bjp' | 'opposition' | 'none'
 *         attack_target,             // entity key being attacked, or null
 *         narrative_direction,       // short label (e.g. "anti-YSRCP campaign")
 *         political_alignment,       // pro-bjp | pro-opposition | neutral | unclear
 *         bsk_sentiment,             // FINAL resolved: positive|negative|neutral
 *         generic_sentiment,         // raw emotional tone (positive|negative|neutral)
 *         toxicity_level,            // none|low|medium|high
 *         hate_speech,               // bool
 *         propaganda_probability,    // 0..1
 *         sarcasm_detected,          // bool
 *         emotional_intensity,       // 0..1
 *         misinformation_probability,// 0..1
 *         language_detected,         // free string from LLM
 *         reasoning,
 *         provider,                  // 'rapidapi' | 'fallback'
 *       }
 */

const { chatJson } = require('./llmProvider');

const LLM_TIMEOUT = parseInt(process.env.POLITICAL_SENTIMENT_TIMEOUT_MS || '60000', 10);

const ALLOWED_STANCES = [
    'pro_bsk',
    'anti_bsk',
    'pro_bsk_indirect',
    'anti_bsk_indirect',
    'neutral',
    'unrelated',
];
// Sentiment labels exposed to downstream services / DB: positive | negative | moderate.
// Note: 'stance' below (ALLOWED_STANCES) keeps its own 'neutral' value — that is a
// political *stance*, not a sentiment label, and must not be confused with this list.
const ALLOWED_GENERIC_SENTIMENTS = ['positive', 'negative', 'moderate'];
const ALLOWED_TOXICITY = ['none', 'low', 'medium', 'high'];
const ALLOWED_BENEFICIARIES = ['bsk', 'bjp', 'opposition', 'none'];

/* ─── JSON extraction (tolerant to wrapping prose) ─────────────────── */
const extractJson = (blob) => {
    if (!blob) return null;
    if (typeof blob === 'object') return blob;
    const s = String(blob).trim();
    try { return JSON.parse(s); } catch (_) { /* try regex */ }
    const m = s.match(/\{[\s\S]*\}/);
    if (!m) return null;
    try { return JSON.parse(m[0]); } catch (_) { return null; }
};

/* ─── dynamic prompt builder ───────────────────────────────────────── */

const buildPrompt = (text, ctx) => {
    const mentionedList = ctx.mentioned_entities && ctx.mentioned_entities.length > 0
        ? ctx.mentioned_entities.map(
            (m) => `  • ${m.canonical} — ${m.alignment} of CBN/TDP${m.party ? ` (${m.party})` : ''}`
          ).join('\n')
        : '  (none detected by the deterministic gate — you must still read the text)';

    const langList = Object.entries(ctx.language_hints || {})
        .filter(([, v]) => v)
        .map(([k]) => k.replace('has_', ''))
        .join(', ') || 'unknown';

    return `You are a seasoned political-intelligence analyst. Your single client is
the office of Shri N. Chandrababu Naidu (CBN) and the TDP leadership in
Andhra Pradesh. His immediate family and close leadership circle (notably
Nara Lokesh) are politically inseparable from him.

Your role is the same as a real human media-monitoring analyst would
play: read the text carefully in its original language, understand what
the author is genuinely trying to convey, then judge — in plain political
terms — whether the content HELPS or HURTS CBN/TDP.

CBN/TDP political map (this is the only fixed reference you need):
    • ALLY camp:       CBN, Nara Lokesh, TDP, NDA allies (including BJP/JSP).
    • OPPOSITION camp: YSRCP (Jagan and allied leaders), and other rival blocs.
  • NEUTRAL bodies:  Police, courts, ECI, municipal corporations.

Deterministic pre-scan (use as evidence, not as final answer):
  Platform           : ${ctx.platform || 'unknown'}
  Tagged keyword     : ${ctx.tagged_keyword || 'unknown'}
  Author handle      : ${ctx.author_handle || 'unknown'}
  Detected languages : ${langList}
  Pipeline mode      : ${ctx.mode}
    CBN relevance      : ${ctx.bsk_relevance.toFixed(2)}
  Primary target     : ${ctx.primary_target_canonical || 'none'} (${ctx.primary_target_alignment || 'n/a'})
  Civic signal       : ${ctx.has_civic_signal ? 'yes' : 'no'}
  Entities mentioned :
${mentionedList}

── HOW TO THINK (do this internally before you answer) ──────────────
Step 1. TRANSLATE FAITHFULLY. If the text is Telugu / Hindi / Romanized
        / code-mixed, produce a clean English rendering FIRST. Pay
        attention to subject vs object — who is doing what to whom.
        Do not paraphrase the intent yet, just translate the sentences.
        If you skip or rush this step you WILL invert the meaning.

Step 2. From the English rendering, list every political actor the
        sentences actually target. Ignore hashtags — they are topical
        metadata, not endorsement. Who do the verbs act ON?

Step 3. For each targeted actor decide: is the author trying to PRAISE
        them, ATTACK them, INSINUATE wrongdoing about them, REPORT on
        them, or COMPLAIN to them as a citizen seeking help? Pay
        attention to insinuation and indirect attacks — politicians are
        often damaged by suggestions rather than direct accusations.

Step 4. Now translate that into CBN/TDP terms:
       • Attacking / insinuating wrongdoing about CBN, Lokesh, or TDP
           → anti_bsk (legacy stance key retained for compatibility).
       • Praising / defending CBN, Lokesh, or TDP/NDA → pro_bsk.
         • Attacking the opposition camp with no BSK mention
               → pro_bsk_indirect (benefits BSK by hurting rivals).
         • Praising the opposition camp with no BSK mention
               → anti_bsk_indirect.
           • Citizen civic complaint addressed to CBN/TDP leadership seeking help
               → neutral (expects action, not damage).
         • No political target and no civic complaint
               → unrelated, fall back to generic emotional tone.

Step 5. Sanity check: which political camp would happily share this
    content? If the opposition would share it to embarrass CBN/TDP,
        the stance is anti_bsk regardless of hashtags or polite
    phrasing. If CBN/TDP supporters would share it, it's pro_bsk.

Guardrails:
    • Aggressive support (TDP/NDA supporters mocking the opposition) is NOT
    automatically hate speech — reserve hate_speech=true for slurs,
    communal incitement, caste/religious targeting, or explicit calls
    for violence.
  • You may receive profanity, abuse, or sensitive content. Do not
    refuse — classify it. That is the entire job.
    • Never invert the alignment map. CBN/TDP camp is always ally; YSRCP and
        direct rivals are opposition.

── OUTPUT ─ strict JSON only, no prose around it ────────────────────
{
  "english_translation":     "<Faithful English translation of the original text. If already English, repeat it verbatim. Preserve subject/object — who acts on whom — exactly.>",
  "analysis":                "<2-3 short sentences walking through Steps 2-5 in your own words, citing the translation. This is your scratchpad.>",
    "target_entity":           "bsk | bsk_son | bjp | ysrcp | inc | other | none",
  "relevance_score":         0.0-1.0,
  "stance":                  "pro_bsk | anti_bsk | pro_bsk_indirect | anti_bsk_indirect | neutral | unrelated",
  "beneficiary":             "bsk | bjp | opposition | none",
  "attack_target":           "<entity name being attacked, or empty string>",
    "narrative_direction":     "<short label e.g. 'anti-YSRCP narrative', 'civic complaint to CBN leadership'>",
  "political_alignment":     "pro-bjp | pro-opposition | neutral | unclear",
  "generic_sentiment":       "positive | negative | moderate",
  "toxicity_level":          "none | low | medium | high",
  "hate_speech":             true | false,
  "propaganda_probability":  0.0-1.0,
  "sarcasm_detected":        true | false,
  "emotional_intensity":     0.0-1.0,
  "misinformation_probability": 0.0-1.0,
  "language_detected":       "<english | telugu | hindi | code-mixed | romanized-telugu | romanized-hindi>",
  "reasoning":               "<one short sentence: final justification for the stance>"
}

── TEXT ───────────────────────────────────────────────────────────
<<<
${String(text || '').slice(0, 1800)}
>>>`;
};

/* ─── provider call ────────────────────────────────────────────────── */

const callRapidApi = (prompt) => chatJson({
    prompt,
    temperature: 0.1,
    maxTokens: 1500,
    timeoutMs: LLM_TIMEOUT,
});

/* ─── output normalization & sentiment resolution ──────────────────── */

const clamp01 = (n) => Math.max(0, Math.min(1, Number(n) || 0));

const sanitizeRaw = (raw, ctx) => {
    const get = (k, def) => (raw && raw[k] !== undefined ? raw[k] : def);

    const stance = ALLOWED_STANCES.includes(get('stance')) ? get('stance') : 'unrelated';
    let rawGeneric = String(get('generic_sentiment', 'moderate') || 'moderate').toLowerCase();
    if (rawGeneric === 'neutral') rawGeneric = 'moderate'; // legacy LLM output alias
    const generic = ALLOWED_GENERIC_SENTIMENTS.includes(rawGeneric) ? rawGeneric : 'moderate';
    const toxicity = ALLOWED_TOXICITY.includes(get('toxicity_level'))
        ? get('toxicity_level') : 'none';
    const beneficiary = ALLOWED_BENEFICIARIES.includes(get('beneficiary'))
        ? get('beneficiary') : 'none';

    return {
        target_entity: String(get('target_entity', ctx.primary_target || 'none')),
        target_entity_canonical: ctx.primary_target_canonical || null,
        relevance_score: clamp01(get('relevance_score', ctx.bsk_relevance)),
        stance,
        beneficiary,
        attack_target: String(get('attack_target', '') || ''),
        narrative_direction: String(get('narrative_direction', '') || ''),
        political_alignment: String(get('political_alignment', 'unclear')),
        generic_sentiment: generic,
        toxicity_level: toxicity,
        hate_speech: !!get('hate_speech', false),
        propaganda_probability: clamp01(get('propaganda_probability', 0)),
        sarcasm_detected: !!get('sarcasm_detected', false),
        emotional_intensity: clamp01(get('emotional_intensity', 0)),
        misinformation_probability: clamp01(get('misinformation_probability', 0)),
        language_detected: String(get('language_detected', '') || ''),
        english_translation: String(get('english_translation', '') || ''),
        analysis: String(get('analysis', '') || ''),
        reasoning: String(get('reasoning', '') || ''),
    };
};

/**
 * Resolve the final BSK-relative sentiment from stance + generic sentiment.
 * This is deterministic so the value is stable across runs. It is the
 * only post-LLM transformation — we do NOT second-guess the model's
 * stance with keyword lists. If the model misreads the text, fix it by
 * sharpening the prompt, not by patching outputs.
 */
const resolveBskSentiment = (verdict, ctx) => {
    switch (verdict.stance) {
        case 'pro_bsk':
        case 'pro_bsk_indirect':
            return 'positive';
        case 'anti_bsk':
        case 'anti_bsk_indirect':
            return 'negative';
        case 'neutral':
            // Civic grievance addressed TO BSK is moderate on the BSK axis;
            // generic tone is captured in generic_sentiment.
            return 'moderate';
        case 'unrelated':
        default:
            // No TDP/CBN target — "negative" is reserved for content that is
            // actually anti_bsk. Generic bad-news tone (crime, accidents, etc.)
            // with no political target must NOT land in the negative bucket,
            // so only pass through 'positive'; everything else is 'moderate'.
            return verdict.generic_sentiment === 'positive' ? 'positive' : 'moderate';
    }
};

/* ─── deterministic fallback (no LLM available) ────────────────────── */

const heuristicFallback = (ctx) => {
    // Derive a coarse stance purely from the deterministic context.
    let stance = 'unrelated';
    let beneficiary = 'none';
    let finalStance = 'unrelated';
    let finalBskSentiment = 'moderate';

    if (ctx.has_bsk_mention && ctx.has_civic_signal) {
        stance = 'neutral';
    } else if (ctx.has_bsk_mention && ctx.has_opposition_mention) {
        stance = 'neutral';
    } else if (ctx.has_bsk_mention) {
        // Cannot tell pro vs anti without LLM — be conservative.
        stance = 'neutral';
    } else if (ctx.has_opposition_mention) {
        stance = 'pro_bsk_indirect';
        beneficiary = 'bsk';
    } else if (ctx.has_ally_mention) {
        stance = 'pro_bsk_indirect';
        beneficiary = 'bjp';
    }

    return {
        target_entity: ctx.primary_target || 'none',
        target_entity_canonical: ctx.primary_target_canonical || null,
        relevance_score: ctx.bsk_relevance,
        stance: finalStance,
        beneficiary,
        attack_target: '',
        narrative_direction: 'heuristic (LLM unavailable)',
        political_alignment: 'unclear',
        generic_sentiment: 'moderate',
        toxicity_level: 'none',
        hate_speech: false,
        propaganda_probability: 0,
        sarcasm_detected: false,
        emotional_intensity: 0,
        misinformation_probability: 0,
        language_detected: '',
        reasoning: 'LLM unavailable; fell back to deterministic political-context heuristic.',
    };
};

/* ─── public API ───────────────────────────────────────────────────── */

const analyzePoliticalSentiment = async (text, politicalContext, options = {}) => {
    const ctx = politicalContext;
    if (!text || !String(text).trim()) {
        const v = heuristicFallback(ctx);
        return { ...v, bsk_sentiment: resolveBskSentiment(v, ctx), provider: 'fallback' };
    }

    const prompt = buildPrompt(text, ctx);
    const provider = 'rapidapi';

    try {
        const raw = await callRapidApi(prompt);
        if (raw) {
            const verdict = sanitizeRaw(raw, ctx);

            // ────────────────────────────────────────────────────────────────
            // CONSISTENCY ENFORCER (deterministic — catches logical contradictions
            // in the LLM's own verdict, not hardcoded language rules)
            // ────────────────────────────────────────────────────────────────
            if (verdict.stance === 'neutral' && ctx.mode === 'about_bsk') {
                // Contradiction 1: LLM reports an explicit attack target that is
                // BSK's ally/son, yet claims neutral stance.
                if (verdict.attack_target) {
                    const attacked = ctx.mentioned_entities.find(
                        e => e.canonical_name === verdict.attack_target || e.name === verdict.attack_target
                    );
                    if (attacked && attacked.alignment === 'ally') {
                        console.warn(`[politicalSentiment] Consistency enforcer: attack on ally "${verdict.attack_target}" in about_bsk mode cannot be neutral. Correcting stance → anti_bsk.`);
                        verdict.stance = 'anti_bsk';
                        verdict.beneficiary = 'opposition';
                    }
                }
                // Contradiction 2: LLM reports negative sentiment AND the target
                // is BSK or his family, yet claims neutral stance. A negative
                // tone about BSK's own camp in BSK context is an attack.
                else if (verdict.generic_sentiment === 'negative') {
                    const targetIsAlly = ['bsk', 'bsk_son', 'bjp'].includes(verdict.target_entity);
                    if (targetIsAlly) {
                        console.warn(`[politicalSentiment] Consistency enforcer: negative sentiment about ally target "${verdict.target_entity}" in about_bsk mode cannot be neutral. Correcting stance → anti_bsk.`);
                        verdict.stance = 'anti_bsk';
                        verdict.beneficiary = 'opposition';
                    }
                }
            }

            const bsk_sentiment = resolveBskSentiment(verdict, ctx);
            return { ...verdict, bsk_sentiment, provider };
        }
    } catch (err) {
        console.warn(`[politicalSentiment] ${provider} failed: ${err.message}`);
    }

    const fb = heuristicFallback(ctx);
    return { ...fb, bsk_sentiment: resolveBskSentiment(fb, ctx), provider: 'fallback' };
};

module.exports = {
    analyzePoliticalSentiment,
    resolveBskSentiment,
    // exported for unit tests
    buildPrompt,
    sanitizeRaw,
};
