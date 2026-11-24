import React, { useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, PlusCircle, Wallet } from 'lucide-react';
import { createWalletTopUpRequest, timestampToMs } from '../services/firestoreService';
import { formatNpr } from '../utils/storeLogic';
import type {
  StoreSettings,
  UserProfile,
  WalletTopUp,
  WalletTransaction,
} from '../types/store';
import { PaymentQrCard } from './QrCodeViewer';
import { ScreenshotUploadCard } from './ScreenshotUploadCard';

interface WalletViewProps {
  profile: UserProfile | null;
  settings: StoreSettings;
  topups: WalletTopUp[];
  transactions: WalletTransaction[];
  onRequireSignIn: () => void;
}

const PRESET_AMOUNTS = [100, 250, 500, 1000, 2500];

export const WalletView: React.FC<WalletViewProps> = ({
  profile,
  settings,
  topups,
  transactions,
  onRequireSignIn,
}) => {
  const [amountInput, setAmountInput] = useState('500');
  const [screenshot, setScreenshot] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [error, setError] = useState('');

  if (!profile) {
    return (
      <div className="rounded-3xl bg-white dark:bg-[#0F1B33] border border-slate-200 dark:border-white/10 p-8 text-center space-y-4">
        <Wallet className="w-10 h-10 mx-auto text-[#0B3D91] dark:text-[#00D2FF]" />
        <div className="space-y-1">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Diamond Store Wallet</h2>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Sign in with Google to load NPR funds via eSewa for instant 1-tap checkouts.
          </p>
        </div>
        <button
          type="button"
          onClick={onRequireSignIn}
          className="px-5 py-2.5 rounded-xl bg-[#0B3D91] dark:bg-[#2186FF] text-white text-sm font-semibold"
        >
          Sign In with Google
        </button>
      </div>
    );
  }

  const parsedAmount = Number(amountInput) || 0;

  const handleSubmitTopUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setStatusMsg('');
    if (parsedAmount < 10 || parsedAmount > 200000) {
      setError('Enter an amount between Rs 10 and Rs 200,000.');
      return;
    }
    if (!screenshot) {
      setError('Please upload your payment screenshot.');
      return;
    }

    setSubmitting(true);
    try {
      await createWalletTopUpRequest({
        profile,
        amountNpr: parsedAmount,
        paymentMethod: 'esewa',
        screenshotDataUrl: screenshot,
      });
      setScreenshot('');
      setStatusMsg('Wallet load request submitted. Balance updates as soon as admin verifies proof.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit wallet top-up.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Balance Banner */}
      <div className="rounded-3xl bg-[#091224] text-white border border-white/10 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="text-xs font-medium text-slate-300">Available Balance</div>
          <div className="text-3xl font-extrabold font-mono-num text-[#00D2FF]">
            {formatNpr(profile.walletBalance)}
          </div>
          <div className="text-xs text-slate-400">{profile.email}</div>
        </div>
        <div className="rounded-2xl bg-[#0F1B33] border border-white/10 px-4 py-3 text-xs space-y-1">
          <div className="text-slate-400">Pending Load Requests</div>
          <div className="text-base font-bold font-mono-num">
            {topups.filter((t) => t.status === 'pending').length}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Add Money Form */}
        <form
          onSubmit={(e) => void handleSubmitTopUp(e)}
          className="rounded-3xl bg-white dark:bg-[#0F1B33] border border-slate-200 dark:border-white/10 p-6 space-y-4"
        >
          <div className="flex items-center gap-2">
            <PlusCircle className="w-5 h-5 text-[#0B3D91] dark:text-[#00D2FF]" />
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Add Money to Wallet</h3>
          </div>

          <div className="space-y-2">
            <label
              htmlFor="wallet-amount-input"
              className="block text-xs font-semibold text-slate-700 dark:text-slate-200"
            >
              Amount (NPR)
            </label>
            <input
              id="wallet-amount-input"
              type="number"
              min={10}
              max={200000}
              value={amountInput}
              onChange={(e) => setAmountInput(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-[#F2F6FC] dark:bg-[#091224] border border-slate-300 dark:border-white/15 text-slate-900 dark:text-white font-mono-num text-sm focus:outline-none focus:border-[#2186FF]"
            />
            <div className="flex flex-wrap gap-2">
              {PRESET_AMOUNTS.map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setAmountInput(String(amt))}
                  className="px-3 py-1.5 rounded-lg bg-[#F2F6FC] dark:bg-[#091224] border border-slate-200 dark:border-white/10 text-xs font-mono-num font-semibold text-slate-800 dark:text-slate-200 hover:border-[#2186FF]"
                >
                  Rs {amt}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-xl bg-[#0B3D91] dark:bg-[#2186FF] text-white px-3.5 py-2 text-xs font-semibold flex items-center justify-between">
            <span>Payment Method</span>
            <span>eSewa Only</span>
          </div>

          <PaymentQrCard
            method="esewa"
            settings={settings}
            amountNpr={Math.max(10, parsedAmount)}
            reference={`WALLET-${profile.uid.slice(0, 6)}`}
          />

          <ScreenshotUploadCard
            label="eSewa Wallet Load Screenshot"
            value={screenshot}
            onChange={setScreenshot}
          />

          {error && (
            <div className="rounded-xl bg-red-500/10 border border-red-500/30 px-3.5 py-2 text-xs text-red-600 dark:text-red-300">
              {error}
            </div>
          )}
          {statusMsg && (
            <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 px-3.5 py-2 text-xs text-emerald-700 dark:text-emerald-300">
              {statusMsg}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 rounded-xl bg-[#0B3D91] dark:bg-[#2186FF] text-white text-sm font-semibold hover:opacity-95 disabled:opacity-50"
          >
            {submitting ? 'Submitting Request…' : 'Submit Wallet Load Request'}
          </button>
        </form>

        {/* Ledger & Requests */}
        <div className="space-y-4">
          <div className="rounded-3xl bg-white dark:bg-[#0F1B33] border border-slate-200 dark:border-white/10 p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Transaction History
            </h3>
            {transactions.length === 0 ? (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                No wallet transactions recorded yet.
              </p>
            ) : (
              <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                {transactions.map((tx) => {
                  const isCredit = tx.type === 'credit';
                  return (
                    <div
                      key={tx.id}
                      className="flex items-center justify-between gap-3 rounded-xl bg-[#F2F6FC] dark:bg-[#091224] px-3.5 py-2.5"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                            isCredit
                              ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                              : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                          }`}
                        >
                          {isCredit ? (
                            <ArrowDownLeft className="w-4 h-4" />
                          ) : (
                            <ArrowUpRight className="w-4 h-4" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                            {tx.description}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">
                            {timestampToMs(tx.createdAt)
                              ? new Date(timestampToMs(tx.createdAt)).toLocaleDateString()
                              : 'Today'}
                          </div>
                        </div>
                      </div>
                      <div
                        className={`text-xs font-bold font-mono-num shrink-0 ${
                          isCredit
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-slate-900 dark:text-white'
                        }`}
                      >
                        {isCredit ? '+' : '-'}
                        {formatNpr(tx.amountNpr)}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="rounded-3xl bg-white dark:bg-[#0F1B33] border border-slate-200 dark:border-white/10 p-6 space-y-3">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Recent Load Requests
            </h3>
            {topups.length === 0 ? (
              <p className="text-xs text-slate-500 dark:text-slate-400">No wallet top-up requests yet.</p>
            ) : (
              <div className="space-y-2">
                {topups.slice(0, 6).map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between rounded-xl bg-[#F2F6FC] dark:bg-[#091224] px-3.5 py-2.5 text-xs"
                  >
                    <div>
                      <div className="font-semibold text-slate-900 dark:text-white font-mono-num">
                        {formatNpr(item.amountNpr)} · {item.paymentMethod.toUpperCase()}
                      </div>
                      {item.adminNote && (
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">
                          {item.adminNote}
                        </div>
                      )}
                    </div>
                    <span className="font-semibold uppercase text-slate-700 dark:text-slate-200">
                      {item.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
