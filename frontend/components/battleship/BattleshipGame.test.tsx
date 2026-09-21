import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BattleshipGame } from './BattleshipGame';
import {
  fireBattleshipShot,
  getGameInstance,
  joinGameInstance,
  placeBattleshipFleet,
  requestRematch,
  updateBattleshipConfig,
} from '@/lib/api';
import { getStoredPlayer } from '@/lib/playerStorage';

const pushMock = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}));

vi.mock('@/lib/api', () => ({
  getGameInstance: vi.fn(),
  joinGameInstance: vi.fn(),
  updateBattleshipConfig: vi.fn(),
  placeBattleshipFleet: vi.fn(),
  fireBattleshipShot: vi.fn(),
  requestRematch: vi.fn(),
}));

vi.mock('@/lib/playerStorage', () => ({
  getStoredPlayer: vi.fn(),
}));

vi.mock('@/lib/roomSocket', () => ({
  subscribeToRoom: vi.fn(() => () => undefined),
}));

const configuringInstance = {
  id: 'inst-1',
  game: 'battleship' as const,
  status: 'configuring' as const,
  config: { board_size: 5, fleet_sizes: [2] },
  participants: [{ display_name: 'Alice', role: 'player' as const, seat: 0 }],
  winner_name: null,
  created_at: '2026-01-01T00:00:00Z',
  state: null,
};

