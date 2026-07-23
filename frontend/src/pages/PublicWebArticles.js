import React, { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { CalendarDays, ExternalLink, Globe, Newspaper, Search, RefreshCw, Loader2, Filter, AlertTriangle } from 'lucide-react';
import api from '../lib/api';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { RssNewsCard } from '../components/grievances/RssNewsCard';

const SUGGESTED_QUERIES = [
  'Chandrababu Naidu Amaravati 2.0 capital city',
  'Nara Lokesh Founder Economy IT jobs',
  'Pawan Kalyan Pithapuram development JSP',
  'AP Super Six welfare schemes implementation',
  'AP river interlinking projects Godavari Krishna',
  'TDP-NDA alliance state development priorities'
];

const AP_DISTRICTS = [
  'Amaravati', 'Anantapur', 'Chittoor', 'East Godavari', 'Eluru', 'Guntur',
  'Kadapa', 'Kakinada', 'Krishna', 'Kurnool', 'Nellore', 'Ongole',
  'Prakasam', 'Rajahmundry', 'Srikakulam', 'Tirupati', 'Visakhapatnam',
  'Vizianagaram', 'West Godavari', 'Kuppam', 'Mangalagiri', 'Pulivendula'
];

const PublicWebArticles = () => {
  const [activeTab, setActiveTab] = useState('monitored'); // 'monitored' or 'live'

  // Live News Scrape Tab States
  const [searchText, setSearchText] = useState('');
  const [liveArticles, setLiveArticles] = useState([]);
  const [liveSourceFilter, setLiveSourceFilter] = useState('All');
  const [isLiveLoading, setIsLiveLoading] = useState(false);
  const [liveErrorMessage, setLiveErrorMessage] = useState('');

  // Monitored Database Feed States
  const [dbArticles, setDbArticles] = useState([]);
  const [dbSearch, setDbSearch] = useState('');
  const [dbCategory, setDbCategory] = useState('all');
  const [dbDistrict, setDbDistrict] = useState('all');
  const [dbLanguage, setDbLanguage] = useState('all');
  const [isDbLoading, setIsDbLoading] = useState(false);
  const [isDbLoadingMore, setIsDbLoadingMore] = useState(false);
  const [dbPagination, setDbPagination] = useState({ page: 1, pages: 1, total: 0, limit: 20 });
  const [dbErrorMessage, setDbErrorMessage] = useState('');

  // ── Monitored Feed Database Fetch ──
  const fetchDbArticles = useCallback(async (page = 1, append = false) => {
    if (page === 1) setIsDbLoading(true);
    else setIsDbLoadingMore(true);
    setDbErrorMessage('');
    try {
      const response = await api.get('/news', {
        params: {
          page,
          limit: 20,
          search: dbSearch || undefined,
          district: dbDistrict !== 'all' ? dbDistrict : undefined,
          category: dbCategory !== 'all' ? dbCategory : undefined,
          language: dbLanguage !== 'all' ? dbLanguage : undefined,
        }
      });
      const { articles = [], pagination } = response.data;
      setDbArticles(prev => append ? [...prev, ...articles] : articles);
      setDbPagination(pagination || { page: 1, pages: 1, total: 0, limit: 20 });
    } catch (error) {
      console.error('[RSS DB] Fetch failed:', error);
      setDbErrorMessage('Failed to load database RSS feed articles.');
    } finally {
      setIsDbLoading(false);
      setIsDbLoadingMore(false);
    }
  }, [dbSearch, dbCategory, dbDistrict, dbLanguage]);

  // Initial load / filter changes
  useEffect(() => {
    if (activeTab === 'monitored') {
      fetchDbArticles(1, false);
    }
  }, [activeTab, dbSearch, dbCategory, dbDistrict, dbLanguage, fetchDbArticles]);

  // ── Live news search API ──
  const runLiveSearch = async () => {
    const query = searchText.trim();
    if (!query) {
      setLiveErrorMessage('Enter keywords to scrape public web articles.');
      setLiveArticles([]);
      return;
    }

    try {
      setIsLiveLoading(true);
      setLiveErrorMessage('');
      const response = await api.get('/web-articles/search', {
        params: { q: query, limit: 40 }
      });
      setLiveArticles(Array.isArray(response.data?.articles) ? response.data.articles : []);
      setLiveSourceFilter('All');
    } catch (error) {
      setLiveArticles([]);
      setLiveErrorMessage(error?.response?.data?.message || 'Failed to scrape public web articles for this query.');
    } finally {
      setIsLiveLoading(false);
    }
  };

  const liveSources = useMemo(() => {
    const items = liveArticles.map((article) => article.source);
    return ['All', ...Array.from(new Set(items))];
  }, [liveArticles]);

  const filteredLiveArticles = useMemo(() => {
    return liveArticles.filter((article) => {
      const inSource = liveSourceFilter === 'All' || article.source === liveSourceFilter;
      return inSource;
    }).sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
  }, [liveArticles, liveSourceFilter]);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">

      {/* Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="h-10 w-10 rounded-xl bg-violet-600 text-white inline-flex items-center justify-center shadow-md">
            <Newspaper className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Web Articles & News Feeds</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Live updates and keyword triaging from Andhra Pradesh & National RSS feeds.
            </p>
          </div>
        </div>
      </div>

      {/* Tabs list */}
      <div className="border-b border-slate-200">
        <div className="flex gap-6">
          <button
            onClick={() => setActiveTab('monitored')}
            className={`pb-3 text-sm font-semibold border-b-2 transition-all duration-200 ${activeTab === 'monitored'
                ? 'border-violet-600 text-violet-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
          >
            Monitored RSS Feed
          </button>
          <button
            onClick={() => setActiveTab('live')}
            className={`pb-3 text-sm font-semibold border-b-2 transition-all duration-200 ${activeTab === 'live'
                ? 'border-violet-600 text-violet-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
          >
            Live News Search (Scraper)
          </button>
        </div>
      </div>

      {/* TAB 1: MONITORED RSS FEED (DB) */}
      {activeTab === 'monitored' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="flex flex-wrap items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                value={dbSearch}
                onChange={(e) => {
                  setDbSearch(e.target.value);
                }}
                placeholder="Search DB articles..."
                className="pl-9 h-9 text-xs"
              />
            </div>

            {/* Category Filter */}
            <select
              value={dbCategory}
              onChange={(e) => setDbCategory(e.target.value)}
              className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-violet-400/30 focus:border-violet-400 bg-white"
            >
              <option value="all">All Categories</option>
              {['crime', 'politics', 'development', 'agriculture', 'health', 'education', 'law_order', 'accident', 'sports', 'culture', 'general'].map(c => (
                <option key={c} value={c}>{c.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</option>
              ))}
            </select>

            {/* District Filter */}
            <select
              value={dbDistrict}
              onChange={(e) => setDbDistrict(e.target.value)}
              className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-violet-400/30 focus:border-violet-400 bg-white"
            >
              <option value="all">All Districts</option>
              {AP_DISTRICTS.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>

            {/* Language Filter */}
            <select
              value={dbLanguage}
              onChange={(e) => setDbLanguage(e.target.value)}
              className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-violet-400/30 focus:border-violet-400 bg-white"
            >
              <option value="all">All Languages</option>
              <option value="en">English</option>
              <option value="te">Telugu</option>
              <option value="hi">Hindi</option>
            </select>

            {/* Stats & Refresh */}
            <div className="ml-auto flex items-center gap-2">
              {!isDbLoading && dbPagination.total > 0 && (
                <span className="text-xs text-slate-500 whitespace-nowrap">
                  <span className="font-semibold text-slate-700">{dbPagination.total}</span> articles
                </span>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchDbArticles(1, false)}
                disabled={isDbLoading}
                className="h-8 gap-1.5 text-xs text-violet-600 border-violet-200 hover:bg-violet-50"
              >
                <RefreshCw className={`h-3 w-3 ${isDbLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>

          {/* DB Feed Articles List (Masonry) */}
          <div className="space-y-4">
            {dbErrorMessage && (
              <Card className="border-red-200 bg-red-50">
                <CardContent className="p-4 text-sm text-red-700">
                  {dbErrorMessage}
                </CardContent>
              </Card>
            )}

            {isDbLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4 animate-pulse">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 bg-slate-200 rounded-full shrink-0" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-slate-200 rounded w-1/3" />
                        <div className="h-3 bg-slate-200 rounded w-1/4" />
                      </div>
                    </div>
                    <div className="h-4 bg-slate-200 rounded w-3/4" />
                    <div className="h-16 bg-slate-200 rounded w-full" />
                  </div>
                ))}
              </div>
            ) : dbArticles.length === 0 ? (
              <Card className="border-dashed border-slate-300 bg-slate-50/70">
                <CardContent className="p-12 text-center space-y-2">
                  <Newspaper className="h-8 w-8 text-slate-400 mx-auto" />
                  <div className="text-slate-700 font-medium">No monitored articles found</div>

                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4 w-full">
                {dbArticles.map((article) => (
                  <RssNewsCard key={article._id || article.source_url} article={article} />
                ))}

                {/* DB Load More */}
                {dbPagination.page < dbPagination.pages && (
                  <div className="flex justify-center pt-4">
                    <Button
                      variant="outline"
                      onClick={() => {
                        const nextPage = dbPagination.page + 1;
                        fetchDbArticles(nextPage, true);
                      }}
                      disabled={isDbLoadingMore}
                      className="gap-2 text-sm text-violet-600 border-violet-200 hover:bg-violet-50"
                    >
                      {isDbLoadingMore ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" /> Loading...
                        </>
                      ) : (
                        `Load More (Page ${dbPagination.page + 1} of ${dbPagination.pages})`
                      )}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: LIVE GOOGLE NEWS SEARCH */}
      {activeTab === 'live' && (
        <div className="space-y-4">
          <Card className="border-slate-200 shadow-sm">
            <CardContent className="p-4 sm:p-5 space-y-4">
              <div className="text-xs text-slate-500">
                Search keywords to scrape Google News directly on the fly.
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input
                    value={searchText}
                    onChange={(event) => setSearchText(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') runLiveSearch();
                    }}
                    placeholder="Search keywords (example: Chandrababu Naidu Amaravati)"
                    className="h-11 pl-9"
                  />
                </div>
                <Button
                  type="button"
                  onClick={runLiveSearch}
                  disabled={isLiveLoading}
                  className="h-11 sm:px-6 bg-yellow-600 hover:bg-yellow-700 text-white font-semibold"
                >
                  {isLiveLoading ? 'Searching...' : 'Search'}
                </Button>
              </div>

              <div className="overflow-x-auto">
                <div className="flex gap-2 min-w-max pr-1">
                  {SUGGESTED_QUERIES.map((query) => (
                    <Button
                      key={query}
                      type="button"
                      size="sm"
                      variant="outline"
                      className="rounded-full bg-white hover:bg-yellow-50 hover:text-yellow-700"
                      onClick={() => setSearchText(query)}
                    >
                      {query}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 pt-1">
                <label htmlFor="source-filter" className="text-xs text-slate-500 shrink-0">
                  Filter by source
                </label>
                <select
                  id="source-filter"
                  value={liveSourceFilter}
                  onChange={(event) => setLiveSourceFilter(event.target.value)}
                  className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-yellow-500 sm:min-w-[180px]"
                >
                  {liveSources.map((source) => (
                    <option key={source} value={source}>{source}</option>
                  ))}
                </select>

                <div className="sm:ml-auto text-xs text-slate-500">
                  Showing {filteredLiveArticles.length} article{filteredLiveArticles.length === 1 ? '' : 's'}
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4">
            {liveErrorMessage && (
              <Card className="border-red-200 bg-red-50">
                <CardContent className="p-4 text-sm text-red-700">
                  {liveErrorMessage}
                </CardContent>
              </Card>
            )}

            {isLiveLoading && (
              <Card className="border-slate-200">
                <CardContent className="p-6 text-sm text-slate-600 flex items-center gap-3">
                  <Loader2 className="h-5 w-5 animate-spin text-yellow-600" />
                  Scraping public web articles for your keywords...
                </CardContent>
              </Card>
            )}

            {/* Render live articles styled like social media posts in masonry too! */}
            {!isLiveLoading && filteredLiveArticles.length > 0 && (
              <div className="space-y-4 w-full">
                {filteredLiveArticles.map((article) => {
                  const adaptedArticle = {
                    ...article,
                    source_name: article.source,
                    source_url: article.url,
                    published_date: article.publishedAt,
                    category: 'general'
                  };
                  return (
                    <RssNewsCard key={article.id} article={adaptedArticle} />
                  );
                })}
              </div>
            )}

            {!isLiveLoading && !liveErrorMessage && filteredLiveArticles.length === 0 && searchText.trim() && (
              <Card className="border-slate-200">
                <CardContent className="p-10 text-center space-y-2">
                  <div className="text-slate-700 font-medium">No articles found for this keyword set.</div>
                  <div className="text-sm text-slate-500">Try broader terms or remove one keyword.</div>
                </CardContent>
              </Card>
            )}

            {!isLiveLoading && !liveErrorMessage && filteredLiveArticles.length === 0 && !searchText.trim() && (
              <Card className="border-dashed border-slate-300 bg-slate-50/70">
                <CardContent className="p-12 text-center space-y-2">
                  <Newspaper className="h-8 w-8 text-slate-400 mx-auto" />
                  <div className="text-slate-700 font-medium">Start with a keyword search</div>
                  <div className="text-sm text-slate-500">Pick a suggestion or type your own query.</div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PublicWebArticles;
