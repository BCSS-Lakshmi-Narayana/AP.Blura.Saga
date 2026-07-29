import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { CalendarDays, ExternalLink, Globe, Newspaper, Search, RefreshCw, Loader2, Filter, AlertTriangle, Calendar } from 'lucide-react';
import api from '../lib/api';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { RssNewsCard } from '../components/grievances/RssNewsCard';
import { Tabs, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';
import { Calendar as CalendarComponent } from '../components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { format } from 'date-fns';

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

const SkeletonCard = () => (
  <div className="bg-white dark:bg-[#0d1117] border border-slate-200 dark:border-slate-800 rounded-lg p-5 space-y-4 animate-pulse h-full flex flex-col justify-between">
    <div>
      <div className="flex gap-2 mb-2">
        <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-16" />
        <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-16" />
        <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-12" />
      </div>
      <div className="aspect-[16/9] bg-slate-200 dark:bg-slate-800 rounded-lg w-full mb-3" />
      <div className="space-y-2 mb-3">
        <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-5/6" />
        <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-2/3" />
      </div>
      <div className="space-y-2">
        <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-full" />
        <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-full" />
        <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-4/5" />
      </div>
    </div>
    <div className="space-y-2 border-t border-slate-100 dark:border-slate-800 pt-3">
      <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-1/2" />
      <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-1/3" />
      <div className="flex justify-between items-center pt-2">
        <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-20" />
        <div className="flex gap-1">
          <div className="h-5 w-5 bg-slate-200 dark:bg-slate-800 rounded-full" />
          <div className="h-5 w-5 bg-slate-200 dark:bg-slate-800 rounded-full" />
          <div className="h-5 w-5 bg-slate-200 dark:bg-slate-800 rounded-full" />
        </div>
      </div>
    </div>
  </div>
);

const SkeletonGrid = () => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    {[...Array(6)].map((_, i) => (
      <SkeletonCard key={i} />
    ))}
  </div>
);

const EmptyState = ({ onReset, title = "No Articles Found", description = "Try changing filters or keywords." }) => (
  <Card className="border border-dashed border-slate-200 dark:border-slate-855 bg-slate-50/50 dark:bg-slate-900/10 rounded-xl max-w-md mx-auto my-12 w-full">
    <CardContent className="p-8 text-center flex flex-col items-center justify-center space-y-4">
      <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-500">
        <Newspaper className="h-6 w-6" />
      </div>
      <div className="space-y-1">
        <h3 className="font-semibold text-slate-800 dark:text-slate-200 text-sm md:text-base">{title}</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">{description}</p>
      </div>
      {onReset && (
        <Button
          variant="outline"
          size="sm"
          onClick={onReset}
          className="text-xs border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 mt-2"
        >
          Reset Filters
        </Button>
      )}
    </CardContent>
  </Card>
);

