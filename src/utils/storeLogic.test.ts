import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ADAPTIVE_ICON_IMAGE,
  ADMIN_EMAIL,
  DEFAULT_NP_PACKAGES,
  DEFAULT_STORE_SETTINGS,
  DIAMOND_PASS_IMAGE,
  HERO_BANNER_IMAGE,
  buildQrPayload,
  buildSanitizedPackageRecord,
  buildSanitizedStoreSettings,
  buildWhatsAppUrl,
  computeAnalyticsSummary,
  extractFreeFireIgn,
  filterPackages,
  getPackageImageUrl,
  isAdminEmail,
  isValidPlayerUid,
  mergeRecentUids,
  sanitizeNumericUid,
} from './storeLogic';
import type { TopUpOrder, UserProfile } from '../types/store';

test('catalog ships exact 26 Free Fire NP packages across 4 categories', () => {
  assert.equal(DEFAULT_NP_PACKAGES.length, 26);
  const diamonds = DEFAULT_NP_PACKAGES.filter((p) => p.category === 'diamonds');
  const weekly = DEFAULT_NP_PACKAGES.filter((p) => p.category === 'weekly');
  const monthly = DEFAULT_NP_PACKAGES.filter((p) => p.category === 'monthly');
  const levelup = DEFAULT_NP_PACKAGES.filter((p) => p.category === 'levelup');

  assert.equal(diamonds.length, 10);
  assert.equal(weekly.length, 8);
  assert.equal(monthly.length, 2);
  assert.equal(levelup.length, 6);

  assert.equal(diamonds.find((p) => p.id === 'ff_np_25')?.priceNpr, 30);
  assert.equal(diamonds.find((p) => p.id === 'ff_np_2530')?.priceNpr, 2200);
  assert.equal(weekly.find((p) => p.id === 'ff_np_weekly_lite')?.priceNpr, 75);
  assert.equal(weekly.find((p) => p.id === 'ff_np_4x_weekly')?.priceNpr, 880);
  assert.equal(monthly.find((p) => p.id === 'ff_np_monthly')?.priceNpr, 1070);
  assert.equal(monthly.find((p) => p.id === 'ff_np_2x_monthly')?.priceNpr, 2130);
  assert.equal(levelup.find((p) => p.id === 'ff_np_lvl_6')?.priceNpr, 85);
  assert.equal(levelup.find((p) => p.id === 'ff_np_lvl_30')?.priceNpr, 200);
});

test('exclusive admin check enforces rc0470638@gmail.com and emailVerified', () => {
  assert.equal(isAdminEmail(ADMIN_EMAIL, true), true);
  assert.equal(isAdminEmail('RC0470638@GMAIL.COM', true), true);
  assert.equal(isAdminEmail(ADMIN_EMAIL, false), false);
  assert.equal(isAdminEmail('other@gmail.com', true), false);
  assert.equal(isAdminEmail(null, true), false);
});

test('UID sanitization, validation, and recent UID chips work deterministically', () => {
  assert.equal(sanitizeNumericUid('UID: 123-456-7890!'), '1234567890');
  assert.equal(isValidPlayerUid('1234567890'), true);
  assert.equal(isValidPlayerUid('1234'), false);
  assert.equal(isValidPlayerUid('12345abc'), false);

  const merged = mergeRecentUids(['11111', '22222', '33333', '44444', '55555'], '33333');
  assert.deepEqual(merged, ['33333', '11111', '22222', '44444', '55555']);

  const capped = mergeRecentUids(['11111', '22222', '33333', '44444', '55555'], '66666');
  assert.deepEqual(capped, ['66666', '11111', '22222', '33333', '44444']);
});

test('analytics summary aggregates completed revenue and statuses accurately', () => {
  const orders: TopUpOrder[] = [
    {
      id: 'o1',
      userId: 'u1',
      userEmail: 'a@gmail.com',
      userName: 'A',
      packageId: 'ff_np_115',
      packageName: '115 Diamonds',
      category: 'diamonds',
      amountNpr: 110,
      playerUid: '123456789',
      playerIgn: '',
      playerRegion: 'BD',
      ignVerified: false,
      paymentMethod: 'esewa',
      screenshotDataUrl: 'data:image/jpeg;base64,abc',
      status: 'completed',
      adminNote: '',
    },
    {
      id: 'o2',
      userId: 'u1',
      userEmail: 'a@gmail.com',
      userName: 'A',
      packageId: 'ff_np_weekly',
      packageName: 'Weekly',
      category: 'weekly',
      amountNpr: 225,
      playerUid: '123456789',
      playerIgn: '',
      playerRegion: 'BD',
      ignVerified: false,
      paymentMethod: 'wallet',
      screenshotDataUrl: '',
      status: 'pending',
      adminNote: '',
    },
  ];
  const users: UserProfile[] = [
    {
      uid: 'u1',
      email: 'a@gmail.com',
      displayName: 'A',
      phone: '',
      defaultUid: '',
      recentUids: [],
      walletBalance: 500,
      isBlocked: false,
      darkMode: true,
      language: 'en',
    },
  ];

  const summary = computeAnalyticsSummary(orders, users);
  assert.equal(summary.totalRevenueNpr, 110);
  assert.equal(summary.completedCount, 1);
  assert.equal(summary.pendingCount, 1);
  assert.equal(summary.categoryRevenue.diamonds, 110);
  assert.equal(summary.activeUsers, 1);
});

