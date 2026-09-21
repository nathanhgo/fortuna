export interface StoredPlayer {
  id: number;
  displayName: string;
  token: string;
}

function storageKey(roomCode: string): string {
  return `fortuna:room:${roomCode}:player`;
}

export function getStoredPlayer(roomCode: string): StoredPlayer | null {
  if (typeof window === 'undefined') return null;

  const raw = window.localStorage.getItem(storageKey(roomCode));
  if (!raw) return null;

  try {
    return JSON.parse(raw) as StoredPlayer;
  } catch {
    return null;
  }
}

export function storePlayer(roomCode: string, player: StoredPlayer): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(storageKey(roomCode), JSON.stringify(player));
}
