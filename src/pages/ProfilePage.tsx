import React, { useState, useEffect } from 'react';
import { 
  User, Mail, ShieldAlert, LogOut, AppWindow, ShoppingBag, 
  Sparkles, CheckCircle2, Clock, HelpCircle, ExternalLink 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Order, Purchase, StoreSettings } from '../types';
import { subscribeUserOrders, subscribeUserPurchases, subscribeStoreSettings } from '../services/db';

interface ProfilePageProps {
  onNavigate: (tab: string) => void;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({ onNavigate }) => {
  const { user, userProfile, isAdmin, signInWithGoogle, signInWithDevAccount, signOutUser } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [storeSettings, setStoreSettings] = useState<StoreSettings | null>(null);
  const [emailInput, setEmailInput] = useState('');
  const [showEmailForm, setShowEmailForm] = useState(false);

  useEffect(() => {
    if (!user) return;
    const unsubOrders = subscribeUserOrders(user.uid, setOrders);
    const unsubPurchases = subscribeUserPurchases(user.uid, setPurchases);
    const unsubSettings = subscribeStoreSettings(setStoreSettings);

    return () => {
      unsubOrders();
      unsubPurchases();
      unsubSettings();
    };
  }, [user]);

  if (!user) {
    return (
      <div className="bg-zinc-900/80 border border-zinc-800 rounded-3xl p-8 text-center space-y-5 max-w-md mx-auto mt-8 shadow-2xl relative overflow-hidden">
        <div className="w-16 h-16 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center mx-auto shadow-inner">
          <User className="w-8 h-8" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-white">Sign In to Your Account</h2>
          <p className="text-xs text-zinc-400 mt-1">
            Sign in using Google or your Email to manage purchases, subscriptions, and access download links.
          </p>
        </div>

        <div className="space-y-3 pt-2">
          <button
            id="btn-profile-signin-google"
            onClick={signInWithGoogle}
            className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-zinc-950 font-black text-xs py-3.5 rounded-2xl shadow-lg transition"
          >
            Sign In with Google
          </button>

          <div className="relative my-3 flex items-center justify-center">
            <div className="border-t border-zinc-800 w-full" />
            <span className="bg-zinc-900 px-3 text-[10px] text-zinc-500 uppercase font-bold absolute">OR</span>
          </div>

          <button
            id="btn-profile-quick-admin-login"
            onClick={() => signInWithDevAccount('akashbehera599@gmail.com', 'Akash Behera (Admin)')}
            className="w-full bg-zinc-800 hover:bg-zinc-700 text-amber-400 font-bold text-xs py-3 rounded-2xl border border-amber-500/20 transition flex items-center justify-center gap-2"
          >
            <Sparkles className="w-4 h-4 text-amber-400" /> Quick Sign In as Admin (akashbehera599@gmail.com)
          </button>

          {!showEmailForm ? (
            <button
              id="btn-profile-toggle-email-login"
              onClick={() => setShowEmailForm(true)}
              className="text-xs text-zinc-400 hover:text-zinc-200 transition font-medium"
            >
              Sign in with custom email address →
            </button>
          ) : (
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                if (emailInput.trim()) signInWithDevAccount(emailInput.trim());
              }}
              className="flex gap-2 pt-1"
            >
              <input
                type="email"
                placeholder="Enter email address..."
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                required
                className="flex-1 bg-zinc-950 text-white text-xs px-3.5 py-2.5 rounded-xl border border-zinc-700 outline-none focus:border-amber-500"
              />
              <button
                type="submit"
                className="bg-amber-500 text-zinc-950 font-bold text-xs px-4 py-2.5 rounded-xl hover:bg-amber-400 transition"
              >
                Sign In
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  const activePurchasesCount = purchases.filter(p => p.status === 'ACTIVE').length;

  return (
    <div className="space-y-6 pb-24 max-w-2xl mx-auto">
      {/* Profile Header */}
      <div className="bg-zinc-900/80 border border-zinc-800 rounded-3xl p-6 shadow-xl relative overflow-hidden">
        <div className="flex items-center gap-4">
          {user.photoURL ? (
            <img src={user.photoURL} alt={user.displayName || 'User'} className="w-16 h-16 rounded-2xl object-cover border-2 border-amber-500/40 shrink-0 shadow-md" />
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-amber-500/20 text-amber-400 border-2 border-amber-500/40 flex items-center justify-center font-extrabold text-2xl shrink-0">
              {(user.displayName || user.email || 'U')[0].toUpperCase()}
            </div>
          )}

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-white truncate">{user.displayName || 'Customer'}</h1>
              {isAdmin && (
                <span className="bg-amber-500/10 text-amber-400 border border-amber-500/30 text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1">
                  <ShieldAlert className="w-3 h-3" /> ADMIN
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-400 truncate flex items-center gap-1 mt-0.5">
              <Mail className="w-3.5 h-3.5 text-zinc-500" /> {user.email}
            </p>
          </div>
        </div>

        {/* User Quick Stats */}
        <div className="grid grid-cols-2 gap-3 mt-5 pt-4 border-t border-zinc-800">
          <div className="bg-zinc-950/60 p-3 rounded-2xl border border-zinc-800 text-center">
            <p className="text-[10px] text-zinc-500 uppercase font-bold">Active Subscriptions</p>
            <p className="text-base font-black text-amber-400 mt-0.5">{activePurchasesCount}</p>
          </div>
          <div className="bg-zinc-950/60 p-3 rounded-2xl border border-zinc-800 text-center">
            <p className="text-[10px] text-zinc-500 uppercase font-bold">Total Orders</p>
            <p className="text-base font-black text-white mt-0.5">{orders.length}</p>
          </div>
        </div>
      </div>

      {/* Admin Panel Quick Banner if Admin */}
      {isAdmin && (
        <div className="bg-gradient-to-r from-amber-500/10 to-amber-600/10 border border-amber-500/30 rounded-3xl p-5 flex items-center justify-between gap-4 shadow-lg">
          <div>
            <div className="flex items-center gap-1.5 font-bold text-amber-400 text-xs">
              <ShieldAlert className="w-4 h-4" /> Admin Controls Authorized
            </div>
            <p className="text-[11px] text-zinc-400 mt-0.5">
              Manage APK catalog, approve UTR payments, set prices, and configure coupons.
            </p>
          </div>
          <button
            id="btn-profile-admin-panel"
            onClick={() => onNavigate('admin')}
            className="bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black text-xs px-4 py-2.5 rounded-xl shadow transition shrink-0"
          >
            Open Admin Panel
          </button>
        </div>
      )}

      {/* Profile Actions List */}
      <div className="bg-zinc-900/60 border border-zinc-800 rounded-3xl p-2 space-y-1 shadow-lg">
        <button
          id="btn-profile-my-apps"
          onClick={() => onNavigate('my-apps')}
          className="w-full flex items-center justify-between p-3.5 rounded-2xl hover:bg-zinc-800/80 transition text-left"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/10 text-amber-400 rounded-xl">
              <AppWindow className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-white">My Purchased Apps</p>
              <p className="text-[10px] text-zinc-400">View downloads & license expiration</p>
            </div>
          </div>
          <span className="text-xs text-amber-400 font-bold">{activePurchasesCount} Active</span>
        </button>

        {storeSettings?.telegramLink && (
          <a
            id="link-profile-telegram-support"
            href={storeSettings.telegramLink}
            target="_blank"
            rel="noreferrer"
            className="w-full flex items-center justify-between p-3.5 rounded-2xl hover:bg-zinc-800/80 transition text-left"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 text-blue-400 rounded-xl">
                <HelpCircle className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-white">Telegram Customer Support</p>
                <p className="text-[10px] text-zinc-400">Contact admin for quick help</p>
              </div>
            </div>
            <ExternalLink className="w-4 h-4 text-zinc-500" />
          </a>
        )}
      </div>

      {/* Recent Orders History Table */}
      {orders.length > 0 && (
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-3xl p-5 space-y-3 shadow-lg">
          <h2 className="text-xs font-extrabold text-white uppercase tracking-wider">Payment Order History</h2>
          <div className="space-y-2">
            {orders.slice(0, 5).map((order) => (
              <div key={order.id} className="bg-zinc-950/80 p-3 rounded-2xl border border-zinc-800/80 flex items-center justify-between text-xs">
                <div>
                  <p className="font-bold text-zinc-200">{order.apkName}</p>
                  <p className="text-[10px] text-zinc-500">
                    {new Date(order.createdAt).toLocaleDateString()} • ₹{order.finalPrice}
                  </p>
                </div>
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${
                  order.status === 'APPROVED' || order.status === 'COUPON_FREE'
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    : order.status === 'PENDING'
                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                    : 'bg-red-500/10 text-red-400 border-red-500/20'
                }`}>
                  {order.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sign Out Button */}
      <button
        id="btn-profile-signout"
        onClick={signOutUser}
        className="w-full bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 font-bold text-xs py-3.5 rounded-2xl transition flex items-center justify-center gap-2"
      >
        <LogOut className="w-4 h-4" /> Sign Out
      </button>
    </div>
  );
};
