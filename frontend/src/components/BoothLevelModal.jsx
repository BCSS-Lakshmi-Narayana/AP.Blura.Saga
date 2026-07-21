import React, { useEffect, useMemo, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Loader2, Search, Users, MapPin, Info, LayoutGrid, TrendingUp,
  ArrowUpDown, X, Vote, Sparkles,
} from 'lucide-react';
import api from '../lib/api';

/* Panel width per breakpoint. Below `sm` the panel goes full-width and
   overlays instead of pushing — there simply isn't room to shrink into. */
const panelWidthFor = (w) => {
  if (w < 640) return null;              // full-width overlay, no push
  return Math.round(w * 0.35);           // 35% of the viewport; page keeps the other 65%
};

const fmtNum = (n) => (n || n === 0 ? Number(n).toLocaleString('en-IN') : '—');

/* Animated count-up, restarts from 0 whenever `target` changes. */
const useCountUp = (target, duration = 800) => {
  const [val, setVal] = useState(0);
  const raf = useRef(0);
  useEffect(() => {
    const to = Number(target) || 0;
    if (to === 0) { setVal(0); return undefined; }
    const start = performance.now();
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      setVal(Math.round(to * (1 - Math.pow(1 - t, 3))));
      if (t < 1) raf.current = requestAnimationFrame(tick);
    };
    cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [target, duration]);
  return val;
};

const StatTile = ({ icon: Icon, label, value, color, bg, delay = 0 }) => {
  const n = useCountUp(value);
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay }}
      className="rounded-xl border border-slate-200 bg-white px-3.5 py-3 flex items-center gap-2.5 shadow-sm"
    >
      <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${bg}`}>
        <Icon className={`h-4 w-4 ${color}`} />
      </div>
      <div className="min-w-0">
        <div className="text-lg font-bold text-slate-800 leading-tight tabular-nums">{fmtNum(n)}</div>
        <div className="text-[10px] text-slate-400 uppercase tracking-wide truncate">{label}</div>
      </div>
    </motion.div>
  );
};

/* Gender donut — SVG arcs at exact proportion (no artificial gaps, so a
   fractional sliver never gets padded into a misleading notch). Segment
   colours match the legend rows below it one-for-one. */
const GenderDonut = ({ male, female, thirdGender, others }) => {
  const total = (male || 0) + (female || 0) + (thirdGender || 0) + (others || 0);
  if (!total) {
    return <div className="w-28 h-28 rounded-full border-[13px] border-slate-100 shrink-0" />;
  }

  const RADIUS = 42;
  const STROKE = 16;
  const CIRC = 2 * Math.PI * RADIUS;
  const segments = [
    { value: male, color: '#3b82f6' },
    { value: female, color: '#ec4899' },
    { value: thirdGender, color: '#94a3b8' },
    { value: others, color: '#fbbf24' }, // amber — matches the "Others" legend row
  ].filter((s) => (s.value || 0) > 0);

  let cursor = 0;
  const arcs = segments.map((s, i) => {
    const len = (s.value / total) * CIRC;
    const arc = { key: i, color: s.color, dash: `${len} ${CIRC - len}`, offset: -cursor };
    cursor += len;
    return arc;
  });

  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.45, ease: 'easeOut' }}
      className="relative w-28 h-28 shrink-0"
    >
      <svg viewBox="0 0 100 100" className="w-28 h-28 -rotate-90">
        <circle cx="50" cy="50" r={RADIUS} fill="none" stroke="#f1f5f9" strokeWidth={STROKE} />
        {arcs.map((a) => (
          <circle
            key={a.key}
            cx="50"
            cy="50"
            r={RADIUS}
            fill="none"
            stroke={a.color}
            strokeWidth={STROKE}
            strokeDasharray={a.dash}
            strokeDashoffset={a.offset}
            strokeLinecap="butt"
          />
        ))}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span className="text-base font-bold text-slate-800 leading-none tabular-nums">{fmtNum(total)}</span>
        <span className="text-[8px] text-slate-400 uppercase tracking-wide mt-0.5">Electors</span>
      </div>
    </motion.div>
  );
};

const LegendRow = ({ color, label, count, pct }) => (
  <div className="flex items-center gap-1.5 text-xs">
    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: color }} />
    <span className="text-slate-600 flex-1 min-w-0 truncate">{label}</span>
    <span className="font-bold text-slate-800 tabular-nums shrink-0">{pct}%</span>
    <span className="text-slate-400 text-right tabular-nums shrink-0 min-w-[3rem]">{fmtNum(count)}</span>
  </div>
);

/* Top-5 largest booths, thin animated rounded bars. */
const TopBoothsBar = ({ booths }) => {
  const top = useMemo(
    () => [...booths].sort((a, b) => b.electors_total - a.electors_total).slice(0, 5),
    [booths],
  );
  const max = top.reduce((m, b) => Math.max(m, b.electors_total), 0) || 1;
  return (
    // Label row above a full-width bar: the locality gets the whole card width
    // instead of competing with the bar for it, and the bar reads at full span.
    <div className="flex flex-col justify-between flex-1 gap-3">
      {top.map((b, i) => (
        <div key={b.part}>
          <div className="flex items-baseline gap-2 mb-1.5">
            <span className="text-[10px] font-bold text-violet-500 shrink-0">Part {b.part}</span>
            <span className="text-[11px] text-slate-600 flex-1 min-w-0 truncate" title={b.polling_station || b.locality}>
              {b.locality || '—'}
            </span>
            <span className="text-[11px] font-bold text-slate-700 tabular-nums shrink-0">{fmtNum(b.electors_total)}</span>
          </div>
          <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(b.electors_total / max) * 100}%` }}
              transition={{ duration: 0.7, delay: 0.1 + i * 0.06, ease: 'easeOut' }}
              className="h-full rounded-full bg-gradient-to-r from-indigo-400 to-violet-500"
            />
          </div>
        </div>
      ))}
    </div>
  );
};

