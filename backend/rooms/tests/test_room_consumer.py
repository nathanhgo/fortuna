"""
Consumer real de sala (substitui o EchoConsumer da Fase 0 como mecanismo de sincronização em
tempo real — ver mvp.md, Fase 1). Ele só relaia eventos publicados no grupo `room_<code>`; quem
decide o que mudou continua sendo a camada REST (ver rooms/realtime.py e BUGBOT.md).
"""

import pytest
from channels.layers import get_channel_layer
from channels.routing import URLRouter
from channels.testing import WebsocketCommunicator

from rooms.routing import websocket_urlpatterns


@pytest.mark.asyncio
async def test_connecting_joins_the_group_for_that_room_code():
    communicator = WebsocketCommunicator(URLRouter(websocket_urlpatterns), "/ws/rooms/ABCDEF/")
    connected, _ = await communicator.connect()
    assert connected

    channel_layer = get_channel_layer()
    await channel_layer.group_send(
        "room_ABCDEF", {"type": "room.event", "event": {"type": "room_updated"}}
    )

    event = await communicator.receive_json_from()
    assert event == {"type": "room_updated"}

    await communicator.disconnect()


@pytest.mark.asyncio
async def test_the_room_code_from_the_url_is_upper_cased():
    communicator = WebsocketCommunicator(URLRouter(websocket_urlpatterns), "/ws/rooms/abcdef/")
    connected, _ = await communicator.connect()
    assert connected

    channel_layer = get_channel_layer()
    await channel_layer.group_send(
        "room_ABCDEF", {"type": "room.event", "event": {"type": "room_updated"}}
    )

    event = await communicator.receive_json_from()
    assert event == {"type": "room_updated"}

    await communicator.disconnect()


@pytest.mark.asyncio
async def test_events_from_a_different_room_are_not_received():
    communicator = WebsocketCommunicator(URLRouter(websocket_urlpatterns), "/ws/rooms/ABCDEF/")
    connected, _ = await communicator.connect()
    assert connected

    channel_layer = get_channel_layer()
    await channel_layer.group_send(
        "room_ZZZZZZ", {"type": "room.event", "event": {"type": "room_updated"}}
    )

    with pytest.raises(TimeoutError):
        await communicator.receive_json_from(timeout=0.2)

    # A conexão já foi encerrada pelo timeout acima; não há o que desconectar depois disso.
