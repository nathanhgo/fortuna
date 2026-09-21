'use client';

import { useState, type ReactNode } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { fortunaColors } from '@/theme/palette';

export interface SpectatorPerson {
  name: string;
  detail?: string;
}

export function splitAudience(
  participants: { display_name: string; role: string }[]
): { players: SpectatorPerson[]; spectators: SpectatorPerson[] } {
  return {
    players: participants
      .filter((participant) => participant.role === 'player')
      .map((participant) => ({ name: participant.display_name })),
    spectators: participants
      .filter((participant) => participant.role === 'spectator')
      .map((participant) => ({ name: participant.display_name })),
  };
}

interface SpectatorRailProps {
  players: SpectatorPerson[];
  spectators: SpectatorPerson[];
  notes: string[];
  saved?: boolean;
  watching?: boolean;
}

function RailBody({
  players,
  spectators,
  notes,
  saved,
  watching,
}: SpectatorRailProps) {
  return (
    <Stack spacing={2}>
      {watching ? (
        <Typography variant="caption" sx={{ color: fortunaColors.gold, letterSpacing: '0.04em' }}>
          Você está assistindo
        </Typography>
      ) : null}
      {saved ? (
        <Typography variant="caption" sx={{ color: fortunaColors.olive }}>
          Progresso salvo
        </Typography>
      ) : null}
      <Stack spacing={0.75}>
        <Typography variant="subtitle2" sx={{ color: fortunaColors.gold }}>
          Na mesa
        </Typography>
        {players.length === 0 ? (
          <Typography variant="body2" sx={{ color: fortunaColors.ivory, opacity: 0.65 }}>
            Ninguém sentou ainda
          </Typography>
        ) : (
          players.map((person) => (
            <Box key={person.name}>
              <Typography variant="body2" sx={{ color: fortunaColors.ivory }}>
                {person.name}
              </Typography>
              {person.detail ? (
                <Typography variant="caption" sx={{ color: fortunaColors.ivory, opacity: 0.7 }}>
                  {person.detail}
                </Typography>
              ) : null}
            </Box>
          ))
        )}
      </Stack>
      <Stack spacing={0.75}>
        <Typography variant="subtitle2" sx={{ color: fortunaColors.gold }}>
          Quem assiste
        </Typography>
        {spectators.length === 0 ? (
          <Typography variant="body2" sx={{ color: fortunaColors.ivory, opacity: 0.65 }}>
            Ninguém assistindo
          </Typography>
        ) : (
          spectators.map((person) => (
            <Typography key={person.name} variant="body2" sx={{ color: fortunaColors.ivory }}>
              {person.name}
            </Typography>
          ))
        )}
      </Stack>
      {notes.length > 0 ? (
        <Stack spacing={0.5}>
          <Typography variant="subtitle2" sx={{ color: fortunaColors.gold }}>
            Partida
          </Typography>
          {notes.map((note) => (
            <Typography key={note} variant="body2" sx={{ color: fortunaColors.ivory, opacity: 0.85 }}>
              {note}
            </Typography>
          ))}
        </Stack>
      ) : null}
    </Stack>
  );
}

export function SpectatorRail(props: SpectatorRailProps) {
  const [open, setOpen] = useState(false);
  const paper = {
    border: `1px solid ${fortunaColors.gold}55`,
    bgcolor: fortunaColors.graphite,
    p: 2,
  };

  return (
    <>
      <Box sx={{ display: { xs: 'block', md: 'none' } }}>
        <Button
          variant="outlined"
          onClick={() => setOpen(true)}
          sx={{ color: fortunaColors.ivory, borderColor: fortunaColors.gold, width: '100%' }}
        >
          Estatísticas
        </Button>
      </Box>
      <Box
        component="aside"
        sx={{
          display: { xs: 'none', md: 'block' },
          position: 'sticky',
          top: 80,
          ...paper,
        }}
      >
        <RailBody {...props} />
      </Box>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        fullWidth
        disableRestoreFocus
        aria-labelledby="spectator-rail-title"
        slotProps={{ paper: { sx: { bgcolor: fortunaColors.graphite, color: fortunaColors.ivory } } }}
      >
        <DialogTitle id="spectator-rail-title" sx={{ color: fortunaColors.ivory }}>
          Estatísticas da partida
        </DialogTitle>
        <DialogContent>
          <RailBody {...props} />
        </DialogContent>
      </Dialog>
    </>
  );
}

export function GameWithRail({
  children,
  rail,
}: {
  children: ReactNode;
  rail: ReactNode;
}) {
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1fr) 240px' },
        gap: 3,
        alignItems: 'start',
        maxWidth: 1200,
        mx: 'auto',
        width: '100%',
        px: { xs: 2, sm: 3 },
      }}
    >
      <Box sx={{ minWidth: 0 }}>{children}</Box>
      {rail}
    </Box>
  );
}
