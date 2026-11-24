/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import {
  Bell,
  CheckCircle2,
  ExternalLink,
  Home,
  LifeBuoy,
  LogIn,
  MessageCircle,
  Moon,
  Receipt,
  Search,
  Sparkles,
  Sun,
  TableProperties,
  User as UserIcon,
  Wallet,
  X,
} from 'lucide-react';
import { auth, signInWithGoogle, signOutUser, testConnection } from './firebase';
import {
  ensureUserProfile,
  markNotificationRead,
  subscribeAdminCollections,
  subscribeAnnouncements,
  subscribePublicPackages,
  subscribeStoreSettings,
  subscribeUserNotifications,
  subscribeUserOrders,
  subscribeUserProfile,
  subscribeUserTickets,
  subscribeUserWalletTopUps,
  subscribeUserWalletTransactions,
  updateUserPreferences,
} from './services/firestoreService';
import {
  ADAPTIVE_ICON_IMAGE,
  DEFAULT_NP_PACKAGES,
  DEFAULT_STORE_SETTINGS,
  TRANSLATIONS,
  buildWhatsAppUrl,
  filterPackages,
  formatNpr,
  getCategoryLabel,
  getPackageImageUrl,
  isAdminEmail,
} from './utils/storeLogic';
import type {
  ActivityLog,
  Announcement,
  DiamondPackage,
  LanguageCode,
  NotificationItem,
  PackageCategory,
  StoreSettings,
  SupportTicket,
  TopUpOrder,
  UidLookupResult,
  UserProfile,
  WalletTopUp,
  WalletTransaction,
} from './types/store';
import { AuthModal } from './components/AuthModal';
import { CheckoutModal } from './components/CheckoutModal';
import { OrdersView } from './components/OrdersView';
import { WalletView } from './components/WalletView';
import { SupportView } from './components/SupportView';
import { AccountView } from './components/AccountView';
import { AdminPanelView } from './components/AdminPanelView';
import { WelcomeSplash } from './components/WelcomeSplash';

type ActiveTab = 'home' | 'orders' | 'wallet' | 'support' | 'account' | 'admin';

