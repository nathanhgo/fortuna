from django.shortcuts import get_object_or_404
from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework import status
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework.views import APIView

from games.models import GameInstance

from .auth import PLAYER_TOKEN_HEADER, get_player_from_token
from .models import ChatMessage, Player, Room
from .realtime import broadcast_room_event
from .serializers import (
    ChatMessageSerializer,
    CreatedRoomSerializer,
    CreateRoomSerializer,
    JoinRoomSerializer,
    PlayerSerializer,
    PlayerWithTokenSerializer,
    PostChatMessageSerializer,
    RoomSerializer,
    UpdateAvatarSerializer,
)

ROOM_CODE_PARAMETER = OpenApiParameter(
    name="code",
    location=OpenApiParameter.PATH,
    description="Código da sala (ver rooms/models.py::generate_room_code).",
    type=str,
)


class RoomListCreateView(APIView):
    """
    POST cria uma sala nova e já registra quem criou como o primeiro jogador dela — não existe
    fluxo de "criar sala vazia" (ver architecture_docs/idea.md).
    """

    @extend_schema(
        tags=["rooms"],
        summary="Cria uma sala",
        description="Cria a sala e já registra quem chamou como o primeiro jogador dela.",
        request=CreateRoomSerializer,
        responses={201: CreatedRoomSerializer},
    )
    def post(self, request):
        serializer = CreateRoomSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        room = Room.objects.create()
        player = Player.objects.create(
            room=room, display_name=serializer.validated_data["display_name"]
        )

        return Response(
            {
                "room": RoomSerializer(room).data,
                "player": PlayerWithTokenSerializer(player).data,
            },
            status=status.HTTP_201_CREATED,
        )


class RoomDetailView(APIView):
    @extend_schema(
        tags=["rooms"],
        summary="Detalhe da sala (lobby)",
        description="Dados da sala e a lista de jogadores nela — nunca expõe tokens.",
        parameters=[ROOM_CODE_PARAMETER],
        responses={200: RoomSerializer},
    )
    def get(self, request, code):
        room = get_object_or_404(Room, code=code.upper())
        return Response(RoomSerializer(room).data)


class RoomPlayerListCreateView(APIView):
    """POST entra numa sala já existente, escolhendo um nome de usuário livre nela."""

    @extend_schema(
        tags=["rooms"],
        summary="Entra em uma sala existente",
        description="Nome de usuário precisa ser livre na sala (único, case-insensitive).",
        parameters=[ROOM_CODE_PARAMETER],
        request=JoinRoomSerializer,
        responses={201: PlayerWithTokenSerializer},
    )
    def post(self, request, code):
        room = get_object_or_404(Room, code=code.upper())

        serializer = JoinRoomSerializer(data=request.data, context={"room": room})
        serializer.is_valid(raise_exception=True)

        player = Player.objects.create(
            room=room, display_name=serializer.validated_data["display_name"]
        )
        broadcast_room_event(room.code, {"type": "room_updated"})

        return Response(
            PlayerWithTokenSerializer(player).data,
            status=status.HTTP_201_CREATED,
        )


class RoomPlayerMeView(APIView):
    @extend_schema(
        tags=["rooms"],
        summary="Atualiza o ícone de perfil do jogador nesta sala",
        parameters=[ROOM_CODE_PARAMETER],
        request=UpdateAvatarSerializer,
        responses={200: PlayerSerializer},
    )
    def patch(self, request, code):
        room = get_object_or_404(Room, code=code.upper())
        player = get_player_from_token(room, request.headers.get(PLAYER_TOKEN_HEADER))

        serializer = UpdateAvatarSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        player.avatar = serializer.validated_data["avatar"]
        player.save(update_fields=["avatar"])
        broadcast_room_event(room.code, {"type": "room_updated"})
        return Response(PlayerSerializer(player).data)


def _chat_instance_for_player(room: Room, instance_id, player: Player) -> GameInstance:
    instance = get_object_or_404(GameInstance, id=instance_id, room=room)
    sitting = instance.participants.filter(player=player).exists()
    if not sitting:
        raise PermissionDenied("Entre nesta mesa para usar o chat dela.")
    return instance


class RoomChatView(APIView):
    """Chat de texto da sala de espera e, opcionalmente, de uma instância de jogo."""

    @extend_schema(
        tags=["rooms"],
        summary="Lista mensagens do chat",
        parameters=[
            ROOM_CODE_PARAMETER,
            OpenApiParameter(
                name="instance_id",
                location=OpenApiParameter.QUERY,
                required=False,
                type=str,
                description="UUID da instância; omita para o chat da sala de espera.",
            ),
        ],
        responses={200: ChatMessageSerializer(many=True)},
    )
    def get(self, request, code):
        room = get_object_or_404(Room, code=code.upper())
        player = get_player_from_token(room, request.headers.get(PLAYER_TOKEN_HEADER))
        instance_id = request.query_params.get("instance_id")
        messages = ChatMessage.objects.filter(room=room).select_related("player")
        if instance_id:
            instance = _chat_instance_for_player(room, instance_id, player)
            messages = messages.filter(instance_id=instance.id)
        else:
            messages = messages.filter(instance_id__isnull=True)
        return Response(ChatMessageSerializer(messages, many=True).data)

    @extend_schema(
        tags=["rooms"],
        summary="Envia uma mensagem no chat",
        parameters=[ROOM_CODE_PARAMETER],
        request=PostChatMessageSerializer,
        responses={201: ChatMessageSerializer},
    )
    def post(self, request, code):
        room = get_object_or_404(Room, code=code.upper())
        player = get_player_from_token(room, request.headers.get(PLAYER_TOKEN_HEADER))
        serializer = PostChatMessageSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        instance_id = serializer.validated_data.get("instance_id")
        if instance_id:
            _chat_instance_for_player(room, instance_id, player)

        message = ChatMessage.objects.create(
            room=room,
            player=player,
            text=serializer.validated_data["text"],
            instance_id=instance_id,
        )
        broadcast_room_event(
            room.code,
            {
                "type": "chat_message",
                "instance_id": str(instance_id) if instance_id else None,
            },
        )
        return Response(ChatMessageSerializer(message).data, status=status.HTTP_201_CREATED)
