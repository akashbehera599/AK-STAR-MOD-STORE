import React, { useState, useEffect } from 'react';
import { 
  AppWindow, Download, Clock, CheckCircle2, AlertCircle, 
  XCircle, ExternalLink, ShieldCheck, Sparkles 
} from 'lucide-react';
import { Order, Purchase } from '../types';
import { useAuth } from '../context/AuthContext';
import { subscribeUserOrders, subscribeUserPurchases, getApkBySlugOrId } from '../services/db';

interface MyAppsPageProps {
  onSelectApk: (apkId: string) => void;
  onNavigateHome: () => void;
}

export const MyAppsPage: React.FC<MyAppsPageProps> = ({ onSelectApk, onNavigateHome }) => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'pending' | 'expired'>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubOrders = subscribeUserOrders(user.uid, (data) => {
      setOrders(data);
    });

    const unsubPurchases = subscribeUserPurchases(user.uid, (data) => {
      setPurchases(data);
      setLoading(false);
    });

    return () => {
      unsubOrders();
      unsubPurchases();
    };
  }, [user]);

  if (!user) {
    return (
      <div className="bg-zinc-900/60 border border-zinc-800 rounded-3xl p-10 text-center space-y-4 max-w-lg mx-auto mt-8">
        <div className="w-16 h-16 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center mx-auto">
          <AppWindow className="w-8 h-8" />
        </div>
        <h2 className="text-lg font-bold text-white">Sign In to View Your Purchased Apps</h2>
        <p className="text-xs text-zinc-400">
          Please sign in with Google to access your purchased APK downloads and subscription history.
        </p>
      </div>
    );
  }

  // Combined list for display
  const activePurchases = purchases.filter(p => p.status === 'ACTIVE');
  const expiredPurchases = purchases.filter(p => p.status === 'EXPIRED');
  const pendingOrders = orders.filter(o => o.status === 'PENDING');

  const handleDownloadClick = async (p: Purchase) => {
    if (p.downloadUrl) {
      window.open(p.downloadUrl, '_blank');
    } else {
      // Fetch fresh APK downloadUrl
      const apk = await getApkBySlugOrId(p.apkId);
      if (apk && apk.downloadUrl) {
        window.open(apk.downloadUrl, '_blank');
      } else {
        alert('Download link is currently being updated. Please check back shortly or contact support.');
      }
    }
  };

  return (
    <div className="space-y-6 pb-24">
      <div>
        <h1 className="text-xl font-black text-white flex items-center gap-2">
          <AppWindow className="w-6 h-6 text-amber-400" /> My Apps & Subscriptions
        </h1>
        <p className="text-xs text-zinc-400 mt-1">
          Access your active APK downloads and view order verification status.
        </p>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 bg-zinc-900 p-1.5 rounded-2xl border border-zinc-800 overflow-x-auto scrollbar-none">
        <button
          id="tab-myapps-all"
          onClick={() => setActiveTab('all')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
            activeTab === 'all' ? 'bg-amber-500 text-zinc-950' : 'text-zinc-400 hover:text-white'
          }`}
        >
          All ({purchases.length + pendingOrders.length})
        </button>
        <button
          id="tab-myapps-active"
          onClick={() => setActiveTab('active')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
            activeTab === 'active' ? 'bg-amber-500 text-zinc-950' : 'text-zinc-400 hover:text-white'
          }`}
        >
          Active ({activePurchases.length})
        </button>
        <button
          id="tab-myapps-pending"
          onClick={() => setActiveTab('pending')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
            activeTab === 'pending' ? 'bg-amber-500 text-zinc-950' : 'text-zinc-400 hover:text-white'
          }`}
        >
          Pending ({pendingOrders.length})
        </button>
        <button
          id="tab-myapps-expired"
          onClick={() => setActiveTab('expired')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
            activeTab === 'expired' ? 'bg-amber-500 text-zinc-950' : 'text-zinc-400 hover:text-white'
          }`}
        >
          Expired ({expiredPurchases.length})
        </button>
      </div>

      {/* Content Section */}
      {loading ? (
        <div className="text-xs text-zinc-500 text-center py-10">Loading your apps...</div>
      ) : (
        <div className="space-y-4">
          {/* Show Pending Orders */}
          {(activeTab === 'all' || activeTab === 'pending') && pendingOrders.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-xs font-extrabold text-amber-400 uppercase tracking-wider">
                Pending Verification Orders ({pendingOrders.length})
              </h2>
              {pendingOrders.map(order => (
                <div key={order.id} className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <img src={order.apkIcon} alt={order.apkName} className="w-12 h-12 rounded-xl object-cover shrink-0 border border-amber-500/30" />
                    <div>
                      <h3 className="text-sm font-bold text-white">{order.apkName}</h3>
                      <p className="text-xs text-zinc-300">{order.planName} • ₹{order.finalPrice}</p>
                      <p className="text-[10px] text-zinc-400 mt-0.5">UTR: {order.utr || 'Pending submission'}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="bg-amber-500/20 text-amber-400 text-xs font-bold px-3 py-1.5 rounded-xl border border-amber-500/30 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 animate-spin" /> PENDING VERIFICATION
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Show Active Purchases */}
          {(activeTab === 'all' || activeTab === 'active') && activePurchases.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-xs font-extrabold text-emerald-400 uppercase tracking-wider">
                Active APK Subscriptions ({activePurchases.length})
              </h2>
              {activePurchases.map(p => {
                const daysLeft = Math.max(0, Math.ceil((new Date(p.expiryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)));

                return (
                  <div key={p.id} className="bg-zinc-900/90 border border-emerald-500/30 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg">
                    <div className="flex items-center gap-3">
                      <img src={p.apkIcon} alt={p.apkName} className="w-12 h-12 rounded-xl object-cover shrink-0 border border-emerald-500/30" />
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-white">{p.apkName}</h3>
                          <span className="bg-emerald-500/10 text-emerald-400 text-[10px] font-black px-2 py-0.5 rounded border border-emerald-500/20">
                            ACTIVE
                          </span>
                        </div>
                        <p className="text-xs text-zinc-400 mt-0.5">
                          Expires in <span className="text-emerald-400 font-bold">{daysLeft} days</span> ({new Date(p.expiryDate).toLocaleDateString()})
                        </p>
                      </div>
                    </div>

                    <button
                      id={`btn-download-apk-${p.id}`}
                      onClick={() => handleDownloadClick(p)}
                      className="bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black text-xs px-5 py-2.5 rounded-xl shadow-lg transition flex items-center justify-center gap-1.5"
                    >
                      <Download className="w-4 h-4" /> DOWNLOAD APK
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Show Expired Purchases */}
          {(activeTab === 'all' || activeTab === 'expired') && expiredPurchases.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-xs font-extrabold text-zinc-500 uppercase tracking-wider">
                Expired Access ({expiredPurchases.length})
              </h2>
              {expiredPurchases.map(p => (
                <div key={p.id} className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 opacity-70">
                  <div className="flex items-center gap-3">
                    <img src={p.apkIcon} alt={p.apkName} className="w-12 h-12 rounded-xl object-cover shrink-0 grayscale" />
                    <div>
                      <h3 className="text-sm font-bold text-zinc-300">{p.apkName}</h3>
                      <p className="text-xs text-red-400 font-medium">
                        Expired on {new Date(p.expiryDate).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <button
                    id={`btn-renew-apk-${p.id}`}
                    onClick={() => onSelectApk(p.apkId)}
                    className="bg-zinc-800 hover:bg-zinc-700 text-amber-400 font-bold text-xs px-4 py-2 rounded-xl transition"
                  >
                    Renew Subscription
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Empty State */}
          {activePurchases.length === 0 && pendingOrders.length === 0 && expiredPurchases.length === 0 && (
            <div className="bg-zinc-900/40 border border-zinc-800 rounded-3xl p-10 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-zinc-800 text-zinc-500 flex items-center justify-center mx-auto">
                <AppWindow className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white">No Apps Found</h3>
              <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                You haven't purchased or requested access for any APKs yet. Explore the marketplace to get started.
              </p>
              <button
                id="btn-myapps-browse"
                onClick={onNavigateHome}
                className="bg-amber-500 text-zinc-950 font-bold text-xs px-5 py-2.5 rounded-xl transition hover:bg-amber-400 shadow"
              >
                Browse APK Marketplace
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
