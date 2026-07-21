const NewsArticle = require('../models/NewsArticle');

// Build the constituency $or fragment for a scoped MLA/MP. Returns null when the
// caller can see everything (super admin / party leadership / legacy roles) and
// an impossible match when a scoped user has no seats assigned.
const buildNewsScopeOr = (scope) => {
  if (!scope || scope.canSeeAll) return null;
  const seats = scope.constituencies || [];
  if (seats.length === 0) return false;
  const escape = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const seatRx = new RegExp(`(${seats.map(escape).join('|')})`, 'i');
  return [
    { title: seatRx },
    { title_english: seatRx },
    { summary: seatRx },
    { summary_english: seatRx },
    { keywords_matched: seatRx },
    { 'detected_location.city': seatRx },
    { 'detected_location.district': seatRx },
  ];
};

exports.getArticles = async (req, res) => {
  try {
    const {
      page        = 1,
      limit       = 20,
      search,
      district,
      category,
      source_type,
      language,
    } = req.query;

    // Never show articles from these domains in the UI
    const EXCLUDED_DOMAINS = ['indianexpress.com', 'news.google.com'];
    const filter = { source_domain: { $nin: EXCLUDED_DOMAINS } };

    // RBAC: scoped MLAs / MPs only see news that mentions their seat name
    // anywhere in the article (title, summary, matched keywords, detected
    // location). Super admin / party leadership pass through.
    const scopeOr = buildNewsScopeOr(req.scope);
    if (scopeOr === false) {
      return res.json({ articles: [], pagination: { page: 1, pages: 0, total: 0, limit: 0 } });
    }
    if (scopeOr) {
      filter.$and = [{ $or: scopeOr }];
    }

    if (search) {
      const rx = new RegExp(search, 'i');
      const searchOr = [
        { title: rx },
        { title_english: rx },
        { summary: rx },
        { summary_english: rx },
        { source_name: rx },
        { keywords_matched: rx },
      ];
      // Merge with the scope $and instead of clobbering it.
      filter.$and = (filter.$and || []).concat([{ $or: searchOr }]);
    }

    if (district && district !== 'all') {
      filter['detected_location.district'] = district;
    }
    if (category && category !== 'all') {
      filter.category = category;
    }
    if (source_type && source_type !== 'all') {
      filter.source_type = source_type;
    }
    if (language && language !== 'all') {
      filter.language = language;
    }

    const pageNum  = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10)));
    const skip     = (pageNum - 1) * limitNum;

    const [articles, total] = await Promise.all([
      NewsArticle.find(filter).sort({ published_date: -1 }).skip(skip).limit(limitNum).lean(),
      NewsArticle.countDocuments(filter),
    ]);

    res.json({
      articles,
      pagination: {
        page:  pageNum,
        pages: Math.ceil(total / limitNum),
        total,
        limit: limitNum,
      },
    });
  } catch (err) {
    console.error('[NewsController] getArticles error:', err);
    res.status(500).json({ message: 'Failed to fetch news articles' });
  }
};

exports.getStats = async (req, res) => {
  try {
    const scopeOr = buildNewsScopeOr(req.scope);
    if (scopeOr === false) {
      return res.json({ total: 0, byCategory: [], byLanguage: [], bySourceType: [] });
    }
    const matchStage = scopeOr ? [{ $match: { $or: scopeOr } }] : [];
    const countFilter = scopeOr ? { $or: scopeOr } : {};

    const [total, byCategory, byLanguage, bySourceType] = await Promise.all([
      NewsArticle.countDocuments(countFilter),
      NewsArticle.aggregate([...matchStage, { $group: { _id: '$category', count: { $sum: 1 } } }]),
      NewsArticle.aggregate([...matchStage, { $group: { _id: '$language', count: { $sum: 1 } } }]),
      NewsArticle.aggregate([...matchStage, { $group: { _id: '$source_type', count: { $sum: 1 } } }]),
    ]);
    res.json({ total, byCategory, byLanguage, bySourceType });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch news stats' });
  }
};

