import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, createRoom, getRoom, joinRoom } from './api';

describe('api client', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('createRoom posts the display name and returns the room and player', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({
        room: { code: 'ABC123', created_at: '2026-01-01T00:00:00Z', players: [] },
        player: { id: 1, display_name: 'Alice', token: 'token-123' },
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await createRoom('Alice');

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/rooms/'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ display_name: 'Alice' }),
      })
    );
    expect(result.room.code).toBe('ABC123');
    expect(result.player.token).toBe('token-123');
  });

  it('joinRoom posts to the room players endpoint', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({ id: 2, display_name: 'Bob', token: 'token-456' }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const player = await joinRoom('ABC123', 'Bob');

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/rooms/ABC123/players/'),
      expect.objectContaining({ method: 'POST' })
    );
    expect(player.display_name).toBe('Bob');
  });

  it('getRoom fetches the room by code', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ code: 'ABC123', created_at: '2026-01-01T00:00:00Z', players: [] }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const room = await getRoom('ABC123');

    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('/api/rooms/ABC123/'), undefined);
    expect(room.code).toBe('ABC123');
  });

  it('throws an ApiError with the backend message when the request fails', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ display_name: ['Esse nome já está em uso nesta sala.'] }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(joinRoom('ABC123', 'Bob')).rejects.toBeInstanceOf(ApiError);
    await expect(joinRoom('ABC123', 'Bob')).rejects.toThrow('Esse nome já está em uso nesta sala.');
  });
});
