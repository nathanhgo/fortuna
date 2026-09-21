import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChessGame } from './ChessGame';
import {
  getGameInstance,
  joinGameInstance,
  playChessMove,
  updateChessConfig,
} from '@/lib/api';
import { getStoredPlayer } from '@/lib/playerStorage';

const pushMock = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}));

vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api')>();
  return {
    ...actual,
    getGameInstance: vi.fn(),
    joinGameInstance: vi.fn(),
    updateChessConfig: vi.fn(),
    playChessMove: vi.fn(),
    claimChessFlag: vi.fn(),
    requestRematch: vi.fn(),
  };
});

vi.mock('@/lib/playerStorage', () => ({
  getStoredPlayer: vi.fn(),
}));

vi.mock('@/lib/roomSocket', () => ({
  subscribeToRoom: vi.fn(() => () => undefined),
}));

const startingFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

const playingInstance = {
  id: 'inst-1',
  game: 'chess' as const,
  status: 'in_progress' as const,
  config: { mode: 'assisted', host_color: 'white', initial_seconds: null, increment_seconds: 0 },
  participants: [
    { display_name: 'Alice', role: 'player' as const, seat: 0 },
    { display_name: 'Bob', role: 'player' as const, seat: 1 },
  ],
  winner_name: null,
  created_at: '2026-01-01T00:00:00Z',
  state: {
    fen: startingFen,
    white_id: '1',
    black_id: '2',
    turn: 'white' as const,
    status: 'playing',
    winner: null,
    clocks: { white_ms: null, black_ms: null, last_stamp_ms: 0 },
    in_check: false,
    legal_moves: [
      { from: 'e2', to: 'e4', promotion: null },
      { from: 'e2', to: 'e3', promotion: null },
    ],
    pgn: '',
    last_move: null,
    viewer_color: 'white' as const,
  },
};

describe('ChessGame', () => {
  beforeEach(() => {
    vi.mocked(getGameInstance).mockReset();
    vi.mocked(joinGameInstance).mockReset();
    vi.mocked(updateChessConfig).mockReset();
    vi.mocked(playChessMove).mockReset();
    vi.mocked(getStoredPlayer).mockReset();
    pushMock.mockReset();
    vi.mocked(getStoredPlayer).mockReturnValue({
      id: 1,
      displayName: 'Alice',
      token: 'tok-1',
    });
  });

  it('lets a second player join an open match', async () => {
    vi.mocked(getStoredPlayer).mockReturnValue({
      id: 2,
      displayName: 'Bob',
      token: 'tok-2',
    });
    vi.mocked(getGameInstance).mockResolvedValue({
      ...playingInstance,
      status: 'configuring',
      participants: [{ display_name: 'Alice', role: 'player', seat: 0 }],
      state: null,
    });
    vi.mocked(joinGameInstance).mockResolvedValue(playingInstance);

    render(<ChessGame code="ABC123" instanceId="inst-1" />);

    await userEvent.click(await screen.findByRole('button', { name: /entrar como jogador/i }));
    await waitFor(() =>
      expect(joinGameInstance).toHaveBeenCalledWith('ABC123', 'inst-1', 'tok-2', 'player')
    );
  });

  it('asks the host for chess settings in a dialog', async () => {
    vi.mocked(getGameInstance).mockResolvedValue({
      ...playingInstance,
      status: 'configuring',
      participants: [{ display_name: 'Alice', role: 'player', seat: 0 }],
      state: null,
    });
    vi.mocked(updateChessConfig).mockResolvedValue({
      ...playingInstance,
      status: 'configuring',
      participants: [{ display_name: 'Alice', role: 'player', seat: 0 }],
      state: null,
    });

    render(<ChessGame code="ABC123" instanceId="inst-1" />);

    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /salvar configuração/i }));
    await waitFor(() =>
      expect(updateChessConfig).toHaveBeenCalledWith('ABC123', 'inst-1', 'tok-1', {
        mode: 'assisted',
        host_color: 'white',
        initial_seconds: null,
        increment_seconds: 0,
      })
    );
  });

  it('sends a pawn opening when the player clicks e2 then e4', async () => {
    vi.mocked(getGameInstance).mockResolvedValue(playingInstance);
    vi.mocked(playChessMove).mockResolvedValue({
      ...playingInstance,
      state: {
        ...playingInstance.state,
        turn: 'black',
        last_move: { from: 'e2', to: 'e4' },
        pgn: '1. e4',
      },
    });

    render(<ChessGame code="ABC123" instanceId="inst-1" />);

    await userEvent.click(await screen.findByRole('button', { name: 'e2 white p' }));
    await userEvent.click(screen.getByRole('button', { name: 'e4' }));

    await waitFor(() =>
      expect(playChessMove).toHaveBeenCalledWith('ABC123', 'inst-1', 'tok-1', 'e2', 'e4', undefined)
    );
  });

  it('sends the same opening in realistic mode with no legal-move list', async () => {
    vi.mocked(getGameInstance).mockResolvedValue({
      ...playingInstance,
      config: { mode: 'realistic', host_color: 'white', initial_seconds: null, increment_seconds: 0 },
      state: { ...playingInstance.state, legal_moves: [], in_check: false, pgn: '', last_move: null },
    });
    vi.mocked(playChessMove).mockResolvedValue({
      ...playingInstance,
      config: { mode: 'realistic', host_color: 'white', initial_seconds: null, increment_seconds: 0 },
      state: { ...playingInstance.state, turn: 'black', legal_moves: [] },
    });

    render(<ChessGame code="ABC123" instanceId="inst-1" />);

    await userEvent.click(await screen.findByRole('button', { name: 'e2 white p' }));
    await userEvent.click(screen.getByRole('button', { name: 'e4' }));

    await waitFor(() =>
      expect(playChessMove).toHaveBeenCalledWith('ABC123', 'inst-1', 'tok-1', 'e2', 'e4', undefined)
    );
  });

  it('shows who is watching beside the board', async () => {
    vi.mocked(getGameInstance).mockResolvedValue({
      ...playingInstance,
      participants: [
        ...playingInstance.participants,
        { display_name: 'Clara', role: 'spectator', seat: null },
      ],
    });

    render(<ChessGame code="ABC123" instanceId="inst-1" />);

    expect(await screen.findByText('Quem assiste')).toBeInTheDocument();
    expect(screen.getAllByText('Clara').length).toBeGreaterThan(0);
    expect(screen.getByText('Progresso salvo')).toBeInTheDocument();
  });
});
