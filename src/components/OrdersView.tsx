import React, { useState } from 'react';
import {
  Check,
  Clock,
  Copy,
  FileText,
  Receipt,
  Share2,
  X,
  XCircle,
  ZoomIn,
} from 'lucide-react';
import { timestampToMs } from '../services/firestoreService';
import { formatNpr } from '../utils/storeLogic';
import type { OrderStatus, TopUpOrder } from '../types/store';
import { FullscreenZoomModal } from './QrCodeViewer';

interface OrdersViewProps {
  orders: TopUpOrder[];
  signedIn: boolean;
  onRequireSignIn: () => void;
}

const TIMELINE_STEPS: { key: OrderStatus; label: string }[] = [
  { key: 'pending', label: 'Order Placed' },
  { key: 'processing', label: 'Verifying & Topping Up' },
  { key: 'completed', label: 'Diamonds Delivered' },
];

export const OrdersView: React.FC<OrdersViewProps> = ({
  orders,
  signedIn,
  onRequireSignIn,
}) => {
  const [receiptOrder, setReceiptOrder] = useState<TopUpOrder | null>(null);
  const [zoomImg, setZoomImg] = useState<string>('');
  const [copiedId, setCopiedId] = useState('');

  if (!signedIn) {
    return (
      <div className="rounded-3xl bg-white dark:bg-[#0F1B33] border border-slate-200 dark:border-white/10 p-8 text-center space-y-4">
        <Receipt className="w-10 h-10 mx-auto text-[#0B3D91] dark:text-[#00D2FF]" />
        <div className="space-y-1">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Your Top-Up Orders</h2>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Sign in with Google to view live order timelines and share receipts.
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

  const handleCopyReceipt = async (order: TopUpOrder) => {
    const text = [
      'Diamond Store NP — Top-Up Receipt',
      `Order ID: ${order.id}`,
      `Package: ${order.packageName}`,
      `Amount: ${formatNpr(order.amountNpr)}`,
      `Player UID: ${order.playerUid}${order.playerIgn ? ` (${order.playerIgn})` : ''}`,
      `Payment: ${order.paymentMethod.toUpperCase()}`,
      `Status: ${order.status.toUpperCase()}`,
    ].join('\n');
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(order.id);
      setTimeout(() => setCopiedId(''), 2000);
    } catch {
      // Fallback ignored if clipboard blocked
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Orders & Status</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {orders.length} total orders · Live status updates
          </p>
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="rounded-3xl bg-white dark:bg-[#0F1B33] border border-slate-200 dark:border-white/10 p-8 text-center space-y-2">
          <FileText className="w-9 h-9 mx-auto text-slate-400" />
          <div className="text-sm font-semibold text-slate-900 dark:text-white">No orders yet</div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Select a Free Fire NP diamond package from Home to place your first top-up.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const ms = timestampToMs(order.createdAt);
            const dateStr = ms ? new Date(ms).toLocaleString() : 'Just now';
            const terminalNegative = order.status === 'cancelled' || order.status === 'rejected';
            const stepIndex =
              order.status === 'completed'
                ? 2
                : order.status === 'processing'
                  ? 1
                  : 0;

            return (
              <article
                key={order.id}
                className="rounded-2xl bg-white dark:bg-[#0F1B33] border border-slate-200 dark:border-white/10 p-5 space-y-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-mono-num">
                      <span>#{order.id}</span>
                      <span>·</span>
                      <span>{dateStr}</span>
                    </div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      {order.packageName}
                    </h3>
                    <div className="text-xs text-slate-600 dark:text-slate-300 font-mono-num">
                      UID: {order.playerUid}
                      {order.playerIgn ? ` · ${order.playerIgn} (${order.playerRegion})` : ''}
                      {' · '}
                      {order.paymentMethod.toUpperCase()}
                    </div>
                  </div>

                  <div className="text-right space-y-1">
                    <div className="text-base font-bold font-mono-num text-[#0B3D91] dark:text-[#00D2FF]">
                      {formatNpr(order.amountNpr)}
                    </div>
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-700 dark:text-slate-200">
                      {order.status}
                    </div>
                  </div>
                </div>

                {/* Live Status Timeline */}
                {terminalNegative ? (
                  <div className="rounded-xl bg-red-500/10 border border-red-500/25 px-3.5 py-2.5 flex items-center gap-2 text-xs text-red-700 dark:text-red-300">
                    <XCircle className="w-4 h-4 shrink-0" />
                    <span>
                      Order {order.status}
                      {order.adminNote ? ` — ${order.adminNote}` : ''}
                    </span>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-2 pt-1">
                    {TIMELINE_STEPS.map((step, idx) => {
                      const reached = idx <= stepIndex;
                      return (
                        <div key={step.key} className="space-y-1.5">
                          <div
                            className={`h-1.5 rounded-full ${
                              reached
                                ? 'bg-[#0B3D91] dark:bg-[#00D2FF]'
                                : 'bg-slate-200 dark:bg-white/10'
                            }`}
                          />
                          <div className="flex items-center gap-1 text-[11px] font-medium text-slate-600 dark:text-slate-300">
                            {reached ? (
                              <Check className="w-3 h-3 text-[#0B3D91] dark:text-[#00D2FF]" />
                            ) : (
                              <Clock className="w-3 h-3 text-slate-400" />
                            )}
                            <span className="truncate">{step.label}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {order.adminNote && !terminalNegative && (
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    Admin Note: {order.adminNote}
                  </p>
                )}

                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-white/10">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setReceiptOrder(order)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#F2F6FC] dark:bg-[#091224] text-slate-800 dark:text-slate-200 text-xs font-semibold hover:bg-slate-200 dark:hover:bg-white/10"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      Share Receipt
                    </button>
                    {order.screenshotDataUrl && (
                      <button
                        type="button"
                        onClick={() => setZoomImg(order.screenshotDataUrl)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#F2F6FC] dark:bg-[#091224] text-slate-800 dark:text-slate-200 text-xs font-semibold"
                      >
                        <ZoomIn className="w-3.5 h-3.5" />
                        Proof
                      </button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Shareable Receipt Dialog */}
      {receiptOrder && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Order Receipt"
          className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4"
        >
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-[#0F1B33] border border-slate-200 dark:border-white/10 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Diamond Store NP Receipt
              </h3>
              <button
                type="button"
                aria-label="Close receipt"
                onClick={() => setReceiptOrder(null)}
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="rounded-2xl bg-[#F2F6FC] dark:bg-[#091224] border border-slate-200 dark:border-white/10 p-4 space-y-2.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Order ID</span>
                <span className="font-mono-num font-semibold text-slate-900 dark:text-white">
                  {receiptOrder.id}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Package</span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {receiptOrder.packageName}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Player UID</span>
                <span className="font-mono-num font-semibold text-slate-900 dark:text-white">
                  {receiptOrder.playerUid}
                </span>
              </div>
              {receiptOrder.playerIgn && (
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Verified IGN</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    {receiptOrder.playerIgn}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Payment</span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {receiptOrder.paymentMethod.toUpperCase()}
                </span>
              </div>
              <div className="flex justify-between pt-2 border-t border-slate-200 dark:border-white/10">
                <span className="text-slate-500 dark:text-slate-400">Total Paid</span>
                <span className="font-mono-num font-bold text-sm text-[#0B3D91] dark:text-[#00D2FF]">
                  {formatNpr(receiptOrder.amountNpr)}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => void handleCopyReceipt(receiptOrder)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#0B3D91] dark:bg-[#2186FF] text-white text-sm font-semibold"
            >
              <Copy className="w-4 h-4" />
              {copiedId === receiptOrder.id ? 'Copied Receipt Text' : 'Copy Receipt'}
            </button>
          </div>
        </div>
      )}

      <FullscreenZoomModal
        open={Boolean(zoomImg)}
        title="Order Payment Proof"
        imageSrc={zoomImg}
        onClose={() => setZoomImg('')}
      />
    </div>
  );
};
