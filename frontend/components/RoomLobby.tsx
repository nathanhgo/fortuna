'use client';

import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { getRoom, type PlayerSummary, type RoomSummary } from '@/lib/api';
import { joinRoom } from '@/lib/api';
import { getStoredPlayer, storePlayer, type StoredPlayer } from '@/lib/playerStorage';
import { fortunaColors } from '@/theme/palette';

interface RoomLobbyProps {
  code: string;
}

export function RoomLobby({ code }: RoomLobbyProps) {
  // player começa em null tanto no servidor quanto na primeira renderização do cliente — ler o
  // localStorage direto no estado inicial faria o cliente "adiantar" o resultado antes da
  // hidratação, gerando o mismatch clássico de SSR (servidor sempre vê null, cliente veria o
  // token já salvo). O valor real só é lido depois de montar, no efeito abaixo.
  const [player, setPlayer] = useState<StoredPlayer | null>(null);
  const [room, setRoom] = useState<RoomSummary | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Leitura do localStorage tem que ficar num efeito (só roda no cliente, depois da
    // hidratação) — é exatamente esse o motivo do player começar em null acima. O lint padrão
    // (react-hooks/set-state-in-effect) sugere computar o estado direto no render em vez de
    // setState num efeito, mas fazer isso aqui é o que causava o mismatch de SSR.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPlayer(getStoredPlayer(code));
  }, [code]);

  useEffect(() => {
    let ignore = false;

    getRoom(code).then((data) => {
      if (!ignore) setRoom(data);
    });

    return () => {
      ignore = true;
    };
  }, [code]);

  async function handleJoin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const joined = await joinRoom(code, displayName);
      const storedPlayer: StoredPlayer = {
        id: joined.id,
        displayName: joined.display_name,
        token: joined.token,
      };
      storePlayer(code, storedPlayer);
      setPlayer(storedPlayer);
      setRoom(await getRoom(code));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível entrar na sala.');
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleCopyInviteLink() {
    const link = `${window.location.origin}/sala/${code}`;
    navigator.clipboard?.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (player === null) {
    return (
      <Stack
        component="form"
        onSubmit={handleJoin}
        spacing={2}
        sx={{ maxWidth: 360, mx: 'auto', mt: 10 }}
      >
        <Typography variant="h4" component="h1" sx={{ color: fortunaColors.ivory, textAlign: 'center' }}>
          Sala {code}
        </Typography>
        <TextField
          id="join-room-display-name"
          label="Seu nome"
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
          size="small"
          autoComplete="off"
          sx={{ bgcolor: fortunaColors.ivory, '& .MuiOutlinedInput-root': { borderRadius: 1 } }}
        />
        <Button type="submit" variant="contained" size="large" disabled={isSubmitting}>
          Entrar na sala
        </Button>
        {error ? (
          <Typography variant="body2" sx={{ color: fortunaColors.wine }}>
            {error}
          </Typography>
        ) : null}
      </Stack>
    );
  }

  return (
    <Stack spacing={3} sx={{ maxWidth: 480, mx: 'auto', mt: 10 }}>
      <Typography variant="h4" component="h1" sx={{ color: fortunaColors.ivory, textAlign: 'center' }}>
        Sala {code}
      </Typography>

      <Button variant="outlined" onClick={handleCopyInviteLink} sx={{ color: fortunaColors.ivory, borderColor: fortunaColors.gold }}>
        {copied ? 'Link copiado' : 'Copiar link de convite'}
      </Button>

      <Divider sx={{ borderColor: `${fortunaColors.gold}55` }} />

      <Stack spacing={1}>
        <Typography variant="body2" sx={{ color: fortunaColors.ivory, opacity: 0.7 }}>
          Jogadores na sala
        </Typography>
        {(room?.players ?? []).map((roomPlayer: PlayerSummary) => (
          <Box
            key={roomPlayer.id}
            sx={{ py: 1, px: 1.5, bgcolor: fortunaColors.ivory, border: `1px solid ${fortunaColors.gold}33` }}
          >
            <Typography sx={{ color: fortunaColors.graphite }} component="span">
              {roomPlayer.display_name}
            </Typography>
            {roomPlayer.display_name === player.displayName ? (
              <Typography sx={{ color: fortunaColors.graphite, opacity: 0.6 }} component="span">
                {' '}
                (você)
              </Typography>
            ) : null}
          </Box>
        ))}
      </Stack>

      <Typography variant="body2" sx={{ color: fortunaColors.ivory, opacity: 0.6, textAlign: 'center' }}>
        A escolha de jogos dentro da sala chega numa próxima fase.
      </Typography>
    </Stack>
  );
}
