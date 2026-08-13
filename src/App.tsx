import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { AuthErrorModal } from './components/AuthErrorModal';
import { HomePage } from './pages/HomePage';
import { SearchPage } from './pages/SearchPage';
import { CategoriesPage } from './pages/CategoriesPage';
import { ApkDetailPage } from './pages/ApkDetailPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { MyAppsPage } from './pages/MyAppsPage';
import { ProfilePage } from './pages/ProfilePage';
import { AdminPanel } from './pages/AdminPanel';
import { ApkItem, Category, PlanItem, StoreSettings } from './types';
import { 
  seedInitialDataIfNeeded, 
  subscribeApks, 
  subscribeCategories, 
  subscribeStoreSettings 
} from './services/db';

export type ThemeMode = 'dark' | 'light' | 'system';

function MainLayout() {
  const { user } = useAuth();
  const [currentTab, setCurrentTab] = useState<string>('home');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    try {
      return (localStorage.getItem('akstar_theme') as ThemeMode) || 'dark';
    } catch {
      return 'dark';
    }
  });

  // Selected state
  const [selectedApk, setSelectedApk] = useState<ApkItem | null>(null);
  const [selectedCategorySlug, setSelectedCategorySlug] = useState<string>('all');
  const [selectedPlanForCheckout, setSelectedPlanForCheckout] = useState<PlanItem | null>(null);
  const [appliedCouponCode, setAppliedCouponCode] = useState<string>('');
  const [appliedDiscountAmount, setAppliedDiscountAmount] = useState<number>(0);

  // Firestore Real-time States
  const [apks, setApks] = useState<ApkItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [storeSettings, setStoreSettings] = useState<StoreSettings | null>(null);
  const [loadingApks, setLoadingApks] = useState<boolean>(true);

  // Theme Sync Effect
  useEffect(() => {
    const root = document.documentElement;
    if (themeMode === 'light') {
      root.classList.add('light-mode');
      root.classList.remove('dark');
    } else if (themeMode === 'dark') {
      root.classList.remove('light-mode');
      root.classList.add('dark');
    } else {
      // System mode
      const isSystemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (isSystemDark) {
        root.classList.remove('light-mode');
        root.classList.add('dark');
      } else {
        root.classList.add('light-mode');
        root.classList.remove('dark');
      }
    }
    try {
      localStorage.setItem('akstar_theme', themeMode);
    } catch (e) {
      console.error(e);
    }
  }, [themeMode]);

  useEffect(() => {
    // Seed initial categories/settings if empty
    seedInitialDataIfNeeded();

    const unsubApks = subscribeApks((data) => {
      setApks(data);
      setLoadingApks(false);
    });

    const unsubCat = subscribeCategories((data) => {
      setCategories(data);
    });

    const unsubSettings = subscribeStoreSettings((data) => {
      setStoreSettings(data);
    });

    return () => {
      unsubApks();
      unsubCat();
      unsubSettings();
    };
  }, []);

  useEffect(() => {
    if (selectedApk && apks.length > 0) {
      const updated = apks.find(a => a.id === selectedApk.id);
      if (updated) {
        setSelectedApk(updated);
      }
    }
  }, [apks]);

  const handleNavigate = (tab: string, param?: string) => {
    setCurrentTab(tab);
    if (tab === 'categories' && param) {
      setSelectedCategorySlug(param);
    } else if (tab === 'search') {
      if (param) setSearchQuery(param);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setCurrentTab('search');
    }
  };

  const handleSelectApk = (apk: ApkItem) => {
    setSelectedApk(apk);
    setCurrentTab('apk-detail');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleProceedToCheckout = (plan: PlanItem, couponCode?: string, discountAmount?: number) => {
    setSelectedPlanForCheckout(plan);
    setAppliedCouponCode(couponCode || '');
    setAppliedDiscountAmount(discountAmount || 0);
    setCurrentTab('checkout');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCheckoutSuccess = (orderId: string) => {
    setCurrentTab('my-apps');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-amber-500 selection:text-zinc-950 flex flex-col transition-colors duration-200">
      {/* Maintenance Mode Banner */}
      {storeSettings?.maintenanceMode && (
        <div className="bg-amber-500 text-zinc-950 text-xs font-black py-1.5 px-4 text-center">
          ⚠️ STORE MAINTENANCE MODE ENABLED BY ADMIN
        </div>
      )}

      {/* Announcement Banner */}
      {storeSettings?.announcementBanner && !storeSettings.maintenanceMode && (
        <div className="bg-zinc-900 border-b border-amber-500/20 text-amber-400 text-[11px] font-bold py-1 px-4 text-center truncate">
          ✨ {storeSettings.announcementBanner}
        </div>
      )}

      {/* Main Play Store Header */}
      <Header
        currentTab={currentTab}
        onNavigate={handleNavigate}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onSearchSubmit={handleSearchSubmit}
      />

      {/* Main Application Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 pt-3 pb-24">
        {(currentTab === 'home' || currentTab === 'apps') && (
          <HomePage
            apks={apks}
            categories={categories}
            loading={loadingApks}
            viewMode={currentTab === 'apps' ? 'apps' : 'home'}
            onSelectApk={handleSelectApk}
            onSelectCategory={(slug) => handleNavigate('categories', slug)}
            onNavigate={handleNavigate}
          />
        )}

        {currentTab === 'search' && (
          <SearchPage
            apks={apks}
            initialQuery={searchQuery}
            onSelectApk={handleSelectApk}
            onNavigate={handleNavigate}
          />
        )}

        {currentTab === 'categories' && (
          <CategoriesPage
            categories={categories}
            apks={apks}
            selectedCategorySlug={selectedCategorySlug}
            onSelectApk={handleSelectApk}
          />
        )}

        {currentTab === 'apk-detail' && selectedApk && (
          <ApkDetailPage
            apk={selectedApk}
            onBack={() => setCurrentTab('home')}
            onProceedToCheckout={handleProceedToCheckout}
          />
        )}

        {currentTab === 'checkout' && selectedApk && selectedPlanForCheckout && (
          <CheckoutPage
            apk={selectedApk}
            plan={selectedPlanForCheckout}
            couponCode={appliedCouponCode}
            discountAmount={appliedDiscountAmount}
            onBack={() => setCurrentTab('apk-detail')}
            onSuccess={handleCheckoutSuccess}
          />
        )}

        {currentTab === 'my-apps' && (
          <MyAppsPage
            onSelectApk={(apkId) => {
              const apk = apks.find(a => a.id === apkId);
              if (apk) handleSelectApk(apk);
              else setCurrentTab('home');
            }}
            onNavigateHome={() => setCurrentTab('home')}
          />
        )}

        {currentTab === 'profile' && (
          <ProfilePage
            onNavigate={handleNavigate}
            themeMode={themeMode}
            setThemeMode={setThemeMode}
          />
        )}

        {currentTab === 'admin' && (
          <AdminPanel onNavigateHome={() => setCurrentTab('home')} />
        )}
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <BottomNav currentTab={currentTab} onNavigate={handleNavigate} />

      {/* Auth Error / Domain Guidance Modal */}
      <AuthErrorModal />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainLayout />
    </AuthProvider>
  );
}

