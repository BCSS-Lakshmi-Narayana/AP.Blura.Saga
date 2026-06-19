/**
 * mlaReferenceService
 * ─────────────────────────────────────────────────────────────────────
 * Read-only reference layer over the Andhra Pradesh MLA dataset
 * (175 assembly constituencies, sourced from ADR/ECI 2024).
 *
 * This is the backend source of truth for MLA ↔ constituency mapping,
 * mirroring frontend/src/data/apMLAs.js. It powers the Constituency
 * War Room intelligence endpoints (party-strategist view).
 *
 * Also exposes a lightweight, multilingual civic-issue classifier so we
 * can bucket grievance text into actionable categories (roads, water,
 * power, …) without an LLM call.
 */

const AP_MLAS = require('../data/ap_mlas.json');

/* ─── constituency key normalisation (matches frontend) ───────────── */
const normalizeConstituencyKey = (name) =>
  String(name || '')
    .toLowerCase()
    .replace(/\([^)]*\)/g, ' ')
    .replace(/[^a-z0-9]/g, '')
    .trim();

// GeoJSON↔MLA dataset spelling variants (post-2024 boundary GeoJSON uses
// slightly different transliterations than the ADR dataset).
const CONSTITUENCY_ALIASES = {
  cheepurupalli: 'cheepurupalle',
  elamanchili: 'yelamanchili',
  ponnuru: 'ponnur',
  kovuru: 'kovur',
  sathyavedu: 'satyavedusc',
};

const MLA_BY_KEY = AP_MLAS.reduce((acc, m) => {
  acc[m.key || normalizeConstituencyKey(m.constituency)] = m;
  return acc;
}, {});

const getMlaByConstituency = (name) => {
  const k = normalizeConstituencyKey(name);
  return MLA_BY_KEY[k] || MLA_BY_KEY[CONSTITUENCY_ALIASES[k]] || null;
};

const getAllMlas = () => AP_MLAS;

/* ─── parse "Rs 14,27,05,249 ~ 14 Crore+" → numeric rupees ────────── */
const parseRupees = (raw) => {
  if (!raw) return 0;
  const m = String(raw).match(/Rs\s*([0-9,]+)/i);
  if (!m) return 0;
  return Number(m[1].replace(/,/g, '')) || 0;
};

/* ─── multilingual civic-issue lexicon ────────────────────────────── */
/* Each category maps to substring tokens in English + Telugu + Hindi.   */
const ISSUE_LEXICON = {
  roads: [
    'road', 'pothole', 'highway', 'flyover', 'bridge', 'cc road',
    'రోడ్డు', 'రహదారి', 'గుంత', 'వంతెన',
    'सड़क', 'गड्ढा', 'पुल',
  ],
  water: [
    'water', 'drinking water', 'tap', 'borewell', 'pipeline', 'tanker',
    'నీళ్లు', 'నీరు', 'తాగునీరు', 'మంచినీరు', 'బోరు',
    'पानी', 'नल', 'पेयजल',
  ],
  electricity: [
    'power', 'electricity', 'current', 'transformer', 'power cut', 'voltage',
    'కరెంట్', 'విద్యుత్', 'ట్రాన్స్‌ఫార్మర్',
    'बिजली', 'करंट', 'ट्रांसफार्मर',
  ],
  drainage: [
    'drainage', 'sewage', 'sewer', 'gutter', 'manhole', 'flooding',
    'డ్రైనేజీ', 'మురుగు', 'కాలువ',
    'नाली', 'सीवर', 'जल निकासी',
  ],
  sanitation: [
    'garbage', 'sanitation', 'toilet', 'cleaning', 'waste', 'dump',
    'చెత్త', 'పారిశుధ్యం', 'మరుగుదొడ్డి',
    'कचरा', 'सफाई', 'शौचालय',
  ],
  health: [
    'hospital', 'phc', 'ambulance', 'doctor', 'medicine', 'clinic', 'health',
    'ఆస్పత్రి', 'వైద్యం', 'డాక్టర్', 'మందులు',
    'अस्पताल', 'डॉक्टर', 'दवा', 'स्वास्थ्य',
  ],
  education: [
    'school', 'college', 'teacher', 'education', 'student', 'scholarship', 'fees',
    'పాఠశాల', 'కళాశాల', 'ఉపాధ్యాయుడు', 'విద్య', 'ఫీజు',
    'स्कूल', 'कॉलेज', 'शिक्षा', 'फीस',
  ],
  employment: [
    'job', 'jobs', 'employment', 'unemployment', 'salary', 'wages', 'mgnrega',
    'ఉద్యోగం', 'నిరుద్యోగం', 'జీతం', 'కూలి',
    'नौकरी', 'रोजगार', 'बेरोजगारी', 'वेतन',
  ],
  agriculture: [
    'farmer', 'crop', 'fertilizer', 'irrigation', 'rythu', 'paddy', 'msp',
    'రైతు', 'పంట', 'ఎరువు', 'సాగు', 'వ్యవసాయం',
    'किसान', 'फसल', 'खाद', 'सिंचाई',
  ],
  welfare: [
    'pension', 'ration', 'subsidy', 'scheme', 'beneficiary', 'card',
    'పెన్షన్', 'రేషన్', 'పథకం', 'సబ్సిడీ',
    'पेंशन', 'राशन', 'योजना', 'सब्सिडी',
  ],
  law_and_order: [
    'police', 'crime', 'theft', 'assault', 'safety', 'illegal', 'goonda', 'liquor',
    'పోలీసు', 'నేరం', 'దొంగతనం', 'రక్షణ', 'మద్యం',
    'पुलिस', 'अपराध', 'चोरी', 'सुरक्षा',
  ],
};

const ISSUE_CATEGORIES = Object.keys(ISSUE_LEXICON);

/**
 * Classify a piece of grievance text into civic-issue categories.
 * Returns an array of matched category keys (may be empty).
 */
const classifyIssues = (text) => {
  const lower = String(text || '').toLowerCase();
  if (!lower) return [];
  const hits = [];
  for (const [category, tokens] of Object.entries(ISSUE_LEXICON)) {
    if (tokens.some((t) => lower.includes(t.toLowerCase()))) hits.push(category);
  }
  return hits;
};

module.exports = {
  AP_MLAS,
  ISSUE_CATEGORIES,
  normalizeConstituencyKey,
  getMlaByConstituency,
  getAllMlas,
  parseRupees,
  classifyIssues,
};
