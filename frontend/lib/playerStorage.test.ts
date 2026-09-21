import { beforeEach, describe, expect, it } from 'vitest';
import { getStoredPlayer, storePlayer } from './playerStorage';

describe('playerStorage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns null when no player was stored for a room code', () => {
    expect(getStoredPlayer('ABC123')).toBeNull();
  });

  it('stores and retrieves the player token and name for a room code', () => {
    storePlayer('ABC123', { id: 1, displayName: 'Alice', token: 'token-123' });

    expect(getStoredPlayer('ABC123')).toEqual({ id: 1, displayName: 'Alice', token: 'token-123' });
  });

  it('keeps players from different rooms separate', () => {
    storePlayer('ABC123', { id: 1, displayName: 'Alice', token: 'token-123' });
    storePlayer('XYZ999', { id: 2, displayName: 'Bob', token: 'token-456' });

    expect(getStoredPlayer('ABC123')?.displayName).toBe('Alice');
    expect(getStoredPlayer('XYZ999')?.displayName).toBe('Bob');
  });
});
