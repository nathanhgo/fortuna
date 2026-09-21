from channels.generic.websocket import AsyncJsonWebsocketConsumer


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
