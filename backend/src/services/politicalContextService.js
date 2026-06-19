/**
 * politicalContextService
 * ─────────────────────────────────────────────────────────────────────
 * Stage 3 of the target-aware grievance pipeline.
 *
 * Pure-JS, deterministic, NO LLM call. Given a piece of social-media
 * text, this service produces a structured snapshot of which political
 * entities are mentioned, who the primary target is, and how the content
 * relates to Chandrababu Naidu / the TDP leadership (legacy key: BSK).
 *
 * The downstream `politicalSentimentService` injects this snapshot into
 * its LLM prompt so the model reasons about sentiment RELATIVE TO BSK
 * rather than performing generic positive/negative classification.
 *
 *   buildPoliticalContext(text, { taggedKeyword, authorHandle, platform })
 *     → {
 *         mentioned_entities: [{ key, canonical, alignment, ... }],
 *         primary_target,            // entity key with highest priority
 *         primary_target_alignment,  // 'ally' | 'opposition' | 'neutral' | null
 *         bsk_relevance,             // 0..1 (deterministic heuristic)
 *         mode,                      // 'about_bsk' | 'about_opposition'
 *                                    // | 'general_politics' | 'civic_grievance'
 *                                    // | 'irrelevant'
 *         has_bsk_mention,
 *         has_opposition_mention,
 *         has_ally_mention,
 *         language_hints: { has_telugu, has_hindi, has_devanagari, ... },
 *         summary,                   // human-readable one-liner for prompt
 *       }
 */

const {
    POLITICAL_ENTITIES,
    ALIAS_INDEX,
    isAlly,
    isOpposition,
    isNeutral,
    isBskTarget,
} = require('../config/politicalEntities');

/* ─── language / script detection ──────────────────────────────────── */

const TELUGU_RANGE   = /[\u0C00-\u0C7F]/;
const DEVANAGARI_RX  = /[\u0900-\u097F]/;
const TAMIL_RX       = /[\u0B80-\u0BFF]/;
const KANNADA_RX     = /[\u0C80-\u0CFF]/;
const URDU_ARABIC_RX = /[\u0600-\u06FF]/;

const detectLanguageHints = (text) => ({
    has_telugu:     TELUGU_RANGE.test(text),
    has_hindi:      DEVANAGARI_RX.test(text),
    has_devanagari: DEVANAGARI_RX.test(text),
    has_tamil:      TAMIL_RX.test(text),
    has_kannada:    KANNADA_RX.test(text),
    has_urdu:       URDU_ARABIC_RX.test(text),
    has_latin:      /[a-z]/i.test(text),
});

/* ─── lightweight civic-grievance lexicon (multilingual) ──────────── */

const CIVIC_GRIEVANCE_TOKENS = [
    // English
    'pothole', 'power cut', 'electricity', 'water supply', 'road repair',
    'street light', 'sanitation', 'garbage', 'drainage', 'sewage',
    'ration', 'pension', 'school fee', 'hospital', 'ambulance',
    'farmer', 'crop loss', 'unemployment', 'salary not paid',
    // Telugu
    'కరెంట్', 'నీళ్లు', 'నీరు', 'రోడ్డు', 'గుంత', 'డ్రైనేజీ',
    'రేషన్', 'పెన్షన్', 'పంట', 'రైతు', 'ఆస్పత్రి', 'పాఠశాల',
    'వీధి దీపం', 'ఉద్యోగం',
    // Hindi
    'बिजली', 'पानी', 'सड़क', 'गड्ढा', 'राशन', 'पेंशन', 'किसान',
    'अस्पताल', 'स्कूल फीस', 'सीवर',
];

const containsCivicSignal = (lowerText) =>
    CIVIC_GRIEVANCE_TOKENS.some((t) => lowerText.includes(t.toLowerCase()));

/* ─── alias matching ───────────────────────────────────────────────── */

/**
 * Walk the sorted alias index once and collect every match. Multiple
 * occurrences of the same entity count once. Returns entity keys in
 * the order of first appearance + a per-entity match metadata bag.
 */
const findMentionedEntities = (text) => {
    const lower = ` ${String(text || '').toLowerCase()} `; // pad for boundary detection
    const seen  = new Map();

    for (const { alias, entityKey } of ALIAS_INDEX) {
        if (seen.has(entityKey)) continue;
        if (!lower.includes(alias)) continue;

        // For short purely-alphanumeric aliases, require a non-word boundary
        // so 'tdp' doesn't match inside 'tdpsupporter' but DOES match 'tdp4ap'.
        if (/^[a-z0-9]+$/.test(alias) && alias.length <= 4) {
            const rx = new RegExp(`(?:^|[^a-z0-9_])${alias}(?:[^a-z0-9_]|$)`, 'i');
            if (!rx.test(text)) continue;
        }

        const ent = POLITICAL_ENTITIES[entityKey];
        seen.set(entityKey, {
            key: entityKey,
            canonical: ent.canonical,
            type: ent.type,
            party: ent.party || null,
            alignment: ent.alignment,
            priority: ent.priority || 0,
            alias_matched: alias,
        });
    }

    return [...seen.values()];
};

