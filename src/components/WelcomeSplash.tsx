import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowRight, Sparkles, X } from 'lucide-react';
import { ADAPTIVE_ICON_IMAGE } from '../utils/storeLogic';

interface WelcomeSplashProps {
  open: boolean;
  onDismiss: () => void;
}

const AUTO_DISMISS_MS = 3800;
const EXIT_DURATION_MS = 260;

export const WelcomeSplash: React.FC<WelcomeSplashProps> = ({ open, onDismiss }) => {
  const [closing, setClosing] = useState(false);
  const closingRef = useRef(false);
  const exitTimerRef = useRef<number | null>(null);

  const handleClose = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;
    setClosing(true);
    exitTimerRef.current = window.setTimeout(() => {
      onDismiss();
    }, EXIT_DURATION_MS);
  }, [onDismiss]);

  useEffect(() => {
    if (!open) {
      closingRef.current = false;
      setClosing(false);
      return;
    }

    const autoTimer = window.setTimeout(handleClose, AUTO_DISMISS_MS);
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Enter') {
        handleClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);

    return () => {
      window.clearTimeout(autoTimer);
      window.removeEventListener('keydown', onKeyDown);
      if (exitTimerRef.current !== null) {
        window.clearTimeout(exitTimerRef.current);
        exitTimerRef.current = null;
      }
    };
  }, [open, handleClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Welcome to Diamond Store"
      data-testid="welcome-splash"
      onClick={handleClose}
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#040812]/80 backdrop-blur-md ${
        closing ? 'animate-welcome-backdrop-out' : 'animate-welcome-backdrop-in'
      }`}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`relative w-full max-w-md rounded-3xl overflow-hidden bg-white dark:bg-[#091224] border border-slate-200 dark:border-[#00D2FF]/30 shadow-[0_24px_80px_rgba(0,210,255,0.2)] p-7 sm:p-8 text-center ${
          closing ? 'animate-welcome-card-out' : 'animate-welcome-card-in'
        }`}
      >
        {/* Subtle Radial Sapphire Glow */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-64 h-64 rounded-full bg-[#00D2FF]/20 blur-3xl"
        />

        <button
          type="button"
          aria-label="Close welcome message"
          onClick={handleClose}
          className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="relative flex flex-col items-center space-y-5">
          {/* Animated Diamond Crest */}
          <div className="relative flex items-center justify-center">
            <div
              aria-hidden="true"
              className="animate-welcome-aura-spin absolute -inset-2 rounded-3xl bg-gradient-to-tr from-[#00D2FF]/60 via-[#2186FF]/20 to-[#00D2FF]/60 blur-sm"
            />
            <div className="animate-welcome-crest-float relative w-20 h-20 rounded-2xl overflow-hidden border border-[#00D2FF]/50 bg-[#040812] shadow-lg">
              <img
                src={ADAPTIVE_ICON_IMAGE}
                alt="Diamond Store crest"
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          {/* Greeting Copy */}
          <div className="animate-welcome-copy-in space-y-2">
            <div className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.2em] text-[#0B3D91] dark:text-[#00D2FF]">
              <Sparkles className="w-3.5 h-3.5" />
              Diamond Store NP
            </div>
            <h2 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Welcome Sir!
            </h2>
            <p className="text-sm sm:text-base font-medium text-slate-700 dark:text-slate-200 leading-relaxed">
              Thank you for visiting my Diamond Store
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Free Fire Online NP Server Top-Up · eSewa &amp; Wallet
            </p>
          </div>

          {/* CTA */}
          <button
            type="button"
            onClick={handleClose}
            className="animate-welcome-cta-in active:scale-[0.97] w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-[#0B3D91] to-[#2186FF] dark:from-[#2186FF] dark:to-[#00D2FF] dark:text-[#040812] text-white text-sm font-bold shadow-md hover:opacity-95 transition-all"
          >
            <span>Enter Diamond Store</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Smooth Auto-Enter Progress Bar */}
        <div className="mt-6 h-1 w-full rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
          <div className="animate-welcome-progress origin-left h-full bg-gradient-to-r from-[#2186FF] to-[#00D2FF]" />
        </div>
      </div>
    </div>
  );
};
