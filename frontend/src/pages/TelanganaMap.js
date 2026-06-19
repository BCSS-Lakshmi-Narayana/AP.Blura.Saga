import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { geoMercator, geoPath, geoCentroid } from 'd3-geo';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Loader2, TrendingUp, TrendingDown, Minus, BarChart3, Tag } from 'lucide-react';
import { cn } from '../lib/utils';
import { BSK_HERO, LOCAL_FALLBACK } from '../config/bskMedia';

// BSK is MP from Karimnagar Lok Sabha Constituency in Telangana.
const KARIMNAGAR_PC = 'KARIMNAGAR';
const BSK_PC_DISPLAY = 'Karimnagar';

const TOPIC_STYLES = {
  'Political Criticism': 'bg-purple-50 text-purple-700 ring-purple-200',
  'Hate Speech': 'bg-red-50 text-red-700 ring-red-200',
  'Hate Speech Threat': 'bg-red-50 text-red-700 ring-red-200',
  'Public Complaint': 'bg-blue-50 text-blue-700 ring-blue-200',
  'Corruption Complaint': 'bg-orange-50 text-orange-700 ring-orange-200',
  'General Complaint': 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  'Traffic Complaint': 'bg-amber-50 text-amber-700 ring-amber-200',
  'Public Nuisance': 'bg-rose-50 text-rose-700 ring-rose-200',
  'Road & Infrastructure': 'bg-yellow-50 text-yellow-700 ring-yellow-200',
  'Law & Order': 'bg-indigo-50 text-indigo-700 ring-indigo-200',
  'Normal': 'bg-gray-50 text-gray-600 ring-gray-200',
};

const canonicalizeTopic = (value) => {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const normalized = raw.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();

  if (normalized === 'normal' || normalized === 'govt praise' || normalized === 'government praise' || normalized === 'general praise' || normalized === 'general complaint') return 'General Complaint';
  if (normalized === 'public complaint') return 'Public Complaint';
  if (normalized === 'political criticism') return 'Political Criticism';
  if (normalized === 'corruption complaint') return 'Corruption Complaint';
  if (normalized === 'traffic complaint') return 'Traffic Complaint';
  if (normalized === 'public nuisance') return 'Public Nuisance';
  if (normalized === 'road and infrastructure' || normalized === 'road & infrastructure') return 'Road & Infrastructure';
  if (normalized === 'law and order' || normalized === 'law & order') return 'Law & Order';
  if (normalized === 'hate speech') return 'Hate Speech';

  return normalized
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
};

const getTopicStyle = (topic) => TOPIC_STYLES[canonicalizeTopic(topic)] || 'bg-teal-50 text-teal-700 ring-teal-200';

// Assembly segments inside Karimnagar Lok Sabha PC (BSK's MP seat)
const AC_NAMES = ['Karimnagar', 'Choppadandi (SC)', 'Vemulawada', 'Sircilla', 'Manakondur (SC)', 'Husnabad', 'Huzurabad'];

const SENTIMENT_TIERS = {
  high:    { fill: '#15803d', hover: '#166534', stroke: '#14532d' },
  medium:  { fill: '#22c55e', hover: '#16a34a', stroke: '#15803d' },
  low:     { fill: '#86efac', hover: '#4ade80', stroke: '#22c55e' },
  none:    { fill: '#e2e8f0', hover: '#cbd5e1', stroke: '#94a3b8' },
};

const getSentimentColors = (stats) => {
  if (!stats || stats.count === 0) return SENTIMENT_TIERS.none;
  const ratio = (stats.positive || 0) / stats.count;
  if (ratio >= 0.6) return SENTIMENT_TIERS.high;
  if (ratio >= 0.3) return SENTIMENT_TIERS.medium;
  return SENTIMENT_TIERS.low;
};

const formatTopicLabel = (value) => {
  const canonical = canonicalizeTopic(value);
  return canonical || 'Normal';
};

const mergeTopicEntries = (entries = []) => {
  const topicMap = {};
  entries.forEach((item) => {
    const [rawTopic, rawCount] = Array.isArray(item)
      ? item
      : [item?.name || item?.topic, item?.count || 0];
    const topic = canonicalizeTopic(rawTopic);
    const count = Number(rawCount) || 0;
    if (!topic || count <= 0) return;
    topicMap[topic] = (topicMap[topic] || 0) + count;
  });
  return Object.entries(topicMap).sort((a, b) => b[1] - a[1]);
};
// City / town → Assembly segment inside Karimnagar Lok Sabha PC
const CITY_TO_AC = {
  'karimnagar': 'Karimnagar', 'choppadandi': 'Choppadandi (SC)',
  'vemulawada': 'Vemulawada', 'sircilla': 'Sircilla', 'rajanna sircilla': 'Sircilla',
  'manakondur': 'Manakondur (SC)', 'husnabad': 'Husnabad', 'huzurabad': 'Huzurabad',
  'thimmapur': 'Manakondur (SC)', 'jagtial': 'Karimnagar', 'peddapalli': 'Manakondur (SC)',
};

