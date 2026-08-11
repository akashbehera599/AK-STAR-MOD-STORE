import React from 'react';
import { Star, Download, ShieldCheck, Sparkles, Smartphone } from 'lucide-react';
import { ApkItem } from '../types';

interface ApkCardProps {
  apk: ApkItem;
  onClick: () => void;
  layout?: 'grid' | 'horizontal';
}

export const ApkCard: React.FC<ApkCardProps> = ({ apk, onClick, layout = 'grid' }) => {
  if (layout === 'horizontal') {
    return (
      <div 
        id={`apk-card-horizontal-${apk.id}`}
        onClick={onClick}
        className="group flex items-center gap-3 bg-zinc-900/60 border border-zinc-800/80 hover:border-amber-500/40 rounded-2xl p-3 cursor-pointer transition-all active:scale-[0.98] shadow-lg shadow-black/20"
      >
        <div className="relative w-16 h-16 shrink-0 rounded-2xl overflow-hidden bg-zinc-800 border border-zinc-700/50 shadow-md">
          {apk.icon ? (
            <img src={apk.icon} alt={apk.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-amber-500/20 to-zinc-900 text-amber-400 font-bold text-lg">
              {apk.name.substring(0, 2).toUpperCase()}
            </div>
          )}
          {apk.isFeatured && (
            <div className="absolute top-0 right-0 bg-amber-500 text-zinc-950 p-0.5 rounded-bl-lg shadow">
              <Sparkles className="w-3 h-3 fill-zinc-950" />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <h3 className="text-sm font-bold text-zinc-100 truncate group-hover:text-amber-400 transition">
              {apk.name}
            </h3>
            {apk.isFree ? (
              <span className="bg-emerald-500/10 text-emerald-400 text-[10px] font-extrabold px-1.5 py-0.2 rounded border border-emerald-500/20">
                FREE
              </span>
            ) : (
              <span className="bg-amber-500/10 text-amber-400 text-[10px] font-extrabold px-1.5 py-0.2 rounded border border-amber-500/20">
                VIP MOD
              </span>
            )}
          </div>

          <p className="text-xs text-zinc-400 truncate mt-0.5">
            {apk.category} • v{apk.version}
          </p>

          <div className="flex items-center gap-3 mt-1.5 text-[11px] text-zinc-400 font-medium">
            <span className="flex items-center gap-1 text-amber-400 font-bold">
              <Star className="w-3 h-3 fill-amber-400" />
              {apk.rating ? apk.rating.toFixed(1) : '4.8'}
            </span>
            <span>•</span>
            <span className="flex items-center gap-1 text-zinc-400">
              <Download className="w-3 h-3 text-zinc-500" />
              {apk.downloadsCount ? `${apk.downloadsCount.toLocaleString()}+` : '1K+'}
            </span>
            <span>•</span>
            <span className="text-zinc-500 text-[10px]">{apk.size || '45 MB'}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      id={`apk-card-grid-${apk.id}`}
      onClick={onClick}
      className="group relative bg-zinc-900/60 hover:bg-zinc-900 border border-zinc-800/80 hover:border-amber-500/50 rounded-2xl p-3.5 cursor-pointer transition-all duration-200 active:scale-[0.98] shadow-lg shadow-black/30 flex flex-col justify-between"
    >
      <div>
        {/* Top badge bar */}
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-[10px] uppercase tracking-wider font-extrabold text-zinc-500 bg-zinc-800/80 px-2 py-0.5 rounded-full">
            {apk.category}
          </span>
          {apk.isFeatured && (
            <span className="bg-gradient-to-r from-amber-500 to-amber-300 text-zinc-950 text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-0.5 shadow-sm">
              <Sparkles className="w-2.5 h-2.5 fill-zinc-950" /> VIP
            </span>
          )}
        </div>

        {/* Icon & Details */}
        <div className="flex items-start gap-3">
          <div className="relative w-14 h-14 shrink-0 rounded-2xl overflow-hidden bg-zinc-800 border border-zinc-700/60 shadow-md">
            {apk.icon ? (
              <img src={apk.icon} alt={apk.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-amber-500/20 to-zinc-900 text-amber-400 font-bold text-base">
                {apk.name.substring(0, 2).toUpperCase()}
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold text-zinc-100 group-hover:text-amber-400 transition line-clamp-1">
              {apk.name}
            </h3>
            <p className="text-[11px] text-zinc-400 line-clamp-1 mt-0.5">
              {apk.shortDescription || apk.description || 'Premium Mod Unlocked'}
            </p>
            <p className="text-[10px] text-zinc-500 mt-0.5">
              v{apk.version} • Req: Android {apk.androidVersion || '7.0+'}
            </p>
          </div>
        </div>
      </div>

      {/* Footer statistics bar */}
      <div className="mt-3 pt-2.5 border-t border-zinc-800/60 flex items-center justify-between text-xs">
        <div className="flex items-center gap-1 text-amber-400 font-extrabold text-[11px]">
          <Star className="w-3.5 h-3.5 fill-amber-400" />
          <span>{apk.rating ? apk.rating.toFixed(1) : '4.8'}</span>
        </div>

        <div className="text-[11px] text-zinc-400 flex items-center gap-1 font-medium">
          <Download className="w-3 h-3 text-zinc-500" />
          <span>{apk.downloadsCount ? `${apk.downloadsCount.toLocaleString()}` : '1,200+'}</span>
        </div>

        {apk.isFree ? (
          <span className="text-[11px] font-black text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
            FREE
          </span>
        ) : (
          <span className="text-[11px] font-black text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
            VIP MOD
          </span>
        )}
      </div>
    </div>
  );
};
