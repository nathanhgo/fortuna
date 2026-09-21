import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChatDialog } from './ChatDialog';
import { listChatMessages, listGameInstances, sendChatMessage } from '@/lib/api';
import { getStoredPlayer } from '@/lib/playerStorage';

vi.mock('@/lib/api', () => ({
  listChatMessages: vi.fn(),
  sendChatMessage: vi.fn(),
  listGameInstances: vi.fn(),
}));

vi.mock('@/lib/playerStorage', () => ({
  getStoredPlayer: vi.fn(),
}));

vi.mock('@/lib/roomSocket', () => ({
  subscribeToRoom: vi.fn(() => () => undefined),
}));

describe('ChatDialog', () => {
  beforeEach(() => {
    vi.mocked(listChatMessages).mockReset();
    vi.mocked(sendChatMessage).mockReset();
    vi.mocked(listGameInstances).mockReset();
    vi.mocked(getStoredPlayer).mockReset();
    vi.mocked(getStoredPlayer).mockReturnValue({
      id: 1,
      displayName: 'Alice',
      token: 'tok-1',
    });
    vi.mocked(listChatMessages).mockResolvedValue([]);
    vi.mocked(listGameInstances).mockResolvedValue([
      {
        id: 'chess-1',
        game: 'chess',
        status: 'in_progress',
        config: {},
        participants: [{ player_id: 1, display_name: 'Alice', role: 'player', seat: 0 }],
        winner_name: null,
        created_at: '2026-01-01T00:00:00Z',
      },
    ]);
    vi.mocked(sendChatMessage).mockResolvedValue({
      id: 2,
      text: 'xeque',
      display_name: 'Alice',
      avatar: 'owl',
      created_at: '2026-01-01T00:01:00Z',
      instance_id: 'chess-1',
    });
  });

  it('offers the waiting-room channel and each table the player joined', async () => {
    render(<ChatDialog open onClose={() => undefined} roomCode="ABC123" />);

    expect(await screen.findByRole('tab', { name: /sala/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /xadrez #chess1/i })).toBeInTheDocument();
  });

  it('keeps a separate tab per chess table, even when the player sits alone', async () => {
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

    render(<ChatDialog open onClose={() => undefined} roomCode="ABC123" />);

    expect(await screen.findByRole('tab', { name: /xadrez #aa1111/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /xadrez #bb2222/i })).toBeInTheDocument();
  });

  it('sends a message on the selected table channel', async () => {
    vi.mocked(listChatMessages)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValue([
        {
          id: 2,
          text: 'xeque',
          display_name: 'Alice',
          avatar: 'owl',
          created_at: '2026-01-01T00:01:00Z',
          instance_id: 'chess-1',
        },
      ]);

    render(
      <ChatDialog open onClose={() => undefined} roomCode="ABC123" initialInstanceId="chess-1" />
    );

    await userEvent.click(await screen.findByRole('tab', { name: /xadrez/i }));
    await userEvent.type(await screen.findByLabelText(/mensagem/i), 'xeque');
    await userEvent.click(screen.getByRole('button', { name: /enviar/i }));

    await waitFor(() =>
      expect(sendChatMessage).toHaveBeenCalledWith('ABC123', 'tok-1', 'xeque', 'chess-1')
    );
    expect(await screen.findByText('xeque')).toBeInTheDocument();
  });
});
