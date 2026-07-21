import React, { useState } from 'react';
import { Calendar, Clock, MapPin, ExternalLink, Globe, Tag, Newspaper } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '../../lib/utils';

const CATEGORY_CONFIG = {
  crime: { label: 'Crime', color: 'bg-red-50 text-red-700 border-red-200 ring-1 ring-red-100' },
  politics: { label: 'Politics', color: 'bg-blue-50 text-blue-700 border-blue-200 ring-1 ring-blue-100' },
  development: { label: 'Development', color: 'bg-green-50 text-green-700 border-green-200 ring-1 ring-green-100' },
  agriculture: { label: 'Agriculture', color: 'bg-amber-50 text-amber-700 border-amber-200 ring-1 ring-amber-100' },
  health: { label: 'Health', color: 'bg-pink-50 text-pink-700 border-pink-200 ring-1 ring-pink-100' },
  education: { label: 'Education', color: 'bg-indigo-50 text-indigo-700 border-indigo-200 ring-1 ring-indigo-100' },
  law_order: { label: 'Law & Order', color: 'bg-orange-50 text-orange-700 border-orange-200 ring-1 ring-orange-100' },
  accident: { label: 'Accident', color: 'bg-red-50 text-red-600 border-red-100 ring-1 ring-red-50' },
  sports: { label: 'Sports', color: 'bg-emerald-50 text-emerald-700 border-emerald-200 ring-1 ring-emerald-100' },
  culture: { label: 'Culture', color: 'bg-purple-50 text-purple-700 border-purple-200 ring-1 ring-purple-100' },
  general: { label: 'General', color: 'bg-slate-50 text-slate-600 border-slate-200 ring-1 ring-slate-100' },
};

function timeAgo(date) {
  if (!date) return '';
  const diff = Date.now() - new Date(date).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return format(new Date(date), 'dd MMM yyyy');
}

export const RssNewsCard = ({ article }) => {
  const [imgError, setImgError] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const pubDate = article.published_date ? new Date(article.published_date) : null;
  const displayTitle = article.title_english || article.title;
  const showOriginal = article.is_translated && article.title && article.title_english && article.title !== article.title_english;
  const displaySummary = article.content || article.summary_english || article.summary;

  const catConfig = CATEGORY_CONFIG[article.category] || CATEGORY_CONFIG.general;
  const sourceName = article.source_name || article.source || article.source_domain || 'Unknown Source';

  // Content Truncation Logic
  const charLimit = 250;
  const isLongText = displaySummary && displaySummary.length > charLimit;
  const previewText = isLongText ? `${displaySummary.slice(0, charLimit)}...` : displaySummary;

  const hasImage = article.image_url && !imgError;

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow duration-200 w-full p-4 md:p-5">
      {/* Floated Image: Floats to left, text flows around it */}
      <div className="float-left mr-4 md:mr-5 mb-2.5 relative w-full sm:w-48 md:w-64 aspect-[4/3] rounded-lg overflow-hidden shrink-0">
        {hasImage ? (
          <img
            src={article.image_url}
            alt="News attachment"
            className="w-full h-full object-cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-violet-100 to-indigo-50 flex items-center justify-center">
            <Newspaper className="h-10 w-10 text-violet-300" />
          </div>
        )}
        {/* RSS Badge on Image */}
        <span className="absolute top-2.5 left-2.5 bg-[#6366f1] text-white text-[9px] font-bold px-2 py-0.5 rounded shadow-sm z-10">
          RSS
        </span>
      </div>

      {/* Main Content Info (Float wrapper) */}
      <div className="min-w-0">
        {/* Row 1: Title and Category/Language Badges */}
        <div className="flex justify-between items-start gap-4 mb-2">
          <div className="flex-1 min-w-0">
            <h4 className="font-bold text-slate-955 text-base leading-snug">
              {displayTitle}
            </h4>
            {showOriginal && (
              <p className="text-xs text-slate-400 italic mt-0.5">Original: {article.title}</p>
            )}
          </div>
          
          <div className="flex gap-1.5 shrink-0 items-center">
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
              {catConfig.label}
            </span>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-600 border border-blue-100">
              {article.language === 'te' ? 'Telugu' : article.language === 'hi' ? 'Hindi' : 'English'}
            </span>
          </div>
        </div>

        {/* Row 2: Text summary wrapping around floated image */}
        {displaySummary ? (
          <div className="text-[13px] text-slate-600 mb-4 leading-relaxed">
            {isExpanded ? displaySummary : previewText}
            {isLongText && (
              <button 
                onClick={() => setIsExpanded(!isExpanded)} 
                className="text-[#6366f1] hover:text-[#4f46e5] font-bold ml-1.5 hover:underline focus:outline-none"
              >
                {isExpanded ? 'Show Less' : 'Read More'}
              </button>
            )}
          </div>
        ) : (
          <div className="text-slate-300 italic text-[13px] mb-4">No summary available.</div>
        )}
      </div>

      {/* Clear Floats before Footer Details */}
      <div className="clear-both pt-3 border-t border-slate-100 mt-3">
        {/* Row 3: Publisher & Read Article */}
        <div className="flex justify-between items-center text-xs text-slate-500 mb-2">
          <div className="flex items-center gap-1.5 font-medium text-slate-700">
            <Globe className="h-3.5 w-3.5 text-slate-400" />
            <span>{sourceName}</span>
          </div>
          <a 
            href={article.source_url || article.url} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="text-[#6366f1] hover:text-[#4f46e5] font-semibold flex items-center gap-1 hover:underline text-[12px] transition-colors"
          >
            Read Article <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>

        {/* Row 4: Date/Time */}
        <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-400 mb-2">
          {pubDate && (
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              {format(pubDate, 'dd MMM yyyy, h:mm a')}
            </span>
          )}
          {pubDate && (
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              Detected {timeAgo(pubDate)}
            </span>
          )}
        </div>

        {/* Row 5: Tag/Keywords Tags */}
        {article.keywords_matched && article.keywords_matched.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 text-[10px] mt-1 pt-1.5 border-t border-dotted border-slate-100">
            <Tag className="h-3 w-3 text-slate-400 mr-0.5" />
            {article.keywords_matched.map((tag) => (
              <span 
                key={tag} 
                className="px-2 py-0.5 rounded-full bg-violet-50 text-violet-600 border border-violet-100 font-medium"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default RssNewsCard;
