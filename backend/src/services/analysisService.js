require('dotenv').config();
const axios = require('axios');
const { categorizeText } = require('./llmService');
const mappingService = require('./mappingService');
const { buildPoliticalContext } = require('./politicalContextService');
const { analyzePoliticalSentiment } = require('./politicalSentimentService');
const LegalSection = require('../models/LegalSection');
const PlatformPolicy = require('../models/PlatformPolicy');

/**
 * Advanced Dual-Pass AI Analysis (V5.1)
 * Pass A: RapidAPI ChatGPT-42 LLM for Intent & Categorization
 * Pass B: Local Fine-Tuned Model for Legal & Policy Mapping
 * Replaces legacy Toxicity and Distilbert models.
 * Pass D: Standalone Deepfake Forensics (S3-First, Async)
 */

/**
 * //
 * Global lock to ensure forensic analyses are processed strictly one-by-one.
 */
let forensicLock = Promise.resolve();

const triggerForensicAnalysis = async (content, analysisId) => {
  const log = (msg) => console.log(`[ForensicLock] ${msg}`);
  const mlServiceUrl = process.env.DEEPFAKE_ML_URL || 'http://localhost:8001';

  // Entry into sequential queue
  return forensicLock = forensicLock.then(async () => {
    try {
      log(`Acquired lock for Analysis: ${analysisId}`);
      let mediaItems = content.media || [];

      // Fallback: If no media items but platform is YouTube/Facebook, use content_url
      if (mediaItems.length === 0 && (content.platform === 'youtube' || content.platform === 'facebook')) {
        const url = content.content_url || content.url;
        if (url) {
          mediaItems = [{ url, type: 'video' }];
        }
      }

      if (mediaItems.length === 0) return null;

      // Prioritize S3 URLs if archived, fallback to platform URL
      const payload = {
        media_items: mediaItems.map(m => ({
          url: m.s3_url || m.video_url || m.url,
          type: m.type === 'video' ? 'video' : 'image'
        }))
      };

      log(`Triggering batch forensics for ${payload.media_items.length} items (Analysis: ${analysisId})`);

      const response = await axios.post(`${mlServiceUrl}/detect/batch`, payload, { timeout: 300000 });
      log(`Forensics Complete for ${analysisId}`);
      return response.data.results || null;

    } catch (err) {
      log(`Forensics Failed for ${analysisId}: ${err.message}`);
      return null;
    } finally {
      log(`Released lock for Analysis: ${analysisId}`);
    }
  });
};

