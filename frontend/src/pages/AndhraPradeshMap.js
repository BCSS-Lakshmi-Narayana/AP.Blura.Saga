import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { geoMercator, geoPath } from 'd3-geo';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import api from '../lib/api';
import { Card } from '../components/ui/card';
import { getMlaByConstituency } from '../data/apMLAs';
import { getMpByLsId, getMpByLsName } from '../data/apMPs';
import { useAuth } from '../contexts/AuthContext';
import { TDP_PORTRAITS } from '../config/tdpMedia';

// Maps each leadership portrait to the `target_entity` value the political
// sentiment pipeline tags content with, so a click jumps straight to their
// related grievances/mentions.
const LEADERSHIP_TARGET_ENTITY = {
  'portrait-primary': 'bsk',
  'portrait-lokesh': 'bsk_son',
};

const DISTRICT_SOURCES = [
  '/andhra_pradesh_districts.geojson',
  '/andhra_pradesh.geojson',
];

const AC_SOURCES = [
  '/Constituencies_AndhraPradesh_2024.geojson',
  '/andhra_pradesh_ac.geojson',
];

// Maps common AP cities / towns / new-district names (post-2022 reorg) back to
// the 13 legacy district polygons present in andhra_pradesh_districts.geojson.
// Keys are normalised (lowercase, alnum + spaces). Values match DIST_NAME.
const CITY_TO_DISTRICT = {
  // Visakhapatnam belt
  visakhapatnam: 'VISHAKHAPATNAM',
  vizag: 'VISHAKHAPATNAM',
  vskp: 'VISHAKHAPATNAM',
  vishakhapatnam: 'VISHAKHAPATNAM',
  anakapalli: 'VISHAKHAPATNAM',
  anakapalle: 'VISHAKHAPATNAM',
  'alluri sitharama raju': 'VISHAKHAPATNAM',
  // Vizianagaram / Manyam
  vizianagaram: 'VIZIANAGARAM',
  bobbili: 'VIZIANAGARAM',
  'parvathipuram manyam': 'VIZIANAGARAM',
  parvathipuram: 'VIZIANAGARAM',
  // Srikakulam
  srikakulam: 'SRIKAKULAM',
  ichapuram: 'SRIKAKULAM',
  palasa: 'SRIKAKULAM',
  // East Godavari / Kakinada / Konaseema
  'east godavari': 'EAST GODAVARI',
  kakinada: 'EAST GODAVARI',
  rajahmundry: 'EAST GODAVARI',
  rajamahendravaram: 'EAST GODAVARI',
  amalapuram: 'EAST GODAVARI',
  konaseema: 'EAST GODAVARI',
  'dr b r ambedkar konaseema': 'EAST GODAVARI',
  // West Godavari / Eluru
  'west godavari': 'WEST GODAVARI',
  eluru: 'WEST GODAVARI',
  bhimavaram: 'WEST GODAVARI',
  tadepalligudem: 'WEST GODAVARI',
  narsapuram: 'WEST GODAVARI',
  // Krishna / NTR / Vijayawada
  krishna: 'KRISHNA',
  vijayawada: 'KRISHNA',
  machilipatnam: 'KRISHNA',
  gudivada: 'KRISHNA',
  ntr: 'KRISHNA',
  'ntr district': 'KRISHNA',
  // Guntur / Palnadu / Bapatla / Amaravati
  guntur: 'GUNTUR',
  tenali: 'GUNTUR',
  mangalagiri: 'GUNTUR',
  amaravati: 'GUNTUR',
  palnadu: 'GUNTUR',
  narasaraopet: 'GUNTUR',
  bapatla: 'GUNTUR',
  // Prakasam / Ongole
  prakasam: 'PRAKASAM',
  ongole: 'PRAKASAM',
  chirala: 'PRAKASAM',
  markapur: 'PRAKASAM',
  // Nellore
  nellore: 'SPSR NELLORE',
  'spsr nellore': 'SPSR NELLORE',
  'sps nellore': 'SPSR NELLORE',
  'sri potti sriramulu nellore': 'SPSR NELLORE',
  gudur: 'SPSR NELLORE',
  kavali: 'SPSR NELLORE',
  // Chittoor / Tirupati
  chittoor: 'CHITTOOR',
  tirupati: 'CHITTOOR',
  madanapalle: 'CHITTOOR',
  punganur: 'CHITTOOR',
  // Kadapa / Annamayya
  kadapa: 'YSR KADAPA',
  cuddapah: 'YSR KADAPA',
  'ysr kadapa': 'YSR KADAPA',
  ysr: 'YSR KADAPA',
  proddatur: 'YSR KADAPA',
  pulivendula: 'YSR KADAPA',
  annamayya: 'YSR KADAPA',
  rayachoti: 'YSR KADAPA',
  // Kurnool / Nandyal
  kurnool: 'KURNOOL',
  nandyal: 'KURNOOL',
  adoni: 'KURNOOL',
  // Anantapur / Sri Sathya Sai
  anantapur: 'ANANTHAPURAMU',
  ananthapuramu: 'ANANTHAPURAMU',
  anantapuramu: 'ANANTHAPURAMU',
  hindupur: 'ANANTHAPURAMU',
  dharmavaram: 'ANANTHAPURAMU',
  tadipatri: 'ANANTHAPURAMU',
  'sri sathya sai': 'ANANTHAPURAMU',
  puttaparthi: 'ANANTHAPURAMU',
};

