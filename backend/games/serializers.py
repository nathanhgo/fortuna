from rest_framework import serializers

from .models import IMPLEMENTED_GAMES, GameInstance, GameParticipant


class GameParticipantSerializer(serializers.ModelSerializer):
    display_name = serializers.CharField(source="player.display_name", read_only=True)

    class Meta:
        model = GameParticipant
        fields = ["display_name", "role", "seat"]


class GameInstanceSerializer(serializers.ModelSerializer):
    """
    Serializer "de lobby": lista/descreve uma instância sem nunca expor o estado do tabuleiro —
    quem precisar do tabuleiro filtrado por jogador usa
    `games.battleship.engine.serialize_state_for_player` (ver games/views.py).
    """

    participants = GameParticipantSerializer(many=True, read_only=True)
    winner_name = serializers.CharField(source="winner.display_name", read_only=True, default=None)

    class Meta:
        model = GameInstance
        fields = [
            "id",
            "game",
            "status",
            "config",
            "participants",
            "winner_name",
            "created_at",
        ]


class CreateGameInstanceSerializer(serializers.Serializer):
    game = serializers.ChoiceField(choices=sorted(IMPLEMENTED_GAMES))
    config = serializers.JSONField(required=False)


class JoinGameInstanceSerializer(serializers.Serializer):
    role = serializers.ChoiceField(
        choices=[GameParticipant.ROLE_PLAYER, GameParticipant.ROLE_SPECTATOR],
        default=GameParticipant.ROLE_PLAYER,
    )


class BattleshipConfigSerializer(serializers.Serializer):
    board_size = serializers.IntegerField()
    fleet_sizes = serializers.ListField(child=serializers.IntegerField(), allow_empty=False)


class BattleshipFleetSerializer(serializers.Serializer):
    ships = serializers.ListField(
        child=serializers.ListField(
            child=serializers.ListField(
                child=serializers.IntegerField(), min_length=2, max_length=2
            ),
            allow_empty=False,
        ),
        allow_empty=False,
    )


class BattleshipShotSerializer(serializers.Serializer):
    cell = serializers.ListField(child=serializers.IntegerField(), min_length=2, max_length=2)
