import React, { useEffect, useRef, useState } from 'react';
import {
  Activity,
  ArrowLeft,
  BarChart3,
  Check,
  ImagePlus,
  Megaphone,
  PackageCheck,
  Plus,
  RefreshCw,
  Send,
  Settings,
  ShieldBan,
  Trash2,
  Users,
  X,
  ZoomIn,
} from 'lucide-react';
import {
  adminAdjustUserWallet,
  adminDeleteAnnouncement,
  adminDeleteOrder,
  adminDeletePackage,
  adminDeleteTicket,
  adminDeleteWalletTopUp,
  adminPublishAnnouncement,
  adminReviewWalletTopUp,
  adminSavePackage,
  adminSaveStoreSettings,
  adminSync26Packages,
  adminToggleUserBlock,
  adminUpdateOrderStatus,
  sendSupportMessage,
  subscribeTicketMessages,
  timestampToMs,
  updateTicketStatus,
} from '../services/firestoreService';
import { compressImageFileToDataUrl } from '../utils/imageUtils';
import { computeAnalyticsSummary, formatNpr, getPackageImageUrl } from '../utils/storeLogic';
import type {
  ActivityLog,
  Announcement,
  DiamondPackage,
  OrderStatus,
  PackageCategory,
  StoreSettings,
  SupportMessage,
  SupportTicket,
  TopUpOrder,
  UserProfile,
  WalletTopUp,
} from '../types/store';
import { FullscreenZoomModal } from './QrCodeViewer';
import { ScreenshotUploadCard } from './ScreenshotUploadCard';

interface AdminPanelViewProps {
  adminEmail: string;
  adminUid: string;
  orders: TopUpOrder[];
  topups: WalletTopUp[];
  users: UserProfile[];
  packages: DiamondPackage[];
  tickets: SupportTicket[];
  announcements: Announcement[];
  settings: StoreSettings;
  logs: ActivityLog[];
  onBack: () => void;
}

type AdminSection =
  | 'analytics'
  | 'orders'
  | 'wallet_users'
  | 'packages'
  | 'tickets'
  | 'offers'
  | 'settings_logs';