// City / town → Telangana district (uppercase keys to match geojson DIST_NAME)
const CITY_TO_DISTRICT = {
  'hyderabad': 'HYDERABAD', 'secunderabad': 'HYDERABAD', 'cyberabad': 'RANGAREDDY',
  'rangareddy': 'RANGAREDDY', 'medchal': 'MEDCHAL-MALKAJGIRI', 'malkajgiri': 'MEDCHAL-MALKAJGIRI',
  'karimnagar': 'KARIMNAGAR', 'jagtial': 'JAGTIAL', 'peddapalli': 'PEDDAPALLI',
  'sircilla': 'RAJANNA SIRCILLA', 'rajanna sircilla': 'RAJANNA SIRCILLA',
  'warangal': 'WARANGAL URBAN', 'hanamkonda': 'WARANGAL URBAN',
  'khammam': 'KHAMMAM', 'nizamabad': 'NIZAMABAD', 'kamareddy': 'KAMAREDDY',
  'mahbubnagar': 'MAHBUBNAGAR', 'nalgonda': 'NALGONDA', 'suryapet': 'SURYAPET',
  'medak': 'MEDAK', 'siddipet': 'SIDDIPET', 'sangareddy': 'SANGAREDDY',
  'adilabad': 'ADILABAD', 'nirmal': 'NIRMAL', 'mancherial': 'MANCHERIAL',
  'asifabad': 'KUMURAM BHEEM ASIFABAD', 'bhadradri': 'BHADRADRI KOTHAGUDEM',
  'kothagudem': 'BHADRADRI KOTHAGUDEM', 'mahabubabad': 'MAHABUBABAD',
  'jangaon': 'JANGAON', 'jayashankar': 'JAYASHANKAR BHUPALPALLY', 'bhupalpally': 'JAYASHANKAR BHUPALPALLY',
  'wanaparthy': 'WANAPARTHY', 'nagarkurnool': 'NAGARKURNOOL', 'jogulamba': 'JOGULAMBA GADWAL',
  'gadwal': 'JOGULAMBA GADWAL', 'vikarabad': 'VIKARABAD', 'narayanpet': 'NARAYANPET',
  'mulugu': 'MULUGU', 'yadadri': 'YADADRI BHUVANAGIRI', 'bhuvanagiri': 'YADADRI BHUVANAGIRI',
  // Karimnagar PC assembly-level towns → Karimnagar district (BSK's seat)
  'choppadandi': 'KARIMNAGAR', 'vemulawada': 'RAJANNA SIRCILLA',
  'manakondur': 'KARIMNAGAR', 'husnabad': 'SIDDIPET', 'huzurabad': 'KARIMNAGAR',
  'telangana': null,
};

/* ─── Sentiment Pie (pure SVG donut) ─── */
const SentimentPie = ({ positive = 0, negative = 0, neutral = 0, size = 180 }) => {
  const total = positive + negative + neutral;
  if (total === 0) {
    return (
      <div className="flex items-center justify-center" style={{ width: size, height: size }}>
        <div className="text-sm text-slate-400">No data</div>
      </div>
    );
  }

  const r = size / 2 - 8;
  const cx = size / 2;
  const cy = size / 2;
  const slices = [
    { value: negative, color: '#ef4444', label: 'Negative' },
    { value: neutral, color: '#94a3b8', label: 'Neutral' },
    { value: positive, color: '#22c55e', label: 'Positive' },
  ].filter(s => s.value > 0);

  let startAngle = -Math.PI / 2;
  const paths = slices.map((slice) => {
    const angle = (slice.value / total) * 2 * Math.PI;
    const endAngle = startAngle + angle;
    const x1 = cx + r * Math.cos(startAngle);
    const y1 = cy + r * Math.sin(startAngle);
    const x2 = cx + r * Math.cos(endAngle);
    const y2 = cy + r * Math.sin(endAngle);
    const largeArc = angle > Math.PI ? 1 : 0;
    const d = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;
    startAngle = endAngle;
    return { ...slice, d };
  });

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {paths.map((p, i) => (
        <path key={i} d={p.d} fill={p.color} stroke="white" strokeWidth={2} />
      ))}
      <circle cx={cx} cy={cy} r={r * 0.55} fill="white" />
      <text x={cx} y={cy - 6} textAnchor="middle" fill="#1e293b" fontSize="18" fontWeight="700">{total}</text>
      <text x={cx} y={cy + 12} textAnchor="middle" fill="#64748b" fontSize="10" fontWeight="500">Total</text>
    </svg>
  );
};

