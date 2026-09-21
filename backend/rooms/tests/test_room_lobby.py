import pytest
from rest_framework.test import APIClient

from rooms.models import Player, Room


@pytest.fixture
def api_client():
    return APIClient()


@pytest.mark.django_db
class TestRoomLobby:
    def test_retrieving_a_room_lists_its_players(self, api_client):
        room = Room.objects.create()
        Player.objects.create(room=room, display_name="Alice")
        Player.objects.create(room=room, display_name="Bob")

        response = api_client.get(f"/api/rooms/{room.code}/")

        assert response.status_code == 200
        names = {player["display_name"] for player in response.data["players"]}
        assert names == {"Alice", "Bob"}

    def test_player_tokens_are_never_exposed_in_the_lobby(self, api_client):
        room = Room.objects.create()
        Player.objects.create(room=room, display_name="Alice")

        response = api_client.get(f"/api/rooms/{room.code}/")

        assert "token" not in response.data["players"][0]

    def test_retrieving_a_room_that_does_not_exist_returns_404(self, api_client):
        response = api_client.get("/api/rooms/ZZZZZZ/")

        assert response.status_code == 404
