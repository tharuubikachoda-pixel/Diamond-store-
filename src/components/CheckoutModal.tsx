import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  CreditCard,
  Loader2,
  Search,
  Wallet,
  X,
} from 'lucide-react';
import { createTopUpOrder } from '../services/firestoreService';
import {
  formatNpr,
  getPackageImageUrl,
  isValidPlayerUid,
  sanitizeNumericUid,
} from '../utils/storeLogic';
import type {
  DiamondPackage,
  LanguageCode,
  PaymentMethod,
  StoreSettings,
  UidLookupResult,
  UserProfile,
} from '../types/store';
import { PaymentQrCard } from './QrCodeViewer';
import { ScreenshotUploadCard } from './ScreenshotUploadCard';

interface CheckoutModalProps {
  pkg: DiamondPackage | null;
  profile: UserProfile | null;
  settings: StoreSettings;
  lang: LanguageCode;
  initialUid?: string;
  initialLookupResult?: UidLookupResult | null;
  onUidVerified?: (uid: string, result: UidLookupResult) => void;
  onClose: () => void;
  onRequireSignIn: () => void;
  onOrderSuccess: (orderId: string) => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  pkg,
  profile,
  settings,
  initialUid,
  initialLookupResult,
  onUidVerified,
  onClose,
  onRequireSignIn,
  onOrderSuccess,
}) => {
  const [playerUid, setPlayerUid] = useState('');
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupResult, setLookupResult] = useState<UidLookupResult | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('esewa');
  const [screenshotDataUrl, setScreenshotDataUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!pkg) return;
    const startingUid = initialUid || profile?.defaultUid || profile?.recentUids?.[0] || '';
    setPlayerUid(startingUid);
    const matchedInitial =
      initialLookupResult && initialLookupResult.uid === startingUid
        ? initialLookupResult
        : null;
    setLookupResult(matchedInitial);
    setLookupLoading(false);
    setPaymentMethod('esewa');
    setScreenshotDataUrl('');
    setError('');
  }, [pkg, initialUid, initialLookupResult, profile?.defaultUid, profile?.recentUids]);

  const handleLookupUid = async (uidOverride?: string) => {
    const targetUid = sanitizeNumericUid(uidOverride ?? playerUid);
    if (!isValidPlayerUid(targetUid)) {
      setError('Enter a valid numeric Free Fire Player UID (5–20 digits).');
      return;
    }
    setError('');
    setLookupLoading(true);
    setLookupResult(null);
    try {
      const res = await fetch(`/api/ff-uid-lookup?uid=${encodeURIComponent(targetUid)}`);
      const data = (await res.json()) as UidLookupResult;
      setLookupResult(data);
      onUidVerified?.(targetUid, data);
    } catch {
      setLookupResult({
        found: false,
        busy: true,
        uid: targetUid,
        ign: '',
        region: '',
        message: 'Lookup server busy — you can still confirm your order with Player UID alone.',
      });
    } finally {
      setLookupLoading(false);
    }
  };

  if (!pkg) return null;

  const recentUids = profile?.recentUids || [];
  const walletBalance = profile?.walletBalance ?? 0;
  const walletInsufficient = paymentMethod === 'wallet' && walletBalance < pkg.priceNpr;

  const handleConfirmOrder = async () => {
    setError('');
    if (!profile) {
      onRequireSignIn();
      return;
    }
    if (profile.isBlocked) {
      setError('Your account is currently blocked. Please contact support.');
      return;
    }
    if (!isValidPlayerUid(playerUid)) {
      setError('Enter a valid numeric Free Fire Player UID (5–20 digits).');
      return;
    }
    if (paymentMethod === 'wallet') {
      if (walletBalance < pkg.priceNpr) {
        setError('Insufficient wallet balance. Add money or pay with eSewa.');
        return;
      }
    } else if (!screenshotDataUrl) {
      setError('Please upload your eSewa payment screenshot before confirming.');
      return;
    }

    setSubmitting(true);
    try {
      const ignMatchesCurrentUid = lookupResult?.found && lookupResult.uid === playerUid;
      const orderId = await createTopUpOrder({
        profile,
        pkg,
        playerUid,
        playerIgn: ignMatchesCurrentUid ? lookupResult.ign : '',
        playerRegion: ignMatchesCurrentUid ? lookupResult.region : '',
        ignVerified: Boolean(ignMatchesCurrentUid),
        paymentMethod,
        screenshotDataUrl,
      });
      onOrderSuccess(orderId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit order.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Checkout ${pkg.name}`}
      className="fixed inset-0 z-50 bg-black/75 flex items-end sm:items-center justify-center p-0 sm:p-4"
    >
      <div className="w-full sm:max-w-xl max-h-[92vh] rounded-t-3xl sm:rounded-3xl bg-white dark:bg-[#0F1B33] border border-slate-200 dark:border-white/10 flex flex-col overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-white/10">
          <div className="flex items-center gap-3 min-w-0">
            <img
              src={getPackageImageUrl(pkg)}
              alt={pkg.name}
              className="w-11 h-11 rounded-xl object-cover border border-slate-200 dark:border-white/15 shrink-0"
            />
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white truncate">{pkg.name}</h2>
              <p className="text-xs text-slate-500 dark:text-slate-300 font-mono-num truncate">
                {formatNpr(pkg.priceNpr)} · {pkg.bonusLabel}
              </p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Close checkout"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Player UID + Search */}
          <div className="space-y-2.5">
            <label
              htmlFor="checkout-player-uid"
              className="block text-xs font-semibold text-slate-700 dark:text-slate-200"
            >
              Free Fire Player UID (Numeric only)
            </label>
            <div className="flex items-center gap-2">
              <input
                id="checkout-player-uid"
                type="text"
                inputMode="numeric"
                value={playerUid}
                onChange={(e) => {
                  const clean = sanitizeNumericUid(e.target.value);
                  setPlayerUid(clean);
                  if (lookupResult && lookupResult.uid !== clean) {
                    setLookupResult(null);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    void handleLookupUid();
                  }
                }}
                placeholder="e.g. 6951209815"
                className="flex-1 min-w-0 px-4 py-3 rounded-xl bg-[#F2F6FC] dark:bg-[#091224] border border-slate-300 dark:border-white/15 text-slate-900 dark:text-white font-mono-num text-sm focus:outline-none focus:border-[#2186FF]"
              />
              <button
                type="button"
                aria-label="Verify Player UID"
                disabled={lookupLoading}
                onClick={() => void handleLookupUid()}
                className="inline-flex items-center gap-2 px-4 py-3 rounded-xl bg-[#0B3D91] dark:bg-[#2186FF] text-white text-xs font-semibold hover:opacity-95 transition-opacity disabled:opacity-50 shrink-0 whitespace-nowrap"
              >
                {lookupLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Search className="w-4 h-4" />
                )}
                {lookupLoading ? 'Checking…' : 'Verify'}
              </button>
            </div>

            {recentUids.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] text-slate-500 dark:text-slate-400">Recent UIDs:</span>
                {recentUids.map((uid) => (
                  <button
                    key={uid}
                    type="button"
                    onClick={() => {
                      setPlayerUid(uid);
                      setError('');
                      if (lookupResult && lookupResult.uid !== uid) {
                        setLookupResult(null);
                      }
                    }}
                    className="px-2.5 py-1 rounded-lg bg-[#F2F6FC] dark:bg-[#091224] border border-slate-200 dark:border-white/10 text-xs font-mono-num text-slate-800 dark:text-slate-200 hover:border-[#2186FF]"
                  >
                    {uid}
                  </button>
                ))}
              </div>
            )}

            {lookupResult && lookupResult.found && (
              <div
                data-testid="checkout-uid-verified-result"
                className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 px-3.5 py-2.5 flex items-center justify-between gap-2 text-xs text-emerald-700 dark:text-emerald-300"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  <div className="min-w-0">
                    <div className="text-[10px] font-semibold uppercase tracking-wider opacity-80">
                      Player Name
                    </div>
                    <div className="font-bold text-sm text-slate-900 dark:text-white truncate">
                      {lookupResult.ign}
                    </div>
                  </div>
                </div>
                <span className="font-mono-num text-[11px] shrink-0">
                  Server: {lookupResult.region}
                </span>
              </div>
            )}

            {lookupResult && !lookupResult.found && (
              <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 px-3.5 py-2.5 flex items-start gap-2.5 text-xs text-amber-800 dark:text-amber-200">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{lookupResult.message}</span>
              </div>
            )}
          </div>

          {/* Payment Method: eSewa + Wallet only */}
          <div className="space-y-2.5">
            <div className="text-xs font-semibold text-slate-700 dark:text-slate-200">
              Payment Method
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              {(
                [
                  { id: 'esewa', label: 'eSewa' },
                  { id: 'wallet', label: 'Wallet' },
                ] as const
              ).map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setPaymentMethod(m.id)}
                  className={`px-3 py-2.5 rounded-xl text-xs font-semibold border transition-colors whitespace-nowrap ${
                    paymentMethod === m.id
                      ? 'bg-[#0B3D91] dark:bg-[#2186FF] text-white border-transparent'
                      : 'bg-[#F2F6FC] dark:bg-[#091224] text-slate-700 dark:text-slate-200 border-slate-200 dark:border-white/10 hover:border-[#2186FF]'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Payment QR or Wallet Balance */}
          {paymentMethod === 'wallet' ? (
            <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-[#F2F6FC] dark:bg-[#091224] p-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#0B3D91]/10 dark:bg-[#00D2FF]/15 flex items-center justify-center text-[#0B3D91] dark:text-[#00D2FF]">
                  <Wallet className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    Available Wallet Balance
                  </div>
                  <div className="text-base font-bold font-mono-num text-slate-900 dark:text-white">
                    {profile ? formatNpr(walletBalance) : 'Sign in to check'}
                  </div>
                </div>
              </div>
              {walletInsufficient && (
                <span className="text-xs font-semibold text-red-600 dark:text-red-400">
                  Need {formatNpr(pkg.priceNpr - walletBalance)} more
                </span>
              )}
            </div>
          ) : (
            <>
              <PaymentQrCard
                method="esewa"
                settings={settings}
                amountNpr={pkg.priceNpr}
                reference={`FF-${playerUid || 'UID'}`}
              />
              <ScreenshotUploadCard
                label="eSewa Payment Proof Screenshot"
                value={screenshotDataUrl}
                onChange={setScreenshotDataUrl}
              />
            </>
          )}

          {error && (
            <div className="rounded-xl bg-red-500/10 border border-red-500/30 px-3.5 py-2.5 text-xs text-red-600 dark:text-red-300">
              {error}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-200 dark:border-white/10 bg-white dark:bg-[#0F1B33] flex items-center justify-between gap-4">
          <div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400">Total Payable</div>
            <div className="text-lg font-bold font-mono-num text-slate-900 dark:text-white">
              {formatNpr(pkg.priceNpr)}
            </div>
          </div>
          <button
            type="button"
            disabled={submitting || walletInsufficient}
            onClick={() => void handleConfirmOrder()}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#0B3D91] dark:bg-[#2186FF] text-white text-sm font-semibold hover:opacity-95 transition-opacity disabled:opacity-50"
          >
            <CreditCard className="w-4 h-4" />
            {submitting
              ? 'Submitting…'
              : profile
                ? 'Confirm Order'
                : 'Sign In to Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
};
