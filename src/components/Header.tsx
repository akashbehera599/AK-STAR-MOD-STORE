import React from 'react';
import { Search, ShieldAlert, Sparkles, User as UserIcon, Grid, Home, AppWindow, LayoutGrid } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface HeaderProps {
  currentTab: string;
  onNavigate: (tab: string, param?: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onSearchSubmit: (e: React.FormEvent) => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onNavigate,
  searchQuery,
  setSearchQuery,
  onSearchSubmit
}) => {
  const { user, isAdmin, signInWithGoogle } = useAuth();

  return (
    <header className="sticky top-0 z-40 bg-zinc-950/95 backdrop-blur-md border-b border-zinc-800/80 px-3 sm:px-6 py-2.5 transition-all">
      <div className="max-w-7xl mx-auto space-y-2">
        {/* Top Header Row: Brand Logo + Desktop Nav + Profile Button */}
        <div className="flex items-center justify-between gap-3">
          {/* Brand Logo */}
          <button 
            id="btn-header-brand-logo"
            onClick={() => onNavigate('home')}
            className="flex items-center gap-2.5 group text-left focus:outline-none shrink-0"
          >
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 p-0.5 shadow-md shadow-amber-500/20 group-hover:scale-105 transition-transform">
              <div className="w-full h-full bg-zinc-950 rounded-[14px] flex items-center justify-center">
                <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-black text-base sm:text-lg tracking-tight text-white leading-none">AK STAR</span>
                <span className="bg-amber-500/10 text-amber-400 border border-amber-500/30 font-extrabold text-[10px] px-1.5 py-0.2 rounded-md tracking-wider">
                  MOD STORE
                </span>
              </div>
              <p className="text-[9px] text-zinc-400 font-semibold tracking-tight">ANDROID MARKETPLACE</p>
            </div>
          </button>

          {/* Desktop Search Bar (Centered) */}
          <div className="hidden md:flex flex-1 max-w-lg mx-6">
            <form onSubmit={onSearchSubmit} className="relative w-full">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-400" />
              <input
                id="input-header-desktop-search"
                type="text"
                placeholder="Search apps & games"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => {
                  if (currentTab !== 'search') onNavigate('search');
                }}
                className="w-full bg-zinc-900 border border-zinc-800 focus:border-amber-500/60 rounded-full pl-10 pr-4 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-amber-500/50 transition shadow-inner"
              />
            </form>
          </div>

          {/* Desktop Nav Items */}
          <div className="hidden md:flex items-center gap-5 text-xs font-semibold">
            <button 
              id="nav-desktop-home"
              onClick={() => onNavigate('home')} 
              className={`flex items-center gap-1.5 transition ${currentTab === 'home' ? 'text-amber-400 font-extrabold' : 'text-zinc-400 hover:text-zinc-200'}`}
            >
              <Home className="w-4 h-4" /> Home
            </button>
            <button 
              id="nav-desktop-apps"
              onClick={() => onNavigate('apps')} 
              className={`flex items-center gap-1.5 transition ${currentTab === 'apps' ? 'text-amber-400 font-extrabold' : 'text-zinc-400 hover:text-zinc-200'}`}
            >
              <LayoutGrid className="w-4 h-4" /> Apps
            </button>
            <button 
              id="nav-desktop-categories"
              onClick={() => onNavigate('categories')} 
              className={`flex items-center gap-1.5 transition ${currentTab === 'categories' ? 'text-amber-400 font-extrabold' : 'text-zinc-400 hover:text-zinc-200'}`}
            >
              <Grid className="w-4 h-4" /> Categories
            </button>
            <button 
              id="nav-desktop-my-apps"
              onClick={() => onNavigate('my-apps')} 
              className={`flex items-center gap-1.5 transition ${currentTab === 'my-apps' ? 'text-amber-400 font-extrabold' : 'text-zinc-400 hover:text-zinc-200'}`}
            >
              <AppWindow className="w-4 h-4" /> My Apps
            </button>

            {isAdmin && (
              <button 
                id="nav-desktop-admin"
                onClick={() => onNavigate('admin')}
                className="flex items-center gap-1.5 bg-amber-500/10 text-amber-400 border border-amber-500/30 px-3 py-1.5 rounded-full hover:bg-amber-500/20 transition text-xs font-extrabold"
              >
                <ShieldAlert className="w-3.5 h-3.5 text-amber-400" /> ADMIN
              </button>
            )}
          </div>

          {/* Auth Button / Profile Header CTA */}
          <div className="flex items-center gap-2">
            {user ? (
              <button
                id="btn-header-profile"
                onClick={() => onNavigate('profile')}
                className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 hover:border-amber-500/40 p-1.5 pr-3 rounded-full transition active:scale-95 shadow-sm"
              >
                {user.photoURL && user.photoURL.trim() !== '' ? (
                  <img src={user.photoURL} alt={user.displayName || 'User'} className="w-7 h-7 rounded-full object-cover border border-amber-500/30" />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center font-black text-xs border border-amber-500/30">
                    {(user.displayName || user.email || 'U')[0].toUpperCase()}
                  </div>
                )}
                <span className="text-xs font-bold text-zinc-200 max-w-[100px] truncate hidden sm:inline">
                  {user.displayName || 'Account'}
                </span>
              </button>
            ) : (
              <button
                id="btn-header-signin"
                onClick={signInWithGoogle}
                className="flex items-center gap-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-zinc-950 font-black text-xs px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-full shadow-md shadow-amber-500/10 transition active:scale-95"
              >
                <UserIcon className="w-3.5 h-3.5" /> Sign In
              </button>
            )}
          </div>
        </div>

        {/* Mobile Search Bar Row */}
        <div className="block md:hidden">
          <button
            id="btn-header-mobile-search-trigger"
            onClick={() => onNavigate('search')}
            className="w-full bg-zinc-900 border border-zinc-800/90 hover:border-amber-500/40 rounded-2xl px-3.5 py-2 flex items-center gap-2.5 text-xs text-zinc-400 shadow-sm transition active:scale-[0.99] text-left"
          >
            <Search className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="truncate text-zinc-400 font-medium">
              {searchQuery.trim() ? searchQuery : 'Search apps & games'}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
};

