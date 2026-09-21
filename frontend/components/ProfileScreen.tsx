'use client';

import { useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { AvatarIcon } from '@/components/avatars/AvatarIcon';
import { FortunaField } from '@/components/FortunaField';
import { AVATAR_KEYS, AVATAR_LABELS, type AvatarKey } from '@/lib/avatars';
import { GAME_CATALOG, gameLabel } from '@/lib/catalog';
import { loadProfile, profileStats, saveProfile, type ProfileCache } from '@/lib/profileCache';
import { fortunaColors } from '@/theme/palette';

function formatWhen(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

function resultLabel(result: 'win' | 'loss' | 'draw'): string {
  if (result === 'win') return 'vitória';
  if (result === 'loss') return 'derrota';
  return 'empate';
}

export function ProfileScreen() {
  const [profile, setProfile] = useState<ProfileCache>(() => loadProfile());
  const [name, setName] = useState(() => loadProfile().displayName);
  const [savedHint, setSavedHint] = useState(false);

  const stats = profileStats(profile);

  function persist(partial: Partial<ProfileCache>) {
    const next = saveProfile(partial);
    setProfile(next);
    setSavedHint(true);
  }

  function handleSave(event: React.FormEvent) {
    event.preventDefault();
    persist({ displayName: name.trim() });
  }

  function handlePhoto(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const photoDataUrl = typeof reader.result === 'string' ? reader.result : null;
      persist({ photoDataUrl });
    };
    reader.readAsDataURL(file);
  }

  return (
    <Box component="main" sx={{ bgcolor: fortunaColors.graphite, minHeight: '100%', py: 6 }}>
      <Container maxWidth="sm">
        <Stack spacing={3}>
          <Typography variant="h4" component="h1" sx={{ color: fortunaColors.ivory }}>
            Perfil
          </Typography>
          <Typography sx={{ color: fortunaColors.ivory, opacity: 0.85 }}>
            Este perfil fica só neste navegador, em cache local. Se você limpar os dados do site
            ou abrir outro aparelho, nome, foto, estatísticas e histórico desaparecem — ainda não
            há conta.
          </Typography>

          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={2}
            sx={{ alignItems: { sm: 'center' } }}
          >
            <Box
              sx={{
                width: 96,
                height: 96,
                border: `1px solid ${fortunaColors.gold}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                bgcolor: fortunaColors.ivory,
                flexShrink: 0,
              }}
            >
              {profile.photoDataUrl ? (
                <Box
                  component="img"
                  src={profile.photoDataUrl}
                  alt="Foto do perfil"
                  sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <AvatarIcon avatar={profile.avatar} size={64} title={AVATAR_LABELS[profile.avatar]} />
              )}
            </Box>
            <Button
              component="label"
              variant="outlined"
              sx={{ color: fortunaColors.ivory, borderColor: fortunaColors.gold }}
            >
              Escolher foto
              <input hidden type="file" accept="image/*" onChange={handlePhoto} />
            </Button>
          </Stack>

          <Stack component="form" onSubmit={handleSave} spacing={2}>
            <FortunaField
              id="profile-name"
              label="Nome de usuário"
              value={name}
              onChange={(event) => setName(event.target.value)}
              slotProps={{ htmlInput: { maxLength: 32 } }}
            />
            <Typography variant="body2" sx={{ color: fortunaColors.ivory, opacity: 0.75 }}>
              Ícone padrão (usado se você não enviar foto)
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1 }}>
              {AVATAR_KEYS.map((avatar: AvatarKey) => (
                <Button
                  key={avatar}
                  onClick={() => persist({ avatar })}
                  aria-label={AVATAR_LABELS[avatar]}
                  sx={{
                    minWidth: 0,
                    p: 1,
                    border:
                      profile.avatar === avatar
                        ? `1px solid ${fortunaColors.gold}`
                        : `1px solid ${fortunaColors.gold}33`,
                  }}
                >
                  <AvatarIcon avatar={avatar} size={36} title={AVATAR_LABELS[avatar]} />
                </Button>
              ))}
            </Box>
            <Button type="submit" variant="contained">
              Guardar perfil
            </Button>
            {savedHint ? (
              <Typography variant="caption" sx={{ color: fortunaColors.olive }}>
                Guardado neste navegador.
              </Typography>
            ) : null}
          </Stack>

          <Stack spacing={1}>
            <Typography variant="h5" component="h2" sx={{ color: fortunaColors.ivory }}>
              Estatísticas
            </Typography>
            <Typography sx={{ color: fortunaColors.ivory }}>
              {stats.wins} vitórias · {stats.losses} derrotas · {stats.draws} empates
            </Typography>
            {GAME_CATALOG.filter((game) => game.kind).map((game) => {
              const row = stats.byGame[game.kind!];
              return (
                <Typography key={game.slug} variant="body2" sx={{ color: fortunaColors.ivory, opacity: 0.8 }}>
                  {game.name}: {row.wins}V / {row.losses}D / {row.draws}E
                </Typography>
              );
            })}
          </Stack>

          <Stack spacing={1}>
            <Typography variant="h5" component="h2" sx={{ color: fortunaColors.ivory }}>
              Histórico
            </Typography>
            {profile.matches.length === 0 ? (
              <Typography variant="body2" sx={{ color: fortunaColors.ivory, opacity: 0.7 }}>
                Nenhuma partida registrada ainda neste aparelho.
              </Typography>
            ) : (
              profile.matches.map((match) => (
                <Typography key={match.instanceId} variant="body2" sx={{ color: fortunaColors.ivory }}>
                  {gameLabel(match.game)} · {resultLabel(match.result)}
                  {match.opponent ? ` contra ${match.opponent}` : ''} · {formatWhen(match.at)}
                </Typography>
              ))
            )}
          </Stack>
        </Stack>
      </Container>
    </Box>
  );
}
