'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
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
  fireBattleshipShot,
  getGameInstance,
  joinGameInstance,
  placeBattleshipFleet,
  requestRematch,
  updateBattleshipConfig,
  type BattleshipState,
  type GameInstanceDetail,
  type GameParticipantSummary,
} from '@/lib/api';
import {
  asShipGrid,
  occupiedKeys,
  remainingFleetSizes,
  sunkShips,
  tryPlaceShip,
  type Cell,
  type Orientation,
} from '@/lib/battleship/placement';
import { getStoredPlayer, type StoredPlayer } from '@/lib/playerStorage';
import { subscribeToRoom } from '@/lib/roomSocket';
import { fortunaColors } from '@/theme/palette';
import { FortunaField } from '@/components/FortunaField';
import { BattleshipBoard, type CellMark } from './BattleshipBoard';
import { GameWithRail, SpectatorRail, splitAudience } from '@/components/SpectatorRail';
import { DeleteInstanceButton } from '@/components/DeleteInstanceButton';
import { tableLabel } from '@/lib/catalog';
import { useRecordFinishedMatch } from '@/lib/useRecordFinishedMatch';

interface BattleshipGameProps {
  code: string;
  instanceId: string;
}

function authorityName(participants: GameParticipantSummary[]): string | null {
  const players = participants
    .filter((participant) => participant.role === 'player')
    .sort((a, b) => (a.seat ?? 99) - (b.seat ?? 99));
  return players[0]?.display_name ?? null;
}

function opponentId(state: BattleshipState, viewerId: number): string | null {
  return Object.keys(state.fleets).find((key) => key !== String(viewerId)) ?? null;
}

function marksForShots(shots: { cell: number[]; result: string }[]): Record<string, CellMark> {
  const marks: Record<string, CellMark> = {};
  for (const shot of shots) {
    const [row, col] = shot.cell;
    marks[`${row},${col}`] = shot.result === 'miss' ? 'miss' : 'hit';
  }
  return marks;
}

function parseFleetInput(value: string): number[] {
  return value
    .split(',')
    .map((item) => Number(item.trim()))
    .filter((item) => Number.isFinite(item) && item > 0);
}

function sunkSnapshot(data: GameInstanceDetail, playerId: number) {
  const state = data.state && 'fleets' in data.state ? data.state : null;
  if (!state) {
    return { ownSunk: [] as Cell[][], opponentShips: [] as Cell[][] };
  }
  const ownFleet = state.fleets[String(playerId)];
  const oppKey = opponentId(state, playerId);
  const opponentFleet = oppKey ? state.fleets[oppKey] : undefined;
  return {
    ownSunk: ownFleet ? sunkShips(asShipGrid(ownFleet.ships), ownFleet.shots_received) : [],
    opponentShips: opponentFleet ? asShipGrid(opponentFleet.ships) : [],
  };
}

