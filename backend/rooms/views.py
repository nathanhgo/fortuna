from django.shortcuts import get_object_or_404
from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Player, Room
from .realtime import broadcast_room_event
from .serializers import (
    CreatedRoomSerializer,
    CreateRoomSerializer,
    JoinRoomSerializer,
    PlayerWithTokenSerializer,
    RoomSerializer,
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
