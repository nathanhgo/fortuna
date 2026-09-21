import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CreateRoomForm } from './CreateRoomForm';
import { createRoom } from '@/lib/api';
import { storePlayer } from '@/lib/playerStorage';

const pushMock = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}));

vi.mock('@/lib/api', () => ({
  createRoom: vi.fn(),
  ApiError: class ApiError extends Error {},
}));

vi.mock('@/lib/playerStorage', () => ({
  storePlayer: vi.fn(),
}));

describe('CreateRoomForm', () => {
  beforeEach(() => {
    pushMock.mockClear();
    vi.mocked(createRoom).mockReset();
    vi.mocked(storePlayer).mockReset();
  });

  it('creates a room with the given display name, stores the player and redirects', async () => {
    vi.mocked(createRoom).mockResolvedValue({
      room: { code: 'ABC123', created_at: '2026-01-01T00:00:00Z', players: [] },
      player: { id: 1, display_name: 'Alice', token: 'tok-1' },
    });

    render(<CreateRoomForm />);

    await userEvent.type(screen.getByLabelText(/nome/i), 'Alice');
    await userEvent.click(screen.getByRole('button', { name: /criar sala/i }));

    await waitFor(() => expect(createRoom).toHaveBeenCalledWith('Alice'));
    expect(storePlayer).toHaveBeenCalledWith('ABC123', {
      id: 1,
      displayName: 'Alice',
      token: 'tok-1',
    });
    expect(pushMock).toHaveBeenCalledWith('/sala/ABC123');
  });

  it('shows an error message when the request fails', async () => {
    vi.mocked(createRoom).mockRejectedValue(new Error('Informe um nome de usuário.'));

    render(<CreateRoomForm />);

    await userEvent.type(screen.getByLabelText(/nome/i), 'A');
    await userEvent.click(screen.getByRole('button', { name: /criar sala/i }));

    expect(await screen.findByText('Informe um nome de usuário.')).toBeInTheDocument();
    expect(pushMock).not.toHaveBeenCalled();
  });
});