const SORT_OPTIONS = [
  { key: 'part', label: 'Booth #' },
  { key: 'total_desc', label: 'Largest first' },
  { key: 'locality', label: 'Locality A-Z' },
];

const BoothCard = ({ booth, index }) => {
  const total = booth.electors_total || 0;
  const tg = booth.electors_third_gender;
  const unc = booth.electors_unclassified || 0;
  const pctM = total ? Math.round((booth.electors_male / total) * 100) : 0;
  const pctF = total ? Math.round((booth.electors_female / total) * 100) : 0;
  const pctO = Math.max(0, 100 - pctM - pctF);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.25, delay: Math.min(index * 0.02, 0.3) }}
      whileHover={{ y: -2, boxShadow: '0 8px 20px -6px rgba(15,23,42,0.12)' }}
      className="rounded-xl border border-slate-200 bg-white p-3.5 flex flex-col gap-2.5"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold text-violet-600 bg-violet-50 rounded-full px-2 py-0.5 shrink-0">
              Part {booth.part}
            </span>
          </div>
          <div className="flex items-start gap-1 mt-1">
            <MapPin className="h-3 w-3 text-slate-300 mt-0.5 shrink-0" />
            <span className="text-xs font-semibold text-slate-700 leading-snug line-clamp-2" title={booth.polling_station}>
              {booth.locality || booth.polling_station || 'Unknown locality'}
            </span>
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-base font-bold text-slate-800 tabular-nums leading-none">{fmtNum(total)}</div>
          <div className="text-[9px] text-slate-400 uppercase tracking-wide mt-0.5">Total</div>
        </div>
      </div>

      {/* stacked gender bar */}
      <div className="h-2 rounded-full overflow-hidden flex bg-slate-100">
        <motion.div initial={{ width: 0 }} animate={{ width: `${pctM}%` }} transition={{ duration: 0.6 }} className="bg-blue-500" />
        <motion.div initial={{ width: 0 }} animate={{ width: `${pctF}%` }} transition={{ duration: 0.6, delay: 0.05 }} className="bg-pink-500" />
        {pctO > 0 && (
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${pctO}%` }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className={unc > 0 ? 'bg-amber-400' : 'bg-slate-400'}
          />
        )}
      </div>
      <div className="flex items-center justify-between gap-1 text-[10px] flex-wrap">
        <span className="text-blue-600 font-medium whitespace-nowrap">M {fmtNum(booth.electors_male)}</span>
        <span className="text-pink-600 font-medium whitespace-nowrap">F {fmtNum(booth.electors_female)}</span>
        {tg > 0 && <span className="text-slate-500 font-medium whitespace-nowrap">TG {fmtNum(tg)}</span>}
        {unc > 0 && (
          <span
            className="text-amber-600 font-medium whitespace-nowrap"
            title="Gender could not be resolved for these records in the source export"
          >
            Others {fmtNum(unc)}
          </span>
        )}
      </div>
    </motion.div>
  );
};

const BoothLevelModal = ({ open, onClose, constituency, constituencyDisplayName }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('part');
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const [panelWidth, setPanelWidth] = useState(() =>
    (typeof window !== 'undefined' ? panelWidthFor(window.innerWidth) : 560));

  // Track viewport so the push distance stays correct across resizes.
  useEffect(() => {
    const onResize = () => setPanelWidth(panelWidthFor(window.innerWidth));
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Push the main content aside (Layout reads this custom property). Cleared
  // on close/unmount so the layout always springs back.
  useEffect(() => {
    const root = document.documentElement;
    if (open && panelWidth) {
      root.style.setProperty('--side-panel-width', `${panelWidth}px`);
    } else {
      root.style.removeProperty('--side-panel-width');
    }
    return () => root.style.removeProperty('--side-panel-width');
  }, [open, panelWidth]);

  // Escape closes the panel.
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open || !constituency) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    api.get(`/voter-profiles/${encodeURIComponent(constituency)}/booths`)
      .then((res) => { if (!cancelled) setData(res.data); })
      .catch((err) => {
        if (cancelled) return;
        setData(null);
        setError(err?.response?.status === 404
          ? 'Booth-level data has not been collected for this constituency yet.'
          : 'Could not load booth-level data.');
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [open, constituency]);

  const booths = useMemo(() => data?.booths || [], [data]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let rows = !q ? booths : booths.filter((b) =>
      String(b.part).includes(q) ||
      String(b.locality || '').toLowerCase().includes(q) ||
      String(b.polling_station || '').toLowerCase().includes(q));
    rows = [...rows];
    if (sort === 'total_desc') rows.sort((a, b) => b.electors_total - a.electors_total);
    else if (sort === 'locality') rows.sort((a, b) => String(a.locality).localeCompare(String(b.locality)));
    else rows.sort((a, b) => a.part - b.part);
    return rows;
  }, [booths, query, sort]);

  // Third gender and "Others" stay separate buckets: Kuppam's source export
  // never resolved gender for its ~2,075 "Others" records, so those are kept
  // out of the third-gender figure rather than inflating it.
  const totals = useMemo(() => booths.reduce((acc, b) => ({
    m: acc.m + (b.electors_male || 0),
    f: acc.f + (b.electors_female || 0),
    tg: acc.tg + (b.electors_third_gender || 0),
    unc: acc.unc + (b.electors_unclassified || 0),
    t: acc.t + (b.electors_total || 0),
  }), { m: 0, f: 0, tg: 0, unc: 0, t: 0 }), [booths]);

  const sortLabel = SORT_OPTIONS.find((s) => s.key === sort)?.label;

  const isOverlayMode = !panelWidth; // small screens: overlay instead of push

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          {/* Scrim only in overlay mode — when the panel pushes content the
              page stays usable behind it, so no dimming. */}
          {isOverlayMode && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={onClose}
              className="fixed inset-0 top-16 lg:top-20 bg-slate-900/40 backdrop-blur-[1px] z-40"
              aria-hidden="true"
            />
          )}

          <motion.aside
            role="dialog"
            aria-modal={isOverlayMode ? 'true' : 'false'}
            aria-label={`Booth-level voter data for ${constituencyDisplayName || constituency}`}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 34, mass: 0.9 }}
            style={panelWidth ? { width: panelWidth } : undefined}
            className="fixed right-0 top-16 lg:top-20 bottom-0 w-full z-40 bg-white border-l border-slate-200 shadow-[-8px_0_28px_-12px_rgba(15,23,42,0.18)] flex flex-col overflow-hidden"
          >
        {/* Header */}
        <div className="pl-5 pr-14 py-3.5 border-b border-slate-200 bg-gradient-to-r from-violet-50 via-white to-white shrink-0 relative">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close booth-level data"
            className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-3">
            <motion.div
              initial={{ scale: 0.7, rotate: -8, opacity: 0 }}
              animate={{ scale: 1, rotate: 0, opacity: 1 }}
              transition={{ duration: 0.35 }}
              className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm"
            >
              <LayoutGrid className="h-4.5 w-4.5" />
            </motion.div>
            <div className="min-w-0">
              <div className="text-sm font-bold text-slate-800">Booth-Level Voter Data</div>
              <div className="text-[11px] text-slate-500 truncate">{constituencyDisplayName || constituency}</div>
            </div>
            {data?.coverage && (
              <motion.div
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15 }}
                className="ml-auto flex items-center gap-2 shrink-0"
              >
                <div className="hidden sm:flex items-center gap-1.5 w-28">
                  <div className="flex-1 h-1.5 rounded-full bg-slate-200 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${data.coverage.pct}%` }}
                      transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
                      className="h-full rounded-full bg-violet-500"
                    />
                  </div>
                </div>
                <span className="text-[11px] font-semibold text-violet-700 bg-violet-100 rounded-full px-2.5 py-1 whitespace-nowrap">
                  {data.coverage.collected} / {data.coverage.total_booths} booths
                </span>
              </motion.div>
            )}
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-hidden bg-slate-50 flex flex-col">
          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}>
                <Loader2 className="h-6 w-6 text-violet-400" />
              </motion.div>
            </div>
          ) : error ? (
            <div className="flex-1 flex items-center justify-center px-6">
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center gap-2 text-sm text-slate-500 max-w-sm text-center"
              >
                <Info className="h-6 w-6 text-slate-300" />
                <span>{error}</span>
              </motion.div>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto">
              {/* Overview / Analytics */}
              <div className="px-5 pt-4 pb-3">
                <div className={`grid gap-2.5 mb-4 ${(panelWidth || 0) >= 760 ? 'grid-cols-4' : 'grid-cols-2'}`}>
                  <StatTile icon={LayoutGrid} label="Booths Collected" value={booths.length} color="text-violet-600" bg="bg-violet-100" delay={0} />
                  <StatTile icon={Users} label="Male Electors" value={totals.m} color="text-blue-600" bg="bg-blue-100" delay={0.04} />
                  <StatTile icon={Users} label="Female Electors" value={totals.f} color="text-pink-600" bg="bg-pink-100" delay={0.08} />
                  <StatTile icon={Vote} label="Total Electors" value={totals.t} color="text-slate-700" bg="bg-slate-100" delay={0.12} />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                    className="rounded-xl border border-slate-200 bg-white p-4"
                  >
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-3 flex items-center gap-1">
                      <Sparkles className="h-3 w-3" /> Gender Distribution
                    </div>
                    {/* Donut above, legend full-width below — keeps the rows from
                        truncating inside the narrow side panel. */}
                    <div className="flex justify-center mb-3">
                      <GenderDonut
                        male={totals.m}
                        female={totals.f}
                        thirdGender={totals.tg}
                        others={totals.unc}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <LegendRow color="#3b82f6" label="Male" count={totals.m} pct={totals.t ? Math.round((totals.m / totals.t) * 100) : 0} />
                      <LegendRow color="#ec4899" label="Female" count={totals.f} pct={totals.t ? Math.round((totals.f / totals.t) * 100) : 0} />
                      {/* Shown even at zero so the category never silently
                          vanishes for seats with no third-gender electors. */}
                      {totals.tg > 0 && (
                        <LegendRow color="#94a3b8" label="Third Gender" count={totals.tg} pct={totals.t ? Math.round((totals.tg / totals.t) * 100) : 0} />
                      )}
                      {totals.unc > 0 && (
                        <div className="flex items-center gap-2 text-xs pt-1.5 mt-1 border-t border-slate-100">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0 bg-amber-400" />
                          <span className="text-slate-600 flex-1 min-w-0 flex items-center gap-1">
                            Others
                            <span title="Gender could not be resolved for these records in the source export. They are counted in the booth total.">
                              <Info className="h-3 w-3 text-slate-300" />
                            </span>
                          </span>
                          <span className="font-bold text-slate-800 tabular-nums shrink-0">{totals.t ? Math.round((totals.unc / totals.t) * 100) : 0}%</span>
                          <span className="text-slate-400 text-right tabular-nums shrink-0 min-w-[3rem]">{fmtNum(totals.unc)}</span>
                        </div>
                      )}
                    </div>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="rounded-xl border border-slate-200 bg-white p-4 flex flex-col"
                  >
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-3 flex items-center gap-1">
                      <TrendingUp className="h-3 w-3" /> Largest Booths by Electors
                    </div>
                    {booths.length === 0 ? (
                      <div className="text-[11px] text-slate-400 py-4 text-center">No booths to rank yet.</div>
                    ) : (
                      <TopBoothsBar booths={booths} />
                    )}
                  </motion.div>
                </div>
              </div>

              {/* Search + sort */}
              <div className="px-5 py-2.5 bg-white/80 backdrop-blur border-y border-slate-100 sticky top-0 z-10 flex items-center gap-2 flex-wrap">
                <div className="relative flex-1 min-w-[180px] max-w-xs">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search booth # or locality…"
                    className="w-full rounded-md border border-slate-200 bg-slate-50 pl-8 pr-7 py-1.5 text-xs outline-none focus:border-violet-300 focus:bg-white focus:ring-2 focus:ring-violet-100 transition"
                  />
                  {query && (
                    <button type="button" onClick={() => setQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setSortMenuOpen((v) => !v)}
                    className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:border-slate-300"
                  >
                    <ArrowUpDown className="h-3 w-3" /> {sortLabel}
                  </button>
                  <AnimatePresence>
                    {sortMenuOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -4, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -4, scale: 0.97 }}
                        transition={{ duration: 0.12 }}
                        className="absolute right-0 mt-1 w-36 rounded-lg border border-slate-200 bg-white shadow-lg z-20 py-1"
                      >
                        {SORT_OPTIONS.map((opt) => (
                          <button
                            key={opt.key}
                            type="button"
                            onClick={() => { setSort(opt.key); setSortMenuOpen(false); }}
                            className={`w-full text-left px-3 py-1.5 text-xs hover:bg-slate-50 ${sort === opt.key ? 'text-violet-600 font-semibold' : 'text-slate-600'}`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <span className="text-[11px] text-slate-400 ml-auto">{filtered.length} booth{filtered.length !== 1 ? 's' : ''}</span>
              </div>

              {/* Card grid */}
              <div className="px-5 py-4">
                {filtered.length === 0 ? (
                  <div className="text-sm text-slate-400 text-center py-16">No booths match your search.</div>
                ) : (
                  <div className={`grid gap-3 ${(panelWidth || 0) >= 420 || !panelWidth ? 'grid-cols-2' : 'grid-cols-1'}`}>
                    <AnimatePresence mode="popLayout">
                      {filtered.map((b, i) => (
                        <BoothCard key={b.part} booth={b} index={i} />
                      ))}
                    </AnimatePresence>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
};

export default BoothLevelModal;