const PublicWebArticles = () => {
  const [activeTab, setActiveTab] = useState('monitored'); // 'monitored' or 'live'

  // Live News Scrape Tab States
  const [searchText, setSearchText] = useState('');
  const [liveArticles, setLiveArticles] = useState([]);
  const [liveSourceFilter, setLiveSourceFilter] = useState('All');
  const [isLiveLoading, setIsLiveLoading] = useState(false);
  const [liveErrorMessage, setLiveErrorMessage] = useState('');
  const [liveDateRange, setLiveDateRange] = useState({ start: '', end: '' });

  const hasLiveFiltersActive = searchText !== '' || liveSourceFilter !== 'All' || liveDateRange.start !== '' || liveDateRange.end !== '';
  const clearLiveFilters = () => {
    setSearchText('');
    setLiveSourceFilter('All');
    setLiveDateRange({ start: '', end: '' });
    setLiveArticles([]);
  };

  // Monitored Database Feed States
  const [dbArticles, setDbArticles] = useState([]);
  const [dbSearch, setDbSearch] = useState('');
  const [dbCategory, setDbCategory] = useState('all');
  const [dbDistrict, setDbDistrict] = useState('all');
  const [dbLanguage, setDbLanguage] = useState('all');
  const [dbDateRange, setDbDateRange] = useState({ start: '', end: '' });

  const hasDbFiltersActive = dbSearch !== '' || dbCategory !== 'all' || dbDistrict !== 'all' || dbLanguage !== 'all' || dbDateRange.start !== '' || dbDateRange.end !== '';
  const clearDbFilters = () => {
    setDbSearch('');
    setDbCategory('all');
    setDbDistrict('all');
    setDbLanguage('all');
    setDbDateRange({ start: '', end: '' });
  };
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
          startDate: dbDateRange.start || undefined,
          endDate: dbDateRange.end || undefined,
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
  }, [dbSearch, dbCategory, dbDistrict, dbLanguage, dbDateRange]);

  // ── Live news search API ──
  const runLiveSearch = useCallback(async (overrideQuery) => {
    const query = typeof overrideQuery === 'string' ? overrideQuery.trim() : searchText.trim();
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
  }, [searchText]);

  // Initial load / filter changes
  useEffect(() => {
    if (activeTab === 'monitored') {
      fetchDbArticles(1, false);
    } else if (activeTab === 'live' && liveArticles.length === 0) {
      setSearchText(SUGGESTED_QUERIES[0]);
      runLiveSearch(SUGGESTED_QUERIES[0]);
    }
  }, [activeTab, dbSearch, dbCategory, dbDistrict, dbLanguage, dbDateRange, fetchDbArticles, liveArticles.length, runLiveSearch]);

  const liveSources = useMemo(() => {
    const items = liveArticles.map((article) => article.source);
    return ['All', ...Array.from(new Set(items))];
  }, [liveArticles]);

  // Date filtering is handled directly by the backend for database articles.

  // Client-side date and source filters for scraped articles
  const filteredLiveArticles = useMemo(() => {
    return liveArticles.filter((article) => {
      const inSource = liveSourceFilter === 'All' || article.source === liveSourceFilter;
      if (!inSource) return false;
      
      const pubDate = article.publishedAt ? new Date(article.publishedAt) : null;
      if (pubDate) {
        if (liveDateRange.start && pubDate < new Date(liveDateRange.start)) return false;
        if (liveDateRange.end) {
          const endLimit = new Date(liveDateRange.end);
          endLimit.setHours(23, 59, 59, 999);
          if (pubDate > endLimit) return false;
        }
      }
      return true;
    }).sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
  }, [liveArticles, liveSourceFilter, liveDateRange]);

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6">

      {/* Title Header */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div className="flex flex-col">
          <h1 className="text-3xl font-heading font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Web Articles & News Feeds
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Live updates from RSS feeds and News Scrapers
          </p>
        </div>
      </div>

      {/* Tabs list styled like Alerts page / Radix tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-slate-100 dark:bg-slate-900/50 p-1 rounded-lg border border-slate-200 dark:border-slate-800 w-fit mb-2">
          <TabsTrigger 
            value="monitored" 
            className="text-xs font-semibold px-4 py-2"
          >
            Monitored RSS Feed
          </TabsTrigger>
          <TabsTrigger 
            value="live" 
            className="text-xs font-semibold px-4 py-2"
          >
            Live News Search (Scraper)
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* TAB 1: MONITORED RSS FEED (DB) */}
      {activeTab === 'monitored' && (
        <div className="space-y-6">
          {/* Search & Filters Row */}
          <div className="flex flex-col md:flex-row md:items-center gap-3">
            {/* Reduced Search Input */}
            <div className="relative w-full md:w-64 max-w-xs shrink-0">
              <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                value={dbSearch}
                onChange={(e) => setDbSearch(e.target.value)}
                placeholder="Search articles..."
                className="flex h-9 w-full rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-1 text-xs shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring pl-9"
              />
            </div>

            {/* Compact Filter Controls */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Category Filter */}
              <Select value={dbCategory} onValueChange={setDbCategory}>
                <SelectTrigger className="h-9 text-xs min-w-[140px] md:w-44">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {['crime', 'politics', 'development', 'agriculture', 'health', 'education', 'law_order', 'accident', 'sports', 'culture', 'infrastructure', 'economy', 'technology', 'entertainment', 'general'].map(c => (
                    <SelectItem key={c} value={c}>{c.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* District Filter */}
              <Select value={dbDistrict} onValueChange={setDbDistrict}>
                <SelectTrigger className="h-9 text-xs min-w-[145px] md:w-44">
                  <SelectValue placeholder="District" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Districts</SelectItem>
                  {AP_DISTRICTS.map(d => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Language Filter */}
              <Select value={dbLanguage} onValueChange={setDbLanguage}>
                <SelectTrigger className="h-9 text-xs min-w-[130px] md:w-36">
                  <SelectValue placeholder="Language" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Languages</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="te">Telugu</SelectItem>
                  <SelectItem value="hi">Hindi</SelectItem>
                </SelectContent>
              </Select>

              {/* Date Filter */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={`h-9 min-w-[180px] md:w-[190px] justify-start text-left font-normal text-xs border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900 shadow-sm ${!dbDateRange.start && "text-muted-foreground"}`}
                  >
                    <Calendar className="mr-1.5 h-3.5 w-3.5 shrink-0" />
                    {dbDateRange.start ? (
                      dbDateRange.end ? (
                        <span className="truncate">
                          {format(new Date(dbDateRange.start), "LLL dd")} -{" "}
                          {format(new Date(dbDateRange.end), "LLL dd, y")}
                        </span>
                      ) : (
                        <span className="truncate">{format(new Date(dbDateRange.start), "LLL dd, y")}</span>
                      )
                    ) : (
                      <span>Date range</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <CalendarComponent
                    initialFocus
                    mode="range"
                    defaultMonth={dbDateRange.start ? new Date(dbDateRange.start) : new Date()}
                    selected={{
                      from: dbDateRange.start ? new Date(dbDateRange.start) : undefined,
                      to: dbDateRange.end ? new Date(dbDateRange.end) : undefined
                    }}
                    onSelect={(range) => {
                      setDbDateRange({
                        start: range?.from ? range.from.toISOString() : '',
                        end: range?.to ? range.to.toISOString() : ''
                      });
                    }}
                    numberOfMonths={2}
                  />
                </PopoverContent>
              </Popover>

              {/* Stats & Refresh */}
              <div className="flex items-center gap-2 ml-auto md:ml-2">
                {hasDbFiltersActive && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearDbFilters}
                    className="h-9 px-3 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/20 font-semibold shrink-0"
                  >
                    Clear Filters
                  </Button>
                )}
                {!isDbLoading && dbPagination.total > 0 && (
                  <div className="h-9 px-3 rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center shadow-sm whitespace-nowrap shrink-0">
                    {dbPagination.total.toLocaleString()} articles
                  </div>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchDbArticles(1, false)}
                  disabled={isDbLoading}
                  className="h-9 gap-1.5 text-xs text-violet-600 border-slate-200 dark:border-slate-800 dark:text-violet-400 hover:bg-slate-50 dark:hover:bg-slate-900"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${isDbLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
            </div>
          </div>

          {/* DB Feed Articles List */}
          <div className="space-y-4">
            {dbErrorMessage && (
              <Card className="border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-900/30">
                <CardContent className="p-4 text-sm text-red-700 dark:text-red-400">
                  {dbErrorMessage}
                </CardContent>
              </Card>
            )}

            {isDbLoading ? (
              <SkeletonGrid />
            ) : dbArticles.length === 0 ? (
              <EmptyState 
                onReset={() => {
                  setDbSearch('');
                  setDbCategory('all');
                  setDbDistrict('all');
                  setDbLanguage('all');
                  setDbDateRange({ start: '', end: '' });
                }} 
              />
            ) : (
              <div className="space-y-6 w-full">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {dbArticles.map((article) => (
                    <RssNewsCard key={article._id || article.source_url} article={article} />
                  ))}
                </div>

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
                      className="gap-2 text-sm text-violet-600 border-slate-200 dark:border-slate-800 dark:text-violet-400 hover:bg-slate-50 dark:hover:bg-slate-900 h-9"
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
        <div className="space-y-6">
          {/* Live Search Controls Row */}
          <div className="flex flex-col md:flex-row md:items-center gap-3">
            {/* Reduced Search Input */}
            <div className="relative w-full md:w-64 max-w-xs shrink-0">
              <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') runLiveSearch();
                }}
                placeholder="Search keywords (example: Chandrababu Naidu Amaravati)"
                className="flex h-9 w-full rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-1 text-xs shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring pl-9"
              />
            </div>

            {/* Filter controls & Search Button */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Source Filter */}
              <Select value={liveSourceFilter} onValueChange={setLiveSourceFilter}>
                <SelectTrigger className="h-9 text-xs min-w-[150px] md:w-48">
                  <SelectValue placeholder="Source" />
                </SelectTrigger>
                <SelectContent>
                  {liveSources.map((source) => (
                    <SelectItem key={source} value={source}>{source}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Date Filter */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={`h-9 min-w-[180px] md:w-[190px] justify-start text-left font-normal text-xs border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900 shadow-sm ${!liveDateRange.start && "text-muted-foreground"}`}
                  >
                    <Calendar className="mr-1.5 h-3.5 w-3.5 shrink-0" />
                    {liveDateRange.start ? (
                      liveDateRange.end ? (
                        <span className="truncate">
                          {format(new Date(liveDateRange.start), "LLL dd")} -{" "}
                          {format(new Date(liveDateRange.end), "LLL dd, y")}
                        </span>
                      ) : (
                        <span className="truncate">{format(new Date(liveDateRange.start), "LLL dd, y")}</span>
                      )
                    ) : (
                      <span>Date range</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <CalendarComponent
                    initialFocus
                    mode="range"
                    defaultMonth={liveDateRange.start ? new Date(liveDateRange.start) : new Date()}
                    selected={{
                      from: liveDateRange.start ? new Date(liveDateRange.start) : undefined,
                      to: liveDateRange.end ? new Date(liveDateRange.end) : undefined
                    }}
                    onSelect={(range) => {
                      setLiveDateRange({
                        start: range?.from ? range.from.toISOString() : '',
                        end: range?.to ? range.to.toISOString() : ''
                      });
                    }}
                    numberOfMonths={2}
                  />
                </PopoverContent>
              </Popover>

              {hasLiveFiltersActive && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearLiveFilters}
                  className="h-9 px-3 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/20 font-semibold shrink-0"
                >
                  Clear Filters
                </Button>
              )}

              {/* Stats */}
              {!isLiveLoading && filteredLiveArticles.length > 0 && (
                <div className="h-9 px-3 rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center shadow-sm whitespace-nowrap shrink-0 ml-1">
                  {filteredLiveArticles.length} articles
                </div>
              )}

              {/* Search button */}
              <Button
                type="button"
                onClick={runLiveSearch}
                disabled={isLiveLoading}
                className="h-9 px-4 text-xs bg-yellow-600 hover:bg-yellow-705 text-white font-semibold shadow-sm transition-colors dark:bg-yellow-700 dark:hover:bg-yellow-800 border-none shrink-0"
              >
                {isLiveLoading ? 'Searching...' : 'Search Scrapers'}
              </Button>
            </div>
          </div>

          {/* Suggested Queries styled as Topic Classification chips */}
          <div className="border border-border dark:border-slate-800 bg-card dark:bg-[#0d1117]/40 rounded-md p-3 space-y-2">
            <div className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider">
              💡 Suggested Keywords
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
              {SUGGESTED_QUERIES.map((query) => (
                <button
                  key={query}
                  type="button"
                  onClick={() => {
                    setSearchText(query);
                    runLiveSearch(query);
                  }}
                  className={`px-3 py-1 font-semibold transition-all rounded-full text-xs whitespace-nowrap border ${searchText === query
                    ? 'bg-yellow-50 text-yellow-700 border-yellow-300 dark:bg-yellow-950/20 dark:text-yellow-400 dark:border-yellow-900/30'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent border-transparent'
                  }`}
                >
                  {query}
                </button>
              ))}
            </div>
          </div>

          {/* Results Area */}
          <div className="space-y-4">
            {liveErrorMessage && (
              <Card className="border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-900/30">
                <CardContent className="p-4 text-sm text-red-750 dark:text-red-400">
                  {liveErrorMessage}
                </CardContent>
              </Card>
            )}

            {isLiveLoading && (
              <SkeletonGrid />
            )}

            {/* Render live articles in grid */}
            {!isLiveLoading && filteredLiveArticles.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredLiveArticles.map((article) => {
                  const adaptedArticle = {
                    ...article,
                    source_name: article.source,
                    source_url: article.url,
                    published_date: article.publishedAt,
                    category: 'general',
                    source_type: 'scraper'
                  };
                  return (
                    <RssNewsCard key={article.id || article.url} article={adaptedArticle} />
                  );
                })}
              </div>
            )}

            {!isLiveLoading && !liveErrorMessage && filteredLiveArticles.length === 0 && searchText.trim() && (
              <EmptyState 
                title="No Articles Found" 
                description="No articles found for this keyword set. Try broader terms or remove one keyword." 
                onReset={() => {
                  setSearchText('');
                  setLiveDateRange({ start: '', end: '' });
                  setLiveSourceFilter('All');
                  setLiveArticles([]);
                }}
              />
            )}

            {!isLiveLoading && !liveErrorMessage && filteredLiveArticles.length === 0 && !searchText.trim() && (
              <EmptyState 
                title="Start with a Keyword Search" 
                description="Pick a suggestion or type your own query to scrape Google News directly on the fly." 
                onReset={() => {
                  setSearchText(SUGGESTED_QUERIES[0]);
                  setLiveDateRange({ start: '', end: '' });
                  setLiveSourceFilter('All');
                  runLiveSearch(SUGGESTED_QUERIES[0]);
                }}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PublicWebArticles;
