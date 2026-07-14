import React from 'react';
import APKpiCard from './APKpiCard';
import {
  MessageSquare, ThumbsUp, ThumbsDown, Minus,
  Activity, Users, MapPin, AlertTriangle
} from 'lucide-react';

/**
 * APKpiRow — 8-card KPI summary strip with horizontal layout and custom styles
 */
const APKpiRow = ({ data, loading, compareLabel }) => {
  const kpis = data?.kpis || {};

  const cards = [
    {
      key: 'totalMentions',
      title: 'Total Mentions',
      icon: MessageSquare,
      iconBg: 'bg-blue-600',
      iconColor: 'text-white',
      format: 'compact',
      tooltip: 'Total monitored content mentioning AP constituencies/leaders in the selected period'
    },
    {
      key: 'positiveMentions',
      title: 'Positive',
      icon: ThumbsUp,
      iconBg: 'bg-emerald-500',
      iconColor: 'text-white',
      format: 'compact',
      tooltip: 'Total positive sentiment mentions'
    },
    {
      key: 'neutralMentions',
      title: 'Neutral',
      icon: Minus,
      iconBg: 'bg-amber-500',
      iconColor: 'text-white',
      format: 'compact',
      tooltip: 'Total neutral sentiment mentions'
    },
    {
      key: 'negativeMentions',
      title: 'Negative',
      icon: ThumbsDown,
      iconBg: 'bg-red-500',
      iconColor: 'text-white',
      format: 'compact',
      tooltip: 'Total negative sentiment mentions'
    },
    {
      key: 'potentialReach',
      title: 'Potential Reach',
      icon: Users,
      iconBg: 'bg-purple-600',
      iconColor: 'text-white',
      format: 'compact',
      tooltip: 'Total views/impressions across monitored content'
    },
    {
      key: 'totalEngagement',
      title: 'Engagement',
      icon: Activity,
      iconBg: 'bg-teal-600',
      iconColor: 'text-white',
      format: 'compact',
      tooltip: 'Total engagement (likes + retweets + replies) across all mentions'
    },
    {
      key: 'activeConstituencies',
      title: 'Active Constituencies',
      icon: MapPin,
      iconBg: 'bg-orange-500',
      iconColor: 'text-white',
      format: 'number',
      hideCompare: true,
      tooltip: 'Number of AP constituencies with monitored activity in the selected period'
    },
    {
      key: 'totalAlerts',
      title: 'Alerts',
      icon: AlertTriangle,
      iconBg: 'bg-rose-600',
      iconColor: 'text-white',
      format: 'number',
      tooltip: 'Total alerts generated in the selected period'
    }
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 2xl:grid-cols-8 gap-3">
      {cards.map(card => {
        const kpi = kpis[card.key];
        const value = card.showPctAsSub ? kpi?.value : kpi?.value;
        const subValue = card.showPctAsSub ? (kpi?.pct !== undefined ? `${kpi.pct}%` : undefined) : undefined;

        return (
          <APKpiCard
            key={card.key}
            title={card.title}
            value={value}
            subValue={subValue}
            change={kpi?.change}
            up={kpi?.up}
            icon={card.icon}
            iconColor={card.iconColor}
            iconBg={card.iconBg}
            format={card.format}
            tooltip={card.tooltip}
            loading={loading}
            compareLabel={compareLabel}
            hideCompare={card.hideCompare}
          />
        );
      })}
    </div>
  );
};

export default APKpiRow;