const normalize = (value) =>
  String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const titleCase = (value) =>
  String(value || '')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());

const getDistrictName = (props = {}) => {
  const direct =
    props.DIST_NAME ||
    props.district_name ||
    props.district ||
    props.DISTRICT ||
    props.dtname ||
    props.NAME_2 ||
    props.NAME_1 ||
    props.NAME ||
    props.name ||
    '';
  return String(direct || '').trim();
};

const getStateName = (props = {}) => {
  const direct = props.ST_NAME || props.st_nm || props.st_name || props.STATE || props.state || '';
  return String(direct || '').trim();
};

const getAcName = (props = {}) => {
  const direct = props.AC_NAME || props.ac_name || props.NAME || props.name || props.Name || '';
  return String(direct || '').trim();
};

const findBestDistrictMatch = (keyword, districtList) => {
  if (!keyword) return null;
  const k = normalize(keyword);
  if (!k) return null;

  // 1. Exact district-name match.
  const exact = districtList.find((d) => normalize(d) === k);
  if (exact) return exact;

  // 2. City / town / new-district alias → legacy district.
  if (CITY_TO_DISTRICT[k]) {
    const mapped = CITY_TO_DISTRICT[k];
    const hit = districtList.find((d) => normalize(d) === normalize(mapped));
    if (hit) return hit;
  }

  // 3. Token-level alias match (e.g. "Tirupati Urban" → tirupati → CHITTOOR).
  const aliasHit = Object.keys(CITY_TO_DISTRICT).find(
    (alias) => alias.length >= 4 && (k.includes(alias) || alias.includes(k))
  );
  if (aliasHit) {
    const mapped = CITY_TO_DISTRICT[aliasHit];
    const hit = districtList.find((d) => normalize(d) === normalize(mapped));
    if (hit) return hit;
  }

  // 4. Fuzzy substring fallback against district names.
  const included = districtList.find((d) => {
    const dn = normalize(d);
    return k.length >= 4 && (dn.includes(k) || k.includes(dn));
  });
  if (included) return included;

  return null;
};

const getSentimentFill = (stats) => {
  if (!stats || stats.count <= 0) return '#e2e8f0';
  const ratio = (stats.positive || 0) / Math.max(stats.count, 1);
  if (ratio >= 0.6) return '#16a34a';
  if (ratio >= 0.3) return '#65a30d';
  return '#f97316';
};

// Party colours for the 2024 AP Assembly results layer.
// TDP=yellow, JSP=red, BJP=orange, YSRCP=blue, others=grey.
const PARTY_FILLS = {
  TDP: '#facc15',
  JSP: '#dc2626',
  BJP: '#f97316',
  YSRCP: '#2563eb',
};
const getPartyFill = (party) => PARTY_FILLS[String(party || '').toUpperCase()] || '#cbd5e1';

