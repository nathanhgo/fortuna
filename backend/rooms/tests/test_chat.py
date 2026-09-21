import pytest
from rest_framework.test import APIClient

from games.models import GAME_CHESS, GameInstance, GameParticipant
from rooms.models import ChatMessage, Player, Room


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def room_with_players(api_client):
    created = api_client.post("/api/rooms/", {"display_name": "Alice"}, format="json")
    code = created.data["room"]["code"]
    alice_token = created.data["player"]["token"]
    alice_id = created.data["player"]["id"]
    api_client.credentials()
    bob = api_client.post(
        f"/api/rooms/{code}/players/", {"display_name": "Bob"}, format="json"
    )
    return {
        "code": code,
        "alice_token": alice_token,
        "alice_id": alice_id,
        "bob_token": bob.data["token"],
        "bob_id": bob.data["id"],
    }


@pytest.mark.django_db
class TestRoomChat:
    def test_a_player_can_post_and_list_room_messages(self, api_client, room_with_players):
        code = room_with_players["code"]
        api_client.credentials(HTTP_X_PLAYER_TOKEN=room_with_players["alice_token"])

        posted = api_client.post(
            f"/api/rooms/{code}/messages/",
            {"text": "boa sorte"},
            format="json",
        )

        assert posted.status_code == 201
        assert posted.data["text"] == "boa sorte"
        assert posted.data["display_name"] == "Alice"

        listed = api_client.get(f"/api/rooms/{code}/messages/")
        assert listed.status_code == 200
        assert [item["text"] for item in listed.data] == ["boa sorte"]

    def test_posting_without_a_token_is_rejected(self, api_client, room_with_players):
        code = room_with_players["code"]
        response = api_client.post(
            f"/api/rooms/{code}/messages/",
            {"text": "oi"},
            format="json",
        )
        assert response.status_code == 403

    def test_empty_text_is_rejected(self, api_client, room_with_players):
        code = room_with_players["code"]
        api_client.credentials(HTTP_X_PLAYER_TOKEN=room_with_players["alice_token"])
        response = api_client.post(
            f"/api/rooms/{code}/messages/",
            {"text": "   "},
            format="json",
        )
        assert response.status_code == 400

    def test_instance_chat_is_isolated_from_the_lobby(self, api_client, room_with_players):
        code = room_with_players["code"]
        room = Room.objects.get(code=code)
        alice = Player.objects.get(id=room_with_players["alice_id"])
        instance = GameInstance.objects.create(room=room, game=GAME_CHESS)
        GameParticipant.objects.create(instance=instance, player=alice, seat=0)

        api_client.credentials(HTTP_X_PLAYER_TOKEN=room_with_players["alice_token"])
        api_client.post(
            f"/api/rooms/{code}/messages/",
            {"text": "sala"},
            format="json",
        )
        api_client.post(
            f"/api/rooms/{code}/messages/",
            {"text": "xadrez", "instance_id": str(instance.id)},
            format="json",
        )

        lobby = api_client.get(f"/api/rooms/{code}/messages/")
        table = api_client.get(
            f"/api/rooms/{code}/messages/", {"instance_id": str(instance.id)}
        )
        assert [item["text"] for item in lobby.data] == ["sala"]
        assert [item["text"] for item in table.data] == ["xadrez"]

    def test_a_player_outside_the_instance_cannot_use_that_chat(
        self, api_client, room_with_players
    ):
        code = room_with_players["code"]
        room = Room.objects.get(code=code)
        alice = Player.objects.get(id=room_with_players["alice_id"])
        instance = GameInstance.objects.create(room=room, game=GAME_CHESS)
        GameParticipant.objects.create(instance=instance, player=alice, seat=0)

        api_client.credentials(HTTP_X_PLAYER_TOKEN=room_with_players["bob_token"])
        response = api_client.post(
            f"/api/rooms/{code}/messages/",
            {"text": "espiando", "instance_id": str(instance.id)},
            format="json",
        )
        assert response.status_code == 403
        assert ChatMessage.objects.count() == 0

    def test_a_spectator_can_write_in_the_instance_chat(
        self, api_client, room_with_players
    ):
        code = room_with_players["code"]
        room = Room.objects.get(code=code)
        bob = Player.objects.get(id=room_with_players["bob_id"])
        instance = GameInstance.objects.create(room=room, game=GAME_CHESS)
        GameParticipant.objects.create(
            instance=instance, player=bob, role=GameParticipant.ROLE_SPECTATOR
        )

        api_client.credentials(HTTP_X_PLAYER_TOKEN=room_with_players["bob_token"])
        response = api_client.post(
            f"/api/rooms/{code}/messages/",
            {"text": "boa jogada", "instance_id": str(instance.id)},
            format="json",
        )
        assert response.status_code == 201
        assert response.data["text"] == "boa jogada"
