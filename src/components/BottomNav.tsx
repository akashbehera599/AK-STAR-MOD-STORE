import React from 'react';
import { Home, LayoutGrid, Search, AppWindow, User, ShieldAlert } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface BottomNavProps {
  currentTab: string;
  onNavigate: (tab: string, param?: string) => void;
  pendingCount?: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  currentTab,
  onNavigate,
  pendingCount = 0
}) => {
  const { isAdmin } = useAuth();

  const navItems = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'apps', label: 'Apps', icon: LayoutGrid },
    { id: 'search', label: 'Search', icon: Search },
    { id: 'my-apps', label: 'My Apps', icon: AppWindow, badge: pendingCount > 0 ? pendingCount : undefined },
    { id: 'profile', label: 'Profile', icon: User }
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-zinc-950/95 backdrop-blur-xl border-t border-zinc-800/80 px-1 py-1.5 shadow-2xl">
      <div className="flex items-center justify-around max-w-md mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;

          return (
            <button
              key={item.id}
              id={`btn-bottom-nav-${item.id}`}
              onClick={() => onNavigate(item.id)}
              className={`relative flex flex-col items-center justify-center min-w-[56px] py-1 px-1 rounded-2xl transition-all active:scale-95 ${
                isActive 
                  ? 'text-amber-400 font-bold' 
                  : 'text-zinc-500 hover:text-zinc-300 font-medium'
              }`}
            >
              <div className={`relative px-3 py-1 rounded-full transition-colors ${
                isActive ? 'bg-amber-500/10 border border-amber-500/20' : ''
              }`}>
                <Icon className={`w-4 h-4 sm:w-5 sm:h-5 transition-transform ${isActive ? 'stroke-[2.5px] scale-110' : 'stroke-2'}`} />
                {item.badge !== undefined && (
                  <span className="absolute -top-1 -right-1 bg-amber-500 text-zinc-950 text-[9px] font-black px-1.5 py-0.2 rounded-full border border-zinc-950 animate-pulse">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] mt-0.5 tracking-tight font-medium">{item.label}</span>
            </button>
          );
        })}

        {isAdmin && (
          <button
            id="btn-bottom-nav-admin"
            onClick={() => onNavigate('admin')}
            className={`flex flex-col items-center justify-center min-w-[56px] py-1 px-1 rounded-2xl transition-all active:scale-95 ${
              currentTab.startsWith('admin')
                ? 'text-amber-400 font-bold'
                : 'text-amber-500/70 hover:text-amber-400 font-medium'
            }`}
          >
            <div className={`relative px-3 py-1 rounded-full transition-colors ${
              currentTab.startsWith('admin') ? 'bg-amber-500/10 border border-amber-500/20' : ''
            }`}>
              <ShieldAlert className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5px]" />
            </div>
            <span className="text-[10px] mt-0.5 tracking-tight font-medium">Admin</span>
          </button>
        )}
      </div>
    </nav>
  );
};

