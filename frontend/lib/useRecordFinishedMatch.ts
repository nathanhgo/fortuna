import { useEffect } from 'react';
import type { GameInstanceDetail } from '@/lib/api';
import { recordFinishedMatch } from '@/lib/profileCache';
import type { StoredPlayer } from '@/lib/playerStorage';

export function useRecordFinishedMatch(
  instance: GameInstanceDetail | null,
  player: StoredPlayer | null,
  roomCode: string
) {
  useEffect(() => {
    if (!instance || instance.status !== 'finished' || !player) return;
    const seated = instance.participants.filter((participant) => participant.role === 'player');
    const me = seated.find(
      (participant) =>
        participant.player_id === player.id || participant.display_name === player.displayName
    );
    if (!me) return;
    const opponent = seated.find((participant) => participant !== me)?.display_name;
    let result: 'win' | 'loss' | 'draw' = 'draw';
    if (instance.winner_name) {
      result = instance.winner_name === player.displayName ? 'win' : 'loss';
    }
    recordFinishedMatch({
      instanceId: instance.id,
      game: instance.game,
      result,
      opponent,
      roomCode,
    });
  }, [instance, player, roomCode]);
}
