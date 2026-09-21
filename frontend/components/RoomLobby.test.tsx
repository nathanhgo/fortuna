import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RoomLobby } from './RoomLobby';
import { getRoom, joinRoom } from '@/lib/api';
import { getStoredPlayer, storePlayer } from '@/lib/playerStorage';

vi.mock('@/lib/api', () => ({
  getRoom: vi.fn(),
  joinRoom: vi.fn(),
}));

vi.mock('@/lib/playerStorage', () => ({
  getStoredPlayer: vi.fn(),
  storePlayer: vi.fn(),
}));

describe('RoomLobby', () => {
  beforeEach(() => {
    vi.mocked(getRoom).mockReset();
    vi.mocked(joinRoom).mockReset();
    vi.mocked(getStoredPlayer).mockReset();
    vi.mocked(storePlayer).mockReset();
  });

  it('shows a join form when the player has no stored token for this room', async () => {
    vi.mocked(getStoredPlayer).mockReturnValue(null);
    vi.mocked(getRoom).mockResolvedValue({
      code: 'ABC123',
      created_at: '2026-01-01T00:00:00Z',
      players: [],
    });

    render(<RoomLobby code="ABC123" />);

    expect(await screen.findByLabelText(/nome/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /entrar na sala/i })).toBeInTheDocument();
  });

  it('joins the room, stores the player and shows the lobby afterwards', async () => {
    vi.mocked(getStoredPlayer).mockReturnValue(null);
    vi.mocked(getRoom).mockResolvedValue({
      code: 'ABC123',
      created_at: '2026-01-01T00:00:00Z',
      players: [{ id: 2, display_name: 'Bob' }],
    });
    vi.mocked(joinRoom).mockResolvedValue({ id: 2, display_name: 'Bob', token: 'tok-2' });

    render(<RoomLobby code="ABC123" />);

    await userEvent.type(await screen.findByLabelText(/nome/i), 'Bob');
    await userEvent.click(screen.getByRole('button', { name: /entrar na sala/i }));

    await waitFor(() => expect(joinRoom).toHaveBeenCalledWith('ABC123', 'Bob'));
    expect(storePlayer).toHaveBeenCalledWith('ABC123', {
      id: 2,
      displayName: 'Bob',
      token: 'tok-2',
    });
    expect(await screen.findByText('Bob')).toBeInTheDocument();
  });

  it('skips the join form and loads the lobby when a player token is already stored', async () => {
    vi.mocked(getStoredPlayer).mockReturnValue({ id: 1, displayName: 'Alice', token: 'tok-1' });
    vi.mocked(getRoom).mockResolvedValue({
      code: 'ABC123',
      created_at: '2026-01-01T00:00:00Z',
      players: [{ id: 1, display_name: 'Alice' }],
    });

    render(<RoomLobby code="ABC123" />);

    expect(await screen.findByText('Alice')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /entrar na sala/i })).not.toBeInTheDocument();
    expect(joinRoom).not.toHaveBeenCalled();
  });

  it('shows an error message when joining fails', async () => {
    vi.mocked(getStoredPlayer).mockReturnValue(null);
    vi.mocked(getRoom).mockResolvedValue({
      code: 'ABC123',
      created_at: '2026-01-01T00:00:00Z',
      players: [],
    });
    vi.mocked(joinRoom).mockRejectedValue(new Error('Esse nome já está em uso nesta sala.'));

    render(<RoomLobby code="ABC123" />);

    await userEvent.type(await screen.findByLabelText(/nome/i), 'Bob');
    await userEvent.click(screen.getByRole('button', { name: /entrar na sala/i }));

    expect(await screen.findByText('Esse nome já está em uso nesta sala.')).toBeInTheDocument();
  });
});
