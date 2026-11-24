export type PackageCategory = 'diamonds' | 'weekly' | 'monthly' | 'levelup';
export type ExternalPaymentMethod = 'esewa';
export type PaymentMethod = 'esewa' | 'khalti' | 'bank' | 'wallet';
export type TopUpPaymentMethod = 'esewa' | 'khalti' | 'bank';
export type OrderStatus = 'pending' | 'processing' | 'completed' | 'cancelled' | 'rejected';
export type WalletTopUpStatus = 'pending' | 'approved' | 'rejected';
export type TicketStatus = 'open' | 'answered' | 'closed';
export type TicketCategory = 'order' | 'payment' | 'wallet' | 'account' | 'other';
export type LanguageCode = 'en' | 'ne';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  phone: string;
  defaultUid: string;
  recentUids: string[];
  walletBalance: number;
  isBlocked: boolean;
  darkMode: boolean;
  language: LanguageCode;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface DiamondPackage {
  id: string;
  name: string;
  category: PackageCategory;
  priceNpr: number;
  diamondAmount: number;
  bonusLabel: string;
  popular: boolean;
  active: boolean;
  sortOrder: number;
  imageUrl?: string;
  updatedAt?: unknown;
}

export interface TopUpOrder {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  packageId: string;
  packageName: string;
  category: PackageCategory;
  amountNpr: number;
  playerUid: string;
  playerIgn: string;
  playerRegion: string;
  ignVerified: boolean;
  paymentMethod: PaymentMethod;
  screenshotDataUrl: string;
  status: OrderStatus;
  adminNote: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface WalletTopUp {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  amountNpr: number;
  paymentMethod: TopUpPaymentMethod;
  screenshotDataUrl: string;
  status: WalletTopUpStatus;
  adminNote: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface WalletTransaction {
  id: string;
  userId: string;
  type: 'credit' | 'debit';
  amountNpr: number;
  description: string;
  referenceId: string;
  createdAt?: unknown;
}

export interface SupportTicket {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  subject: string;
  category: TicketCategory;
  status: TicketStatus;
  lastMessage: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface SupportMessage {
  id: string;
  ticketOwnerId: string;
  senderId: string;
  senderEmail: string;
  senderRole: 'user' | 'admin';
  text: string;
  attachmentDataUrl: string;
  createdAt?: unknown;
}

export interface StoreSettings {
  esewaId: string;
  khaltiId: string;
  whatsappNumber: string;
  bankName: string;
  bankAccountNumber: string;
  bankAccountName: string;
  supportEmail: string;
  esewaQrImageUrl?: string;
  themeImageUrl?: string;
  maintenanceMode: boolean;
  maintenanceMessage: string;
  updatedAt?: unknown;
}

export interface Announcement {
  id: string;
  title: string;
  message: string;
  badge: string;
  active: boolean;
  createdAt?: unknown;
}

export interface NotificationItem {
  id: string;
  userId: string;
  title: string;
  body: string;
  type: 'order' | 'wallet' | 'offer' | 'system';
  read: boolean;
  createdAt?: unknown;
}

export interface ActivityLog {
  id: string;
  adminEmail: string;
  action: string;
  targetType: string;
  targetId: string;
  details: string;
  createdAt?: unknown;
}

export interface UidLookupResult {
  found: boolean;
  busy: boolean;
  uid: string;
  ign: string;
  region: string;
  message: string;
}