const AndhraPradeshMap = ({ embedded = false }) => {
  const navigate = useNavigate();
  const { isScoped, isSuperAdmin, assignedConstituency, canAccessConstituency } = useAuth();

  // For scoped MLA / MP / Nara Lokesh users, jump straight to their seat —
  // they have no use for the statewide overview.
  useEffect(() => {
    if (isScoped && !isSuperAdmin && assignedConstituency) {
      navigate(`/mla/${encodeURIComponent(assignedConstituency)}`, { replace: true });
    }
  }, [isScoped, isSuperAdmin, assignedConstituency, navigate]);

  const [districtGeo, setDistrictGeo] = useState(null);
  const [acGeo, setAcGeo] = useState(null);
  const [view, setView] = useState('ac'); // 'district' | 'ac' | 'ls'
  const [mapStats, setMapStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [hovered, setHovered] = useState(null);
  const [tooltip, setTooltip] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const loadSources = async (sources) => {
      for (const source of sources) {
        try {
          const res = await fetch(source);
          if (!res.ok) continue;
          const text = await res.text();
          if (!text || !text.trim()) continue;
          const parsed = JSON.parse(text);
          if (!parsed?.features?.length) continue;

          const normalizedFeatures = parsed.features.map((feature) => {
            const props = feature.properties || {};
            return {
              ...feature,
              properties: {
                ...props,
                DIST_NAME: getDistrictName(props),
                AC_NAME: getAcName(props),
                ST_NAME: getStateName(props),
              },
            };
          });

          const apOnly = normalizedFeatures.filter(
            (f) => normalize(f.properties?.ST_NAME) === 'andhra pradesh'
          );
          const features = apOnly.length > 0 ? apOnly : normalizedFeatures;
          return { ...parsed, features };
        } catch (_err) {
          // Keep trying next source.
        }
      }
      return null;
    };

    (async () => {
      const [districts, acs] = await Promise.all([
        loadSources(DISTRICT_SOURCES),
        loadSources(AC_SOURCES),
      ]);
      setDistrictGeo(districts);
      setAcGeo(acs);
      // If only the AC layer is present, default to it.
      if (!districts && acs) setView('ac');
    })();
  }, []);

  useEffect(() => {
    const fetchMapStats = async () => {
      setLoading(true);
      try {
        const res = await api.get('/grievances/map', { params: { days: 365, scope: 'all' } });
        setMapStats(res.data?.locations || {});
      } catch (_err) {
        setMapStats({});
      } finally {
        setLoading(false);
      }
    };

    fetchMapStats();
  }, []);

  const acAvailable = !!acGeo?.features?.length;
  // 'ls' (Lok Sabha) and 'ac' both rely on the AC GeoJSON, since the LS view is
  // built by colouring each AC by its parent Lok Sabha constituency's MP.
  const lsAvailable = acAvailable && acGeo.features.some((f) => f.properties?.loksabha_constituency_id);
  const requestedLs = view === 'ls' && lsAvailable;
  const requestedAc = view === 'ac' && acAvailable;
  const activeView = requestedLs ? 'ls' : requestedAc ? 'ac' : 'district';
  const geojson = activeView === 'district' ? districtGeo : acGeo;

  const getRegionName = useCallback(
    (props = {}) => {
      if (activeView === 'ls') return String(props.loksabha_constituency_name || '').trim();
      if (activeView === 'ac') return getAcName(props);
      return getDistrictName(props);
    },
    [activeView]
  );

  const regionNames = useMemo(() => {
    if (!geojson?.features?.length) return [];
    const names = new Set();
    geojson.features.forEach((f) => {
      const name = getRegionName(f.properties);
      if (name) names.add(name);
    });
    return [...names];
  }, [geojson, getRegionName]);

  const byRegion = useMemo(() => {
    const out = {};
    regionNames.forEach((d) => {
      out[d] = { count: 0, positive: 0, negative: 0, neutral: 0 };
    });

    Object.entries(mapStats || {}).forEach(([keyword, stats]) => {
      // For AC view, match keyword directly against AC names; the
      // CITY_TO_DISTRICT alias map only resolves to districts.
      const region =
        activeView === 'ac'
          ? regionNames.find((n) => normalize(n) === normalize(keyword)) ||
            regionNames.find((n) => {
              const nn = normalize(n);
              const k = normalize(keyword);
              return k.length >= 4 && (nn.includes(k) || k.includes(nn));
            })
          : findBestDistrictMatch(keyword, regionNames);
      if (!region) return;

      const bucket = out[region] || { count: 0, positive: 0, negative: 0, neutral: 0 };
      bucket.count += Number(stats?.count || stats?.total || 0);
      bucket.positive += Number(stats?.positive || 0);
      bucket.negative += Number(stats?.negative || 0);
      bucket.neutral += Number(stats?.neutral || 0);
      out[region] = bucket;
    });

    return out;
  }, [regionNames, mapStats, activeView]);

  const projection = useMemo(() => {
    if (!geojson) return null;
    const p = geoMercator();
    const width = embedded ? 780 : 1200;
    const height = embedded ? 430 : 760;
    p.fitSize([width, height], geojson);
    return p;
  }, [geojson, embedded]);

  const path = useMemo(() => {
    if (!projection) return null;
    return geoPath().projection(projection);
  }, [projection]);

  const handleRegionClick = useCallback(
    (regionName, feature) => {
      if (!regionName) return;
      // RBAC: scoped users can only click into their own assigned seat.
      if (isScoped && !isSuperAdmin && !canAccessConstituency(regionName)) {
        return;
      }
      // Constituency view → MLA profile.
      if (activeView === 'ac') {
        navigate(`/mla/${encodeURIComponent(titleCase(regionName))}`);
        return;
      }
      // Lok Sabha view → filter grievances for that LS constituency.
      if (activeView === 'ls') {
        const lsId = feature?.properties?.loksabha_constituency_id;
        const mp = getMpByLsId(lsId);
        navigate(
          `/grievances?location=${encodeURIComponent(titleCase(mp?.lsName || regionName))}`
        );
        return;
      }
      navigate(`/grievances?location=${encodeURIComponent(titleCase(regionName))}&sentiment=negative`);
    },
    [navigate, activeView, isScoped, isSuperAdmin, canAccessConstituency]
  );

  if (loading || !geojson || !path) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
      </div>
    );
  }

  const canvasWidth = embedded ? 780 : 1200;
  const canvasHeight = embedded ? 430 : 760;
  const strokeWidth = activeView === 'district' ? 0.8 : 0.4;

  const mapBody = (
    <div className="relative h-full w-full">
      <svg viewBox={`0 0 ${canvasWidth} ${canvasHeight}`} className="w-full h-full">
        <rect x="0" y="0" width={canvasWidth} height={canvasHeight} fill="#f8fafc" />
        {geojson.features.map((feature, idx) => {
          const regionName = getRegionName(feature.properties) || `Region-${idx}`;
          const stats = byRegion[regionName] || { count: 0, positive: 0, negative: 0, neutral: 0 };
          const isHovered = hovered === regionName;
          let baseFill;
          if (activeView === 'ac') {
            baseFill = getPartyFill(getMlaByConstituency(regionName)?.party);
          } else if (activeView === 'ls') {
            const lsId = feature.properties?.loksabha_constituency_id;
            baseFill = getPartyFill(getMpByLsId(lsId)?.party);
          } else {
            baseFill = getSentimentFill(stats);
          }

          return (
            <path
              key={`${regionName}-${idx}`}
              d={path(feature)}
              fill={isHovered ? '#0f172a' : baseFill}
              stroke="#ffffff"
              strokeWidth={strokeWidth}
              className="cursor-pointer transition-colors duration-150"
              onMouseMove={(evt) => {
                setHovered(regionName);
                setTooltip({ x: evt.clientX, y: evt.clientY });
              }}
              onMouseLeave={() => setHovered(null)}
              onClick={() => handleRegionClick(regionName, feature)}
            />
          );
        })}
      </svg>

      {acAvailable && (
        <div className="absolute top-2 right-2 z-10 flex rounded-md overflow-hidden border border-slate-200 bg-white shadow-sm text-xs">
          {lsAvailable && (
            <button
              type="button"
              onClick={() => setView('ls')}
              className={`px-2.5 py-1 font-medium transition-colors ${
                activeView === 'ls' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Lok Sabha
            </button>
          )}
          <button
            type="button"
            onClick={() => setView('ac')}
            className={`px-2.5 py-1 font-medium transition-colors border-l border-slate-200 ${
              activeView === 'ac' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Constituencies
          </button>
        </div>
      )}

      {(activeView === 'ac' || activeView === 'ls') && (
        <div className="absolute bottom-2 left-2 z-10 bg-white/95 border border-slate-200 rounded-md shadow-sm px-3 py-2 text-[11px]">
          <div className="font-semibold text-slate-700 mb-1">
            2024 Winning Party {activeView === 'ls' ? '(MP)' : '(MLA)'}
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1">
            <div className="flex items-center gap-1.5">
              <span className="inline-block w-3 h-3 rounded-sm" style={{ background: PARTY_FILLS.TDP }} />
              <span className="text-slate-600">TDP</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="inline-block w-3 h-3 rounded-sm" style={{ background: PARTY_FILLS.JSP }} />
              <span className="text-slate-600">JSP</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="inline-block w-3 h-3 rounded-sm" style={{ background: PARTY_FILLS.BJP }} />
              <span className="text-slate-600">BJP</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="inline-block w-3 h-3 rounded-sm" style={{ background: PARTY_FILLS.YSRCP }} />
              <span className="text-slate-600">YSRCP</span>
            </div>
          </div>
        </div>
      )}

      {hovered && (
        <div
          className="fixed z-50 pointer-events-none bg-white border border-slate-200 shadow-lg rounded-md px-3 py-2 text-xs"
          style={{ left: tooltip.x + 12, top: tooltip.y + 12 }}
        >
          <div className="font-semibold text-slate-900">{titleCase(hovered)}</div>
          {activeView === 'ac' && (
            <>
              <div className="text-[10px] uppercase tracking-wide text-slate-400">Assembly Constituency</div>
              {(() => {
                const mla = getMlaByConstituency(hovered);
                return mla ? (
                  <div className="mt-0.5 mb-1 text-[11px]">
                    <span className="font-medium text-slate-700">{mla.mla}</span>
                    <span className="text-slate-400"> · {mla.party}</span>
                  </div>
                ) : null;
              })()}
            </>
          )}
          {activeView === 'ls' && (
            <>
              <div className="text-[10px] uppercase tracking-wide text-slate-400">Lok Sabha Constituency</div>
              {(() => {
                const mp = getMpByLsName(hovered);
                return mp ? (
                  <div className="mt-0.5 mb-1 text-[11px]">
                    <span className="font-medium text-slate-700">{mp.mp}</span>
                    <span className="text-slate-400"> · {mp.party}</span>
                  </div>
                ) : null;
              })()}
            </>
          )}
          <div className="text-slate-600">Mentions: {byRegion[hovered]?.count || 0}</div>
          <div className="text-emerald-700">Positive: {byRegion[hovered]?.positive || 0}</div>
          <div className="text-red-600">Negative: {byRegion[hovered]?.negative || 0}</div>
          <div className="text-slate-500">Neutral: {byRegion[hovered]?.neutral || 0}</div>
        </div>
      )}
    </div>
  );

  if (embedded) {
    return mapBody;
  }

  const totalMentions = Object.values(byRegion).reduce((sum, s) => sum + (s.count || 0), 0);

  return (
    <div className="space-y-4">
      <Card className="p-4 border border-slate-200">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Andhra Pradesh Constituency Dashboard</h1>
            <p className="text-sm text-slate-600 mt-1">
              TDP leadership monitoring with{' '}
              {activeView === 'ac'
                ? 'assembly-constituency'
                : activeView === 'ls'
                ? 'Lok Sabha (MP)'
                : 'district'}
              -level GeoJSON shading.
            </p>
            <p className="text-xs text-slate-500 mt-2">
              {activeView === 'ac'
                ? `${regionNames.length} constituencies`
                : activeView === 'ls'
                ? `${regionNames.length} Lok Sabha seats`
                : `${regionNames.length} districts`}{' '}
              · Total mapped mentions: {totalMentions}
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {TDP_PORTRAITS.map((portrait) => (
              <button
                key={portrait.id}
                type="button"
                title={`View grievances mentioning ${portrait.alt.split(' — ')[0]}`}
                onClick={() =>
                  navigate(
                    `/grievances?target_entity=${encodeURIComponent(LEADERSHIP_TARGET_ENTITY[portrait.id] || '')}`
                  )
                }
                className="flex flex-col items-center gap-1 group"
              >
                <img
                  src={portrait.src}
                  alt={portrait.alt}
                  className="w-14 h-14 rounded-full object-cover border-2 border-yellow-400 shadow-sm group-hover:border-yellow-500 group-hover:scale-105 transition-transform"
                />
                <span className="text-[11px] font-medium text-slate-600 group-hover:text-slate-900">
                  {portrait.caption}
                </span>
              </button>
            ))}
          </div>
        </div>
      </Card>

      <Card className="p-2 border border-slate-200 h-[820px]">{mapBody}</Card>
    </div>
  );
};

export default AndhraPradeshMap;
