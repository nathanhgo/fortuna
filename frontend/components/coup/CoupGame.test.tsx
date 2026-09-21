import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CoupGame } from './CoupGame';
import {
  deleteGameInstance,
  getGameInstance,
  joinGameInstance,
  playCoupAct,
  startGameInstance,
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
    updateCoupConfig: vi.fn(),
    startGameInstance: vi.fn(),
    playCoupAct: vi.fn(),
    requestRematch: vi.fn(),
    deleteGameInstance: vi.fn(),
  };
});

vi.mock('@/lib/playerStorage', () => ({
  getStoredPlayer: vi.fn(),
}));

vi.mock('@/lib/roomSocket', () => ({
  subscribeToRoom: vi.fn(() => () => undefined),
}));

const playingInstance = {
  id: 'inst-1',
  game: 'coup' as const,
  status: 'in_progress' as const,
  config: {
    max_players: 6,
    copies: { duke: 3, assassin: 3, captain: 3, ambassador: 3, contessa: 3, inquisitor: 0 },
    reformation: false,
    inquisitor: false,
    challenge_seconds: 15,
  },
  participants: [
    { player_id: 1, display_name: 'Alice', role: 'player' as const, seat: 0 },
    { player_id: 2, display_name: 'Bob', role: 'player' as const, seat: 1 },
  ],
  winner_name: null,
  created_at: '2026-01-01T00:00:00Z',
  state: {
    players: {
      '1': {
        coins: 2,
        hand: ['duke', 'captain'] as ('duke' | 'captain')[],
        hidden_count: 2,
        revealed: [],
        faction: null,
        alive: true,
      },
      '2': {
        coins: 2,
        hand: [null, null],
        hidden_count: 2,
        revealed: [],
        faction: null,
        alive: true,
      },
    },
    order: ['1', '2'],
    turn: '1',
    phase: 'action',
    pending: {},
    history: [{ text: 'A partida começou.' }],
    treasury_reserve: 0,
    winner: null,
    status: 'playing',
    deck_count: 11,
    challenge_seconds: 15,
    reformation: false,
    inquisitor: false,
    viewer_id: '1',
    legal_acts: [{ kind: 'income' }, { kind: 'foreign_aid' }, { kind: 'tax' }],
  },
};

