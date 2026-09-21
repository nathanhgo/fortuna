import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChessBoard } from './ChessBoard';

const startingFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

function PlayableBoard({
  assisted,
  legalMoves = [],
  onMove,
}: {
  assisted: boolean;
  legalMoves?: { from: string; to: string; promotion: string | null }[];
  onMove: (from: string, to: string) => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  return (
    <ChessBoard
      fen={startingFen}
      orientation="white"
      assisted={assisted}
      legalMoves={legalMoves}
      selected={selected}
      onSelect={(square) => setSelected(square || null)}
      onMove={onMove}
    />
  );
}

describe('ChessBoard', () => {
  it('moves a piece in realistic mode without legal-move hints', async () => {
    const onMove = vi.fn();
    render(<PlayableBoard assisted={false} legalMoves={[]} onMove={onMove} />);

    await userEvent.click(screen.getByRole('button', { name: 'e2 white p' }));
    await userEvent.click(screen.getByRole('button', { name: 'e4' }));

    expect(onMove).toHaveBeenCalledWith('e2', 'e4');
  });

  it('still highlights assisted targets when legal moves are provided', async () => {
    const onMove = vi.fn();
    render(
      <PlayableBoard
        assisted
        legalMoves={[{ from: 'e2', to: 'e4', promotion: null }]}
        onMove={onMove}
      />
    );

    await userEvent.click(screen.getByRole('button', { name: 'e2 white p' }));
    await userEvent.click(screen.getByRole('button', { name: 'e4' }));

    expect(onMove).toHaveBeenCalledWith('e2', 'e4');
  });
});
