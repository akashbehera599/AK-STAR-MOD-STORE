import React, { useState, useEffect } from 'react';
import { 
  Star, Download, ShieldCheck, Sparkles, Smartphone, Check, 
  ArrowLeft, Tag, Calendar, Layers, Clock, AlertCircle, Info, Lock
} from 'lucide-react';
import { ApkItem, PlanItem, Purchase } from '../types';
import { useAuth } from '../context/AuthContext';
import { checkApkAccess, getPlansForApk, validateCoupon } from '../services/db';
import { getSignedDownloadUrl, getStoragePublicUrl } from '../services/storage';
import { BUCKETS } from '../lib/supabase';
import { ReviewSection } from '../components/ReviewSection';

interface ApkDetailPageProps {
  apk: ApkItem;
  onBack: () => void;
  onProceedToCheckout: (plan: PlanItem, couponCode?: string, discountAmount?: number) => void;
}

export const ApkDetailPage: React.FC<ApkDetailPageProps> = ({
  apk,
  onBack,
  onProceedToCheckout
}) => {
  const { user, signInWithGoogle } = useAuth();
  const [plans, setPlans] = useState<PlanItem[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<PlanItem | null>(null);
  const [couponCode, setCouponCode] = useState('');
  const [couponMessage, setCouponMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [userAccess, setUserAccess] = useState<{ hasAccess: boolean; purchase?: Purchase; isFree?: boolean }>({ hasAccess: false });
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [activeImageTab, setActiveImageTab] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      setLoadingPlans(true);
      try {
        const fetchedPlans = await getPlansForApk(apk.id);
        if (isMounted) {
          setPlans(fetchedPlans);
          if (fetchedPlans.length > 0) {
            setSelectedPlan(fetchedPlans[0]);
          }
        }

        const access = await checkApkAccess(user?.uid, apk.id);
        if (isMounted) {
          setUserAccess(access);
        }
      } catch (err) {
        console.error('Error loading apk details:', err);
      } finally {
        if (isMounted) setLoadingPlans(false);
      }
    }

    loadData();
    return () => { isMounted = false; };
  }, [apk.id, user?.uid]);

  const handleApplyCoupon = async () => {
    if (!selectedPlan) return;
    setCouponMessage(null);
    setDiscountAmount(0);

    if (!couponCode.trim()) {
      setCouponMessage({ type: 'error', text: 'Please enter a coupon code.' });
      return;
    }

    const res = await validateCoupon(couponCode, selectedPlan.price, user?.uid);
    if (res.valid && res.discountAmount !== undefined) {
      setDiscountAmount(res.discountAmount);
      setCouponMessage({ type: 'success', text: res.message || 'Coupon applied successfully!' });
    } else {
      setCouponMessage({ type: 'error', text: res.message || 'Invalid coupon code.' });
    }
  };

  const handleBuyClick = async () => {
    if (!user) {
      signInWithGoogle();
      return;
    }

    if (apk.isFree) {
      let freeUrl = apk.downloadUrl || apk.externalDownloadUrl;
      const filePath = apk.apk_file_path || apk.apkFilePath;
      if (!freeUrl && filePath) {
        freeUrl = getStoragePublicUrl(filePath, BUCKETS.APK_FILES);
      }
      if (freeUrl) {
        window.open(freeUrl, '_blank');
      } else {
        alert('Free APK download link is being prepared by admin.');
      }
      return;
    }

    // Verify active entitlement before providing paid download access
    const access = await checkApkAccess(user.uid, apk.id);
    const isAdmin = user.email === 'akashbehera599@gmail.com' || user.email === 'akstarofficial732@gmail.com';

    if (access.hasAccess || isAdmin) {
      let downloadUrl = access.purchase?.downloadUrl || apk.downloadUrl || apk.externalDownloadUrl;
      const filePath = apk.apk_file_path || apk.apkFilePath;

      if (filePath) {
        const signed = await getSignedDownloadUrl(BUCKETS.APK_FILES, filePath, 300);
        if (signed) {
          downloadUrl = signed;
        } else if (!downloadUrl) {
          downloadUrl = getStoragePublicUrl(filePath, BUCKETS.APK_FILES);
        }
      }

      if (downloadUrl) {
        window.open(downloadUrl, '_blank');
      } else {
        alert('Download link is currently being prepared by admin. Please try again shortly.');
      }
      return;
    }

    if (!selectedPlan) {
      alert('Please select a plan duration first.');
      return;
    }

    onProceedToCheckout(selectedPlan, couponCode.trim(), discountAmount);
  };

  const finalPrice = selectedPlan ? Math.max(0, selectedPlan.price - discountAmount) : 0;

  return (
    <div className="space-y-6 pb-24 max-w-4xl mx-auto">
      {/* Back Button */}
      <button
        id="btn-apk-detail-back"
        onClick={onBack}
        className="flex items-center gap-1.5 text-xs font-bold text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-800 px-3.5 py-2 rounded-xl transition"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Store
      </button>

      {/* Top Main APK Card Header */}
      <div className="bg-zinc-900/80 border border-zinc-800 rounded-3xl p-5 sm:p-6 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
          <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-3xl overflow-hidden bg-zinc-800 border-2 border-amber-500/30 shrink-0 shadow-lg">
            {apk.icon && apk.icon.trim() !== '' ? (
              <img src={apk.icon} alt={apk.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-amber-500/20 to-zinc-950 text-amber-400 font-extrabold text-3xl">
                {apk.name.substring(0, 2).toUpperCase()}
              </div>
            )}
          </div>

          <div className="flex-1 space-y-2 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs uppercase font-extrabold text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20">
                {apk.category}
              </span>
              {apk.isFree ? (
                <span className="bg-emerald-500/10 text-emerald-400 text-xs font-black px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                  FREE DOWNLOAD
                </span>
              ) : (
                <span className="bg-gradient-to-r from-amber-500 to-amber-300 text-zinc-950 text-xs font-black px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow">
                  <Sparkles className="w-3 h-3 fill-zinc-950" /> VIP MOD
                </span>
              )}
            </div>

            <h1 className="text-xl sm:text-2xl font-black text-white">{apk.name}</h1>
            <p className="text-xs text-zinc-400">
              Publisher: <span className="text-zinc-200 font-semibold">AK STAR MOD Official</span>
            </p>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-3 gap-2 pt-2 text-center max-w-sm">
              <div className="bg-zinc-950/60 p-2 rounded-xl border border-zinc-800/80">
                <p className="text-[10px] text-zinc-500 uppercase font-semibold">Rating</p>
                <p className="text-xs font-bold text-amber-400 flex items-center justify-center gap-1 mt-0.5">
                  <Star className="w-3 h-3 fill-amber-400" /> {apk.rating ? apk.rating.toFixed(1) : '4.8'}
                </p>
              </div>
              <div className="bg-zinc-950/60 p-2 rounded-xl border border-zinc-800/80">
                <p className="text-[10px] text-zinc-500 uppercase font-semibold">Size</p>
                <p className="text-xs font-bold text-zinc-200 mt-0.5">{apk.size || '45 MB'}</p>
              </div>
              <div className="bg-zinc-950/60 p-2 rounded-xl border border-zinc-800/80">
                <p className="text-[10px] text-zinc-500 uppercase font-semibold">Version</p>
                <p className="text-xs font-bold text-zinc-200 mt-0.5">v{apk.version}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Button Section */}
        <div className="mt-6 pt-5 border-t border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            {userAccess.hasAccess ? (
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/20">
                <Check className="w-4 h-4" /> Active License Unlocked
              </div>
            ) : apk.isFree ? (
              <div className="text-xs text-zinc-400">
                No subscription required for this app.
              </div>
            ) : selectedPlan ? (
              <div>
                <span className="text-xs text-zinc-400">Payable Amount: </span>
                <span className="text-lg font-black text-amber-400">₹{finalPrice}</span>
                {discountAmount > 0 && (
                  <span className="text-xs text-zinc-500 line-through ml-2">₹{selectedPlan.price}</span>
                )}
              </div>
            ) : null}
          </div>

          <button
            id="btn-apk-detail-action"
            onClick={handleBuyClick}
            className="w-full sm:w-auto bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-500 text-zinc-950 font-extrabold text-sm px-8 py-3.5 rounded-2xl shadow-xl shadow-amber-500/20 transition active:scale-95 flex items-center justify-center gap-2"
          >
            {userAccess.hasAccess ? (
              <>
                <Download className="w-5 h-5" /> DOWNLOAD APK NOW
              </>
            ) : apk.isFree ? (
              <>
                <Download className="w-5 h-5" /> FREE DOWNLOAD
              </>
            ) : !user ? (
              <>
                <Lock className="w-4 h-4" /> SIGN IN TO BUY (₹{finalPrice})
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5 fill-zinc-950" /> BUY NOW (₹{finalPrice})
              </>
            )}
          </button>
        </div>
      </div>

      {/* Plan Selection Section (Only if Paid & No active access) */}
      {!apk.isFree && !userAccess.hasAccess && (
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-3xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-400" />
            <h2 className="text-sm font-extrabold text-white">Select Access Duration Plan</h2>
          </div>

          {loadingPlans ? (
            <div className="text-xs text-zinc-500">Loading plans...</div>
          ) : plans.length === 0 ? (
            <div className="text-xs text-amber-400/80 bg-amber-500/10 p-3 rounded-xl border border-amber-500/20">
              No specific plans configured yet. Admin can set up plans in Admin Panel.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {plans.map((plan) => {
                const isSelected = selectedPlan?.id === plan.id;
                return (
                  <button
                    key={plan.id}
                    id={`btn-plan-select-${plan.id}`}
                    onClick={() => {
                      setSelectedPlan(plan);
                      setDiscountAmount(0);
                      setCouponMessage(null);
                    }}
                    className={`p-3.5 rounded-2xl border text-left transition flex flex-col justify-between ${
                      isSelected
                        ? 'bg-amber-500 text-zinc-950 border-amber-400 shadow-lg shadow-amber-500/20 scale-[1.02]'
                        : 'bg-zinc-950/80 border-zinc-800 hover:border-zinc-700 text-zinc-200'
                    }`}
                  >
                    <span className="text-xs font-black uppercase tracking-wider">{plan.name}</span>
                    <div className="mt-2 flex items-baseline gap-1">
                      <span className="text-base font-extrabold">₹{plan.price}</span>
                      <span className="text-[10px] opacity-75">/ {plan.durationDays} Days</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Coupon Code Section */}
          <div className="pt-2 border-t border-zinc-800/60 space-y-2">
            <label className="text-xs font-semibold text-zinc-400 flex items-center gap-1">
              <Tag className="w-3.5 h-3.5 text-amber-400" /> Apply Promo / Discount Coupon (10% - 100% OFF)
            </label>
            <div className="flex gap-2">
              <input
                id="input-coupon-code"
                type="text"
                placeholder="Enter Coupon Code (e.g. AKVIP100)"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                className="flex-1 bg-zinc-950 border border-zinc-800 focus:border-amber-500 rounded-xl px-3.5 py-2 text-xs text-white uppercase placeholder-zinc-500 focus:outline-none"
              />
              <button
                id="btn-apply-coupon"
                type="button"
                onClick={handleApplyCoupon}
                className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 px-4 py-2 rounded-xl text-xs font-bold transition"
              >
                Apply
              </button>
            </div>

            {couponMessage && (
              <p className={`text-xs font-medium ${couponMessage.type === 'success' ? 'text-emerald-400' : 'text-red-400'}`}>
                {couponMessage.text}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Screenshots Gallery */}
      {apk.screenshots && apk.screenshots.filter(s => s && s.trim() !== '').length > 0 && (
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-3xl p-5 space-y-3">
          <h2 className="text-sm font-extrabold text-white">App Screenshots</h2>
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
            {apk.screenshots.filter(src => src && src.trim() !== '').map((src, i) => (
              <img
                key={i}
                src={src}
                alt={`${apk.name} screenshot ${i + 1}`}
                onClick={() => setActiveImageTab(src)}
                className="h-44 rounded-2xl border border-zinc-800 object-cover cursor-pointer hover:opacity-90 transition shrink-0"
              />
            ))}
          </div>
        </div>
      )}

      {/* Description & Features */}
      <div className="bg-zinc-900/60 border border-zinc-800 rounded-3xl p-5 space-y-4">
        <h2 className="text-sm font-extrabold text-white">About This App</h2>
        <p className="text-xs text-zinc-300 leading-relaxed whitespace-pre-line">
          {apk.description}
        </p>

        {apk.features && apk.features.length > 0 && (
          <div className="pt-3 border-t border-zinc-800 space-y-2">
            <h3 className="text-xs font-bold text-amber-400">Mod Features</h3>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-zinc-300">
              {apk.features.map((feat, idx) => (
                <li key={idx} className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>{feat}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {apk.changelog && (
          <div className="pt-3 border-t border-zinc-800 space-y-1">
            <h3 className="text-xs font-bold text-zinc-400">What's New in v{apk.version}</h3>
            <p className="text-xs text-zinc-300 whitespace-pre-line leading-relaxed">
              {apk.changelog}
            </p>
          </div>
        )}
      </div>

      {/* Ratings & Reviews System */}
      <ReviewSection
        apkId={apk.id}
        apkName={apk.name}
        currentRating={apk.rating}
        reviewsCount={apk.reviewsCount}
      />

      {/* Screenshot Lightbox Modal */}
      {activeImageTab && activeImageTab.trim() !== '' && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4" onClick={() => setActiveImageTab(null)}>
          <img src={activeImageTab} alt="Preview" className="max-w-full max-h-[90vh] rounded-2xl object-contain shadow-2xl" />
        </div>
      )}
    </div>
  );
};