export const AdminPanelView: React.FC<AdminPanelViewProps> = ({
  adminEmail,
  adminUid,
  orders,
  topups,
  users,
  packages,
  tickets,
  announcements,
  settings,
  logs,
  onBack,
}) => {
  const [section, setSection] = useState<AdminSection>('analytics');
  const [zoomSrc, setZoomSrc] = useState('');
  const [noteMap, setNoteMap] = useState<Record<string, string>>({});
  const [walletDeltaMap, setWalletDeltaMap] = useState<Record<string, string>>({});
  const [walletReasonMap, setWalletReasonMap] = useState<Record<string, string>>({});

  // Package editor state
  const [editingPkg, setEditingPkg] = useState<DiamondPackage | null>(null);
  const [isNewPkg, setIsNewPkg] = useState(false);
  const [savingPkg, setSavingPkg] = useState(false);
  const [pkgError, setPkgError] = useState('');

  // Ticket reply state
  const [activeTicket, setActiveTicket] = useState<SupportTicket | null>(null);
  const [ticketMsgs, setTicketMsgs] = useState<SupportMessage[]>([]);
  const [replyText, setReplyText] = useState('');
  const [replyPhoto, setReplyPhoto] = useState('');
  const [replyBusy, setReplyBusy] = useState(false);
  const ticketFileRef = useRef<HTMLInputElement>(null);

  // Announcement state
  const [annTitle, setAnnTitle] = useState('');
  const [annMessage, setAnnMessage] = useState('');
  const [annBadge, setAnnBadge] = useState('Offer');

  // Settings state
  const [settingsForm, setSettingsForm] = useState<StoreSettings>(settings);
  const [busyMsg, setBusyMsg] = useState('');
  const [actionError, setActionError] = useState('');
  const [confirmDeleteKey, setConfirmDeleteKey] = useState('');
  const [deletingKey, setDeletingKey] = useState('');

  const currentTicket = activeTicket
    ? tickets.find((t) => t.id === activeTicket.id) || activeTicket
    : null;

  useEffect(() => {
    setSettingsForm(settings);
  }, [settings]);

  useEffect(() => {
    if (!activeTicket) {
      setTicketMsgs([]);
      return;
    }
    const unsub = subscribeTicketMessages(
      activeTicket.id,
      activeTicket.userId,
      true,
      setTicketMsgs,
    );
    return () => unsub();
  }, [activeTicket]);

  const analytics = computeAnalyticsSummary(orders, users);

  const flashStatus = (msg: string) => {
    setActionError('');
    setBusyMsg(msg);
    setTimeout(() => setBusyMsg(''), 3000);
  };

  const handleSync26 = async () => {
    setActionError('');
    setPkgError('');
    try {
      await adminSync26Packages(packages);
      flashStatus('Synced all 26 default Free Fire NP packages.');
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to sync 26 packages.');
    }
  };

  const handleSavePkg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPkg) return;
    setPkgError('');
    setActionError('');
    if (!editingPkg.name.trim()) {
      setPkgError('Package name is required.');
      return;
    }
    if (!Number.isFinite(Number(editingPkg.priceNpr)) || Number(editingPkg.priceNpr) <= 0) {
      setPkgError('Price (NPR) must be greater than 0.');
      return;
    }
    setSavingPkg(true);
    try {
      await adminSavePackage(editingPkg, isNewPkg);
      setEditingPkg(null);
      flashStatus('Package saved and synced to store.');
    } catch (err) {
      setPkgError(err instanceof Error ? err.message : 'Failed to save package changes.');
    } finally {
      setSavingPkg(false);
    }
  };

  const handlePublishOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!annTitle.trim() || !annMessage.trim()) return;
    setActionError('');
    try {
      await adminPublishAnnouncement({
        title: annTitle.trim(),
        message: annMessage.trim(),
        badge: annBadge.trim() || 'Offer',
      });
      setAnnTitle('');
      setAnnMessage('');
      flashStatus('Offer broadcast published.');
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to publish broadcast.');
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError('');
    try {
      await adminSaveStoreSettings(settingsForm);
      flashStatus('Store settings updated.');
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to save store settings.');
    }
  };

  const handleAdminReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentTicket || (!replyText.trim() && !replyPhoto)) return;
    setActionError('');
    setReplyBusy(true);
    try {
      await sendSupportMessage({
        ticket: currentTicket,
        senderUid: adminUid,
        senderEmail: adminEmail,
        senderRole: 'admin',
        text: replyText.trim(),
        attachmentDataUrl: replyPhoto,
      });
      setReplyText('');
      setReplyPhoto('');
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to send reply.');
    } finally {
      setReplyBusy(false);
    }
  };

  const handleTicketStatusChange = async (status: 'open' | 'closed') => {
    if (!currentTicket) return;
    setActionError('');
    try {
      await updateTicketStatus(
        currentTicket.id,
        status,
        status === 'closed' ? 'Ticket closed by admin' : 'Ticket reopened by admin',
      );
      flashStatus(status === 'closed' ? 'Ticket closed.' : 'Ticket reopened.');
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to update ticket status.');
    }
  };

  const handleDeleteOrder = async (order: TopUpOrder) => {
    const key = `order:${order.id}`;
    setActionError('');
    setDeletingKey(key);
    try {
      await adminDeleteOrder(order);
      setConfirmDeleteKey('');
      flashStatus(`Order #${order.id} deleted.`);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to delete order.');
    } finally {
      setDeletingKey('');
    }
  };

  const handleDeleteWalletTopUp = async (topup: WalletTopUp) => {
    const key = `topup:${topup.id}`;
    setActionError('');
    setDeletingKey(key);
    try {
      await adminDeleteWalletTopUp(topup);
      setConfirmDeleteKey('');
      flashStatus('Wallet request deleted.');
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to delete wallet request.');
    } finally {
      setDeletingKey('');
    }
  };

  const handleDeleteTicket = async (ticket: SupportTicket) => {
    const key = `ticket:${ticket.id}`;
    setActionError('');
    setDeletingKey(key);
    try {
      await adminDeleteTicket(ticket);
      if (activeTicket?.id === ticket.id) {
        setActiveTicket(null);
      }
      setConfirmDeleteKey('');
      flashStatus('Support ticket deleted.');
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to delete ticket.');
    } finally {
      setDeletingKey('');
    }
  };

  const navItems: { id: AdminSection; label: string; icon: React.ReactNode }[] = [
    { id: 'analytics', label: 'Analytics', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'orders', label: `Orders (${orders.length})`, icon: <PackageCheck className="w-4 h-4" /> },
    { id: 'wallet_users', label: 'Wallet & Users', icon: <Users className="w-4 h-4" /> },
    { id: 'packages', label: 'Packages', icon: <RefreshCw className="w-4 h-4" /> },
    { id: 'tickets', label: `Tickets (${tickets.length})`, icon: <Send className="w-4 h-4" /> },
    { id: 'offers', label: 'Offers', icon: <Megaphone className="w-4 h-4" /> },
    { id: 'settings_logs', label: 'Settings & Logs', icon: <Settings className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-6">
      <div className="rounded-3xl bg-[#091224] text-white border border-[#00D2FF]/30 p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors"
            aria-label="Back to Store"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h2 className="text-lg font-bold">Admin Control Panel</h2>
            <p className="text-xs text-slate-300">Exclusive Console · {adminEmail}</p>
          </div>
        </div>

        {busyMsg && (
          <div className="px-3.5 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-300 text-xs font-semibold">
            {busyMsg}
          </div>
        )}
      </div>

      {/* Admin Sub-Nav */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {navItems.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setSection(item.id)}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
              section === item.id
                ? 'bg-[#0B3D91] dark:bg-[#2186FF] text-white'
                : 'bg-white dark:bg-[#0F1B33] text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-white/10'
            }`}
          >
            {item.icon}
            {item.label}
          </button>
        ))}
      </div>

      {actionError && (
        <div className="rounded-2xl bg-red-500/10 border border-red-500/30 px-4 py-3 text-xs font-semibold text-red-600 dark:text-red-300">
          {actionError}
        </div>
      )}

      {/* 1. Analytics */}
      {section === 'analytics' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-2xl bg-white dark:bg-[#0F1B33] border border-slate-200 dark:border-white/10 p-5 space-y-1">
              <div className="text-xs text-slate-500 dark:text-slate-400">Completed Revenue</div>
              <div className="text-2xl font-extrabold font-mono-num text-[#0B3D91] dark:text-[#00D2FF]">
                {formatNpr(analytics.totalRevenueNpr)}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                {analytics.completedCount} completed orders
              </div>
            </div>
            <div className="rounded-2xl bg-white dark:bg-[#0F1B33] border border-slate-200 dark:border-white/10 p-5 space-y-1">
              <div className="text-xs text-slate-500 dark:text-slate-400">Pending Verification</div>
              <div className="text-2xl font-extrabold font-mono-num text-amber-600 dark:text-amber-400">
                {analytics.pendingCount}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                {analytics.processingCount} processing
              </div>
            </div>
            <div className="rounded-2xl bg-white dark:bg-[#0F1B33] border border-slate-200 dark:border-white/10 p-5 space-y-1">
              <div className="text-xs text-slate-500 dark:text-slate-400">Registered Users</div>
              <div className="text-2xl font-extrabold font-mono-num text-slate-900 dark:text-white">
                {users.length}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                {analytics.blockedUsers} blocked
              </div>
            </div>
            <div className="rounded-2xl bg-white dark:bg-[#0F1B33] border border-slate-200 dark:border-white/10 p-5 space-y-1">
              <div className="text-xs text-slate-500 dark:text-slate-400">Pending Wallet Loads</div>
              <div className="text-2xl font-extrabold font-mono-num text-slate-900 dark:text-white">
                {topups.filter((t) => t.status === 'pending').length}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                {packages.length} active/stored packs
              </div>
            </div>
          </div>

          <div className="rounded-3xl bg-white dark:bg-[#0F1B33] border border-slate-200 dark:border-white/10 p-6 space-y-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Revenue by Category
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {(['diamonds', 'weekly', 'monthly', 'levelup'] as const).map((cat) => (
                <div
                  key={cat}
                  className="rounded-2xl bg-[#F2F6FC] dark:bg-[#091224] p-4 space-y-1"
                >
                  <div className="text-xs uppercase font-semibold text-slate-500 dark:text-slate-400">
                    {cat}
                  </div>
                  <div className="text-lg font-bold font-mono-num text-slate-900 dark:text-white">
                    {formatNpr(analytics.categoryRevenue[cat])}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 2. Orders & Payment Verification */}
      {section === 'orders' && (
        <div className="space-y-4">
          <div className="rounded-2xl bg-white dark:bg-[#0F1B33] border border-slate-200 dark:border-white/10 px-4 py-3 text-xs text-slate-600 dark:text-slate-300 font-mono-num">
            Total: {orders.length} · Pending: {analytics.pendingCount} · Processing: {analytics.processingCount} · Completed: {analytics.completedCount}
          </div>
          {orders.length === 0 ? (
            <div className="rounded-3xl bg-white dark:bg-[#0F1B33] p-8 text-center text-xs text-slate-500">
              No orders submitted yet.
            </div>
          ) : (
            orders.map((order) => (
              <div
                key={order.id}
                className="rounded-2xl bg-white dark:bg-[#0F1B33] border border-slate-200 dark:border-white/10 p-5 space-y-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="text-xs font-mono-num text-slate-500 dark:text-slate-400">
                      #{order.id} · {order.userEmail}
                    </div>
                    <h4 className="text-base font-bold text-slate-900 dark:text-white">
                      {order.packageName} — {formatNpr(order.amountNpr)}
                    </h4>
                    <div className="text-xs font-mono-num text-slate-700 dark:text-slate-300">
                      Player UID: <span className="font-bold">{order.playerUid}</span>
                      {order.playerIgn ? ` · IGN: ${order.playerIgn} (${order.playerRegion})` : ''}
                      {' · '}
                      Method: {order.paymentMethod.toUpperCase()}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {order.screenshotDataUrl && (
                      <button
                        type="button"
                        onClick={() => setZoomSrc(order.screenshotDataUrl)}
                        className="relative group rounded-xl overflow-hidden border border-slate-200 dark:border-white/15"
                      >
                        <img
                          src={order.screenshotDataUrl}
                          alt="Order proof"
                          className="w-16 h-16 object-cover"
                        />
                        <span className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white">
                          <ZoomIn className="w-4 h-4" />
                        </span>
                      </button>
                    )}
                    <span className="px-3 py-1 rounded-lg bg-[#F2F6FC] dark:bg-[#091224] text-xs font-bold uppercase text-slate-800 dark:text-white">
                      {order.status}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-slate-200 dark:border-white/10">
                  <input
                    type="text"
                    value={noteMap[order.id] ?? order.adminNote}
                    onChange={(e) => setNoteMap((m) => ({ ...m, [order.id]: e.target.value }))}
                    placeholder="Admin note (optional)..."
                    className="flex-1 px-3 py-2 rounded-xl bg-[#F2F6FC] dark:bg-[#091224] border border-slate-300 dark:border-white/15 text-xs text-slate-900 dark:text-white"
                  />
                  <div className="flex flex-wrap items-center gap-2">
                    {(['processing', 'completed', 'rejected'] as OrderStatus[]).map((st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() =>
                          void adminUpdateOrderStatus(order, st, noteMap[order.id] ?? order.adminNote)
                        }
                        className={`px-3 py-2 rounded-xl text-xs font-semibold capitalize ${
                          st === 'completed'
                            ? 'bg-emerald-600 text-white'
                            : st === 'rejected'
                              ? 'bg-red-600 text-white'
                              : 'bg-[#2186FF] text-white'
                        }`}
                      >
                        {st === 'completed' ? 'Approve & Complete' : st}
                      </button>
                    ))}
                    {confirmDeleteKey === `order:${order.id}` ? (
                      <>
                        <button
                          type="button"
                          disabled={deletingKey === `order:${order.id}`}
                          onClick={() => void handleDeleteOrder(order)}
                          className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-red-600 text-white text-xs font-semibold disabled:opacity-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          {deletingKey === `order:${order.id}` ? 'Deleting…' : 'Confirm Delete'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteKey('')}
                          className="px-3 py-2 rounded-xl border border-slate-300 dark:border-white/15 text-xs font-semibold"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        aria-label={`Delete order ${order.id}`}
                        onClick={() => setConfirmDeleteKey(`order:${order.id}`)}
                        className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-red-500/15 text-red-600 dark:text-red-400 text-xs font-semibold hover:bg-red-500/25"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* 3. Wallet Top-Ups & User Directory */}
      {section === 'wallet_users' && (
        <div className="space-y-6">
          <div className="rounded-3xl bg-white dark:bg-[#0F1B33] border border-slate-200 dark:border-white/10 p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Wallet Load Requests
            </h3>
            {topups.length === 0 ? (
              <p className="text-xs text-slate-500">No wallet top-up requests.</p>
            ) : (
              <div className="space-y-3">
                {topups.map((item) => {
                  const owner = users.find((u) => u.uid === item.userId);
                  return (
                    <div
                      key={item.id}
                      className="rounded-2xl bg-[#F2F6FC] dark:bg-[#091224] p-4 flex flex-wrap items-center justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <div className="text-xs font-bold text-slate-900 dark:text-white">
                          {item.userEmail} · {formatNpr(item.amountNpr)} ({item.paymentMethod.toUpperCase()})
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">
                          Status: {item.status.toUpperCase()}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setZoomSrc(item.screenshotDataUrl)}
                          className="px-3 py-1.5 rounded-lg bg-white dark:bg-[#0F1B33] border border-slate-200 dark:border-white/10 text-xs font-semibold"
                        >
                          View Proof
                        </button>
                        {item.status === 'pending' && (
                          <>
                            <button
                              type="button"
                              onClick={() =>
                                void adminReviewWalletTopUp(
                                  item,
                                  true,
                                  'Verified',
                                  owner?.walletBalance ?? 0,
                                )
                              }
                              className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold"
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                void adminReviewWalletTopUp(
                                  item,
                                  false,
                                  'Payment proof invalid',
                                  owner?.walletBalance ?? 0,
                                )
                              }
                              className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-semibold"
                            >
                              Reject
                            </button>
                          </>
                        )}
                        {confirmDeleteKey === `topup:${item.id}` ? (
                          <>
                            <button
                              type="button"
                              disabled={deletingKey === `topup:${item.id}`}
                              onClick={() => void handleDeleteWalletTopUp(item)}
                              className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-semibold disabled:opacity-50"
                            >
                              {deletingKey === `topup:${item.id}` ? 'Deleting…' : 'Confirm'}
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteKey('')}
                              className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-white/15 text-xs font-semibold"
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            aria-label={`Delete wallet request ${item.id}`}
                            onClick={() => setConfirmDeleteKey(`topup:${item.id}`)}
                            className="p-1.5 rounded-lg text-red-500 hover:bg-red-500/10"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="rounded-3xl bg-white dark:bg-[#0F1B33] border border-slate-200 dark:border-white/10 p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Users ({users.length})
            </h3>
            <div className="space-y-3">
              {users.map((u) => (
                <div
                  key={u.uid}
                  className="rounded-2xl bg-[#F2F6FC] dark:bg-[#091224] p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                >
                  <div className="space-y-0.5">
                    <div className="text-sm font-bold text-slate-900 dark:text-white">
                      {u.displayName} {u.isBlocked ? '(BLOCKED)' : ''}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      {u.email} · Balance:{' '}
                      <span className="font-mono-num font-bold text-[#0B3D91] dark:text-[#00D2FF]">
                        {formatNpr(u.walletBalance)}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="number"
                      placeholder="Amount (+/-)"
                      value={walletDeltaMap[u.uid] || ''}
                      onChange={(e) =>
                        setWalletDeltaMap((m) => ({ ...m, [u.uid]: e.target.value }))
                      }
                      className="w-28 px-3 py-1.5 rounded-lg bg-white dark:bg-[#0F1B33] border border-slate-300 dark:border-white/15 text-xs font-mono-num"
                    />
                    <input
                      type="text"
                      placeholder="Reason"
                      value={walletReasonMap[u.uid] || ''}
                      onChange={(e) =>
                        setWalletReasonMap((m) => ({ ...m, [u.uid]: e.target.value }))
                      }
                      className="w-36 px-3 py-1.5 rounded-lg bg-white dark:bg-[#0F1B33] border border-slate-300 dark:border-white/15 text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const delta = Number(walletDeltaMap[u.uid] || 0);
                        if (!delta) return;
                        void adminAdjustUserWallet(
                          u,
                          delta,
                          walletReasonMap[u.uid] || 'Admin adjustment',
                        );
                        setWalletDeltaMap((m) => ({ ...m, [u.uid]: '' }));
                      }}
                      className="px-3 py-1.5 rounded-lg bg-[#0B3D91] dark:bg-[#2186FF] text-white text-xs font-semibold"
                    >
                      Apply Wallet
                    </button>
                    <button
                      type="button"
                      onClick={() => void adminToggleUserBlock(u)}
                      className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold ${
                        u.isBlocked
                          ? 'bg-emerald-600 text-white'
                          : 'bg-red-600/15 text-red-600 dark:text-red-400'
                      }`}
                    >
                      <ShieldBan className="w-3.5 h-3.5" />
                      {u.isBlocked ? 'Unblock' : 'Block'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 4. Package CRUD + 1-tap Sync 26 NP Packages */}
      {section === 'packages' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Packages ({packages.length})
            </h3>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => void handleSync26()}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#00D2FF] text-[#040812] text-xs font-bold"
              >
                <RefreshCw className="w-4 h-4" />
                Sync 26 NP Packages
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsNewPkg(true);
                  setEditingPkg({
                    id: `ff_np_${Date.now()}`,
                    name: '',
                    category: 'diamonds',
                    priceNpr: 100,
                    diamondAmount: 100,
                    bonusLabel: 'Instant UID',
                    popular: false,
                    active: true,
                    sortOrder: packages.length + 1,
                    imageUrl: '',
                  });
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0B3D91] dark:bg-[#2186FF] text-white text-xs font-semibold"
              >
                <Plus className="w-4 h-4" />
                Add Package
              </button>
            </div>
          </div>

          {editingPkg && (
            <form
              onSubmit={(e) => void handleSavePkg(e)}
              className="rounded-3xl bg-white dark:bg-[#0F1B33] border border-[#2186FF] p-5 space-y-4"
            >
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  {isNewPkg ? 'New Package' : `Customize ${editingPkg.name}`}
                </h4>
                <button
                  type="button"
                  onClick={() => setEditingPkg(null)}
                  className="p-1 text-slate-400"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <input
                  type="text"
                  required
                  placeholder="Package Name"
                  value={editingPkg.name}
                  onChange={(e) => setEditingPkg({ ...editingPkg, name: e.target.value })}
                  className="px-3 py-2 rounded-xl bg-[#F2F6FC] dark:bg-[#091224] border border-slate-300 dark:border-white/15 text-xs"
                />
                <select
                  value={editingPkg.category}
                  onChange={(e) =>
                    setEditingPkg({ ...editingPkg, category: e.target.value as PackageCategory })
                  }
                  className="px-3 py-2 rounded-xl bg-[#F2F6FC] dark:bg-[#091224] border border-slate-300 dark:border-white/15 text-xs"
                >
                  <option value="diamonds">Diamonds</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="levelup">Level Up Pass</option>
                </select>
                <input
                  type="number"
                  required
                  placeholder="Price NPR"
                  value={editingPkg.priceNpr}
                  onChange={(e) =>
                    setEditingPkg({ ...editingPkg, priceNpr: Number(e.target.value) })
                  }
                  className="px-3 py-2 rounded-xl bg-[#F2F6FC] dark:bg-[#091224] border border-slate-300 dark:border-white/15 text-xs font-mono-num"
                />
                <input
                  type="number"
                  required
                  placeholder="Diamond Amount"
                  value={editingPkg.diamondAmount}
                  onChange={(e) =>
                    setEditingPkg({ ...editingPkg, diamondAmount: Number(e.target.value) })
                  }
                  className="px-3 py-2 rounded-xl bg-[#F2F6FC] dark:bg-[#091224] border border-slate-300 dark:border-white/15 text-xs font-mono-num"
                />
                <input
                  type="text"
                  placeholder="Bonus Label"
                  value={editingPkg.bonusLabel}
                  onChange={(e) => setEditingPkg({ ...editingPkg, bonusLabel: e.target.value })}
                  className="px-3 py-2 rounded-xl bg-[#F2F6FC] dark:bg-[#091224] border border-slate-300 dark:border-white/15 text-xs"
                />
                <label className="flex items-center gap-2 text-xs font-semibold">
                  <input
                    type="checkbox"
                    checked={editingPkg.active}
                    onChange={(e) => setEditingPkg({ ...editingPkg, active: e.target.checked })}
                  />
                  Active in Store
                </label>
              </div>

              <div className="space-y-2">
                <ScreenshotUploadCard
                  label="Package / Diamond Photo"
                  emptyHint="Upload a custom diamond photo (optional — default category diamond art is shown otherwise)"
                  previewAlt={`${editingPkg.name || 'Package'} custom photo`}
                  value={editingPkg.imageUrl || ''}
                  onChange={(dataUrl) => setEditingPkg({ ...editingPkg, imageUrl: dataUrl })}
                />
                {editingPkg.imageUrl && (
                  <button
                    type="button"
                    onClick={() => setEditingPkg({ ...editingPkg, imageUrl: '' })}
                    className="text-xs font-semibold text-slate-600 dark:text-slate-300 hover:underline"
                  >
                    Reset to Default Diamond Photo
                  </button>
                )}
              </div>

              {pkgError && (
                <div className="rounded-xl bg-red-500/10 border border-red-500/30 px-3.5 py-2 text-xs text-red-600 dark:text-red-300">
                  {pkgError}
                </div>
              )}

              <button
                type="submit"
                disabled={savingPkg}
                className="px-4 py-2.5 rounded-xl bg-[#0B3D91] dark:bg-[#2186FF] text-white text-xs font-semibold disabled:opacity-50"
              >
                {savingPkg ? 'Saving…' : 'Save Package'}
              </button>
            </form>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {packages.map((pkg) => (
              <div
                key={pkg.id}
                className="rounded-2xl bg-white dark:bg-[#0F1B33] border border-slate-200 dark:border-white/10 p-4 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={getPackageImageUrl(pkg)}
                    alt={pkg.name}
                    className="w-12 h-12 rounded-xl object-cover border border-slate-200 dark:border-white/15 bg-[#040812] shrink-0"
                  />
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-slate-900 dark:text-white truncate">
                      {pkg.name} {!pkg.active && '(Hidden)'}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 font-mono-num truncate">
                      {pkg.category} · {formatNpr(pkg.priceNpr)} · {pkg.bonusLabel}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setIsNewPkg(false);
                      setPkgError('');
                      setEditingPkg({ ...pkg });
                    }}
                    className="px-3 py-1.5 rounded-lg bg-[#F2F6FC] dark:bg-[#091224] text-xs font-semibold"
                  >
                    Customize
                  </button>
                  <button
                    type="button"
                    aria-label={`Delete ${pkg.name}`}
                    onClick={() => void adminDeletePackage(pkg.id, pkg.name)}
                    className="p-1.5 rounded-lg text-red-500 hover:bg-red-500/10"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. Support Tickets */}
      {section === 'tickets' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-5 space-y-2">
            {tickets.length === 0 ? (
              <div className="rounded-2xl bg-white dark:bg-[#0F1B33] border border-slate-200 dark:border-white/10 p-6 text-center text-xs text-slate-500">
                No support tickets yet.
              </div>
            ) : (
              tickets.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setActiveTicket(t)}
                  className={`w-full text-left rounded-2xl p-4 border ${
                    currentTicket?.id === t.id
                      ? 'bg-[#0B3D91]/10 dark:bg-[#2186FF]/20 border-[#2186FF]'
                      : 'bg-white dark:bg-[#0F1B33] border-slate-200 dark:border-white/10'
                  }`}
                >
                  <div className="flex justify-between gap-2 text-xs font-bold">
                    <span className="truncate">{t.subject}</span>
                    <span
                      className={`uppercase shrink-0 ${
                        t.status === 'closed'
                          ? 'text-slate-400'
                          : t.status === 'answered'
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-[#0B3D91] dark:text-[#00D2FF]'
                      }`}
                    >
                      {t.status}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 truncate">
                    {t.userEmail} · {t.lastMessage}
                  </div>
                </button>
              ))
            )}
          </div>

          <div className="lg:col-span-7 rounded-3xl bg-white dark:bg-[#0F1B33] border border-slate-200 dark:border-white/10 p-5 flex flex-col min-h-[380px]">
            {currentTicket ? (
              <>
                <div className="pb-3 border-b border-slate-200 dark:border-white/10 flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-bold text-sm text-slate-900 dark:text-white truncate">
                      {currentTicket.subject}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      {currentTicket.userEmail} · #{currentTicket.id} · {currentTicket.status.toUpperCase()}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {currentTicket.status === 'closed' ? (
                      <button
                        type="button"
                        onClick={() => void handleTicketStatusChange('open')}
                        className="px-3 py-1.5 rounded-lg bg-[#0B3D91] dark:bg-[#2186FF] text-white text-xs font-semibold shrink-0"
                      >
                        Reopen Ticket
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => void handleTicketStatusChange('closed')}
                        className="px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-white/10 text-slate-800 dark:text-slate-200 text-xs font-semibold shrink-0"
                      >
                        Close Ticket
                      </button>
                    )}
                    {confirmDeleteKey === `ticket:${currentTicket.id}` ? (
                      <>
                        <button
                          type="button"
                          disabled={deletingKey === `ticket:${currentTicket.id}`}
                          onClick={() => void handleDeleteTicket(currentTicket)}
                          className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-semibold disabled:opacity-50"
                        >
                          {deletingKey === `ticket:${currentTicket.id}` ? 'Deleting…' : 'Confirm'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteKey('')}
                          className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-white/15 text-xs font-semibold"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        aria-label={`Delete ticket ${currentTicket.id}`}
                        onClick={() => setConfirmDeleteKey(`ticket:${currentTicket.id}`)}
                        className="p-1.5 rounded-lg text-red-500 hover:bg-red-500/10"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto py-4 space-y-3 max-h-72">
                  {ticketMsgs.map((m) => (
                    <div
                      key={m.id}
                      className={`flex flex-col ${
                        m.senderRole === 'admin' ? 'items-end' : 'items-start'
                      }`}
                    >
                      <div
                        className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 text-xs space-y-1.5 ${
                          m.senderRole === 'admin'
                            ? 'bg-[#2186FF] text-white'
                            : 'bg-[#F2F6FC] dark:bg-[#091224] border border-slate-200 dark:border-white/10'
                        }`}
                      >
                        <div className="text-[10px] opacity-75 font-semibold">
                          {m.senderRole === 'admin' ? 'Admin (You)' : currentTicket.userName || 'Customer'}
                        </div>
                        {m.text && <p className="whitespace-pre-wrap">{m.text}</p>}
                        {m.attachmentDataUrl && (
                          <button
                            type="button"
                            onClick={() => setZoomSrc(m.attachmentDataUrl)}
                            className="block text-left space-y-1"
                          >
                            <img
                              src={m.attachmentDataUrl}
                              alt="Attachment"
                              className="max-h-36 rounded-lg"
                            />
                            <span className="inline-flex items-center gap-1 text-[10px] underline">
                              <ZoomIn className="w-3 h-3" /> Tap to zoom
                            </span>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {replyPhoto && (
                  <div className="pb-2 flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setZoomSrc(replyPhoto)}
                      className="rounded-lg overflow-hidden border border-slate-200 dark:border-white/15"
                    >
                      <img src={replyPhoto} alt="Reply preview" className="w-12 h-12 object-cover" />
                    </button>
                    <div className="text-xs space-y-1">
                      <div className="font-semibold text-emerald-600 dark:text-emerald-400">
                        Photo ready to send
                      </div>
                      <button
                        type="button"
                        onClick={() => setReplyPhoto('')}
                        className="text-red-500 underline"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                )}

                <form
                  onSubmit={(e) => void handleAdminReply(e)}
                  className="flex gap-2 pt-3 border-t border-slate-200 dark:border-white/10"
                >
                  <input
                    ref={ticketFileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={async (e) => {
                      const f = e.target.files?.[0];
                      if (f) {
                        try {
                          setReplyPhoto(await compressImageFileToDataUrl(f));
                        } catch (err) {
                          setActionError(
                            err instanceof Error ? err.message : 'Could not load image.',
                          );
                        }
                      }
                      e.target.value = '';
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => ticketFileRef.current?.click()}
                    className="p-2.5 rounded-xl bg-[#F2F6FC] dark:bg-[#091224] border border-slate-200 dark:border-white/10"
                    aria-label="Attach photo"
                  >
                    <ImagePlus className="w-4 h-4" />
                  </button>
                  <input
                    type="text"
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder={replyPhoto ? 'Photo attached — write reply...' : 'Reply to customer...'}
                    className="flex-1 px-3.5 py-2 rounded-xl bg-[#F2F6FC] dark:bg-[#091224] border border-slate-300 dark:border-white/15 text-xs"
                  />
                  <button
                    type="submit"
                    disabled={replyBusy}
                    className="px-4 py-2 rounded-xl bg-[#0B3D91] dark:bg-[#2186FF] text-white text-xs font-semibold disabled:opacity-50"
                  >
                    {replyBusy ? 'Sending…' : 'Send'}
                  </button>
                </form>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-xs text-slate-500">
                Select a ticket to reply.
              </div>
            )}
          </div>
        </div>
      )}

      {/* 6. Offers & Announcements Broadcast */}
      {section === 'offers' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <form
            onSubmit={(e) => void handlePublishOffer(e)}
            className="rounded-3xl bg-white dark:bg-[#0F1B33] border border-slate-200 dark:border-white/10 p-6 space-y-3"
          >
            <h3 className="text-base font-bold">Broadcast Offer / Announcement</h3>
            <input
              type="text"
              required
              placeholder="Title (e.g. Weekend Bonus 2x Weekly)"
              value={annTitle}
              onChange={(e) => setAnnTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#F2F6FC] dark:bg-[#091224] border border-slate-300 dark:border-white/15 text-xs"
            />
            <input
              type="text"
              placeholder="Label (e.g. Promo, Notice)"
              value={annBadge}
              onChange={(e) => setAnnBadge(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#F2F6FC] dark:bg-[#091224] border border-slate-300 dark:border-white/15 text-xs"
            />
            <textarea
              required
              rows={3}
              placeholder="Announcement details..."
              value={annMessage}
              onChange={(e) => setAnnMessage(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#F2F6FC] dark:bg-[#091224] border border-slate-300 dark:border-white/15 text-xs"
            />
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-[#0B3D91] dark:bg-[#2186FF] text-white text-xs font-semibold"
            >
              Publish Broadcast
            </button>
          </form>

          <div className="rounded-3xl bg-white dark:bg-[#0F1B33] border border-slate-200 dark:border-white/10 p-6 space-y-3">
            <h3 className="text-base font-bold">Active Broadcasts</h3>
            {announcements.map((a) => (
              <div
                key={a.id}
                className="rounded-2xl bg-[#F2F6FC] dark:bg-[#091224] p-4 flex items-start justify-between gap-3"
              >
                <div>
                  <div className="text-xs font-bold">
                    {a.badge} · {a.title}
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">{a.message}</p>
                </div>
                <button
                  type="button"
                  onClick={() => void adminDeleteAnnouncement(a.id)}
                  className="text-red-500 p-1"
                  aria-label="Delete announcement"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 7. Store Settings & Activity Logs */}
      {section === 'settings_logs' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <form
            onSubmit={(e) => void handleSaveSettings(e)}
            className="rounded-3xl bg-white dark:bg-[#0F1B33] border border-slate-200 dark:border-white/10 p-6 space-y-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-base font-bold">Store Theme, eSewa QR & Settings</h3>
              <div className="flex flex-wrap items-center gap-1.5">
                <span
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold ${
                    settingsForm.themeImageUrl
                      ? 'bg-[#2186FF]/15 text-[#0B3D91] dark:text-[#00D2FF]'
                      : 'bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {settingsForm.themeImageUrl ? 'Custom Theme Active' : 'Default Theme'}
                </span>
                <span
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold ${
                    settingsForm.esewaQrImageUrl
                      ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                      : 'bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {settingsForm.esewaQrImageUrl ? 'Custom QR Active' : 'Auto QR Active'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="space-y-1 text-xs">
                <span className="font-semibold">eSewa ID</span>
                <input
                  type="text"
                  value={settingsForm.esewaId}
                  onChange={(e) => setSettingsForm({ ...settingsForm, esewaId: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[#F2F6FC] dark:bg-[#091224] border border-slate-300 dark:border-white/15 font-mono-num"
                />
              </label>
              <label className="space-y-1 text-xs">
                <span className="font-semibold">eSewa Account Name</span>
                <input
                  type="text"
                  value={settingsForm.bankAccountName}
                  onChange={(e) =>
                    setSettingsForm({ ...settingsForm, bankAccountName: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-[#F2F6FC] dark:bg-[#091224] border border-slate-300 dark:border-white/15"
                />
              </label>
              <label className="space-y-1 text-xs">
                <span className="font-semibold">WhatsApp Number</span>
                <input
                  type="text"
                  value={settingsForm.whatsappNumber}
                  onChange={(e) =>
                    setSettingsForm({ ...settingsForm, whatsappNumber: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-[#F2F6FC] dark:bg-[#091224] border border-slate-300 dark:border-white/15 font-mono-num"
                />
              </label>
              <label className="space-y-1 text-xs">
                <span className="font-semibold">Support Email</span>
                <input
                  type="email"
                  value={settingsForm.supportEmail}
                  onChange={(e) =>
                    setSettingsForm({ ...settingsForm, supportEmail: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-[#F2F6FC] dark:bg-[#091224] border border-slate-300 dark:border-white/15"
                />
              </label>
            </div>

            <div className="space-y-2 pt-1">
              <ScreenshotUploadCard
                label="Custom Theme Photo (Store Background)"
                emptyHint="Upload a custom theme photo for the store (applied cleanly behind the storefront; default theme color is used if empty)"
                previewAlt="Custom store theme photo preview"
                value={settingsForm.themeImageUrl || ''}
                onChange={(dataUrl) =>
                  setSettingsForm({ ...settingsForm, themeImageUrl: dataUrl })
                }
              />
              {settingsForm.themeImageUrl && (
                <button
                  type="button"
                  onClick={() => setSettingsForm({ ...settingsForm, themeImageUrl: '' })}
                  className="text-xs font-semibold text-slate-600 dark:text-slate-300 hover:underline"
                >
                  Reset to Default Store Theme
                </button>
              )}
            </div>

            <div className="space-y-2 pt-1">
              <ScreenshotUploadCard
                label="Custom eSewa Payment QR Image"
                emptyHint="Upload your real eSewa QR screenshot or photo (customers will scan this QR in Checkout & Wallet; auto-generated QR is used if empty)"
                previewAlt="Custom eSewa payment QR preview"
                value={settingsForm.esewaQrImageUrl || ''}
                onChange={(dataUrl) =>
                  setSettingsForm({ ...settingsForm, esewaQrImageUrl: dataUrl })
                }
              />
              {settingsForm.esewaQrImageUrl && (
                <button
                  type="button"
                  onClick={() => setSettingsForm({ ...settingsForm, esewaQrImageUrl: '' })}
                  className="text-xs font-semibold text-slate-600 dark:text-slate-300 hover:underline"
                >
                  Reset to Auto-Generated eSewa QR
                </button>
              )}
            </div>

            <label className="flex items-center gap-2 text-xs font-semibold pt-1">
              <input
                type="checkbox"
                checked={settingsForm.maintenanceMode}
                onChange={(e) =>
                  setSettingsForm({ ...settingsForm, maintenanceMode: e.target.checked })
                }
              />
              Enable Maintenance Mode
            </label>
            <input
              type="text"
              value={settingsForm.maintenanceMessage}
              onChange={(e) =>
                setSettingsForm({ ...settingsForm, maintenanceMessage: e.target.value })
              }
              className="w-full px-3 py-2 rounded-xl bg-[#F2F6FC] dark:bg-[#091224] border border-slate-300 dark:border-white/15 text-xs"
            />
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0B3D91] dark:bg-[#2186FF] text-white text-xs font-semibold"
            >
              <Check className="w-4 h-4" />
              Save Store Settings
            </button>
          </form>

          <div className="rounded-3xl bg-white dark:bg-[#0F1B33] border border-slate-200 dark:border-white/10 p-6 space-y-3">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#00D2FF]" />
              <h3 className="text-base font-bold">Activity Logs</h3>
            </div>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="rounded-xl bg-[#F2F6FC] dark:bg-[#091224] px-3.5 py-2.5 text-xs"
                >
                  <div className="font-bold text-slate-900 dark:text-white">{log.action}</div>
                  <div className="text-slate-600 dark:text-slate-300">{log.details}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    {timestampToMs(log.createdAt)
                      ? new Date(timestampToMs(log.createdAt)).toLocaleString()
                      : 'Just now'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <FullscreenZoomModal
        open={Boolean(zoomSrc)}
        title="Payment Proof Inspection"
        imageSrc={zoomSrc}
        onClose={() => setZoomSrc('')}
      />
    </div>
  );
};
