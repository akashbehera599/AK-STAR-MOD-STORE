import React, { useState } from 'react';
import { Grid, Layers, Sparkles, ChevronRight } from 'lucide-react';
import { ApkItem, Category } from '../types';
import { ApkCard } from '../components/ApkCard';

interface CategoriesPageProps {
  categories: Category[];
  apks: ApkItem[];
  selectedCategorySlug?: string;
  onSelectApk: (apk: ApkItem) => void;
}

export const CategoriesPage: React.FC<CategoriesPageProps> = ({
  categories,
  apks,
  selectedCategorySlug,
  onSelectApk
}) => {
  const [activeCategory, setActiveCategory] = useState<string>(selectedCategorySlug || 'all');

  const activeApks = apks.filter(apk => {
    if (!apk.isActive) return false;
    if (activeCategory === 'all') return true;
    return apk.category.toLowerCase() === activeCategory.toLowerCase();
  });

  return (
    <div className="space-y-6 pb-20">
      <div>
        <h1 className="text-xl font-extrabold text-white">Categories</h1>
        <p className="text-xs text-zinc-400 mt-1">
          Explore apps organized by genre and utility.
        </p>
      </div>

      {/* Category Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        <button
          id="cat-card-all"
          onClick={() => setActiveCategory('all')}
          className={`p-3.5 rounded-2xl border text-left transition flex flex-col justify-between ${
            activeCategory === 'all'
              ? 'bg-amber-500 text-zinc-950 border-amber-400 shadow-lg shadow-amber-500/20'
              : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700 text-zinc-300'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <Grid className="w-5 h-5" />
            <span className="text-[10px] font-extrabold opacity-80">
              {apks.filter(a => a.isActive).length}
            </span>
          </div>
          <div>
            <h3 className="text-xs font-bold truncate">All Categories</h3>
            <p className="text-[10px] opacity-70">Complete Catalog</p>
          </div>
        </button>

        {categories.map((cat) => {
          const count = apks.filter(a => a.isActive && a.category.toLowerCase() === cat.slug.toLowerCase()).length;
          const isSelected = activeCategory.toLowerCase() === cat.slug.toLowerCase();

          return (
            <button
              key={cat.id}
              id={`cat-card-${cat.slug}`}
              onClick={() => setActiveCategory(cat.slug)}
              className={`p-3.5 rounded-2xl border text-left transition flex flex-col justify-between ${
                isSelected
                  ? 'bg-amber-500 text-zinc-950 border-amber-400 shadow-lg shadow-amber-500/20'
                  : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700 text-zinc-300'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <Layers className="w-5 h-5" />
                <span className="text-[10px] font-extrabold opacity-80">{count}</span>
              </div>
              <div>
                <h3 className="text-xs font-bold truncate">{cat.name}</h3>
                <p className="text-[10px] opacity-70">{count} App{count === 1 ? '' : 's'}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Filtered Apps Title */}
      <div className="flex items-center justify-between border-b border-zinc-800 pb-2 pt-2">
        <h2 className="text-sm font-bold text-white capitalize">
          {activeCategory === 'all' ? 'All Applications' : `${activeCategory} Apps`}
        </h2>
        <span className="text-xs font-semibold text-amber-400">
          {activeApks.length} Available
        </span>
      </div>

      {/* APK Cards */}
      {activeApks.length === 0 ? (
        <div className="bg-zinc-900/40 border border-zinc-800 rounded-3xl p-10 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-zinc-800 text-zinc-500 flex items-center justify-center mx-auto">
            <Layers className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-white">No Apps in this Category</h3>
          <p className="text-xs text-zinc-400 max-w-sm mx-auto">
            There are currently no active apps under {activeCategory}. Select another category above.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {activeApks.map(apk => (
            <ApkCard key={apk.id} apk={apk} onClick={() => onSelectApk(apk)} />
          ))}
        </div>
      )}
    </div>
  );
};
