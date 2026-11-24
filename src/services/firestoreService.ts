import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type Timestamp,
} from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { db, handleFirestoreError, OperationType } from '../firebase';
import {
  ADMIN_EMAIL,
  DEFAULT_NP_PACKAGES,
  DEFAULT_STORE_SETTINGS,
  buildSanitizedPackageRecord,
  buildSanitizedStoreSettings,
  mergeRecentUids,
} from '../utils/storeLogic';
import type {
  ActivityLog,
  Announcement,
  DiamondPackage,
  NotificationItem,
  OrderStatus,
  PaymentMethod,
  StoreSettings,
  SupportMessage,
  SupportTicket,
  TicketCategory,
  TicketStatus,
  TopUpOrder,
  TopUpPaymentMethod,
  UserProfile,
  WalletTopUp,
  WalletTransaction,
} from '../types/store';

function makeId(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}_${Date.now()}_${rand}`.replace(/[^a-zA-Z0-9_-]/g, '');
}

export function timestampToMs(ts: unknown): number {
  if (!ts) return 0;
  if (typeof ts === 'number') return ts;
  if (typeof ts === 'object' && ts !== null && 'toMillis' in ts) {
    return (ts as Timestamp).toMillis();
  }
  if (typeof ts === 'object' && ts !== null && 'seconds' in ts) {
    return Number((ts as { seconds: number }).seconds) * 1000;
  }
  return 0;
}

export async function ensureUserProfile(authUser: User): Promise<UserProfile> {
  const ref = doc(db, 'users', authUser.uid);
  try {
    const snap = await getDoc(ref);
    if (snap.exists()) {
      return snap.data() as UserProfile;
    }
    const newProfile: UserProfile = {
      uid: authUser.uid,
      email: authUser.email || '',
      displayName: (authUser.displayName || authUser.email?.split('@')[0] || 'Player').slice(0, 80),
      phone: '',
      defaultUid: '',
      recentUids: [],
      walletBalance: 0,
      isBlocked: false,
      darkMode: true,
      language: 'en',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    await setDoc(ref, newProfile);
    return newProfile;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `users/${authUser.uid}`);
  }
}

export async function updateUserPreferences(
  uid: string,
  patch: Partial<Pick<UserProfile, 'displayName' | 'phone' | 'defaultUid' | 'recentUids' | 'darkMode' | 'language'>>,
) {
  const ref = doc(db, 'users', uid);
  try {
    await updateDoc(ref, {
      ...patch,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `users/${uid}`);
  }
}

export function subscribePublicPackages(
  isAdmin: boolean,
  onData: (packages: DiamondPackage[]) => void,
) {
  const q = isAdmin
    ? query(collection(db, 'packages'))
    : query(collection(db, 'packages'), where('active', '==', true));

  return onSnapshot(
    q,
    (snap) => {
      if (snap.empty && !isAdmin) {
        onData(DEFAULT_NP_PACKAGES);
        return;
      }
      const list = snap.docs.map((d) => d.data() as DiamondPackage);
      if (list.length === 0) {
        onData(DEFAULT_NP_PACKAGES);
      } else {
        onData(list.sort((a, b) => a.sortOrder - b.sortOrder));
      }
    },
    (err) => handleFirestoreError(err, OperationType.LIST, 'packages'),
  );
}

export function subscribeStoreSettings(onData: (settings: StoreSettings) => void) {
  return onSnapshot(
    doc(db, 'store_settings', 'public'),
    (snap) => {
      if (!snap.exists()) {
        onData(DEFAULT_STORE_SETTINGS);
        return;
      }
      onData({ ...DEFAULT_STORE_SETTINGS, ...(snap.data() as Partial<StoreSettings>) });
    },
    (err) => handleFirestoreError(err, OperationType.GET, 'store_settings/public'),
  );
}

export function subscribeAnnouncements(
  isAdmin: boolean,
  onData: (items: Announcement[]) => void,
) {
  const q = isAdmin
    ? query(collection(db, 'announcements'))
    : query(collection(db, 'announcements'), where('active', '==', true));
  return onSnapshot(
    q,
    (snap) => {
      const items = snap.docs.map((d) => d.data() as Announcement);
      onData(items.sort((a, b) => timestampToMs(b.createdAt) - timestampToMs(a.createdAt)));
    },
    (err) => handleFirestoreError(err, OperationType.LIST, 'announcements'),
  );
}

export function subscribeUserProfile(uid: string, onData: (profile: UserProfile | null) => void) {
  return onSnapshot(
    doc(db, 'users', uid),
    (snap) => {
      onData(snap.exists() ? (snap.data() as UserProfile) : null);
    },
    (err) => handleFirestoreError(err, OperationType.GET, `users/${uid}`),
  );
}

export function subscribeUserOrders(uid: string, onData: (orders: TopUpOrder[]) => void) {
  const q = query(collection(db, 'orders'), where('userId', '==', uid));
  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs.map((d) => d.data() as TopUpOrder);
      onData(list.sort((a, b) => timestampToMs(b.createdAt) - timestampToMs(a.createdAt)));
    },
    (err) => handleFirestoreError(err, OperationType.LIST, 'orders'),
  );
}

export function subscribeUserWalletTopUps(uid: string, onData: (items: WalletTopUp[]) => void) {
  const q = query(collection(db, 'wallet_topups'), where('userId', '==', uid));
  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs.map((d) => d.data() as WalletTopUp);
      onData(list.sort((a, b) => timestampToMs(b.createdAt) - timestampToMs(a.createdAt)));
    },
    (err) => handleFirestoreError(err, OperationType.LIST, 'wallet_topups'),
  );
}

export function subscribeUserWalletTransactions(
  uid: string,
  onData: (items: WalletTransaction[]) => void,
) {
  const q = query(collection(db, 'wallet_transactions'), where('userId', '==', uid));
  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs.map((d) => d.data() as WalletTransaction);
      onData(list.sort((a, b) => timestampToMs(b.createdAt) - timestampToMs(a.createdAt)));
    },
    (err) => handleFirestoreError(err, OperationType.LIST, 'wallet_transactions'),
  );
}

export function subscribeUserTickets(uid: string, onData: (tickets: SupportTicket[]) => void) {
  const q = query(collection(db, 'support_tickets'), where('userId', '==', uid));
  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs.map((d) => d.data() as SupportTicket);
      onData(list.sort((a, b) => timestampToMs(b.updatedAt) - timestampToMs(a.updatedAt)));
    },
    (err) => handleFirestoreError(err, OperationType.LIST, 'support_tickets'),
  );
}

export function subscribeTicketMessages(
  ticketId: string,
  ticketOwnerId: string,
  isAdmin: boolean,
  onData: (messages: SupportMessage[]) => void,
) {
  const colRef = collection(db, 'support_tickets', ticketId, 'messages');
  const q = isAdmin ? query(colRef) : query(colRef, where('ticketOwnerId', '==', ticketOwnerId));
  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs.map((d) => d.data() as SupportMessage);
      onData(list.sort((a, b) => timestampToMs(a.createdAt) - timestampToMs(b.createdAt)));
    },
    (err) => handleFirestoreError(err, OperationType.LIST, `support_tickets/${ticketId}/messages`),
  );
}

export function subscribeUserNotifications(
  uid: string,
  onData: (items: NotificationItem[]) => void,
) {
  let personal: NotificationItem[] = [];
  let globalItems: NotificationItem[] = [];

  const emit = () => {
    const merged = [...personal, ...globalItems];
    merged.sort((a, b) => timestampToMs(b.createdAt) - timestampToMs(a.createdAt));
    onData(merged);
  };

  const unsubPersonal = onSnapshot(
    query(collection(db, 'notifications'), where('userId', '==', uid)),
    (snap) => {
      personal = snap.docs.map((d) => d.data() as NotificationItem);
      emit();
    },
    (err) => handleFirestoreError(err, OperationType.LIST, 'notifications'),
  );

  const unsubGlobal = onSnapshot(
    query(collection(db, 'notifications'), where('userId', '==', 'all')),
    (snap) => {
      globalItems = snap.docs.map((d) => d.data() as NotificationItem);
      emit();
    },
    (err) => handleFirestoreError(err, OperationType.LIST, 'notifications'),
  );

  return () => {
    unsubPersonal();
    unsubGlobal();
  };
}

export async function createTopUpOrder(params: {
  profile: UserProfile;
  pkg: DiamondPackage;
  playerUid: string;
  playerIgn: string;
  playerRegion: string;
  ignVerified: boolean;
  paymentMethod: PaymentMethod;
  screenshotDataUrl: string;
}): Promise<string> {
  const { profile, pkg, playerUid, playerIgn, playerRegion, ignVerified, paymentMethod, screenshotDataUrl } =
    params;
  const orderId = makeId('ord');
  const orderRef = doc(db, 'orders', orderId);
  const userRef = doc(db, 'users', profile.uid);
  const nextRecent = mergeRecentUids(profile.recentUids || [], playerUid);

  const orderDoc: TopUpOrder = {
    id: orderId,
    userId: profile.uid,
    userEmail: profile.email,
    userName: profile.displayName.slice(0, 80),
    packageId: pkg.id,
    packageName: pkg.name.slice(0, 100),
    category: pkg.category,
    amountNpr: pkg.priceNpr,
    playerUid,
    playerIgn: playerIgn.slice(0, 64),
    playerRegion: playerRegion.slice(0, 16),
    ignVerified,
    paymentMethod,
    screenshotDataUrl: paymentMethod === 'wallet' ? '' : screenshotDataUrl,
    status: 'pending',
    adminNote: '',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  try {
    const batch = writeBatch(db);
    batch.set(orderRef, orderDoc);

    if (paymentMethod === 'wallet') {
      if (profile.walletBalance < pkg.priceNpr) {
        throw new Error('Insufficient wallet balance.');
      }
      const nextBalance = profile.walletBalance - pkg.priceNpr;
      batch.update(userRef, {
        walletBalance: nextBalance,
        recentUids: nextRecent,
        defaultUid: profile.defaultUid || playerUid,
        updatedAt: serverTimestamp(),
      });
      const txId = makeId('tx');
      const txDoc: WalletTransaction = {
        id: txId,
        userId: profile.uid,
        type: 'debit',
        amountNpr: pkg.priceNpr,
        description: `Top-Up: ${pkg.name} (UID ${playerUid})`,
        referenceId: orderId,
        createdAt: serverTimestamp(),
      };
      batch.set(doc(db, 'wallet_transactions', txId), txDoc);
    } else {
      batch.update(userRef, {
        recentUids: nextRecent,
        defaultUid: profile.defaultUid || playerUid,
        updatedAt: serverTimestamp(),
      });
    }

    await batch.commit();
    return orderId;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `orders/${orderId}`);
  }
}

export async function createWalletTopUpRequest(params: {
  profile: UserProfile;
  amountNpr: number;
  paymentMethod: TopUpPaymentMethod;
  screenshotDataUrl: string;
}): Promise<string> {
  const topupId = makeId('wt');
  const docData: WalletTopUp = {
    id: topupId,
    userId: params.profile.uid,
    userEmail: params.profile.email,
    userName: params.profile.displayName.slice(0, 80),
    amountNpr: params.amountNpr,
    paymentMethod: params.paymentMethod,
    screenshotDataUrl: params.screenshotDataUrl,
    status: 'pending',
    adminNote: '',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  try {
    await setDoc(doc(db, 'wallet_topups', topupId), docData);
    return topupId;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `wallet_topups/${topupId}`);
  }
}

export async function createSupportTicket(params: {
  profile: UserProfile;
  subject: string;
  category: TicketCategory;
  initialMessage: string;
  attachmentDataUrl: string;
}): Promise<string> {
  const ticketId = makeId('tkt');
  const msgId = makeId('msg');
  const batch = writeBatch(db);

  const ticketDoc: SupportTicket = {
    id: ticketId,
    userId: params.profile.uid,
    userEmail: params.profile.email,
    userName: params.profile.displayName.slice(0, 80),
    subject: params.subject.slice(0, 140),
    category: params.category,
    status: 'open',
    lastMessage: params.initialMessage.slice(0, 500),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const msgDoc: SupportMessage = {
    id: msgId,
    ticketOwnerId: params.profile.uid,
    senderId: params.profile.uid,
    senderEmail: params.profile.email,
    senderRole: 'user',
    text: params.initialMessage.slice(0, 1500),
    attachmentDataUrl: params.attachmentDataUrl,
    createdAt: serverTimestamp(),
  };

  try {
    batch.set(doc(db, 'support_tickets', ticketId), ticketDoc);
    batch.set(doc(db, 'support_tickets', ticketId, 'messages', msgId), msgDoc);
    await batch.commit();
    return ticketId;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `support_tickets/${ticketId}`);
  }
}

export async function sendSupportMessage(params: {
  ticket: SupportTicket;
  senderUid: string;
  senderEmail: string;
  senderRole: 'user' | 'admin';
  text: string;
  attachmentDataUrl: string;
}) {
  const msgId = makeId('msg');
  const batch = writeBatch(db);

  const msgDoc: SupportMessage = {
    id: msgId,
    ticketOwnerId: params.ticket.userId,
    senderId: params.senderUid,
    senderEmail: params.senderEmail,
    senderRole: params.senderRole,
    text: params.text.slice(0, 1500),
    attachmentDataUrl: params.attachmentDataUrl,
    createdAt: serverTimestamp(),
  };

  const nextStatus: TicketStatus = params.senderRole === 'admin' ? 'answered' : 'open';

  try {
    batch.set(doc(db, 'support_tickets', params.ticket.id, 'messages', msgId), msgDoc);
    batch.update(doc(db, 'support_tickets', params.ticket.id), {
      status: nextStatus,
      lastMessage: (params.text || 'Photo attachment').slice(0, 500),
      updatedAt: serverTimestamp(),
    });
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `support_tickets/${params.ticket.id}/messages/${msgId}`);
  }
}

export async function updateTicketStatus(
  ticketId: string,
  status: TicketStatus,
  lastMessage: string,
) {
  try {
    await updateDoc(doc(db, 'support_tickets', ticketId), {
      status,
      lastMessage: lastMessage.slice(0, 500),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `support_tickets/${ticketId}`);
  }
}

export async function markNotificationRead(notifId: string) {
  try {
    await updateDoc(doc(db, 'notifications', notifId), { read: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `notifications/${notifId}`);
  }
}

// --- Admin Operations (rc0470638@gmail.com enforced in Firestore rules) ---

export function subscribeAdminCollections(callbacks: {
  onOrders: (orders: TopUpOrder[]) => void;
  onTopUps: (topups: WalletTopUp[]) => void;
  onUsers: (users: UserProfile[]) => void;
  onTickets: (tickets: SupportTicket[]) => void;
  onLogs: (logs: ActivityLog[]) => void;
}) {
  const unsubOrders = onSnapshot(
    collection(db, 'orders'),
    (snap) => {
      const list = snap.docs.map((d) => d.data() as TopUpOrder);
      callbacks.onOrders(list.sort((a, b) => timestampToMs(b.createdAt) - timestampToMs(a.createdAt)));
    },
    (err) => handleFirestoreError(err, OperationType.LIST, 'orders'),
  );

  const unsubTopUps = onSnapshot(
    collection(db, 'wallet_topups'),
    (snap) => {
      const list = snap.docs.map((d) => d.data() as WalletTopUp);
      callbacks.onTopUps(list.sort((a, b) => timestampToMs(b.createdAt) - timestampToMs(a.createdAt)));
    },
    (err) => handleFirestoreError(err, OperationType.LIST, 'wallet_topups'),
  );

  const unsubUsers = onSnapshot(
    collection(db, 'users'),
    (snap) => {
      const list = snap.docs.map((d) => d.data() as UserProfile);
      callbacks.onUsers(list.sort((a, b) => timestampToMs(b.createdAt) - timestampToMs(a.createdAt)));
    },
    (err) => handleFirestoreError(err, OperationType.LIST, 'users'),
  );

  const unsubTickets = onSnapshot(
    collection(db, 'support_tickets'),
    (snap) => {
      const list = snap.docs.map((d) => d.data() as SupportTicket);
      callbacks.onTickets(list.sort((a, b) => timestampToMs(b.updatedAt) - timestampToMs(a.updatedAt)));
    },
    (err) => handleFirestoreError(err, OperationType.LIST, 'support_tickets'),
  );

  const unsubLogs = onSnapshot(
    collection(db, 'activity_logs'),
    (snap) => {
      const list = snap.docs.map((d) => d.data() as ActivityLog);
      callbacks.onLogs(list.sort((a, b) => timestampToMs(b.createdAt) - timestampToMs(a.createdAt)));
    },
    (err) => handleFirestoreError(err, OperationType.LIST, 'activity_logs'),
  );

  return () => {
    unsubOrders();
    unsubTopUps();
    unsubUsers();
    unsubTickets();
    unsubLogs();
  };
}

export async function adminSync26Packages(existingPackages: DiamondPackage[] = []) {
  try {
    const existingImageMap = new Map(
      existingPackages.map((item) => [item.id, item.imageUrl || '']),
    );
    const batch = writeBatch(db);
    for (const pkg of DEFAULT_NP_PACKAGES) {
      const sanitized = buildSanitizedPackageRecord({
        ...pkg,
        imageUrl: existingImageMap.get(pkg.id) || '',
      });
      batch.set(doc(db, 'packages', sanitized.id), {
        ...sanitized,
        updatedAt: serverTimestamp(),
      });
    }
    const logId = makeId('log');
    batch.set(doc(db, 'activity_logs', logId), {
      id: logId,
      adminEmail: ADMIN_EMAIL,
      action: 'SYNC_26_PACKAGES',
      targetType: 'packages',
      targetId: 'all_26',
      details: 'Synced 26 default Free Fire NP packages',
      createdAt: serverTimestamp(),
    });
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'packages');
  }
}

export async function adminSavePackage(pkg: DiamondPackage, isNew: boolean) {
  const sanitized = buildSanitizedPackageRecord(pkg, makeId('pkg'));
  try {
    const existingSnap = await getDocs(collection(db, 'packages'));
    const batch = writeBatch(db);

    if (existingSnap.empty) {
      for (const defPkg of DEFAULT_NP_PACKAGES) {
        if (defPkg.id === sanitized.id) continue;
        const cleanDef = buildSanitizedPackageRecord(defPkg);
        batch.set(doc(db, 'packages', cleanDef.id), {
          ...cleanDef,
          updatedAt: serverTimestamp(),
        });
      }
    }

    batch.set(doc(db, 'packages', sanitized.id), {
      ...sanitized,
      updatedAt: serverTimestamp(),
    });

    const logId = makeId('log');
    batch.set(doc(db, 'activity_logs', logId), {
      id: logId,
      adminEmail: ADMIN_EMAIL,
      action: isNew ? 'CREATE_PACKAGE' : 'UPDATE_PACKAGE',
      targetType: 'package',
      targetId: sanitized.id,
      details: `${sanitized.name} (Rs ${sanitized.priceNpr})`.slice(0, 400),
      createdAt: serverTimestamp(),
    });
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `packages/${sanitized.id}`);
  }
}

export async function adminDeletePackage(pkgId: string, name: string) {
  try {
    await deleteDoc(doc(db, 'packages', pkgId));
    const logId = makeId('log');
    await setDoc(doc(db, 'activity_logs', logId), {
      id: logId,
      adminEmail: ADMIN_EMAIL,
      action: 'DELETE_PACKAGE',
      targetType: 'package',
      targetId: pkgId,
      details: `Deleted package ${name}`,
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `packages/${pkgId}`);
  }
}

export async function adminUpdateOrderStatus(
  order: TopUpOrder,
  status: OrderStatus,
  adminNote: string,
) {
  try {
    const batch = writeBatch(db);
    batch.update(doc(db, 'orders', order.id), {
      status,
      adminNote: adminNote.slice(0, 300),
      updatedAt: serverTimestamp(),
    });

    const notifId = makeId('ntf');
    batch.set(doc(db, 'notifications', notifId), {
      id: notifId,
      userId: order.userId,
      title: `Order ${status.toUpperCase()}`,
      body: `${order.packageName} for UID ${order.playerUid} is now ${status}.`,
      type: 'order',
      read: false,
      createdAt: serverTimestamp(),
    });

    const logId = makeId('log');
    batch.set(doc(db, 'activity_logs', logId), {
      id: logId,
      adminEmail: ADMIN_EMAIL,
      action: `ORDER_${status.toUpperCase()}`,
      targetType: 'order',
      targetId: order.id,
      details: `${order.packageName} · UID ${order.playerUid}`,
      createdAt: serverTimestamp(),
    });

    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `orders/${order.id}`);
  }
}

export async function adminReviewWalletTopUp(
  topup: WalletTopUp,
  approve: boolean,
  adminNote: string,
  currentUserBalance: number,
) {
  try {
    const batch = writeBatch(db);
    batch.update(doc(db, 'wallet_topups', topup.id), {
      status: approve ? 'approved' : 'rejected',
      adminNote: adminNote.slice(0, 300),
      updatedAt: serverTimestamp(),
    });

    if (approve) {
      batch.update(doc(db, 'users', topup.userId), {
        walletBalance: currentUserBalance + topup.amountNpr,
        updatedAt: serverTimestamp(),
      });
      const txId = makeId('tx');
      batch.set(doc(db, 'wallet_transactions', txId), {
        id: txId,
        userId: topup.userId,
        type: 'credit',
        amountNpr: topup.amountNpr,
        description: `Wallet load via ${topup.paymentMethod.toUpperCase()}`,
        referenceId: topup.id,
        createdAt: serverTimestamp(),
      });
    }

    const notifId = makeId('ntf');
    batch.set(doc(db, 'notifications', notifId), {
      id: notifId,
      userId: topup.userId,
      title: approve ? 'Wallet Credited' : 'Wallet Top-Up Rejected',
      body: approve
        ? `Rs ${topup.amountNpr} added to your Diamond Store Wallet.`
        : `Wallet top-up of Rs ${topup.amountNpr} was rejected. ${adminNote}`.trim(),
      type: 'wallet',
      read: false,
      createdAt: serverTimestamp(),
    });

    const logId = makeId('log');
    batch.set(doc(db, 'activity_logs', logId), {
      id: logId,
      adminEmail: ADMIN_EMAIL,
      action: approve ? 'WALLET_TOPUP_APPROVED' : 'WALLET_TOPUP_REJECTED',
      targetType: 'wallet_topup',
      targetId: topup.id,
      details: `${topup.userEmail} · Rs ${topup.amountNpr}`,
      createdAt: serverTimestamp(),
    });

    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `wallet_topups/${topup.id}`);
  }
}

export async function adminAdjustUserWallet(
  targetUser: UserProfile,
  deltaNpr: number,
  reason: string,
) {
  const nextBalance = Math.max(0, targetUser.walletBalance + deltaNpr);
  try {
    const batch = writeBatch(db);
    batch.update(doc(db, 'users', targetUser.uid), {
      walletBalance: nextBalance,
      updatedAt: serverTimestamp(),
    });

    const txId = makeId('tx');
    batch.set(doc(db, 'wallet_transactions', txId), {
      id: txId,
      userId: targetUser.uid,
      type: deltaNpr >= 0 ? 'credit' : 'debit',
      amountNpr: Math.abs(deltaNpr),
      description: reason.slice(0, 200) || 'Admin wallet adjustment',
      referenceId: 'admin_manual',
      createdAt: serverTimestamp(),
    });

    const logId = makeId('log');
    batch.set(doc(db, 'activity_logs', logId), {
      id: logId,
      adminEmail: ADMIN_EMAIL,
      action: deltaNpr >= 0 ? 'WALLET_CREDIT' : 'WALLET_DEBIT',
      targetType: 'user',
      targetId: targetUser.uid,
      details: `${targetUser.email} · ${deltaNpr >= 0 ? '+' : ''}Rs ${deltaNpr}`,
      createdAt: serverTimestamp(),
    });

    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `users/${targetUser.uid}`);
  }
}

export async function adminToggleUserBlock(targetUser: UserProfile) {
  const nextBlocked = !targetUser.isBlocked;
  try {
    const batch = writeBatch(db);
    batch.update(doc(db, 'users', targetUser.uid), {
      isBlocked: nextBlocked,
      updatedAt: serverTimestamp(),
    });

    const logId = makeId('log');
    batch.set(doc(db, 'activity_logs', logId), {
      id: logId,
      adminEmail: ADMIN_EMAIL,
      action: nextBlocked ? 'BLOCK_USER' : 'UNBLOCK_USER',
      targetType: 'user',
      targetId: targetUser.uid,
      details: `${targetUser.email}`,
      createdAt: serverTimestamp(),
    });
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `users/${targetUser.uid}`);
  }
}

export async function adminSaveStoreSettings(settings: StoreSettings) {
  const sanitized = buildSanitizedStoreSettings(settings);
  try {
    const batch = writeBatch(db);
    batch.set(doc(db, 'store_settings', 'public'), {
      ...sanitized,
      updatedAt: serverTimestamp(),
    });
    const logId = makeId('log');
    batch.set(doc(db, 'activity_logs', logId), {
      id: logId,
      adminEmail: ADMIN_EMAIL,
      action: 'UPDATE_STORE_SETTINGS',
      targetType: 'store_settings',
      targetId: 'public',
      details: `Maintenance: ${sanitized.maintenanceMode ? 'ON' : 'OFF'} · eSewa: ${sanitized.esewaId}${sanitized.esewaQrImageUrl ? ' · Custom QR' : ''}${sanitized.themeImageUrl ? ' · Custom Theme' : ''}`,
      createdAt: serverTimestamp(),
    });
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'store_settings/public');
  }
}

export async function adminPublishAnnouncement(params: {
  title: string;
  message: string;
  badge: string;
}) {
  const annId = makeId('ann');
  const notifId = makeId('ntf');
  const logId = makeId('log');
  try {
    const batch = writeBatch(db);
    batch.set(doc(db, 'announcements', annId), {
      id: annId,
      title: params.title.slice(0, 120),
      message: params.message.slice(0, 500),
      badge: params.badge.slice(0, 40),
      active: true,
      createdAt: serverTimestamp(),
    });
    batch.set(doc(db, 'notifications', notifId), {
      id: notifId,
      userId: 'all',
      title: params.title.slice(0, 120),
      body: params.message.slice(0, 400),
      type: 'offer',
      read: false,
      createdAt: serverTimestamp(),
    });
    batch.set(doc(db, 'activity_logs', logId), {
      id: logId,
      adminEmail: ADMIN_EMAIL,
      action: 'PUBLISH_ANNOUNCEMENT',
      targetType: 'announcement',
      targetId: annId,
      details: params.title.slice(0, 120),
      createdAt: serverTimestamp(),
    });
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `announcements/${annId}`);
  }
}

export async function adminDeleteAnnouncement(annId: string) {
  try {
    await deleteDoc(doc(db, 'announcements', annId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `announcements/${annId}`);
  }
}

export async function adminDeleteOrder(order: TopUpOrder) {
  try {
    const batch = writeBatch(db);
    batch.delete(doc(db, 'orders', order.id));
    const logId = makeId('log');
    batch.set(doc(db, 'activity_logs', logId), {
      id: logId,
      adminEmail: ADMIN_EMAIL,
      action: 'DELETE_ORDER',
      targetType: 'order',
      targetId: order.id,
      details: `${order.packageName} · Rs ${order.amountNpr} · UID ${order.playerUid}`.slice(0, 400),
      createdAt: serverTimestamp(),
    });
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `orders/${order.id}`);
  }
}

export async function adminDeleteWalletTopUp(topup: WalletTopUp) {
  try {
    const batch = writeBatch(db);
    batch.delete(doc(db, 'wallet_topups', topup.id));
    const logId = makeId('log');
    batch.set(doc(db, 'activity_logs', logId), {
      id: logId,
      adminEmail: ADMIN_EMAIL,
      action: 'DELETE_WALLET_TOPUP',
      targetType: 'wallet_topup',
      targetId: topup.id,
      details: `${topup.userEmail} · Rs ${topup.amountNpr}`.slice(0, 400),
      createdAt: serverTimestamp(),
    });
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `wallet_topups/${topup.id}`);
  }
}

export async function adminDeleteTicket(ticket: SupportTicket) {
  try {
    const msgsSnap = await getDocs(collection(db, 'support_tickets', ticket.id, 'messages'));
    const batch = writeBatch(db);
    for (const mDoc of msgsSnap.docs) {
      batch.delete(mDoc.ref);
    }
    batch.delete(doc(db, 'support_tickets', ticket.id));
    const logId = makeId('log');
    batch.set(doc(db, 'activity_logs', logId), {
      id: logId,
      adminEmail: ADMIN_EMAIL,
      action: 'DELETE_TICKET',
      targetType: 'support_ticket',
      targetId: ticket.id,
      details: `${ticket.userEmail} · ${ticket.subject}`.slice(0, 400),
      createdAt: serverTimestamp(),
    });
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `support_tickets/${ticket.id}`);
  }
}

