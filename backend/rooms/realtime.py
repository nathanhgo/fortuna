"""
Publica eventos para quem está conectado ao WebSocket de uma sala (ver rooms/consumers.py e
architecture_docs/stack.md). O WebSocket nunca é a fonte de verdade do estado — ele só avisa
"algo mudou, vá buscar via REST" — quem manda de fato é sempre a API REST, que já sabe filtrar
o que cada jogador pode ver (ver BUGBOT.md).
"""

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer


def room_group_name(room_code: str) -> str:
    return f"room_{room_code.upper()}"


def broadcast_room_event(room_code: str, event: dict) -> None:
    channel_layer = get_channel_layer()
    if channel_layer is None:
        return
    async_to_sync(channel_layer.group_send)(
        room_group_name(room_code), {"type": "room.event", "event": event}
    )
