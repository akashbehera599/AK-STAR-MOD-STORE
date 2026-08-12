import React from 'react';
import { Star, Download, Sparkles, ArrowRight } from 'lucide-react';
import { ApkItem } from '../types';

interface ApkCardProps {
  apk: ApkItem;
  onClick: () => void;
  layout?: 'grid' | 'horizontal' | 'carousel';
}

export const ApkCard: React.FC<ApkCardProps> = ({ apk, onClick, layout = 'grid' }) => {
  // Horizontal List Item (Compact)
  if (layout === 'horizontal') {
    return (
      <div 
        id={`apk-card-horizontal-${apk.id}`}
        onClick={onClick}
        className="group flex items-center gap-3 bg-zinc-900/70 hover:bg-zinc-900 border border-zinc-800/90 hover:border-amber-500/50 rounded-2xl p-2.5 sm:p-3 cursor-pointer transition-all active:scale-[0.98] shadow-md hover:shadow-xl shrink-0 w-full"
      >
        <div className="relative w-14 h-14 sm:w-16 sm:h-16 shrink-0 rounded-2xl overflow-hidden bg-zinc-800 border border-zinc-700/60 shadow">
          {apk.icon && apk.icon.trim() !== '' ? (
            <img src={apk.icon} alt={apk.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-amber-500/20 to-zinc-900 text-amber-400 font-extrabold text-base">
              {apk.name.substring(0, 2).toUpperCase()}
            </div>
          )}
          {apk.isFeatured && (
            <div className="absolute top-0 right-0 bg-amber-500 text-zinc-950 p-0.5 rounded-bl-lg">
              <Sparkles className="w-2.5 h-2.5 fill-zinc-950" />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0 space-y-0.5">
          <div className="flex items-center gap-1.5 justify-between">
            <h3 className="text-xs sm:text-sm font-black text-zinc-100 truncate group-hover:text-amber-400 transition">
              {apk.name}
            </h3>
            {apk.isFree ? (
              <span className="bg-emerald-500/10 text-emerald-400 text-[9px] font-black px-2 py-0.5 rounded-full border border-emerald-500/20 shrink-0">
                FREE
              </span>
            ) : (
              <span className="bg-amber-500/10 text-amber-400 text-[9px] font-black px-2 py-0.5 rounded-full border border-amber-500/20 shrink-0">
                VIP
              </span>
            )}
          </div>

          <p className="text-[11px] text-zinc-400 truncate">
            {apk.category} • v{apk.version}
          </p>

          <div className="flex items-center gap-2 pt-0.5 text-[10px] text-zinc-400 font-semibold">
            {apk.rating && apk.rating > 0 ? (
              <span className="flex items-center gap-0.5 text-amber-400 font-black">
                <Star className="w-3 h-3 fill-amber-400" />
                {apk.rating.toFixed(1)}
              </span>
            ) : null}
            {apk.size && (
              <span className="text-zinc-500 font-mono">{apk.size}</span>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Carousel Card (Fixed width for horizontal swiping)
  if (layout === 'carousel') {
    return (
      <div 
        id={`apk-card-carousel-${apk.id}`}
        onClick={onClick}
        className="group relative bg-zinc-900/80 hover:bg-zinc-900 border border-zinc-800/90 hover:border-amber-500/50 rounded-2xl p-3 cursor-pointer transition-all active:scale-[0.97] shadow-lg flex flex-col justify-between w-32 sm:w-36 shrink-0 snap-start"
      >
        <div className="space-y-2">
          <div className="relative w-full aspect-square rounded-2xl overflow-hidden bg-zinc-800 border border-zinc-700/60 shadow">
            {apk.icon && apk.icon.trim() !== '' ? (
              <img src={apk.icon} alt={apk.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-amber-500/20 to-zinc-900 text-amber-400 font-extrabold text-xl">
                {apk.name.substring(0, 2).toUpperCase()}
              </div>
            )}
            {apk.isFeatured && (
              <span className="absolute top-1.5 right-1.5 bg-amber-500 text-zinc-950 p-1 rounded-full shadow">
                <Sparkles className="w-2.5 h-2.5 fill-zinc-950" />
              </span>
            )}
          </div>

          <div>
            <h3 className="text-xs font-black text-zinc-100 truncate group-hover:text-amber-400 transition">
              {apk.name}
            </h3>
            <p className="text-[10px] text-zinc-400 truncate mt-0.5">
              {apk.category}
            </p>
          </div>
        </div>

        <div className="mt-2 pt-2 border-t border-zinc-800/80 flex items-center justify-between">
          {apk.rating && apk.rating > 0 ? (
            <span className="text-[10px] font-black text-amber-400 flex items-center gap-0.5">
              <Star className="w-3 h-3 fill-amber-400" />
              {apk.rating.toFixed(1)}
            </span>
          ) : (
            <span className="text-[10px] text-zinc-500 font-semibold">{apk.size || 'APK'}</span>
          )}

          {apk.isFree ? (
            <span className="text-[9px] font-black text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20">
              FREE
            </span>
          ) : (
            <span className="text-[9px] font-black text-amber-400 bg-amber-500/10 px-1.5 py-0.2 rounded border border-amber-500/20">
              VIP
            </span>
          )}
        </div>
      </div>
    );
  }

  // Standard Grid Card
  return (
    <div 
      id={`apk-card-grid-${apk.id}`}
      onClick={onClick}
      className="group relative bg-zinc-900/70 hover:bg-zinc-900 border border-zinc-800/90 hover:border-amber-500/50 rounded-2xl p-3.5 cursor-pointer transition-all active:scale-[0.98] shadow-lg flex flex-col justify-between"
    >
      <div className="space-y-3">
        {/* Top Header Badge */}
        <div className="flex items-center justify-between">
          <span className="text-[10px] uppercase font-extrabold text-zinc-400 bg-zinc-950 px-2 py-0.5 rounded-md border border-zinc-800">
            {apk.category}
          </span>
          {apk.isFeatured && (
            <span className="bg-amber-500 text-zinc-950 text-[9px] font-black px-2 py-0.5 rounded-full flex items-center gap-0.5 shadow-sm">
              <Sparkles className="w-2.5 h-2.5 fill-zinc-950" /> FEATURED
            </span>
          )}
        </div>

        {/* Icon & Details */}
        <div className="flex items-start gap-3">
          <div className="relative w-14 h-14 shrink-0 rounded-2xl overflow-hidden bg-zinc-800 border border-zinc-700/60 shadow">
            {apk.icon && apk.icon.trim() !== '' ? (
              <img src={apk.icon} alt={apk.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-amber-500/20 to-zinc-900 text-amber-400 font-extrabold text-base">
                {apk.name.substring(0, 2).toUpperCase()}
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="text-xs sm:text-sm font-black text-zinc-100 group-hover:text-amber-400 transition line-clamp-1">
              {apk.name}
            </h3>
            <p className="text-[11px] text-zinc-400 line-clamp-1 mt-0.5">
              {apk.shortDescription || apk.description || 'Premium Mod Unlocked'}
            </p>
            <p className="text-[10px] text-zinc-500 mt-0.5 font-medium">
              v{apk.version} {apk.size ? `• ${apk.size}` : ''}
            </p>
          </div>
        </div>
      </div>

      {/* Footer bar */}
      <div className="mt-3 pt-2.5 border-t border-zinc-800/80 flex items-center justify-between">
        {apk.rating && apk.rating > 0 ? (
          <div className="flex items-center gap-1 text-amber-400 font-extrabold text-[11px]">
            <Star className="w-3.5 h-3.5 fill-amber-400" />
            <span>{apk.rating.toFixed(1)}</span>
          </div>
        ) : (
          <span className="text-[10px] text-zinc-500 font-mono">v{apk.version}</span>
        )}

        {apk.isFree ? (
          <span className="text-[10px] font-black text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
            FREE
          </span>
        ) : (
          <span className="text-[10px] font-black text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
            VIP MOD
          </span>
        )}
      </div>
    </div>
  );
};

