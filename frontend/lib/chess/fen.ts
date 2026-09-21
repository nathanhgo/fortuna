export type PieceColor = 'white' | 'black';
export type PieceRole = 'k' | 'q' | 'r' | 'b' | 'n' | 'p';

export interface ChessPiece {
  color: PieceColor;
  role: PieceRole;
}

const FILES = 'abcdefgh';

export function squareName(file: number, rank: number): string {
  return `${FILES[file]}${rank + 1}`;
}

export function parseFenPieces(fen: string): Record<string, ChessPiece> {
  const placement = fen.split(' ')[0] ?? '';
  const pieces: Record<string, ChessPiece> = {};
  const ranks = placement.split('/');
  ranks.forEach((rankFen, rankFromTop) => {
    const rank = 7 - rankFromTop;
    let file = 0;
    for (const char of rankFen) {
      if (char >= '1' && char <= '8') {
        file += Number(char);
        continue;
      }
      const role = char.toLowerCase() as PieceRole;
      pieces[squareName(file, rank)] = {
        color: char === char.toUpperCase() ? 'white' : 'black',
        role,
      };
      file += 1;
    }
  });
  return pieces;
}
