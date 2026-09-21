'use client';

import { useEffect, useMemo, useState } from 'react';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Stack from '@mui/material/Stack';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Typography from '@mui/material/Typography';
import {
  listChatMessages,
  listGameInstances,
  sendChatMessage,
  type ChatMessageSummary,
  type GameInstanceSummary,
} from '@/lib/api';
import { tableLabel } from '@/lib/catalog';
import { FortunaField } from '@/components/FortunaField';
import { getStoredPlayer } from '@/lib/playerStorage';
import { subscribeToRoom } from '@/lib/roomSocket';
import { fortunaColors } from '@/theme/palette';

const LOBBY_CHANNEL = 'lobby';

interface ChatDialogProps {
  open: boolean;
  onClose: () => void;
  roomCode: string | null;
  initialInstanceId?: string | null;
}

function channelLabel(instance: GameInstanceSummary): string {
  return tableLabel(instance.game, instance.id);
}

export function ChatDialog({ open, onClose, roomCode, initialInstanceId }: ChatDialogProps) {
  const player = roomCode ? getStoredPlayer(roomCode) : null;
  const playerToken = player?.token ?? null;
  const playerId = player?.id ?? null;
  const playerName = player?.displayName ?? null;
  const [channel, setChannel] = useState(initialInstanceId || LOBBY_CHANNEL);
  const [instances, setInstances] = useState<GameInstanceSummary[]>([]);
  const [messages, setMessages] = useState<ChatMessageSummary[]>([]);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const tables = useMemo(() => {
    return instances.filter((instance) =>
      instance.participants.some(
        (participant) =>
          (participant.player_id != null &&
            playerId != null &&
            Number(participant.player_id) === Number(playerId)) ||
          participant.display_name === playerName
      )
    );
  }, [instances, playerId, playerName]);

  useEffect(() => {
    if (!open || !roomCode || !playerToken) return;
    let ignore = false;

    async function refreshTables() {
      const listed = await listGameInstances(roomCode as string);
      if (!ignore) setInstances(listed);
    }

    refreshTables().catch(() => undefined);
    const unsubscribe = subscribeToRoom(roomCode, (event) => {
      if (
        event.type === 'chat_message' ||
        event.type === 'room_updated' ||
        event.type === 'game_updated' ||
        event.type === 'game_deleted' ||
        event.type === 'game_created'
      ) {
        refreshTables().catch(() => undefined);
      }
    });
    return () => {
      ignore = true;
      unsubscribe();
    };
  }, [open, roomCode, playerToken]);

  useEffect(() => {
    if (!open || !roomCode || !playerToken) return;
    let ignore = false;
    const instanceId = channel === LOBBY_CHANNEL ? null : channel;

    async function refreshMessages() {
      const listed = await listChatMessages(roomCode as string, playerToken as string, instanceId);
      if (!ignore) setMessages(listed);
    }

    refreshMessages().catch((err: unknown) => {
      if (!ignore) {
        setError(err instanceof Error ? err.message : 'Não foi possível carregar o chat.');
      }
    });
    const unsubscribe = subscribeToRoom(roomCode, (event) => {
      const eventInstance = event.instance_id ?? null;
      if (event.type === 'chat_message' && eventInstance === instanceId) {
        refreshMessages().catch(() => undefined);
      }
    });
    return () => {
      ignore = true;
      unsubscribe();
    };
  }, [open, roomCode, playerToken, channel]);

  async function handleSend(event: React.FormEvent) {
    event.preventDefault();
    if (!roomCode || !playerToken || !draft.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const instanceId = channel === LOBBY_CHANNEL ? null : channel;
      const sent = await sendChatMessage(roomCode, playerToken, draft.trim(), instanceId);
      setMessages((current) =>
        current.some((item) => item.id === sent.id) ? current : [...current, sent]
      );
      setDraft('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível enviar.');
    } finally {
      setBusy(false);
    }
  }

  const tabValue = tables.some((item) => item.id === channel) ? channel : LOBBY_CHANNEL;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      disableRestoreFocus
      slotProps={{ paper: { sx: { bgcolor: fortunaColors.ivory } } }}
    >
      <DialogTitle sx={{ fontFamily: 'var(--font-cormorant), Georgia, serif' }}>Chat</DialogTitle>
      <DialogContent>
        {!roomCode ? (
          <Typography sx={{ color: fortunaColors.graphite, py: 1 }}>
            Entre em uma sala para conversar. O chat da espera e o de cada mesa ficam aqui.
          </Typography>
        ) : !playerToken ? (
          <Typography sx={{ color: fortunaColors.graphite, py: 1 }}>
            Entre na sala com um nome de usuário para usar o chat.
          </Typography>
        ) : (
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Tabs
              value={tabValue}
              onChange={(_, next: string) => setChannel(next)}
              variant="scrollable"
              scrollButtons="auto"
            >
              <Tab value={LOBBY_CHANNEL} label="Sala" />
              {tables.map((instance) => (
                <Tab key={instance.id} value={instance.id} label={channelLabel(instance)} />
              ))}
            </Tabs>
            <Stack spacing={1} sx={{ minHeight: 180, maxHeight: 320, overflowY: 'auto' }}>
              {messages.length === 0 ? (
                <Typography variant="body2" sx={{ color: fortunaColors.graphite, opacity: 0.7 }}>
                  Nenhuma mensagem ainda.
                </Typography>
              ) : (
                messages.map((message) => (
                  <Stack key={message.id} spacing={0.25}>
                    <Typography variant="caption" sx={{ color: fortunaColors.graphite, opacity: 0.7 }}>
                      {message.display_name}
                    </Typography>
                    <Typography variant="body2" sx={{ color: fortunaColors.graphite }}>
                      {message.text}
                    </Typography>
                  </Stack>
                ))
              )}
            </Stack>
            <Stack component="form" onSubmit={handleSend} spacing={1.5}>
              <FortunaField
                id="chat-message"
                label="Mensagem"
                tone="onLight"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                slotProps={{ htmlInput: { maxLength: 400 } }}
              />
              <Button type="submit" variant="contained" disabled={busy || !draft.trim()}>
                Enviar
              </Button>
            </Stack>
            {error ? (
              <Typography variant="body2" sx={{ color: fortunaColors.wine }}>
                {error}
              </Typography>
            ) : null}
          </Stack>
        )}
      </DialogContent>
    </Dialog>
  );
}
