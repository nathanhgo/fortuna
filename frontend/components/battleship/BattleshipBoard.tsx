import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { cellLabel, shipLayout, type Cell } from '@/lib/battleship/placement';
import { fortunaColors } from '@/theme/palette';
import { HitMark, MissMark, ShipSilhouette } from './ShipSilhouette';

export type CellMark = 'empty' | 'hit' | 'miss';

interface BattleshipBoardProps {
  title: string;
  boardSize: number;
  marks: Record<string, CellMark>;
  ships?: Cell[][];
  wreckedShips?: Cell[][];
  preview?: Cell[];
  disabled?: boolean;
  onCellClick?: (cell: Cell) => void;
}

export function BattleshipBoard({
  title,
  boardSize,
  marks,
  ships = [],
  wreckedShips = [],
  preview = [],
  disabled = false,
  onCellClick,
}: BattleshipBoardProps) {
  const previewKeys = new Set(preview.map(([row, col]) => `${row},${col}`));
  const wreckedKeys = new Set(wreckedShips.flat().map(([row, col]) => `${row},${col}`));
  const layouts = ships.map(shipLayout);
  const previewLayout = preview.length > 1 ? shipLayout(preview) : null;

  const gridSx = {
    display: 'grid',
    gridTemplateColumns: `repeat(${boardSize}, minmax(0, 1fr))`,
    gridTemplateRows: `repeat(${boardSize}, minmax(0, 1fr))`,
    gap: '2px',
    width: '100%',
    height: '100%',
  } as const;

  return (
    <Stack spacing={1} sx={{ width: '100%', maxWidth: boardSize * 32, mx: 'auto' }}>
      <Typography
        variant="body2"
        sx={{ color: fortunaColors.ivory, opacity: 0.75, textAlign: 'center' }}
      >
        {title}
      </Typography>
      <Box sx={{ position: 'relative', width: '100%', aspectRatio: '1 / 1' }}>
        <Box sx={gridSx}>
          {Array.from({ length: boardSize }, (_, row) =>
            Array.from({ length: boardSize }, (_, col) => {
              const key = `${row},${col}`;
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
                    height: '100%',
                    p: 0,
                    borderRadius: 0,
                    bgcolor: isPreview ? `${fortunaColors.gold}66` : fortunaColors.ivory,
                    border: `1px solid ${fortunaColors.gold}55`,
                  }}
                />
              );
            })
          )}
        </Box>
        <Box sx={{ ...gridSx, position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          {layouts.map((ship) => (
            <Box
              key={`${ship.origin[0]}-${ship.origin[1]}-${ship.length}`}
              sx={{
                gridColumn:
                  ship.orientation === 'horizontal'
                    ? `${ship.origin[1] + 1} / span ${ship.length}`
                    : `${ship.origin[1] + 1}`,
                gridRow:
                  ship.orientation === 'vertical'
                    ? `${ship.origin[0] + 1} / span ${ship.length}`
                    : `${ship.origin[0] + 1}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                placeSelf: 'center',
                width: '94%',
                height: '78%',
                minWidth: 0,
                minHeight: 0,
              }}
            >
              <ShipSilhouette
                length={ship.length}
                orientation={ship.orientation}
                wrecked={ship.cells.some(([row, col]) => wreckedKeys.has(`${row},${col}`))}
              />
            </Box>
          ))}
          {previewLayout ? (
            <Box
              sx={{
                gridColumn:
                  previewLayout.orientation === 'horizontal'
                    ? `${previewLayout.origin[1] + 1} / span ${previewLayout.length}`
                    : `${previewLayout.origin[1] + 1}`,
                gridRow:
                  previewLayout.orientation === 'vertical'
                    ? `${previewLayout.origin[0] + 1} / span ${previewLayout.length}`
                    : `${previewLayout.origin[0] + 1}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                placeSelf: 'center',
                width: '94%',
                height: '78%',
                minWidth: 0,
                minHeight: 0,
                opacity: 0.55,
              }}
            >
              <ShipSilhouette
                length={previewLayout.length}
                orientation={previewLayout.orientation}
              />
            </Box>
          ) : null}
        </Box>
        <Box sx={{ ...gridSx, position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          {Array.from({ length: boardSize }, (_, row) =>
            Array.from({ length: boardSize }, (_, col) => {
              const mark = marks[`${row},${col}`] ?? 'empty';
              return (
                <Box
                  key={`${row}-${col}-shot`}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minWidth: 0,
                    minHeight: 0,
                  }}
                >
                  {mark === 'hit' ? <HitMark /> : mark === 'miss' ? <MissMark /> : null}
                </Box>
              );
            })
          )}
        </Box>
      </Box>
    </Stack>
  );
}
