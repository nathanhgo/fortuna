'use client';

import { useState } from 'react';
import Box from '@mui/material/Box';
import { parseFenPieces, squareName, type PieceRole } from '@/lib/chess/fen';
import { fortunaColors } from '@/theme/palette';
import { ChessPieceIcon } from './ChessPieceIcon';

export interface ChessArrow {
  from: string;
  to: string;
}

export interface LegalMove {
  from: string;
  to: string;
  promotion: string | null;
}

interface ChessBoardProps {
  fen: string;
  orientation: 'white' | 'black';
  lastMove?: { from: string; to: string } | null;
  legalMoves?: LegalMove[];
  selected?: string | null;
  arrows?: ChessArrow[];
  assisted?: boolean;
  disabled?: boolean;
  onSelect?: (square: string) => void;
  onMove?: (from: string, to: string) => void;
  onArrowsChange?: (arrows: ChessArrow[]) => void;
}

function fileRank(square: string): [number, number] {
  return [square.charCodeAt(0) - 97, Number(square[1]) - 1];
}

export function ChessBoard({
  fen,
  orientation,
  lastMove = null,
  legalMoves = [],
  selected = null,
  arrows = [],
  assisted = false,
  disabled = false,
  onSelect,
  onMove,
  onArrowsChange,
}: ChessBoardProps) {
  const pieces = parseFenPieces(fen);
  const files = orientation === 'white' ? [0, 1, 2, 3, 4, 5, 6, 7] : [7, 6, 5, 4, 3, 2, 1, 0];
  const ranks = orientation === 'white' ? [7, 6, 5, 4, 3, 2, 1, 0] : [0, 1, 2, 3, 4, 5, 6, 7];
  const legalTargets = new Set(
    legalMoves.filter((move) => move.from === selected).map((move) => move.to)
  );
  const [dragArrow, setDragArrow] = useState<string | null>(null);

  function handleClick(square: string) {
    if (disabled) return;
    if (!selected) {
      onSelect?.(square);
      return;
    }
    if (selected === square) {
      onSelect?.('');
      return;
    }
    const selectedPiece = pieces[selected];
    const clickedPiece = pieces[square];
    if (selectedPiece && clickedPiece && clickedPiece.color === selectedPiece.color) {
      onSelect?.(square);
      return;
    }
    if (!assisted || legalTargets.has(square)) {
      onMove?.(selected, square);
    }
    onSelect?.('');
  }

  return (
    <Box
      sx={{
        position: 'relative',
        width: '100%',
        maxWidth: 480,
        mx: 'auto',
        aspectRatio: '1 / 1',
        border: `1px solid ${fortunaColors.gold}`,
      }}
      onContextMenu={(event) => event.preventDefault()}
    >
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(8, 1fr)',
          gridTemplateRows: 'repeat(8, 1fr)',
          width: '100%',
          height: '100%',
        }}
      >
        {ranks.flatMap((rank) =>
          files.map((file) => {
            const square = squareName(file, rank);
            const dark = (file + rank) % 2 === 1;
            const piece = pieces[square];
            const isLast =
              lastMove && (lastMove.from === square || lastMove.to === square);
            const isSelected = selected === square;
            const isTarget = legalTargets.has(square);
            return (
              <Box
                key={square}
                component="button"
                type="button"
                aria-label={piece ? `${square} ${piece.color} ${piece.role}` : square}
                disabled={disabled}
                onClick={() => handleClick(square)}
                onMouseDown={(event) => {
                  if (event.button === 2) setDragArrow(square);
                }}
                onMouseUp={(event) => {
                  if (event.button !== 2 || !dragArrow) return;
                  if (dragArrow === square) {
                    onArrowsChange?.([]);
                  } else {
                    onArrowsChange?.([...arrows.filter((arrow) => !(arrow.from === dragArrow && arrow.to === square)), { from: dragArrow, to: square }]);
                  }
                  setDragArrow(null);
                }}
                sx={{
                  minWidth: 0,
                  p: 0,
                  border: 0,
                  appearance: 'none',
                  cursor: disabled ? 'default' : 'pointer',
                  bgcolor: dark ? `${fortunaColors.gold}33` : fortunaColors.ivory,
                  boxShadow: isSelected
                    ? `inset 0 0 0 2px ${fortunaColors.gold}`
                    : isLast
                      ? `inset 0 0 0 2px ${fortunaColors.olive}`
                      : undefined,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                }}
              >
                {isTarget && assisted ? (
                  <Box
                    sx={{
                      position: 'absolute',
                      width: piece ? '86%' : 10,
                      height: piece ? '86%' : 10,
                      borderRadius: piece ? 0 : '50%',
                      border: piece ? `2px solid ${fortunaColors.olive}` : undefined,
                      bgcolor: piece ? 'transparent' : fortunaColors.olive,
                      opacity: 0.85,
                    }}
                  />
                ) : null}
                {piece ? <ChessPieceIcon piece={piece} size={34} /> : null}
              </Box>
            );
          })
        )}
      </Box>
      <svg
        viewBox="0 0 8 8"
        width="100%"
        height="100%"
        style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
      >
        {arrows.map((arrow) => {
          const [fromFile, fromRank] = fileRank(arrow.from);
          const [toFile, toRank] = fileRank(arrow.to);
          const display = (file: number, rank: number) => {
            const x = orientation === 'white' ? file + 0.5 : 7 - file + 0.5;
            const y = orientation === 'white' ? 7 - rank + 0.5 : rank + 0.5;
            return [x, y] as const;
          };
          const [x1, y1] = display(fromFile, fromRank);
          const [x2, y2] = display(toFile, toRank);
          return (
            <line
              key={`${arrow.from}${arrow.to}`}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={fortunaColors.gold}
              strokeWidth="0.12"
              markerEnd="url(#arrowhead)"
              opacity="0.9"
            />
          );
        })}
        <defs>
          <marker id="arrowhead" markerWidth="4" markerHeight="4" refX="3" refY="2" orient="auto">
            <path d="M0,0 L4,2 L0,4 Z" fill={fortunaColors.gold} />
          </marker>
        </defs>
      </svg>
    </Box>
  );
}

export const PROMOTION_ROLES: PieceRole[] = ['q', 'r', 'b', 'n'];
