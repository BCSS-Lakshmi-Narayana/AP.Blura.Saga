import React from 'react';

/**
 * APDistrictPerformance — District leaderboard with sentiment bars
 */
const APDistrictPerformance = ({ data, loading }) => {
  const districts = data?.districts || [];

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-4 animate-pulse">
        <div className="h-4 w-44 bg-slate-200 rounded mb-4" />
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="py-2 border-b border-slate-100">
            <div className="flex justify-between mb-1.5">
              <div className="h-3 w-24 bg-slate-200 rounded" />
              <div className="h-3 w-8 bg-slate-200 rounded" />
            </div>
            <div className="h-1.5 bg-slate-100 rounded-full" />
          </div>
        ))}
      </div>
    );
  }

  if (!districts.length) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col items-center justify-center gap-2 text-slate-400 min-h-[200px]">
        <span className="text-2xl">🗺️</span>
        <span className="text-xs">No district data for this period</span>
      </div>
    );
  }

  const maxTotal = Math.max(...districts.map(d => d.total), 1);

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-slate-800">District Performance</h3>
        <div className="flex gap-3 text-[10px] text-slate-400">
          <span className="flex items-center gap-1"><span className="w-2 h-2 bg-emerald-500 rounded-sm" />Pos</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 bg-amber-400 rounded-sm" />Neu</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 bg-red-500 rounded-sm" />Neg</span>
        </div>
      </div>

      <div className="space-y-2.5 max-h-[215px] overflow-y-auto pr-1">
        {districts.map(d => (
          <div key={d.district} className="group">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-slate-700 truncate" title={d.district}>
                {d.district}
              </span>
              <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                <span className="text-[10px] text-emerald-600 font-semibold">{d.positivePct}%</span>
                <span className="text-[10px] text-red-500 font-semibold">{d.negativePct}%</span>
                <span className="text-[10px] text-slate-500">{d.total.toLocaleString()}</span>
              </div>
            </div>
            {/* Stacked bar */}
            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden flex">
              <div
                className="h-full bg-emerald-500 transition-all"
                style={{ width: `${d.positivePct}%` }}
              />
              <div
                className="h-full bg-amber-400 transition-all"
                style={{ width: `${Math.max(100 - d.positivePct - d.negativePct, 0)}%` }}
              />
              <div
                className="h-full bg-red-500 transition-all"
                style={{ width: `${d.negativePct}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default APDistrictPerformance;
