import type { UidLookupResult } from '../types/store';
import { extractFreeFireIgn } from './storeLogic';

const REGIONS = ['BD', 'IND', 'SG'] as const;

const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

interface UpstreamLookupHit {
  ign: string;
  region: string;
}

interface CachedLookupEntry {
  hit: UpstreamLookupHit;
  expiresAt: number;
}

const UID_CACHE_TTL_MS = 5 * 60 * 1000;
const uidLookupCache = new Map<string, CachedLookupEntry>();

function collectCookies(res: Response, jar: Map<string, string>) {
  const headersObj = res.headers as Headers & { getSetCookie?: () => string[] };
  const setCookies =
    typeof headersObj.getSetCookie === 'function'
      ? headersObj.getSetCookie()
      : res.headers.get('set-cookie')
        ? [res.headers.get('set-cookie') as string]
        : [];
  for (const raw of setCookies) {
    const firstPart = raw.split(';')[0] || '';
    const eqIdx = firstPart.indexOf('=');
    if (eqIdx > 0) {
      const key = firstPart.slice(0, eqIdx).trim();
      const val = firstPart.slice(eqIdx + 1).trim();
      if (key) jar.set(key, val);
    }
  }
}

function formatCookieHeader(jar: Map<string, string>): string {
  return Array.from(jar.entries())
    .map(([k, v]) => `${k}=${v}`)
    .join('; ');
}

async function queryLiveChecker(uid: string): Promise<UpstreamLookupHit | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 9000);
  const jar = new Map<string, string>();
  const baseHeaders = {
    Accept: 'application/json',
    Origin: 'https://gameskinbo.com',
    Referer: 'https://gameskinbo.com/free_fire_id_checker',
    'User-Agent': BROWSER_UA,
  };

  try {
    const csrfRes = await fetch('https://gameskinbo.com/api/csrf-token', {
      signal: controller.signal,
      headers: baseHeaders,
    });
    if (!csrfRes.ok) return null;
    collectCookies(csrfRes, jar);
    const csrfJson = (await csrfRes.json()) as { token?: string; csrfToken?: string };
    const csrfToken = csrfJson.token || csrfJson.csrfToken || '';
    if (!csrfToken) return null;

    const sessionRes = await fetch('https://gameskinbo.com/api/ff_id_checker/session', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        ...baseHeaders,
        'Content-Type': 'application/json',
        'x-api-client': 'gameskinbo-web',
        'x-csrf-token': csrfToken,
        Cookie: formatCookieHeader(jar),
      },
      body: JSON.stringify({ uid }),
    });
    if (!sessionRes.ok) return null;
    collectCookies(sessionRes, jar);
    const sessionJson = (await sessionRes.json()) as { token?: string };
    const checkerToken = sessionJson.token || '';
    if (!checkerToken) return null;

    const infoRes = await fetch('https://gameskinbo.com/api/ff_id_checker', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        ...baseHeaders,
        'Content-Type': 'application/json',
        'x-api-client': 'gameskinbo-web',
        'x-ff-id-checker-token': checkerToken,
        'x-csrf-token': csrfToken,
        Cookie: formatCookieHeader(jar),
      },
      body: JSON.stringify({ uid }),
    });
    if (!infoRes.ok) return null;

    const data = (await infoRes.json()) as Record<string, unknown>;
    const cleanIgn = extractFreeFireIgn(data);
    if (cleanIgn.length >= 2) {
      const rawRegion = typeof data.region === 'string' ? data.region.trim().toUpperCase() : 'BD';
      return { ign: cleanIgn, region: rawRegion || 'BD' };
    }
    return null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function queryFreeFireServer(uid: string, region: string): Promise<UpstreamLookupHit | null> {
  const lowerRegion = region.toLowerCase();
  const endpoints = [
    `https://freefire-api-six.vercel.app/get_player_personal_show?server=${encodeURIComponent(region)}&uid=${encodeURIComponent(uid)}`,
    `https://freefire-api-six.vercel.app/get_player_personal_show?server=${encodeURIComponent(lowerRegion)}&uid=${encodeURIComponent(uid)}`,
    `https://ff-info-api.vercel.app/api/player?region=${encodeURIComponent(region)}&uid=${encodeURIComponent(uid)}`,
  ];

  for (const url of endpoints) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2200);
    try {
      const res = await fetch(url, {
        signal: controller.signal,
        headers: {
          Accept: 'application/json',
          'User-Agent': 'DiamondStoreNP/1.0',
        },
      });
      clearTimeout(timer);
      if (!res.ok) continue;

      const data = (await res.json()) as unknown;
      const cleanIgn = extractFreeFireIgn(data);
      if (cleanIgn.length >= 2) {
        return { ign: cleanIgn, region };
      }
    } catch {
      clearTimeout(timer);
    }
  }
  return null;
}

export async function lookupFreeFireUid(rawInput: string): Promise<{
  status: number;
  body: UidLookupResult;
}> {
  const rawUid = rawInput.trim();
  if (!/^[0-9]{5,20}$/.test(rawUid)) {
    return {
      status: 400,
      body: {
        found: false,
        busy: false,
        uid: rawUid,
        ign: '',
        region: '',
        message: 'Player UID must be 5 to 20 digits.',
      },
    };
  }

  const cached = uidLookupCache.get(rawUid);
  if (cached && cached.expiresAt > Date.now()) {
    return {
      status: 200,
      body: {
        found: true,
        busy: false,
        uid: rawUid,
        ign: cached.hit.ign,
        region: cached.hit.region,
        message: `Verified on ${cached.hit.region} server`,
      },
    };
  }

  try {
    let hit = await queryLiveChecker(rawUid);
    if (!hit) {
      const checks = await Promise.all(REGIONS.map((region) => queryFreeFireServer(rawUid, region)));
      hit = checks.find((item): item is UpstreamLookupHit => item !== null) ?? null;
    }

    if (hit) {
      if (uidLookupCache.size >= 500) {
        const oldestKey = uidLookupCache.keys().next().value;
        if (oldestKey) uidLookupCache.delete(oldestKey);
      }
      uidLookupCache.set(rawUid, {
        hit,
        expiresAt: Date.now() + UID_CACHE_TTL_MS,
      });

      return {
        status: 200,
        body: {
          found: true,
          busy: false,
          uid: rawUid,
          ign: hit.ign,
          region: hit.region,
          message: `Verified on ${hit.region} server`,
        },
      };
    }

    return {
      status: 200,
      body: {
        found: false,
        busy: true,
        uid: rawUid,
        ign: '',
        region: '',
        message: 'Lookup server busy across BD/IND/SG — you can confirm with your Player UID alone.',
      },
    };
  } catch {
    return {
      status: 200,
      body: {
        found: false,
        busy: true,
        uid: rawUid,
        ign: '',
        region: '',
        message: 'Lookup server busy — you can confirm with your Player UID alone.',
      },
    };
  }
}
