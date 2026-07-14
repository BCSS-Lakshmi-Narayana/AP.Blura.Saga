import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, MapPin, Loader2, Calendar, ExternalLink } from 'lucide-react';
import VoterProfilePanel from '../components/VoterProfilePanel';
import SocialNarrativePanel from '../components/SocialNarrativePanel';
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

const titleCase = (value) =>
  String(value || '')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();

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

  const [topIssues, setTopIssues] = useState([]);
  const [recentNegative, setRecentNegative] = useState([]);
  const [grievances, setGrievances] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [alertsLoading, setAlertsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [voterProfile, setVoterProfile] = useState(null);
  const [voterProfileLoading, setVoterProfileLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const constName = mla?.constituency || decoded;

    setLoading(true);
    setAlertsLoading(true);
    setError(null);
    setVoterProfileLoading(true);

    // Fire every request in PARALLEL so the fast static voter profile isn't
    // blocked behind the slower grievance/alert aggregations. Each response
    // updates its own slice + loading flag as soon as it arrives.

    // Voter profile — static ECI data, fastest; drives the left panel.
    api.get(`/voter-profiles/${encodeURIComponent(constName)}`)
      .then((res) => { if (!cancelled) setVoterProfile(res.data?.data || null); })
      .catch(() => { if (!cancelled) setVoterProfile(null); })
      .finally(() => { if (!cancelled) setVoterProfileLoading(false); });

    // Constituency intel — top issues + recent negative mentions.
    api.get(`/constituency-intel/${encodeURIComponent(constName)}`, { params: { days: 365 } })
      .then((res) => {
        if (cancelled) return;
        setTopIssues(res.data?.top_issues || []);
        setRecentNegative(res.data?.recent_negative || []);
      })
      .catch(() => { if (!cancelled) { setTopIssues([]); setRecentNegative([]); } });

    // Grievances for the constituency.
    api.get('/grievances', { params: { location_city: constName, limit: 100 } })
      .then((res) => { if (!cancelled) setGrievances(Array.isArray(res.data?.grievances) ? res.data.grievances : []); })
      .catch(() => { if (!cancelled) setError('Could not load grievances for this constituency.'); })
      .finally(() => { if (!cancelled) setLoading(false); });

    // Alerts mentioning the constituency.
    api.get('/alerts', { params: { search: constName, limit: 50, status: 'all' } })
      .then((res) => {
        if (cancelled) return;
        const list = res.data?.alerts || res.data?.data || (Array.isArray(res.data) ? res.data : []) || [];
        setAlerts(list);
      })
      .catch(() => { if (!cancelled) setAlerts([]); })
      .finally(() => { if (!cancelled) setAlertsLoading(false); });

    return () => {
      cancelled = true;
    };
  }, [decoded, mla?.constituency]);

  const handleAction = useCallback((action, payload) => {
    if (action === 'view') {
      const g = payload?.grievance;
      const url = g?.tweet_url || g?.url;
      if (url) window.open(url, '_blank', 'noopener,noreferrer');
    }
  }, []);

  const partyStyle = mla ? PARTY_STYLES[mla.party] || 'bg-slate-100 text-slate-700 border-slate-300' : '';

  return (
    <div className="space-y-4">
      {/* Breadcrumb */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" /> Back to dashboard
        </button>
        <span className="text-slate-300">/</span>
        <span className="text-sm text-slate-500">Andhra Pradesh</span>
        <span className="text-slate-300">/</span>
        <span className="text-sm font-medium text-slate-700">{titleCase(decoded)}</span>
      </div>

      {/* Compact MLA identity header */}
      <Card className="p-4 border border-slate-200">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-slate-500 text-xs">
              <MapPin className="h-3.5 w-3.5" />
              <span className="uppercase tracking-wide">{titleCase(decoded)} Constituency</span>
            </div>
            <h1 className="text-xl font-bold text-slate-900 mt-0.5">
              {mla ? mla.mla : 'No MLA on record'}
            </h1>
          </div>
          {mla && (
            <div className="flex items-center gap-2">
              <Badge className={`border ${partyStyle}`}>{mla.party}</Badge>
              <Badge variant="outline" className="border-slate-300 text-slate-600">{mla.alliance}</Badge>
            </div>
          )}
        </div>
      </Card>

      {/* Voter Profiling (left) + Social Media Narrative (right).
          Side-by-side on wide screens (xl+), stacks on smaller. */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 items-start">
        <div className="min-w-0">
          <VoterProfilePanel
            dense
            sectionNumber={1}
            profile={voterProfile}
            loading={voterProfileLoading}
            topIssues={topIssues}
            constituencyDisplayName={titleCase(decoded)}
          />
        </div>
        <div className="min-w-0">
          <SocialNarrativePanel
            dense
            sectionNumber={2}
            constituency={mla?.constituency || decoded}
          />
        </div>
      </div>

      {/* Detail tabs — grievances / alerts / negative mentions for this seat */}
      <Card className="p-4 border border-slate-200">
        <Tabs defaultValue="grievances" className="w-full">
          <TabsList className="grid w-full grid-cols-3 max-w-xl">
            <TabsTrigger value="grievances">Grievances ({grievances.length})</TabsTrigger>
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
