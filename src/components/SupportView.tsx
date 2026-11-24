import React, { useEffect, useRef, useState } from 'react';
import {
  ChevronDown,
  ExternalLink,
  ImagePlus,
  LifeBuoy,
  MessageCircle,
  Send,
  ZoomIn,
} from 'lucide-react';
import {
  createSupportTicket,
  sendSupportMessage,
  subscribeTicketMessages,
  updateTicketStatus,
} from '../services/firestoreService';
import { compressImageFileToDataUrl } from '../utils/imageUtils';
import { buildWhatsAppUrl } from '../utils/storeLogic';
import type {
  StoreSettings,
  SupportMessage,
  SupportTicket,
  TicketCategory,
  UserProfile,
} from '../types/store';
import { FullscreenZoomModal } from './QrCodeViewer';

interface SupportViewProps {
  profile: UserProfile | null;
  settings: StoreSettings;
  tickets: SupportTicket[];
  onRequireSignIn: () => void;
}

const FAQ_ITEMS = [
  {
    q: 'How long does a Free Fire NP diamond top-up take?',
    a: 'Most eSewa and Wallet orders are verified and credited to your Player UID within 2 to 10 minutes.',
  },
  {
    q: 'What if the Free Fire UID lookup server is busy?',
    a: 'Double-check your numeric Free Fire Player UID carefully and submit your order. Our team verifies UID delivery before sending diamonds.',
  },
  {
    q: 'What if I need help with a submitted order?',
    a: 'Open a support ticket with your Order ID or tap Instant WhatsApp Support so our admin team can assist right away.',
  },
  {
    q: 'How do I reach live support directly?',
    a: 'Tap Instant WhatsApp Support below or open a ticket with your payment screenshot attached.',
  },
];

