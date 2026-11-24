import type {
  DiamondPackage,
  LanguageCode,
  PackageCategory,
  StoreSettings,
  TopUpOrder,
  UserProfile,
} from '../types/store';

export const ADMIN_EMAIL = 'rc0470638@gmail.com';

export const HERO_BANNER_IMAGE = '/src/assets/images/hero_battle_royale_1795490565439.jpg';
export const DIAMOND_PASS_IMAGE = '/src/assets/images/diamond_pass_offer_1795490564994.jpg';
export const ADAPTIVE_ICON_IMAGE = '/src/assets/images/adaptive_diamond_icon_1795490565915.jpg';

export const DEFAULT_STORE_SETTINGS: StoreSettings = {
  esewaId: '9708086962',
  khaltiId: '9708086962',
  whatsappNumber: '9708086962',
  bankName: 'NIC Asia Bank',
  bankAccountNumber: '0123456789012345',
  bankAccountName: 'Diamond Store NP',
  supportEmail: 'rc0470638@gmail.com',
  esewaQrImageUrl: '',
  themeImageUrl: '',
  maintenanceMode: false,
  maintenanceMessage: 'Scheduled maintenance is underway. Top-ups will resume shortly.',
};

export const DEFAULT_NP_PACKAGES: DiamondPackage[] = [
  // Diamonds (10)
  { id: 'ff_np_25', name: '25 Diamonds', category: 'diamonds', priceNpr: 30, diamondAmount: 25, bonusLabel: 'Instant UID', popular: false, active: true, sortOrder: 1 },
  { id: 'ff_np_50', name: '50 Diamonds', category: 'diamonds', priceNpr: 50, diamondAmount: 50, bonusLabel: 'Instant UID', popular: false, active: true, sortOrder: 2 },
  { id: 'ff_np_115', name: '115 Diamonds', category: 'diamonds', priceNpr: 110, diamondAmount: 115, bonusLabel: 'Best Starter', popular: true, active: true, sortOrder: 3 },
  { id: 'ff_np_240', name: '240 Diamonds', category: 'diamonds', priceNpr: 210, diamondAmount: 240, bonusLabel: 'Value Pick', popular: true, active: true, sortOrder: 4 },
  { id: 'ff_np_355', name: '355 Diamonds', category: 'diamonds', priceNpr: 350, diamondAmount: 355, bonusLabel: 'Instant UID', popular: false, active: true, sortOrder: 5 },
  { id: 'ff_np_480', name: '480 Diamonds', category: 'diamonds', priceNpr: 450, diamondAmount: 480, bonusLabel: 'Instant UID', popular: false, active: true, sortOrder: 6 },
  { id: 'ff_np_610', name: '610 Diamonds', category: 'diamonds', priceNpr: 520, diamondAmount: 610, bonusLabel: 'Top Seller', popular: true, active: true, sortOrder: 7 },
  { id: 'ff_np_850', name: '850 Diamonds', category: 'diamonds', priceNpr: 760, diamondAmount: 850, bonusLabel: 'Squad Bundle', popular: false, active: true, sortOrder: 8 },
  { id: 'ff_np_1240', name: '1240 Diamonds', category: 'diamonds', priceNpr: 1230, diamondAmount: 1240, bonusLabel: 'Pro Pack', popular: false, active: true, sortOrder: 9 },
  { id: 'ff_np_2530', name: '2530 Diamonds', category: 'diamonds', priceNpr: 2200, diamondAmount: 2530, bonusLabel: 'Max Value', popular: true, active: true, sortOrder: 10 },

  // Weekly Memberships (8)
  { id: 'ff_np_weekly_lite', name: 'Weekly Lite', category: 'weekly', priceNpr: 75, diamondAmount: 100, bonusLabel: '7-Day Lite Pass', popular: false, active: true, sortOrder: 11 },
  { id: 'ff_np_2x_weekly_lite', name: '2x Weekly Lite', category: 'weekly', priceNpr: 150, diamondAmount: 200, bonusLabel: '2x Lite Stack', popular: false, active: true, sortOrder: 12 },
  { id: 'ff_np_3x_weekly_lite', name: '3x Weekly Lite', category: 'weekly', priceNpr: 230, diamondAmount: 300, bonusLabel: '3x Lite Stack', popular: false, active: true, sortOrder: 13 },
  { id: 'ff_np_5x_weekly_lite', name: '5x Weekly Lite', category: 'weekly', priceNpr: 370, diamondAmount: 500, bonusLabel: '5x Lite Stack', popular: false, active: true, sortOrder: 14 },
  { id: 'ff_np_weekly', name: 'Weekly', category: 'weekly', priceNpr: 225, diamondAmount: 450, bonusLabel: 'VIP Daily Claim', popular: true, active: true, sortOrder: 15 },
  { id: 'ff_np_2x_weekly', name: '2x Weekly', category: 'weekly', priceNpr: 460, diamondAmount: 900, bonusLabel: '14-Day Stack', popular: false, active: true, sortOrder: 16 },
  { id: 'ff_np_3x_weekly', name: '3x Weekly', category: 'weekly', priceNpr: 660, diamondAmount: 1350, bonusLabel: '21-Day Stack', popular: false, active: true, sortOrder: 17 },
  { id: 'ff_np_4x_weekly', name: '4x Weekly', category: 'weekly', priceNpr: 880, diamondAmount: 1800, bonusLabel: '28-Day Stack', popular: false, active: true, sortOrder: 18 },

  // Monthly Memberships (2)
  { id: 'ff_np_monthly', name: 'Monthly', category: 'monthly', priceNpr: 1070, diamondAmount: 2600, bonusLabel: '30-Day VIP Pass', popular: true, active: true, sortOrder: 19 },
  { id: 'ff_np_2x_monthly', name: '2x Monthly', category: 'monthly', priceNpr: 2130, diamondAmount: 5200, bonusLabel: '60-Day VIP Stack', popular: false, active: true, sortOrder: 20 },

  // Level Up Pass (6)
  { id: 'ff_np_lvl_6', name: 'Lvl 6 Pass', category: 'levelup', priceNpr: 85, diamondAmount: 120, bonusLabel: 'Level 6 Milestone', popular: false, active: true, sortOrder: 21 },
  { id: 'ff_np_lvl_10', name: 'Lvl 10 Pass', category: 'levelup', priceNpr: 120, diamondAmount: 200, bonusLabel: 'Level 10 Milestone', popular: false, active: true, sortOrder: 22 },
  { id: 'ff_np_lvl_15', name: 'Lvl 15 Pass', category: 'levelup', priceNpr: 120, diamondAmount: 200, bonusLabel: 'Level 15 Milestone', popular: false, active: true, sortOrder: 23 },
  { id: 'ff_np_lvl_20', name: 'Lvl 20 Pass', category: 'levelup', priceNpr: 120, diamondAmount: 200, bonusLabel: 'Level 20 Milestone', popular: false, active: true, sortOrder: 24 },
  { id: 'ff_np_lvl_25', name: 'Lvl 25 Pass', category: 'levelup', priceNpr: 120, diamondAmount: 200, bonusLabel: 'Level 25 Milestone', popular: false, active: true, sortOrder: 25 },
  { id: 'ff_np_lvl_30', name: 'Lvl 30 Pass', category: 'levelup', priceNpr: 200, diamondAmount: 350, bonusLabel: 'Level 30 Finale', popular: true, active: true, sortOrder: 26 },
];