test('package filtering and QR / WhatsApp payload builders behave properly', () => {
  const weeklyFiltered = filterPackages(DEFAULT_NP_PACKAGES, 'weekly', 'lite');
  assert.equal(weeklyFiltered.length, 4);

  const esewaPayload = buildQrPayload('esewa', DEFAULT_STORE_SETTINGS, 110, 'ORD-1');
  assert.ok(esewaPayload.includes('9708086962'));
  assert.ok(esewaPayload.includes('110'));

  const waUrl = buildWhatsAppUrl('9708086962', 'Hello Diamond Store');
  assert.ok(waUrl.startsWith('https://wa.me/9779708086962?text='));
});

test('getPackageImageUrl resolves custom image override or category defaults', () => {
  assert.equal(getPackageImageUrl({ category: 'diamonds' }), ADAPTIVE_ICON_IMAGE);
  assert.equal(getPackageImageUrl({ category: 'weekly' }), DIAMOND_PASS_IMAGE);
  assert.equal(getPackageImageUrl({ category: 'monthly' }), DIAMOND_PASS_IMAGE);
  assert.equal(getPackageImageUrl({ category: 'levelup' }), HERO_BANNER_IMAGE);
  assert.equal(
    getPackageImageUrl({
      category: 'diamonds',
      imageUrl: 'data:image/jpeg;base64,customDiamondImg',
    }),
    'data:image/jpeg;base64,customDiamondImg',
  );
  assert.equal(
    getPackageImageUrl({ category: 'weekly', imageUrl: '   ' }),
    DIAMOND_PASS_IMAGE,
  );
});

test('extractFreeFireIgn extracts real nickname without inventing placeholder names', () => {
  assert.equal(
    extractFreeFireIgn({ basicinfo: { nickname: 'NP_RAJU_FF' } }),
    'NP_RAJU_FF',
  );
  assert.equal(
    extractFreeFireIgn({ AccountInfo: { AccountName: 'KATHMANDU_OP' } }),
    'KATHMANDU_OP',
  );
  assert.equal(
    extractFreeFireIgn({ data: { nickname: 'EverestFF' } }),
    'EverestFF',
  );
  assert.equal(
    extractFreeFireIgn({ uid: '6951209815', name: 'ᴿᵛᴳ✓niteshꔪ!', region: 'BD' }),
    'ᴿᵛᴳ✓niteshꔪ!',
  );
  assert.equal(extractFreeFireIgn({ error: 'busy' }), '');
  assert.equal(extractFreeFireIgn(null), '');
});

test('buildSanitizedPackageRecord emits exact Firestore allowed keys and clamps invalid values', () => {
  const dirty = {
    ...DEFAULT_NP_PACKAGES[0],
    id: 'ff np! 25',
    name: '   ',
    priceNpr: 0,
    diamondAmount: -10,
    sortOrder: 9999,
    bonusLabel: 'A'.repeat(100),
    imageUrl: 'data:image/jpeg;base64,' + 'x'.repeat(800000),
    updatedAt: 'ignore-me',
  };

  const sanitized = buildSanitizedPackageRecord(dirty);
  assert.deepEqual(Object.keys(sanitized).sort(), [
    'active',
    'bonusLabel',
    'category',
    'diamondAmount',
    'id',
    'imageUrl',
    'name',
    'popular',
    'priceNpr',
    'sortOrder',
  ]);
  assert.equal(sanitized.id, 'ffnp25');
  assert.equal(sanitized.name, 'Diamond Pack');
  assert.equal(sanitized.priceNpr, 1);
  assert.equal(sanitized.diamondAmount, 0);
  assert.equal(sanitized.sortOrder, 1000);
  assert.equal(sanitized.bonusLabel.length, 60);
  assert.equal(sanitized.imageUrl?.length, 750000);
});

test('buildSanitizedStoreSettings emits exact Firestore allowed keys and clamps custom QR and theme payloads', () => {
  const dirtySettings = {
    ...DEFAULT_STORE_SETTINGS,
    esewaId: '  9708086962  ',
    bankAccountName: '   ',
    esewaQrImageUrl: 'data:image/jpeg;base64,' + 'q'.repeat(800000),
    themeImageUrl: 'data:image/jpeg;base64,' + 't'.repeat(800000),
    updatedAt: 'ignore-me',
  };

  const sanitized = buildSanitizedStoreSettings(dirtySettings);
  assert.deepEqual(Object.keys(sanitized).sort(), [
    'bankAccountName',
    'bankAccountNumber',
    'bankName',
    'esewaId',
    'esewaQrImageUrl',
    'khaltiId',
    'maintenanceMessage',
    'maintenanceMode',
    'supportEmail',
    'themeImageUrl',
    'whatsappNumber',
  ]);
  assert.equal(sanitized.esewaId, '9708086962');
  assert.equal(sanitized.bankAccountName, DEFAULT_STORE_SETTINGS.bankAccountName);
  assert.equal(sanitized.esewaQrImageUrl?.length, 750000);
  assert.equal(sanitized.themeImageUrl?.length, 750000);
});
