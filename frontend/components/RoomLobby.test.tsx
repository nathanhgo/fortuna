import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RoomLobby } from './RoomLobby';
import { getRoom, joinRoom, listGameInstances, createGameInstance } from '@/lib/api';
import { getStoredPlayer, storePlayer } from '@/lib/playerStorage';
import { subscribeToRoom } from '@/lib/roomSocket';

const pushMock = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}));

vi.mock('@/lib/api', () => ({
  getRoom: vi.fn(),
  joinRoom: vi.fn(),
  listGameInstances: vi.fn(),
  createGameInstance: vi.fn(),
}));

vi.mock('@/lib/playerStorage', () => ({
  getStoredPlayer: vi.fn(),
  storePlayer: vi.fn(),
}));

vi.mock('@/lib/roomSocket', () => ({
  subscribeToRoom: vi.fn(() => () => undefined),
}));

describe('RoomLobby', () => {
  beforeEach(() => {
    vi.mocked(getRoom).mockReset();
    vi.mocked(joinRoom).mockReset();
    vi.mocked(listGameInstances).mockReset();
    vi.mocked(createGameInstance).mockReset();
    vi.mocked(getStoredPlayer).mockReset();
    vi.mocked(storePlayer).mockReset();
    vi.mocked(subscribeToRoom).mockReset();
    vi.mocked(subscribeToRoom).mockReturnValue(() => undefined);
    vi.mocked(listGameInstances).mockResolvedValue([]);
    pushMock.mockReset();
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
    vi.mocked(listGameInstances).mockResolvedValue([]);
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
    vi.mocked(listGameInstances).mockResolvedValue([]);

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
    vi.mocked(listGameInstances).mockResolvedValue([]);
    vi.mocked(joinRoom).mockRejectedValue(new Error('Esse nome já está em uso nesta sala.'));

    render(<RoomLobby code="ABC123" />);

    await userEvent.type(await screen.findByLabelText(/nome/i), 'Bob');
    await userEvent.click(screen.getByRole('button', { name: /entrar na sala/i }));

    expect(await screen.findByText('Esse nome já está em uso nesta sala.')).toBeInTheDocument();
  });

  it('lists game instances and lets the player start a battleship match', async () => {
    vi.mocked(getStoredPlayer).mockReturnValue({ id: 1, displayName: 'Alice', token: 'tok-1' });
    vi.mocked(getRoom).mockResolvedValue({
      code: 'ABC123',
      created_at: '2026-01-01T00:00:00Z',
      players: [{ id: 1, display_name: 'Alice' }],
    });
    vi.mocked(listGameInstances).mockResolvedValue([
      {
        id: 'inst-1',
        game: 'battleship',
        status: 'configuring',
        config: {},
        participants: [{ display_name: 'Bob', role: 'player', seat: 0 }],
        winner_name: null,
        created_at: '2026-01-01T00:00:00Z',
      },
    ]);
    vi.mocked(createGameInstance).mockResolvedValue({
      id: 'inst-2',
      game: 'battleship',
      status: 'configuring',
      config: { board_size: 10, fleet_sizes: [5, 4, 3, 3, 2] },
      participants: [{ display_name: 'Alice', role: 'player', seat: 0 }],
      winner_name: null,
      created_at: '2026-01-01T00:00:00Z',
      state: null,
    });

    render(<RoomLobby code="ABC123" />);

    expect(await screen.findByRole('link', { name: /abrir mesa/i })).toBeInTheDocument();
    expect(screen.getByText(/Configurando/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /nova batalha naval/i }));

    await waitFor(() => expect(createGameInstance).toHaveBeenCalledWith('ABC123', 'tok-1', 'battleship'));
    expect(pushMock).toHaveBeenCalledWith('/sala/ABC123/batalha-naval/inst-2');
  });
});
