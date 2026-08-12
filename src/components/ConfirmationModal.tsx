import React, { useEffect } from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDangerous?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  isDangerous = true,
  onConfirm,
  onCancel,
  loading = false
}) => {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) {
        onCancel();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onCancel, loading]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn overflow-y-auto"
      role="dialog"
      aria-modal="true"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !loading) {
          onCancel();
        }
      }}
    >
      <div 
        className="relative w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-2xl text-left my-auto shrink-0"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <button
          id="btn-modal-close"
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onCancel();
          }}
          aria-label="Close"
          className="absolute top-4 right-4 text-zinc-400 hover:text-white transition p-2 rounded-xl hover:bg-zinc-800/80 cursor-pointer touch-manipulation"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-3 pr-8">
          <div className={`p-2.5 rounded-xl shrink-0 ${isDangerous ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'}`}>
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h3 className="text-base sm:text-lg font-bold text-white leading-tight">{title}</h3>
        </div>

        <p className="text-xs sm:text-sm text-zinc-300 mb-6 leading-relaxed">
          {message}
        </p>

        <div className="flex items-center justify-end gap-2.5 sm:gap-3 pt-2 border-t border-zinc-800/60">
          <button
            id="btn-modal-cancel"
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onCancel();
            }}
            aria-label="Cancel"
            className="flex-1 sm:flex-none min-h-[44px] px-4 py-2.5 text-xs sm:text-sm font-semibold text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-600 rounded-xl transition flex items-center justify-center cursor-pointer touch-manipulation select-none"
          >
            {cancelLabel}
          </button>
          <button
            id="btn-modal-confirm"
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (!loading) {
                onConfirm();
              }
            }}
            disabled={loading}
            aria-label={confirmLabel || "Delete"}
            className={`flex-1 sm:flex-none min-h-[44px] px-5 py-2.5 text-xs sm:text-sm font-bold rounded-xl transition flex items-center justify-center gap-2 cursor-pointer touch-manipulation select-none ${
              loading ? 'opacity-70 cursor-not-allowed' : 'active:scale-95'
            } ${
              isDangerous 
                ? 'bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-600/20' 
                : 'bg-amber-500 hover:bg-amber-400 text-zinc-950 shadow-lg shadow-amber-500/20'
            }`}
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin shrink-0" />
            ) : null}
            <span className="truncate">{confirmLabel}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
