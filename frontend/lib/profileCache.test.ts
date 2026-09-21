import { afterEach, describe, expect, it } from 'vitest';
import {
  loadProfile,
  profileStats,
  recordFinishedMatch,
  saveProfile,
} from './profileCache';

describe('profileCache', () => {
  afterEach(() => {
    window.localStorage.clear();
  });

  it('starts empty and persists a name, avatar and photo in this browser only', () => {
    expect(loadProfile().displayName).toBe('');
    saveProfile({ displayName: 'Clara', avatar: 'lyre', photoDataUrl: 'data:image/png;base64,xx' });
    const stored = loadProfile();
    expect(stored.displayName).toBe('Clara');
    expect(stored.avatar).toBe('lyre');
    expect(stored.photoDataUrl).toBe('data:image/png;base64,xx');
  });

  it('records a finished match once per instance and aggregates wins', () => {
    recordFinishedMatch({
      instanceId: 'm1',
      game: 'chess',
      result: 'win',
      opponent: 'Bob',
      roomCode: 'ABC123',
    });
    recordFinishedMatch({
      instanceId: 'm1',
      game: 'chess',
      result: 'win',
      opponent: 'Bob',
      roomCode: 'ABC123',
    });
    recordFinishedMatch({
      instanceId: 'm2',
      game: 'coup',
      result: 'loss',
      opponent: 'Bob',
      roomCode: 'ABC123',
    });

    const stats = profileStats(loadProfile());
    expect(loadProfile().matches).toHaveLength(2);
    expect(stats.wins).toBe(1);
    expect(stats.losses).toBe(1);
    expect(stats.draws).toBe(0);
    expect(stats.byGame.chess.wins).toBe(1);
    expect(stats.byGame.coup.losses).toBe(1);
  });
});
