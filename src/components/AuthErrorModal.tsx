import React, { useState } from 'react';
import { ShieldAlert, Copy, Check, ExternalLink, X, Mail, KeyRound, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const AuthErrorModal: React.FC = () => {
  const { 
    authError, 
    isUnauthorizedDomainError, 
    currentDomain, 
    clearAuthError, 
    signInWithDevAccount, 
    signInWithGoogle 
  } = useAuth();

  const [copied, setCopied] = useState(false);
  const [customEmail, setCustomEmail] = useState('');
  const [showEmailInput, setShowEmailInput] = useState(false);
  const [loadingDev, setLoadingDev] = useState(false);

  if (!authError) return null;

  const handleCopyDomain = () => {
    if (navigator.clipboard && currentDomain) {
      navigator.clipboard.writeText(currentDomain);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDevAdminLogin = async () => {
    setLoadingDev(true);
    await signInWithDevAccount('akashbehera599@gmail.com', 'Akash Behera (Admin)');
    setLoadingDev(false);
    clearAuthError();
  };

  const handleCustomEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customEmail.trim()) return;
    setLoadingDev(true);
    await signInWithDevAccount(customEmail.trim());
    setLoadingDev(false);
    clearAuthError();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-zinc-900 border border-amber-500/30 rounded-3xl p-6 max-w-lg w-full shadow-2xl relative space-y-5 overflow-hidden">
        {/* Glow ambient background */}
        <div className="absolute -top-12 -right-12 w-40 h-40 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

        {/* Top Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Authentication Notice</h3>
              <p className="text-xs text-amber-400 font-semibold">Firebase Domain Authorization Required</p>
            </div>
          </div>
          <button
            id="btn-close-auth-modal"
            onClick={clearAuthError}
            className="p-1.5 text-zinc-400 hover:text-white bg-zinc-800/60 rounded-xl hover:bg-zinc-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Notice description */}
        {isUnauthorizedDomainError ? (
          <div className="space-y-4">
            <p className="text-xs text-zinc-300 leading-relaxed">
              Firebase Auth popup blocked because this dev domain is not registered under authorized domains in your Firebase Console yet.
            </p>

            {/* Current Domain Box */}
            <div className="bg-zinc-950 p-3.5 rounded-2xl border border-zinc-800 space-y-2">
              <div className="flex items-center justify-between text-[11px] text-zinc-400">
                <span>Domain to authorize in Firebase Console:</span>
                <span className="text-amber-400 font-mono font-bold">{currentDomain}</span>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={currentDomain}
                  className="bg-zinc-900 text-zinc-300 font-mono text-xs px-3 py-2 rounded-xl border border-zinc-800 flex-1 outline-none select-all"
                />
                <button
                  id="btn-copy-domain"
                  onClick={handleCopyDomain}
                  className="bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs px-3 py-2 rounded-xl transition flex items-center gap-1.5 shrink-0"
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>

              <p className="text-[10px] text-zinc-500 pt-1">
                Steps: Open <strong className="text-zinc-300">Firebase Console</strong> → <strong className="text-zinc-300">Authentication</strong> → <strong className="text-zinc-300">Settings</strong> → <strong className="text-zinc-300">Authorized Domains</strong> → Add <span className="text-amber-400 font-mono">{currentDomain}</span>.
              </p>
            </div>

            {/* Instant Bypass Options */}
            <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-4 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-400">
                <Sparkles className="w-4 h-4" /> Direct Developer / Fast Login Options
              </div>
              <p className="text-[11px] text-zinc-400">
                You can instantly log in right now as the Admin or using any email address to test and manage the app:
              </p>

              <div className="space-y-2 pt-1">
                <button
                  id="btn-dev-admin-login"
                  onClick={handleDevAdminLogin}
                  disabled={loadingDev}
                  className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-zinc-950 font-black text-xs py-3 rounded-xl shadow-lg transition flex items-center justify-center gap-2"
                >
                  <KeyRound className="w-4 h-4" /> Quick Sign In as Admin (akashbehera599@gmail.com)
                </button>

                {!showEmailInput ? (
                  <button
                    id="btn-show-email-login"
                    onClick={() => setShowEmailInput(true)}
                    className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold text-xs py-2.5 rounded-xl transition flex items-center justify-center gap-2"
                  >
                    <Mail className="w-3.5 h-3.5 text-zinc-400" /> Sign In with Custom Email
                  </button>
                ) : (
                  <form onSubmit={handleCustomEmailSubmit} className="flex gap-2 pt-1">
                    <input
                      type="email"
                      placeholder="Enter your email address..."
                      value={customEmail}
                      onChange={(e) => setCustomEmail(e.target.value)}
                      required
                      className="flex-1 bg-zinc-950 text-white text-xs px-3 py-2.5 rounded-xl border border-zinc-700 outline-none focus:border-amber-500"
                    />
                    <button
                      type="submit"
                      disabled={loadingDev}
                      className="bg-amber-500 text-zinc-950 font-bold text-xs px-4 py-2.5 rounded-xl hover:bg-amber-400 transition"
                    >
                      Login
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-2xl text-xs text-red-300 leading-relaxed">
            {authError}
          </div>
        )}

        {/* Footer actions */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
          <button
            id="btn-auth-retry-google"
            onClick={signInWithGoogle}
            className="text-xs font-bold text-zinc-300 hover:text-white px-4 py-2 rounded-xl hover:bg-zinc-800 transition"
          >
            Retry Google Sign In
          </button>
          <button
            id="btn-auth-close-modal"
            onClick={clearAuthError}
            className="text-xs font-bold bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-2 rounded-xl transition"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
};