exports.getRssKeywords = async (req, res) => {
  try {
    const mongoose = require('mongoose');
    const col = mongoose.connection.db.collection('rsskeywords');
    let keywords = await col.find({}).toArray();

    const defaultKeywordsList = [
      'chandrababu naidu', 'chandrababu', 'naidu', 'cbn', 'nara lokesh', 'lokesh nara', 'lokesh',
      'ys jagan', 'jagan mohan reddy', 'jagan reddy', 'jagan', 'ysr', 'ysrcp',
      'pawan kalyan', 'pawan', 'kalyan', 'jana sena', 'janasena', 'jsp',
      'purandeswari', 'bhuvaneshwari', 'ys sharmila', 'sharmila', 'balakrishna',
      'చంద్రబాబు', 'నాయుడు', 'జగన్', 'పవన్ కళ్యాణ్', 'లోకేష్', 'వైఎస్ఆర్',
      'tdp', 'telugu desam', 'telugu desam party', 'ysr congress', 'janasena party',
      'andhra pradesh politics', 'ap politics', 'ap elections', 'andhra assembly', 'assembly elections',
      'nda alliance', 'bjp ap', 'congress ap', 'super six', 'super 6',
      'తెలుగుదేశం', 'వైసీపీ', 'జనసేన', 'ఆంధ్రప్రదేశ్ రాజకీయాలు', 'కూటమి',
      'amaravati', 'polavaram', 'rayalaseema', 'vizag', 'visakhapatnam', 'vijayawada', 'guntur',
      'kuppam', 'mangalagiri', 'pulivendula', 'pension', 'welfare scheme', 'land titling',
      'అమరావతి', 'పోలవరం', 'రాయలసీమ', 'విశాఖపట్నం', 'విజయవాడ', 'గుంటూరు', 'కుప్పం', 'మంగళరి', 'పెన్షన్'
    ];

    const existingKeywords = new Set(keywords.map(k => k.keyword));
    const missingDocs = [];
    for (const kw of defaultKeywordsList) {
      const cleanKw = kw.toLowerCase().trim();
      if (!existingKeywords.has(cleanKw)) {
        const isTelugu = /[\u0C00-\u0C7F]/.test(cleanKw);
        missingDocs.push({
          keyword: cleanKw,
          language: isTelugu ? 'te' : 'en',
          is_active: true,
          created_at: new Date()
        });
      }
    }

    if (missingDocs.length > 0) {
      await col.insertMany(missingDocs);
      keywords = await col.find({}).toArray();
    }

    res.json(keywords);
  } catch (err) {
    console.error('[NewsController] getRssKeywords error:', err);
    res.status(500).json({ message: 'Failed to fetch RSS keywords' });
  }
};

exports.addRssKeyword = async (req, res) => {
  try {
    const mongoose = require('mongoose');
    const { keyword, language } = req.body;
    if (!keyword || !keyword.trim()) {
      return res.status(400).json({ message: 'Keyword is required' });
    }
    const cleanKeyword = keyword.trim().toLowerCase();
    const lang = language === 'te' ? 'te' : 'en';

    const col = mongoose.connection.db.collection('rsskeywords');
    const existing = await col.findOne({ keyword: cleanKeyword });
    if (existing) {
      return res.status(409).json({ message: 'Keyword already exists' });
    }

    const doc = {
      keyword: cleanKeyword,
      language: lang,
      is_active: true,
      created_at: new Date()
    };
    await col.insertOne(doc);
    res.status(201).json(doc);
  } catch (err) {
    console.error('[NewsController] addRssKeyword error:', err);
    res.status(500).json({ message: 'Failed to add RSS keyword' });
  }
};

exports.deleteRssKeyword = async (req, res) => {
  try {
    const mongoose = require('mongoose');
    const { keyword } = req.params;
    if (!keyword) {
      return res.status(400).json({ message: 'Keyword is required' });
    }
    const col = mongoose.connection.db.collection('rsskeywords');
    await col.deleteOne({ keyword: keyword.toLowerCase().trim() });
    res.json({ message: 'Keyword deleted successfully' });
  } catch (err) {
    console.error('[NewsController] deleteRssKeyword error:', err);
    res.status(500).json({ message: 'Failed to delete RSS keyword' });
  }
};
