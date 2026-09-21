import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { cellLabel, type Cell } from '@/lib/battleship/placement';
import { fortunaColors } from '@/theme/palette';

export type CellMark = 'empty' | 'ship' | 'hit' | 'miss' | 'sunk';

interface BattleshipBoardProps {
  title: string;
  boardSize: number;
  marks: Record<string, CellMark>;
  preview?: Cell[];
  disabled?: boolean;
  onCellClick?: (cell: Cell) => void;
}

const MARK_COLORS: Record<CellMark, { bg: string; fg: string }> = {
  empty: { bg: fortunaColors.ivory, fg: fortunaColors.graphite },
  ship: { bg: fortunaColors.graphite, fg: fortunaColors.ivory },
  hit: { bg: fortunaColors.wine, fg: fortunaColors.ivory },
  miss: { bg: fortunaColors.olive, fg: fortunaColors.ivory },
  sunk: { bg: fortunaColors.wine, fg: fortunaColors.ivory },
};

export function BattleshipBoard({
  title,
  boardSize,
  marks,
  preview = [],
  disabled = false,
  onCellClick,
}: BattleshipBoardProps) {
  const previewKeys = new Set(preview.map(([row, col]) => `${row},${col}`));

  return (
    <Stack spacing={1}>
      <Typography variant="body2" sx={{ color: fortunaColors.ivory, opacity: 0.75 }}>
        {title}
      </Typography>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: `repeat(${boardSize}, minmax(22px, 1fr))`,
          gap: '2px',
          maxWidth: boardSize * 32,
        }}
      >
        {Array.from({ length: boardSize }, (_, row) =>
          Array.from({ length: boardSize }, (_, col) => {
            const key = `${row},${col}`;
            const mark = marks[key] ?? 'empty';
            const colors = MARK_COLORS[mark];
            const isPreview = previewKeys.has(key);
            return (
              <Button
                key={key}
                aria-label={`${title} ${cellLabel(row, col)}`}
                disabled={disabled}
                onClick={() => onCellClick?.([row, col])}
                sx={{
                  minWidth: 0,
                  width: '100%',
                  aspectRatio: '1 / 1',
                  p: 0,
                  borderRadius: 0,
                  bgcolor: isPreview ? fortunaColors.gold : colors.bg,
                  color: isPreview ? fortunaColors.graphite : colors.fg,
                  border: `1px solid ${fortunaColors.gold}55`,
                  fontSize: '0.65rem',
                }}
              >
                {mark === 'hit' || mark === 'sunk' ? 'X' : mark === 'miss' ? '·' : ''}
              </Button>
            );
          })
        )}
      </Box>
    </Stack>
  );
}
