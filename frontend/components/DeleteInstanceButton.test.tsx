import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DeleteInstanceButton } from './DeleteInstanceButton';
import { deleteGameInstance } from '@/lib/api';

const pushMock = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}));

vi.mock('@/lib/api', () => ({
  deleteGameInstance: vi.fn(),
}));

describe('DeleteInstanceButton', () => {
  beforeEach(() => {
    vi.mocked(deleteGameInstance).mockReset();
    pushMock.mockReset();
  });

  it('asks for confirmation before deleting and then returns to the room', async () => {
    vi.mocked(deleteGameInstance).mockResolvedValue(undefined);

    render(<DeleteInstanceButton roomCode="ABC123" instanceId="inst-1" token="tok-1" />);

    await userEvent.click(screen.getByRole('button', { name: /excluir mesa/i }));
    expect(screen.getByText(/a partida some para todo mundo/i)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /confirmar exclusão/i }));

    await waitFor(() =>
      expect(deleteGameInstance).toHaveBeenCalledWith('ABC123', 'inst-1', 'tok-1')
    );
    expect(pushMock).toHaveBeenCalledWith('/sala/ABC123');
  });
});
