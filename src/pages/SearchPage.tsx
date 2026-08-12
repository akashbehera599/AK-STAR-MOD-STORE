import React, { useState, useEffect } from 'react';
import { Search, X, Clock, Sparkles, Filter } from 'lucide-react';
import { ApkItem } from '../types';
import { ApkCard } from '../components/ApkCard';

interface SearchPageProps {
  apks: ApkItem[];
  initialQuery?: string;
  onSelectApk: (apk: ApkItem) => void;
  onNavigate?: (tab: string) => void;
}

export const SearchPage: React.FC<SearchPageProps> = ({
  apks,
  initialQuery = '',
  onSelectApk
}) => {
  const [queryText, setQueryText] = useState(initialQuery);
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('akstar_recent_searches');
      return saved ? JSON.parse(saved) : ['Cinema', 'Music', 'Photo Editor', 'Gaming', 'Speed Booster'];
    } catch {
      return ['Cinema', 'Music', 'Photo Editor', 'Gaming', 'Speed Booster'];
    }
  });

  useEffect(() => {
    setQueryText(initialQuery);
  }, [initialQuery]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!queryText.trim()) return;

    const term = queryText.trim();
    const updated = [term, ...recentSearches.filter(s => s.toLowerCase() !== term.toLowerCase())].slice(0, 8);
    setRecentSearches(updated);
    try {
      localStorage.setItem('akstar_recent_searches', JSON.stringify(updated));
    } catch (err) {
      console.error(err);
    }
  };

  const handleChipClick = (term: string) => {
    setQueryText(term);
  };

  const clearRecentSearches = () => {
    setRecentSearches([]);
    localStorage.removeItem('akstar_recent_searches');
  };

  const results = apks.filter(apk => {
    if (!apk.isActive) return false;
    if (!queryText.trim()) return true;

    const q = queryText.toLowerCase().trim();
    const nameMatch = apk.name.toLowerCase().includes(q);
    const catMatch = apk.category.toLowerCase().includes(q);
    const descMatch = (apk.description || '').toLowerCase().includes(q);
    const tagMatch = apk.tags?.some(t => t.toLowerCase().includes(q));

    return nameMatch || catMatch || descMatch || tagMatch;
  });

  return (
    <div className="space-y-6 pb-20">
      {/* Search Input Header */}
      <div className="space-y-2">
        <h1 className="text-xl font-extrabold text-white">Search APKs</h1>
        <form onSubmit={handleSearchSubmit} className="relative w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-amber-400" />
          <input
            id="input-search-page-query"
            type="text"
            placeholder="Search by app name, category, feature, or mod..."
            value={queryText}
            onChange={(e) => setQueryText(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 focus:border-amber-500 rounded-2xl pl-11 pr-10 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-amber-500 transition shadow-lg"
            autoFocus
          />
          {queryText && (
            <button
              id="btn-search-clear-input"
              type="button"
              onClick={() => setQueryText('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white p-1"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </form>
      </div>

      {/* Recent Searches / Suggestions */}
      {recentSearches.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span className="flex items-center gap-1 font-semibold">
              <Clock className="w-3.5 h-3.5 text-amber-400" /> Recent Searches
            </span>
            <button
              id="btn-clear-recent-searches"
              onClick={clearRecentSearches}
              className="text-[11px] text-zinc-500 hover:text-amber-400 transition"
            >
              Clear All
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            {recentSearches.map((term, idx) => (
              <button
                key={idx}
                id={`chip-recent-search-${idx}`}
                onClick={() => handleChipClick(term)}
                className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-amber-500/40 text-zinc-300 text-xs px-3 py-1.5 rounded-xl transition flex items-center gap-1"
              >
                <span>{term}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Search Results Summary */}
      <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
        <span className="text-xs font-bold text-zinc-400">
          {queryText.trim() ? `Search results for "${queryText}"` : 'All Available Apps'}
        </span>
        <span className="text-xs font-semibold text-amber-400">
          {results.length} App{results.length === 1 ? '' : 's'}
        </span>
      </div>

      {/* Results Grid */}
      {results.length === 0 ? (
        <div className="bg-zinc-900/40 border border-zinc-800 rounded-3xl p-10 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-zinc-800 text-zinc-500 flex items-center justify-center mx-auto">
            <Search className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-white">No Apps Found</h3>
          <p className="text-xs text-zinc-400 max-w-sm mx-auto">
            We couldn't find any APK matching "{queryText}". Try searching with a different term or category.
          </p>
          <button
            id="btn-search-reset"
            onClick={() => setQueryText('')}
            className="bg-zinc-800 hover:bg-zinc-700 text-amber-400 text-xs font-bold px-4 py-2 rounded-xl transition"
          >
            Clear Search Filter
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {results.map(apk => (
            <ApkCard key={apk.id} apk={apk} onClick={() => onSelectApk(apk)} />
          ))}
        </div>
      )}
    </div>
  );
};
