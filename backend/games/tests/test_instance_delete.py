"""O responsável pela mesa pode excluí-la no meio da partida."""

from unittest.mock import patch

import pytest
from rest_framework.test import APIClient

from games.models import GameInstance
from rooms.models import Player, Room


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def room_with_two_players():
    room = Room.objects.create()
    alice = Player.objects.create(room=room, display_name="Alice")
    bob = Player.objects.create(room=room, display_name="Bob")
    return room, alice, bob


def auth(client, player):
    client.credentials(HTTP_X_PLAYER_TOKEN=str(player.token))


def create_started_coup(client, room, alice, bob):
    auth(client, alice)
    created = client.post(f"/api/rooms/{room.code}/games/", {"game": "coup"}, format="json")
    instance_id = created.data["id"]
    auth(client, bob)
    client.post(
        f"/api/rooms/{room.code}/games/{instance_id}/join/",
        {"role": "player"},
        format="json",
    )
    auth(client, alice)
    client.post(f"/api/rooms/{room.code}/games/{instance_id}/start/", {}, format="json")
    return instance_id


@pytest.mark.django_db
class TestDeleteInstance:
    def test_authority_can_delete_mid_game(self, api_client, room_with_two_players):
        room, alice, bob = room_with_two_players
        instance_id = create_started_coup(api_client, room, alice, bob)
        auth(api_client, alice)

        with patch("games.views.broadcast_room_event") as broadcast:
            response = api_client.delete(f"/api/rooms/{room.code}/games/{instance_id}/")

        assert response.status_code == 204
        assert not GameInstance.objects.filter(id=instance_id).exists()
        broadcast.assert_called_once_with(
            room.code, {"type": "game_deleted", "instance_id": instance_id}
        )

    def test_other_player_cannot_delete(self, api_client, room_with_two_players):
        room, alice, bob = room_with_two_players
        instance_id = create_started_coup(api_client, room, alice, bob)
        auth(api_client, bob)

        response = api_client.delete(f"/api/rooms/{room.code}/games/{instance_id}/")

        assert response.status_code == 403
        assert GameInstance.objects.filter(id=instance_id).exists()

    def test_without_token_is_rejected(self, api_client, room_with_two_players):
        room, alice, bob = room_with_two_players
        instance_id = create_started_coup(api_client, room, alice, bob)
        api_client.credentials()

        response = api_client.delete(f"/api/rooms/{room.code}/games/{instance_id}/")

        assert response.status_code in (401, 403)
        assert GameInstance.objects.filter(id=instance_id).exists()
