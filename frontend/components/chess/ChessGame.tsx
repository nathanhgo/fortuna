'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import {
  claimChessFlag,
  getGameInstance,
  isChessState,
  joinGameInstance,
  playChessMove,
  requestRematch,
  updateChessConfig,
  type ChessConfig,
  type ChessState,
  type GameInstanceDetail,
  type GameParticipantSummary,
} from '@/lib/api';
import { parseFenPieces } from '@/lib/chess/fen';
import { getStoredPlayer, type StoredPlayer } from '@/lib/playerStorage';
import { subscribeToRoom } from '@/lib/roomSocket';
import { fortunaColors } from '@/theme/palette';
import { ChessBoard, PROMOTION_ROLES, type ChessArrow } from './ChessBoard';
import { ChessPieceIcon } from './ChessPieceIcon';
import { GameWithRail, SpectatorRail, splitAudience } from '@/components/SpectatorRail';
import { DeleteInstanceButton } from '@/components/DeleteInstanceButton';
import { tableLabel } from '@/lib/catalog';
import { useRecordFinishedMatch } from '@/lib/useRecordFinishedMatch';

interface ChessGameProps {
  code: string;
  instanceId: string;
}

const CLOCK_PRESETS = [
  { label: 'Sem relógio', initial: null, increment: 0 },
  { label: '5+0', initial: 300, increment: 0 },
  { label: '10+5', initial: 600, increment: 5 },
  { label: '15+10', initial: 900, increment: 10 },
];

function authorityName(participants: GameParticipantSummary[]): string | null {
  const players = participants
    .filter((participant) => participant.role === 'player')
    .sort((a, b) => (a.seat ?? 99) - (b.seat ?? 99));
  return players[0]?.display_name ?? null;
}

