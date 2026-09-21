"""
Garante que as views que mudam o estado da sala avisam quem está conectado via WebSocket —
sem depender de subir o channel layer de verdade (ver rooms/realtime.py).
"""

from unittest.mock import patch

import pytest
from rest_framework.test import APIClient

from rooms.models import Room


@pytest.fixture
def api_client():
    return APIClient()


@pytest.mark.django_db
class TestRoomRealtimeBroadcast:
    def test_joining_a_room_broadcasts_a_room_updated_event(self, api_client):
        room = Room.objects.create()

        with patch("rooms.views.broadcast_room_event") as broadcast:
            api_client.post(
                f"/api/rooms/{room.code}/players/", {"display_name": "Bob"}, format="json"
            )

        broadcast.assert_called_once_with(room.code, {"type": "room_updated"})
