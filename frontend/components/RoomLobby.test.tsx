import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RoomLobby } from './RoomLobby';
import {
  getRoom,
  joinRoom,
  listGameInstances,
  createGameInstance,
  updatePlayerAvatar,
} from '@/lib/api';
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
  updatePlayerAvatar: vi.fn(),
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
    vi.mocked(updatePlayerAvatar).mockReset();
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
      players: [{ id: 2, display_name: 'Bob', avatar: 'owl' }],
    });
    vi.mocked(listGameInstances).mockResolvedValue([]);
    vi.mocked(joinRoom).mockResolvedValue({
      id: 2,
      display_name: 'Bob',
      token: 'tok-2',
      avatar: 'owl',
    });

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
      players: [{ id: 1, display_name: 'Alice', avatar: 'laurel' }],
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

  it('lists game instances and lets the player start a battleship match from the catalog', async () => {
    vi.mocked(getStoredPlayer).mockReturnValue({ id: 1, displayName: 'Alice', token: 'tok-1' });
    vi.mocked(getRoom).mockResolvedValue({
      code: 'ABC123',
      created_at: '2026-01-01T00:00:00Z',
      players: [{ id: 1, display_name: 'Alice', avatar: 'sun' }],
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
    expect(screen.getByText('Configurando')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /batalha naval #inst1/i })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /^batalha naval$/i }));

    await waitFor(() =>
      expect(createGameInstance).toHaveBeenCalledWith('ABC123', 'tok-1', 'battleship')
    );
    expect(pushMock).toHaveBeenCalledWith('/sala/ABC123/batalha-naval/inst-2');
  });

  it('lets the player start a chess match from the catalog', async () => {
    vi.mocked(getStoredPlayer).mockReturnValue({ id: 1, displayName: 'Alice', token: 'tok-1' });
    vi.mocked(getRoom).mockResolvedValue({
      code: 'ABC123',
      created_at: '2026-01-01T00:00:00Z',
      players: [{ id: 1, display_name: 'Alice', avatar: 'sun' }],
    });
    vi.mocked(listGameInstances).mockResolvedValue([]);
    vi.mocked(createGameInstance).mockResolvedValue({
      id: 'chess-1',
      game: 'chess',
      status: 'configuring',
      config: { mode: 'assisted', host_color: 'random' },
      participants: [{ display_name: 'Alice', role: 'player', seat: 0 }],
      winner_name: null,
      created_at: '2026-01-01T00:00:00Z',
      state: null,
    });

    render(<RoomLobby code="ABC123" />);

    await userEvent.click(await screen.findByRole('button', { name: /^xadrez$/i }));

    await waitFor(() =>
      expect(createGameInstance).toHaveBeenCalledWith('ABC123', 'tok-1', 'chess')
    );
    expect(pushMock).toHaveBeenCalledWith('/sala/ABC123/xadrez/chess-1');
  });

  it('lets the player start a coup match from the catalog', async () => {
    vi.mocked(getStoredPlayer).mockReturnValue({ id: 1, displayName: 'Alice', token: 'tok-1' });
    vi.mocked(getRoom).mockResolvedValue({
      code: 'ABC123',
      created_at: '2026-01-01T00:00:00Z',
      players: [{ id: 1, display_name: 'Alice', avatar: 'sun' }],
    });
    vi.mocked(listGameInstances).mockResolvedValue([]);
    vi.mocked(createGameInstance).mockResolvedValue({
      id: 'coup-1',
      game: 'coup',
      status: 'configuring',
      config: { max_players: 6, reformation: false },
      participants: [{ display_name: 'Alice', role: 'player', seat: 0 }],
      winner_name: null,
      created_at: '2026-01-01T00:00:00Z',
      state: null,
    });

    render(<RoomLobby code="ABC123" />);

    await userEvent.click(await screen.findByRole('button', { name: /^coup$/i }));

    await waitFor(() =>
      expect(createGameInstance).toHaveBeenCalledWith('ABC123', 'tok-1', 'coup')
    );
    expect(pushMock).toHaveBeenCalledWith('/sala/ABC123/coup/coup-1');
  });

  it('shows coming-soon catalog games that cannot be created yet', async () => {
    vi.mocked(getStoredPlayer).mockReturnValue({ id: 1, displayName: 'Alice', token: 'tok-1' });
    vi.mocked(getRoom).mockResolvedValue({
      code: 'ABC123',
      created_at: '2026-01-01T00:00:00Z',
      players: [{ id: 1, display_name: 'Alice', avatar: 'sun' }],
    });
    vi.mocked(listGameInstances).mockResolvedValue([]);

    render(<RoomLobby code="ABC123" />);

    expect(await screen.findByRole('button', { name: /truco \(em breve\)/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /lobisomem \(em breve\)/i })).toBeDisabled();
    expect(createGameInstance).not.toHaveBeenCalled();
  });

  it('lets the current player change the room avatar from a picker', async () => {
    vi.mocked(getStoredPlayer).mockReturnValue({ id: 1, displayName: 'Alice', token: 'tok-1' });
    vi.mocked(getRoom)
      .mockResolvedValueOnce({
        code: 'ABC123',
        created_at: '2026-01-01T00:00:00Z',
        players: [{ id: 1, display_name: 'Alice', avatar: 'owl' }],
      })
      .mockResolvedValue({
        code: 'ABC123',
        created_at: '2026-01-01T00:00:00Z',
        players: [{ id: 1, display_name: 'Alice', avatar: 'trident' }],
      });
    vi.mocked(updatePlayerAvatar).mockResolvedValue({
      id: 1,
      display_name: 'Alice',
      avatar: 'trident',
    });

    render(<RoomLobby code="ABC123" />);

    await userEvent.click(await screen.findByRole('button', { name: /alterar imagem de perfil/i }));
    await userEvent.click(screen.getByRole('button', { name: 'Tridente' }));

    await waitFor(() =>
      expect(updatePlayerAvatar).toHaveBeenCalledWith('ABC123', 'tok-1', 'trident')
    );
  });

  it('shows a short #id on each table so two chess matches stay distinct', async () => {
    vi.mocked(getStoredPlayer).mockReturnValue({ id: 1, displayName: 'Alice', token: 'tok-1' });
    vi.mocked(getRoom).mockResolvedValue({
      code: 'ABC123',
      created_at: '2026-01-01T00:00:00Z',
      players: [{ id: 1, display_name: 'Alice', avatar: 'sun' }],
    });
    vi.mocked(listGameInstances).mockResolvedValue([
      {
        id: 'aa111111-1111-1111-1111-111111111111',
        game: 'chess',
        status: 'in_progress',
        config: {},
        participants: [{ player_id: 1, display_name: 'Alice', role: 'player', seat: 0 }],
        winner_name: null,
        created_at: '2026-01-01T00:00:00Z',
      },
      {
        id: 'bb222222-2222-2222-2222-222222222222',
        game: 'chess',
        status: 'configuring',
        config: {},
        participants: [{ player_id: 1, display_name: 'Alice', role: 'player', seat: 0 }],
        winner_name: null,
        created_at: '2026-01-01T00:01:00Z',
      },
    ]);

    render(<RoomLobby code="ABC123" />);

    expect(await screen.findByRole('heading', { name: /xadrez #aa1111/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /xadrez #bb2222/i })).toBeInTheDocument();
  });
});
