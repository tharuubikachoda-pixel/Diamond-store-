import React, { useEffect, useState } from 'react';
import { Globe, LogIn, LogOut, Moon, Save, ShieldAlert, Sun, User } from 'lucide-react';
import { updateUserPreferences } from '../services/firestoreService';
import { sanitizeNumericUid } from '../utils/storeLogic';
import type { LanguageCode, UserProfile } from '../types/store';

interface AccountViewProps {
  profile: UserProfile | null;
  isAdmin: boolean;
  darkMode: boolean;
  language: LanguageCode;
  onToggleDarkMode: () => void;
  onToggleLanguage: (lang: LanguageCode) => void;
  onOpenAdminPanel: () => void;
  onRequireSignIn: () => void;
  onSignOut: () => Promise<void>;
}

export const AccountView: React.FC<AccountViewProps> = ({
  profile,
  isAdmin,
  darkMode,
  language,
  onToggleDarkMode,
  onToggleLanguage,
  onOpenAdminPanel,
  onRequireSignIn,
  onSignOut,
}) => {
  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  const [defaultUid, setDefaultUid] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.displayName || '');
      setPhone(profile.phone || '');
      setDefaultUid(profile.defaultUid || '');
    }
  }, [profile]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setSaving(true);
    setSavedMsg('');
    try {
      await updateUserPreferences(profile.uid, {
        displayName: displayName.trim().slice(0, 80) || profile.displayName,
        phone: phone.trim().slice(0, 20),
        defaultUid: sanitizeNumericUid(defaultUid),
      });
      setSavedMsg('Profile saved.');
      setTimeout(() => setSavedMsg(''), 2500);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Profile Card */}
      <div className="rounded-3xl bg-white dark:bg-[#0F1B33] border border-slate-200 dark:border-white/10 p-6 space-y-5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#0B3D91]/10 dark:bg-[#00D2FF]/15 text-[#0B3D91] dark:text-[#00D2FF] flex items-center justify-center">
              <User className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {profile ? profile.displayName : 'Guest Visitor'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {profile ? profile.email : 'Sign in with Gmail to sync profile & orders'}
              </p>
            </div>
          </div>

          {profile ? (
            <button
              type="button"
              onClick={() => void onSignOut()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-red-500/10 text-red-600 dark:text-red-400 text-xs font-semibold hover:bg-red-500/20"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          ) : (
            <button
              type="button"
              onClick={onRequireSignIn}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0B3D91] dark:bg-[#2186FF] text-white text-xs font-semibold"
            >
              <LogIn className="w-4 h-4" />
              Sign In
            </button>
          )}
        </div>

        {profile && (
          <form onSubmit={(e) => void handleSave(e)} className="space-y-4 pt-4 border-t border-slate-200 dark:border-white/10">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label
                  htmlFor="acc-display-name"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-200"
                >
                  Full Name
                </label>
                <input
                  id="acc-display-name"
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#F2F6FC] dark:bg-[#091224] border border-slate-300 dark:border-white/15 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-[#2186FF]"
                />
              </div>
              <div className="space-y-1.5">
                <label
                  htmlFor="acc-phone"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-200"
                >
                  Phone / eSewa Number
                </label>
                <input
                  id="acc-phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="98XXXXXXXX"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#F2F6FC] dark:bg-[#091224] border border-slate-300 dark:border-white/15 text-sm font-mono-num text-slate-900 dark:text-white focus:outline-none focus:border-[#2186FF]"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="acc-default-uid"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-200"
              >
                Default Free Fire Player UID
              </label>
              <input
                id="acc-default-uid"
                type="text"
                inputMode="numeric"
                value={defaultUid}
                onChange={(e) => setDefaultUid(sanitizeNumericUid(e.target.value))}
                placeholder="Numeric UID"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#F2F6FC] dark:bg-[#091224] border border-slate-300 dark:border-white/15 text-sm font-mono-num text-slate-900 dark:text-white focus:outline-none focus:border-[#2186FF]"
              />
            </div>

            <div className="flex items-center justify-between gap-3">
              {savedMsg ? (
                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  {savedMsg}
                </span>
              ) : (
                <span />
              )}
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0B3D91] dark:bg-[#2186FF] text-white text-xs font-semibold disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Saving…' : 'Save Profile'}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Appearance & Language */}
      <div className="rounded-3xl bg-white dark:bg-[#0F1B33] border border-slate-200 dark:border-white/10 p-6 space-y-4">
        <h3 className="text-base font-bold text-slate-900 dark:text-white">Preferences</h3>

        <div className="flex items-center justify-between gap-4 py-2 border-b border-slate-200 dark:border-white/10">
          <div className="flex items-center gap-3">
            {darkMode ? (
              <Moon className="w-5 h-5 text-[#00D2FF]" />
            ) : (
              <Sun className="w-5 h-5 text-[#0B3D91]" />
            )}
            <div>
              <div className="text-sm font-semibold text-slate-900 dark:text-white">Dark Mode</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                {darkMode ? 'Obsidian Black & Sapphire' : 'Clean Ice & Deep Cobalt'}
              </div>
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={darkMode}
            aria-label="Toggle Dark Mode"
            onClick={onToggleDarkMode}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors ${
              darkMode
                ? 'bg-[#2186FF] text-white'
                : 'bg-slate-200 text-slate-900'
            }`}
          >
            {darkMode ? 'Dark On' : 'Light On'}
          </button>
        </div>

        <div className="flex items-center justify-between gap-4 py-2">
          <div className="flex items-center gap-3">
            <Globe className="w-5 h-5 text-[#0B3D91] dark:text-[#00D2FF]" />
            <div>
              <div className="text-sm font-semibold text-slate-900 dark:text-white">Language</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                English (EN) / नेपाली (NE)
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1 p-1 rounded-xl bg-[#F2F6FC] dark:bg-[#091224] border border-slate-200 dark:border-white/10">
            <button
              type="button"
              onClick={() => onToggleLanguage('en')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                language === 'en'
                  ? 'bg-[#0B3D91] dark:bg-[#2186FF] text-white'
                  : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              EN
            </button>
            <button
              type="button"
              onClick={() => onToggleLanguage('ne')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                language === 'ne'
                  ? 'bg-[#0B3D91] dark:bg-[#2186FF] text-white'
                  : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              NE
            </button>
          </div>
        </div>
      </div>

      {/* Exclusive Admin Control Panel Entry (rc0470638@gmail.com only) */}
      {isAdmin && (
        <div className="rounded-3xl bg-[#091224] text-white border border-[#00D2FF]/40 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#00D2FF]/15 text-[#00D2FF] flex items-center justify-center">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold">Admin Control Panel</h3>
              <p className="text-xs text-slate-300">
                Verified Admin: {profile?.email} · Full store, order, wallet & settings control
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onOpenAdminPanel}
            className="px-5 py-2.5 rounded-xl bg-[#00D2FF] text-[#040812] text-xs font-bold hover:opacity-90 transition-opacity shrink-0"
          >
            Open Admin Panel
          </button>
        </div>
      )}
    </div>
  );
};
