"""
Teste de integração ponta a ponta da Fase 2 (Batalha Naval) pela API REST: criar instância,
segundo jogador entrar, autoridade de configuração, posicionamento de frota, tiros (com
ocultação do tabuleiro do adversário) e vitória + revanche.
"""

import pytest
from rest_framework.test import APIClient

from games.models import GameInstance, GameParticipant
from rooms.models import Player, Room


def horizontal_ship(row, start_col, length):
    return [[row, start_col + offset] for offset in range(length)]


def vertical_ship(start_row, col, length):
    return [[start_row + offset, col] for offset in range(length)]


FLEET_A = [
    horizontal_ship(0, 0, 5),
    horizontal_ship(1, 0, 4),
    horizontal_ship(2, 0, 3),
    horizontal_ship(3, 0, 3),
    horizontal_ship(4, 0, 2),
]
FLEET_B = [
    vertical_ship(0, 9, 5),
    vertical_ship(0, 8, 4),
    vertical_ship(0, 7, 3),
    vertical_ship(0, 6, 3),
    vertical_ship(0, 5, 2),
]


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


@pytest.mark.django_db
class TestCreateAndListInstances:
    def test_creating_an_instance_makes_the_creator_the_first_participant(
        self, api_client, room_with_two_players
    ):
        room, alice, _ = room_with_two_players
        auth(api_client, alice)

        response = api_client.post(
            f"/api/rooms/{room.code}/games/", {"game": "battleship"}, format="json"
        )

        assert response.status_code == 201
        instance = GameInstance.objects.get(id=response.data["id"])
        assert instance.status == GameInstance.STATUS_CONFIGURING
        assert instance.configuration_authority() == alice

    def test_creating_an_instance_without_a_player_token_is_rejected(
        self, api_client, room_with_two_players
    ):
        room, _, _ = room_with_two_players
        response = api_client.post(
            f"/api/rooms/{room.code}/games/", {"game": "battleship"}, format="json"
        )
        # Sem DEFAULT_AUTHENTICATION_CLASSES configurado, o DRF rebaixa AuthenticationFailed
        # de 401 para 403 (não há header WWW-Authenticate para oferecer).
        assert response.status_code == 403

    def test_listing_instances_never_exposes_ship_positions(
        self, api_client, room_with_two_players
    ):
        room, alice, _ = room_with_two_players
        auth(api_client, alice)
        api_client.post(f"/api/rooms/{room.code}/games/", {"game": "battleship"}, format="json")

        response = api_client.get(f"/api/rooms/{room.code}/games/")

        assert response.status_code == 200
        assert "state" not in response.data[0]


@pytest.mark.django_db
class TestConfigurationAuthority:
    def test_the_creator_can_change_the_config(self, api_client, room_with_two_players):
        room, alice, _ = room_with_two_players
        auth(api_client, alice)
        created = api_client.post(
            f"/api/rooms/{room.code}/games/", {"game": "battleship"}, format="json"
        )
        instance_id = created.data["id"]

        response = api_client.patch(
            f"/api/rooms/{room.code}/games/{instance_id}/config/",
            {"board_size": 8, "fleet_sizes": [3, 2]},
            format="json",
        )

        assert response.status_code == 200
        assert response.data["config"] == {"board_size": 8, "fleet_sizes": [3, 2]}

    def test_a_non_authority_player_cannot_change_the_config(
        self, api_client, room_with_two_players
    ):
        room, alice, bob = room_with_two_players
        auth(api_client, alice)
        created = api_client.post(
            f"/api/rooms/{room.code}/games/", {"game": "battleship"}, format="json"
        )
        instance_id = created.data["id"]
        api_client.post(f"/api/rooms/{room.code}/games/{instance_id}/join/", {}, format="json")

        auth(api_client, bob)
        response = api_client.patch(
            f"/api/rooms/{room.code}/games/{instance_id}/config/",
            {"board_size": 8, "fleet_sizes": [3, 2]},
            format="json",
        )

        assert response.status_code == 403

    def test_rejects_an_invalid_config(self, api_client, room_with_two_players):
        room, alice, _ = room_with_two_players
        auth(api_client, alice)
        created = api_client.post(
            f"/api/rooms/{room.code}/games/", {"game": "battleship"}, format="json"
        )
        instance_id = created.data["id"]

        response = api_client.patch(
            f"/api/rooms/{room.code}/games/{instance_id}/config/",
            {"board_size": 100, "fleet_sizes": [3, 2]},
            format="json",
        )

        assert response.status_code == 400


