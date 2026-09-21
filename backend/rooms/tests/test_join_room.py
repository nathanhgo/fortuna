import pytest
from rest_framework.test import APIClient

from rooms.models import Player, Room


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def room():
    return Room.objects.create()


@pytest.mark.django_db
class TestJoinRoom:
    def test_joining_an_existing_room_adds_a_new_player(self, api_client, room):
        response = api_client.post(
            f"/api/rooms/{room.code}/players/", {"display_name": "Bob"}, format="json"
        )

        assert response.status_code == 201
        assert Player.objects.filter(room=room, display_name="Bob").exists()
        assert response.data["token"] is not None

    def test_joining_with_a_display_name_already_used_in_the_room_is_rejected(
        self, api_client, room
    ):
        Player.objects.create(room=room, display_name="Bob")

        response = api_client.post(
            f"/api/rooms/{room.code}/players/", {"display_name": "Bob"}, format="json"
        )

        assert response.status_code == 400

    def test_display_name_uniqueness_within_a_room_is_case_insensitive(self, api_client, room):
        Player.objects.create(room=room, display_name="Bob")

        response = api_client.post(
            f"/api/rooms/{room.code}/players/", {"display_name": "bob"}, format="json"
        )

        assert response.status_code == 400

    def test_the_same_display_name_can_be_used_in_a_different_room(self, api_client, room):
        Player.objects.create(room=room, display_name="Bob")
        other_room = Room.objects.create()

        response = api_client.post(
            f"/api/rooms/{other_room.code}/players/", {"display_name": "Bob"}, format="json"
        )

        assert response.status_code == 201

    def test_joining_a_room_that_does_not_exist_returns_404(self, api_client):
        response = api_client.post(
            "/api/rooms/AAAAAA/players/", {"display_name": "Bob"}, format="json"
        )

        assert response.status_code == 404

    def test_room_code_lookup_is_case_insensitive(self, api_client, room):
        response = api_client.post(
            f"/api/rooms/{room.code.lower()}/players/", {"display_name": "Bob"}, format="json"
        )

        assert response.status_code == 201
