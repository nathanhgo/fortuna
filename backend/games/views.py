"""
Views de "jogos dentro da sala" — genéricas (criar/listar/entrar/configurar) na camada de
`GameInstance`/`GameParticipant`, mas com um recorte específico da Batalha Naval (frota/tiros)
até Xadrez e Coup ganharem motor próprio (ver mvp.md, Fases 3-4).
"""

import copy

from django.shortcuts import get_object_or_404
from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework import status
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from rooms.auth import PLAYER_TOKEN_HEADER, get_player_from_token
from rooms.models import Player, Room
from rooms.realtime import broadcast_room_event

from .battleship import engine as battleship_engine
from .models import (
    DEFAULT_CONFIG_BY_GAME,
    GAME_BATTLESHIP,
    GameInstance,
    GameParticipant,
)
from .serializers import (
    BattleshipConfigSerializer,
    BattleshipFleetSerializer,
    BattleshipShotSerializer,
    CreateGameInstanceSerializer,
    GameInstanceSerializer,
    JoinGameInstanceSerializer,
)

ROOM_CODE_PARAMETER = OpenApiParameter(
    name="code",
    location=OpenApiParameter.PATH,
    description="Código da sala (ver rooms/models.py::generate_room_code).",
    type=str,
)
INSTANCE_ID_PARAMETER = OpenApiParameter(
    name="instance_id",
    location=OpenApiParameter.PATH,
    description="Id da instância de jogo dentro da sala.",
    type=str,
)
PLAYER_TOKEN_PARAMETER = OpenApiParameter(
    name=PLAYER_TOKEN_HEADER,
    location=OpenApiParameter.HEADER,
    description="Token do jogador (recebido ao criar/entrar na sala).",
    type=str,
)


def _instance_detail_for_player(instance: GameInstance, viewer: Player | None) -> dict:
    data = GameInstanceSerializer(instance).data
    if instance.game == GAME_BATTLESHIP and instance.state:
        viewer_key = viewer.id if viewer else None
        data["state"] = battleship_engine.serialize_state_for_player(instance.state, viewer_key)
    else:
        data["state"] = None
    return data


def _get_room(code: str) -> Room:
    return get_object_or_404(Room, code=code.upper())


def _get_instance(room: Room, instance_id) -> GameInstance:
    return get_object_or_404(GameInstance, id=instance_id, room=room)


class GameInstanceListCreateView(APIView):
    @extend_schema(
        tags=["games"],
        summary="Lista as instâncias de jogo da sala",
        description="Nunca inclui o estado do tabuleiro — só o resumo usado no lobby.",
        parameters=[ROOM_CODE_PARAMETER],
        responses={200: GameInstanceSerializer(many=True)},
    )
    def get(self, request, code):
        room = _get_room(code)
        instances = room.game_instances.all().order_by("-created_at")
        return Response(GameInstanceSerializer(instances, many=True).data)

    @extend_schema(
        tags=["games"],
        summary="Cria uma instância de jogo na sala",
        description=(
            "Quem cria se torna o primeiro jogador (e, portanto, a autoridade de configuração — "
            "ver .cursor/rules/00-project-context.mdc)."
        ),
        parameters=[ROOM_CODE_PARAMETER, PLAYER_TOKEN_PARAMETER],
        request=CreateGameInstanceSerializer,
        responses={201: GameInstanceSerializer},
    )
    def post(self, request, code):
        room = _get_room(code)
        player = get_player_from_token(room, request.headers.get(PLAYER_TOKEN_HEADER))

        serializer = CreateGameInstanceSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        game = serializer.validated_data["game"]
        config = serializer.validated_data.get("config") or copy.deepcopy(
            DEFAULT_CONFIG_BY_GAME[game]
        )

        if game == GAME_BATTLESHIP:
            _validate_battleship_config(config)

        instance = GameInstance.objects.create(room=room, game=game, config=config)
        GameParticipant.objects.create(instance=instance, player=player, seat=0)
        broadcast_room_event(room.code, {"type": "game_created", "instance_id": str(instance.id)})

        return Response(
            _instance_detail_for_player(instance, player), status=status.HTTP_201_CREATED
        )


