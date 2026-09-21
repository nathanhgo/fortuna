"""Fluxo HTTP do Coup: criar mesa, configurar, começar, agir e esconder mãos."""

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


def create_coup(client, room, alice, bob, config=None, start=True):
    auth(client, alice)
    created = client.post(f"/api/rooms/{room.code}/games/", {"game": "coup"}, format="json")
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
    if start:
        client.post(f"/api/rooms/{room.code}/games/{instance_id}/start/", {}, format="json")
    detail = client.get(f"/api/rooms/{room.code}/games/{instance_id}/")
    return instance_id, detail


@pytest.mark.django_db
class TestCoupFlow:
    def test_creating_coup_is_allowed(self, api_client, room_with_two_players):
        room, alice, _ = room_with_two_players
        auth(api_client, alice)
        response = api_client.post(
            f"/api/rooms/{room.code}/games/", {"game": "coup"}, format="json"
        )
        assert response.status_code == 201
        assert response.data["game"] == "coup"
        assert response.data["status"] == GameInstance.STATUS_CONFIGURING
        assert response.data["config"]["max_players"] == 6
        assert response.data["config"]["copies"]["duke"] == 3

    def test_second_player_does_not_auto_start_the_match(self, api_client, room_with_two_players):
        room, alice, bob = room_with_two_players
        instance_id, detail = create_coup(api_client, room, alice, bob, start=False)
        assert detail.data["status"] == GameInstance.STATUS_CONFIGURING
        assert detail.data["state"] is None

    def test_host_starts_when_two_players_are_seated(self, api_client, room_with_two_players):
        room, alice, bob = room_with_two_players
        instance_id, detail = create_coup(api_client, room, alice, bob)
        assert detail.status_code == 200
        assert detail.data["status"] == GameInstance.STATUS_IN_PROGRESS
        state = detail.data["state"]
        assert state["phase"] == "action"
        assert len(state["order"]) == 2
        assert state["players"][str(alice.id)]["hand"]
        assert None not in state["players"][str(alice.id)]["hand"]
        assert state["players"][str(bob.id)]["hand"] == [None, None]

    def test_income_gives_a_coin_and_passes_the_turn(self, api_client, room_with_two_players):
        room, alice, bob = room_with_two_players
        instance_id, detail = create_coup(api_client, room, alice, bob)
        actor = detail.data["state"]["turn"]
        actor_player = alice if actor == str(alice.id) else bob
        auth(api_client, actor_player)
        before = detail.data["state"]["players"][actor]["coins"]
        response = api_client.post(
            f"/api/rooms/{room.code}/games/{instance_id}/acts/",
            {"kind": "income"},
            format="json",
        )
        assert response.status_code == 200
        assert response.data["state"]["players"][actor]["coins"] == before + 1
        assert response.data["state"]["turn"] != actor

    def test_opponent_cannot_see_hidden_cards(self, api_client, room_with_two_players):
        room, alice, bob = room_with_two_players
        instance_id, _ = create_coup(api_client, room, alice, bob)
        auth(api_client, bob)
        response = api_client.get(f"/api/rooms/{room.code}/games/{instance_id}/")
        alice_hand = response.data["state"]["players"][str(alice.id)]["hand"]
        assert alice_hand == [None, None]
        bob_hand = response.data["state"]["players"][str(bob.id)]["hand"]
        assert all(card is not None for card in bob_hand)

    def test_config_rejects_a_deck_too_small_for_the_table(self, api_client, room_with_two_players):
        room, alice, _ = room_with_two_players
        auth(api_client, alice)
        created = api_client.post(
            f"/api/rooms/{room.code}/games/", {"game": "coup"}, format="json"
        )
        response = api_client.patch(
            f"/api/rooms/{room.code}/games/{created.data['id']}/config/",
            {
                "max_players": 6,
                "copies": {
                    "duke": 1,
                    "assassin": 1,
                    "captain": 1,
                    "ambassador": 1,
                    "contessa": 1,
                    "inquisitor": 0,
                },
                "reformation": False,
                "inquisitor": False,
                "challenge_seconds": 15,
            },
            format="json",
        )
        assert response.status_code == 400
