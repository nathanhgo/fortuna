import { fortunaColors } from '@/theme/palette';
import type { ChessPiece } from '@/lib/chess/fen';

interface ChessPieceIconProps {
  piece: ChessPiece;
  size?: number;
}

export function ChessPieceIcon({ piece, size = 36 }: ChessPieceIconProps) {
  const stroke = piece.color === 'white' ? fortunaColors.gold : fortunaColors.wine;
  const fill = piece.color === 'white' ? fortunaColors.ivory : fortunaColors.graphite;
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden>
      {piece.role === 'k' ? <King fill={fill} stroke={stroke} /> : null}
      {piece.role === 'q' ? <Queen fill={fill} stroke={stroke} /> : null}
      {piece.role === 'r' ? <Rook fill={fill} stroke={stroke} /> : null}
      {piece.role === 'b' ? <Bishop fill={fill} stroke={stroke} /> : null}
      {piece.role === 'n' ? <Knight fill={fill} stroke={stroke} /> : null}
      {piece.role === 'p' ? <Pawn fill={fill} stroke={stroke} /> : null}
    </svg>
  );
}

function King({ fill, stroke }: { fill: string; stroke: string }) {
  return (
    <>
      <path d="M20 6 V12" stroke={stroke} strokeWidth="1.8" />
      <path d="M17 8 H23" stroke={stroke} strokeWidth="1.8" />
      <path d="M12 16 L20 12 L28 16 L26 30 H14 Z" fill={fill} stroke={stroke} strokeWidth="1.6" />
      <path d="M13 32 H27" stroke={stroke} strokeWidth="1.8" />
    </>
  );
}

function Queen({ fill, stroke }: { fill: string; stroke: string }) {
  return (
    <>
      <circle cx="10" cy="12" r="2" fill={stroke} />
      <circle cx="20" cy="8" r="2" fill={stroke} />
      <circle cx="30" cy="12" r="2" fill={stroke} />
      <path d="M10 12 L14 28 H26 L30 12 L20 16 Z" fill={fill} stroke={stroke} strokeWidth="1.6" />
      <path d="M13 32 H27" stroke={stroke} strokeWidth="1.8" />
    </>
  );
}

function Rook({ fill, stroke }: { fill: string; stroke: string }) {
  return (
    <path
      d="M12 8 H16 V12 H24 V8 H28 V16 H26 L26 28 H14 L14 16 H12 Z M12 30 H28"
      fill={fill}
      stroke={stroke}
      strokeWidth="1.6"
    />
  );
}

function Bishop({ fill, stroke }: { fill: string; stroke: string }) {
  return (
    <>
      <circle cx="20" cy="9" r="2.2" fill={fill} stroke={stroke} strokeWidth="1.4" />
      <path d="M20 12 C14 18 13 26 16 30 H24 C27 26 26 18 20 12 Z" fill={fill} stroke={stroke} strokeWidth="1.6" />
      <path d="M18 20 L23 16" stroke={stroke} strokeWidth="1.3" />
    </>
  );
}

function Knight({ fill, stroke }: { fill: string; stroke: string }) {
  return (
    <path
      d="M12 30 H28 V26 C28 22 26 20 24 18 C28 16 28 10 22 8 C20 6 16 8 14 12 L10 16 V20 L14 18 C14 22 12 26 12 30 Z"
      fill={fill}
      stroke={stroke}
      strokeWidth="1.6"
    />
  );
}

function Pawn({ fill, stroke }: { fill: string; stroke: string }) {
  return (
    <>
      <circle cx="20" cy="13" r="5" fill={fill} stroke={stroke} strokeWidth="1.6" />
      <path d="M14 20 L20 18 L26 20 L28 30 H12 Z" fill={fill} stroke={stroke} strokeWidth="1.6" />
    </>
  );
}
