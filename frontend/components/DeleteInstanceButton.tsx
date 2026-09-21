'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Typography from '@mui/material/Typography';
import { ApiError, deleteGameInstance } from '@/lib/api';
import { fortunaColors } from '@/theme/palette';

interface DeleteInstanceButtonProps {
  roomCode: string;
  instanceId: string;
  token: string;
}

export function DeleteInstanceButton({ roomCode, instanceId, token }: DeleteInstanceButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setBusy(true);
    setError(null);
    try {
      await deleteGameInstance(roomCode, instanceId, token);
      setOpen(false);
      router.push(`/sala/${roomCode}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível excluir a mesa.');
      setBusy(false);
    }
  }

  return (
    <>
      <Button
        variant="outlined"
        onClick={() => setOpen(true)}
        sx={{ color: fortunaColors.wine, borderColor: fortunaColors.wine }}
      >
        Excluir mesa
      </Button>
      <Dialog
        open={open}
        onClose={() => {
          if (!busy) setOpen(false);
        }}
        disableRestoreFocus
        slotProps={{ paper: { sx: { bgcolor: fortunaColors.ivory } } }}
      >
        <DialogTitle>Excluir esta mesa?</DialogTitle>
        <DialogContent>
          <Typography sx={{ color: fortunaColors.graphite }}>
            A partida some para todo mundo nesta sala. Não dá para desfazer.
          </Typography>
          {error ? (
            <Typography variant="body2" sx={{ color: fortunaColors.wine, mt: 1.5 }}>
              {error}
            </Typography>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)} disabled={busy}>
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={busy}
            variant="contained"
            aria-label="Confirmar exclusão"
          >
            Confirmar exclusão
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
