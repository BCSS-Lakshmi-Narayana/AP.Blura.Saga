import React, { useState } from 'react';
import { Calendar, Clock, MapPin, ExternalLink, Rss, Globe, Tag } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '../../lib/utils';

const CATEGORY_CONFIG = {
  crime: { label: 'Crime', color: 'bg-red-100    text-red-700    border-red-200' },
  politics: { label: 'Politics', color: 'bg-blue-100   text-blue-700   border-blue-200' },
  development: { label: 'Development', color: 'bg-green-100  text-green-700  border-green-200' },
  agriculture: { label: 'Agriculture', color: 'bg-amber-100  text-amber-700  border-amber-200' },
  health: { label: 'Health', color: 'bg-pink-100   text-pink-700   border-pink-200' },
  education: { label: 'Education', color: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
  law_order: { label: 'Law & Order', color: 'bg-orange-100 text-orange-700 border-orange-200' },
  accident: { label: 'Accident', color: 'bg-red-50     text-red-600    border-red-100' },
  sports: { label: 'Sports', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  culture: { label: 'Culture', color: 'bg-purple-100 text-purple-700 border-purple-200' },
  general: { label: 'General', color: 'bg-slate-100  text-slate-600  border-slate-200' },
};

const LANG_CONFIG = {
  en: { label: 'English', color: 'bg-blue-50   text-blue-600   border-blue-100' },
  pa: { label: 'ਪੰਜਾਬੀ', color: 'bg-orange-50 text-orange-600 border-orange-100' },
  hi: { label: 'हिंदी', color: 'bg-green-50  text-green-600  border-green-100' },
  unknown: { label: '?', color: 'bg-slate-50  text-slate-500  border-slate-100' },
};

const SOURCE_TYPE_CONFIG = {
  rss: { label: 'RSS', color: 'bg-violet-50 text-violet-600 border-violet-100' },
  keyword_search: { label: 'Search', color: 'bg-amber-50  text-amber-600  border-amber-100' },
  domain: { label: 'Web', color: 'bg-cyan-50   text-cyan-600   border-cyan-100' },
};

function timeAgo(date) {
  if (!date) return '';
  const diff = Date.now() - new Date(date).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export const RssNewsCard = ({ article }) => {
  const [imgError, setImgError] = useState(false);

  const pubDate = article.published_date ? new Date(article.published_date) : null;
  const displayTitle = article.title_english || article.title;
  const showOriginal = article.is_translated && article.title && article.title_english
    && article.title !== article.title_english;
  const displaySummary = article.content || article.summary_english || article.summary;

  const catConfig = CATEGORY_CONFIG[article.category] || CATEGORY_CONFIG.general;
  const langConfig = LANG_CONFIG[article.language] || LANG_CONFIG.en;
  const srcConfig = SOURCE_TYPE_CONFIG[article.source_type] || SOURCE_TYPE_CONFIG.rss;

  const hasLocation = article.detected_location?.location_found;
  const locationLabel = article.detected_location?.district || article.detected_location?.city || '';

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-violet-200 transition-all duration-200 overflow-hidden group">
      <div className="flex">

        {/* Image panel */}
        <div className="w-44 shrink-0 self-stretch relative overflow-hidden bg-slate-100">
          {article.image_url && !imgError ? (
            <img
              src={article.image_url}
              alt=""
              className="w-full h-full object-cover min-h-[175px] group-hover:scale-105 transition-transform duration-300"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="w-full min-h-[175px] h-full flex flex-col items-center justify-center bg-gradient-to-br from-violet-50 to-slate-100 gap-2">
              <Rss className="h-10 w-10 text-violet-200" />
              <span className="text-[10px] text-slate-400 font-medium">No Image</span>
            </div>
          )}
          <div className="absolute top-2 left-2">
            <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded-md border shadow-sm', srcConfig.color)}>
              {srcConfig.label}
            </span>
          </div>
        </div>

        {/* Content panel */}
        <div className="flex-1 p-4 flex flex-col gap-2 min-w-0">

          {/* Row 1 — Title + Category / Language badges */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-bold text-slate-900 leading-snug group-hover:text-violet-700 transition-colors">
                {displayTitle}
              </h3>
              {showOriginal && (
                <p className="text-[11px] text-slate-400 italic mt-0.5 line-clamp-1">
                  Original: {article.title}
                </p>
              )}
            </div>
            <div className="flex flex-col items-end gap-1 shrink-0">
              <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded-md border whitespace-nowrap', catConfig.color)}>
                {catConfig.label}
              </span>
              <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded-md border whitespace-nowrap', langConfig.color)}>
                {langConfig.label}
              </span>
            </div>
          </div>

          {/* Row 2 — Summary */}
          {displaySummary ? (
            <p className="text-xs text-slate-600 leading-relaxed">{displaySummary}</p>
          ) : (
            <p className="text-xs text-slate-300 italic">No preview available — click Read Article for the full story.</p>
          )}

          {/* Row 3 — Source + Read link */}
          <div className="flex items-center gap-1.5 text-xs min-w-0">
            <Globe className="h-3 w-3 text-slate-400 shrink-0" />
            <span className="font-semibold text-slate-800 break-words">
              {article.source_name || article.source_domain || 'Unknown Source'}
            </span>
            <a
              href={article.source_url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="ml-auto flex items-center gap-1 text-violet-600 hover:text-violet-800 font-semibold shrink-0 text-[11px] hover:underline"
            >
              Read Article <ExternalLink className="h-3 w-3" />
            </a>
          </div>

          {/* Row 4 — Dates + Location */}
          <div className="flex items-center gap-3 text-[11px] text-slate-500 flex-wrap">
            {pubDate && (
              <span className="flex items-center gap-1 font-medium text-slate-600">
                <Calendar className="h-3 w-3" />
                {format(pubDate, 'dd MMM yyyy, h:mm a')}
              </span>
            )}
            {article.scraped_at && (
              <span className="flex items-center gap-1 text-slate-400">
                <Clock className="h-3 w-3" />
                Detected {timeAgo(article.scraped_at)}
              </span>
            )}
            {hasLocation && locationLabel && (
              <span className="flex items-center gap-1 text-emerald-600 font-semibold">
                <MapPin className="h-3 w-3" />
                {locationLabel}
              </span>
            )}
          </div>

          {/* Row 5 — Keywords */}
          {article.keywords_matched?.length > 0 && (
            <div className="flex items-center gap-1 flex-wrap">
              <Tag className="h-3 w-3 text-slate-400 shrink-0" />
              {article.keywords_matched.slice(0, 6).map((kw, i) => (
                <span key={i} className="text-[10px] px-1.5 py-0.5 bg-violet-50 text-violet-700 rounded-md font-medium border border-violet-100">
                  {kw}
                </span>
              ))}
              {article.keywords_matched.length > 6 && (
                <span className="text-[10px] text-slate-400 font-medium">+{article.keywords_matched.length - 6} more</span>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default RssNewsCard;
