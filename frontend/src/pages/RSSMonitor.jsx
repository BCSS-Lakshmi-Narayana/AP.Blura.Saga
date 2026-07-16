import React, { useState, useEffect, useCallback } from 'react';
import { 
  Search, Rss, ExternalLink, Calendar, Globe, Tag, 
  RefreshCw, ChevronLeft, ChevronRight, Newspaper, Loader2 
} from 'lucide-react';
import api from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'sonner';

const RSSMonitor = () => {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  
  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalArticles, setTotalArticles] = useState(0);

  const fetchArticles = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get('/news', {
        params: {
          page,
          limit: 12,
          search: searchQuery || undefined,
          language: selectedLanguage !== 'all' ? selectedLanguage : undefined,
          category: selectedCategory !== 'all' ? selectedCategory : undefined,
          source_type: 'rss'
        }
      });
      setArticles(response.data.articles || []);
      setTotalPages(response.data.pagination?.pages || 1);
      setTotalArticles(response.data.pagination?.total || 0);
    } catch (error) {
      console.error('Error fetching RSS articles:', error);
      toast.error('Failed to load RSS feed articles');
    } finally {
      setLoading(false);
    }
  }, [page, searchQuery, selectedLanguage, selectedCategory]);

  useEffect(() => {
    fetchArticles();
  }, [fetchArticles]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchArticles();
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage);
    }
  };

  const formatDate = (dateStr) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return dateStr;
    }
  };

  return (
    <div className="p-6 space-y-6 bg-slate-950/40 min-h-[500px]">
      {/* Header Info */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-border/40 pb-5">
        <div>
          <div className="flex items-center gap-2 text-yellow-500 mb-1">
            <Rss className="h-5 w-5 animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-widest text-yellow-500/90">RSS Political Ingestion</span>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            TDP Party RSS Feed Monitor
            <Badge variant="outline" className="bg-yellow-500/10 text-yellow-400 border-yellow-500/20 font-medium">
              {totalArticles} Articles Found
            </Badge>
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Real-time political news feed aggregated and parsed directly from regional and national publications.
          </p>
        </div>
        <Button 
          onClick={fetchArticles} 
          disabled={loading}
          variant="outline" 
          size="sm"
          className="gap-2 border-border/80 text-xs hover:bg-slate-900"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh Feed
        </Button>
      </div>

      {/* Filters form */}
      <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-slate-900/30 p-4 rounded-2xl border border-border/30">
        <div className="relative md:col-span-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search news title, summaries, or keywords..."
            className="pl-9 bg-slate-950/50 border-border/50 text-white placeholder:text-muted-foreground/70"
          />
        </div>

        <div>
          <Select 
            value={selectedLanguage} 
            onValueChange={(val) => { setSelectedLanguage(val); setPage(1); }}
          >
            <SelectTrigger className="bg-slate-950/50 border-border/50 text-white">
              <SelectValue placeholder="Language" />
            </SelectTrigger>
            <SelectContent className="bg-slate-900 border-border text-white">
              <SelectItem value="all">All Languages</SelectItem>
              <SelectItem value="en">English</SelectItem>
              <SelectItem value="hi">Hindi</SelectItem>
              <SelectItem value="pa">Punjabi</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-2">
          <Select 
            value={selectedCategory} 
            onValueChange={(val) => { setSelectedCategory(val); setPage(1); }}
            className="flex-1"
          >
            <SelectTrigger className="bg-slate-950/50 border-border/50 text-white">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent className="bg-slate-900 border-border text-white">
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="politics">Politics</SelectItem>
              <SelectItem value="development">Development</SelectItem>
              <SelectItem value="law_order">Law & Order</SelectItem>
              <SelectItem value="general">General</SelectItem>
            </SelectContent>
          </Select>
          <Button type="submit" variant="secondary" className="px-4">Filter</Button>
        </div>
      </form>

      {/* Loading state */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <Loader2 className="h-10 w-10 text-yellow-500 animate-spin" />
          <span className="text-sm text-muted-foreground font-medium">Scraping RSS feed updates...</span>
        </div>
      ) : articles.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-border/30 rounded-2xl bg-slate-900/10">
          <Newspaper className="h-12 w-12 text-muted-foreground/50 mb-3" />
          <h3 className="text-lg font-semibold text-white">No articles matching your criteria</h3>
          <p className="text-sm text-muted-foreground max-w-sm mt-1">
            Try adjusting your search queries or run the background script to fetch fresh TDP news updates.
          </p>
        </div>
      ) : (
        /* Articles Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {articles.map((article) => (
            <Card 
              key={article._id} 
              className="flex flex-col overflow-hidden border-border/40 bg-slate-900/40 hover:bg-slate-900/80 transition-all duration-300 hover:border-yellow-500/30 hover:-translate-y-1 group"
            >
              {/* Preview Image: Render if exists, strictly no dummy images */}
              {article.image_url ? (
                <a
                  href={article.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="relative aspect-video w-full overflow-hidden bg-slate-950 border-b border-border/20 block"
                >
                  <img 
                    src={article.image_url} 
                    alt={article.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                    onError={(e) => {
                      e.target.parentElement.style.display = 'none';
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />
                </a>
              ) : null}

              <CardHeader className="p-4 flex-1 space-y-2">
                {/* Meta details */}
                <div className="flex items-center justify-between text-[11px] text-muted-foreground/80 font-semibold uppercase tracking-wider">
                  <span className="flex items-center gap-1 text-yellow-500/90">
                    <Globe className="h-3.5 w-3.5" />
                    {article.source_name || article.source_domain || 'RSS Source'}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {formatDate(article.published_date)}
                  </span>
                </div>

                <a
                  href={article.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline"
                >
                  <h3 className="font-bold text-white text-base leading-snug line-clamp-2 group-hover:text-yellow-400 transition-colors">
                    {article.title}
                  </h3>
                </a>

                <p className="text-xs text-muted-foreground/90 line-clamp-3 leading-relaxed">
                  {article.summary || article.content || 'No summary description provided.'}
                </p>
              </CardHeader>

              <CardContent className="p-4 pt-0 flex justify-between items-center border-t border-border/20 mt-auto bg-slate-950/20">
                <div className="flex flex-wrap gap-1">
                  {article.category && (
                    <Badge variant="secondary" className="bg-slate-800 text-[10px] text-slate-300 font-medium capitalize">
                      <Tag className="h-2.5 w-2.5 mr-1" />
                      {article.category.replace('_', ' ')}
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination controls */}
      {totalPages > 1 && !loading && (
        <div className="flex items-center justify-center gap-2 pt-6 border-t border-border/20">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(page - 1)}
            disabled={page === 1}
            className="bg-slate-900 border-border/60 hover:bg-slate-800 text-white"
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          <span className="text-xs text-muted-foreground">
            Page <strong className="text-white">{page}</strong> of <strong className="text-white">{totalPages}</strong>
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(page + 1)}
            disabled={page === totalPages}
            className="bg-slate-900 border-border/60 hover:bg-slate-800 text-white"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
};

export default RSSMonitor;