export const SupportView: React.FC<SupportViewProps> = ({
  profile,
  settings,
  tickets,
  onRequireSignIn,
}) => {
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState<TicketCategory>('order');
  const [initialMessage, setInitialMessage] = useState('');
  const [newAttachment, setNewAttachment] = useState('');
  const [replyText, setReplyText] = useState('');
  const [replyAttachment, setReplyAttachment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [ticketError, setTicketError] = useState('');
  const [pendingTicketId, setPendingTicketId] = useState('');
  const [zoomImg, setZoomImg] = useState('');
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const newFileRef = useRef<HTMLInputElement>(null);
  const replyFileRef = useRef<HTMLInputElement>(null);

  const currentTicket = selectedTicket
    ? tickets.find((t) => t.id === selectedTicket.id) || selectedTicket
    : null;

  useEffect(() => {
    if (pendingTicketId) {
      const created = tickets.find((t) => t.id === pendingTicketId);
      if (created) {
        setSelectedTicket(created);
        setPendingTicketId('');
        return;
      }
    }
    if (!selectedTicket && tickets.length > 0) {
      setSelectedTicket(tickets[0]);
    }
  }, [tickets, selectedTicket, pendingTicketId]);

  useEffect(() => {
    if (!selectedTicket || !profile) {
      setMessages([]);
      return;
    }
    const unsub = subscribeTicketMessages(
      selectedTicket.id,
      selectedTicket.userId,
      false,
      setMessages,
    );
    return () => unsub();
  }, [selectedTicket, profile]);

  const handleAttach = async (file: File | undefined, setter: (val: string) => void) => {
    if (!file) return;
    setTicketError('');
    try {
      const dataUrl = await compressImageFileToDataUrl(file);
      setter(dataUrl);
    } catch (err) {
      setTicketError(err instanceof Error ? err.message : 'Could not process selected image.');
    }
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    setTicketError('');
    if (!profile) {
      onRequireSignIn();
      return;
    }
    if (profile.isBlocked) {
      setTicketError('Your account is currently blocked.');
      return;
    }
    if (!subject.trim() || !initialMessage.trim()) return;
    setSubmitting(true);
    try {
      const id = await createSupportTicket({
        profile,
        subject: subject.trim(),
        category,
        initialMessage: initialMessage.trim(),
        attachmentDataUrl: newAttachment,
      });
      setSubject('');
      setInitialMessage('');
      setNewAttachment('');
      setPendingTicketId(id);
    } catch (err) {
      setTicketError(err instanceof Error ? err.message : 'Failed to create support ticket.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    setTicketError('');
    if (!profile || !currentTicket) return;
    if (!replyText.trim() && !replyAttachment) return;
    setSubmitting(true);
    try {
      await sendSupportMessage({
        ticket: currentTicket,
        senderUid: profile.uid,
        senderEmail: profile.email,
        senderRole: 'user',
        text: replyText.trim(),
        attachmentDataUrl: replyAttachment,
      });
      setReplyText('');
      setReplyAttachment('');
    } catch (err) {
      setTicketError(err instanceof Error ? err.message : 'Failed to send reply.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleTicketStatus = async (status: 'open' | 'closed') => {
    if (!currentTicket) return;
    setTicketError('');
    setSubmitting(true);
    try {
      await updateTicketStatus(
        currentTicket.id,
        status,
        status === 'closed' ? 'Ticket closed by customer' : 'Ticket reopened by customer',
      );
    } catch (err) {
      setTicketError(err instanceof Error ? err.message : 'Failed to update ticket status.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Instant WhatsApp & Email Support */}
      <div className="rounded-3xl bg-white dark:bg-[#0F1B33] border border-slate-200 dark:border-white/10 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            Need Fast Help?
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-300">
            WhatsApp: <span className="font-mono-num font-semibold">{settings.whatsappNumber}</span>
            {' · '}
            Email: {settings.supportEmail}
          </p>
        </div>
        <a
          href={buildWhatsAppUrl(
            settings.whatsappNumber,
            'Hello Diamond Store NP Support, I need help with my top-up.',
          )}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-500 transition-colors shrink-0"
        >
          <MessageCircle className="w-4 h-4" />
          WhatsApp Instant Support
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>

      {/* Tickets + Chat */}
      {!profile ? (
        <div className="rounded-3xl bg-white dark:bg-[#0F1B33] border border-slate-200 dark:border-white/10 p-8 text-center space-y-4">
          <LifeBuoy className="w-10 h-10 mx-auto text-[#0B3D91] dark:text-[#00D2FF]" />
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Support Tickets & Live Chat
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Sign in with Google to open support tickets and chat with photo attachments.
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
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Open New Ticket + Ticket List */}
          <div className="lg:col-span-5 space-y-4">
            <form
              onSubmit={(e) => void handleCreateTicket(e)}
              className="rounded-3xl bg-white dark:bg-[#0F1B33] border border-slate-200 dark:border-white/10 p-5 space-y-3"
            >
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Open Support Ticket
              </h3>
              <input
                type="text"
                required
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Subject (e.g. Delayed order #ord_...)"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#F2F6FC] dark:bg-[#091224] border border-slate-300 dark:border-white/15 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-[#2186FF]"
              />
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as TicketCategory)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#F2F6FC] dark:bg-[#091224] border border-slate-300 dark:border-white/15 text-xs text-slate-900 dark:text-white"
              >
                <option value="order">Order Delivery</option>
                <option value="payment">Payment Issue</option>
                <option value="wallet">Wallet Load</option>
                <option value="account">Account</option>
                <option value="other">Other</option>
              </select>
              <textarea
                required
                rows={3}
                value={initialMessage}
                onChange={(e) => setInitialMessage(e.target.value)}
                placeholder="Describe your issue or share your Player UID..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#F2F6FC] dark:bg-[#091224] border border-slate-300 dark:border-white/15 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-[#2186FF]"
              />
              <input
                ref={newFileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  void handleAttach(e.target.files?.[0], setNewAttachment);
                  e.target.value = '';
                }}
              />
              {newAttachment && (
                <div className="rounded-2xl bg-[#F2F6FC] dark:bg-[#091224] border border-slate-200 dark:border-white/10 p-3 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setZoomImg(newAttachment)}
                    className="rounded-lg overflow-hidden border border-slate-200 dark:border-white/15 shrink-0"
                  >
                    <img
                      src={newAttachment}
                      alt="New ticket attachment preview"
                      className="w-12 h-12 object-cover"
                    />
                  </button>
                  <div className="flex-1 min-w-0 text-xs space-y-0.5">
                    <div className="font-semibold text-emerald-600 dark:text-emerald-400">
                      Photo attached · Tap to zoom
                    </div>
                    <button
                      type="button"
                      onClick={() => setNewAttachment('')}
                      className="text-red-500 underline"
                    >
                      Remove photo
                    </button>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => newFileRef.current?.click()}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#F2F6FC] dark:bg-[#091224] border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-700 dark:text-slate-200"
                >
                  <ImagePlus className="w-4 h-4" />
                  {newAttachment ? 'Change Photo' : 'Attach Photo'}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-[#0B3D91] dark:bg-[#2186FF] text-white text-xs font-semibold disabled:opacity-50"
                >
                  {submitting ? 'Creating…' : 'Create Ticket'}
                </button>
              </div>
              {ticketError && (
                <div className="rounded-xl bg-red-500/10 border border-red-500/30 px-3.5 py-2 text-xs text-red-600 dark:text-red-300">
                  {ticketError}
                </div>
              )}
            </form>

            <div className="rounded-3xl bg-white dark:bg-[#0F1B33] border border-slate-200 dark:border-white/10 p-5 space-y-2.5">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Your Tickets ({tickets.length})
              </h3>
              {tickets.length === 0 ? (
                <p className="text-xs text-slate-500 dark:text-slate-400">No tickets opened yet.</p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {tickets.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setSelectedTicket(t)}
                      className={`w-full text-left rounded-xl p-3 border transition-colors ${
                        currentTicket?.id === t.id
                          ? 'bg-[#0B3D91]/10 dark:bg-[#2186FF]/20 border-[#2186FF]'
                          : 'bg-[#F2F6FC] dark:bg-[#091224] border-slate-200 dark:border-white/10'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {t.subject}
                        </span>
                        <span
                          className={`text-[11px] font-semibold uppercase shrink-0 ${
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
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-1">
                        {t.lastMessage}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Live Chat Thread */}
          <div className="lg:col-span-7 rounded-3xl bg-white dark:bg-[#0F1B33] border border-slate-200 dark:border-white/10 p-5 flex flex-col min-h-[420px]">
            {currentTicket ? (
              <>
                <div className="pb-3 border-b border-slate-200 dark:border-white/10 flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                      {currentTicket.subject}
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      Ticket #{currentTicket.id} · {currentTicket.status.toUpperCase()}
                    </p>
                  </div>
                  {currentTicket.status === 'closed' ? (
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => void handleToggleTicketStatus('open')}
                      className="px-3 py-1.5 rounded-lg bg-[#0B3D91] dark:bg-[#2186FF] text-white text-xs font-semibold disabled:opacity-50 shrink-0"
                    >
                      Reopen Ticket
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => void handleToggleTicketStatus('closed')}
                      className="px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-white/10 text-slate-800 dark:text-slate-200 text-xs font-semibold disabled:opacity-50 shrink-0"
                    >
                      Close Ticket
                    </button>
                  )}
                </div>

                <div className="flex-1 overflow-y-auto py-4 space-y-3 max-h-80">
                  {messages.map((msg) => {
                    const isUser = msg.senderRole === 'user';
                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
                      >
                        <div
                          className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 text-xs space-y-2 ${
                            isUser
                              ? 'bg-[#0B3D91] dark:bg-[#2186FF] text-white'
                              : 'bg-[#F2F6FC] dark:bg-[#091224] text-slate-900 dark:text-white border border-slate-200 dark:border-white/10'
                          }`}
                        >
                          <div className="text-[10px] opacity-75 font-semibold">
                            {isUser ? 'You' : 'Diamond Store Admin'}
                          </div>
                          {msg.text && <p className="whitespace-pre-wrap">{msg.text}</p>}
                          {msg.attachmentDataUrl && (
                            <button
                              type="button"
                              onClick={() => setZoomImg(msg.attachmentDataUrl)}
                              className="relative group block rounded-xl overflow-hidden text-left"
                            >
                              <img
                                src={msg.attachmentDataUrl}
                                alt="Ticket attachment"
                                className="max-h-40 rounded-xl object-cover"
                              />
                              <span className="mt-1 inline-flex items-center gap-1 text-[10px] underline">
                                <ZoomIn className="w-3 h-3" /> Tap to zoom
                              </span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {currentTicket.status === 'closed' ? (
                  <div className="pt-3 border-t border-slate-200 dark:border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 dark:text-slate-300">
                    <span>This ticket is closed. Reopen it to send another message.</span>
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => void handleToggleTicketStatus('open')}
                      className="px-3.5 py-1.5 rounded-lg bg-[#0B3D91] dark:bg-[#2186FF] text-white font-semibold disabled:opacity-50"
                    >
                      Reopen Ticket
                    </button>
                  </div>
                ) : (
                  <form
                    onSubmit={(e) => void handleSendReply(e)}
                    className="pt-3 border-t border-slate-200 dark:border-white/10 space-y-2"
                  >
                    {replyAttachment && (
                      <div className="flex items-center gap-3 text-xs text-emerald-600 dark:text-emerald-400">
                        <button
                          type="button"
                          onClick={() => setZoomImg(replyAttachment)}
                          className="rounded-lg overflow-hidden border border-slate-200 dark:border-white/15 shrink-0"
                        >
                          <img
                            src={replyAttachment}
                            alt="Reply attachment preview"
                            className="w-10 h-10 object-cover"
                          />
                        </button>
                        <span>Photo ready to send</span>
                        <button
                          type="button"
                          onClick={() => setReplyAttachment('')}
                          className="text-red-500 underline"
                        >
                          Remove
                        </button>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <input
                        ref={replyFileRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          void handleAttach(e.target.files?.[0], setReplyAttachment);
                          e.target.value = '';
                        }}
                      />
                      <button
                        type="button"
                        aria-label="Attach photo to reply"
                        onClick={() => replyFileRef.current?.click()}
                        className="p-2.5 rounded-xl bg-[#F2F6FC] dark:bg-[#091224] border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200"
                      >
                        <ImagePlus className="w-4 h-4" />
                      </button>
                      <input
                        type="text"
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder="Write a message..."
                        className="flex-1 px-3.5 py-2.5 rounded-xl bg-[#F2F6FC] dark:bg-[#091224] border border-slate-300 dark:border-white/15 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-[#2186FF]"
                      />
                      <button
                        type="submit"
                        disabled={submitting}
                        aria-label="Send message"
                        className="p-2.5 rounded-xl bg-[#0B3D91] dark:bg-[#2186FF] text-white disabled:opacity-50"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </div>
                  </form>
                )}
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-xs text-slate-500 dark:text-slate-400">
                Select or open a ticket to start live chat with support.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Help & FAQ */}
      <div className="rounded-3xl bg-white dark:bg-[#0F1B33] border border-slate-200 dark:border-white/10 p-6 space-y-3">
        <h3 className="text-base font-bold text-slate-900 dark:text-white">Help & FAQ</h3>
        <div className="divide-y divide-slate-200 dark:divide-white/10">
          {FAQ_ITEMS.map((item, idx) => (
            <div key={item.q} className="py-3">
              <button
                type="button"
                aria-expanded={openFaq === idx}
                onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                className="w-full flex items-center justify-between gap-4 text-left text-sm font-semibold text-slate-900 dark:text-white"
              >
                <span>{item.q}</span>
                <ChevronDown
                  className={`w-4 h-4 shrink-0 transition-transform ${
                    openFaq === idx ? 'rotate-180' : ''
                  }`}
                />
              </button>
              {openFaq === idx && (
                <p className="mt-2 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  {item.a}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      <FullscreenZoomModal
        open={Boolean(zoomImg)}
        title="Support Attachment"
        imageSrc={zoomImg}
        onClose={() => setZoomImg('')}
      />
    </div>
  );
};
