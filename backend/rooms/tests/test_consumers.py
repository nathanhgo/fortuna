"""
Prova de conceito da Fase 0: valida que Django Channels está corretamente configurado
antes de depender dele para sincronizar estado de jogo de verdade (ver mvp.md, Fase 0).
"""

import pytest
from channels.testing import WebsocketCommunicator

from rooms.consumers import EchoConsumer


@pytest.mark.asyncio
async def test_echo_consumer_returns_the_same_message_it_receives():
    communicator = WebsocketCommunicator(EchoConsumer.as_asgi(), "/ws/echo/")
    connected, _ = await communicator.connect()
    assert connected

    await communicator.send_json_to({"message": "ola fortuna"})
    response = await communicator.receive_json_from()
    assert response == {"message": "ola fortuna"}

    await communicator.disconnect()
