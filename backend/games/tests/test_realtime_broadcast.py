"""
Garante que as views de jogo avisam a sala via WebSocket a cada mudança relevante (criação,
entrada de participante, configuração, frota e tiros) — ver rooms/realtime.py.
"""

from unittest.mock import patch

import pytest
from rest_framework.test import APIClient

from rooms.models import Player, Room


def auth(client, player):
    client.credentials(HTTP_X_PLAYER_TOKEN=str(player.token))


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def room_with_two_players():
    room = Room.objects.create()
    alice = Player.objects.create(room=room, display_name="Alice")
    bob = Player.objects.create(room=room, display_name="Bob")
    return room, alice, bob


@pytest.mark.django_db
class TestGameRealtimeBroadcast:
    def test_creating_an_instance_broadcasts_a_game_created_event(
        self, api_client, room_with_two_players
    ):
        room, alice, _ = room_with_two_players
        auth(api_client, alice)

        with patch("games.views.broadcast_room_event") as broadcast:
            response = api_client.post(
                f"/api/rooms/{room.code}/games/", {"game": "battleship"}, format="json"
            )

        instance_id = response.data["id"]
        broadcast.assert_called_once_with(
            room.code, {"type": "game_created", "instance_id": instance_id}
        )

    def test_joining_an_instance_broadcasts_a_game_updated_event(
        self, api_client, room_with_two_players
    ):
        room, alice, bob = room_with_two_players
        auth(api_client, alice)
        created = api_client.post(
            f"/api/rooms/{room.code}/games/", {"game": "battleship"}, format="json"
        )
        instance_id = created.data["id"]

        auth(api_client, bob)
        with patch("games.views.broadcast_room_event") as broadcast:
            api_client.post(f"/api/rooms/{room.code}/games/{instance_id}/join/", {}, format="json")

        broadcast.assert_called_once_with(
            room.code, {"type": "game_updated", "instance_id": instance_id}
        )