class GameInstanceDetailView(APIView):
    @extend_schema(
        tags=["games"],
        summary="Detalhe de uma instância de jogo (com tabuleiro filtrado por jogador)",
        description=(
            "Sem token de jogador válido, o tabuleiro vem filtrado como para um espectador "
            "(navios não afundados nunca aparecem)."
        ),
        parameters=[ROOM_CODE_PARAMETER, INSTANCE_ID_PARAMETER, PLAYER_TOKEN_PARAMETER],
        responses={200: GameInstanceSerializer},
    )
    def get(self, request, code, instance_id):
        room = _get_room(code)
        instance = _get_instance(room, instance_id)

        viewer = None
        token_header = request.headers.get(PLAYER_TOKEN_HEADER)
        if token_header:
            viewer = get_player_from_token(room, token_header)

        return Response(_instance_detail_for_player(instance, viewer))


class GameInstanceJoinView(APIView):
    @extend_schema(
        tags=["games"],
        summary="Entra em uma instância de jogo (como jogador ou espectador)",
        parameters=[ROOM_CODE_PARAMETER, INSTANCE_ID_PARAMETER, PLAYER_TOKEN_PARAMETER],
        request=JoinGameInstanceSerializer,
        responses={201: GameInstanceSerializer},
    )
    def post(self, request, code, instance_id):
        room = _get_room(code)
        instance = _get_instance(room, instance_id)
        player = get_player_from_token(room, request.headers.get(PLAYER_TOKEN_HEADER))

        serializer = JoinGameInstanceSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        role = serializer.validated_data["role"]

        if GameParticipant.objects.filter(instance=instance, player=player).exists():
            raise ValidationError("Você já está participando desta partida.")

        seat = None
        if role == GameParticipant.ROLE_PLAYER:
            if instance.status != GameInstance.STATUS_CONFIGURING:
                raise ValidationError("Esta partida já começou; entre como espectador.")
            current_players = instance.participants.filter(role=GameParticipant.ROLE_PLAYER).count()
            if current_players >= instance.max_players():
                raise ValidationError("Não há vagas de jogador nesta partida.")
            seat = current_players

        GameParticipant.objects.create(instance=instance, player=player, role=role, seat=seat)
        broadcast_room_event(room.code, {"type": "game_updated", "instance_id": str(instance.id)})

        return Response(
            _instance_detail_for_player(instance, player), status=status.HTTP_201_CREATED
        )


class GameInstanceConfigView(APIView):
    @extend_schema(
        tags=["games"],
        summary="Altera a configuração de uma instância (só a autoridade de configuração)",
        parameters=[ROOM_CODE_PARAMETER, INSTANCE_ID_PARAMETER, PLAYER_TOKEN_PARAMETER],
        request=BattleshipConfigSerializer,
        responses={200: GameInstanceSerializer},
    )
    def patch(self, request, code, instance_id):
        room = _get_room(code)
        instance = _get_instance(room, instance_id)
        player = get_player_from_token(room, request.headers.get(PLAYER_TOKEN_HEADER))

        if instance.status != GameInstance.STATUS_CONFIGURING:
            raise ValidationError(
                "Só é possível alterar a configuração antes do início da partida."
            )
        if instance.configuration_authority() != player:
            raise PermissionDenied(
                "Só quem tem autoridade de configuração pode alterar isso "
                "(o primeiro jogador da instância, ou quem sobrar sozinho nela)."
            )

        if instance.game == GAME_BATTLESHIP:
            serializer = BattleshipConfigSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            _validate_battleship_config(serializer.validated_data)
            instance.config = dict(serializer.validated_data)

        instance.save(update_fields=["config", "updated_at"])
        broadcast_room_event(room.code, {"type": "game_updated", "instance_id": str(instance.id)})
        return Response(_instance_detail_for_player(instance, player))


class BattleshipFleetView(APIView):
    @extend_schema(
        tags=["games"],
        summary="Posiciona a frota do jogador (Batalha Naval)",
        parameters=[ROOM_CODE_PARAMETER, INSTANCE_ID_PARAMETER, PLAYER_TOKEN_PARAMETER],
        request=BattleshipFleetSerializer,
        responses={201: GameInstanceSerializer},
    )
    def post(self, request, code, instance_id):
        room = _get_room(code)
        instance = get_object_or_404(GameInstance, id=instance_id, room=room, game=GAME_BATTLESHIP)
        player = get_player_from_token(room, request.headers.get(PLAYER_TOKEN_HEADER))
        _require_player_participant(instance, player)

        if instance.status != GameInstance.STATUS_CONFIGURING:
            raise ValidationError("A frota só pode ser posicionada antes do início da partida.")

        serializer = BattleshipFleetSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        if not instance.state:
            instance.state = battleship_engine.initial_state(
                instance.config["board_size"], instance.config["fleet_sizes"]
            )

        try:
            battleship_engine.set_fleet(
                instance.state, player.id, serializer.validated_data["ships"]
            )
        except battleship_engine.BattleshipError as error:
            raise ValidationError(str(error)) from error

        if instance.state["turn"] is not None:
            instance.status = GameInstance.STATUS_IN_PROGRESS

        instance.save(update_fields=["state", "status", "updated_at"])
        broadcast_room_event(room.code, {"type": "game_updated", "instance_id": str(instance.id)})
        return Response(
            _instance_detail_for_player(instance, player), status=status.HTTP_201_CREATED
        )