/* ─── relevance score & mode ───────────────────────────────────────── */

const computeBskRelevance = (mentions, taggedKeyword, authorHandle) => {
    const tagged = String(taggedKeyword || '').toLowerCase();
    const author = String(authorHandle || '').toLowerCase();

    const hasBsk        = mentions.some((m) => isBskTarget(m.key));
    const hasAlly       = mentions.some((m) => isAlly(m.key));
    const hasOpposition = mentions.some((m) => isOpposition(m.key));

    // Direct BSK mention → very high relevance
    if (hasBsk) return 1.0;

    // Tagged-keyword bootstrap: the fetcher saved the keyword that pulled
    // this post; if the keyword itself was a BSK alias, treat as high.
    const bskAliases = POLITICAL_ENTITIES.bsk.aliases.concat(
        POLITICAL_ENTITIES.bsk_son.aliases
    );
    if (bskAliases.some((a) => tagged.includes(a.toLowerCase()))) return 0.9;

    if (hasOpposition && hasAlly) return 0.8;
    if (hasOpposition)            return 0.55; // opposition-only — often relevant to BSK indirectly
    if (hasAlly)                  return 0.5;
    return 0.1;
};

const decideMode = ({ mentions, bskRelevance, hasCivic }) => {
    const hasBsk        = mentions.some((m) => isBskTarget(m.key));
    const hasAlly       = mentions.some((m) => isAlly(m.key));
    const hasOpposition = mentions.some((m) => isOpposition(m.key));

    if (hasBsk && hasCivic)        return 'civic_grievance';
    if (hasBsk)                    return 'about_bsk';
    if (hasOpposition && hasAlly)  return 'about_bsk';        // comparative
    if (hasOpposition)             return 'about_opposition';
    if (hasAlly)                   return 'about_bsk';        // praising an NDA ally indirectly helps CBN
    if (hasCivic)                  return 'civic_grievance';
    if (bskRelevance < 0.2)        return 'irrelevant';
    return 'general_politics';
};

/* ─── primary target selection ─────────────────────────────────────── */

const pickPrimaryTarget = (mentions) => {
    if (mentions.length === 0) return null;

    // 1. BSK / BSK son always wins if present.
    const bskHit = mentions.find((m) => isBskTarget(m.key));
    if (bskHit) return bskHit;

    // 2. Otherwise pick the highest-priority entity.
    return mentions.slice().sort((a, b) => b.priority - a.priority)[0];
};

/* ─── public API ───────────────────────────────────────────────────── */

const buildPoliticalContext = (text, opts = {}) => {
    const { taggedKeyword = '', authorHandle = '', platform = '' } = opts;
    const raw = String(text || '');
    const lower = raw.toLowerCase();

    const mentions       = findMentionedEntities(raw);
    const hasCivic       = containsCivicSignal(lower);
    const bskRelevance   = computeBskRelevance(mentions, taggedKeyword, authorHandle);
    const primary        = pickPrimaryTarget(mentions);
    const mode           = decideMode({ mentions, bskRelevance, hasCivic });
    const languageHints  = detectLanguageHints(raw);

    const hasBsk        = mentions.some((m) => isBskTarget(m.key));
    const hasAlly       = mentions.some((m) => isAlly(m.key));
    const hasOpposition = mentions.some((m) => isOpposition(m.key));

    const summaryParts = [];
    if (hasBsk)        summaryParts.push('mentions BSK directly');
    if (hasAlly && !hasBsk) summaryParts.push('mentions TDP/NDA ally');
    if (hasOpposition) summaryParts.push('mentions opposition');
    if (hasCivic)      summaryParts.push('contains civic grievance signal');
    if (summaryParts.length === 0) summaryParts.push('no clear political target detected');

    return {
        mentioned_entities: mentions,
        primary_target: primary?.key || null,
        primary_target_canonical: primary?.canonical || null,
        primary_target_alignment: primary?.alignment || null,
        has_bsk_mention: hasBsk,
        has_ally_mention: hasAlly,
        has_opposition_mention: hasOpposition,
        has_civic_signal: hasCivic,
        bsk_relevance: bskRelevance,
        mode,
        language_hints: languageHints,
        tagged_keyword: taggedKeyword || null,
        author_handle: authorHandle || null,
        platform: platform || null,
        summary: summaryParts.join('; '),
    };
};

module.exports = {
    buildPoliticalContext,
    // exposed for unit tests
    findMentionedEntities,
    detectLanguageHints,
    containsCivicSignal,
};