describe('CoupGame', () => {
  beforeEach(() => {
    vi.mocked(getGameInstance).mockReset();
    vi.mocked(joinGameInstance).mockReset();
    vi.mocked(startGameInstance).mockReset();
    vi.mocked(playCoupAct).mockReset();
    vi.mocked(getStoredPlayer).mockReset();
    vi.mocked(deleteGameInstance).mockReset();
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
      participants: [{ player_id: 1, display_name: 'Alice', role: 'player', seat: 0 }],
      state: null,
    });
    vi.mocked(joinGameInstance).mockResolvedValue(playingInstance);

    render(<CoupGame code="ABC123" instanceId="inst-1" />);

    await userEvent.click(await screen.findByRole('button', { name: /entrar como jogador/i }));
    await waitFor(() =>
      expect(joinGameInstance).toHaveBeenCalledWith('ABC123', 'inst-1', 'tok-2', 'player')
    );
  });

  it('lets the host start after two players sit', async () => {
    vi.mocked(getGameInstance).mockResolvedValue({
      ...playingInstance,
      status: 'configuring',
      state: null,
    });
    vi.mocked(startGameInstance).mockResolvedValue(playingInstance);

    render(<CoupGame code="ABC123" instanceId="inst-1" />);

    await userEvent.click(await screen.findByRole('button', { name: /fechar/i }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    await userEvent.click(screen.getByRole('button', { name: /começar partida/i }));
    await waitFor(() =>
      expect(startGameInstance).toHaveBeenCalledWith('ABC123', 'inst-1', 'tok-1')
    );
  });

  it('sends income when it is the player turn', async () => {
    vi.mocked(getGameInstance).mockResolvedValue(playingInstance);
    vi.mocked(playCoupAct).mockResolvedValue({
      ...playingInstance,
      state: {
        ...playingInstance.state,
        turn: '2',
        players: {
          ...playingInstance.state.players,
          '1': { ...playingInstance.state.players['1'], coins: 3 },
        },
      },
    });

    render(<CoupGame code="ABC123" instanceId="inst-1" />);

    await userEvent.click(await screen.findByRole('button', { name: /^renda$/i }));
    await waitFor(() =>
      expect(playCoupAct).toHaveBeenCalledWith('ABC123', 'inst-1', 'tok-1', { kind: 'income' })
    );
  });

  it('splits actions into standard, owned cards and bluff', async () => {
    vi.mocked(getGameInstance).mockResolvedValue(playingInstance);

    render(<CoupGame code="ABC123" instanceId="inst-1" />);

    expect(await screen.findByText('Ações padrão')).toBeInTheDocument();
    expect(screen.getByText('Com as suas cartas')).toBeInTheDocument();
    expect(screen.getByText('Blefe')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^taxar$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^roubar$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /o que é renda/i })).toBeInTheDocument();
  });

  it('keeps unaffordable coup visible though disabled', async () => {
    vi.mocked(getGameInstance).mockResolvedValue(playingInstance);

    render(<CoupGame code="ABC123" instanceId="inst-1" />);

    const coup = await screen.findByRole('button', { name: /^golpe$/i });
    expect(coup).toBeDisabled();
  });

  it('renders the court as a compact pile', async () => {
    vi.mocked(getGameInstance).mockResolvedValue(playingInstance);

    render(<CoupGame code="ABC123" instanceId="inst-1" />);

    expect(await screen.findByLabelText(/pilha da corte/i)).toBeInTheDocument();
    expect(screen.getByText(/corte · 11 cartas/i)).toBeInTheDocument();
  });

  it('lets the proven player swap the shown card with the court', async () => {
    vi.mocked(getGameInstance).mockResolvedValue({
      ...playingInstance,
      state: {
        ...playingInstance.state,
        phase: 'show_proof',
        legal_acts: [{ kind: 'replace' }],
        pending: { shown: 'duke', shown_by: '1', actor: '1', claimed: 'duke' },
      },
    });
    vi.mocked(playCoupAct).mockResolvedValue(playingInstance);

    render(<CoupGame code="ABC123" instanceId="inst-1" />);

    expect(await screen.findByText(/mostrou duque/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /trocar com a corte/i }));
    await waitFor(() =>
      expect(playCoupAct).toHaveBeenCalledWith('ABC123', 'inst-1', 'tok-1', { kind: 'replace' })
    );
  });

  it('lets the challenger pick a hidden card when the claim was a bluff', async () => {
    vi.mocked(getStoredPlayer).mockReturnValue({
      id: 2,
      displayName: 'Bob',
      token: 'tok-2',
    });
    vi.mocked(getGameInstance).mockResolvedValue({
      ...playingInstance,
      state: {
        ...playingInstance.state,
        turn: '1',
        phase: 'lose_influence',
        viewer_id: '2',
        legal_acts: [
          { kind: 'reveal', slot: 0 },
          { kind: 'reveal', slot: 1 },
        ],
        pending: {
          actor: '1',
          claimed: 'duke',
          lose_queue: [{ player: '1', reason: 'challenge', chooser: '2' }],
        },
        players: {
          '1': { ...playingInstance.state.players['1'], hand: [null, null] },
          '2': { ...playingInstance.state.players['2'], hand: ['assassin', 'contessa'] },
        },
      },
    });
    vi.mocked(playCoupAct).mockResolvedValue(playingInstance);

    render(<CoupGame code="ABC123" instanceId="inst-1" />);

    const hidden = await screen.findAllByRole('button', { name: /escolher carta oculta/i });
    expect(hidden).toHaveLength(2);
    await userEvent.click(hidden[0]);
    await waitFor(() =>
      expect(playCoupAct).toHaveBeenCalledWith('ABC123', 'inst-1', 'tok-2', {
        kind: 'reveal',
        slot: 0,
      })
    );
  });

  it('rewrites player ids into names on the spectator rail', async () => {
    vi.mocked(getStoredPlayer).mockReturnValue({
      id: 14,
      displayName: 'Alice',
      token: 'tok-1',
    });
    vi.mocked(getGameInstance).mockResolvedValue({
      ...playingInstance,
      participants: [
        { player_id: 14, display_name: 'Alice', role: 'player', seat: 0 },
        { player_id: 15, display_name: 'Bob', role: 'player', seat: 1 },
      ],
      state: {
        ...playingInstance.state,
        players: {
          '14': playingInstance.state.players['1'],
          '15': playingInstance.state.players['2'],
        },
        order: ['14', '15'],
        turn: '14',
        viewer_id: '14',
        history: [{ text: '14 mostrou Duque. 15 perde influência.' }],
      },
    });

    render(<CoupGame code="ABC123" instanceId="inst-1" />);

    expect(await screen.findAllByText(/Alice mostrou Duque/i)).not.toHaveLength(0);
    expect(screen.getAllByText(/Bob perde influência/i).length).toBeGreaterThan(0);
    expect(screen.queryByText(/14 mostrou/)).not.toBeInTheDocument();
  });

  it('lets the table host delete the instance mid-game', async () => {
    vi.mocked(getGameInstance).mockResolvedValue(playingInstance);
    vi.mocked(deleteGameInstance).mockResolvedValue(undefined);

    render(<CoupGame code="ABC123" instanceId="inst-1" />);

    await userEvent.click(await screen.findByRole('button', { name: /excluir mesa/i }));
    await userEvent.click(screen.getByRole('button', { name: /confirmar exclusão/i }));

    await waitFor(() =>
      expect(deleteGameInstance).toHaveBeenCalledWith('ABC123', 'inst-1', 'tok-1')
    );
    expect(pushMock).toHaveBeenCalledWith('/sala/ABC123');
  });
});
