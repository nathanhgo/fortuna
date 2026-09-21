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
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import {
  getGameInstance,
  isCoupState,
  joinGameInstance,
  playCoupAct,
  requestRematch,
  startGameInstance,
  updateCoupConfig,
  type CoupCharacter,
  type CoupConfig,
  type CoupLegalAct,
  type CoupState,
  type GameInstanceDetail,
  type GameParticipantSummary,
} from '@/lib/api';
import {
  ACTION_HELP,
  ACTION_LABELS,
  CHARACTER_LABELS,
  FACTION_LABELS,
  groupTurnActions,
  rewriteHistory,
} from '@/lib/coup/characters';
import { tableLabel } from '@/lib/catalog';
import { DeleteInstanceButton } from '@/components/DeleteInstanceButton';
import { getStoredPlayer, type StoredPlayer } from '@/lib/playerStorage';
import { subscribeToRoom } from '@/lib/roomSocket';
import { fortunaColors } from '@/theme/palette';
import { CoupCard } from './CoupCard';
import { GameWithRail, SpectatorRail, splitAudience } from '@/components/SpectatorRail';
import { useRecordFinishedMatch } from '@/lib/useRecordFinishedMatch';

interface CoupGameProps {
  code: string;
  instanceId: string;
}

const DEFAULT_COPIES = {
  duke: 3,
  assassin: 3,
  captain: 3,
  ambassador: 3,
  contessa: 3,
  inquisitor: 0,
};

function authorityName(participants: GameParticipantSummary[]): string | null {
  const players = participants
    .filter((participant) => participant.role === 'player')
    .sort((a, b) => (a.seat ?? 99) - (b.seat ?? 99));
  return players[0]?.display_name ?? null;
}

