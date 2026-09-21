"""
Modelo genérico de "instância de jogo dentro de uma sala" (ver architecture_docs/idea.md:
"Arquitetura pensada para permitir adicionar novos jogos sem reescrever a camada de salas").

Cada jogo (`GAME_CHOICES`) guarda sua config/estado em `GameInstance.config`/`state`, como JSON
livre — o formato exato desses dicionários é definido pelo motor de cada jogo (ex.:
`games/battleship/engine.py`), não por este módulo. Este módulo só conhece as regras
transversais que valem para todo jogo (ver .cursor/rules/00-project-context.mdc):
participantes, papéis (jogador/espectador) e autoridade de configuração.
"""

import uuid

from django.db import models

from games.battleship import engine as battleship_engine
from rooms.models import Player, Room

GAME_BATTLESHIP = "battleship"
GAME_CHESS = "chess"
GAME_COUP = "coup"

GAME_CHOICES = [
    (GAME_BATTLESHIP, "Batalha Naval"),
    (GAME_CHESS, "Xadrez"),
    (GAME_COUP, "Coup"),
]

# Config default usada quando quem cria a instância não especifica nada.
DEFAULT_CONFIG_BY_GAME = {
    GAME_BATTLESHIP: {
        "board_size": battleship_engine.DEFAULT_BOARD_SIZE,
        "fleet_sizes": battleship_engine.DEFAULT_FLEET_SIZES,
    },
}

# Só jogos implementados entram aqui — chess/coup ainda não têm motor (ver mvp.md, Fases 3-4).
IMPLEMENTED_GAMES = {GAME_BATTLESHIP}

MAX_PLAYERS_BY_GAME = {
    GAME_BATTLESHIP: 2,
}


class GameInstance(models.Model):
    STATUS_CONFIGURING = "configuring"
    STATUS_IN_PROGRESS = "in_progress"
    STATUS_FINISHED = "finished"
    STATUS_CHOICES = [
        (STATUS_CONFIGURING, "Configurando"),
        (STATUS_IN_PROGRESS, "Em andamento"),
        (STATUS_FINISHED, "Finalizado"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    room = models.ForeignKey(Room, related_name="game_instances", on_delete=models.CASCADE)
    game = models.CharField(max_length=32, choices=GAME_CHOICES)
    status = models.CharField(max_length=16, choices=STATUS_CHOICES, default=STATUS_CONFIGURING)
    config = models.JSONField(default=dict, blank=True)
    state = models.JSONField(default=dict, blank=True)
    winner = models.ForeignKey(
        Player, null=True, blank=True, related_name="+", on_delete=models.SET_NULL
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def max_players(self) -> int:
        return MAX_PLAYERS_BY_GAME[self.game]

    def active_player_participants(self):
        return self.participants.filter(
            role=GameParticipant.ROLE_PLAYER, player__is_connected=True
        ).order_by("seat")

    def configuration_authority(self) -> Player | None:
        """Quem entrou primeiro na instância (ou quem sobra sozinho nela) decide a configuração
        — regra transversal de negócio (ver .cursor/rules/00-project-context.mdc). Como isso é
        calculado a cada chamada a partir de quem está conectado agora, a autoridade passa
        automaticamente para o próximo jogador quando o titular se desconecta."""
        first = self.active_player_participants().first()
        return first.player if first else None

    def __str__(self) -> str:
        return f"{self.get_game_display()} @ {self.room.code}"


class GameParticipant(models.Model):
    ROLE_PLAYER = "player"
    ROLE_SPECTATOR = "spectator"
    ROLE_CHOICES = [
        (ROLE_PLAYER, "Jogador"),
        (ROLE_SPECTATOR, "Espectador"),
    ]

    instance = models.ForeignKey(
        GameInstance, related_name="participants", on_delete=models.CASCADE
    )
    player = models.ForeignKey(Player, related_name="game_participations", on_delete=models.CASCADE)
    role = models.CharField(max_length=16, choices=ROLE_CHOICES, default=ROLE_PLAYER)
    seat = models.PositiveSmallIntegerField(null=True, blank=True)
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["instance", "player"], name="unique_player_per_instance"
            )
        ]

    def __str__(self) -> str:
        return f"{self.player.display_name} ({self.role}) @ {self.instance_id}"
