import pytest
from rest_framework.test import APIClient

from rooms.models import Player, Room


@pytest.fixture
def api_client():
    return APIClient()


@pytest.mark.django_db
class TestCreateRoom:
    def test_creating_a_room_persists_it_and_returns_a_code(self, api_client):
        response = api_client.post("/api/rooms/", {"display_name": "Alice"}, format="json")

        assert response.status_code == 201
        assert Room.objects.count() == 1
        room = Room.objects.get()
        assert response.data["room"]["code"] == room.code

    def test_room_code_is_short_and_url_safe(self, api_client):
        response = api_client.post("/api/rooms/", {"display_name": "Alice"}, format="json")

        code = response.data["room"]["code"]
        assert 4 <= len(code) <= 10
        assert code.isalnum()

    def test_creating_a_room_also_creates_the_first_player(self, api_client):
        response = api_client.post("/api/rooms/", {"display_name": "Alice"}, format="json")

        assert Player.objects.count() == 1
        player = Player.objects.get()
        assert player.display_name == "Alice"
        assert response.data["player"]["display_name"] == "Alice"
        assert response.data["player"]["token"] == str(player.token)

    def test_creating_a_room_without_a_display_name_is_rejected(self, api_client):
        response = api_client.post("/api/rooms/", {}, format="json")

        assert response.status_code == 400
        assert Room.objects.count() == 0

    def test_creating_a_room_with_a_blank_display_name_is_rejected(self, api_client):
        response = api_client.post("/api/rooms/", {"display_name": "   "}, format="json")

        assert response.status_code == 400

    def test_two_rooms_get_different_codes(self, api_client):
        first = api_client.post("/api/rooms/", {"display_name": "Alice"}, format="json")
        second = api_client.post("/api/rooms/", {"display_name": "Bob"}, format="json")

        assert first.data["room"]["code"] != second.data["room"]["code"]