const analyzeContent = async (text, options = {}) => {
  const log = (msg) => console.log(`[AnalysisService] ${msg}`);

  if (!text || !text.trim()) {
    return {
      risk_level: 'low',
      risk_score: 0,
      explanation: 'No text provided.',
      violated_policies: [],
      legal_sections: [],
      triggered_keywords: []
    };
  }

  try {
    log(`Starting Dual-Pass analysis for: "${text.substring(0, 50)}..."`);

    // --- PASS A: LLM INTENT ANALYSIS ---
    log("Running Pass A (Primary AI Content Understanding)...");
    let llmResult = await categorizeText(text);

    if (!llmResult) {
      log("Pass A failed. Using fallback categorization (Normal).");
      llmResult = {
        category: 'Normal',
        reasoning: 'Primary AI analysis unavailable. Defaulting to Normal category.'
      };
    }

    // --- PASS B: DETERMINISTIC MAPPING ENGINE ---
    // --- PASS B: DETERMINISTIC MAPPING ENGINE ---
    log("Running Pass B (Deterministic Mapping Engine)...");

    // Check against ALL platforms for comprehensive policy analysis
    const supportedPlatforms = ['x', 'youtube', 'facebook', 'instagram'];
    let allViolatedPolicies = [];
    let aggregatedLegalSections = []; // Should be same across platforms for same country
    let aggregatedKeywords = [];

    // We run mapping for all platforms to show "Cyber Simulation" results
    supportedPlatforms.forEach(p => {
      const result = mappingService.resolveMapping(
        llmResult.category,
        text,
        p,
        options.country || 'IN'
      );
      if (result.platform_policies && result.platform_policies.length > 0) {
        allViolatedPolicies.push(...result.platform_policies);
      }
      // Capture legal/keywords from the first valid run (they don't depend on platform)
      if (aggregatedLegalSections.length === 0) aggregatedLegalSections = result.legal_sections || [];
      if (aggregatedKeywords.length === 0) aggregatedKeywords = result.triggered_keywords || [];
    });

    const mappingResult = {
      legal_sections: aggregatedLegalSections,
      platform_policies: allViolatedPolicies,
      triggered_keywords: aggregatedKeywords
    };

    // --- PASS C: RISK ASSESSMENT (LLM-Driven) ---
    // Pass C was previously a standalone ML model, now integrated into Pass A (LLM) for efficiency.
    log("Applying Risk Assessment from LLM...");
    let finalRiskLevel = llmResult.risk_level || 'low';
    let finalRiskScore = Number(llmResult.risk_score || 0);
    log(`Risk Level: ${finalRiskLevel.toUpperCase()} (Score: ${finalRiskScore})`);

    /*
    // --- PASS C: RISK SCORING ML MODEL ---
    log("Running Pass C (Risk Scoring ML Model)...");
    let finalRiskLevel = 'low';
    let finalRiskScore = 0;

    const mlServiceUrl = process.env.ML_SERVICE_URL || 'http://localhost:8006';

    try {
      const riskResponse = await axios.post(`${mlServiceUrl}/score-risk`, {
        text: text,
        category: llmResult.category,
        legal_sections: mappingResult.legal_sections.map(s => s.section)
      });

      const riskData = riskResponse.data;

      // Pass C (ML) is the "Final Word" on physical risk scoring
      finalRiskLevel = riskData.risk.toLowerCase();
      finalRiskScore = Math.round(riskData.confidence * 100);

      log(`Risk Scoring Complete: ${finalRiskLevel.toUpperCase()} (${finalRiskScore}%) [Method: ${riskData.method}]`);

    } catch (error) {
      log(`Pass C (Risk Service) failed: ${error.message}.`);

      // Fallback: If ML is down, use a heuristic based on LLM category
      const highRiskCategories = ['Violence', 'Hate_Speech', 'Sexual_Violence', 'Threat'];
      if (highRiskCategories.includes(llmResult.category)) {
        finalRiskLevel = 'high';
        finalRiskScore = 85;
        log(`ML Service Down. Fallback to HIGH risk based on LLM category: ${llmResult.category}`);
      } else {
        finalRiskLevel = 'low';
        finalRiskScore = 15;
      }
    }
    */

    // --- TARGET-AWARE POLITICAL SENTIMENT (Stages 3 & 4) ---
    // The old category-driven sentiment override is GONE. Sentiment is now
    // resolved RELATIVE TO Chandrababu Naidu / the TDP leadership via the
    // deterministic politicalContextService + LLM politicalSentimentService.
    log("Running Stage 3 (Political Context Gate)...");
    const politicalCtx = buildPoliticalContext(text, {
      taggedKeyword: options.taggedKeyword || '',
      authorHandle: options.authorHandle || '',
      platform: options.platform || '',
    });
    log(`Political context: mode=${politicalCtx.mode} target=${politicalCtx.primary_target || 'none'} bsk_relevance=${politicalCtx.bsk_relevance.toFixed(2)}`);

    log("Running Stage 4 (Target-Aware Political Sentiment LLM)...");
    const political = await analyzePoliticalSentiment(text, politicalCtx);
    log(`Stance=${political.stance} bsk_sentiment=${political.bsk_sentiment} beneficiary=${political.beneficiary} provider=${political.provider}`);

    // ── Political-risk elevation (sync risk with stance/sentiment) ──
    // Pass A risk is moderation-only (hate/threats). Political damage
    // to BSK (anti-bsk content) raises risk independently.
    if (political.stance === 'anti_bsk') {
        finalRiskLevel = 'high';
        finalRiskScore = Math.max(finalRiskScore, 75);
        log(`Political risk elevation: anti_bsk detected → ${finalRiskLevel} (${finalRiskScore})`);
    } else if (political.stance === 'anti_bsk_indirect') {
        finalRiskLevel = 'medium';
        finalRiskScore = Math.max(finalRiskScore, 55);
        log(`Political risk elevation: anti_bsk_indirect detected → ${finalRiskLevel} (${finalRiskScore})`);
    }

    const finalSentiment = political.bsk_sentiment || 'neutral';
    const currentCategory = llmResult.category;

    // --- RESULT CONSOLIDATION ---
    const finalResult = {
      risk_level: finalRiskLevel,
      risk_score: finalRiskScore,
      // Citizen-impact severity + best-fit government department from the
      // extended Pass A schema. Both are validated inside categorizeText.
      severity: llmResult.severity || finalRiskLevel,
      concerned_department: llmResult.concerned_department || 'General Administration',
      primary_intent: currentCategory,
      category: currentCategory,
      grievance_type: llmResult.grievance_type || 'Normal',
      grievance_topic_reasoning: llmResult.grievance_reasoning || '',
      intent: currentCategory,
      violated_policies: mappingResult.platform_policies || [],
      legal_sections: mappingResult.legal_sections || [],
      triggered_keywords: mappingResult.triggered_keywords || [],
      sentiment: finalSentiment,
      // ── Target-aware political fields (NEW) ──────────────────────
      bsk_sentiment: political.bsk_sentiment,
      generic_sentiment: political.generic_sentiment,
      target_entity: political.target_entity,
      target_entity_canonical: political.target_entity_canonical,
      relevance_score: political.relevance_score,
      bsk_relevance: politicalCtx.bsk_relevance,
      stance: political.stance,
      beneficiary: political.beneficiary,
      attack_target: political.attack_target,
      narrative_direction: political.narrative_direction,
      political_alignment: political.political_alignment,
      political_mode: politicalCtx.mode,
      mentioned_entities: politicalCtx.mentioned_entities,
      toxicity_level: political.toxicity_level,
      hate_speech: political.hate_speech,
      propaganda_probability: political.propaganda_probability,
      sarcasm_detected: political.sarcasm_detected,
      emotional_intensity: political.emotional_intensity,
      misinformation_probability: political.misinformation_probability,
      language_detected: political.language_detected,
      political_reasoning: political.reasoning,
      political_analysis: political.analysis,
      english_translation: political.english_translation,
      political_provider: political.provider,
      // ─────────────────────────────────────────────────────────────
      explanation: llmResult.reasoning || '',
      highlights: mappingResult.triggered_keywords || [],
      // Structure for ReasonModal
      llm_analysis: {
        category: currentCategory,
        grievance_type: llmResult.grievance_type || 'Normal',
        grievance_reasoning: llmResult.grievance_reasoning || '',
        intent: currentCategory,
        sentiment: finalSentiment,
        bsk_sentiment: political.bsk_sentiment,
        stance: political.stance,
        beneficiary: political.beneficiary,
        attack_target: political.attack_target,
        narrative_direction: political.narrative_direction,
        target_entity: political.target_entity,
        mentioned_entities: politicalCtx.mentioned_entities,
        reasoning: llmResult.reasoning || '',
        political_reasoning: political.reasoning,
        score: finalRiskScore,
        platform_policies_violated: mappingResult.platform_policies || [],
        bns_sections_violated: mappingResult.legal_sections || []
      }
    };

    // 3. Final Metadata for UI
    finalResult.reasons = [
      finalResult.explanation,
      `Risk Assessment: ${finalRiskLevel.toUpperCase()} (${finalRiskScore}%)`,
      ...finalResult.violated_policies.map(p => `Policy: ${p.policy_name}`),
      ...finalResult.legal_sections.map(l => `Legal: ${l.act} ${l.section}`)
    ].filter(Boolean);

    // --- PASS D: STANDALONE FORENSICS (POST-SAVE TRIGGER) ---
    // If we have content metadata (from monitorService), trigger forensics
    let forensicResults = null;
    if (!options.skipForensics && options.content && options.analysisId) {
      forensicResults = await triggerForensicAnalysis(options.content, options.analysisId);
    }

    finalResult.forensic_results = forensicResults;


    return finalResult;

  } catch (error) {
    log(`Critical Analysis Error: ${error.message}`);
    return {
      risk_level: 'low',
      risk_score: 0,
      explanation: `Analysis failed: ${error.message}`,
      violated_policies: [],
      legal_sections: [],
      triggered_keywords: []
    };
  }
};

module.exports = {
  analyzeContent
};