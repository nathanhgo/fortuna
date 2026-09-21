import { describe, expect, it } from 'vitest';
import { parseFenPieces, squareName } from './fen';

describe('squareName', () => {
  it('names squares from file and rank indexes', () => {
    expect(squareName(0, 0)).toBe('a1');
    expect(squareName(4, 3)).toBe('e4');
    expect(squareName(7, 7)).toBe('h8');
  });
});

describe('parseFenPieces', () => {
  it('places the standard army on the starting squares', () => {
    const pieces = parseFenPieces(
      'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
    );
    expect(pieces.e1).toEqual({ color: 'white', role: 'k' });
    expect(pieces.e8).toEqual({ color: 'black', role: 'k' });
    expect(pieces.a2).toEqual({ color: 'white', role: 'p' });
    expect(pieces.d8).toEqual({ color: 'black', role: 'q' });
    expect(pieces.e4).toBeUndefined();
  });
});
