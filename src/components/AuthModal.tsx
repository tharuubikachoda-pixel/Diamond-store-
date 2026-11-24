import React, { useState } from 'react';
import { ExternalLink, LogIn, MessageCircle, ShieldCheck, TableProperties, UserPlus, X } from 'lucide-react';
import {
  ADAPTIVE_ICON_IMAGE,
  DEFAULT_NP_PACKAGES,
  buildWhatsAppUrl,
  formatNpr,
  getCategoryLabel,
  getPackageImageUrl,
} from '../utils/storeLogic';
import type { DiamondPackage, LanguageCode, StoreSettings } from '../types/store';

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
  onGoogleSignIn: (selectAccount: boolean) => Promise<void>;
  packages: DiamondPackage[];
  settings: StoreSettings;
  lang: LanguageCode;
  authError: string;
  signingIn: boolean;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  open,
  onClose,
  onGoogleSignIn,
  packages,
  settings,
  lang,
  authError,
  signingIn,
}) => {
  const [priceListOpen, setPriceListOpen] = useState(false);

  if (!open) return null;

  const catalog = packages.length > 0 ? packages : DEFAULT_NP_PACKAGES;
  const categories = ['diamonds', 'weekly', 'monthly', 'levelup'] as const;

  return (
    <>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Sign in to Diamond Store"
        className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4"
      >
        <div className="w-full max-w-md rounded-3xl bg-white dark:bg-[#0F1B33] border border-slate-200 dark:border-white/10 p-6 space-y-5 shadow-2xl">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <img
                src={ADAPTIVE_ICON_IMAGE}
                alt="Diamond Store emblem"
                className="w-12 h-12 rounded-2xl object-cover border border-white/15 bg-[#040812]"
              />
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  Diamond Store NP
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-300">
                  Free Fire Nepal Top-Up & Wallet
                </p>
              </div>
            </div>
            <button
              type="button"
              aria-label="Close sign in dialog"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="rounded-2xl bg-[#F2F6FC] dark:bg-[#091224] border border-slate-200 dark:border-white/10 p-4 space-y-2 text-xs text-slate-700 dark:text-slate-300">
            <div className="flex items-center gap-2 font-semibold text-slate-900 dark:text-white">
              <ShieldCheck className="w-4 h-4 text-[#0B3D91] dark:text-[#00D2FF]" />
              <span>One-Tap Google Authentication</span>
            </div>
            <p>
              Sign in with your Gmail account to place diamond orders, track live delivery status,
              load your NPR Wallet, and chat with support.
            </p>
          </div>

          {authError && (
            <div className="rounded-xl bg-red-500/10 border border-red-500/30 px-3.5 py-2.5 text-xs text-red-600 dark:text-red-300">
              {authError}
            </div>
          )}

          <div className="space-y-2.5">
            <button
              type="button"
              disabled={signingIn}
              onClick={() => void onGoogleSignIn(false)}
              className="w-full flex items-center justify-center gap-2.5 px-4 py-3 rounded-xl bg-[#0B3D91] dark:bg-[#2186FF] text-white text-sm font-semibold hover:opacity-95 transition-opacity disabled:opacity-50"
            >
              <LogIn className="w-4 h-4" />
              {signingIn ? 'Connecting Google Account…' : 'Create / Sign In with Mobile Gmail'}
            </button>

            <button
              type="button"
              disabled={signingIn}
              onClick={() => void onGoogleSignIn(true)}
              className="w-full flex items-center justify-center gap-2.5 px-4 py-3 rounded-xl border border-slate-300 dark:border-white/15 bg-white dark:bg-[#091224] text-slate-900 dark:text-white text-sm font-semibold hover:border-[#2186FF] transition-colors disabled:opacity-50"
            >
              <UserPlus className="w-4 h-4" />
              Use Another Gmail / Add Account
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2.5 pt-1 border-t border-slate-200 dark:border-white/10">
            <button
              type="button"
              onClick={() => setPriceListOpen(true)}
              className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-slate-100 dark:bg-[#091224] text-slate-800 dark:text-slate-100 text-xs font-semibold hover:bg-slate-200 dark:hover:bg-white/10 transition-colors"
            >
              <TableProperties className="w-4 h-4 text-[#0B3D91] dark:text-[#00D2FF]" />
              NP Price List
            </button>
            <a
              href={buildWhatsAppUrl(
                settings.whatsappNumber,
                'Hello Diamond Store NP, I need assistance with Free Fire top-up.',
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-emerald-600/10 text-emerald-700 dark:text-emerald-300 text-xs font-semibold hover:bg-emerald-600/20 transition-colors"
            >
              <MessageCircle className="w-4 h-4" />
              WhatsApp
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>

      {priceListOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Free Fire NP Price List"
          className="fixed inset-0 z-[60] bg-black/75 flex items-center justify-center p-4"
        >
          <div className="w-full max-w-2xl max-h-[85vh] rounded-3xl bg-white dark:bg-[#0F1B33] border border-slate-200 dark:border-white/10 flex flex-col overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-white/10">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Free Fire Nepal (NP) Official Price List
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {catalog.length} Active Packages · eSewa / Wallet
                </p>
              </div>
              <button
                type="button"
                aria-label="Close NP Price List"
                onClick={() => setPriceListOpen(false)}
                className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {categories.map((cat) => {
                const items = catalog.filter((p) => p.category === cat && p.active);
                if (items.length === 0) return null;
                return (
                  <div key={cat} className="space-y-2.5">
                    <h4 className="text-sm font-bold text-[#0B3D91] dark:text-[#00D2FF]">
                      {getCategoryLabel(cat, lang)} ({items.length})
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {items.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between gap-2.5 rounded-xl bg-[#F2F6FC] dark:bg-[#091224] border border-slate-200 dark:border-white/10 px-3 py-2 text-sm"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <img
                              src={getPackageImageUrl(item)}
                              alt={item.name}
                              className="w-8 h-8 rounded-lg object-cover shrink-0 border border-slate-200 dark:border-white/10"
                            />
                            <span className="font-medium text-slate-900 dark:text-white truncate">
                              {item.name}
                            </span>
                          </div>
                          <span className="font-mono-num font-bold text-[#0B3D91] dark:text-[#00D2FF] shrink-0">
                            {formatNpr(item.priceNpr)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
