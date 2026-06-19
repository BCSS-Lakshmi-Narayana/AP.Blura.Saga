import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { geoMercator, geoPath } from 'd3-geo';
import {
  ArrowLeft,
  Loader2,
  MapPin,
  Scale,
  GraduationCap,
  Wallet,
  AlertTriangle,
  Users,
  Bell,
  Megaphone,
  TrendingUp,
  TrendingDown,
  Activity,
  Shield,
  Calendar,
  ExternalLink,
} from 'lucide-react';
import api from '../lib/api';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import { GrievanceCard } from '../components/grievances/GrievanceCard';
import { getMlaByConstituency } from '../data/apMLAs';
import { useAuth } from '../contexts/AuthContext';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';

const PARTY_STYLES = {
  TDP: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  JSP: 'bg-red-100 text-red-700 border-red-300',
  BJP: 'bg-orange-100 text-orange-700 border-orange-300',
  YSRCP: 'bg-blue-100 text-blue-700 border-blue-300',
};

const PARTY_FILL = {
  TDP: '#facc15',
  JSP: '#dc2626',
  BJP: '#f97316',
  YSRCP: '#2563eb',
};

const titleCase = (value) =>
  String(value || '')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();

const normalize = (v) =>
  String(v || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

const getProxiedMediaUrl = (rawUrl) => {
  if (!rawUrl || typeof rawUrl !== 'string') return rawUrl;
  if (rawUrl.startsWith('/api/media/stream') || rawUrl.startsWith('/api/media/proxy'))
    return `${BACKEND_URL}${rawUrl}`;
  if (rawUrl.startsWith('/') || rawUrl.startsWith(BACKEND_URL)) return rawUrl;
  const needsProxy =
    rawUrl.includes('twimg.com') ||
    rawUrl.includes('fbcdn.net') ||
    rawUrl.includes('cdninstagram.com') ||
    rawUrl.includes('fbsbx.com') ||
    rawUrl.includes('googleusercontent.com');
  if (needsProxy) return `${BACKEND_URL}/api/media/stream?url=${encodeURIComponent(rawUrl)}`;
  return rawUrl;
};

const StatTile = ({ icon: Icon, label, value, accent, sub }) => (
  <div className="flex items-start gap-2 rounded-md border border-slate-200 bg-white px-3 py-2">
    <Icon className={`h-4 w-4 mt-0.5 ${accent || 'text-slate-500'}`} />
    <div className="min-w-0">
      <div className="text-[11px] uppercase tracking-wide text-slate-400">{label}</div>
      <div className="text-sm font-semibold text-slate-800 truncate">{value || '—'}</div>
      {sub && <div className="text-[10px] text-slate-400 truncate">{sub}</div>}
    </div>
  </div>
);

/* Mini-map: zoomed into THIS constituency, with clickable neighbours */
const ConstituencyMiniMap = ({ constituency, mla }) => {
  const navigate = useNavigate();
  const [geo, setGeo] = useState(null);
  const [hover, setHover] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const sources = [
        '/Constituencies_AndhraPradesh_2024.geojson',
        '/andhra_pradesh_ac.geojson',
      ];
      for (const src of sources) {
        try {
          const res = await fetch(src);
          if (!res.ok) continue;
          const text = await res.text();
          const parsed = JSON.parse(text);
          if (!parsed?.features?.length) continue;
          if (!cancelled) setGeo(parsed);
          return;
        } catch (_e) {
          /* try next */
        }
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const target = normalize(constituency);

  const acName = useCallback(
    (f) =>
      f?.properties?.AC_NAME ||
      f?.properties?.ac_name ||
      f?.properties?.NAME ||
      f?.properties?.name ||
      '',
    []
  );

  const { path, highlight, partyFill } = useMemo(() => {
    if (!geo) return { path: null, highlight: null, partyFill: '#94a3b8' };
    const highlightFeature = geo.features.find((f) => normalize(acName(f)) === target);
    const projection = geoMercator();
    // Zoom INTO the selected constituency so it fills the frame; fall back to
    // the whole-state fit when the seat can't be located in the GeoJSON.
    if (highlightFeature) {
      projection.fitExtent(
        [
          [40, 40],
          [480, 320],
        ],
        highlightFeature
      );
    } else {
      projection.fitSize([520, 360], geo);
    }
    return {
      path: geoPath().projection(projection),
      highlight: highlightFeature,
      partyFill: PARTY_FILL[mla?.party] || '#0f172a',
    };
  }, [geo, target, mla, acName]);

  if (!geo || !path) {
    return (
      <div className="h-[360px] w-full flex items-center justify-center text-slate-400 text-sm">
        <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading map…
      </div>
    );
  }

  return (
    <div className="relative">
      <svg viewBox="0 0 520 360" className="w-full h-auto">
        <rect width="520" height="360" fill="#f8fafc" />
        {geo.features.map((f, i) => {
          const isTarget = highlight && f === highlight;
          const name = acName(f);
          const isHover = !isTarget && hover === normalize(name);
          return (
            <path
              key={i}
              d={path(f)}
              fill={isTarget ? partyFill : isHover ? '#cbd5e1' : '#e2e8f0'}
              stroke={isTarget ? '#0f172a' : '#ffffff'}
              strokeWidth={isTarget ? 1.6 : 0.4}
              opacity={isTarget ? 1 : 0.9}
              className={isTarget ? '' : 'cursor-pointer transition-colors'}
              onMouseEnter={() => !isTarget && setHover(normalize(name))}
              onMouseLeave={() => setHover(null)}
              onClick={() => {
                if (isTarget || !name) return;
                navigate(`/mla/${encodeURIComponent(titleCase(name))}`);
              }}
            />
          );
        })}
      </svg>

      {/* Center label for the focused constituency */}
      <div className="absolute top-2 left-2 bg-white/95 border border-slate-200 rounded px-2 py-1 text-[11px] shadow-sm">
        <span className="font-semibold text-slate-800">{titleCase(constituency)}</span>
        {mla && <span className="text-slate-400"> · {mla.party}</span>}
      </div>

      {/* Hovered neighbour hint */}
      {hover && hover !== target && (
        <div className="absolute bottom-2 right-2 bg-white/95 border border-slate-200 rounded px-2 py-1 text-[11px] shadow-sm text-slate-600">
          Open{' '}
          <span className="font-medium text-slate-800">
            {titleCase(
              acName(geo.features.find((f) => normalize(acName(f)) === hover)) || ''
            )}
          </span>{' '}
          →
        </div>
      )}

      {!highlight && (
        <div className="absolute bottom-2 left-2 text-[11px] bg-white/95 border border-slate-200 rounded px-2 py-1 text-slate-500">
          Constituency boundary not found in GeoJSON
        </div>
      )}
    </div>
  );
};

/* Sentiment bar */
const SentimentBar = ({ positive, negative, neutral }) => {
  const total = positive + negative + neutral || 1;
  const pp = Math.round((positive / total) * 100);
  const pn = Math.round((negative / total) * 100);
  const pu = 100 - pp - pn;
  return (
    <div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 flex">
        <div className="bg-emerald-500" style={{ width: `${pp}%` }} />
        <div className="bg-red-500" style={{ width: `${pn}%` }} />
        <div className="bg-slate-300" style={{ width: `${pu}%` }} />
      </div>
      <div className="flex justify-between text-[10px] mt-1 text-slate-500">
        <span className="text-emerald-700">{pp}% positive</span>
        <span className="text-red-600">{pn}% negative</span>
        <span>{pu}% neutral</span>
      </div>
    </div>
  );
};

const AlertItem = ({ alert }) => {
  const sev = String(alert.severity || alert.risk_level || 'medium').toLowerCase();
  const sevColor =
    sev === 'critical' || sev === 'high'
      ? 'bg-red-100 text-red-700 border-red-300'
      : sev === 'medium'
      ? 'bg-amber-100 text-amber-700 border-amber-300'
      : 'bg-slate-100 text-slate-700 border-slate-300';
  const title = alert.title || alert.description || alert.content_data?.text || 'Alert';
  return (
    <div className="rounded-md border border-slate-200 bg-white p-3 hover:bg-slate-50 transition">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-slate-800 line-clamp-2">{title}</div>
          <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500">
            <Badge className={`border ${sevColor} text-[10px] py-0`}>{sev.toUpperCase()}</Badge>
            {alert.platform && <span>{alert.platform}</span>}
            {alert.created_at && (
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {new Date(alert.created_at).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>
        <Link
          to={`/alerts?search=${encodeURIComponent(alert.id || alert._id || '')}`}
          className="text-blue-600 hover:text-blue-800"
        >
          <ExternalLink className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
};

const NegativeMentionItem = ({ item }) => (
  <div className="rounded-md border border-red-100 bg-red-50/40 p-3">
    <div className="text-sm text-slate-800 line-clamp-3">{item.text || '—'}</div>
    <div className="flex items-center gap-2 mt-1.5 text-[11px] text-slate-500">
      {item.display_name && <span className="font-medium">{item.display_name}</span>}
      {item.handle && <span>@{item.handle}</span>}
      {item.platform && <span>· {item.platform}</span>}
      {item.post_date && <span>· {new Date(item.post_date).toLocaleDateString()}</span>}
    </div>
  </div>
);

const MlaProfile = () => {
  const { constituency } = useParams();
  const navigate = useNavigate();
  const decoded = decodeURIComponent(constituency || '');
  const mla = useMemo(() => getMlaByConstituency(decoded), [decoded]);
  const { isScoped, isSuperAdmin, assignedConstituency, canAccessConstituency } = useAuth();

  // RBAC guard: scoped users (MLA / MP / Nara Lokesh) can't view other seats —
  // bounce them back to their own constituency on URL manipulation.
  useEffect(() => {
    if (isScoped && !isSuperAdmin && !canAccessConstituency(decoded)) {
      if (assignedConstituency) {
        navigate(`/mla/${encodeURIComponent(titleCase(assignedConstituency))}`, { replace: true });
      } else {
        navigate('/andhra-pradesh-map', { replace: true });
      }
    }
  }, [decoded, isScoped, isSuperAdmin, assignedConstituency, canAccessConstituency, navigate]);

  const [grievances, setGrievances] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [intel, setIntel] = useState(null);
  const [sentiment, setSentiment] = useState({ positive: 0, negative: 0, neutral: 0 });
  const [loading, setLoading] = useState(true);
  const [alertsLoading, setAlertsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const fetchAll = async () => {
      setLoading(true);
      setAlertsLoading(true);
      setError(null);

      const constName = mla?.constituency || decoded;

      // 1) Constituency Intelligence (sentiment + issues + negatives)
      try {
        const intelRes = await api.get(
          `/constituency-intel/${encodeURIComponent(constName)}`,
          { params: { days: 365 } }
        );
        if (!cancelled) {
          setIntel(intelRes.data || null);
          const s = intelRes.data?.sentiment;
          if (s) {
            setSentiment({
              positive: s.positive || 0,
              negative: s.negative || 0,
              neutral: s.neutral || 0,
            });
          }
        }
      } catch (_e) {
        /* fall through to grievance counts */
      }

      // 2) Grievances list for constituency
      try {
        const res = await api.get('/grievances', {
          params: { location_city: constName, limit: 100 },
        });
        if (cancelled) return;
        const rows = Array.isArray(res.data?.grievances) ? res.data.grievances : [];
        setGrievances(rows);

        const counts = res.data?.pagination?.sentiment_counts;
        if (counts && !intel) {
          setSentiment({
            positive: Number(counts.positive || 0),
            negative: Number(counts.negative || 0),
            neutral: Number(counts.neutral || 0),
          });
        }
      } catch (_e) {
        if (!cancelled) setError('Could not load grievances for this constituency.');
      } finally {
        if (!cancelled) setLoading(false);
      }

      // 3) Alerts mentioning the constituency
      try {
        const res = await api.get('/alerts', {
          params: { search: constName, limit: 50, status: 'all' },
        });
        if (cancelled) return;
        const list =
          res.data?.alerts ||
          res.data?.data ||
          (Array.isArray(res.data) ? res.data : []) ||
          [];
        setAlerts(list);
      } catch (_e) {
        if (!cancelled) setAlerts([]);
      } finally {
        if (!cancelled) setAlertsLoading(false);
      }
    };

    fetchAll();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [decoded, mla?.constituency]);

  const handleAction = useCallback((action, payload) => {
    if (action === 'view') {
      const g = payload?.grievance;
      const url = g?.tweet_url || g?.url;
      if (url) window.open(url, '_blank', 'noopener,noreferrer');
    }
  }, []);

  const total = sentiment.positive + sentiment.negative + sentiment.neutral;
  const partyStyle = mla ? PARTY_STYLES[mla.party] || 'bg-slate-100 text-slate-700 border-slate-300' : '';
  const sentimentIndex = intel?.sentiment?.sentiment_index ?? 0;
  const indexAccent =
    sentimentIndex >= 25
      ? 'text-emerald-700'
      : sentimentIndex >= 0
      ? 'text-slate-700'
      : sentimentIndex >= -25
      ? 'text-amber-600'
      : 'text-red-700';

  const topIssues = intel?.top_issues || [];
  const recentNegative = intel?.recent_negative || [];

  const criticalAlertCount = alerts.filter((a) =>
    ['critical', 'high'].includes(String(a.severity || a.risk_level || '').toLowerCase())
  ).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate('/andhra-pradesh-map')}
          className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" /> Back to map
        </button>
        <span className="text-slate-300">/</span>
        <span className="text-sm text-slate-500">Andhra Pradesh</span>
        <span className="text-slate-300">/</span>
        <span className="text-sm font-medium text-slate-700">{titleCase(decoded)}</span>
      </div>

      {/* MLA header */}
      <Card className="p-5 border border-slate-200">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-slate-500 text-sm">
              <MapPin className="h-4 w-4" />
              <span className="uppercase tracking-wide">{titleCase(decoded)} Constituency</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mt-1">
              {mla ? mla.mla : 'No MLA on record'}
            </h1>
            {mla && (
              <div className="flex items-center gap-2 mt-2">
                <Badge className={`border ${partyStyle}`}>{mla.party}</Badge>
                <Badge variant="outline" className="border-slate-300 text-slate-600">
                  {mla.alliance}
                </Badge>
              </div>
            )}
            {!mla && (
              <p className="text-sm text-slate-500 mt-2 max-w-xl">
                This constituency isn't present in the 2024 MLA dataset (it may be the one seat
                missing from the source list, or a non-AP enclave). Related social-media content is
                still shown below.
              </p>
            )}
          </div>

          {/* Sentiment summary */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="text-center px-3 py-2 rounded-md bg-emerald-50 border border-emerald-200 min-w-[70px]">
              <div className="text-lg font-bold text-emerald-700">{sentiment.positive}</div>
              <div className="text-[10px] uppercase text-emerald-600">Positive</div>
            </div>
            <div className="text-center px-3 py-2 rounded-md bg-red-50 border border-red-200 min-w-[70px]">
              <div className="text-lg font-bold text-red-700">{sentiment.negative}</div>
              <div className="text-[10px] uppercase text-red-600">Negative</div>
            </div>
            <div className="text-center px-3 py-2 rounded-md bg-slate-50 border border-slate-200 min-w-[70px]">
              <div className="text-lg font-bold text-slate-700">{sentiment.neutral}</div>
              <div className="text-[10px] uppercase text-slate-500">Neutral</div>
            </div>
            <div className="text-center px-3 py-2 rounded-md bg-white border border-slate-300 min-w-[90px]">
              <div className={`text-lg font-bold flex items-center justify-center gap-1 ${indexAccent}`}>
                {sentimentIndex > 0 ? (
                  <TrendingUp className="h-4 w-4" />
                ) : sentimentIndex < 0 ? (
                  <TrendingDown className="h-4 w-4" />
                ) : (
                  <Activity className="h-4 w-4" />
                )}
                {sentimentIndex}
              </div>
              <div className="text-[10px] uppercase text-slate-500">Net Index</div>
            </div>
          </div>
        </div>

        {mla && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4">
            <StatTile
              icon={AlertTriangle}
              label="Criminal Cases"
              value={String(mla.criminalCases)}
              accent={mla.criminalCases > 0 ? 'text-red-500' : 'text-emerald-500'}
            />
            <StatTile icon={GraduationCap} label="Education" value={mla.education} />
            <StatTile icon={Wallet} label="Total Assets" value={mla.assets} accent="text-emerald-600" />
            <StatTile icon={Scale} label="Liabilities" value={mla.liabilities} accent="text-amber-600" />
          </div>
        )}

        {total > 0 && (
          <div className="mt-4">
            <SentimentBar
              positive={sentiment.positive}
              negative={sentiment.negative}
              neutral={sentiment.neutral}
            />
          </div>
        )}
      </Card>

      {/* Quick stats strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <StatTile icon={Users} label="Total Mentions" value={total} accent="text-slate-600" />
        <StatTile
          icon={Bell}
          label="Alerts"
          value={alerts.length}
          sub={`${criticalAlertCount} critical/high`}
          accent="text-amber-600"
        />
        <StatTile
          icon={Megaphone}
          label="Grievances"
          value={grievances.length}
          accent="text-slate-600"
        />
        <StatTile
          icon={Shield}
          label="High Priority"
          value={intel?.sentiment?.high_priority || 0}
          accent="text-red-600"
        />
      </div>

      {/* Map + Top issues row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="p-3 border border-slate-200 lg:col-span-2">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
              <MapPin className="h-4 w-4 text-slate-500" /> Constituency Location
            </h2>
            <Link to="/andhra-pradesh-map" className="text-xs text-blue-600 hover:underline">
              Open full map →
            </Link>
          </div>
          <ConstituencyMiniMap constituency={decoded} mla={mla} />
        </Card>

        <Card className="p-3 border border-slate-200">
          <h2 className="text-sm font-semibold text-slate-800 mb-2 flex items-center gap-2">
            <Activity className="h-4 w-4 text-slate-500" /> Top Issues
          </h2>
          {topIssues.length === 0 ? (
            <div className="text-xs text-slate-500 py-6 text-center">
              No issue patterns detected yet.
            </div>
          ) : (
            <div className="space-y-2">
              {topIssues.slice(0, 8).map(({ issue, count }) => {
                const max = topIssues[0]?.count || 1;
                const pct = Math.round((count / max) * 100);
                return (
                  <div key={issue}>
                    <div className="flex justify-between text-xs text-slate-700 mb-0.5">
                      <span className="capitalize">{issue.replace(/_/g, ' ')}</span>
                      <span className="text-slate-500">{count}</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-slate-700"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      {/* Detail tabs */}
      <Card className="p-4 border border-slate-200">
        <Tabs defaultValue="grievances" className="w-full">
          <TabsList className="grid w-full grid-cols-3 max-w-md">
            <TabsTrigger value="grievances">
              Grievances ({grievances.length})
            </TabsTrigger>
            <TabsTrigger value="alerts">Alerts ({alerts.length})</TabsTrigger>
            <TabsTrigger value="negative">Negative Mentions</TabsTrigger>
          </TabsList>

          <TabsContent value="grievances" className="mt-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs text-slate-500">
                Citizen grievances + social-media reports detected for{' '}
                <span className="font-medium text-slate-700">{titleCase(decoded)}</span>
              </div>
              <Link
                to={`/grievances?location=${encodeURIComponent(titleCase(decoded))}`}
                className="text-xs text-blue-600 hover:underline"
              >
                Open in Grievances →
              </Link>
            </div>

            {loading ? (
              <div className="h-40 flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
              </div>
            ) : error ? (
              <div className="text-sm text-red-600 py-8 text-center">{error}</div>
            ) : grievances.length === 0 ? (
              <div className="text-sm text-slate-500 py-10 text-center">
                No social-media content detected for this constituency yet.
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {grievances.map((g) => (
                  <GrievanceCard
                    key={g._id || g.id}
                    grievance={g}
                    onAction={handleAction}
                    getProxiedMediaUrl={getProxiedMediaUrl}
                    compact
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="alerts" className="mt-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs text-slate-500">
                Security & political alerts referencing{' '}
                <span className="font-medium text-slate-700">{titleCase(decoded)}</span>
              </div>
              <Link
                to={`/alerts?search=${encodeURIComponent(titleCase(decoded))}`}
                className="text-xs text-blue-600 hover:underline"
              >
                Open in Alerts →
              </Link>
            </div>

            {alertsLoading ? (
              <div className="h-40 flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
              </div>
            ) : alerts.length === 0 ? (
              <div className="text-sm text-slate-500 py-10 text-center">
                No alerts mention this constituency in the active window.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {alerts.slice(0, 30).map((a) => (
                  <AlertItem key={a.id || a._id} alert={a} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="negative" className="mt-4">
            <div className="text-xs text-slate-500 mb-3">
              Most recent negative public mentions for{' '}
              <span className="font-medium text-slate-700">{titleCase(decoded)}</span>
            </div>

            {recentNegative.length === 0 ? (
              <div className="text-sm text-slate-500 py-10 text-center">
                No negative mentions captured in the active window.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {recentNegative.map((item, idx) => (
                  <NegativeMentionItem key={idx} item={item} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
};

export default MlaProfile;
