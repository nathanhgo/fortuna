'use client';

import Image from 'next/image';
import Link from 'next/link';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { fortunaColors } from '@/theme/palette';

export interface GameCoverCardProps {
  name: string;
  cover: string;
  description?: string;
  disabled?: boolean;
  comingSoon?: boolean;
  disabledLabel?: string;
  href?: string;
  onClick?: () => void;
}

export function GameCoverCard({
  name,
  cover,
  description,
  disabled = false,
  comingSoon = false,
  disabledLabel = 'Em breve',
  href,
  onClick,
}: GameCoverCardProps) {
  const faded = disabled || comingSoon;
  const interactive = (Boolean(onClick) || Boolean(href)) && !disabled;
  const linkable = Boolean(href) && !disabled && !onClick;

  return (
    <Box
      component={linkable ? Link : onClick ? 'button' : 'div'}
      href={linkable ? href : undefined}
      type={onClick ? 'button' : undefined}
      onClick={interactive && onClick ? onClick : undefined}
      disabled={onClick ? disabled : undefined}
      aria-label={faded ? `${name} (${disabledLabel})` : name}
      sx={{
        border: `1px solid ${fortunaColors.gold}33`,
        p: 2,
        bgcolor: fortunaColors.ivory,
        textAlign: 'left',
        cursor: interactive ? 'pointer' : 'default',
        appearance: 'none',
        font: 'inherit',
        color: 'inherit',
        opacity: faded ? 0.55 : 1,
        transition: 'transform 180ms ease',
        transformOrigin: 'center',
        width: '100%',
        textDecoration: 'none',
        '&:hover': faded
          ? undefined
          : {
              transform: 'scale(1.05)',
            },
        '&:disabled': {
          cursor: 'default',
        },
      }}
    >
      <Stack spacing={1.5}>
        <Box sx={{ position: 'relative', width: '100%', aspectRatio: '4 / 3' }}>
          <Image
            src={cover}
            alt={`Ilustração do jogo ${name}`}
            fill
            style={{ objectFit: 'contain' }}
          />
        </Box>
        <Typography variant="h5" component="h3" sx={{ color: fortunaColors.graphite }}>
          {name}
        </Typography>
        {description ? (
          <Typography variant="body2" sx={{ color: fortunaColors.graphite, opacity: 0.8 }}>
            {description}
          </Typography>
        ) : null}
        {faded ? (
          <Typography variant="caption" sx={{ color: fortunaColors.graphite, letterSpacing: '0.04em' }}>
            {disabledLabel}
          </Typography>
        ) : null}
      </Stack>
    </Box>
  );
}