class BattleshipShotView(APIView):
    @extend_schema(
        tags=["games"],
        summary="Atira em uma casa do tabuleiro do adversário (Batalha Naval)",
        parameters=[ROOM_CODE_PARAMETER, INSTANCE_ID_PARAMETER, PLAYER_TOKEN_PARAMETER],
        request=BattleshipShotSerializer,
        responses={200: GameInstanceSerializer},
    )
    def post(self, request, code, instance_id):
        room = _get_room(code)
        instance = get_object_or_404(GameInstance, id=instance_id, room=room, game=GAME_BATTLESHIP)
        player = get_player_from_token(room, request.headers.get(PLAYER_TOKEN_HEADER))
        _require_player_participant(instance, player)

        if instance.status != GameInstance.STATUS_IN_PROGRESS:
            raise ValidationError("A partida ainda não começou (ou já terminou).")

        opponent_participant = (
            instance.participants.filter(role=GameParticipant.ROLE_PLAYER)
            .exclude(player=player)
            .first()
        )
        if opponent_participant is None:
            raise ValidationError("Aguardando o segundo jogador entrar na partida.")

        serializer = BattleshipShotSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            result = battleship_engine.fire(
                instance.state,
                player.id,
                opponent_participant.player_id,
                serializer.validated_data["cell"],
            )
        except battleship_engine.BattleshipError as error:
            raise ValidationError(str(error)) from error

        update_fields = ["state", "updated_at"]
        if instance.state["winner"] is not None:
            instance.status = GameInstance.STATUS_FINISHED
            winner_is_me = instance.state["winner"] == str(player.id)
            instance.winner = player if winner_is_me else opponent_participant.player
            update_fields += ["status", "winner"]

        instance.save(update_fields=update_fields)
        broadcast_room_event(room.code, {"type": "game_updated", "instance_id": str(instance.id)})

        data = _instance_detail_for_player(instance, player)
        data["result"] = result
        return Response(data)


class GameInstanceRematchView(APIView):
    @extend_schema(
        tags=["games"],
        summary="Cria uma revanche a partir de uma partida finalizada",
        description="Reaproveita sala, jogo e configuração; jogadores posicionam a frota de novo.",
        parameters=[ROOM_CODE_PARAMETER, INSTANCE_ID_PARAMETER, PLAYER_TOKEN_PARAMETER],
        responses={201: GameInstanceSerializer},
    )
    def post(self, request, code, instance_id):
        room = _get_room(code)
        instance = _get_instance(room, instance_id)
        player = get_player_from_token(room, request.headers.get(PLAYER_TOKEN_HEADER))

        if instance.status != GameInstance.STATUS_FINISHED:
            raise ValidationError("Só é possível pedir revanche depois que a partida terminar.")
        if not GameParticipant.objects.filter(
            instance=instance, player=player, role=GameParticipant.ROLE_PLAYER
        ).exists():
            raise PermissionDenied("Só quem jogou a partida pode pedir revanche.")

        rematch = GameInstance.objects.create(
            room=room, game=instance.game, config=copy.deepcopy(instance.config)
        )
        original_players = instance.participants.filter(role=GameParticipant.ROLE_PLAYER).order_by(
            "seat"
        )
        for participant in original_players:
            GameParticipant.objects.create(
                instance=rematch, player=participant.player, seat=participant.seat
            )

        broadcast_room_event(room.code, {"type": "game_created", "instance_id": str(rematch.id)})
        return Response(
            _instance_detail_for_player(rematch, player), status=status.HTTP_201_CREATED
        )


def _require_player_participant(instance: GameInstance, player: Player) -> GameParticipant:
    participant = GameParticipant.objects.filter(
        instance=instance, player=player, role=GameParticipant.ROLE_PLAYER
    ).first()
    if participant is None:
        raise PermissionDenied("Você precisa entrar nesta partida como jogador primeiro.")
    return participant


def _validate_battleship_config(config: dict) -> None:
    try:
        battleship_engine.validate_config(config["board_size"], config["fleet_sizes"])
    except battleship_engine.BattleshipError as error:
        raise ValidationError(str(error)) from error
