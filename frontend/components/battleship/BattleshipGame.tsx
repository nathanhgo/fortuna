'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import {
  fireBattleshipShot,
  getGameInstance,
  joinGameInstance,
  placeBattleshipFleet,
  requestRematch,
  updateBattleshipConfig,
  type GameInstanceDetail,
  type GameParticipantSummary,
} from '@/lib/api';
import {
  occupiedKeys,
  remainingFleetSizes,
  tryPlaceShip,
  type Cell,
  type Orientation,
} from '@/lib/battleship/placement';
import { getStoredPlayer, type StoredPlayer } from '@/lib/playerStorage';
import { subscribeToRoom } from '@/lib/roomSocket';
import { fortunaColors } from '@/theme/palette';
import { BattleshipBoard, type CellMark } from './BattleshipBoard';

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

function opponentId(state: NonNullable<GameInstanceDetail['state']>, viewerId: number): string | null {
  return Object.keys(state.fleets).find((key) => key !== String(viewerId)) ?? null;
}

function marksForFleet(
  boardSize: number,
  ships: number[][][],
  shots: { cell: number[]; result: string }[],
  revealShips: boolean
): Record<string, CellMark> {
  const marks: Record<string, CellMark> = {};
  if (revealShips) {
    for (const ship of ships) {
      for (const [row, col] of ship) {
        marks[`${row},${col}`] = 'ship';
      }
    }
  }
  for (const shot of shots) {
    const [row, col] = shot.cell;
    marks[`${row},${col}`] = shot.result === 'miss' ? 'miss' : shot.result === 'sunk' ? 'sunk' : 'hit';
  }
  void boardSize;
  return marks;
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
      const config = data.config as { board_size?: number; fleet_sizes?: number[] };
      if (config.board_size) setBoardSizeInput(String(config.board_size));
      if (config.fleet_sizes) setFleetInput(config.fleet_sizes.join(', '));
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

  const ownFleet = instance?.state?.fleets[String(player?.id ?? '')];
  const alreadyPlaced = Boolean(ownFleet);
  const opponentKey = instance?.state && player ? opponentId(instance.state, player.id) : null;
  const opponentFleet = opponentKey ? instance?.state?.fleets[opponentKey] : undefined;

  const ownMarks = useMemo(
    () =>
      marksForFleet(
        boardSize,
        ownFleet?.ships ?? placedShips,
        ownFleet?.shots_received ?? [],
        true
      ),
    [boardSize, ownFleet, placedShips]
  );
  const opponentMarks = useMemo(
    () => marksForFleet(boardSize, opponentFleet?.ships ?? [], opponentFleet?.shots_received ?? [], false),
    [boardSize, opponentFleet]
  );

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
    const fleetSizesParsed = fleetInput
      .split(',')
      .map((item) => Number(item.trim()))
      .filter((item) => Number.isFinite(item) && item > 0);
    setBusy(true);
    setError(null);
    try {
      setInstance(
        await updateBattleshipConfig(code, instanceId, player.token, {
          board_size: Number(boardSizeInput),
          fleet_sizes: fleetSizesParsed,
        })
      );
      setPlacedShips([]);
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
    if (!player || instance?.state?.turn !== String(player.id)) return;
    setBusy(true);
    setError(null);
    try {
      setInstance(await fireBattleshipShot(code, instanceId, player.token, cell));
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
      const rematch = await requestRematch(code, instanceId, player.token);
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

  const myTurn = instance.state?.turn === String(player.id);
  const winnerId = instance.state?.winner;

  return (
    <Stack spacing={3} sx={{ maxWidth: 920, mx: 'auto', px: 2 }}>
      <Button component={Link} href={`/sala/${code}`} sx={{ alignSelf: 'flex-start', color: fortunaColors.ivory }}>
        Voltar à sala
      </Button>
      <Typography variant="h4" component="h1" sx={{ color: fortunaColors.ivory, textAlign: 'center' }}>
        Batalha Naval
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
        <Stack spacing={2} sx={{ maxWidth: 420, mx: 'auto', width: '100%' }}>
          <Typography sx={{ color: fortunaColors.ivory }}>
            Você define o tabuleiro desta mesa.
          </Typography>
          <TextField
            label="Tamanho do tabuleiro"
            value={boardSizeInput}
            onChange={(event) => setBoardSizeInput(event.target.value)}
            size="small"
            sx={{ bgcolor: fortunaColors.ivory }}
          />
          <TextField
            label="Navios (tamanhos separados por vírgula)"
            value={fleetInput}
            onChange={(event) => setFleetInput(event.target.value)}
            size="small"
            sx={{ bgcolor: fortunaColors.ivory }}
          />
          <Button variant="outlined" disabled={busy} onClick={handleSaveConfig}>
            Salvar configuração
          </Button>
        </Stack>
      ) : null}

      {instance.status === 'configuring' && isPlayer && !alreadyPlaced ? (
        <Stack spacing={2} sx={{ alignItems: 'center' }}>
          <Typography sx={{ color: fortunaColors.ivory }}>
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
          sx={{ justifyContent: 'center', alignItems: 'flex-start' }}
        >
          <BattleshipBoard title="Sua frota" boardSize={boardSize} marks={ownMarks} disabled />
          <BattleshipBoard
            title="Frota adversária"
            boardSize={boardSize}
            marks={opponentMarks}
            disabled={busy || instance.status !== 'in_progress' || !myTurn || !isPlayer}
            onCellClick={handleShot}
          />
        </Stack>
      ) : null}

      {instance.status === 'in_progress' ? (
        <Typography sx={{ color: fortunaColors.ivory, textAlign: 'center' }}>
          {myTurn ? 'Sua vez de atirar.' : 'Aguardando o adversário atirar.'}
        </Typography>
      ) : null}

      {instance.status === 'finished' ? (
        <Stack spacing={2} sx={{ alignItems: 'center' }}>
          <Typography variant="h5" sx={{ color: fortunaColors.gold }}>
            {winnerId === String(player.id)
              ? 'Você venceu.'
              : instance.winner_name
                ? `${instance.winner_name} venceu.`
                : 'Partida encerrada.'}
          </Typography>
          {isPlayer ? (
            <Button variant="contained" disabled={busy} onClick={handleRematch}>
              Pedir revanche
            </Button>
          ) : null}
        </Stack>
      ) : null}

      {error ? (
        <Typography variant="body2" sx={{ color: fortunaColors.wine, textAlign: 'center' }}>
          {error}
        </Typography>
      ) : null}
    </Stack>
  );
}
