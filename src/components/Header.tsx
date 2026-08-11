import React from 'react';
import { Search, ShieldAlert, Sparkles, User as UserIcon, LogOut, AppWindow, Grid, Home } from 'lucide-react';
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
  const { user, userProfile, isAdmin, signInWithGoogle, signOutUser } = useAuth();

  return (
    <header className="sticky top-0 z-40 bg-zinc-950/90 backdrop-blur-md border-b border-amber-500/20 px-4 py-3 transition-all">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Brand Logo */}
        <button 
          id="btn-header-brand-logo"
          onClick={() => onNavigate('home')}
          className="flex items-center gap-2 group text-left focus:outline-none"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 p-0.5 shadow-lg shadow-amber-500/20 group-hover:scale-105 transition-transform">
            <div className="w-full h-full bg-zinc-950 rounded-[10px] flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-amber-400 animate-pulse" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1">
              <span className="font-extrabold text-lg tracking-wider text-white">AK STAR</span>
              <span className="bg-gradient-to-r from-amber-400 to-amber-200 bg-clip-text text-transparent font-black text-xs px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">MOD</span>
            </div>
            <p className="text-[10px] text-zinc-400 font-medium tracking-tight">PREMIUM APK MARKET</p>
          </div>
        </button>

        {/* Desktop Search Bar */}
        <div className="hidden md:flex flex-1 max-w-md mx-4">
          <form onSubmit={onSearchSubmit} className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              id="input-header-desktop-search"
              type="text"
              placeholder="Search premium apps, games, mods..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-900/80 border border-zinc-800 focus:border-amber-500/50 rounded-full pl-9 pr-4 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-amber-500/50 transition"
            />
          </form>
        </div>

        {/* Desktop Nav Items */}
        <div className="hidden md:flex items-center gap-6 text-sm font-medium">
          <button 
            id="nav-desktop-home"
            onClick={() => onNavigate('home')} 
            className={`flex items-center gap-1.5 transition ${currentTab === 'home' ? 'text-amber-400 font-semibold' : 'text-zinc-400 hover:text-zinc-200'}`}
          >
            <Home className="w-4 h-4" /> Home
          </button>
          <button 
            id="nav-desktop-categories"
            onClick={() => onNavigate('categories')} 
            className={`flex items-center gap-1.5 transition ${currentTab === 'categories' ? 'text-amber-400 font-semibold' : 'text-zinc-400 hover:text-zinc-200'}`}
          >
            <Grid className="w-4 h-4" /> Categories
          </button>
          <button 
            id="nav-desktop-my-apps"
            onClick={() => onNavigate('my-apps')} 
            className={`flex items-center gap-1.5 transition ${currentTab === 'my-apps' ? 'text-amber-400 font-semibold' : 'text-zinc-400 hover:text-zinc-200'}`}
          >
            <AppWindow className="w-4 h-4" /> My Apps
          </button>

          {isAdmin && (
            <button 
              id="nav-desktop-admin"
              onClick={() => onNavigate('admin')}
              className="flex items-center gap-1.5 bg-amber-500/10 text-amber-400 border border-amber-500/30 px-3 py-1.5 rounded-full hover:bg-amber-500/20 transition text-xs font-bold"
            >
              <ShieldAlert className="w-3.5 h-3.5 text-amber-400" /> ADMIN PANEL
            </button>
          )}
        </div>

        {/* Auth Button / Profile */}
        <div className="flex items-center gap-3">
          {user ? (
            <button
              id="btn-header-profile"
              onClick={() => onNavigate('profile')}
              className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 hover:border-amber-500/40 p-1.5 pr-3 rounded-full transition"
            >
              {user.photoURL ? (
                <img src={user.photoURL} alt={user.displayName || 'User'} className="w-7 h-7 rounded-full object-cover" />
              ) : (
                <div className="w-7 h-7 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-xs">
                  {(user.displayName || user.email || 'U')[0].toUpperCase()}
                </div>
              )}
              <span className="text-xs font-semibold text-zinc-200 max-w-[100px] truncate hidden sm:inline">
                {user.displayName || 'My Account'}
              </span>
            </button>
          ) : (
            <button
              id="btn-header-signin"
              onClick={signInWithGoogle}
              className="flex items-center gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-zinc-950 font-bold text-xs px-4 py-2 rounded-full shadow-md shadow-amber-500/10 transition active:scale-95"
            >
              <UserIcon className="w-4 h-4" /> Sign In
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