@pytest.mark.django_db
class TestJoiningAnInstance:
    def test_a_second_player_can_join_a_vacant_slot(self, api_client, room_with_two_players):
        room, alice, bob = room_with_two_players
        auth(api_client, alice)
        created = api_client.post(
            f"/api/rooms/{room.code}/games/", {"game": "battleship"}, format="json"
        )
        instance_id = created.data["id"]

        auth(api_client, bob)
        response = api_client.post(
            f"/api/rooms/{room.code}/games/{instance_id}/join/", {}, format="json"
        )

        assert response.status_code == 201
        assert GameParticipant.objects.filter(instance_id=instance_id, player=bob).exists()

    def test_a_third_player_cannot_join_as_a_player(self, api_client, room_with_two_players):
        room, alice, bob = room_with_two_players
        carol = Player.objects.create(room=room, display_name="Carol")
        auth(api_client, alice)
        created = api_client.post(
            f"/api/rooms/{room.code}/games/", {"game": "battleship"}, format="json"
        )
        instance_id = created.data["id"]
        auth(api_client, bob)
        api_client.post(f"/api/rooms/{room.code}/games/{instance_id}/join/", {}, format="json")

        auth(api_client, carol)
        response = api_client.post(
            f"/api/rooms/{room.code}/games/{instance_id}/join/", {}, format="json"
        )

        assert response.status_code == 400

    def test_a_third_player_can_join_as_a_spectator(self, api_client, room_with_two_players):
        room, alice, bob = room_with_two_players
        carol = Player.objects.create(room=room, display_name="Carol")
        auth(api_client, alice)
        created = api_client.post(
            f"/api/rooms/{room.code}/games/", {"game": "battleship"}, format="json"
        )
        instance_id = created.data["id"]
        auth(api_client, bob)
        api_client.post(f"/api/rooms/{room.code}/games/{instance_id}/join/", {}, format="json")

        auth(api_client, carol)
        response = api_client.post(
            f"/api/rooms/{room.code}/games/{instance_id}/join/",
            {"role": "spectator"},
            format="json",
        )

        assert response.status_code == 201


