import React from 'react';

export const SkeletonLoader: React.FC<{ count?: number }> = ({ count = 6 }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-zinc-900/40 border border-zinc-800/50 rounded-2xl p-4 animate-pulse">
          <div className="flex items-center justify-between mb-3">
            <div className="w-16 h-4 bg-zinc-800 rounded-full" />
            <div className="w-10 h-4 bg-zinc-800 rounded-full" />
          </div>
          <div className="flex items-start gap-3">
            <div className="w-14 h-14 bg-zinc-800 rounded-2xl shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="w-3/4 h-4 bg-zinc-800 rounded" />
              <div className="w-1/2 h-3 bg-zinc-800/60 rounded" />
              <div className="w-1/3 h-2.5 bg-zinc-800/40 rounded" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-zinc-800/40 flex justify-between">
            <div className="w-12 h-3 bg-zinc-800 rounded" />
            <div className="w-12 h-3 bg-zinc-800 rounded" />
            <div className="w-12 h-3 bg-zinc-800 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
};