export function isAdminEmail(email?: string | null, emailVerified?: boolean | null): boolean {
  if (!email || emailVerified !== true) return false;
  return email.trim().toLowerCase() === ADMIN_EMAIL;
}

export function sanitizeNumericUid(value: string): string {
  return value.replace(/[^0-9]/g, '').slice(0, 20);
}

export function isValidPlayerUid(uid: string): boolean {
  return /^[0-9]{5,20}$/.test(uid.trim());
}

export function mergeRecentUids(existing: string[], nextUid: string): string[] {
  const clean = sanitizeNumericUid(nextUid);
  if (!isValidPlayerUid(clean)) return existing.slice(0, 5);
  return [clean, ...existing.filter((item) => item !== clean)].slice(0, 5);
}

export function extractFreeFireIgn(payload: unknown): string {
  if (!payload || typeof payload !== 'object') return '';
  const data = payload as Record<string, unknown>;
  const candidates: unknown[] = [
    data.basicinfo,
    data.basicInfo,
    data.AccountInfo,
    data.accountInfo,
    data.playerData,
    data.data,
    data,
  ];
  for (const candidate of candidates) {
    if (!candidate || typeof candidate !== 'object') continue;
    const obj = candidate as Record<string, unknown>;
    const rawName = obj.nickname ?? obj.AccountName ?? obj.accountName ?? obj.playerName ?? obj.name;
    if (typeof rawName === 'string') {
      const clean = rawName.trim().slice(0, 64);
      if (clean.length >= 2) return clean;
    }
  }
  return '';
}