function formatClock(ms: number | null): string {
  if (ms === null) return '';
  const total = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export function ChessGame({ code, instanceId }: ChessGameProps) {
  const router = useRouter();
  const [player, setPlayer] = useState<StoredPlayer | null>(null);
  const [instance, setInstance] = useState<GameInstanceDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [configOpen, setConfigOpen] = useState(false);
  const [rematchOpen, setRematchOpen] = useState(false);
  const [mode, setMode] = useState<ChessConfig['mode']>('assisted');
  const [hostColor, setHostColor] = useState<ChessConfig['host_color']>('random');
  const [clockIndex, setClockIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [arrows, setArrows] = useState<ChessArrow[]>([]);
  const [pendingPromotion, setPendingPromotion] = useState<{ from: string; to: string } | null>(
    null
  );
  const [now, setNow] = useState(0);
  const [clockEpoch, setClockEpoch] = useState(0);
  const sawConfigPrompt = useRef(false);
  const sawRematchPrompt = useRef(false);

  function adopt(data: GameInstanceDetail) {
    setInstance(data);
    setClockEpoch(Date.now());
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPlayer(getStoredPlayer(code));
  }, [code]);

  useEffect(() => {
    let ignore = false;

    async function refresh() {
      const data = await getGameInstance(code, instanceId, getStoredPlayer(code)?.token);
      if (ignore) return;
      adopt(data);
      const next = data.config as Partial<ChessConfig>;
      if (next.mode) setMode(next.mode);
      if (next.host_color) setHostColor(next.host_color);
      const match = CLOCK_PRESETS.findIndex(
        (preset) =>
          preset.initial === (next.initial_seconds ?? null) &&
          preset.increment === (next.increment_seconds ?? 0)
      );
      if (match >= 0) setClockIndex(match);
    }

    refresh().catch((err: unknown) => {
      if (!ignore) setError(err instanceof Error ? err.message : 'Não foi possível carregar a partida.');
    });
    const unsubscribe = subscribeToRoom(code, (event) => {
      if (event.instance_id && event.instance_id !== instanceId && event.type !== 'room_updated') {
        return;
      }
      refresh().catch(() => undefined);
    });
    return () => {
      ignore = true;
      unsubscribe();
    };
  }, [code, instanceId]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(timer);
  }, []);

  const viewerParticipation = instance?.participants.find(
    (participant) => participant.display_name === player?.displayName
  );
  const isAuthority = Boolean(
    player && authorityName(instance?.participants ?? []) === player.displayName
  );
  const isPlayer = viewerParticipation?.role === 'player';
  const chess = isChessState(instance?.state ?? null) ? instance?.state : null;
  useRecordFinishedMatch(instance, player, code);

  useEffect(() => {
    if (!instance || !player) return;
    if (instance.status === 'configuring' && isAuthority && !sawConfigPrompt.current) {
      sawConfigPrompt.current = true;
      setConfigOpen(true);
    }
    if (instance.status === 'finished' && isPlayer && !sawRematchPrompt.current) {
      sawRematchPrompt.current = true;
      setRematchOpen(true);
    }
  }, [instance, isAuthority, isPlayer, player]);

  function currentConfig(): ChessConfig {
    const preset = CLOCK_PRESETS[clockIndex];
    return {
      mode,
      host_color: hostColor,
      initial_seconds: mode === 'assisted' ? preset.initial : null,
      increment_seconds: mode === 'assisted' ? preset.increment : 0,
    };
  }

  async function handleJoin(role: 'player' | 'spectator') {
    if (!player) return;
    setBusy(true);
    setError(null);
    try {
      adopt(await joinGameInstance(code, instanceId, player.token, role));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível entrar na partida.');
    } finally {
      setBusy(false);
    }
  }

  async function handleSaveConfig() {
    if (!player) return;
    setBusy(true);
    setError(null);
    try {
      adopt(await updateChessConfig(code, instanceId, player.token, currentConfig()));
      setConfigOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível salvar a configuração.');
    } finally {
      setBusy(false);
    }
  }

  async function submitMove(from: string, to: string, promotion?: string) {
    if (!player || !chess) return;
    const myColor = chess.viewer_color;
    if (chess.turn !== myColor) return;
    setBusy(true);
    setError(null);
    try {
      adopt(await playChessMove(code, instanceId, player.token, from, to, promotion));
      setSelected(null);
      setArrows([]);
      setPendingPromotion(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível jogar esse lance.');
    } finally {
      setBusy(false);
    }
  }

  function handleMove(from: string, to: string) {
    if (!chess) return;
    const piece = parseFenPieces(chess.fen)[from];
    const promotionRank = to[1] === '8' || to[1] === '1';
    if (piece?.role === 'p' && promotionRank) {
      setPendingPromotion({ from, to });
      return;
    }
    void submitMove(from, to);
  }

  async function handleRematch() {
    if (!player) return;
    setBusy(true);
    setError(null);
    try {
      const rematch = await requestRematch(code, instanceId, player.token, currentConfig());
      router.push(`/sala/${code}/xadrez/${rematch.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível pedir revanche.');
    } finally {
      setBusy(false);
    }
  }

  const clocks = remainingClocks(chess, now, clockEpoch);

  useEffect(() => {
    if (!clocks.flagged || !player) return;
    claimChessFlag(code, instanceId, player.token)
      .then(adopt)
      .catch(() => undefined);
  }, [clocks.flagged, code, instanceId, player]);

  if (!instance || !player) {
    return (
      <Typography sx={{ color: fortunaColors.ivory, textAlign: 'center', mt: 8 }}>
        Carregando partida...
      </Typography>
    );
  }

  const assisted = (instance.config.mode as string) === 'assisted';
  const orientation = chess?.viewer_color === 'black' ? 'black' : 'white';
  const myTurn = Boolean(chess && chess.viewer_color === chess.turn && instance.status === 'in_progress');
  const audience = splitAudience(instance.participants);
  const chessPlayers = audience.players.map((person) => {
    const participant = instance.participants.find((item) => item.display_name === person.name);
    if (!chess || !participant?.player_id) return person;
    if (String(participant.player_id) === chess.white_id) {
      return { ...person, detail: clocks.white !== null ? `brancas · ${formatClock(clocks.white)}` : 'brancas' };
    }
    if (String(participant.player_id) === chess.black_id) {
      return { ...person, detail: clocks.black !== null ? `pretas · ${formatClock(clocks.black)}` : 'pretas' };
    }
    return person;
  });
  const chessNotes: string[] = [];
  if (instance.status === 'configuring') chessNotes.push('Aguardando o segundo jogador');
  if (chess?.last_move) chessNotes.push(`Lance: ${chess.last_move.from}–${chess.last_move.to}`);
  if (chess && instance.status === 'in_progress') {
    chessNotes.push(chess.turn === 'white' ? 'Vez das brancas' : 'Vez das pretas');
  }
  if (assisted && chess?.in_check) chessNotes.push('Xeque');
  if (instance.status === 'finished' && chess) chessNotes.push(statusLabel(chess, player.id));

  return (
    <GameWithRail
      rail={
        <SpectatorRail
          players={chessPlayers}
          spectators={audience.spectators}
          notes={chessNotes}
          saved={instance.status === 'in_progress'}
          watching={viewerParticipation?.role === 'spectator'}
        />
      }
    >
    <Stack spacing={3} sx={{ width: '100%' }}>
      <Stack direction="row" spacing={2} sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <Button component={Link} href={`/sala/${code}`} sx={{ color: fortunaColors.ivory }}>
          Voltar à sala
        </Button>
        {isAuthority && player ? (
          <DeleteInstanceButton roomCode={code} instanceId={instance.id} token={player.token} />
        ) : null}
      </Stack>
      <Typography variant="h4" component="h1" sx={{ color: fortunaColors.ivory, textAlign: 'center' }}>
        {tableLabel('chess', instance.id)}
      </Typography>
      <Typography variant="body2" sx={{ color: fortunaColors.ivory, opacity: 0.7, textAlign: 'center' }}>
        {instance.participants.map((participant) => participant.display_name).join(' · ') ||
          'Aguardando jogadores'}
      </Typography>

      {!viewerParticipation ? (
        <Stack direction="row" spacing={2} sx={{ justifyContent: 'center' }}>
          <Button variant="contained" disabled={busy} onClick={() => handleJoin('player')}>
            Entrar como jogador
          </Button>
          <Button variant="outlined" disabled={busy} onClick={() => handleJoin('spectator')}>
            Assistir
          </Button>
        </Stack>
      ) : null}

      {instance.status === 'configuring' && isAuthority ? (
        <Button
          variant="outlined"
          onClick={() => setConfigOpen(true)}
          sx={{ alignSelf: 'center', color: fortunaColors.ivory, borderColor: fortunaColors.gold }}
        >
          Configurar mesa
        </Button>
      ) : null}

      {instance.status === 'configuring' && !isAuthority ? (
        <Typography sx={{ color: fortunaColors.ivory, textAlign: 'center' }}>
          Aguardando o anfitrião definir as regras e o segundo jogador sentar.
        </Typography>
      ) : null}

      {chess && (instance.status === 'in_progress' || instance.status === 'finished') ? (
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} sx={{ alignItems: 'center' }}>
          <Stack spacing={1.5} sx={{ width: '100%' }}>
            {clocks.black !== null ? (
              <Typography sx={{ color: fortunaColors.ivory, textAlign: 'center' }}>
                Pretas {formatClock(clocks.black)}
              </Typography>
            ) : null}
            <ChessBoard
              fen={chess.fen}
              orientation={orientation}
              lastMove={assisted ? chess.last_move : null}
              legalMoves={assisted ? chess.legal_moves : []}
              selected={selected}
              arrows={assisted ? arrows : []}
              assisted={assisted}
              disabled={busy || instance.status !== 'in_progress' || !myTurn}
              onSelect={(square) => setSelected(square || null)}
              onMove={handleMove}
              onArrowsChange={setArrows}
            />
            {clocks.white !== null ? (
              <Typography sx={{ color: fortunaColors.ivory, textAlign: 'center' }}>
                Brancas {formatClock(clocks.white)}
              </Typography>
            ) : null}
          </Stack>
          <Stack spacing={2} sx={{ minWidth: { md: 220 }, width: '100%' }}>
            {assisted && chess.in_check ? (
              <Typography sx={{ color: fortunaColors.gold, textAlign: 'center' }}>
                Xeque.
              </Typography>
            ) : null}
            <Typography sx={{ color: fortunaColors.ivory, textAlign: 'center' }}>
              {instance.status === 'finished'
                ? statusLabel(chess, player.id)
                : myTurn
                  ? 'Sua vez.'
                  : 'Aguardando o adversário.'}
            </Typography>
            {assisted && chess.pgn ? (
              <Box
                sx={{
                  border: `1px solid ${fortunaColors.gold}55`,
                  p: 1.5,
                  color: fortunaColors.ivory,
                  fontSize: '0.9rem',
                  maxHeight: 220,
                  overflow: 'auto',
                }}
              >
                {chess.pgn}
              </Box>
            ) : null}
          </Stack>
        </Stack>
      ) : null}

      {instance.status === 'finished' && isPlayer && !rematchOpen ? (
        <Button variant="contained" onClick={() => setRematchOpen(true)} sx={{ alignSelf: 'center' }}>
          Jogar novamente
        </Button>
      ) : null}

      {error ? (
        <Typography variant="body2" sx={{ color: fortunaColors.wine, textAlign: 'center' }}>
          {error}
        </Typography>
      ) : null}

      <Dialog
        open={configOpen}
        onClose={() => setConfigOpen(false)}
        fullWidth
        maxWidth="xs"
        disableRestoreFocus
        slotProps={{ paper: { sx: { bgcolor: fortunaColors.ivory, p: 1 } } }}
      >
        <DialogTitle sx={{ fontFamily: 'var(--font-cormorant), Georgia, serif' }}>
          Você define esta mesa de Xadrez
        </DialogTitle>
        <DialogContent>
          <ConfigFields
            mode={mode}
            hostColor={hostColor}
            clockIndex={clockIndex}
            onMode={setMode}
            onHostColor={setHostColor}
            onClock={setClockIndex}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
          {player ? (
            <DeleteInstanceButton roomCode={code} instanceId={instance.id} token={player.token} />
          ) : (
            <span />
          )}
          <Stack direction="row" spacing={1}>
            <Button onClick={() => setConfigOpen(false)} sx={{ color: fortunaColors.graphite }}>
              Fechar
            </Button>
            <Button variant="contained" disabled={busy} onClick={handleSaveConfig}>
              Salvar configuração
            </Button>
          </Stack>
        </DialogActions>
      </Dialog>

      <Dialog
        open={rematchOpen}
        onClose={() => setRematchOpen(false)}
        fullWidth
        maxWidth="xs"
        disableRestoreFocus
        slotProps={{ paper: { sx: { bgcolor: fortunaColors.ivory, p: 1 } } }}
      >
        <DialogTitle sx={{ fontFamily: 'var(--font-cormorant), Georgia, serif' }}>
          Jogar novamente?
        </DialogTitle>
        <DialogContent>
          <ConfigFields
            mode={mode}
            hostColor={hostColor}
            clockIndex={clockIndex}
            onMode={setMode}
            onHostColor={setHostColor}
            onClock={setClockIndex}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setRematchOpen(false)} sx={{ color: fortunaColors.graphite }}>
            Agora não
          </Button>
          <Button variant="contained" disabled={busy} onClick={handleRematch}>
            Jogar novamente
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={Boolean(pendingPromotion)}
        onClose={() => setPendingPromotion(null)}
        disableRestoreFocus
        slotProps={{ paper: { sx: { bgcolor: fortunaColors.ivory, p: 1 } } }}
      >
        <DialogTitle>Promover peão</DialogTitle>
        <DialogContent>
          <Stack direction="row" spacing={1} sx={{ py: 1 }}>
            {PROMOTION_ROLES.map((role) => (
              <Button
                key={role}
                aria-label={`Promover a ${role}`}
                onClick={() =>
                  pendingPromotion &&
                  void submitMove(pendingPromotion.from, pendingPromotion.to, role)
                }
              >
                <ChessPieceIcon
                  piece={{ color: chess?.turn === 'white' ? 'white' : 'black', role }}
                  size={40}
                />
              </Button>
            ))}
          </Stack>
        </DialogContent>
      </Dialog>
    </Stack>
    </GameWithRail>
  );
}

function ConfigFields({
  mode,
  hostColor,
  clockIndex,
  onMode,
  onHostColor,
  onClock,
}: {
  mode: ChessConfig['mode'];
  hostColor: ChessConfig['host_color'];
  clockIndex: number;
  onMode: (mode: ChessConfig['mode']) => void;
  onHostColor: (color: ChessConfig['host_color']) => void;
  onClock: (index: number) => void;
}) {
  return (
    <Stack spacing={2} sx={{ mt: 1 }}>
      <Typography variant="body2" sx={{ color: fortunaColors.graphite }}>
        Modo
      </Typography>
      <Stack direction="row" spacing={1}>
        <Button variant={mode === 'realistic' ? 'contained' : 'outlined'} onClick={() => onMode('realistic')}>
          Realista
        </Button>
        <Button variant={mode === 'assisted' ? 'contained' : 'outlined'} onClick={() => onMode('assisted')}>
          Assistido
        </Button>
      </Stack>
      <Typography variant="body2" sx={{ color: fortunaColors.graphite }}>
        Sua cor
      </Typography>
      <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
        <Button variant={hostColor === 'random' ? 'contained' : 'outlined'} onClick={() => onHostColor('random')}>
          Aleatória
        </Button>
        <Button variant={hostColor === 'white' ? 'contained' : 'outlined'} onClick={() => onHostColor('white')}>
          Brancas
        </Button>
        <Button variant={hostColor === 'black' ? 'contained' : 'outlined'} onClick={() => onHostColor('black')}>
          Pretas
        </Button>
      </Stack>
      {mode === 'assisted' ? (
        <>
          <Typography variant="body2" sx={{ color: fortunaColors.graphite }}>
            Relógio
          </Typography>
          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
            {CLOCK_PRESETS.map((preset, index) => (
              <Button
                key={preset.label}
                variant={clockIndex === index ? 'contained' : 'outlined'}
                onClick={() => onClock(index)}
              >
                {preset.label}
              </Button>
            ))}
          </Stack>
        </>
      ) : null}
    </Stack>
  );
}

function remainingClocks(
  chess: ChessState | null | undefined,
  now: number,
  receivedAt: number
) {
  if (!chess || chess.clocks.white_ms === null) {
    return { white: null as number | null, black: null as number | null, flagged: false };
  }
  let white = chess.clocks.white_ms;
  let black = chess.clocks.black_ms ?? 0;
  if (chess.status === 'playing') {
    const elapsed = Math.max(0, now - receivedAt);
    if (chess.turn === 'white') white = Math.max(0, white - elapsed);
    else black = Math.max(0, black - elapsed);
  }
  return { white, black, flagged: chess.status === 'playing' && (white <= 0 || black <= 0) };
}

function statusLabel(chess: ChessState, playerId: number): string {
  if (chess.status === 'checkmate' || chess.status === 'timeout' || chess.status === 'ignored_check') {
    return chess.winner === String(playerId) ? 'Você venceu.' : 'Você perdeu.';
  }
  if (chess.status === 'stalemate') return 'Afogamento. Empate.';
  if (chess.status.startsWith('draw')) return 'Empate.';
  return 'Partida encerrada.';
}
