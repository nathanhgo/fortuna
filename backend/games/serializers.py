from rest_framework import serializers

from .models import IMPLEMENTED_GAMES, GameInstance, GameParticipant


class GameParticipantSerializer(serializers.ModelSerializer):
    display_name = serializers.CharField(source="player.display_name", read_only=True)
    player_id = serializers.IntegerField(source="player.id", read_only=True)

    class Meta:
        model = GameParticipant
        fields = ["player_id", "display_name", "role", "seat"]


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


class ChessConfigSerializer(serializers.Serializer):
    mode = serializers.ChoiceField(choices=["realistic", "assisted"])
    host_color = serializers.ChoiceField(choices=["random", "white", "black"])
    initial_seconds = serializers.IntegerField(required=False, allow_null=True, min_value=1)
    increment_seconds = serializers.IntegerField(required=False, min_value=0, default=0)


class ChessMoveSerializer(serializers.Serializer):
    origin = serializers.CharField(max_length=2)
    to = serializers.CharField(max_length=2)
    promotion = serializers.ChoiceField(choices=["q", "r", "b", "n"], required=False)

    def to_internal_value(self, data):
        incoming = dict(data)
        if "origin" not in incoming and "from" in incoming:
            incoming["origin"] = incoming["from"]
        return super().to_internal_value(incoming)


class RematchSerializer(serializers.Serializer):
    config = serializers.JSONField(required=False)


class CoupConfigSerializer(serializers.Serializer):
    max_players = serializers.IntegerField(min_value=2, max_value=10)
    copies = serializers.DictField(child=serializers.IntegerField(min_value=0, max_value=5))
    reformation = serializers.BooleanField(default=False)
    inquisitor = serializers.BooleanField(default=False)
    challenge_seconds = serializers.IntegerField(min_value=5, max_value=60, default=15)


class CoupActSerializer(serializers.Serializer):
    kind = serializers.CharField()
    target = serializers.CharField(required=False, allow_null=True)
    card = serializers.CharField(required=False, allow_null=True)
    cards = serializers.ListField(child=serializers.CharField(), required=False)
    slot = serializers.IntegerField(required=False, min_value=0)

    def to_internal_value(self, data):
        incoming = dict(data)
        if incoming.get("target") is not None:
            incoming["target"] = str(incoming["target"])
        return super().to_internal_value(incoming)