@pytest.mark.django_db
class TestFleetPlacementAndShots:
    def _instance_with_two_players(self, api_client, room, alice, bob):
        auth(api_client, alice)
        created = api_client.post(
            f"/api/rooms/{room.code}/games/", {"game": "battleship"}, format="json"
        )
        instance_id = created.data["id"]
        auth(api_client, bob)
        api_client.post(f"/api/rooms/{room.code}/games/{instance_id}/join/", {}, format="json")
        return instance_id

    def test_placing_both_fleets_starts_the_match(self, api_client, room_with_two_players):
        room, alice, bob = room_with_two_players
        instance_id = self._instance_with_two_players(api_client, room, alice, bob)

        auth(api_client, alice)
        response = api_client.post(
            f"/api/rooms/{room.code}/games/{instance_id}/fleet/",
            {"ships": FLEET_A},
            format="json",
        )
        assert response.status_code == 201
        assert GameInstance.objects.get(id=instance_id).status == GameInstance.STATUS_CONFIGURING

        auth(api_client, bob)
        response = api_client.post(
            f"/api/rooms/{room.code}/games/{instance_id}/fleet/",
            {"ships": FLEET_B},
            format="json",
        )
        assert response.status_code == 201
        assert GameInstance.objects.get(id=instance_id).status == GameInstance.STATUS_IN_PROGRESS

    def test_rejects_an_invalid_fleet(self, api_client, room_with_two_players):
        room, alice, bob = room_with_two_players
        instance_id = self._instance_with_two_players(api_client, room, alice, bob)

        auth(api_client, alice)
        response = api_client.post(
            f"/api/rooms/{room.code}/games/{instance_id}/fleet/",
            {"ships": [[[0, 0], [1, 1]]]},
            format="json",
        )
        assert response.status_code == 400

    def test_players_cannot_see_each_others_unsunk_ships(self, api_client, room_with_two_players):
        room, alice, bob = room_with_two_players
        instance_id = self._instance_with_two_players(api_client, room, alice, bob)

        auth(api_client, alice)
        api_client.post(
            f"/api/rooms/{room.code}/games/{instance_id}/fleet/",
            {"ships": FLEET_A},
            format="json",
        )
        auth(api_client, bob)
        api_client.post(
            f"/api/rooms/{room.code}/games/{instance_id}/fleet/",
            {"ships": FLEET_B},
            format="json",
        )

        auth(api_client, alice)
        response = api_client.get(f"/api/rooms/{room.code}/games/{instance_id}/")
        alice_id = str(alice.id)
        bob_id = str(bob.id)
        assert response.data["state"]["fleets"][alice_id]["ships"] == FLEET_A
        assert response.data["state"]["fleets"][bob_id]["ships"] == []

    def test_a_full_match_ends_with_a_winner_and_allows_a_rematch(
        self, api_client, room_with_two_players
    ):
        room, alice, bob = room_with_two_players
        instance_id = self._instance_with_two_players(api_client, room, alice, bob)

        auth(api_client, alice)
        api_client.post(
            f"/api/rooms/{room.code}/games/{instance_id}/fleet/",
            {"ships": FLEET_A},
            format="json",
        )
        auth(api_client, bob)
        api_client.post(
            f"/api/rooms/{room.code}/games/{instance_id}/fleet/",
            {"ships": FLEET_B},
            format="json",
        )

        # Alice afunda toda a frota B (que ocupa as colunas 5 a 9).
        auth(api_client, alice)
        bob_cells = [cell for ship in FLEET_B for cell in ship]
        last_response = None
        for cell in bob_cells:
            last_response = api_client.post(
                f"/api/rooms/{room.code}/games/{instance_id}/shots/",
                {"cell": cell},
                format="json",
            )
            assert last_response.status_code == 200

        assert last_response.data["result"] == "sunk"
        assert last_response.data["state"]["winner"] == str(alice.id)

        instance = GameInstance.objects.get(id=instance_id)
        assert instance.status == GameInstance.STATUS_FINISHED
        assert instance.winner == alice

        response = api_client.post(
            f"/api/rooms/{room.code}/games/{instance_id}/rematch/", {}, format="json"
        )
        assert response.status_code == 201
        rematch_id = response.data["id"]
        assert rematch_id != instance_id
        assert GameParticipant.objects.filter(
            instance_id=rematch_id, player=alice, role=GameParticipant.ROLE_PLAYER
        ).exists()
        assert GameParticipant.objects.filter(
            instance_id=rematch_id, player=bob, role=GameParticipant.ROLE_PLAYER
        ).exists()

    def test_shooting_out_of_turn_is_rejected(self, api_client, room_with_two_players):
        room, alice, bob = room_with_two_players
        instance_id = self._instance_with_two_players(api_client, room, alice, bob)

        auth(api_client, alice)
        api_client.post(
            f"/api/rooms/{room.code}/games/{instance_id}/fleet/",
            {"ships": FLEET_A},
            format="json",
        )
        auth(api_client, bob)
        api_client.post(
            f"/api/rooms/{room.code}/games/{instance_id}/fleet/",
            {"ships": FLEET_B},
            format="json",
        )

        # O primeiro turno é de quem posicionou a frota primeiro (alice).
        response = api_client.post(
            f"/api/rooms/{room.code}/games/{instance_id}/shots/",
            {"cell": [0, 0]},
            format="json",
        )
        assert response.status_code == 400