export function BattleshipGame({ code, instanceId }: BattleshipGameProps) {
  const router = useRouter();
  const [player, setPlayer] = useState<StoredPlayer | null>(null);
  const [instance, setInstance] = useState<GameInstanceDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [boardSizeInput, setBoardSizeInput] = useState('10');
  const [fleetInput, setFleetInput] = useState('5, 4, 3, 3, 2');
  const [orientation, setOrientation] = useState<Orientation>('horizontal');
  const [placedShips, setPlacedShips] = useState<Cell[][]>([]);
  const [preview, setPreview] = useState<Cell[]>([]);
  const [busy, setBusy] = useState(false);
  const [configOpen, setConfigOpen] = useState(false);
  const [rematchOpen, setRematchOpen] = useState(false);
  const [sunkNotice, setSunkNotice] = useState<string | null>(null);
  const previousOwnSunk = useRef(0);
  const previousOpponentSunk = useRef(0);
  const sunkTrackingReady = useRef(false);
  const sawConfigPrompt = useRef(false);
  const sawRematchPrompt = useRef(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPlayer(getStoredPlayer(code));
  }, [code]);

  useEffect(() => {
    let ignore = false;

    async function refresh() {
      const data = await getGameInstance(code, instanceId, getStoredPlayer(code)?.token);
      if (ignore) return;
      setInstance(data);
      const nextConfig = data.config as { board_size?: number; fleet_sizes?: number[] };
      if (nextConfig.board_size) setBoardSizeInput(String(nextConfig.board_size));
      if (nextConfig.fleet_sizes) setFleetInput(nextConfig.fleet_sizes.join(', '));
      const viewerId = getStoredPlayer(code)?.id;
      if (viewerId) noteSunkChanges(data, viewerId);
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

  const viewerParticipation = instance?.participants.find(
    (participant) => participant.display_name === player?.displayName
  );
  const isAuthority = Boolean(player && authorityName(instance?.participants ?? []) === player.displayName);
  const isPlayer = viewerParticipation?.role === 'player';
  const config = instance?.config as { board_size?: number; fleet_sizes?: number[] } | undefined;
  const boardSize = config?.board_size ?? 10;
  const fleetSizes = config?.fleet_sizes ?? [];
  const remaining = remainingFleetSizes(fleetSizes, placedShips);
  const nextShipSize = remaining[0];

  const boardState =
    instance?.state && 'fleets' in instance.state ? instance.state : null;
  const ownFleet = boardState?.fleets[String(player?.id ?? '')];
  const alreadyPlaced = Boolean(ownFleet);
  const opponentKey = boardState && player ? opponentId(boardState, player.id) : null;
  const opponentFleet = opponentKey ? boardState?.fleets[opponentKey] : undefined;
  useRecordFinishedMatch(instance, player, code);

  useEffect(() => {
    if (!instance || !player) return;
    if (instance.status === 'configuring' && isAuthority && !alreadyPlaced && !sawConfigPrompt.current) {
      sawConfigPrompt.current = true;
      setConfigOpen(true);
    }
    if (instance.status === 'finished' && isPlayer && !sawRematchPrompt.current) {
      sawRematchPrompt.current = true;
      setRematchOpen(true);
    }
  }, [alreadyPlaced, instance, isAuthority, isPlayer, player]);

  function noteSunkChanges(data: GameInstanceDetail, playerId: number) {
    const { ownSunk, opponentShips } = sunkSnapshot(data, playerId);
    if (!sunkTrackingReady.current) {
      previousOwnSunk.current = ownSunk.length;
      previousOpponentSunk.current = opponentShips.length;
      sunkTrackingReady.current = Boolean(data.state);
      return;
    }
    if (ownSunk.length > previousOwnSunk.current) {
      const latest = ownSunk[ownSunk.length - 1];
      setSunkNotice(`O adversário afundou seu navio de ${latest.length} casas.`);
    } else if (opponentShips.length > previousOpponentSunk.current) {
      const latest = opponentShips[opponentShips.length - 1];
      setSunkNotice(`Você afundou um navio de ${latest.length} casas.`);
    }
    previousOwnSunk.current = ownSunk.length;
    previousOpponentSunk.current = opponentShips.length;
  }

  const ownMarks = useMemo(
    () => marksForShots(ownFleet?.shots_received ?? []),
    [ownFleet]
  );
  const opponentMarks = useMemo(
    () => marksForShots(opponentFleet?.shots_received ?? []),
    [opponentFleet]
  );
  const ownWrecked = ownFleet ? sunkShips(asShipGrid(ownFleet.ships), ownFleet.shots_received) : [];

  async function handleJoin(role: 'player' | 'spectator') {
    if (!player) return;
    setBusy(true);
    setError(null);
    try {
      setInstance(await joinGameInstance(code, instanceId, player.token, role));
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
      setInstance(
        await updateBattleshipConfig(code, instanceId, player.token, {
          board_size: Number(boardSizeInput),
          fleet_sizes: parseFleetInput(fleetInput),
        })
      );
      setPlacedShips([]);
      setConfigOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível salvar a configuração.');
    } finally {
      setBusy(false);
    }
  }

  function handlePlacementClick(cell: Cell) {
    if (!nextShipSize || alreadyPlaced) return;
    const placed = tryPlaceShip(cell, nextShipSize, orientation, boardSize, occupiedKeys(placedShips));
    if (!placed) {
      setError('Não dá para posicionar o navio nessa casa.');
      return;
    }
    setError(null);
    setPlacedShips((current) => [...current, placed]);
    setPreview([]);
  }

  function handlePlacementHover(cell: Cell) {
    if (!nextShipSize || alreadyPlaced) {
      setPreview([]);
      return;
    }
    setPreview(tryPlaceShip(cell, nextShipSize, orientation, boardSize, occupiedKeys(placedShips)) ?? []);
  }

  async function handleConfirmFleet() {
    if (!player || remaining.length > 0) return;
    setBusy(true);
    setError(null);
    try {
      setInstance(await placeBattleshipFleet(code, instanceId, player.token, placedShips));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível confirmar a frota.');
    } finally {
      setBusy(false);
    }
  }

  async function handleShot(cell: Cell) {
    if (!player || boardState?.turn !== String(player.id)) return;
    setBusy(true);
    setError(null);
    try {
      const updated = await fireBattleshipShot(code, instanceId, player.token, cell);
      setInstance(updated);
      noteSunkChanges(updated, player.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível atirar.');
    } finally {
      setBusy(false);
    }
  }

  async function handleRematch() {
    if (!player) return;
    setBusy(true);
    setError(null);
    try {
      const rematch = await requestRematch(code, instanceId, player.token, {
        board_size: Number(boardSizeInput),
        fleet_sizes: parseFleetInput(fleetInput),
      });
      router.push(`/sala/${code}/batalha-naval/${rematch.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível pedir revanche.');
    } finally {
      setBusy(false);
    }
  }

  if (!instance || !player) {
    return (
      <Typography sx={{ color: fortunaColors.ivory, textAlign: 'center', mt: 8 }}>
        Carregando partida...
      </Typography>
    );
  }

  const myTurn = boardState?.turn === String(player.id);
  const winnerId = boardState?.winner;
  const visibleOwnShips = ownFleet ? asShipGrid(ownFleet.ships) : placedShips;
  const visibleOpponentShips = opponentFleet ? asShipGrid(opponentFleet.ships) : [];
  const audience = splitAudience(instance.participants);
  const shotCount = boardState
    ? Object.values(boardState.fleets).reduce(
        (total, fleet) => total + fleet.shots_received.length,
        0
      )
    : 0;
  const battleNotes: string[] = [];
  if (instance.status === 'configuring') battleNotes.push('Posicionando frotas');
  if (instance.status === 'in_progress') {
    battleNotes.push(myTurn ? 'Vez de atirar' : 'Aguardando o disparo');
    battleNotes.push(`${shotCount} disparo${shotCount === 1 ? '' : 's'} no mar`);
  }
  if (instance.status === 'finished' && instance.winner_name) {
    battleNotes.push(`${instance.winner_name} venceu`);
  }

  return (
    <GameWithRail
      rail={
        <SpectatorRail
          players={audience.players}
          spectators={audience.spectators}
          notes={battleNotes}
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
        {tableLabel('battleship', instance.id)}
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

      {instance.status === 'configuring' && isAuthority && !configOpen ? (
        <Button
          variant="outlined"
          onClick={() => setConfigOpen(true)}
          sx={{ alignSelf: 'center', color: fortunaColors.ivory, borderColor: fortunaColors.gold }}
        >
          Alterar tabuleiro
        </Button>
      ) : null}

      {instance.status === 'configuring' && isPlayer && !alreadyPlaced ? (
        <Stack spacing={2} sx={{ alignItems: 'center', width: '100%' }}>
          <Typography sx={{ color: fortunaColors.ivory, textAlign: 'center' }}>
            {nextShipSize
              ? `Posicione o navio de ${nextShipSize} casas.`
              : 'Frota completa. Confirme para continuar.'}
          </Typography>
          <Button
            variant="outlined"
            onClick={() => setOrientation((current) => (current === 'horizontal' ? 'vertical' : 'horizontal'))}
            sx={{ color: fortunaColors.ivory, borderColor: fortunaColors.gold }}
          >
            {orientation === 'horizontal' ? 'Horizontal' : 'Vertical'}
          </Button>
          <Box
            sx={{ width: '100%', display: 'flex', justifyContent: 'center' }}
            onMouseLeave={() => setPreview([])}
            onMouseMove={(event) => {
              const target = event.target as HTMLElement;
              const label = target.getAttribute('aria-label');
              if (!label) return;
              const match = / ([A-Z])(\d+)$/.exec(label);
              if (!match) return;
              const col = match[1].charCodeAt(0) - 65;
              const row = Number(match[2]) - 1;
              handlePlacementHover([row, col]);
            }}
          >
            <BattleshipBoard
              title="Sua frota"
              boardSize={boardSize}
              marks={ownMarks}
              ships={visibleOwnShips}
              wreckedShips={ownWrecked}
              preview={preview}
              onCellClick={handlePlacementClick}
            />
          </Box>
          <Stack direction="row" spacing={2}>
            <Button
              disabled={placedShips.length === 0}
              onClick={() => setPlacedShips((current) => current.slice(0, -1))}
              sx={{ color: fortunaColors.ivory }}
            >
              Desfazer
            </Button>
            <Button
              variant="contained"
              disabled={busy || remaining.length > 0}
              onClick={handleConfirmFleet}
            >
              Confirmar frota
            </Button>
          </Stack>
        </Stack>
      ) : null}

      {instance.status === 'configuring' && alreadyPlaced ? (
        <Typography sx={{ color: fortunaColors.ivory, textAlign: 'center' }}>
          Frota posicionada. Esperando o adversário.
        </Typography>
      ) : null}

      {(instance.status === 'in_progress' || instance.status === 'finished') && instance.state ? (
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={4}
          sx={{ justifyContent: 'center', alignItems: 'center', width: '100%' }}
        >
          <BattleshipBoard
            title="Sua frota"
            boardSize={boardSize}
            marks={ownMarks}
            ships={visibleOwnShips}
            wreckedShips={ownWrecked}
            disabled
          />
          <BattleshipBoard
            title="Frota adversária"
            boardSize={boardSize}
            marks={opponentMarks}
            ships={visibleOpponentShips}
            wreckedShips={visibleOpponentShips}
            disabled={busy || instance.status !== 'in_progress' || !myTurn || !isPlayer}
            onCellClick={handleShot}
          />
        </Stack>
      ) : null}

      {sunkNotice ? (
        <Box
          role="status"
          sx={{
            border: `1px solid ${fortunaColors.gold}`,
            color: fortunaColors.ivory,
            px: 2,
            py: 1.5,
            textAlign: 'center',
            maxWidth: 420,
            mx: 'auto',
            width: '100%',
          }}
        >
          <Typography>{sunkNotice}</Typography>
        </Box>
      ) : null}

      {instance.status === 'in_progress' ? (
        <Typography sx={{ color: fortunaColors.ivory, textAlign: 'center' }}>
          {myTurn ? 'Sua vez de atirar.' : 'Aguardando o adversário atirar.'}
        </Typography>
      ) : null}

      {instance.status === 'finished' ? (
        <Stack spacing={2} sx={{ alignItems: 'center' }}>
          <Typography variant="h5" sx={{ color: fortunaColors.gold, textAlign: 'center' }}>
            {winnerId === String(player.id)
              ? 'Você venceu.'
              : instance.winner_name
                ? `${instance.winner_name} venceu.`
                : 'Partida encerrada.'}
          </Typography>
          {isPlayer && !rematchOpen ? (
            <Button variant="contained" onClick={() => setRematchOpen(true)}>
              Jogar novamente
            </Button>
          ) : null}
        </Stack>
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
          Você define o tabuleiro desta mesa
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <FortunaField
              id="battleship-board-size"
              label="Tamanho do tabuleiro"
              tone="onLight"
              value={boardSizeInput}
              onChange={(event) => setBoardSizeInput(event.target.value)}
            />
            <FortunaField
              id="battleship-fleet"
              label="Navios (tamanhos separados por vírgula)"
              tone="onLight"
              value={fleetInput}
              onChange={(event) => setFleetInput(event.target.value)}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
          {player ? (
            <DeleteInstanceButton roomCode={code} instanceId={instance.id} token={player.token} />
          ) : (
            <span />
          )}
          <Stack direction="row" spacing={1}>
            <Button onClick={() => setConfigOpen(false)} sx={{ color: fortunaColors.graphite }}>
              Usar este tabuleiro
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
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Typography variant="body2" sx={{ color: fortunaColors.graphite }}>
              A nova mesa usa as mesmas regras, a menos que você queira mudá-las.
            </Typography>
            <FortunaField
              id="rematch-board-size"
              label="Tamanho do tabuleiro"
              tone="onLight"
              value={boardSizeInput}
              onChange={(event) => setBoardSizeInput(event.target.value)}
            />
            <FortunaField
              id="rematch-fleet"
              label="Navios (tamanhos separados por vírgula)"
              tone="onLight"
              value={fleetInput}
              onChange={(event) => setFleetInput(event.target.value)}
            />
          </Stack>
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
    </Stack>
    </GameWithRail>
  );
}
