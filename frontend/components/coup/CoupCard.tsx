'use client';

import Box from '@mui/material/Box';
import type { CoupCharacter } from '@/lib/api';
import { CHARACTER_LABELS } from '@/lib/coup/characters';
import { fortunaColors } from '@/theme/palette';
import { CoupCardBack, CoupCardFace } from './CoupCardArt';

interface CoupCardProps {
  character?: CoupCharacter | null;
  faceUp?: boolean;
  selected?: boolean;
  width?: number;
  tilt?: number;
  onClick?: () => void;
  ariaLabel?: string;
}

export function CoupCard({
  character = null,
  faceUp = false,
  selected = false,
  width = 108,
  tilt = 0,
  onClick,
  ariaLabel,
}: CoupCardProps) {
  const height = Math.round(width * 1.4);
  const label = ariaLabel ?? (faceUp && character ? CHARACTER_LABELS[character] : 'Carta oculta');

  return (
    <Box
      component={onClick ? 'button' : 'div'}
      type={onClick ? 'button' : undefined}
      aria-label={label}
      onClick={onClick}
      sx={{
        appearance: 'none',
        border: 0,
        p: 0,
        bgcolor: 'transparent',
        width,
        height,
        perspective: 900,
        cursor: onClick ? 'pointer' : 'default',
        transform: `rotate(${tilt}deg) ${selected ? 'translateY(-10px)' : ''}`,
        transition: 'transform 0.2s ease',
      }}
    >
      <Box
        sx={{
          width: '100%',
          height: '100%',
          position: 'relative',
          transformStyle: 'preserve-3d',
          transform: faceUp ? 'rotateY(0deg)' : 'rotateY(180deg)',
          transition: 'transform 0.55s ease',
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            backfaceVisibility: 'hidden',
            borderRadius: '8px',
            overflow: 'hidden',
            border: selected ? `2px solid ${fortunaColors.gold}` : '1px solid transparent',
          }}
        >
          {character ? <CoupCardFace character={character} /> : <CoupCardBack />}
        </Box>
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
            borderRadius: '8px',
            overflow: 'hidden',
          }}
        >
          <CoupCardBack />
        </Box>
      </Box>
    </Box>
  );
}
