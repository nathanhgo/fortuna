"""
Views de "jogos dentro da sala" — genéricas (criar/listar/entrar/configurar) na camada de
`GameInstance`/`GameParticipant`, com recortes da Batalha Naval e do Xadrez (ver mvp.md).
"""

import copy
import time

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
from .chess import engine as chess_engine
from .coup import engine as coup_engine
from .models import (
    DEFAULT_CONFIG_BY_GAME,
    GAME_BATTLESHIP,
    GAME_CHESS,
    GAME_COUP,
    GameInstance,
    GameParticipant,
)
from .serializers import (
    BattleshipConfigSerializer,
    BattleshipFleetSerializer,
    BattleshipShotSerializer,
    ChessConfigSerializer,
    ChessMoveSerializer,
    CoupActSerializer,
    CoupConfigSerializer,
    CreateGameInstanceSerializer,
    GameInstanceSerializer,
    JoinGameInstanceSerializer,
    RematchSerializer,
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
    viewer_key = viewer.id if viewer else None
    if instance.game == GAME_BATTLESHIP and instance.state:
        data["state"] = battleship_engine.serialize_state_for_player(instance.state, viewer_key)
    elif instance.game == GAME_CHESS and instance.state:
        data["state"] = chess_engine.serialize_state_for_player(
            instance.state, instance.config, viewer_key
        )
    elif instance.game == GAME_COUP and instance.state:
        data["state"] = coup_engine.serialize_state_for_player(instance.state, viewer_key)
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
        elif game == GAME_CHESS:
            _validate_chess_config(config)
        elif game == GAME_COUP:
            _validate_coup_config(config)

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

    @extend_schema(
        tags=["games"],
        summary="Exclui a instância (só a autoridade de configuração, inclusive no meio do jogo)",
        parameters=[ROOM_CODE_PARAMETER, INSTANCE_ID_PARAMETER, PLAYER_TOKEN_PARAMETER],
        responses={204: None},
    )
    def delete(self, request, code, instance_id):
        room = _get_room(code)
        instance = _get_instance(room, instance_id)
        player = get_player_from_token(room, request.headers.get(PLAYER_TOKEN_HEADER))
        if instance.configuration_authority() != player:
            raise PermissionDenied("Só quem define esta mesa pode excluí-la.")
        deleted_id = str(instance.id)
        instance.delete()
        broadcast_room_event(room.code, {"type": "game_deleted", "instance_id": deleted_id})
        return Response(status=status.HTTP_204_NO_CONTENT)


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
        _maybe_start_chess(instance)
        instance.save()
        broadcast_room_event(room.code, {"type": "game_updated", "instance_id": str(instance.id)})

        return Response(
            _instance_detail_for_player(instance, player), status=status.HTTP_201_CREATED
        )


class GameInstanceConfigView(APIView):
    @extend_schema(
        tags=["games"],
        summary="Altera a configuração de uma instância (só a autoridade de configuração)",
        parameters=[ROOM_CODE_PARAMETER, INSTANCE_ID_PARAMETER, PLAYER_TOKEN_PARAMETER],
        request=None,
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
        elif instance.game == GAME_CHESS:
            serializer = ChessConfigSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            _validate_chess_config(serializer.validated_data)
            instance.config = dict(serializer.validated_data)
        elif instance.game == GAME_COUP:
            serializer = CoupConfigSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            _validate_coup_config(serializer.validated_data)
            instance.config = dict(serializer.validated_data)
        else:
            raise ValidationError("Este jogo ainda não aceita configuração.")

        _maybe_start_chess(instance)
        instance.save()
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
        description="Reaproveita sala e jogo; aceita config nova ou copia a da partida anterior.",
        parameters=[ROOM_CODE_PARAMETER, INSTANCE_ID_PARAMETER, PLAYER_TOKEN_PARAMETER],
        request=RematchSerializer,
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

        serializer = RematchSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        rematch_config = serializer.validated_data.get("config")
        if rematch_config:
            if instance.game == GAME_BATTLESHIP:
                _validate_battleship_config(rematch_config)
            elif instance.game == GAME_CHESS:
                _validate_chess_config(rematch_config)
            elif instance.game == GAME_COUP:
                _validate_coup_config(rematch_config)
        else:
            rematch_config = copy.deepcopy(instance.config)

        rematch = GameInstance.objects.create(
            room=room, game=instance.game, config=rematch_config
        )
        original_players = instance.participants.filter(role=GameParticipant.ROLE_PLAYER).order_by(
            "seat"
        )
        for participant in original_players:
            GameParticipant.objects.create(
                instance=rematch, player=participant.player, seat=participant.seat
            )
        _maybe_start_chess(rematch)
        rematch.save()

        broadcast_room_event(room.code, {"type": "game_created", "instance_id": str(rematch.id)})
        return Response(
            _instance_detail_for_player(rematch, player), status=status.HTTP_201_CREATED
        )


class ChessMoveView(APIView):
    @extend_schema(
        tags=["games"],
        summary="Joga um lance no Xadrez",
        parameters=[ROOM_CODE_PARAMETER, INSTANCE_ID_PARAMETER, PLAYER_TOKEN_PARAMETER],
        request=ChessMoveSerializer,
        responses={200: GameInstanceSerializer},
    )
    def post(self, request, code, instance_id):
        room = _get_room(code)
        instance = get_object_or_404(GameInstance, id=instance_id, room=room, game=GAME_CHESS)
        player = get_player_from_token(room, request.headers.get(PLAYER_TOKEN_HEADER))
        _require_player_participant(instance, player)

        if instance.status != GameInstance.STATUS_IN_PROGRESS:
            raise ValidationError("A partida ainda não começou (ou já terminou).")

        serializer = ChessMoveSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        instance.state.setdefault("mode", instance.config.get("mode", "assisted"))
        try:
            chess_engine.apply_move(
                instance.state,
                player.id,
                serializer.validated_data["origin"],
                serializer.validated_data["to"],
                serializer.validated_data.get("promotion"),
                now_ms=_now_ms(),
            )
        except chess_engine.ChessError as error:
            raise ValidationError(str(error)) from error

        _finish_chess_if_over(instance)
        instance.save()
        broadcast_room_event(room.code, {"type": "game_updated", "instance_id": str(instance.id)})
        return Response(_instance_detail_for_player(instance, player))


class ChessFlagView(APIView):
    @extend_schema(
        tags=["games"],
        summary="Reivindica vitória por tempo no Xadrez",
        parameters=[ROOM_CODE_PARAMETER, INSTANCE_ID_PARAMETER, PLAYER_TOKEN_PARAMETER],
        responses={200: GameInstanceSerializer},
    )
    def post(self, request, code, instance_id):
        room = _get_room(code)
        instance = get_object_or_404(GameInstance, id=instance_id, room=room, game=GAME_CHESS)
        player = get_player_from_token(room, request.headers.get(PLAYER_TOKEN_HEADER))
        _require_player_participant(instance, player)
        result = chess_engine.claim_flag(instance.state, instance.config, _now_ms())
        if result != "flag":
            raise ValidationError("O relógio do adversário ainda não zerou.")
        _finish_chess_if_over(instance)
        instance.save()
        broadcast_room_event(room.code, {"type": "game_updated", "instance_id": str(instance.id)})
        return Response(_instance_detail_for_player(instance, player))


class GameInstanceStartView(APIView):
    @extend_schema(
        tags=["games"],
        summary="Começa uma partida de Coup (anfitrião, com pelo menos dois jogadores)",
        parameters=[ROOM_CODE_PARAMETER, INSTANCE_ID_PARAMETER, PLAYER_TOKEN_PARAMETER],
        responses={200: GameInstanceSerializer},
    )
    def post(self, request, code, instance_id):
        room = _get_room(code)
        instance = get_object_or_404(GameInstance, id=instance_id, room=room, game=GAME_COUP)
        player = get_player_from_token(room, request.headers.get(PLAYER_TOKEN_HEADER))

        if instance.status != GameInstance.STATUS_CONFIGURING:
            raise ValidationError("Esta partida já começou (ou já terminou).")
        if instance.configuration_authority() != player:
            raise PermissionDenied("Só o anfitrião pode começar a partida.")

        players = list(
            instance.participants.filter(role=GameParticipant.ROLE_PLAYER).order_by("seat")
        )
        if len(players) < 2:
            raise ValidationError("É preciso pelo menos dois jogadores para começar.")

        try:
            instance.state = coup_engine.start_game(
                [participant.player_id for participant in players],
                instance.config,
            )
        except coup_engine.CoupError as error:
            raise ValidationError(str(error)) from error

        instance.status = GameInstance.STATUS_IN_PROGRESS
        instance.save()
        broadcast_room_event(room.code, {"type": "game_updated", "instance_id": str(instance.id)})
        return Response(_instance_detail_for_player(instance, player))


class CoupActView(APIView):
    @extend_schema(
        tags=["games"],
        summary="Declara uma ação, contestação, bloqueio ou resposta no Coup",
        parameters=[ROOM_CODE_PARAMETER, INSTANCE_ID_PARAMETER, PLAYER_TOKEN_PARAMETER],
        request=CoupActSerializer,
        responses={200: GameInstanceSerializer},
    )
    def post(self, request, code, instance_id):
        room = _get_room(code)
        instance = get_object_or_404(GameInstance, id=instance_id, room=room, game=GAME_COUP)
        player = get_player_from_token(room, request.headers.get(PLAYER_TOKEN_HEADER))
        _require_player_participant(instance, player)

        if instance.status != GameInstance.STATUS_IN_PROGRESS:
            raise ValidationError("A partida ainda não começou (ou já terminou).")

        serializer = CoupActSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            coup_engine.apply_act(
                instance.state,
                player.id,
                serializer.validated_data,
                now_ms=_now_ms(),
            )
        except coup_engine.CoupError as error:
            raise ValidationError(str(error)) from error

        _finish_coup_if_over(instance)
        instance.save()
        broadcast_room_event(room.code, {"type": "game_updated", "instance_id": str(instance.id)})
        return Response(_instance_detail_for_player(instance, player))


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


def _validate_chess_config(config: dict) -> None:
    try:
        chess_engine.validate_config(config)
    except chess_engine.ChessError as error:
        raise ValidationError(str(error)) from error


def _validate_coup_config(config: dict) -> None:
    try:
        coup_engine.validate_config(config)
    except coup_engine.CoupError as error:
        raise ValidationError(str(error)) from error


def _now_ms() -> int:
    return int(time.time() * 1000)


def _maybe_start_chess(instance: GameInstance) -> None:
    if instance.game != GAME_CHESS or instance.status != GameInstance.STATUS_CONFIGURING:
        return
    players = list(
        instance.participants.filter(role=GameParticipant.ROLE_PLAYER).order_by("seat")
    )
    if len(players) < 2:
        return
    host_id = players[0].player_id
    guest_id = players[1].player_id
    white_id, black_id = chess_engine.assign_colors(
        host_id, guest_id, instance.config.get("host_color", "random")
    )
    instance.state = chess_engine.initial_state(
        white_id, black_id, instance.config, now_ms=_now_ms()
    )
    instance.status = GameInstance.STATUS_IN_PROGRESS


def _finish_chess_if_over(instance: GameInstance) -> None:
    status_name = instance.state.get("status")
    if status_name in {"playing", None}:
        return
    instance.status = GameInstance.STATUS_FINISHED
    winner_key = instance.state.get("winner")
    if winner_key:
        winner = instance.participants.filter(player_id=winner_key).first()
        instance.winner = winner.player if winner else None


def _finish_coup_if_over(instance: GameInstance) -> None:
    if not instance.state or instance.state.get("status") == "playing":
        return
    instance.status = GameInstance.STATUS_FINISHED
    winner_key = instance.state.get("winner")
    if winner_key:
        winner = instance.participants.filter(player_id=winner_key).first()
        instance.winner = winner.player if winner else None
