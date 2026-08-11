import React, { useState, useEffect } from 'react';
import { 
  Copy, Check, ArrowLeft, QrCode, ShieldAlert, Upload, 
  Send, Sparkles, AlertCircle, Clock, ExternalLink 
} from 'lucide-react';
import { ApkItem, PlanItem, StoreSettings } from '../types';
import { useAuth } from '../context/AuthContext';
import { createOrder, submitPaymentProof, subscribeStoreSettings } from '../services/db';

interface CheckoutPageProps {
  apk: ApkItem;
  plan: PlanItem;
  couponCode?: string;
  discountAmount?: number;
  onBack: () => void;
  onSuccess: (orderId: string) => void;
}

export const CheckoutPage: React.FC<CheckoutPageProps> = ({
  apk,
  plan,
  couponCode = '',
  discountAmount = 0,
  onBack,
  onSuccess
}) => {
  const { user, userProfile } = useAuth();
  const [storeSettings, setStoreSettings] = useState<StoreSettings | null>(null);
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [utr, setUtr] = useState('');
  const [screenshotBase64, setScreenshotBase64] = useState('');
  const [screenshotPreview, setScreenshotPreview] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const unsub = subscribeStoreSettings((s) => setStoreSettings(s));
    return () => unsub();
  }, []);

  const finalPrice = Math.max(0, plan.price - discountAmount);
  const isFreeCoupon = finalPrice === 0;

  const handleCopyUpi = () => {
    if (storeSettings?.upiId) {
      navigator.clipboard.writeText(storeSettings.upiId);
      setCopiedUpi(true);
      setTimeout(() => setCopiedUpi(false), 2000);
    }
  };

  const handleScreenshotChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage('Image size exceeds 5MB. Please upload a smaller screenshot.');
      return;
    }

    setErrorMessage(null);
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      setScreenshotBase64(result);
      setScreenshotPreview(result);
    };
    reader.readAsDataURL(file);
  };

  const handleZeroPriceSubmit = async () => {
    if (!user) return;
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await createOrder({
        userId: user.uid,
        userEmail: user.email || '',
        userName: user.displayName || 'User',
        apkId: apk.id,
        apkName: apk.name,
        apkIcon: apk.icon,
        planId: plan.id,
        planName: plan.name,
        durationDays: plan.durationDays,
        originalPrice: plan.price,
        couponCode: couponCode || undefined,
        discountPercent: Math.round((discountAmount / plan.price) * 100),
        discountAmount,
        finalPrice: 0,
        upiId: storeSettings?.upiId || 'N/A'
      });

      onSuccess(res.orderId);
    } catch (err: any) {
      console.error('Zero price order error:', err);
      setErrorMessage(err.message || 'Failed to complete free checkout.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePaymentProofSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!utr.trim()) {
      setErrorMessage('Please enter the 12-digit UTR / Transaction ID.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      // 1. Create Order
      const res = await createOrder({
        userId: user.uid,
        userEmail: user.email || '',
        userName: user.displayName || 'User',
        apkId: apk.id,
        apkName: apk.name,
        apkIcon: apk.icon,
        planId: plan.id,
        planName: plan.name,
        durationDays: plan.durationDays,
        originalPrice: plan.price,
        couponCode: couponCode || undefined,
        discountPercent: Math.round((discountAmount / plan.price) * 100),
        discountAmount,
        finalPrice,
        upiId: storeSettings?.upiId || ''
      });

      // 2. Submit UTR & Screenshot
      await submitPaymentProof(res.orderId, utr.trim(), screenshotBase64);

      onSuccess(res.orderId);
    } catch (err: any) {
      console.error('Submit payment proof error:', err);
      setErrorMessage(err.message || 'Failed to submit payment proof.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const upiId = storeSettings?.upiId || 'akstarofficial@upi';
  const qrUrl = storeSettings?.upiQrUrl || 
    `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=upi://pay?pa=${encodeURIComponent(upiId)}%26pn=AK%20STAR%20MOD%26am=${finalPrice}%26cu=INR`;

  return (
    <div className="space-y-6 pb-24 max-w-2xl mx-auto">
      {/* Back Button */}
      <button
        id="btn-checkout-back"
        onClick={onBack}
        className="flex items-center gap-1.5 text-xs font-bold text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-800 px-3.5 py-2 rounded-xl transition"
      >
        <ArrowLeft className="w-4 h-4" /> Back to App Details
      </button>

      {/* Header */}
      <div>
        <h1 className="text-xl font-black text-white flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-amber-400" /> Checkout Order
        </h1>
        <p className="text-xs text-zinc-400 mt-0.5">
          Review details and complete your access payment.
        </p>
      </div>

      {/* Summary Card */}
      <div className="bg-zinc-900/80 border border-zinc-800 rounded-3xl p-5 space-y-4 shadow-xl">
        <div className="flex items-center gap-3">
          <img src={apk.icon} alt={apk.name} className="w-12 h-12 rounded-2xl object-cover border border-zinc-700 shrink-0" />
          <div>
            <h2 className="text-sm font-bold text-white">{apk.name}</h2>
            <p className="text-xs text-amber-400 font-semibold">{plan.name} ({plan.durationDays} Days Access)</p>
          </div>
        </div>

        <div className="pt-3 border-t border-zinc-800 space-y-2 text-xs">
          <div className="flex justify-between text-zinc-400">
            <span>Original Plan Price</span>
            <span>₹{plan.price}</span>
          </div>

          {discountAmount > 0 && (
            <div className="flex justify-between text-emerald-400 font-semibold">
              <span>Coupon Discount ({couponCode})</span>
              <span>- ₹{discountAmount}</span>
            </div>
          )}

          <div className="flex justify-between text-sm font-extrabold text-white pt-2 border-t border-zinc-800">
            <span>Final Payable Amount</span>
            <span className="text-amber-400 text-base">₹{finalPrice}</span>
          </div>
        </div>
      </div>

      {/* 100% DISCOUNT FREE ORDER FLOW */}
      {isFreeCoupon ? (
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-3xl p-6 text-center space-y-4">
          <div className="w-12 h-12 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto">
            <Check className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-white">100% Discount Applied!</h2>
          <p className="text-xs text-zinc-300 max-w-md mx-auto">
            Your coupon covers the total cost. Click below to instantly activate your free subscription without payment.
          </p>

          <button
            id="btn-zero-price-activate"
            onClick={handleZeroPriceSubmit}
            disabled={isSubmitting}
            className="w-full bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black text-sm py-3.5 rounded-2xl shadow-lg transition"
          >
            {isSubmitting ? 'Activating Access...' : 'UNLOCK FREE ACCESS NOW'}
          </button>
        </div>
      ) : (
        /* MANUAL UPI PAYMENT FLOW */
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-3xl p-6 space-y-6 shadow-xl">
          {/* UPI ID & QR Code Box */}
          <div className="space-y-4 text-center">
            <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[11px] font-bold px-3 py-1 rounded-full inline-block">
              STEP 1: SEND ₹{finalPrice} TO UPI ID
            </span>

            {/* QR Code */}
            <div className="bg-white p-3 rounded-2xl inline-block shadow-lg mx-auto border-4 border-amber-400">
              <img src={qrUrl} alt="UPI QR Code" className="w-44 h-44 object-contain" />
            </div>

            {/* UPI ID Copy Field */}
            <div className="bg-zinc-950 p-3 rounded-2xl border border-zinc-800 flex items-center justify-between gap-2 max-w-sm mx-auto">
              <div>
                <p className="text-[10px] text-zinc-500 uppercase font-bold text-left">Store UPI ID</p>
                <p className="text-xs font-mono font-bold text-amber-400">{upiId}</p>
              </div>
              <button
                id="btn-copy-upi-id"
                onClick={handleCopyUpi}
                className="bg-amber-500 hover:bg-amber-400 text-zinc-950 px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 shrink-0"
              >
                {copiedUpi ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedUpi ? 'Copied' : 'Copy'}
              </button>
            </div>

            {/* Deep link button */}
            <a
              id="link-open-upi-app"
              href={`upi://pay?pa=${encodeURIComponent(upiId)}&pn=AK%20STAR%20MOD&am=${finalPrice}&cu=INR`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-amber-400 font-bold hover:underline pt-1"
            >
              Open in UPI App (GPay/PhonePe/Paytm) <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          {/* Verification Warning Notice */}
          <div className="bg-amber-500/10 border border-amber-500/20 p-3.5 rounded-2xl text-xs text-zinc-300 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-amber-400">
              <ShieldAlert className="w-4 h-4" /> Payment Verification Notice
            </div>
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              After payment, submit your 12-digit UTR/Transaction ID and payment screenshot below. Our team will verify and unlock your app access automatically.
            </p>
          </div>

          {/* Form Toggle Button or Form */}
          {!showPaymentForm ? (
            <button
              id="btn-show-payment-form"
              onClick={() => setShowPaymentForm(true)}
              className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-zinc-950 font-black text-sm py-3.5 rounded-2xl shadow-xl transition"
            >
              I HAVE PAID ₹{finalPrice} → SUBMIT PROOF
            </button>
          ) : (
            <form onSubmit={handlePaymentProofSubmit} className="space-y-4 pt-2 border-t border-zinc-800">
              <div className="space-y-1">
                <label className="text-xs font-bold text-white flex items-center gap-1">
                  12-Digit UTR / Transaction ID <span className="text-red-400">*</span>
                </label>
                <input
                  id="input-utr-number"
                  type="text"
                  placeholder="Enter UTR / Ref No (e.g., 422019827410)"
                  value={utr}
                  onChange={(e) => setUtr(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 focus:border-amber-500 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none font-mono"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-white flex items-center gap-1">
                  Payment Screenshot (Optional but recommended)
                </label>
                <div className="border-2 border-dashed border-zinc-800 hover:border-amber-500/50 rounded-2xl p-4 text-center cursor-pointer bg-zinc-950/50 transition relative">
                  <input
                    id="file-input-screenshot"
                    type="file"
                    accept="image/*"
                    onChange={handleScreenshotChange}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                  {screenshotPreview ? (
                    <div className="space-y-2">
                      <img src={screenshotPreview} alt="Screenshot preview" className="max-h-36 mx-auto rounded-xl object-contain border border-zinc-700" />
                      <p className="text-[10px] text-emerald-400 font-bold">Screenshot attached successfully</p>
                    </div>
                  ) : (
                    <div className="space-y-1 text-zinc-400">
                      <Upload className="w-6 h-6 mx-auto text-amber-400" />
                      <p className="text-xs font-semibold">Click or drag screenshot here</p>
                      <p className="text-[10px] text-zinc-500">PNG, JPG or WEBP up to 5MB</p>
                    </div>
                  )}
                </div>
              </div>

              {errorMessage && (
                <div className="text-xs text-red-400 bg-red-500/10 p-3 rounded-xl border border-red-500/20 font-medium">
                  {errorMessage}
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  id="btn-cancel-payment-form"
                  type="button"
                  onClick={() => setShowPaymentForm(false)}
                  className="w-1/3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-xs py-3 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  id="btn-submit-payment-proof"
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black text-xs py-3 rounded-xl shadow-lg transition flex items-center justify-center gap-2"
                >
                  {isSubmitting ? 'Submitting...' : 'SUBMIT PAYMENT FOR VERIFICATION'}
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
};
