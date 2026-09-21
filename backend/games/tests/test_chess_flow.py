"""
Fluxo HTTP do Xadrez: criar mesa, configurar, segundo jogador entrar, lances e mate.
"""

import pytest
from rest_framework.test import APIClient

from games.models import GameInstance, GameParticipant
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


def create_chess(client, room, alice, bob, config=None):
    auth(client, alice)
    created = client.post(f"/api/rooms/{room.code}/games/", {"game": "chess"}, format="json")
    instance_id = created.data["id"]
    if config:
        client.patch(
            f"/api/rooms/{room.code}/games/{instance_id}/config/",
            config,
            format="json",
        )
    auth(client, bob)
    client.post(
        f"/api/rooms/{room.code}/games/{instance_id}/join/",
        {"role": "player"},
        format="json",
    )
    auth(client, alice)
    detail = client.get(f"/api/rooms/{room.code}/games/{instance_id}/")
    return instance_id, detail


@pytest.mark.django_db
class TestChessFlow:
    def test_creating_chess_is_allowed(self, api_client, room_with_two_players):
        room, alice, _ = room_with_two_players
        auth(api_client, alice)
        response = api_client.post(
            f"/api/rooms/{room.code}/games/", {"game": "chess"}, format="json"
        )
        assert response.status_code == 201
        assert response.data["game"] == "chess"
        assert response.data["status"] == GameInstance.STATUS_CONFIGURING

    def test_the_game_starts_when_the_second_player_joins(
        self, api_client, room_with_two_players
    ):
        room, alice, bob = room_with_two_players
        instance_id, detail = create_chess(
            api_client,
            room,
            alice,
            bob,
            {"mode": "assisted", "host_color": "white"},
        )
        assert detail.status_code == 200
        assert detail.data["status"] == GameInstance.STATUS_IN_PROGRESS
        assert detail.data["state"]["white_id"] == str(alice.id)
        assert detail.data["state"]["black_id"] == str(bob.id)
        assert detail.data["state"]["turn"] == "white"

    def test_white_can_open_with_e4(self, api_client, room_with_two_players):
        room, alice, bob = room_with_two_players
        instance_id, _ = create_chess(
            api_client,
            room,
            alice,
            bob,
            {"mode": "assisted", "host_color": "white"},
        )
        response = api_client.post(
            f"/api/rooms/{room.code}/games/{instance_id}/moves/",
            {"from": "e2", "to": "e4"},
            format="json",
        )
        assert response.status_code == 200
        assert response.data["state"]["turn"] == "black"
        assert response.data["state"]["last_move"] == {"from": "e2", "to": "e4"}

    def test_moving_out_of_turn_is_rejected(self, api_client, room_with_two_players):
        room, alice, bob = room_with_two_players
        instance_id, _ = create_chess(
            api_client,
            room,
            alice,
            bob,
            {"mode": "assisted", "host_color": "white"},
        )
        auth(api_client, bob)
        response = api_client.post(
            f"/api/rooms/{room.code}/games/{instance_id}/moves/",
            {"from": "e7", "to": "e5"},
            format="json",
        )
        assert response.status_code == 400

    def test_realistic_mode_hides_check_hints(self, api_client, room_with_two_players):
        room, alice, bob = room_with_two_players
        instance_id, _ = create_chess(
            api_client,
            room,
            alice,
            bob,
            {"mode": "realistic", "host_color": "white"},
        )
        api_client.post(
            f"/api/rooms/{room.code}/games/{instance_id}/moves/",
            {"from": "e2", "to": "e4"},
            format="json",
        )
        auth(api_client, bob)
        api_client.post(
            f"/api/rooms/{room.code}/games/{instance_id}/moves/",
            {"from": "f7", "to": "f6"},
            format="json",
        )
        auth(api_client, alice)
        response = api_client.post(
            f"/api/rooms/{room.code}/games/{instance_id}/moves/",
            {"from": "d1", "to": "h5"},
            format="json",
        )
        assert response.data["state"]["in_check"] is False
        assert response.data["state"]["legal_moves"] == []
        assert response.data["state"]["pgn"] == ""

    def test_checkmate_finishes_the_instance(self, api_client, room_with_two_players):
        room, alice, bob = room_with_two_players
        instance_id, _ = create_chess(
            api_client,
            room,
            alice,
            bob,
            {"mode": "assisted", "host_color": "white"},
        )
        moves = [("f2", "f3"), ("e7", "e5"), ("g2", "g4"), ("d8", "h4")]
        players = [alice, bob, alice, bob]
        for player, (origin, dest) in zip(players, moves, strict=True):
            auth(api_client, player)
            response = api_client.post(
                f"/api/rooms/{room.code}/games/{instance_id}/moves/",
                {"from": origin, "to": dest},
                format="json",
            )
            assert response.status_code == 200
        assert response.data["state"]["status"] == "checkmate"
        assert response.data["state"]["winner"] == str(bob.id)
        instance = GameInstance.objects.get(id=instance_id)
        assert instance.status == GameInstance.STATUS_FINISHED
        assert instance.winner == bob
        assert GameParticipant.objects.filter(instance_id=instance_id).count() == 2
