from channels.generic.websocket import AsyncJsonWebsocketConsumer

from .realtime import room_group_name


class EchoConsumer(AsyncJsonWebsocketConsumer):
    """
    Prova de conceito da Fase 0 — devolve qualquer mensagem recebida. Existe só para validar
    a configuração do Django Channels antes de construir os consumers reais de sala/jogo
    (ver mvp.md, Fase 0 e Fase 1).
    """

    async def connect(self):
        await self.accept()

    async def receive_json(self, content, **kwargs):
        await self.send_json(content)


class RoomConsumer(AsyncJsonWebsocketConsumer):
    """
    Canal de notificação em tempo real de uma sala (ver mvp.md, Fase 1: "sincronização em tempo
    real da sala"). Só relaia eventos publicados no grupo `room_<code>` — quem entra/sai, quem
    cria/atualiza uma instância de jogo — nunca carrega o estado em si; o cliente reage a um
    evento re-buscando o recurso REST correspondente (ver rooms/realtime.py).
    """

    async def connect(self):
        room_code = self.scope["url_route"]["kwargs"]["code"]
        self.group_name = room_group_name(room_code)
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def room_event(self, event):
        await self.send_json(event["event"])
