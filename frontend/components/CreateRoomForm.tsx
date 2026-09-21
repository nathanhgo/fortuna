'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { createRoom } from '@/lib/api';
import { storePlayer } from '@/lib/playerStorage';
import { fortunaColors } from '@/theme/palette';
import { FortunaField } from '@/components/FortunaField';

export function CreateRoomForm() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const { room, player } = await createRoom(displayName);
      storePlayer(room.code, {
        id: player.id,
        displayName: player.display_name,
        token: player.token,
      });
      router.push(`/sala/${room.code}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível criar a sala.');
      setIsSubmitting(false);
    }
  }

  return (
    <Stack component="form" onSubmit={handleSubmit} spacing={2} sx={{ width: '100%', maxWidth: 360 }}>
      <FortunaField
        id="create-room-display-name"
        label="Seu nome"
        value={displayName}
        onChange={(event) => setDisplayName(event.target.value)}
        autoComplete="off"
      />
      <Button type="submit" variant="contained" size="large" disabled={isSubmitting}>
        Criar sala
      </Button>
      {error ? (
        <Typography variant="body2" sx={{ color: fortunaColors.wine }}>
          {error}
        </Typography>
      ) : null}
    </Stack>
  );
}
