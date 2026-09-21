import pytest
from rest_framework.test import APIClient

from rooms.models import AVATAR_KEYS, Player


@pytest.fixture
def api_client():
    return APIClient()


@pytest.mark.django_db
class TestPlayerAvatar:
    def test_creating_a_player_assigns_an_avatar_from_the_allowed_set(self, api_client):
        response = api_client.post("/api/rooms/", {"display_name": "Alice"}, format="json")

        assert response.status_code == 201
        avatar = response.data["player"]["avatar"]
        assert avatar in AVATAR_KEYS
        assert response.data["room"]["players"][0]["avatar"] == avatar

    def test_the_player_can_change_their_own_avatar(self, api_client):
        created = api_client.post("/api/rooms/", {"display_name": "Alice"}, format="json")
        code = created.data["room"]["code"]
        token = created.data["player"]["token"]
        current = created.data["player"]["avatar"]
        next_avatar = next(key for key in AVATAR_KEYS if key != current)

        api_client.credentials(HTTP_X_PLAYER_TOKEN=token)
        response = api_client.patch(
            f"/api/rooms/{code}/players/me/", {"avatar": next_avatar}, format="json"
        )

        assert response.status_code == 200
        assert response.data["avatar"] == next_avatar
        assert Player.objects.get().avatar == next_avatar

    def test_changing_avatar_without_a_token_is_rejected(self, api_client):
        created = api_client.post("/api/rooms/", {"display_name": "Alice"}, format="json")
        code = created.data["room"]["code"]

        response = api_client.patch(
            f"/api/rooms/{code}/players/me/", {"avatar": "owl"}, format="json"
        )

        assert response.status_code == 403

    def test_rejects_an_unknown_avatar(self, api_client):
        created = api_client.post("/api/rooms/", {"display_name": "Alice"}, format="json")
        code = created.data["room"]["code"]
        token = created.data["player"]["token"]

        api_client.credentials(HTTP_X_PLAYER_TOKEN=token)
        response = api_client.patch(
            f"/api/rooms/{code}/players/me/", {"avatar": "dragon"}, format="json"
        )

        assert response.status_code == 400