export default function App() {
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [packages, setPackages] = useState<DiamondPackage[]>(DEFAULT_NP_PACKAGES);
  const [settings, setSettings] = useState<StoreSettings>(DEFAULT_STORE_SETTINGS);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

  // User data streams
  const [orders, setOrders] = useState<TopUpOrder[]>([]);
  const [topups, setTopups] = useState<WalletTopUp[]>([]);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  // Admin data streams (only subscribed when rc0470638@gmail.com is verified)
  const [adminOrders, setAdminOrders] = useState<TopUpOrder[]>([]);
  const [adminTopups, setAdminTopups] = useState<WalletTopUp[]>([]);
  const [adminUsers, setAdminUsers] = useState<UserProfile[]>([]);
  const [adminTickets, setAdminTickets] = useState<SupportTicket[]>([]);
  const [adminLogs, setAdminLogs] = useState<ActivityLog[]>([]);

  // UI state
  const [activeTab, setActiveTab] = useState<ActiveTab>('home');
  const [selectedCategory, setSelectedCategory] = useState<PackageCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [darkMode, setDarkMode] = useState(true);
  const [language, setLanguage] = useState<LanguageCode>('en');
  const [checkoutPkg, setCheckoutPkg] = useState<DiamondPackage | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [priceListOpen, setPriceListOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [authError, setAuthError] = useState('');
  const [signingIn, setSigningIn] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [welcomeOpen, setWelcomeOpen] = useState(() => {
    if (typeof window === 'undefined') return false;
    return new URLSearchParams(window.location.search).get('autostart') !== '1';
  });

  // Remember last verified Free Fire UID across package selections
  const [lastVerifiedUid, setLastVerifiedUid] = useState('');
  const [lastVerifiedResult, setLastVerifiedResult] = useState<UidLookupResult | null>(null);

  const isAdmin = isAdminEmail(authUser?.email, authUser?.emailVerified);
  const t = TRANSLATIONS[language];

  // Sync dark class on <html>
  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) root.classList.add('dark');
    else root.classList.remove('dark');
  }, [darkMode]);

  // Sync canonical URL, og:url, and Schema.org JSON-LD url with active origin
  useEffect(() => {
    const origin = window.location.origin;
    const canonicalUrl = origin + window.location.pathname;

    let canonicalLink = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonicalLink) {
      canonicalLink = document.createElement('link');
      canonicalLink.rel = 'canonical';
      document.head.appendChild(canonicalLink);
    }
    canonicalLink.href = canonicalUrl;

    let ogUrlMeta = document.querySelector('meta[property="og:url"]') as HTMLMetaElement | null;
    if (!ogUrlMeta) {
      ogUrlMeta = document.createElement('meta');
      ogUrlMeta.setAttribute('property', 'og:url');
      document.head.appendChild(ogUrlMeta);
    }
    ogUrlMeta.content = canonicalUrl;

    const jsonLdEl = document.getElementById('store-jsonld');
    if (jsonLdEl) {
      jsonLdEl.textContent = JSON.stringify({
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'WebSite',
            name: 'Diamond Store',
            alternateName: ['Diamond Store NP', 'Free Fire Diamond Store Nepal'],
            url: `${origin}/`,
          },
          {
            '@type': 'OnlineStore',
            name: 'Diamond Store',
            url: `${origin}/`,
            logo: `${origin}/src/assets/images/adaptive_diamond_icon_1795490565915.jpg`,
            image: `${origin}/src/assets/images/hero_battle_royale_1795490565439.jpg`,
            description:
              'Official Free Fire Nepal (NP) online server diamond store. Instant UID verification, Weekly & Monthly memberships, and fast eSewa, Khalti & Wallet top-ups.',
            currenciesAccepted: 'NPR',
            areaServed: {
              '@type': 'Country',
              name: 'Nepal',
            },
          },
        ],
      });
    }
  }, []);

  // Initial Firestore connection check & Auth listener
  useEffect(() => {
    void testConnection();
    const unsub = onAuthStateChanged(auth, async (user) => {
      setAuthUser(user);
      setAuthReady(true);
      if (user) {
        try {
          const p = await ensureUserProfile(user);
          setProfile(p);
          setDarkMode(p.darkMode);
          setLanguage(p.language);
        } catch {
          // Handled via ErrorBoundary / console
        }
      } else {
        setProfile(null);
        setOrders([]);
        setTopups([]);
        setTransactions([]);
        setTickets([]);
        setNotifications([]);
      }
    });
    return () => unsub();
  }, []);

  // Public catalog & settings listeners
  useEffect(() => {
    const unsubPkg = subscribePublicPackages(isAdmin, setPackages);
    const unsubSettings = subscribeStoreSettings(setSettings);
    const unsubAnn = subscribeAnnouncements(isAdmin, setAnnouncements);
    return () => {
      unsubPkg();
      unsubSettings();
      unsubAnn();
    };
  }, [isAdmin]);

  // Authenticated user streams
  useEffect(() => {
    if (!authReady || !authUser) return;
    const unsubProfile = subscribeUserProfile(authUser.uid, (p) => {
      if (p) {
        setProfile(p);
        setDarkMode(p.darkMode);
        setLanguage(p.language);
        setLastVerifiedUid((prev) => prev || p.defaultUid || p.recentUids?.[0] || '');
      }
    });
    const unsubOrders = subscribeUserOrders(authUser.uid, setOrders);
    const unsubTopups = subscribeUserWalletTopUps(authUser.uid, setTopups);
    const unsubTx = subscribeUserWalletTransactions(authUser.uid, setTransactions);
    const unsubTickets = subscribeUserTickets(authUser.uid, setTickets);
    const unsubNotifs = subscribeUserNotifications(authUser.uid, setNotifications);

    return () => {
      unsubProfile();
      unsubOrders();
      unsubTopups();
      unsubTx();
      unsubTickets();
      unsubNotifs();
    };
  }, [authReady, authUser]);

  // Admin exclusive streams (enforced in Firestore rules too)
  useEffect(() => {
    if (!authReady || !isAdmin) {
      setAdminOrders([]);
      setAdminTopups([]);
      setAdminUsers([]);
      setAdminTickets([]);
      setAdminLogs([]);
      return;
    }
    return subscribeAdminCollections({
      onOrders: setAdminOrders,
      onTopUps: setAdminTopups,
      onUsers: setAdminUsers,
      onTickets: setAdminTickets,
      onLogs: setAdminLogs,
    });
  }, [authReady, isAdmin]);

  const filteredPackages = useMemo(
    () => filterPackages(packages, selectedCategory, searchQuery, false),
    [packages, selectedCategory, searchQuery],
  );

  const unreadNotifCount = notifications.filter((n) => !n.read).length;

  const handleGoogleSignIn = async (selectAccount: boolean) => {
    setAuthError('');
    setSigningIn(true);
    try {
      await signInWithGoogle(selectAccount);
      setAuthModalOpen(false);
    } catch (err) {
      setAuthError(
        err instanceof Error ? err.message : 'Google Sign-In failed. Please try again.',
      );
    } finally {
      setSigningIn(false);
    }
  };

  const handleToggleDarkMode = () => {
    const next = !darkMode;
    setDarkMode(next);
    if (profile) {
      void updateUserPreferences(profile.uid, { darkMode: next });
    }
  };

  const handleToggleLanguage = (lang: LanguageCode) => {
    setLanguage(lang);
    if (profile) {
      void updateUserPreferences(profile.uid, { language: lang });
    }
  };

  const handleOrderSuccess = (orderId: string) => {
    setCheckoutPkg(null);
    setActiveTab('orders');
    setToastMsg(`Order #${orderId} submitted! Track status below.`);
    setTimeout(() => setToastMsg(''), 4000);
  };

  return (
    <div className="relative min-h-screen bg-[#F2F6FC] dark:bg-[#040812] text-slate-900 dark:text-slate-100 pb-32 md:pb-12 transition-colors">
      {settings.themeImageUrl && (
        <div
          aria-hidden="true"
          data-testid="custom-theme-backdrop"
          className="fixed inset-0 z-0 pointer-events-none overflow-hidden"
        >
          <img
            src={settings.themeImageUrl}
            alt=""
            className="w-full h-full object-cover opacity-25 dark:opacity-30"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#F2F6FC]/70 via-[#F2F6FC]/80 to-[#F2F6FC]/95 dark:from-[#040812]/65 dark:via-[#040812]/80 dark:to-[#040812]/95" />
        </div>
      )}

      {/* Top Bar Contract: 3 exact zones */}
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-[#091224]/95 backdrop-blur-sm border-b border-slate-200 dark:border-white/10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 md:h-16 flex items-center justify-between gap-8">
          {/* Zone 1: Single-line Brand Title */}
          <button
            type="button"
            onClick={() => setActiveTab('home')}
            className="flex items-center gap-2.5 text-lg font-extrabold tracking-tight text-slate-900 dark:text-white whitespace-nowrap shrink-0"
          >
            <img
              src={ADAPTIVE_ICON_IMAGE}
              alt="Diamond Store icon"
              className="w-8 h-8 rounded-lg object-cover bg-[#040812]"
            />
            <span>{t.brand}</span>
          </button>

          {/* Zone 2: Concise single-line navigation links */}
          <nav
            aria-label="Primary Navigation"
            className="hidden md:flex items-center gap-6 text-sm font-medium"
          >
            {(
              [
                { id: 'home', label: t.home },
                { id: 'orders', label: t.orders },
                { id: 'wallet', label: t.wallet },
                { id: 'support', label: t.support },
                { id: 'account', label: t.account },
              ] as const
            ).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`whitespace-nowrap shrink-0 py-1 border-b-2 transition-colors ${
                  activeTab === item.id || (activeTab === 'admin' && item.id === 'account')
                    ? 'border-[#0B3D91] dark:border-[#00D2FF] text-[#0B3D91] dark:text-[#00D2FF] font-semibold'
                    : 'border-transparent text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>

          {/* Zone 3: 1 Primary Action */}
          <div className="flex items-center shrink-0">
            {authUser ? (
              <button
                type="button"
                onClick={() => setActiveTab('wallet')}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0B3D91] dark:bg-[#2186FF] text-white text-xs font-semibold hover:opacity-95 transition-opacity whitespace-nowrap shrink-0 font-mono-num"
              >
                <Wallet className="w-3.5 h-3.5" />
                {formatNpr(profile?.walletBalance ?? 0)}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setAuthModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0B3D91] dark:bg-[#2186FF] text-white text-xs font-semibold hover:opacity-95 transition-opacity whitespace-nowrap shrink-0"
              >
                <LogIn className="w-3.5 h-3.5" />
                Sign In
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 pt-5 space-y-6">
        {toastMsg && (
          <div className="rounded-2xl bg-emerald-500/15 border border-emerald-500/30 px-4 py-3 flex items-center gap-2.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{toastMsg}</span>
          </div>
        )}

        {settings.maintenanceMode && (
          <div className="rounded-2xl bg-amber-500/15 border border-amber-500/35 px-4 py-3 text-xs font-medium text-amber-900 dark:text-amber-200">
            Store Maintenance Notice: {settings.maintenanceMessage}
          </div>
        )}

        {activeTab === 'home' && (
          <div className="space-y-6">

            {/* Active Admin Broadcast Announcements */}
            {announcements.length > 0 && (
              <section className="rounded-2xl bg-white dark:bg-[#0F1B33] border border-slate-200 dark:border-white/10 px-5 py-3.5 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3 text-xs">
                  <Sparkles className="w-4 h-4 text-[#0B3D91] dark:text-[#00D2FF] shrink-0" />
                  <div>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {announcements[0].badge} · {announcements[0].title}:
                    </span>{' '}
                    <span className="text-slate-600 dark:text-slate-300">
                      {announcements[0].message}
                    </span>
                  </div>
                </div>
              </section>
            )}

            {/* Workspace Toolbar: Category Filters + Search + Theme/Lang/Notifications */}
            <section id="catalog-section" className="space-y-5">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                  {(['all', 'diamonds', 'weekly', 'monthly', 'levelup'] as const).map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
                        selectedCategory === cat
                          ? 'bg-[#0B3D91] dark:bg-[#2186FF] text-white'
                          : 'bg-white dark:bg-[#0F1B33] text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-white/10 hover:border-[#2186FF]'
                      }`}
                    >
                      {getCategoryLabel(cat, language)}
                    </button>
                  ))}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative flex-1 sm:w-56">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="search"
                      aria-label="Search packages"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search diamonds or Rs..."
                      className="w-full pl-9 pr-3 py-2 rounded-xl bg-white dark:bg-[#0F1B33] border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-[#2186FF]"
                    />
                  </div>

                  <button
                    type="button"
                    aria-label="Toggle theme"
                    onClick={handleToggleDarkMode}
                    className="p-2 rounded-xl bg-white dark:bg-[#0F1B33] border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200 hover:border-[#2186FF]"
                  >
                    {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                  </button>

                  <button
                    type="button"
                    aria-label="Switch language"
                    onClick={() => handleToggleLanguage(language === 'en' ? 'ne' : 'en')}
                    className="px-3 py-2 rounded-xl bg-white dark:bg-[#0F1B33] border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:border-[#2186FF] whitespace-nowrap"
                  >
                    {language.toUpperCase()}
                  </button>

                  <button
                    type="button"
                    aria-label="Open price list"
                    title={t.priceList}
                    onClick={() => setPriceListOpen(true)}
                    className="p-2 rounded-xl bg-white dark:bg-[#0F1B33] border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200 hover:border-[#2186FF]"
                  >
                    <TableProperties className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    aria-label="Open notifications"
                    onClick={() => setNotifOpen(true)}
                    className="inline-flex items-center gap-1 p-2 rounded-xl bg-white dark:bg-[#0F1B33] border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200 hover:border-[#2186FF]"
                  >
                    <Bell className="w-4 h-4" />
                    {unreadNotifCount > 0 && (
                      <span className="text-[11px] font-mono-num font-bold text-[#0B3D91] dark:text-[#00D2FF]">
                        {unreadNotifCount}
                      </span>
                    )}
                  </button>
                </div>
              </div>

              {/* Package Cards Grid */}
              {filteredPackages.length === 0 ? (
                <div className="rounded-3xl bg-white dark:bg-[#0F1B33] border border-slate-200 dark:border-white/10 p-8 text-center text-xs text-slate-500 dark:text-slate-400">
                  No packages matched "{searchQuery}". Clear search to see all 26 Free Fire NP packages.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredPackages.map((pkg) => (
                    <article
                      key={pkg.id}
                      className="rounded-2xl bg-white dark:bg-[#0F1B33] border border-slate-200 dark:border-white/10 p-4 sm:p-5 flex flex-col justify-between gap-4 hover:border-[#2186FF] transition-colors"
                    >
                      <div className="flex items-start gap-3.5">
                        <img
                          src={getPackageImageUrl(pkg)}
                          alt={pkg.name}
                          className="w-16 h-16 rounded-2xl object-cover border border-slate-200 dark:border-white/15 bg-[#040812] shrink-0"
                        />
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                            {getCategoryLabel(pkg.category, language)}
                            <span aria-hidden="true"> · </span>
                            <span>{pkg.bonusLabel}</span>
                          </div>
                          <div className="flex items-baseline justify-between gap-2">
                            <h3 className="text-base font-bold text-slate-900 dark:text-white leading-snug">
                              {pkg.name}
                            </h3>
                            <span className="text-base font-extrabold font-mono-num text-[#0B3D91] dark:text-[#00D2FF] whitespace-nowrap shrink-0">
                              {formatNpr(pkg.priceNpr)}
                            </span>
                          </div>
                          <div className="text-xs font-mono-num text-slate-500 dark:text-slate-400">
                            {pkg.diamondAmount} Diamonds Value
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-end pt-3 border-t border-slate-100 dark:border-white/10">
                        <button
                          type="button"
                          onClick={() => setCheckoutPkg(pkg)}
                          className="px-4 py-2 rounded-xl bg-[#0B3D91] dark:bg-[#2186FF] text-white text-xs font-semibold hover:opacity-95 transition-opacity whitespace-nowrap"
                        >
                          {t.topUpNow}
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}

        {activeTab === 'orders' && (
          <OrdersView
            orders={orders}
            signedIn={Boolean(authUser)}
            onRequireSignIn={() => setAuthModalOpen(true)}
          />
        )}

        {activeTab === 'wallet' && (
          <WalletView
            profile={profile}
            settings={settings}
            topups={topups}
            transactions={transactions}
            onRequireSignIn={() => setAuthModalOpen(true)}
          />
        )}

        {activeTab === 'support' && (
          <SupportView
            profile={profile}
            settings={settings}
            tickets={tickets}
            onRequireSignIn={() => setAuthModalOpen(true)}
          />
        )}

        {activeTab === 'account' && (
          <AccountView
            profile={profile}
            isAdmin={isAdmin}
            darkMode={darkMode}
            language={language}
            onToggleDarkMode={handleToggleDarkMode}
            onToggleLanguage={handleToggleLanguage}
            onOpenAdminPanel={() => setActiveTab('admin')}
            onRequireSignIn={() => setAuthModalOpen(true)}
            onSignOut={signOutUser}
          />
        )}

        {activeTab === 'admin' && isAdmin && authUser && (
          <AdminPanelView
            adminEmail={authUser.email || ''}
            adminUid={authUser.uid}
            orders={adminOrders}
            topups={adminTopups}
            users={adminUsers}
            packages={packages}
            tickets={adminTickets}
            announcements={announcements}
            settings={settings}
            logs={adminLogs}
            onBack={() => setActiveTab('account')}
          />
        )}
      </main>

      {/* Clean Footer */}
      <footer className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 mt-12 pt-6 mb-4 border-t border-slate-200 dark:border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
        <div>
          Diamond Store NP · Support: {settings.supportEmail} · eSewa: {settings.esewaId}
        </div>
        <a
          href={buildWhatsAppUrl(
            settings.whatsappNumber,
            'Hello Diamond Store NP, I have a question about top-up.',
          )}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 font-semibold text-emerald-700 dark:text-emerald-400 hover:underline"
        >
          <MessageCircle className="w-3.5 h-3.5" />
          WhatsApp {settings.whatsappNumber}
          <ExternalLink className="w-3 h-3" />
        </a>
      </footer>

      {/* Mobile Bottom Navigation (<= 15% viewport height) */}
      <nav
        aria-label="Mobile Navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 h-14 bg-white dark:bg-[#091224] border-t border-slate-200 dark:border-white/10 grid grid-cols-5 items-center"
      >
        {(
          [
            { id: 'home', label: t.home, icon: Home },
            { id: 'orders', label: t.orders, icon: Receipt },
            { id: 'wallet', label: t.wallet, icon: Wallet },
            { id: 'support', label: t.support, icon: LifeBuoy },
            { id: 'account', label: t.account, icon: UserIcon },
          ] as const
        ).map((item) => {
          const Icon = item.icon;
          const active = activeTab === item.id || (activeTab === 'admin' && item.id === 'account');
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center justify-center gap-1 h-full text-[10px] font-semibold ${
                active
                  ? 'text-[#0B3D91] dark:text-[#00D2FF]'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Modals & Drawers */}
      <WelcomeSplash open={welcomeOpen} onDismiss={() => setWelcomeOpen(false)} />

      <AuthModal
        open={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onGoogleSignIn={handleGoogleSignIn}
        packages={packages}
        settings={settings}
        lang={language}
        authError={authError}
        signingIn={signingIn}
      />

      <CheckoutModal
        pkg={checkoutPkg}
        profile={profile}
        settings={settings}
        lang={language}
        initialUid={lastVerifiedUid}
        initialLookupResult={lastVerifiedResult}
        onUidVerified={(uid, res) => {
          setLastVerifiedUid(uid);
          setLastVerifiedResult(res);
        }}
        onClose={() => setCheckoutPkg(null)}
        onRequireSignIn={() => setAuthModalOpen(true)}
        onOrderSuccess={handleOrderSuccess}
      />

      {/* Price List Dialog from Hero */}
      {priceListOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="NP Price List"
          className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4"
        >
          <div className="w-full max-w-2xl max-h-[85vh] rounded-3xl bg-white dark:bg-[#0F1B33] border border-slate-200 dark:border-white/10 flex flex-col overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-white/10">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  Free Fire NP Price List (26 Packages)
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Tap any package to start instant UID top-up
                </p>
              </div>
              <button
                type="button"
                aria-label="Close price list"
                onClick={() => setPriceListOpen(false)}
                className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {(['diamonds', 'weekly', 'monthly', 'levelup'] as const).map((cat) => (
                <div key={cat} className="space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#0B3D91] dark:text-[#00D2FF]">
                    {getCategoryLabel(cat, language)}
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {packages
                      .filter((p) => p.category === cat && p.active)
                      .map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            setPriceListOpen(false);
                            setCheckoutPkg(p);
                          }}
                          className="flex items-center justify-between gap-2.5 rounded-xl bg-[#F2F6FC] dark:bg-[#091224] border border-slate-200 dark:border-white/10 px-3 py-2 text-sm hover:border-[#2186FF] text-left"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <img
                              src={getPackageImageUrl(p)}
                              alt={p.name}
                              className="w-8 h-8 rounded-lg object-cover shrink-0 border border-slate-200 dark:border-white/10"
                            />
                            <span className="font-semibold text-slate-900 dark:text-white truncate">
                              {p.name}
                            </span>
                          </div>
                          <span className="font-mono-num font-bold text-[#0B3D91] dark:text-[#00D2FF] shrink-0">
                            {formatNpr(p.priceNpr)}
                          </span>
                        </button>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Notifications Drawer */}
      {notifOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Notifications"
          className="fixed inset-0 z-50 bg-black/70 flex justify-end"
        >
          <div className="w-full max-w-sm bg-white dark:bg-[#0F1B33] border-l border-slate-200 dark:border-white/10 h-full flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-white/10">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Notifications</h2>
              <button
                type="button"
                aria-label="Close notifications"
                onClick={() => setNotifOpen(false)}
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
              {!authUser ? (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Sign in with Google to receive order and wallet updates.
                </p>
              ) : notifications.length === 0 ? (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  No notifications yet.
                </p>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    className={`rounded-2xl p-3.5 border text-xs space-y-1 ${
                      n.read
                        ? 'bg-[#F2F6FC] dark:bg-[#091224] border-slate-200 dark:border-white/10 opacity-75'
                        : 'bg-[#0B3D91]/5 dark:bg-[#00D2FF]/10 border-[#2186FF]/40'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-slate-900 dark:text-white">{n.title}</span>
                      {!n.read && n.userId !== 'all' && (
                        <button
                          type="button"
                          onClick={() => void markNotificationRead(n.id)}
                          className="text-[11px] font-semibold text-[#0B3D91] dark:text-[#00D2FF]"
                        >
                          Mark read
                        </button>
                      )}
                    </div>
                    <p className="text-slate-600 dark:text-slate-300">{n.body}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
