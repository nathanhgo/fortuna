import { AVATAR_KEYS, isAvatarKey, type AvatarKey } from '@/lib/avatars';
import type { GameKind } from '@/lib/api';

const STORAGE_KEY = 'fortuna:profile';

export interface MatchRecord {
  instanceId: string;
  game: GameKind;
  result: 'win' | 'loss' | 'draw';
  opponent?: string;
  roomCode: string;
  at: string;
}

export interface ProfileCache {
  displayName: string;
  avatar: AvatarKey;
  photoDataUrl: string | null;
  matches: MatchRecord[];
}

export interface ProfileStats {
  wins: number;
  losses: number;
  draws: number;
  byGame: Record<GameKind, { wins: number; losses: number; draws: number }>;
}

const EMPTY_GAME_STATS = { wins: 0, losses: 0, draws: 0 };

function emptyProfile(): ProfileCache {
  return {
    displayName: '',
    avatar: AVATAR_KEYS[0],
    photoDataUrl: null,
    matches: [],
  };
}

function isGameKind(value: string): value is GameKind {
  return value === 'chess' || value === 'coup' || value === 'battleship';
}

function parseProfile(raw: string | null): ProfileCache {
  if (!raw) return emptyProfile();
  try {
    const data = JSON.parse(raw) as Partial<ProfileCache>;
    const matches = Array.isArray(data.matches)
      ? data.matches.filter(
          (item): item is MatchRecord =>
            Boolean(
              item &&
                typeof item.instanceId === 'string' &&
                isGameKind(item.game) &&
                (item.result === 'win' || item.result === 'loss' || item.result === 'draw')
            )
        )
      : [];
    return {
      displayName: typeof data.displayName === 'string' ? data.displayName : '',
      avatar: isAvatarKey(String(data.avatar ?? '')) ? data.avatar as AvatarKey : AVATAR_KEYS[0],
      photoDataUrl: typeof data.photoDataUrl === 'string' ? data.photoDataUrl : null,
      matches,
    };
  } catch {
    return emptyProfile();
  }
}

export function loadProfile(): ProfileCache {
  if (typeof window === 'undefined') return emptyProfile();
  return parseProfile(window.localStorage.getItem(STORAGE_KEY));
}

export function saveProfile(partial: Partial<ProfileCache>): ProfileCache {
  const next = { ...loadProfile(), ...partial };
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }
  return next;
}

export function recordFinishedMatch(record: Omit<MatchRecord, 'at'>): ProfileCache {
  const current = loadProfile();
  if (current.matches.some((item) => item.instanceId === record.instanceId)) {
    return current;
  }
  return saveProfile({
    matches: [{ ...record, at: new Date().toISOString() }, ...current.matches],
  });
}

export function profileStats(profile: ProfileCache): ProfileStats {
  const byGame: ProfileStats['byGame'] = {
    chess: { ...EMPTY_GAME_STATS },
    coup: { ...EMPTY_GAME_STATS },
    battleship: { ...EMPTY_GAME_STATS },
  };
  const totals = { wins: 0, losses: 0, draws: 0 };
  for (const match of profile.matches) {
    const key = match.result === 'win' ? 'wins' : match.result === 'loss' ? 'losses' : 'draws';
    byGame[match.game][key] += 1;
    totals[key] += 1;
  }
  return { ...totals, byGame };
}
