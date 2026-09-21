'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import {
  createGameInstance,
  getRoom,
  joinRoom,
  listGameInstances,
  updatePlayerAvatar,
  type GameInstanceSummary,
  type GameKind,
  type GameStatus,
  type PlayerSummary,
  type RoomSummary,
} from '@/lib/api';
import { AVATAR_KEYS, AVATAR_LABELS, type AvatarKey } from '@/lib/avatars';
import { getStoredPlayer, storePlayer, type StoredPlayer } from '@/lib/playerStorage';
import { subscribeToRoom } from '@/lib/roomSocket';
import { fortunaColors } from '@/theme/palette';
import { AvatarIcon } from '@/components/avatars/AvatarIcon';
import { FortunaField } from '@/components/FortunaField';
import { GameCoverCard } from '@/components/GameCoverCard';
import { GAME_CATALOG, gameHref, tableLabel } from '@/lib/catalog';

interface RoomLobbyProps {
  code: string;
}

const STATUS_LABELS: Record<GameStatus, string> = {
  configuring: 'Configurando',
  in_progress: 'Em andamento',
  finished: 'Finalizado',
};

export function RoomLobby({ code }: RoomLobbyProps) {
  const router = useRouter();
  const [player, setPlayer] = useState<StoredPlayer | null>(null);
  const [room, setRoom] = useState<RoomSummary | null>(null);
  const [instances, setInstances] = useState<GameInstanceSummary[]>([]);
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [avatarOpen, setAvatarOpen] = useState(false);

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

    async function refresh() {
      const [roomData, instanceData] = await Promise.all([getRoom(code), listGameInstances(code)]);
      if (ignore) return;
      setRoom(roomData);
      setInstances(instanceData);
    }

    refresh();
    const unsubscribe = subscribeToRoom(code, () => {
      refresh();
    });

    return () => {
      ignore = true;
      unsubscribe();
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

  async function handleCreateGame(kind: GameKind) {
    if (!player) return;
    setError(null);
    setIsSubmitting(true);
    try {
      const instance = await createGameInstance(code, player.token, kind);
      if (kind === 'battleship') {
        router.push(`/sala/${code}/batalha-naval/${instance.id}`);
      } else if (kind === 'chess') {
        router.push(`/sala/${code}/xadrez/${instance.id}`);
      } else if (kind === 'coup') {
        router.push(`/sala/${code}/coup/${instance.id}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível criar a partida.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSelectAvatar(avatar: AvatarKey) {
    if (!player) return;
    setError(null);
    try {
      await updatePlayerAvatar(code, player.token, avatar);
      setRoom(await getRoom(code));
      setAvatarOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível alterar o ícone.');
    }
  }

  if (player === null) {
    return (
      <Stack
        component="form"
        onSubmit={handleJoin}
        spacing={2}
        sx={{ maxWidth: 360, mx: 'auto', mt: 6, width: '100%' }}
      >
        <Typography variant="h4" component="h1" sx={{ color: fortunaColors.ivory, textAlign: 'center' }}>
          Sala {code}
        </Typography>
        <FortunaField
          id="join-room-display-name"
          label="Seu nome"
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
          autoComplete="off"
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
    <Stack spacing={4} sx={{ maxWidth: 720, mx: 'auto', mt: 6, width: '100%' }}>
      <Typography variant="h4" component="h1" sx={{ color: fortunaColors.ivory, textAlign: 'center' }}>
        Sala {code}
      </Typography>

      <Button variant="outlined" onClick={handleCopyInviteLink} sx={{ color: fortunaColors.ivory, borderColor: fortunaColors.gold }}>
        {copied ? 'Link copiado' : 'Copiar link de convite'}
      </Button>

      <Divider sx={{ borderColor: `${fortunaColors.gold}55` }} />

      <Stack spacing={1.5}>
        <Typography variant="body2" sx={{ color: fortunaColors.ivory, opacity: 0.7 }}>
          Jogadores na sala
        </Typography>
        {(room?.players ?? []).map((roomPlayer: PlayerSummary) => {
          const isSelf = roomPlayer.id === player.id;
          return (
            <Stack
              key={roomPlayer.id}
              direction="row"
              spacing={1.5}
              sx={{
                py: 1,
                px: 1.5,
                bgcolor: fortunaColors.ivory,
                border: `1px solid ${fortunaColors.gold}33`,
                alignItems: 'center',
              }}
            >
              <Box
                component={isSelf ? 'button' : 'div'}
                type={isSelf ? 'button' : undefined}
                onClick={isSelf ? () => setAvatarOpen(true) : undefined}
                aria-label={isSelf ? 'Alterar imagem de perfil' : undefined}
                sx={{
                  appearance: 'none',
                  border: isSelf ? `2px solid ${fortunaColors.gold}` : `1px solid ${fortunaColors.gold}44`,
                  borderRadius: '50%',
                  p: 0.25,
                  bgcolor: fortunaColors.ivory,
                  cursor: isSelf ? 'pointer' : 'default',
                  lineHeight: 0,
                }}
              >
                <AvatarIcon
                  avatar={roomPlayer.avatar}
                  size={44}
                  title={isSelf ? 'Seu ícone nesta sala' : `Ícone de ${roomPlayer.display_name}`}
                />
              </Box>
              <Typography sx={{ color: fortunaColors.graphite }} component="span">
                {roomPlayer.display_name}
              </Typography>
              {isSelf ? (
                <Typography sx={{ color: fortunaColors.graphite, opacity: 0.6 }} component="span">
                  (você)
                </Typography>
              ) : null}
            </Stack>
          );
        })}
      </Stack>

      <Stack spacing={1.5}>
        <Typography variant="body2" sx={{ color: fortunaColors.ivory, opacity: 0.7 }}>
          Partidas nesta sala
        </Typography>
        {instances.length === 0 ? (
          <Typography variant="body2" sx={{ color: fortunaColors.ivory, opacity: 0.6 }}>
            Nenhuma partida ainda. Escolha um jogo abaixo para abrir uma mesa.
          </Typography>
        ) : (
          instances.map((instance) => (
            <InstanceCard key={instance.id} code={code} instance={instance} />
          ))
        )}
      </Stack>

      <Stack spacing={1.5}>
        <Typography variant="body2" sx={{ color: fortunaColors.ivory, opacity: 0.7 }}>
          Nova partida
        </Typography>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
            gap: 2,
          }}
        >
          {GAME_CATALOG.map((game) => (
            <GameCoverCard
              key={game.slug}
              name={game.name}
              cover={game.cover}
              disabled={!game.available || isSubmitting}
              comingSoon={!game.available}
              onClick={() => {
                if (game.available && game.kind) void handleCreateGame(game.kind);
              }}
            />
          ))}
        </Box>
      </Stack>

      {error ? (
        <Typography variant="body2" sx={{ color: fortunaColors.wine }}>
          {error}
        </Typography>
      ) : null}

      <Dialog
        open={avatarOpen}
        onClose={() => setAvatarOpen(false)}
        fullWidth
        maxWidth="xs"
        disableRestoreFocus
        slotProps={{ paper: { sx: { bgcolor: fortunaColors.ivory } } }}
      >
        <DialogTitle sx={{ fontFamily: 'var(--font-cormorant), Georgia, serif' }}>
          Escolha um ícone para esta sala
        </DialogTitle>
        <DialogContent>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 1.5,
              py: 1,
            }}
          >
            {AVATAR_KEYS.map((avatar) => (
              <Button
                key={avatar}
                onClick={() => handleSelectAvatar(avatar)}
                aria-label={AVATAR_LABELS[avatar]}
                sx={{ minWidth: 0, p: 1, flexDirection: 'column', gap: 0.5 }}
              >
                <AvatarIcon avatar={avatar} size={48} title={AVATAR_LABELS[avatar]} />
                <Typography variant="caption" sx={{ color: fortunaColors.graphite }}>
                  {AVATAR_LABELS[avatar]}
                </Typography>
              </Button>
            ))}
          </Box>
        </DialogContent>
      </Dialog>
    </Stack>
  );
}

function InstanceCard({ code, instance }: { code: string; instance: GameInstanceSummary }) {
  const players = instance.participants
    .filter((participant) => participant.role === 'player')
    .map((participant) => participant.display_name);
  const href = gameHref(instance.game, code, instance.id);
  const cover = GAME_CATALOG.find((game) => game.kind === instance.game)?.cover;

  return (
    <Stack
      direction="row"
      spacing={2}
      sx={{
        bgcolor: fortunaColors.ivory,
        border: `1px solid ${fortunaColors.gold}33`,
        p: 1.5,
        alignItems: 'center',
      }}
    >
      <Box
        component="img"
        src={cover ?? '/images/game-covers/chess-cover.png'}
        alt=""
        sx={{ width: 72, height: 72, objectFit: 'contain', flexShrink: 0 }}
      />
      <Stack spacing={0.75} sx={{ flex: 1, minWidth: 0 }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
          <Typography variant="h6" component="h2" sx={{ color: fortunaColors.graphite }}>
            {tableLabel(instance.game, instance.id)}
          </Typography>
          <Chip
            label={STATUS_LABELS[instance.status]}
            size="small"
            variant="outlined"
            sx={{
              borderColor: fortunaColors.gold,
              color: fortunaColors.graphite,
              height: 24,
            }}
          />
        </Stack>
        <Typography variant="body2" sx={{ color: fortunaColors.graphite, opacity: 0.75 }}>
          {players.length > 0 ? players.join(', ') : 'Ninguém sentou ainda'}
        </Typography>
        <Button component={Link} href={href} size="small" sx={{ alignSelf: 'flex-start', px: 0 }}>
          Abrir mesa
        </Button>
      </Stack>
    </Stack>
  );
}
