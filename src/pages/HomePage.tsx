import React, { useState } from 'react';
import { Sparkles, Flame, Star, Zap, ChevronRight, Layers, ArrowRight, LayoutGrid } from 'lucide-react';
import { ApkItem, Category } from '../types';
import { ApkCard } from '../components/ApkCard';
import { SkeletonLoader } from '../components/SkeletonLoader';
import { useAuth } from '../context/AuthContext';

interface HomePageProps {
  apks: ApkItem[];
  categories: Category[];
  loading: boolean;
  viewMode?: 'home' | 'apps';
  onSelectApk: (apk: ApkItem) => void;
  onSelectCategory: (categorySlug: string) => void;
  onNavigate: (tab: string, param?: string) => void;
}

export const HomePage: React.FC<HomePageProps> = ({
  apks,
  categories,
  loading,
  viewMode = 'home',
  onSelectApk,
  onSelectCategory,
  onNavigate
}) => {
  const { isAdmin } = useAuth();
  const [activeFilter, setActiveFilter] = useState<'all' | 'premium' | 'free'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const activeApks = apks.filter(a => a.isActive);

  const filteredApks = activeApks.filter(apk => {
    if (activeFilter === 'premium' && !apk.isPremium) return false;
    if (activeFilter === 'free' && !apk.isFree) return false;
    if (selectedCategory !== 'all' && apk.category.toLowerCase() !== selectedCategory.toLowerCase()) return false;
    return true;
  });

  const featuredApks = activeApks.filter(a => a.isFeatured);
  const popularApks = [...activeApks].sort((a, b) => (b.downloadsCount || 0) - (a.downloadsCount || 0));
  const newReleases = [...activeApks].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const premiumApks = activeApks.filter(a => a.isPremium || !a.isFree);
  const freeApks = activeApks.filter(a => a.isFree);

  // If user navigated to "Apps" tab specifically
  const isAppsViewMode = viewMode === 'apps';

  return (
    <div className="space-y-6 pb-20">
      {/* 1. Category Chips Bar */}
      <section className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-xs font-black uppercase text-zinc-400 tracking-wider">Categories</h2>
          <button 
            id="btn-view-all-categories-top"
            onClick={() => onNavigate('categories')} 
            className="text-[11px] text-amber-400 font-extrabold flex items-center gap-0.5 hover:underline"
          >
            See All <ChevronRight className="w-3 h-3" />
          </button>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none snap-x">
          <button
            id="cat-chip-all"
            onClick={() => setSelectedCategory('all')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition border shrink-0 snap-start active:scale-95 ${
              selectedCategory === 'all'
                ? 'bg-amber-500 text-zinc-950 border-amber-400 shadow-md shadow-amber-500/20 font-black'
                : 'bg-zinc-900/90 text-zinc-400 border-zinc-800/80 hover:border-zinc-700'
            }`}
          >
            All Apps
          </button>
          {categories.map(cat => (
            <button
              key={cat.id}
              id={`cat-chip-${cat.slug}`}
              onClick={() => {
                setSelectedCategory(cat.slug);
                if (isAppsViewMode) onSelectCategory(cat.slug);
              }}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition border shrink-0 snap-start active:scale-95 ${
                selectedCategory.toLowerCase() === cat.slug.toLowerCase()
                  ? 'bg-amber-500 text-zinc-950 border-amber-400 shadow-md shadow-amber-500/20 font-black'
                  : 'bg-zinc-900/90 text-zinc-400 border-zinc-800/80 hover:border-zinc-700'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </section>

      {/* 2. Featured Banner Carousel (Only in Home mode) */}
      {!isAppsViewMode && featuredApks.length > 0 && (
        <section className="space-y-2">
          <div className="flex items-center gap-2 px-1">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <h2 className="text-sm font-black text-white tracking-tight">Featured & VIP Highlights</h2>
          </div>

          <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-none snap-x snap-mandatory">
            {featuredApks.map(apk => (
              <div 
                key={apk.id}
                id={`featured-banner-${apk.id}`}
                onClick={() => onSelectApk(apk)}
                className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-zinc-900 via-zinc-950 to-black border border-amber-500/30 p-4 sm:p-5 shadow-2xl min-w-[280px] sm:min-w-[340px] shrink-0 snap-start cursor-pointer group active:scale-[0.99] transition-all"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

                <div className="relative z-10 flex items-start gap-3.5">
                  <div className="relative w-16 h-16 sm:w-20 sm:h-20 shrink-0 rounded-2xl overflow-hidden bg-zinc-800 border border-zinc-700/80 shadow-lg">
                    {apk.icon && apk.icon.trim() !== '' ? (
                      <img src={apk.icon} alt={apk.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-amber-500/20 to-zinc-900 text-amber-400 font-black text-xl">
                        {apk.name.substring(0, 2).toUpperCase()}
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="inline-flex items-center gap-1 bg-amber-500/10 text-amber-400 text-[9px] font-black px-2 py-0.5 rounded-md border border-amber-500/30">
                      <Sparkles className="w-2.5 h-2.5" /> FEATURED MOD
                    </div>
                    <h3 className="text-sm sm:text-base font-black text-white truncate group-hover:text-amber-400 transition">
                      {apk.name}
                    </h3>
                    <p className="text-[11px] text-zinc-400 line-clamp-1">
                      {apk.shortDescription || apk.description || 'Exclusive VIP unlocked mod'}
                    </p>
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[10px] text-zinc-400 font-semibold">
                        v{apk.version}
                      </span>
                      <button 
                        id={`btn-featured-view-${apk.id}`}
                        className="bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-black px-3 py-1 rounded-xl shadow transition"
                      >
                        View
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 3. Main Filter & Apps View toggle if in Apps View mode */}
      {isAppsViewMode ? (
        <section className="space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
            <div className="flex items-center gap-1.5 bg-zinc-900 p-1 rounded-2xl border border-zinc-800">
              <button
                id="apps-tab-all"
                onClick={() => setActiveFilter('all')}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition ${
                  activeFilter === 'all' ? 'bg-amber-500 text-zinc-950 font-black' : 'text-zinc-400 hover:text-white'
                }`}
              >
                All
              </button>
              <button
                id="apps-tab-premium"
                onClick={() => setActiveFilter('premium')}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition ${
                  activeFilter === 'premium' ? 'bg-amber-500 text-zinc-950 font-black' : 'text-zinc-400 hover:text-white'
                }`}
              >
                VIP Premium
              </button>
              <button
                id="apps-tab-free"
                onClick={() => setActiveFilter('free')}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition ${
                  activeFilter === 'free' ? 'bg-amber-500 text-zinc-950 font-black' : 'text-zinc-400 hover:text-white'
                }`}
              >
                Free
              </button>
            </div>

            <span className="text-xs font-bold text-zinc-400">
              {filteredApks.length} App{filteredApks.length === 1 ? '' : 's'}
            </span>
          </div>

          {loading ? (
            <SkeletonLoader count={8} />
          ) : filteredApks.length === 0 ? (
            <div className="bg-zinc-900/40 border border-zinc-800 rounded-3xl p-10 text-center space-y-3">
              <Layers className="w-10 h-10 text-zinc-600 mx-auto" />
              <h3 className="text-sm font-bold text-white">No Apps Available</h3>
              <p className="text-xs text-zinc-400">There are no apps listed in this filter view.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              {filteredApks.map(apk => (
                <ApkCard key={apk.id} apk={apk} onClick={() => onSelectApk(apk)} />
              ))}
            </div>
          )}
        </section>
      ) : (
        /* Standard Home Marketplace Sections */
        <div className="space-y-8">
          {/* Section: Popular Apps Carousel */}
          {popularApks.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <Flame className="w-4 h-4 text-red-400" />
                  <h2 className="text-sm font-black text-white tracking-tight">Popular Apps</h2>
                </div>
                <button 
                  id="btn-see-all-popular"
                  onClick={() => onNavigate('apps')}
                  className="text-xs text-amber-400 font-extrabold flex items-center gap-0.5 hover:underline"
                >
                  See all <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Horizontal Scroll Swiping List */}
              <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-none snap-x">
                {popularApks.slice(0, 10).map(apk => (
                  <ApkCard key={apk.id} apk={apk} onClick={() => onSelectApk(apk)} layout="carousel" />
                ))}
              </div>
            </section>
          )}

          {/* Section: New & Updated Carousel */}
          {newReleases.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-400" />
                  <h2 className="text-sm font-black text-white tracking-tight">New & Updated</h2>
                </div>
                <button 
                  id="btn-see-all-new"
                  onClick={() => onNavigate('apps')}
                  className="text-xs text-amber-400 font-extrabold flex items-center gap-0.5 hover:underline"
                >
                  See all <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-none snap-x">
                {newReleases.slice(0, 10).map(apk => (
                  <ApkCard key={apk.id} apk={apk} onClick={() => onSelectApk(apk)} layout="carousel" />
                ))}
              </div>
            </section>
          )}

          {/* Section: Premium VIP Mods Carousel */}
          {premiumApks.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <h2 className="text-sm font-black text-white tracking-tight">Premium VIP Mods</h2>
                </div>
                <button 
                  id="btn-see-all-premium"
                  onClick={() => onNavigate('apps')}
                  className="text-xs text-amber-400 font-extrabold flex items-center gap-0.5 hover:underline"
                >
                  See all <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-none snap-x">
                {premiumApks.slice(0, 10).map(apk => (
                  <ApkCard key={apk.id} apk={apk} onClick={() => onSelectApk(apk)} layout="carousel" />
                ))}
              </div>
            </section>
          )}

          {/* Section: Free Apps */}
          {freeApks.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <h2 className="text-sm font-black text-white tracking-tight">Free Apps</h2>
                </div>
                <button 
                  id="btn-see-all-free"
                  onClick={() => onNavigate('apps')}
                  className="text-xs text-amber-400 font-extrabold flex items-center gap-0.5 hover:underline"
                >
                  See all <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-none snap-x">
                {freeApks.slice(0, 10).map(apk => (
                  <ApkCard key={apk.id} apk={apk} onClick={() => onSelectApk(apk)} layout="carousel" />
                ))}
              </div>
            </section>
          )}

          {/* Empty Catalog Fallback */}
          {activeApks.length === 0 && !loading && (
            <div className="bg-zinc-900/40 border border-zinc-800 rounded-3xl p-10 text-center space-y-3">
              <Layers className="w-12 h-12 text-zinc-600 mx-auto" />
              <h3 className="text-base font-bold text-zinc-200">No Apps Available</h3>
              <p className="text-xs text-zinc-400 max-w-md mx-auto">
                No active APKs found in the store database yet.
              </p>
              {isAdmin && (
                <button
                  id="btn-home-admin-add"
                  onClick={() => onNavigate('admin')}
                  className="bg-amber-500 text-zinc-950 font-black text-xs px-5 py-2.5 rounded-xl shadow hover:bg-amber-400 transition"
                >
                  Go to Admin Panel
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