export function CoupGame({ code, instanceId }: CoupGameProps) {
  const router = useRouter();
  const [player, setPlayer] = useState<StoredPlayer | null>(null);
  const [instance, setInstance] = useState<GameInstanceDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [configOpen, setConfigOpen] = useState(false);
  const [rematchOpen, setRematchOpen] = useState(false);
  const [maxPlayers, setMaxPlayers] = useState(6);
  const [reformation, setReformation] = useState(false);
  const [inquisitor, setInquisitor] = useState(false);
  const [challengeSeconds, setChallengeSeconds] = useState(15);
  const [copies, setCopies] = useState({ ...DEFAULT_COPIES });
  const [keep, setKeep] = useState<CoupCharacter[]>([]);
  const [actTarget, setActTarget] = useState<string | null>(null);
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
      const next = data.config as Partial<CoupConfig>;
      if (next.max_players) setMaxPlayers(next.max_players);
      if (typeof next.reformation === 'boolean') setReformation(next.reformation);
      if (typeof next.inquisitor === 'boolean') setInquisitor(next.inquisitor);
      if (next.challenge_seconds) setChallengeSeconds(next.challenge_seconds);
      if (next.copies) setCopies({ ...DEFAULT_COPIES, ...next.copies });
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
  const isAuthority = Boolean(
    player && authorityName(instance?.participants ?? []) === player.displayName
  );
  const isPlayer = viewerParticipation?.role === 'player';
  const seated = instance?.participants.filter((participant) => participant.role === 'player') ?? [];
  const coup = isCoupState(instance?.state ?? null) ? instance?.state : null;
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

  useEffect(() => {
    if (!coup || !player || !['challenge_action', 'block', 'challenge_block'].includes(coup.phase)) {
      return;
    }
    const deadline = coup.pending.deadline_ms;
    if (!deadline) return;
    const wait = Math.max(0, deadline - Date.now()) + 50;
    const timer = window.setTimeout(() => {
      playCoupAct(code, instanceId, player.token, { kind: 'timeout' })
        .then(setInstance)
        .catch(() => undefined);
    }, wait);
    return () => window.clearTimeout(timer);
  }, [code, coup, instanceId, player]);

  function currentConfig(): CoupConfig {
    return {
      max_players: maxPlayers,
      copies: inquisitor ? { ...copies, ambassador: 0, inquisitor: copies.ambassador || 3 } : copies,
      reformation,
      inquisitor: reformation && inquisitor,
      challenge_seconds: challengeSeconds,
    };
  }

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
      setInstance(await updateCoupConfig(code, instanceId, player.token, currentConfig()));
      setConfigOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível salvar a configuração.');
    } finally {
      setBusy(false);
    }
  }

  async function handleStart() {
    if (!player) return;
    setBusy(true);
    setError(null);
    try {
      setInstance(await startGameInstance(code, instanceId, player.token));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível começar.');
    } finally {
      setBusy(false);
    }
  }

  async function sendAct(act: CoupLegalAct & { cards?: CoupCharacter[]; swap?: boolean; slot?: number }) {
    if (!player) return;
    setBusy(true);
    setError(null);
    try {
      setInstance(await playCoupAct(code, instanceId, player.token, act));
      setKeep([]);
      setActTarget(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Essa jogada não vale.');
    } finally {
      setBusy(false);
    }
  }

  async function handleRematch() {
    if (!player) return;
    setBusy(true);
    setError(null);
    try {
      const rematch = await requestRematch(code, instanceId, player.token, currentConfig());
      router.push(`/sala/${code}/coup/${rematch.id}`);
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

  const names = nameMap(instance.participants);
  const myId = String(player.id);
  const audience = splitAudience(instance.participants);
  const coupPlayers = audience.players.map((person) => {
    const participant = instance.participants.find((item) => item.display_name === person.name);
    const view = participant?.player_id ? coup?.players[String(participant.player_id)] : undefined;
    if (!view) return person;
    const life = view.alive ? `${view.hidden_count} influência` : 'eliminado';
    return { ...person, detail: `${view.coins} moedas · ${life}` };
  });
  const coupNotes: string[] = [];
  if (instance.status === 'configuring') coupNotes.push('Aguardando o anfitrião começar');
  if (coup?.history?.length) {
    coupNotes.push(
      ...coup.history.slice(-3).map((item) => rewriteHistory(item.text, names))
    );
  }
  if (coup?.winner) {
    const winnerName = names[coup.winner] ?? coup.winner;
    coupNotes.push(`${winnerName} venceu a corte`);
  }

  return (
    <GameWithRail
      rail={
        <SpectatorRail
          players={coupPlayers}
          spectators={audience.spectators}
          notes={coupNotes}
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
        {tableLabel('coup', instance.id)}
      </Typography>
      <Typography variant="body2" sx={{ color: fortunaColors.ivory, opacity: 0.7, textAlign: 'center' }}>
        {seated.map((participant) => participant.display_name).join(' · ') || 'Aguardando jogadores'}
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
        <Stack direction="row" spacing={2} sx={{ justifyContent: 'center', flexWrap: 'wrap' }}>
          <Button
            variant="outlined"
            onClick={() => setConfigOpen(true)}
            sx={{ color: fortunaColors.ivory, borderColor: fortunaColors.gold }}
          >
            Configurar mesa
          </Button>
          <Button variant="contained" disabled={busy || seated.length < 2} onClick={handleStart}>
            Começar partida
          </Button>
        </Stack>
      ) : null}

      {instance.status === 'configuring' && !isAuthority ? (
        <Typography sx={{ color: fortunaColors.ivory, textAlign: 'center' }}>
          Aguardando o anfitrião definir as regras e começar.
        </Typography>
      ) : null}

      {coup && (instance.status === 'in_progress' || instance.status === 'finished') ? (
        <Table
          coup={coup}
          names={names}
          myId={myId}
          busy={busy}
          keep={keep}
          actTarget={actTarget}
          copies={(instance.config.copies as Record<string, number>) ?? {}}
          onKeep={setKeep}
          onTarget={setActTarget}
          onAct={sendAct}
        />
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
          Você define esta mesa de Coup
        </DialogTitle>
        <DialogContent sx={{ overflowX: 'hidden' }}>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Typography variant="body2">Jogadores (2 a 6 no jogo base)</Typography>
            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
              {[2, 3, 4, 5, 6].map((n) => (
                <Button
                  key={n}
                  variant={maxPlayers === n ? 'contained' : 'outlined'}
                  onClick={() => setMaxPlayers(n)}
                >
                  {n}
                </Button>
              ))}
            </Stack>
            <Typography variant="body2">Janela de contestação</Typography>
            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
              {[10, 15, 20].map((n) => (
                <Button
                  key={n}
                  variant={challengeSeconds === n ? 'contained' : 'outlined'}
                  onClick={() => setChallengeSeconds(n)}
                >
                  {n}s
                </Button>
              ))}
            </Stack>
            <Button
              variant={reformation ? 'contained' : 'outlined'}
              onClick={() => {
                setReformation((value) => !value);
                if (reformation) setInquisitor(false);
              }}
            >
              Alianças (Reformation)
            </Button>
            {reformation ? (
              <Button
                variant={inquisitor ? 'contained' : 'outlined'}
                onClick={() => setInquisitor((value) => !value)}
              >
                Inquisidor no lugar do Embaixador
              </Button>
            ) : null}
            <Typography variant="body2">Cópias de cada personagem</Typography>
            <Stack spacing={1.5}>
              {(Object.keys(DEFAULT_COPIES) as CoupCharacter[])
                .filter((name) => (inquisitor ? name !== 'ambassador' : name !== 'inquisitor'))
                .map((name) => (
                  <Stack key={name} spacing={0.75}>
                    <Typography variant="body2">{CHARACTER_LABELS[name]}</Typography>
                    <Stack direction="row" spacing={0.75} sx={{ flexWrap: 'wrap' }}>
                      {[1, 2, 3, 4, 5].map((n) => (
                        <Button
                          key={n}
                          size="small"
                          variant={(copies[name] ?? 0) === n ? 'contained' : 'outlined'}
                          onClick={() => setCopies((current) => ({ ...current, [name]: n }))}
                          sx={{ minWidth: 40 }}
                        >
                          {n}
                        </Button>
                      ))}
                    </Stack>
                  </Stack>
                ))}
            </Stack>
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
        disableRestoreFocus
        slotProps={{ paper: { sx: { bgcolor: fortunaColors.ivory, p: 1 } } }}
      >
        <DialogTitle>Jogar novamente?</DialogTitle>
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

function Table({
  coup,
  names,
  myId,
  busy,
  keep,
  actTarget,
  copies,
  onKeep,
  onTarget,
  onAct,
}: {
  coup: CoupState;
  names: Record<string, string>;
  myId: string;
  busy: boolean;
  keep: CoupCharacter[];
  actTarget: string | null;
  copies: Record<string, number>;
  onKeep: (cards: CoupCharacter[]) => void;
  onTarget: (id: string | null) => void;
  onAct: (act: CoupLegalAct & { cards?: CoupCharacter[]; swap?: boolean; slot?: number }) => void;
}) {
  const others = coup.order.filter((id) => id !== myId);
  const me = coup.players[myId];
  const turnName = names[coup.turn] ?? coup.turn;
  const acts = coup.legal_acts ?? [];
  const grouped =
    coup.phase === 'action' && coup.turn === myId && me
      ? groupTurnActions({
          hand: me.hand,
          coins: me.coins,
          copies,
          reformation: coup.reformation,
        })
      : null;
  const lose = coup.pending.lose_queue?.[0];
  const choosingHidden =
    coup.phase === 'lose_influence' &&
    Boolean(lose?.chooser) &&
    lose?.chooser === myId &&
    lose?.player !== myId;
  const shown = coup.pending.shown;
  const shownBy = coup.pending.shown_by;
  const needsTarget = grouped
    ? [...grouped.standard, ...grouped.mine, ...grouped.bluff].some((act) => act.needsTarget)
    : acts.some((act) =>
        Boolean(act.target && ['coup', 'assassinate', 'steal', 'examine', 'convert'].includes(act.kind))
      );

  return (
    <Stack spacing={3}>
      <Stack direction="row" spacing={2} sx={{ justifyContent: 'center', flexWrap: 'wrap' }}>
        {others.map((id) => {
          const data = coup.players[id];
          if (!data) return null;
          return (
            <Stack key={id} spacing={0.75} sx={{ alignItems: 'center', minWidth: 120 }}>
              <Typography sx={{ color: fortunaColors.ivory, textAlign: 'center' }}>
                {names[id] ?? id}
              </Typography>
              {data.faction ? (
                <Typography variant="caption" sx={{ color: fortunaColors.gold }}>
                  {FACTION_LABELS[data.faction]}
                </Typography>
              ) : null}
              <Typography variant="body2" sx={{ color: fortunaColors.gold }}>
                {data.coins} {data.coins === 1 ? 'moeda' : 'moedas'}
              </Typography>
              <Stack direction="row" spacing={0.5}>
                {Array.from({ length: data.hidden_count }).map((_, index) => (
                  <CoupCard key={`h-${id}-${index}`} width={72} tilt={index === 0 ? -6 : 6} />
                ))}
                {data.revealed.map((card) => (
                  <CoupCard key={`${id}-${card}`} character={card} faceUp width={72} />
                ))}
              </Stack>
              {!data.alive ? (
                <Typography variant="caption" sx={{ color: fortunaColors.wine }}>
                  Eliminado
                </Typography>
              ) : null}
            </Stack>
          );
        })}
      </Stack>

      <Stack spacing={0.75} sx={{ alignItems: 'center' }}>
        <CourtPile count={coup.deck_count} />
        <Typography variant="body2" sx={{ color: fortunaColors.ivory, opacity: 0.7 }}>
          Corte · {coup.deck_count} cartas
          {coup.reformation ? ` · Reserva ${coup.treasury_reserve}` : ''}
        </Typography>
      </Stack>

      <Typography sx={{ color: fortunaColors.ivory, textAlign: 'center' }}>
        {coup.status === 'finished'
          ? coup.winner === myId
            ? 'Você venceu.'
            : `${names[coup.winner ?? ''] ?? 'Alguém'} venceu.`
          : coup.turn === myId
            ? phasePrompt(coup)
            : `Vez de ${turnName}. ${phasePrompt(coup)}`}
      </Typography>

      {coup.phase === 'show_proof' && shown ? (
        <Stack spacing={1.5} sx={{ alignItems: 'center' }}>
          <Typography sx={{ color: fortunaColors.ivory, textAlign: 'center' }}>
            {names[shownBy ?? ''] ?? 'Alguém'} mostrou {CHARACTER_LABELS[shown]}.
          </Typography>
          <CoupCard character={shown} faceUp width={120} />
          {shownBy === myId ? (
            <Button variant="contained" disabled={busy} onClick={() => onAct({ kind: 'replace' })}>
              Trocar com a corte
            </Button>
          ) : (
            <Typography variant="body2" sx={{ color: fortunaColors.ivory, opacity: 0.75 }}>
              Aguardando a carta voltar à corte.
            </Typography>
          )}
        </Stack>
      ) : null}

      {choosingHidden && lose ? (
        <Stack spacing={1} sx={{ alignItems: 'center' }}>
          <Typography sx={{ color: fortunaColors.ivory, textAlign: 'center' }}>
            {names[lose.player] ?? 'O jogador'} blefou. Escolha uma carta oculta para ele perder.
          </Typography>
          <Stack direction="row" spacing={1}>
            {Array.from({ length: coup.players[lose.player]?.hidden_count ?? 0 }).map((_, index) => (
              <CoupCard
                key={`pick-${index}`}
                width={100}
                onClick={() => onAct({ kind: 'reveal', slot: index })}
                ariaLabel={`Escolher carta oculta ${index + 1}`}
              />
            ))}
          </Stack>
        </Stack>
      ) : null}

      {me ? (
        <Stack spacing={1} sx={{ alignItems: 'center' }}>
          <Typography variant="body2" sx={{ color: fortunaColors.gold }}>
            {me.coins} {me.coins === 1 ? 'moeda' : 'moedas'}
            {me.faction ? ` · ${FACTION_LABELS[me.faction]}` : ''}
          </Typography>
          <Stack direction="row" spacing={1} sx={{ justifyContent: 'center' }}>
            {me.hand.map((card, index) =>
              card ? (
                <CoupCard
                  key={`${card}-${index}`}
                  character={card}
                  faceUp
                  width={120}
                  tilt={index === 0 ? -8 : 8}
                  selected={
                    coup.phase === 'lose_influence' &&
                    !choosingHidden &&
                    acts.some((act) => act.card === card)
                  }
                  onClick={
                    coup.phase === 'lose_influence' && !choosingHidden
                      ? () => onAct({ kind: 'reveal', card })
                      : undefined
                  }
                />
              ) : (
                <CoupCard key={`hidden-${index}`} width={120} />
              )
            )}
            {me.revealed.map((card) => (
              <CoupCard key={`rev-${card}`} character={card} faceUp width={88} />
            ))}
          </Stack>
        </Stack>
      ) : null}

      {coup.phase === 'exchange' && coup.pending.actor === myId ? (
        <ExchangePicker
          hand={(me?.hand.filter(Boolean) as CoupCharacter[]) ?? []}
          drawn={(coup.pending.drawn?.filter(Boolean) as CoupCharacter[]) ?? []}
          keep={keep}
          onKeep={onKeep}
          onConfirm={() => onAct({ kind: 'keep', cards: keep })}
        />
      ) : null}

      {coup.phase === 'examine_show' && coup.pending.target === myId && me ? (
        <Stack spacing={1} sx={{ alignItems: 'center' }}>
          <Typography sx={{ color: fortunaColors.ivory }}>
            Mostre uma carta ao Inquisidor.
          </Typography>
          <Stack direction="row" spacing={1}>
            {(me.hand.filter(Boolean) as CoupCharacter[]).map((card, index) => (
              <CoupCard
                key={`${card}-${index}`}
                character={card}
                faceUp
                width={100}
                onClick={() => onAct({ kind: 'examine_show', card })}
              />
            ))}
          </Stack>
        </Stack>
      ) : null}

      {coup.phase === 'examine_decide' && coup.pending.actor === myId && coup.pending.shown ? (
        <Stack spacing={1} sx={{ alignItems: 'center' }}>
          <Typography sx={{ color: fortunaColors.ivory }}>
            {names[coup.pending.target ?? ''] ?? 'O alvo'} mostrou {CHARACTER_LABELS[coup.pending.shown]}.
          </Typography>
          <CoupCard character={coup.pending.shown} faceUp width={110} />
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" disabled={busy} onClick={() => onAct({ kind: 'examine_decide', swap: false })}>
              Devolver
            </Button>
            <Button variant="contained" disabled={busy} onClick={() => onAct({ kind: 'examine_decide', swap: true })}>
              Forçar troca
            </Button>
          </Stack>
        </Stack>
      ) : null}

      {grouped ? (
        <Stack spacing={2} sx={{ width: '100%' }}>
          {needsTarget ? (
            <Stack spacing={0.75} sx={{ alignItems: 'center' }}>
              <Typography variant="body2" sx={{ color: fortunaColors.ivory, opacity: 0.75 }}>
                Alvo
              </Typography>
              <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', justifyContent: 'center' }}>
                {coup.order
                  .filter((id) => id !== myId && coup.players[id]?.alive)
                  .map((id) => (
                    <Button
                      key={id}
                      variant={actTarget === id ? 'contained' : 'outlined'}
                      onClick={() => onTarget(id)}
                    >
                      {names[id] ?? id}
                    </Button>
                  ))}
              </Stack>
            </Stack>
          ) : null}
          <ActionGroup
            title="Ações padrão"
            actions={grouped.standard}
            busy={busy}
            actTarget={actTarget}
            onAct={onAct}
          />
          <ActionGroup
            title="Com as suas cartas"
            actions={grouped.mine}
            busy={busy}
            actTarget={actTarget}
            onAct={onAct}
          />
          <ActionGroup
            title="Blefe"
            actions={grouped.bluff}
            busy={busy}
            actTarget={actTarget}
            onAct={onAct}
          />
        </Stack>
      ) : null}

      {!grouped && acts.length > 0 && coup.phase !== 'exchange' && coup.phase !== 'lose_influence' ? (
        <Stack spacing={1.5} sx={{ alignItems: 'center' }}>
          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', justifyContent: 'center' }}>
            {uniqueKinds(acts).map((kind) => {
              const payload =
                acts.find((act) => act.kind === kind && (!act.target || act.target === actTarget)) ??
                acts.find((act) => act.kind === kind);
              if (!payload) return null;
              return (
                <HelpActionButton
                  key={`${kind}-${payload.card ?? ''}`}
                  kind={kind}
                  card={payload.card}
                  disabled={busy}
                  onClick={() => onAct(payload)}
                />
              );
            })}
          </Stack>
        </Stack>
      ) : null}

      {coup.history.length > 0 ? (
        <Box
          sx={{
            border: `1px solid ${fortunaColors.gold}55`,
            p: 1.5,
            maxHeight: 180,
            overflow: 'auto',
            color: fortunaColors.ivory,
            fontSize: '0.9rem',
          }}
        >
          {coup.history
            .slice()
            .reverse()
            .map((entry, index) => (
              <Typography key={`${entry.text}-${index}`} variant="body2" sx={{ color: fortunaColors.ivory }}>
                {rewriteHistory(entry.text, names)}
              </Typography>
            ))}
        </Box>
      ) : null}
    </Stack>
  );
}

function CourtPile({ count }: { count: number }) {
  const layers = Math.min(count, 3);
  const width = 72;
  const height = Math.round(width * 1.4);
  const offset = 5;
  return (
    <Box
      aria-label={`Pilha da corte, ${count} cartas`}
      sx={{
        position: 'relative',
        width: width + offset * Math.max(layers - 1, 0),
        height: height + offset * Math.max(layers - 1, 0),
      }}
    >
      {Array.from({ length: layers }).map((_, index) => (
        <Box
          key={index}
          sx={{
            position: 'absolute',
            left: index * offset,
            top: index * offset,
            zIndex: index,
          }}
        >
          <CoupCard width={width} />
        </Box>
      ))}
    </Box>
  );
}

function ExchangePicker({
  hand,
  drawn,
  keep,
  onKeep,
  onConfirm,
}: {
  hand: CoupCharacter[];
  drawn: CoupCharacter[];
  keep: CoupCharacter[];
  onKeep: (cards: CoupCharacter[]) => void;
  onConfirm: () => void;
}) {
  const pool = [...hand, ...drawn];
  const need = hand.length;
  function toggle(card: CoupCharacter, index: number) {
    const key = `${card}-${index}`;
    const currentKeys = keep.map((item, keepIndex) => `${item}-${pool.indexOf(item) === index ? index : keepIndex}`);
    const already = keep.filter((item) => item === card).length;
    const available = pool.filter((item) => item === card).length;
    if (keep.includes(card) && already >= 1) {
      const next = [...keep];
      const at = next.lastIndexOf(card);
      if (at >= 0) next.splice(at, 1);
      onKeep(next);
      return;
    }
    if (keep.length >= need) return;
    if (already >= available) return;
    onKeep([...keep, card]);
    void key;
    void currentKeys;
  }

  return (
    <Stack spacing={1.5} sx={{ alignItems: 'center' }}>
      <Typography sx={{ color: fortunaColors.ivory }}>
        Fique com {need} carta{need > 1 ? 's' : ''} e devolva o resto à corte.
      </Typography>
      <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', justifyContent: 'center' }}>
        {pool.map((card, index) => {
          const selectedCount = keep.filter((item) => item === card).length;
          const poolCount = pool.slice(0, index + 1).filter((item) => item === card).length;
          const selected = selectedCount >= poolCount;
          return (
            <CoupCard
              key={`${card}-${index}`}
              character={card}
              faceUp
              width={100}
              selected={selected}
              onClick={() => toggle(card, index)}
            />
          );
        })}
      </Stack>
      <Button variant="contained" disabled={keep.length !== need} onClick={onConfirm}>
        Confirmar troca
      </Button>
    </Stack>
  );
}

function ActionGroup({
  title,
  actions,
  busy,
  actTarget,
  onAct,
}: {
  title: string;
  actions: { kind: string; cost: number; needsTarget: boolean; affordable: boolean }[];
  busy: boolean;
  actTarget: string | null;
  onAct: (act: CoupLegalAct & { cards?: CoupCharacter[]; swap?: boolean }) => void;
}) {
  if (actions.length === 0) return null;
  return (
    <Stack spacing={0.75} sx={{ alignItems: 'center' }}>
      <Typography variant="body2" sx={{ color: fortunaColors.ivory, opacity: 0.75 }}>
        {title}
      </Typography>
      <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', justifyContent: 'center' }}>
        {actions.map((action) => (
          <HelpActionButton
            key={action.kind}
            kind={action.kind}
            disabled={busy || !action.affordable || (action.needsTarget && !actTarget)}
            onClick={() =>
              onAct(action.needsTarget && actTarget ? { kind: action.kind, target: actTarget } : { kind: action.kind })
            }
          />
        ))}
      </Stack>
    </Stack>
  );
}

function HelpActionButton({
  kind,
  card,
  disabled,
  onClick,
}: {
  kind: string;
  card?: CoupCharacter;
  disabled?: boolean;
  onClick: () => void;
}) {
  const label = actionButtonLabel(kind, card);
  const help = ACTION_HELP[kind] ?? label;
  return (
    <Stack direction="row" spacing={0} sx={{ alignItems: 'stretch' }}>
      <Button
        variant="contained"
        disabled={disabled}
        onClick={onClick}
        sx={{
          borderTopRightRadius: 0,
          borderBottomRightRadius: 0,
          '&.Mui-disabled': {
            bgcolor: `${fortunaColors.gold}33`,
            color: fortunaColors.ivory,
            border: `1px solid ${fortunaColors.gold}99`,
            opacity: 1,
          },
        }}
      >
        {label}
      </Button>
      <Tooltip title={help} enterDelay={200} enterTouchDelay={0}>
        <Box
          component="button"
          type="button"
          aria-label={`O que é ${label}`}
          sx={{
            appearance: 'none',
            minWidth: 36,
            px: 1,
            border: `1px solid ${disabled ? `${fortunaColors.gold}99` : fortunaColors.gold}`,
            borderLeft: 0,
            bgcolor: fortunaColors.graphite,
            color: disabled ? `${fortunaColors.gold}cc` : fortunaColors.gold,
            cursor: 'help',
            fontFamily: 'var(--font-cormorant), Georgia, serif',
            fontSize: '1.1rem',
            lineHeight: 1,
          }}
        >
          ?
        </Box>
      </Tooltip>
    </Stack>
  );
}

function uniqueKinds(acts: CoupLegalAct[]): string[] {
  const seen = new Set<string>();
  const kinds: string[] = [];
  for (const act of acts) {
    const key = act.card ? `${act.kind}:${act.card}` : act.kind;
    if (seen.has(key)) continue;
    seen.add(key);
    kinds.push(act.kind);
  }
  return kinds;
}

function actionButtonLabel(kind: string, card?: CoupCharacter): string {
  if (kind === 'block' && card) return `Bloquear (${CHARACTER_LABELS[card]})`;
  return ACTION_LABELS[kind] ?? kind;
}

function phasePrompt(coup: CoupState): string {
  if (coup.phase === 'action') return 'Escolha uma ação.';
  if (coup.phase === 'challenge_action') return 'Contestar ou deixar passar.';
  if (coup.phase === 'block') return 'Bloquear ou deixar passar.';
  if (coup.phase === 'challenge_block') return 'Contestar o bloqueio ou deixar passar.';
  if (coup.phase === 'lose_influence') {
    const current = coup.pending.lose_queue?.[0];
    if (current?.chooser) return 'Escolha uma carta oculta de quem blefou.';
    return 'Revele uma carta de influência.';
  }
  if (coup.phase === 'show_proof') return 'A carta contestada precisa voltar à corte.';
  if (coup.phase === 'exchange') return 'Escolha as cartas que ficam na mão.';
  return '';
}

function nameMap(participants: GameParticipantSummary[]): Record<string, string> {
  const map: Record<string, string> = {};
  for (const participant of participants) {
    if (participant.player_id != null) {
      map[String(participant.player_id)] = participant.display_name;
    }
  }
  return map;
}

