import React from 'react';
import { AlertCircle, CheckCircle2, Gamepad2, Loader2, ShieldCheck } from 'lucide-react';
import { TRANSLATIONS, sanitizeNumericUid } from '../utils/storeLogic';
import type { LanguageCode, UidLookupResult } from '../types/store';

interface FreeFireUidBarProps {
  uid: string;
  onUidChange: (uid: string) => void;
  loading: boolean;
  error: string;
  result: UidLookupResult | null;
  recentUids: string[];
  lang: LanguageCode;
  onVerify: (uidOverride?: string) => void;
}

export const FreeFireUidBar: React.FC<FreeFireUidBarProps> = ({
  uid,
  onUidChange,
  loading,
  error,
  result,
  recentUids,
  lang,
  onVerify,
}) => {
  const t = TRANSLATIONS[lang];

  return (
    <section
      aria-label="Free Fire UID Verify Bar"
      className="rounded-3xl bg-white dark:bg-[#0F1B33] border border-slate-200 dark:border-white/10 p-5 sm:p-6 space-y-3.5"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-[#0B3D91]/10 dark:bg-[#00D2FF]/15 text-[#0B3D91] dark:text-[#00D2FF] flex items-center justify-center shrink-0">
            <Gamepad2 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
              {t.ffUidBarTitle}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t.ffUidBarSubtitle}
            </p>
          </div>
        </div>
        <div className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 whitespace-nowrap shrink-0">
          Online NP Server · BD / IND / SG
        </div>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          onVerify();
        }}
        className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5"
      >
        <label htmlFor="home-ff-uid" className="sr-only">
          Free Fire Player UID (Numeric)
        </label>
        <input
          id="home-ff-uid"
          type="text"
          inputMode="numeric"
          value={uid}
          onChange={(e) => onUidChange(sanitizeNumericUid(e.target.value))}
          placeholder="Enter Free Fire UID (e.g. 2145983012)"
          className="flex-1 px-4 py-3 rounded-xl bg-[#F2F6FC] dark:bg-[#091224] border border-slate-300 dark:border-white/15 text-slate-900 dark:text-white font-mono-num text-sm focus:outline-none focus:border-[#2186FF]"
        />
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#0B3D91] dark:bg-[#2186FF] text-white text-sm font-semibold hover:opacity-95 transition-opacity disabled:opacity-50 shrink-0 whitespace-nowrap"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <ShieldCheck className="w-4 h-4" />
          )}
          {loading ? 'Verifying…' : t.verifyUid}
        </button>
      </form>

      {recentUids.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] text-slate-500 dark:text-slate-400">Recent UIDs:</span>
          {recentUids.map((recent) => (
            <button
              key={recent}
              type="button"
              onClick={() => {
                onUidChange(recent);
                onVerify(recent);
              }}
              className="px-2.5 py-1 rounded-lg bg-[#F2F6FC] dark:bg-[#091224] border border-slate-200 dark:border-white/10 text-xs font-mono-num text-slate-800 dark:text-slate-200 hover:border-[#2186FF]"
            >
              {recent}
            </button>
          ))}
        </div>
      )}

      {error && (
        <div className="rounded-xl bg-red-500/10 border border-red-500/30 px-3.5 py-2.5 text-xs text-red-600 dark:text-red-300">
          {error}
        </div>
      )}

      {/* Result displayed directly below the Free Fire UID Verify bar */}
      {result && result.found && (
        <div
          data-testid="home-uid-verified-result"
          className="rounded-2xl bg-emerald-500/10 border border-emerald-500/30 px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
        >
          <div className="flex items-center gap-3 min-w-0">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <div className="min-w-0">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                {t.verifiedPlayerName}
              </div>
              <div className="text-base font-extrabold text-slate-900 dark:text-white truncate">
                {result.ign}
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
            <div className="text-xs font-mono-num text-emerald-800 dark:text-emerald-200 sm:text-right">
              <div>UID: {result.uid}</div>
              <div>Server: {result.region}</div>
            </div>
            <a
              href="#catalog-section"
              className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:opacity-95 transition-opacity whitespace-nowrap"
            >
              Top Up Diamonds
            </a>
          </div>
        </div>
      )}

      {result && !result.found && (
        <div
          data-testid="home-uid-fallback-result"
          className="rounded-2xl bg-amber-500/10 border border-amber-500/30 px-4 py-3 flex items-start gap-2.5 text-xs text-amber-800 dark:text-amber-200"
        >
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <span className="font-mono-num font-bold">UID {result.uid}: </span>
            <span>{result.message}</span>
          </div>
        </div>
      )}
    </section>
  );
};