describe('BattleshipGame', () => {
  beforeEach(() => {
    vi.mocked(getGameInstance).mockReset();
    vi.mocked(joinGameInstance).mockReset();
    vi.mocked(updateBattleshipConfig).mockReset();
    vi.mocked(placeBattleshipFleet).mockReset();
    vi.mocked(fireBattleshipShot).mockReset();
    vi.mocked(requestRematch).mockReset();
    vi.mocked(getStoredPlayer).mockReset();
    pushMock.mockReset();
    vi.mocked(getStoredPlayer).mockReturnValue({
      id: 1,
      displayName: 'Alice',
      token: 'tok-1',
    });
    vi.mocked(updateBattleshipConfig).mockResolvedValue(configuringInstance);
  });

  it('lets a second player join an open match', async () => {
    vi.mocked(getStoredPlayer).mockReturnValue({
      id: 2,
      displayName: 'Bob',
      token: 'tok-2',
    });
    vi.mocked(getGameInstance).mockResolvedValue(configuringInstance);
    vi.mocked(joinGameInstance).mockResolvedValue({
      ...configuringInstance,
      participants: [
        { display_name: 'Alice', role: 'player', seat: 0 },
        { display_name: 'Bob', role: 'player', seat: 1 },
      ],
    });

    render(<BattleshipGame code="ABC123" instanceId="inst-1" />);

    await userEvent.click(await screen.findByRole('button', { name: /entrar como jogador/i }));

    await waitFor(() =>
      expect(joinGameInstance).toHaveBeenCalledWith('ABC123', 'inst-1', 'tok-2', 'player')
    );
  });

  it('places the remaining ship and sends the fleet to the backend', async () => {
    vi.mocked(getGameInstance).mockResolvedValue(configuringInstance);
    vi.mocked(placeBattleshipFleet).mockResolvedValue({
      ...configuringInstance,
      state: {
        board_size: 5,
        fleet_sizes: [2],
        fleets: { '1': { ships: [[[0, 0], [0, 1]]], shots_received: [] } },
        turn: null,
        winner: null,
      },
    });

    render(<BattleshipGame code="ABC123" instanceId="inst-1" />);

    await userEvent.click(await screen.findByRole('button', { name: /salvar configuração/i }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    await userEvent.click(await screen.findByRole('button', { name: /sua frota a1/i }));
    await userEvent.click(screen.getByRole('button', { name: /confirmar frota/i }));

    await waitFor(() =>
      expect(placeBattleshipFleet).toHaveBeenCalledWith('ABC123', 'inst-1', 'tok-1', [
        [
          [0, 0],
          [0, 1],
        ],
      ])
    );
  });

  it('fires a shot on the opponent board when it is the player turn', async () => {
    vi.mocked(getGameInstance).mockResolvedValue({
      ...configuringInstance,
      status: 'in_progress',
      state: {
        board_size: 5,
        fleet_sizes: [2],
        fleets: {
          '1': { ships: [[[0, 0], [0, 1]]], shots_received: [] },
          '2': { ships: [], shots_received: [] },
        },
        turn: '1',
        winner: null,
      },
    });
    vi.mocked(fireBattleshipShot).mockResolvedValue({
      ...configuringInstance,
      status: 'in_progress',
      result: 'miss',
      state: {
        board_size: 5,
        fleet_sizes: [2],
        fleets: {
          '1': { ships: [[[0, 0], [0, 1]]], shots_received: [] },
          '2': { ships: [], shots_received: [{ cell: [4, 4], result: 'miss' }] },
        },
        turn: '2',
        winner: null,
      },
    });

    render(<BattleshipGame code="ABC123" instanceId="inst-1" />);

    await userEvent.click(await screen.findByRole('button', { name: /frota adversária e5/i }));

    await waitFor(() =>
      expect(fireBattleshipShot).toHaveBeenCalledWith('ABC123', 'inst-1', 'tok-1', [4, 4])
    );
  });

  it('asks the host for board settings in a dialog', async () => {
    vi.mocked(getGameInstance).mockResolvedValue(configuringInstance);

    render(<BattleshipGame code="ABC123" instanceId="inst-1" />);

    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(screen.getByLabelText(/tamanho do tabuleiro/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /salvar configuração/i }));
    await waitFor(() =>
      expect(updateBattleshipConfig).toHaveBeenCalledWith('ABC123', 'inst-1', 'tok-1', {
        board_size: 5,
        fleet_sizes: [2],
      })
    );
  });

  it('announces when a shot sinks a ship', async () => {
    vi.mocked(getGameInstance).mockResolvedValue({
      ...configuringInstance,
      status: 'in_progress',
      state: {
        board_size: 5,
        fleet_sizes: [2],
        fleets: {
          '1': { ships: [[[0, 0], [0, 1]]], shots_received: [] },
          '2': { ships: [], shots_received: [] },
        },
        turn: '1',
        winner: null,
      },
    });
    vi.mocked(fireBattleshipShot).mockResolvedValue({
      ...configuringInstance,
      status: 'in_progress',
      result: 'sunk',
      state: {
        board_size: 5,
        fleet_sizes: [2],
        fleets: {
          '1': { ships: [[[0, 0], [0, 1]]], shots_received: [] },
          '2': {
            ships: [[[4, 3], [4, 4]]],
            shots_received: [
              { cell: [4, 3], result: 'hit' },
              { cell: [4, 4], result: 'sunk' },
            ],
          },
        },
        turn: '1',
        winner: null,
      },
    });

    render(<BattleshipGame code="ABC123" instanceId="inst-1" />);

    await userEvent.click(await screen.findByRole('button', { name: /frota adversária e5/i }));

    expect(await screen.findByText(/afundou um navio de 2 casas/i)).toBeInTheDocument();
  });

  it('offers rematch with the current config after the match ends', async () => {
    vi.mocked(getGameInstance).mockResolvedValue({
      ...configuringInstance,
      status: 'finished',
      winner_name: 'Alice',
      state: {
        board_size: 5,
        fleet_sizes: [2],
        fleets: {
          '1': { ships: [[[0, 0], [0, 1]]], shots_received: [] },
          '2': { ships: [], shots_received: [] },
        },
        turn: null,
        winner: '1',
      },
    });
    vi.mocked(requestRematch).mockResolvedValue({
      ...configuringInstance,
      id: 'inst-2',
    });

    render(<BattleshipGame code="ABC123" instanceId="inst-1" />);

    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /^jogar novamente$/i }));

    await waitFor(() =>
      expect(requestRematch).toHaveBeenCalledWith('ABC123', 'inst-1', 'tok-1', {
        board_size: 5,
        fleet_sizes: [2],
      })
    );
    expect(pushMock).toHaveBeenCalledWith('/sala/ABC123/batalha-naval/inst-2');
  });
});
