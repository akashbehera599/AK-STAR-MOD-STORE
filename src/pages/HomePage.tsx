import React, { useState } from 'react';
import { Sparkles, Flame, Star, ShieldCheck, Zap, Download, Layers, CheckCircle2, ArrowRight } from 'lucide-react';
import { ApkItem, Category } from '../types';
import { ApkCard } from '../components/ApkCard';
import { SkeletonLoader } from '../components/SkeletonLoader';
import { useAuth } from '../context/AuthContext';

interface HomePageProps {
  apks: ApkItem[];
  categories: Category[];
  loading: boolean;
  onSelectApk: (apk: ApkItem) => void;
  onSelectCategory: (categorySlug: string) => void;
  onNavigate: (tab: string) => void;
}

export const HomePage: React.FC<HomePageProps> = ({
  apks,
  categories,
  loading,
  onSelectApk,
  onSelectCategory,
  onNavigate
}) => {
  const { isAdmin, signInWithGoogle, user } = useAuth();
  const [activeFilter, setActiveFilter] = useState<'all' | 'premium' | 'free'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const filteredApks = apks.filter(apk => {
    if (!apk.isActive) return false;
    if (activeFilter === 'premium' && !apk.isPremium) return false;
    if (activeFilter === 'free' && !apk.isFree) return false;
    if (selectedCategory !== 'all' && apk.category.toLowerCase() !== selectedCategory.toLowerCase()) return false;
    return true;
  });

  const featuredApks = apks.filter(a => a.isActive && a.isFeatured);
  const popularApks = apks.filter(a => a.isActive).sort((a, b) => (b.downloadsCount || 0) - (a.downloadsCount || 0)).slice(0, 6);
  const newReleases = apks.filter(a => a.isActive).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 6);

  return (
    <div className="space-y-8 pb-20">
      {/* Hero Banner Section */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-zinc-900 via-zinc-950 to-black border border-amber-500/20 p-6 sm:p-8 shadow-2xl">
        <div className="absolute -top-24 -right-24 w-72 h-72 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-amber-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-2xl space-y-4">
          <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 text-amber-400 px-3 py-1 rounded-full text-xs font-extrabold tracking-wide">
            <Sparkles className="w-3.5 h-3.5" /> OFFICIAL AK STAR MOD STORE
          </div>

          <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight leading-tight">
            Premium Android APKs, <br />
            <span className="bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 bg-clip-text text-transparent">
              Unlocked & Verified.
            </span>
          </h1>

          <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed max-w-xl">
            Download high-speed, virus-checked, premium Android APKs and VIP mods with instant verification and fast downloads.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              id="btn-hero-explore"
              onClick={() => onNavigate('categories')}
              className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-zinc-950 font-extrabold text-xs sm:text-sm px-6 py-3 rounded-2xl shadow-lg shadow-amber-500/20 transition flex items-center gap-2 active:scale-95"
            >
              Explore Catalog <ArrowRight className="w-4 h-4" />
            </button>

            {isAdmin && (
              <button
                id="btn-hero-admin-add"
                onClick={() => onNavigate('admin')}
                className="bg-zinc-900 hover:bg-zinc-800 border border-amber-500/40 text-amber-400 font-bold text-xs sm:text-sm px-5 py-3 rounded-2xl transition"
              >
                + Add New APK
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Featured / VIP Carousel */}
      {featuredApks.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-amber-500/10 rounded-lg text-amber-400 border border-amber-500/20">
                <Sparkles className="w-4 h-4" />
              </div>
              <h2 className="text-lg font-bold text-white tracking-tight">VIP & Featured Mods</h2>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {featuredApks.map(apk => (
              <ApkCard key={apk.id} apk={apk} onClick={() => onSelectApk(apk)} />
            ))}
          </div>
        </section>
      )}

      {/* Categories Bar */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-zinc-300 uppercase tracking-wider">Browse Categories</h2>
          <button 
            id="btn-view-all-categories"
            onClick={() => onNavigate('categories')} 
            className="text-xs text-amber-400 font-semibold hover:underline"
          >
            View All
          </button>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          <button
            id="cat-pill-all"
            onClick={() => setSelectedCategory('all')}
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition border ${
              selectedCategory === 'all'
                ? 'bg-amber-500 text-zinc-950 border-amber-400 shadow-md shadow-amber-500/10'
                : 'bg-zinc-900/80 text-zinc-400 border-zinc-800 hover:border-zinc-700'
            }`}
          >
            All Categories
          </button>
          {categories.map(cat => (
            <button
              key={cat.id}
              id={`cat-pill-${cat.slug}`}
              onClick={() => setSelectedCategory(cat.slug)}
              className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition border ${
                selectedCategory.toLowerCase() === cat.slug.toLowerCase()
                  ? 'bg-amber-500 text-zinc-950 border-amber-400 shadow-md shadow-amber-500/10'
                  : 'bg-zinc-900/80 text-zinc-400 border-zinc-800 hover:border-zinc-700'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </section>

      {/* Type Filter Tabs (All / VIP Premium / Free) */}
      <section className="space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3 flex-wrap gap-2">
          <div className="flex items-center gap-2 bg-zinc-900/90 p-1 rounded-2xl border border-zinc-800">
            <button
              id="filter-tab-all"
              onClick={() => setActiveFilter('all')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                activeFilter === 'all' ? 'bg-amber-500 text-zinc-950' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              All Apps ({filteredApks.length})
            </button>
            <button
              id="filter-tab-premium"
              onClick={() => setActiveFilter('premium')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                activeFilter === 'premium' ? 'bg-amber-500 text-zinc-950' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              VIP Premium
            </button>
            <button
              id="filter-tab-free"
              onClick={() => setActiveFilter('free')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                activeFilter === 'free' ? 'bg-amber-500 text-zinc-950' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Free Apps
            </button>
          </div>

          <span className="text-xs text-zinc-500">
            Showing {filteredApks.length} result{filteredApks.length === 1 ? '' : 's'}
          </span>
        </div>

        {/* APK List */}
        {loading ? (
          <SkeletonLoader count={6} />
        ) : filteredApks.length === 0 ? (
          <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-3xl p-10 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-zinc-800 text-zinc-500 flex items-center justify-center mx-auto">
              <Layers className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-zinc-200">No APKs Available</h3>
            <p className="text-xs text-zinc-400 max-w-md mx-auto">
              There are no APKs listed under this section yet.
            </p>
            {isAdmin && (
              <button
                id="btn-empty-add-apk"
                onClick={() => onNavigate('admin')}
                className="mt-2 bg-amber-500 text-zinc-950 font-bold text-xs px-5 py-2.5 rounded-xl shadow transition hover:bg-amber-400"
              >
                Go to Admin Panel to Add APKs
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredApks.map(apk => (
              <ApkCard key={apk.id} apk={apk} onClick={() => onSelectApk(apk)} />
            ))}
          </div>
        )}
      </section>

      {/* Popular & Trending */}
      {popularApks.length > 0 && (
        <section className="space-y-4 pt-4 border-t border-zinc-800/60">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-red-500/10 rounded-lg text-red-400 border border-red-500/20">
              <Flame className="w-4 h-4" />
            </div>
            <h2 className="text-lg font-bold text-white tracking-tight">Popular & Trending</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {popularApks.map(apk => (
              <ApkCard key={apk.id} apk={apk} onClick={() => onSelectApk(apk)} layout="horizontal" />
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