const TelanganaMap = ({ embedded = false }) => {
  const navigate = useNavigate();
  const [geojson, setGeojson] = useState(null);
  const [mapStats, setMapStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [hoveredDistrict, setHoveredDistrict] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [sentimentData, setSentimentData] = useState(null);
  const [categoryData, setCategoryData] = useState(null);
  const [grievanceStats, setGrievanceStats] = useState(null);
  const [karimnagarSummary, setKarimnagarSummary] = useState(null);
  const [hoverTweets, setHoverTweets] = useState([]);
  const [hoverTweetsLoading, setHoverTweetsLoading] = useState(false);
  const svgRef = useRef(null);
  const containerRef = useRef(null);
  const hoverHideTimerRef = useRef(null);

  const clearHoverHideTimer = useCallback(() => {
    if (hoverHideTimerRef.current) {
      clearTimeout(hoverHideTimerRef.current);
      hoverHideTimerRef.current = null;
    }
  }, []);

  const scheduleHoverHide = useCallback(() => {
    clearHoverHideTimer();
    hoverHideTimerRef.current = setTimeout(() => {
      setHoveredDistrict(null);
    }, 220);
  }, [clearHoverHideTimer]);

  const handleDistrictClick = useCallback((distName) => {
    if (!distName) return;
    if (embedded) {
      const DistrictName = distName.replace(/\s*\(SC\)\s*$/, '').trim();
      navigate(`/grievances?location=${encodeURIComponent(DistrictName)}&sentiment=negative`);
    } else {
      // Title-case the all-caps DIST_NAME from GeoJSON (e.g. "KARIMNAGAR" → "Karimnagar")
      const titleCased = distName.replace(/\w\S*/g, w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
      navigate(`/grievances?location=${encodeURIComponent(titleCased)}&sentiment=negative`);
    }
  }, [navigate, embedded]);

  const handleTopicClick = useCallback((topic) => {
    if (!topic) return;
    navigate(`/grievances?grievance_type=${encodeURIComponent(topic)}`);
  }, [navigate]);

  useEffect(() => {
    // Load assembly-constituency boundaries. Prefer Telangana geojson files.
    const tryLoad = async () => {
      const sources = [
        '/telangana_districts.geojson',
        '/telangana_ac.geojson',
      ];
      for (const url of sources) {
        try {
          const r = await fetch(url);
          if (!r.ok) continue;
          const txt = await r.text();
          if (!txt || txt.trim().length === 0) continue;
          let data;
          try { data = JSON.parse(txt); } catch (_) { continue; }
          if (!data?.features?.length) continue;

          const normaliseProps = (props = {}) => {
            const dist = props.DIST_NAME || props.district || props.dtname || props.NAME_2 || props.DISTRICT || '';
            const state = props.ST_NAME || props.st_nm || props.st_name || props.STATE || '';
            return {
              ...props,
              DIST_NAME: String(dist || '').toUpperCase().trim(),
              ST_NAME:   String(state || '').toUpperCase().trim(),
              AC_NAME:   props.AC_NAME || props.ac_name || '',
              PC_NAME:   props.PC_NAME || props.pc_name || ''
            };
          };

          const allNorm = data.features.map((f) => ({ ...f, properties: normaliseProps(f.properties) }));

          const telangana = allNorm.filter(f => f.properties.ST_NAME === 'TELANGANA');
          let features = telangana.length > 0
            ? telangana
            : allNorm;

          const seenKeys = new Set();
          features = features.filter((f) => {
            const k = `${f.properties?.AC_NAME || ''}|${f.properties?.PC_NAME || ''}|${f.properties?.DIST_NAME || ''}`;
            if (seenKeys.has(k)) return false;
            seenKeys.add(k);
            return true;
          });

          setGeojson({ ...data, features });
          return;
        } catch (_) { /* try next */ }
      }
    };
    tryLoad();
  }, []);

  useEffect(() => {
    if (embedded) return;
    Promise.all([
      api.get('/grievances/sentiment-analytics').catch(() => ({ data: null })),
      api.get('/grievances/category-analytics').catch(() => ({ data: null })),
      api.get('/grievances/dashboard-stats').catch(() => ({ data: null })),
      api.get('/grievances/location-summary', { params: { location_city: 'karimnagar' } }).catch(() => ({ data: null })),
    ]).then(([sentRes, catRes, statsRes, summaryRes]) => {
      setSentimentData(sentRes.data);
      setCategoryData(catRes.data);
      setGrievanceStats(statsRes.data);
      setKarimnagarSummary(summaryRes.data);
    });
  }, [embedded]);

  const fetchMapStats = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/grievances/map', { params: { days: 365, scope: embedded ? 'karimnagar' : 'all' } });
      const locs = res.data?.locations;
      if (locs && Object.keys(locs).length > 0) {
        setMapStats(locs);
        setLoading(false);
        return;
      }
      setMapStats({});
    } catch (err) { console.warn('[Map] /grievances/map failed:', err.message); setMapStats({}); }
    finally { setLoading(false); }
  }, [embedded]);

  useEffect(() => { fetchMapStats(); }, [fetchMapStats]);

  useEffect(() => () => {
    if (hoverHideTimerRef.current) clearTimeout(hoverHideTimerRef.current);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const loadHoverTweets = async () => {
      if (!embedded || !hoveredDistrict) {
        setHoverTweets([]);
        setHoverTweetsLoading(false);
        return;
      }
      const acQuery = hoveredDistrict.replace(/\s*\(SC\)\s*$/i, '').trim();
      setHoverTweetsLoading(true);
      try {
        const res = await api.get('/grievances', {
          params: {
            limit: 5,
            location_constituency: acQuery
          }
        });
        if (cancelled) return;
        const items = Array.isArray(res.data?.grievances) ? res.data.grievances : [];
        setHoverTweets(items);
      } catch (error) {
        if (!cancelled) setHoverTweets([]);
      } finally {
        if (!cancelled) setHoverTweetsLoading(false);
      }
    };

    loadHoverTweets();
    return () => { cancelled = true; };
  }, [embedded, hoveredDistrict]);

  const byDistrict = useMemo(() => {
    const m = {};
    const karimnagarAggregate = karimnagarSummary
      ? {
        total: karimnagarSummary.total || 0,
        positive: karimnagarSummary.positive || 0,
        negative: karimnagarSummary.negative || 0,
        neutral: karimnagarSummary.neutral || 0,
        categories: Array.isArray(karimnagarSummary.categories) ? karimnagarSummary.categories : []
      }
      : (mapStats?.karimnagar || null);

    if (karimnagarAggregate) {
      m['KARIMNAGAR'] = {
        count: karimnagarAggregate.total ?? karimnagarAggregate.count ?? 0,
        positive: karimnagarAggregate.positive || 0,
        negative: karimnagarAggregate.negative || 0,
        neutral: karimnagarAggregate.neutral || 0,
        categories: Array.isArray(karimnagarAggregate.categories) ? [...karimnagarAggregate.categories] : []
      };
    }

    Object.entries(mapStats).forEach(([keyword, stats]) => {
      const dist = CITY_TO_DISTRICT[keyword];
      if (!dist) return;
      if (karimnagarAggregate && dist === 'KARIMNAGAR') return;
      if (!m[dist]) m[dist] = { count: 0, positive: 0, negative: 0, neutral: 0, categories: [] };
      const totalCount = (stats.negative || 0) + (stats.positive || 0) + (stats.neutral || 0);
      m[dist].count += totalCount;
      m[dist].positive += stats.positive;
      m[dist].negative += stats.negative;
      m[dist].neutral += stats.neutral;
      m[dist].categories = m[dist].categories.concat(stats.categories || []);
    });
    Object.values(m).forEach((d) => {
      d.categories = mergeTopicEntries(d.categories);
    });
    return m;
  }, [mapStats, karimnagarSummary]);

  const byAC = useMemo(() => {
    if (!embedded) return {};
    const m = {};
    Object.entries(mapStats).forEach(([keyword, stats]) => {
      const ac = CITY_TO_AC[keyword];
      if (!ac) return;
      if (!m[ac]) m[ac] = { count: 0, positive: 0, negative: 0, neutral: 0, categories: [] };
      const totalCount = (stats.negative || 0) + (stats.positive || 0) + (stats.neutral || 0);
      m[ac].count += totalCount;
      m[ac].positive += stats.positive;
      m[ac].negative += stats.negative;
      m[ac].neutral += stats.neutral;
      m[ac].categories = m[ac].categories.concat(stats.categories || []);
    });
    Object.values(m).forEach((d) => {
      d.categories = mergeTopicEntries(d.categories);
    });
    return m;
  }, [mapStats, embedded]);

  const karimnagarFeatures = useMemo(() => {
    if (!geojson || !embedded) return null;
    const feats = geojson.features.filter(f =>
      (f.properties.PC_NAME || '').toUpperCase() === KARIMNAGAR_PC ||
      (f.properties.DIST_NAME || '').toUpperCase() === 'KARIMNAGAR'
    );
    return { ...geojson, features: feats };
  }, [geojson, embedded]);

  // ── Reference-style layout boxes ────────────────────────────────────
  // SVG is laid out as two sub-regions inside one viewBox:
  //   • STATE_BOX = full Telangana on the left
  //   • KARIM_BOX = blown-up Karimnagar district on the right
  // Embedded view (dashboard card) gets a tighter overall canvas.
  const layout = useMemo(() => {
    if (embedded) {
      return {
        dims:      { w: 980, h: 440 },
        stateBox:  { x: 20,  y: 20,  w: 540, h: 400 },
        karimBox:  { x: 640, y: 130, w: 280, h: 200 },
        labelX:    640,
        labelY:    105
      };
    }
    return {
      dims:      { w: 1200, h: 640 },
      stateBox:  { x: 40,  y: 40,  w: 620, h: 560 },
      karimBox:  { x: 800, y: 230, w: 370, h: 280 },
      labelX:    800,
      labelY:    195
    };
  }, [embedded]);

  const dims = layout.dims;

  // State (Telangana) projection — always fits the whole-state outline
  // into the left box, regardless of embedded vs. full-page mode.
  const { projection, pathGenerator } = useMemo(() => {
    if (!geojson) return { projection: null, pathGenerator: null };
    const b = layout.stateBox;
    const proj = geoMercator().fitExtent([[b.x, b.y], [b.x + b.w, b.y + b.h]], geojson);
    return { projection: proj, pathGenerator: geoPath().projection(proj) };
  }, [geojson, layout]);

  // Karimnagar-only blown-up projection on the right side of the canvas.
  const karimFeature = useMemo(() => {
    if (!geojson) return null;
    return geojson.features.find((f) => (f.properties.DIST_NAME || '').toUpperCase() === 'KARIMNAGAR');
  }, [geojson]);

  const { karimProjection, karimPath } = useMemo(() => {
    if (!karimFeature) return { karimProjection: null, karimPath: null };
    const b = layout.karimBox;
    const proj = geoMercator().fitExtent([[b.x + 10, b.y + 10], [b.x + b.w - 10, b.y + b.h - 10]], karimFeature);
    return { karimProjection: proj, karimPath: geoPath().projection(proj) };
  }, [karimFeature, layout]);

  const districtCentroids = useMemo(() => {
    if (!geojson || !projection) return {};
    const groups = {};
    geojson.features.forEach(f => {
      const d = f.properties.DIST_NAME;
      if (!groups[d]) groups[d] = [];
      groups[d].push(f);
    });
    const out = {};
    Object.entries(groups).forEach(([name, feats]) => {
      let sx = 0, sy = 0;
      feats.forEach(f => { const c = geoCentroid(f); sx += c[0]; sy += c[1]; });
      const px = projection([sx / feats.length, sy / feats.length]);
      if (px) out[name] = px;
    });
    return out;
  }, [geojson, projection]);

  const acCentroids = useMemo(() => {
    if (!karimnagarFeatures || !projection) return {};
    const out = {};
    karimnagarFeatures.features.forEach(f => {
      const name = f.properties.AC_NAME;
      const c = geoCentroid(f);
      const px = projection(c);
      if (px) out[name] = px;
    });
    return out;
  }, [karimnagarFeatures, projection]);

  const districtFeatures = useMemo(() => {
    if (!geojson) return {};
    const m = {};
    geojson.features.forEach(f => {
      const d = f.properties.DIST_NAME;
      if (!m[d]) m[d] = { name: d, hasKarimnagar: false };
      if ((f.properties.PC_NAME || '').toUpperCase() === KARIMNAGAR_PC || (d || '').toUpperCase() === 'KARIMNAGAR') m[d].hasKarimnagar = true;
    });
    return m;
  }, [geojson]);

  const handleMouseMove = (e, distName) => {
    clearHoverHideTimer();
    const rect = svgRef.current?.getBoundingClientRect();
    if (rect) setTooltipPos({ x: e.clientX - rect.left + 16, y: e.clientY - rect.top - 10 });
    setHoveredDistrict(distName);
  };

  const getTooltipTop = useCallback((estimatedHeight) => {
    const containerHeight = containerRef.current?.offsetHeight || dims.h || 700;
    const gap = 10;
    const fromTop = tooltipPos.y;
    const showAbove = fromTop > (containerHeight * 0.58);
    const rawTop = showAbove ? (fromTop - estimatedHeight - gap) : (fromTop + gap);
    const maxTop = Math.max(6, containerHeight - estimatedHeight - 6);
    return Math.min(Math.max(rawTop, 6), maxTop);
  }, [tooltipPos.y, dims.h]);

  const totalSentiment = useMemo(() => {
    if (karimnagarSummary) {
      return {
        positive: karimnagarSummary.positive || 0,
        negative: karimnagarSummary.negative || 0,
        neutral: karimnagarSummary.neutral || 0
      };
    }
    const karimnagar = mapStats?.karimnagar || byDistrict['KARIMNAGAR'];
    if (karimnagar) return { positive: karimnagar.positive || 0, negative: karimnagar.negative || 0, neutral: karimnagar.neutral || 0 };
    return { positive: 0, negative: 0, neutral: 0 };
  }, [karimnagarSummary, mapStats, byDistrict]);

  const totalGrievances = useMemo(() => {
    if (karimnagarSummary) return karimnagarSummary.total || 0;
    const karimnagar = mapStats?.karimnagar || byDistrict['KARIMNAGAR'];
    if (!karimnagar) return 0;
    return karimnagar.total ?? karimnagar.count ?? 0;
  }, [karimnagarSummary, mapStats, byDistrict]);

  const topCategories = useMemo(() => {
    if (karimnagarSummary && Array.isArray(karimnagarSummary.categories)) {
      return mergeTopicEntries(karimnagarSummary.categories).slice(0, 6);
    }
    const karimnagar = mapStats?.karimnagar || byDistrict['KARIMNAGAR'];
    if (!karimnagar || !Array.isArray(karimnagar.categories)) return [];
    return mergeTopicEntries(karimnagar.categories).slice(0, 6);
  }, [karimnagarSummary, mapStats, byDistrict]);

  if (!geojson) return <div className={cn('flex items-center justify-center', embedded ? 'h-full' : 'h-screen')}><Loader2 className="h-8 w-8 animate-spin text-green-600" /></div>;

  /* ── Embedded: Telangana state map with Karimnagar callout ── */
  if (embedded) {
    // Hover surfaces district-level stats; for non-Karimnagar districts
    // byDistrict will return null and we fall back to a "no data" tooltip.
    const hovAcName = hoveredDistrict;
    const hovStats = hovAcName ? (byDistrict[hovAcName] || byAC[hovAcName] || { count: 0, positive: 0, negative: 0, neutral: 0, categories: [] }) : null;
    const hovTopCats = hovStats?.categories || [];
    const hovTotal = (hovStats?.negative || 0) + (hovStats?.positive || 0) + (hovStats?.neutral || 0);
    const totalKarimnagarGrievances = (byDistrict['KARIMNAGAR']?.count) || Object.values(byAC).reduce((s, st) => s + (st.count || 0), 0);

    return (
      <div className="relative w-full h-full" ref={containerRef}>
        {loading && <div className="absolute top-2 right-2 z-10"><Loader2 className="h-4 w-4 animate-spin text-green-500" /></div>}
        <div className="relative bg-white h-full overflow-hidden">
          <svg ref={svgRef} viewBox={`0 0 ${dims.w} ${dims.h}`} className="w-full h-full">
            <defs>
              <filter id="tg-extrude-emb" x="-10%" y="-10%" width="125%" height="125%">
                <feOffset dx="3" dy="5" in="SourceAlpha" result="off" />
                <feGaussianBlur stdDeviation="2" in="off" result="blr" />
                <feColorMatrix in="blr" type="matrix"
                  values="0 0 0 0 0   0 0 0 0 0   0 0 0 0 0   0 0 0 0.5 0" result="shd" />
                <feMerge>
                  <feMergeNode in="shd" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* LEFT — Full Telangana with Karimnagar highlighted */}
            <g filter="url(#tg-extrude-emb)">
              {geojson.features.map((f, i) => {
                const dn = (f.properties.DIST_NAME || '').toUpperCase();
                const isKarim = dn === 'KARIMNAGAR';
                const isHov = hoveredDistrict === dn;
                return (
                  <path
                    key={i}
                    d={pathGenerator(f.geometry)}
                    fill={isKarim ? (isHov ? '#b91c1c' : '#dc2626') : (isHov ? '#fef3c7' : '#ffffff')}
                    stroke="#1f2937"
                    strokeWidth={isKarim ? 1.4 : 0.7}
                    strokeLinejoin="round"
                    className="cursor-pointer transition-all duration-150"
                    onMouseEnter={(e) => handleMouseMove(e, dn)}
                    onMouseMove={(e) => handleMouseMove(e, dn)}
                    onMouseLeave={scheduleHoverHide}
                    onClick={() => handleDistrictClick(dn)}
                  />
                );
              })}
            </g>

            {/* Leader line from Karimnagar centroid → blown-up rect on the right */}
            {(() => {
              const k = districtCentroids['KARIMNAGAR'];
              if (!k || !karimFeature || !karimPath) return null;
              const x1 = k[0], y1 = k[1];
              const x2 = layout.karimBox.x + 8;
              const y2 = layout.karimBox.y + layout.karimBox.h / 2;
              return (
                <g pointerEvents="none">
                  <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#dc2626" strokeWidth={2} strokeLinecap="round" />
                  <circle cx={x1} cy={y1} r={3.5} fill="#dc2626" stroke="#fff" strokeWidth={1} />
                  <circle cx={x2} cy={y2} r={5}   fill="#dc2626" stroke="#fff" strokeWidth={1.5} />
                </g>
              );
            })()}

            {/* RIGHT — Blown-up Karimnagar */}
            {karimFeature && karimPath && (
              <g pointerEvents="none">
                <path d={karimPath(karimFeature.geometry)} transform="translate(2,4)" fill="#1a1a1a" opacity={0.85} />
                <path d={karimPath(karimFeature.geometry)} fill="#dc2626" stroke="#1f2937" strokeWidth={1.6} strokeLinejoin="round" />
              </g>
            )}

            {/* Label for the blown-up region */}
            <text x={layout.labelX} y={layout.labelY}
              style={{ fontSize: '20px', fontWeight: 900, fill: '#0f172a', letterSpacing: '0.04em' }}>
              KARIMNAGAR
            </text>
            <text x={layout.labelX} y={layout.labelY + 18}
              style={{ fontSize: '10px', fontWeight: 600, fill: '#475569', letterSpacing: '0.22em' }}>
              CONSTITUENCY
            </text>
          </svg>
          <div className="absolute top-2 left-2 bg-white/90 backdrop-blur-sm border border-red-200 rounded-lg px-2.5 py-1.5 text-[10px] text-gray-600 shadow-sm">
            <span className="font-bold text-red-700">Karimnagar PC · BSK</span>
          </div>
          {hovAcName && (
            <div
              className="absolute z-30"
              onMouseEnter={clearHoverHideTimer}
              onMouseLeave={scheduleHoverHide}
              style={{
              left: Math.min(tooltipPos.x + 12, (containerRef.current?.offsetWidth || 500) - 260),
              top: getTooltipTop(230), maxWidth: 280,
            }}>
              <div className="bg-white border border-gray-200 text-xs rounded-xl shadow-xl overflow-hidden">
                <div className="bg-green-600 text-white px-3 py-1.5 flex items-center justify-between">
                  <span className="font-bold text-[12px]">{hovAcName}</span>
                  <span className="text-[9px] bg-white/20 px-1.5 py-0.5 rounded">
                    {hovAcName === 'KARIMNAGAR' ? 'BSK · Karimnagar PC' : 'District · Telangana'}
                  </span>
                </div>
                <div className="p-2.5">
                  {!hovStats || hovStats.negative === 0 ? (
                    <div className="text-gray-400 italic text-[11px]">No grievances detected</div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 text-[10px] mb-1.5">
                        <span className="inline-flex items-center gap-1 text-red-600">
                          <span className="h-1.5 w-1.5 rounded-full bg-red-500" />{hovStats.negative} grievance{hovStats.negative !== 1 ? 's' : ''}
                        </span>
                        <span className="inline-flex items-center gap-1 text-green-600">
                          <span className="h-1.5 w-1.5 rounded-full bg-green-500" />{hovStats.positive || 0}
                        </span>
                        <span className="inline-flex items-center gap-1 text-gray-500">
                          <span className="h-1.5 w-1.5 rounded-full bg-gray-400" />{hovStats.neutral || 0}
                        </span>
                      </div>

                      {hovTotal > 0 && (
                        <div className="flex h-1.5 rounded-full overflow-hidden mb-2.5">
                          {hovStats.negative > 0 && <div className="bg-red-500" style={{ width: `${(hovStats.negative / hovTotal) * 100}%` }} />}
                          {hovStats.neutral > 0 && <div className="bg-gray-300" style={{ width: `${(hovStats.neutral / hovTotal) * 100}%` }} />}
                          {hovStats.positive > 0 && <div className="bg-green-500" style={{ width: `${(hovStats.positive / hovTotal) * 100}%` }} />}
                        </div>
                      )}

                      {hovTopCats.length > 0 ? (
                        <div>
                          <div className="text-[9px] font-semibold text-red-500 uppercase tracking-wide mb-1 flex items-center gap-1">
                            <span className="h-1.5 w-1.5 rounded-full bg-red-500" /> Grievance Topics
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {hovTopCats.slice(0, 5).map(([cat, cnt]) => (
                              <button
                                key={cat}
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  handleTopicClick(cat);
                                }}
                                className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded ring-1 transition-colors hover:brightness-95 ${getTopicStyle(cat)}`}
                              >
                                <Tag className="h-2.5 w-2.5" />
                                {formatTopicLabel(cat)} <span className="font-bold">({cnt})</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="text-[10px] text-gray-500 italic mt-1">No grievance topics found</div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════
  //  STANDALONE: Constituency Overview Dashboard
  // ═══════════════════════════════════════════════
  const hovStats = hoveredDistrict ? (byDistrict[hoveredDistrict] || { count: 0, positive: 0, negative: 0, neutral: 0, categories: [] }) : null;
  const topCats = hovStats?.categories || [];
  const hovTotal = (hovStats?.negative || 0) + (hovStats?.positive || 0) + (hovStats?.neutral || 0);

  return (
    <div className="p-4 lg:p-6 min-h-screen bg-slate-50" ref={containerRef}>
      {/* Header */}
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Karimnagar Constituency Overview Dashboard</h1>
          <p className="text-xs text-orange-700 font-semibold mt-1 tracking-wide uppercase">Nara Chandrababu Naidu · Chief Minister</p>
        </div>
        <div className="flex items-center gap-3">
          {loading && <Loader2 className="h-5 w-5 animate-spin text-gray-400" />}
          <Button onClick={() => navigate('/dashboard')} className="gap-2 bg-slate-800 hover:bg-slate-700 text-white">
            <BarChart3 className="h-4 w-4" />
            View More Details
          </Button>
        </div>
      </div>

      {/* Main 2-column: Left analytics | Right map */}
      <div className="flex gap-5 items-start">
        {/* LEFT PANEL */}
        <div className="w-[340px] flex-shrink-0 space-y-4">
          
          {/* Leader Photo — Nara Chandrababu Naidu */}
          <Card className="overflow-hidden border-0 shadow-lg">
            <div className="relative">
              <img
                src={BSK_HERO.src}
                alt={BSK_HERO.alt}
                referrerPolicy="no-referrer"
                className="w-full object-cover object-top"
                style={{ height: '320px' }}
                onError={(e) => {
                  if (e.currentTarget.dataset.fallbackUsed) return;
                  e.currentTarget.dataset.fallbackUsed = '1';
                  e.currentTarget.src = LOCAL_FALLBACK;
                }}
              />
              {/* gradient overlay at bottom */}
              <div className="absolute inset-0 bg-gradient-to-t from-orange-900/90 via-orange-900/20 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-4">
                <h3 className="text-xl font-extrabold text-white leading-tight drop-shadow">Nara Chandrababu Naidu</h3>
                <p className="text-amber-200 text-sm font-medium mt-0.5">Chief Minister · TDP Andhra Pradesh</p>
                <span className="inline-block mt-1.5 px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-sm text-white text-[11px] font-semibold border border-white/30">CM · Andhra Pradesh</span>
              </div>
            </div>
          </Card>

          {/* Sentiment Pie */}
          <Card className="p-4 border-0 shadow-md">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-slate-700">Sentiment Analysis</h4>
              <span className="text-[10px] font-semibold text-orange-700 bg-orange-50 px-2 py-0.5 rounded-full border border-orange-200">Karimnagar</span>
            </div>
            <div className="flex justify-center">
              <SentimentPie
                positive={totalSentiment.positive || 0}
                negative={totalSentiment.negative || 0}
                neutral={totalSentiment.neutral || 0}
                size={180}
              />
            </div>
            <div className="flex justify-center gap-4 mt-3">
              <div className="flex items-center gap-1.5 text-xs">
                <TrendingUp className="h-3.5 w-3.5 text-green-500" />
                <span className="text-green-700 font-semibold">{totalSentiment.positive || 0}</span>
                <span className="text-slate-400">Positive</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs">
                <TrendingDown className="h-3.5 w-3.5 text-red-500" />
                <span className="text-red-700 font-semibold">{totalSentiment.negative || 0}</span>
                <span className="text-slate-400">Negative</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs">
                <Minus className="h-3.5 w-3.5 text-slate-400" />
                <span className="text-slate-600 font-semibold">{totalSentiment.neutral || 0}</span>
                <span className="text-slate-400">Neutral</span>
              </div>
            </div>
          </Card>

          {/* Grievance Summary + Top Categories — side by side */}
          <div className="flex gap-3">
            {/* Quick Stats */}
            <Card className="p-3 border-0 shadow-md flex-1">
              <h4 className="text-xs font-semibold text-slate-700 mb-2">Grievance Summary</h4>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-blue-50 rounded-lg p-2 text-center">
                  <div className="text-lg font-bold text-blue-700">{totalGrievances}</div>
                  <div className="text-[9px] text-blue-500 font-medium">Total</div>
                </div>
                <div className="bg-green-50 rounded-lg p-2 text-center">
                  <div className="text-lg font-bold text-green-700">{totalSentiment.positive || 0}</div>
                  <div className="text-[9px] text-green-500 font-medium">Positive</div>
                </div>
                <div className="bg-amber-50 rounded-lg p-2 text-center">
                  <div className="text-lg font-bold text-amber-700">{totalSentiment.neutral || 0}</div>
                  <div className="text-[9px] text-amber-500 font-medium">Moderate</div>
                </div>
                <div className="bg-red-50 rounded-lg p-2 text-center">
                  <div className="text-lg font-bold text-red-700">{totalSentiment.negative || 0}</div>
                  <div className="text-[9px] text-red-500 font-medium">Negative</div>
                </div>
              </div>
            </Card>

            {/* Top Categories */}
            {topCategories.length > 0 && (
              <Card className="p-3 border-0 shadow-md flex-1">
                <h4 className="text-xs font-semibold text-slate-700 mb-2">Top Topics</h4>
                <div className="flex flex-wrap gap-1.5">
                  {topCategories.map(([cat, cnt]) => {
                    const style = getTopicStyle(cat);
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => handleTopicClick(cat)}
                        className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded ring-1 transition-colors hover:brightness-95 ${style}`}
                      >
                        <Tag className="h-2.5 w-2.5" />
                        {formatTopicLabel(cat)} <span className="font-bold">({cnt})</span>
                      </button>
                    );
                  })}
                </div>
              </Card>
            )}
          </div>

        </div>

        {/* RIGHT PANEL: Map */}
        <div className="flex-1 min-w-0">
          <div className="relative bg-white rounded-2xl border shadow-sm overflow-hidden h-full">
            <svg
              ref={svgRef}
              viewBox={`0 0 ${dims.w} ${dims.h}`}
              className="w-full h-full"
              style={{ maxHeight: '82vh' }}
            >
              <defs>
                {/* Soft 3-D drop shadow for the whole Telangana shape — matches the reference image */}
                <filter id="telangana-shadow" x="-10%" y="-10%" width="125%" height="125%">
                  <feOffset dx="5" dy="7" in="SourceAlpha" result="off" />
                  <feGaussianBlur stdDeviation="3" in="off" result="blr" />
                  <feColorMatrix in="blr" type="matrix"
                    values="0 0 0 0 0   0 0 0 0 0   0 0 0 0 0   0 0 0 0.55 0" result="shd" />
                  <feMerge>
                    <feMergeNode in="shd" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {/* LEFT — Full Telangana with Karimnagar highlighted */}
              <g filter="url(#telangana-shadow)">
                {geojson.features.map((f, i) => {
                  const dn = (f.properties.DIST_NAME || '').toUpperCase();
                  const isKarim = dn === 'KARIMNAGAR';
                  const isHov = hoveredDistrict === dn;
                  return (
                    <path
                      key={i}
                      d={pathGenerator(f.geometry)}
                      fill={isKarim
                        ? (isHov ? '#b91c1c' : '#dc2626')
                        : (isHov ? '#fef3c7' : '#ffffff')}
                      stroke="#1f2937"
                      strokeWidth={isKarim ? 1.6 : 0.9}
                      strokeLinejoin="round"
                      className="cursor-pointer transition-all duration-200"
                      onMouseEnter={(e) => handleMouseMove(e, dn)}
                      onMouseMove={(e) => handleMouseMove(e, dn)}
                      onMouseLeave={scheduleHoverHide}
                      onClick={() => handleDistrictClick(dn)}
                    />
                  );
                })}
              </g>

              {/* Leader line: Karimnagar centroid (on the state map) → marker on the blown-up rect */}
              {(() => {
                const k = districtCentroids['KARIMNAGAR'];
                if (!k || !karimFeature || !karimPath) return null;
                const x1 = k[0], y1 = k[1];
                const x2 = layout.karimBox.x + 12;
                const y2 = layout.karimBox.y + layout.karimBox.h / 2;
                return (
                  <g pointerEvents="none">
                    <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#dc2626" strokeWidth={2.5} strokeLinecap="round" />
                    <circle cx={x1} cy={y1} r={5} fill="#dc2626" stroke="#fff" strokeWidth={1.8} />
                    <circle cx={x2} cy={y2} r={7} fill="#dc2626" stroke="#fff" strokeWidth={2} />
                  </g>
                );
              })()}

              {/* RIGHT — Blown-up Karimnagar district */}
              {karimFeature && karimPath && (
                <g pointerEvents="none">
                  <path d={karimPath(karimFeature.geometry)} transform="translate(3,5)" fill="#1a1a1a" opacity={0.85} />
                  <path d={karimPath(karimFeature.geometry)} fill="#dc2626" stroke="#1f2937" strokeWidth={2} strokeLinejoin="round" />
                </g>
              )}

              {/* Label for the blown-up region — placed above the blown-up rect */}
              <text x={layout.labelX} y={layout.labelY}
                style={{ fontSize: '32px', fontWeight: 900, fill: '#0f172a', letterSpacing: '0.04em' }}>
                KARIMNAGAR
              </text>
              <text x={layout.labelX} y={layout.labelY + 24}
                style={{ fontSize: '14px', fontWeight: 600, fill: '#475569', letterSpacing: '0.28em' }}>
                CONSTITUENCY
              </text>

              {/* Optional grievance badge on top of the blown-up Karimnagar */}
              {(totalGrievances || 0) > 0 && (
                <g pointerEvents="none">
                  <rect
                    x={layout.karimBox.x + layout.karimBox.w / 2 - 26}
                    y={layout.karimBox.y + layout.karimBox.h - 30}
                    width={52} height={22} rx={6}
                    fill="#0f172a" opacity={0.85}
                  />
                  <text
                    x={layout.karimBox.x + layout.karimBox.w / 2}
                    y={layout.karimBox.y + layout.karimBox.h - 14}
                    textAnchor="middle"
                    style={{ fontSize: '12px', fontWeight: 800, fill: '#fff' }}
                  >
                    {totalGrievances}
                  </text>
                </g>
              )}
            </svg>

            {/* Summary strip */}
            <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm border border-orange-200 rounded-lg px-3 py-2 text-[11px] text-gray-600 shadow-sm">
              <span className="font-bold text-orange-700">Karimnagar Constituency</span>
              <div className="flex items-center gap-1 mt-0.5">
                <span className="inline-block w-2 h-2 rounded-sm bg-orange-500" />
                <span className="text-[10px] text-slate-500">Hover over any district to see mention details</span>
              </div>
            </div>

            {/* Hover tooltip */}
            {hoveredDistrict && (
              <div
                className="absolute bg-white border border-gray-200 shadow-xl rounded-xl z-50 overflow-hidden"
                onMouseEnter={clearHoverHideTimer}
                onMouseLeave={scheduleHoverHide}
                style={{
                  left: Math.min(tooltipPos.x, (containerRef.current?.offsetWidth || 800) - 370),
                  top: getTooltipTop(260),
                  minWidth: 280, maxWidth: 360
                }}
              >
                {/* Header */}
                <div className={cn(
                  'px-3.5 py-2 flex items-center justify-between',
                  districtFeatures[hoveredDistrict]?.hasKarimnagar ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-800'
                )}>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm">{hoveredDistrict}</span>
                    {hovTotal > 0 && (
                      <span className={cn('text-[10px] font-medium', districtFeatures[hoveredDistrict]?.hasKarimnagar ? 'text-white/80' : 'text-gray-500')}>
                        {hovTotal} grievance{hovTotal !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                  {districtFeatures[hoveredDistrict]?.hasKarimnagar && (
                    <Badge className="bg-white/20 text-white text-[10px] border-0">BSK's Constituency</Badge>
                  )}
                </div>

                <div className="p-3">
                  {!hovStats || hovStats.negative === 0 ? (
                    <div className="text-xs text-gray-400 italic py-1">No grievances detected in this area</div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 text-[10px] mb-1.5">
                        <span className="inline-flex items-center gap-1 text-red-600">
                          <span className="h-1.5 w-1.5 rounded-full bg-red-500" />{hovStats.negative} grievance{hovStats.negative !== 1 ? 's' : ''}
                        </span>
                        <span className="inline-flex items-center gap-1 text-green-600">
                          <span className="h-1.5 w-1.5 rounded-full bg-green-500" />{hovStats.positive || 0}
                        </span>
                        <span className="inline-flex items-center gap-1 text-gray-500">
                          <span className="h-1.5 w-1.5 rounded-full bg-gray-400" />{hovStats.neutral || 0}
                        </span>
                      </div>

                      {hovTotal > 0 && (
                        <div className="flex h-1.5 rounded-full overflow-hidden mb-2.5">
                          {hovStats.negative > 0 && <div className="bg-red-500" style={{ width: `${(hovStats.negative / hovTotal) * 100}%` }} />}
                          {hovStats.neutral > 0 && <div className="bg-gray-300" style={{ width: `${(hovStats.neutral / hovTotal) * 100}%` }} />}
                          {hovStats.positive > 0 && <div className="bg-green-500" style={{ width: `${(hovStats.positive / hovTotal) * 100}%` }} />}
                        </div>
                      )}

                      {topCats.length > 0 ? (
                        <div>
                          <div className="text-[9px] font-semibold text-red-500 uppercase tracking-wide mb-1 flex items-center gap-1">
                            <span className="h-1.5 w-1.5 rounded-full bg-red-500" /> Grievance Topics
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {topCats.slice(0, 5).map(([cat, cnt]) => (
                              <button
                                key={cat}
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  handleTopicClick(cat);
                                }}
                                className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded ring-1 transition-colors hover:brightness-95 ${getTopicStyle(cat)}`}
                              >
                                <Tag className="h-2.5 w-2.5" />
                                {formatTopicLabel(cat)} <span className="font-bold">({cnt})</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="text-[10px] text-gray-500 italic mt-1">No grievance topics found</div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
          
          {/* Bottom legend */}
          <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-gray-500 justify-center">
            <span className="flex items-center gap-1.5"><span className="w-4 h-4 rounded border border-gray-300" style={{ background: '#f8fafc' }} /> Other Districts</span>
            <span className="flex items-center gap-1.5"><span className="w-4 h-4 rounded" style={{ background: SENTIMENT_TIERS.low.fill }} /> Low Positive</span>
            <span className="flex items-center gap-1.5"><span className="w-4 h-4 rounded" style={{ background: SENTIMENT_TIERS.medium.fill }} /> Medium Positive</span>
            <span className="flex items-center gap-1.5"><span className="w-4 h-4 rounded" style={{ background: SENTIMENT_TIERS.high.fill }} /> High Positive</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-green-500" /> Positive</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-500" /> Negative</span>
          </div>
          
        </div>
      </div>
    </div>
  );
};

export default TelanganaMap;
