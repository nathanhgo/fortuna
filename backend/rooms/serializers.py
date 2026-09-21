from rest_framework import serializers

from .models import Player, Room


class PlayerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Player
        fields = ["id", "display_name"]


class PlayerWithTokenSerializer(serializers.ModelSerializer):
    """
    Só é usado na resposta de criação/entrada do próprio jogador — o token é a credencial que
    o cliente guarda (ex.: localStorage) para se identificar naquela sala. Nunca é exposto na
    listagem de jogadores da sala (ver PlayerSerializer).
    """

    class Meta:
        model = Player
        fields = ["id", "display_name", "token"]


class RoomSerializer(serializers.ModelSerializer):
    players = PlayerSerializer(many=True, read_only=True)

    class Meta:
        model = Room
        fields = ["code", "created_at", "players"]


class CreateRoomSerializer(serializers.Serializer):
    display_name = serializers.CharField(max_length=32, allow_blank=False, trim_whitespace=True)

    def validate_display_name(self, value):
        if not value.strip():
            raise serializers.ValidationError("Informe um nome de usuário.")
        return value.strip()


class CreatedRoomSerializer(serializers.Serializer):
    """Só para documentação do schema (Swagger) — descreve o formato da resposta de criação de
    sala, que a view monta manualmente combinando RoomSerializer e PlayerWithTokenSerializer."""

    room = RoomSerializer()
    player = PlayerWithTokenSerializer()


class JoinRoomSerializer(serializers.Serializer):
    display_name = serializers.CharField(max_length=32, allow_blank=False, trim_whitespace=True)

    def validate_display_name(self, value):
        cleaned = value.strip()
        if not cleaned:
            raise serializers.ValidationError("Informe um nome de usuário.")

        room = self.context["room"]
        already_taken = room.players.filter(display_name__iexact=cleaned).exists()
        if already_taken:
            raise serializers.ValidationError("Esse nome já está em uso nesta sala.")
        return cleaned