export function formatNpr(amount: number): string {
  return `Rs ${Math.round(amount).toLocaleString('en-US')}`;
}

export function filterPackages(
  packages: DiamondPackage[],
  category: PackageCategory | 'all',
  searchQuery: string,
  includeInactive = false,
): DiamondPackage[] {
  const q = searchQuery.trim().toLowerCase();
  return [...packages]
    .filter((pkg) => (includeInactive ? true : pkg.active))
    .filter((pkg) => (category === 'all' ? true : pkg.category === category))
    .filter((pkg) => {
      if (!q) return true;
      return (
        pkg.name.toLowerCase().includes(q) ||
        pkg.bonusLabel.toLowerCase().includes(q) ||
        String(pkg.priceNpr).includes(q)
      );
    })
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export interface AnalyticsSummary {
  totalRevenueNpr: number;
  completedCount: number;
  pendingCount: number;
  processingCount: number;
  rejectedOrCancelledCount: number;
  totalOrders: number;
  activeUsers: number;
  blockedUsers: number;
  categoryRevenue: Record<PackageCategory, number>;
}

export function computeAnalyticsSummary(
  orders: TopUpOrder[],
  users: UserProfile[],
): AnalyticsSummary {
  const categoryRevenue: Record<PackageCategory, number> = {
    diamonds: 0,
    weekly: 0,
    monthly: 0,
    levelup: 0,
  };

  let totalRevenueNpr = 0;
  let completedCount = 0;
  let pendingCount = 0;
  let processingCount = 0;
  let rejectedOrCancelledCount = 0;

  for (const order of orders) {
    if (order.status === 'completed') {
      completedCount += 1;
      totalRevenueNpr += order.amountNpr;
      categoryRevenue[order.category] = (categoryRevenue[order.category] || 0) + order.amountNpr;
    } else if (order.status === 'pending') {
      pendingCount += 1;
    } else if (order.status === 'processing') {
      processingCount += 1;
    } else {
      rejectedOrCancelledCount += 1;
    }
  }

  let activeUsers = 0;
  let blockedUsers = 0;
  for (const user of users) {
    if (user.isBlocked) blockedUsers += 1;
    else activeUsers += 1;
  }

  return {
    totalRevenueNpr,
    completedCount,
    pendingCount,
    processingCount,
    rejectedOrCancelledCount,
    totalOrders: orders.length,
    activeUsers,
    blockedUsers,
    categoryRevenue,
  };
}

export function buildQrPayload(
  method: 'esewa' | 'khalti' | 'bank',
  settings: StoreSettings,
  amountNpr: number,
  reference = 'DiamondStoreNP',
): string {
  if (method === 'esewa') {
    return JSON.stringify({
      eSewa_id: settings.esewaId,
      name: 'Diamond Store NP',
      amount: amountNpr,
      remarks: reference,
    });
  }
  if (method === 'khalti') {
    return JSON.stringify({
      Khalti_ID: settings.khaltiId,
      name: 'Diamond Store NP',
      amount: amountNpr,
      remarks: reference,
    });
  }
  return `BANK:${settings.bankName}|ACCT:${settings.bankAccountNumber}|NAME:${settings.bankAccountName}|AMT:NPR ${amountNpr}|REF:${reference}`;
}

export function buildWhatsAppUrl(whatsappNumber: string, text: string): string {
  const digits = whatsappNumber.replace(/[^0-9]/g, '');
  const normalized = digits.length === 10 && digits.startsWith('9') ? `977${digits}` : digits;
  return `https://wa.me/${normalized}?text=${encodeURIComponent(text)}`;
}

export function getPackageImageUrl(
  pkg: Pick<DiamondPackage, 'category' | 'imageUrl'>,
): string {
  const custom = pkg.imageUrl?.trim();
  if (custom) return custom;
  if (pkg.category === 'weekly' || pkg.category === 'monthly') {
    return DIAMOND_PASS_IMAGE;
  }
  if (pkg.category === 'levelup') {
    return HERO_BANNER_IMAGE;
  }
  return ADAPTIVE_ICON_IMAGE;
}

export function buildSanitizedPackageRecord(
  pkg: DiamondPackage,
  fallbackId?: string,
): Omit<DiamondPackage, 'updatedAt'> {
  const rawId = (pkg.id || fallbackId || `ff_np_${Date.now()}`).replace(/[^a-zA-Z0-9_-]/g, '');
  const id = rawId.slice(0, 128) || `ff_np_${Date.now()}`;
  const validCategories: PackageCategory[] = ['diamonds', 'weekly', 'monthly', 'levelup'];
  const category: PackageCategory = validCategories.includes(pkg.category)
    ? pkg.category
    : 'diamonds';
  const name = (pkg.name || '').trim().slice(0, 100) || 'Diamond Pack';
  const rawPrice = Number(pkg.priceNpr);
  const priceNpr = Number.isFinite(rawPrice)
    ? Math.min(500000, Math.max(1, Math.round(rawPrice)))
    : 100;
  const rawDiamonds = Number(pkg.diamondAmount);
  const diamondAmount = Number.isFinite(rawDiamonds)
    ? Math.min(100000, Math.max(0, Math.round(rawDiamonds)))
    : 0;
  const rawSort = Number(pkg.sortOrder);
  const sortOrder = Number.isFinite(rawSort)
    ? Math.min(1000, Math.max(0, Math.round(rawSort)))
    : 1;
  const bonusLabel = (pkg.bonusLabel || '').trim().slice(0, 60);
  const imageUrl = (pkg.imageUrl || '').trim().slice(0, 750000);

  return {
    id,
    name,
    category,
    priceNpr,
    diamondAmount,
    bonusLabel,
    popular: Boolean(pkg.popular),
    active: Boolean(pkg.active),
    sortOrder,
    imageUrl,
  };
}

export function buildSanitizedStoreSettings(
  input: Partial<StoreSettings>,
): Omit<StoreSettings, 'updatedAt'> {
  const cleanStr = (val: unknown, fallback: string, minLen: number, maxLen: number) => {
    const trimmed = typeof val === 'string' ? val.trim() : '';
    const sliced = trimmed.slice(0, maxLen);
    return sliced.length >= minLen ? sliced : fallback;
  };

  return {
    esewaId: cleanStr(input.esewaId, DEFAULT_STORE_SETTINGS.esewaId, 5, 40),
    khaltiId: cleanStr(input.khaltiId, DEFAULT_STORE_SETTINGS.khaltiId, 5, 40),
    whatsappNumber: cleanStr(input.whatsappNumber, DEFAULT_STORE_SETTINGS.whatsappNumber, 5, 30),
    bankName: cleanStr(input.bankName, DEFAULT_STORE_SETTINGS.bankName, 2, 80),
    bankAccountNumber: cleanStr(
      input.bankAccountNumber,
      DEFAULT_STORE_SETTINGS.bankAccountNumber,
      5,
      40,
    ),
    bankAccountName: cleanStr(
      input.bankAccountName,
      DEFAULT_STORE_SETTINGS.bankAccountName,
      2,
      80,
    ),
    supportEmail: cleanStr(input.supportEmail, DEFAULT_STORE_SETTINGS.supportEmail, 3, 254),
    esewaQrImageUrl:
      typeof input.esewaQrImageUrl === 'string'
        ? input.esewaQrImageUrl.trim().slice(0, 750000)
        : '',
    themeImageUrl:
      typeof input.themeImageUrl === 'string'
        ? input.themeImageUrl.trim().slice(0, 750000)
        : '',
    maintenanceMode: Boolean(input.maintenanceMode),
    maintenanceMessage:
      typeof input.maintenanceMessage === 'string'
        ? input.maintenanceMessage.trim().slice(0, 300)
        : '',
  };
}

export function getCategoryLabel(category: PackageCategory | 'all', lang: LanguageCode): string {
  const map: Record<LanguageCode, Record<PackageCategory | 'all', string>> = {
    en: {
      all: 'All Packages',
      diamonds: 'Diamonds',
      weekly: 'Weekly',
      monthly: 'Monthly',
      levelup: 'Level Up Pass',
    },
    ne: {
      all: 'सबै प्याकेज',
      diamonds: 'डायमन्ड',
      weekly: 'साप्ताहिक',
      monthly: 'मासिक',
      levelup: 'लेभल अप पास',
    },
  };
  return map[lang][category];
}

export const TRANSLATIONS: Record<LanguageCode, Record<string, string>> = {
  en: {
    brand: 'Diamond Store',
    home: 'Home',
    orders: 'Orders',
    wallet: 'Wallet',
    support: 'Support',
    account: 'Account',
    adminPanel: 'Admin Control Panel',
    signInGoogle: 'Create / Sign In with Mobile Gmail',
    useAnotherGmail: 'Use Another Gmail / Add Account',
    priceList: 'NP Price List',
    whatsappSupport: 'WhatsApp Support',
    heroTitle: 'Free Fire Online NP Server Top-Up',
    heroSubtitle: 'Official Nepal (NP) online server diamond packs, Weekly & Monthly memberships, and Level Up Passes delivered directly via eSewa & Wallet.',
    topUpNow: 'Top Up',
    playerUidLabel: 'Player UID (Numeric)',
    searchUid: 'Search',
    choosePhoto: 'Choose Photo',
    files: 'Files',
    confirmOrder: 'Confirm Order',
    walletBalance: 'Wallet Balance',
    addMoney: 'Add Money',
    darkMode: 'Dark Mode',
    language: 'Language',
    signOut: 'Sign Out',
    customize: 'Customize',
    ffUidBarTitle: 'Free Fire Online NP Server UID Verify',
    ffUidBarSubtitle: 'Enter your numeric Free Fire UID and tap Verify to check your Online Server (BD/IND/SG) Player Name below.',
    verifyUid: 'Verify',
    verifiedPlayerName: 'Player Name',
  },
  ne: {
    brand: 'डायमन्ड स्टोर',
    home: 'गृह',
    orders: 'अर्डर',
    wallet: 'वालेट',
    support: 'सहयोग',
    account: 'खाता',
    adminPanel: 'एडमिन कन्ट्रोल प्यानल',
    signInGoogle: 'मोबाइल Gmail बाट साइन इन गर्नुहोस्',
    useAnotherGmail: 'अर्को Gmail प्रयोग गर्नुहोस्',
    priceList: 'NP मूल्य सूची',
    whatsappSupport: 'ह्वाट्सएप सहयोग',
    heroTitle: 'फ्री फायर अनलाइन NP सर्भर टप-अप',
    heroSubtitle: 'तपाईंको Player UID मा सिधै अनलाइन NP सर्भर डायमन्ड, साप्ताहिक/मासिक मेम्बरशिप र लेभल अप पास।',
    topUpNow: 'टप-अप',
    playerUidLabel: 'प्लेयर UID (अंक मात्र)',
    searchUid: 'खोज्नुहोस्',
    choosePhoto: 'फोटो छान्नुहोस्',
    files: 'फाइलहरू',
    confirmOrder: 'अर्डर पक्का गर्नुहोस्',
    walletBalance: 'वालेट ब्यालेन्स',
    addMoney: 'रकम थप्नुहोस्',
    darkMode: 'डार्क मोड',
    language: 'भाषा',
    signOut: 'साइन आउट',
    customize: 'कस्टमाइज',
    ffUidBarTitle: 'फ्री फायर अनलाइन NP सर्भर UID भेरिफाइ',
    ffUidBarSubtitle: 'आफ्नो Free Fire UID लेखेर Verify थिच्नुहोस् — तल अनलाइन सर्भर प्लेयरको नाम देखिनेछ।',
    verifyUid: 'Verify',
    verifiedPlayerName: 'प्लेयरको नाम',
  },
};
