import React from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

const PLATFORM_COLORS = {
  x:         '#1d9bf0',
  facebook:  '#1877f2',
  instagram: '#e1306c',
  youtube:   '#ff0000',
  whatsapp:  '#25d366',
  other:     '#94a3b8'
};

const PLATFORM_ICONS = {
  x: '𝕏', facebook: 'f', instagram: '📷', youtube: '▶', whatsapp: '💬', other: '🌐'
};

/**
 * APSourceDistributionChart — Platform donut chart
 */
const APSourceDistributionChart = ({ data, loading }) => {
  const distribution = data?.distribution || [];
  const total = data?.total || 0;

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-4 h-[260px] animate-pulse flex flex-col justify-between">
        <div className="h-4 w-36 bg-slate-200 rounded" />
        <div className="flex justify-center"><div className="h-32 w-32 rounded-full bg-slate-100" /></div>
      </div>
    );
  }

  if (!distribution.length) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-4 h-[260px] flex flex-col justify-center items-center gap-2 text-slate-400">
        <span className="text-2xl">📡</span>
        <span className="text-xs">No source data available</span>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 h-[260px] flex flex-col shadow-sm hover:shadow transition-shadow">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-bold text-slate-800">Source Distribution (Mentions)</h3>
        <span className="text-xs text-slate-400">{total.toLocaleString()} total</span>
      </div>

      <div className="flex items-center gap-4 flex-1">
        <ResponsiveContainer width={140} height={140}>
          <PieChart>
            <Pie
              data={distribution}
              cx="50%"
              cy="50%"
              innerRadius={42}
              outerRadius={68}
              dataKey="count"
              strokeWidth={2}
              stroke="#fff"
            >
              {distribution.map((entry) => (
                <Cell
                  key={entry.platform}
                  fill={PLATFORM_COLORS[entry.platform] || PLATFORM_COLORS.other}
                />
              ))}
            </Pie>
            <Tooltip
              formatter={(v, n, p) => [`${v.toLocaleString()} (${p.payload.pct}%)`, p.payload.label]}
              contentStyle={{ fontSize: 11, borderRadius: 8 }}
            />
          </PieChart>
        </ResponsiveContainer>

        <div className="flex-1 space-y-1.5">
          {distribution.map(d => (
            <div key={d.platform} className="flex items-center gap-2">
              <span
                className="flex-shrink-0 w-2.5 h-2.5 rounded-full"
                style={{ background: PLATFORM_COLORS[d.platform] || PLATFORM_COLORS.other }}
              />
              <span className="text-xs text-slate-600 flex-1 truncate">{d.label}</span>
              <span className="text-xs font-semibold text-slate-800">{d.pct}%</span>
              <span className="text-[10px] text-slate-400">{d.count.toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default APSourceDistributionChart;
