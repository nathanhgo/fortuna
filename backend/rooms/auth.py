"""
Identificação do jogador que está fazendo a requisição, a partir do token guardado no
localStorage do navegador (ver architecture_docs/idea.md — não é login/conta, só a credencial
daquele jogador naquela sala). Usado por endpoints de `rooms` e `games` que precisam saber
"quem está pedindo isso", e não só "o que está sendo pedido".
"""

import uuid

from rest_framework.exceptions import AuthenticationFailed

from .models import Player, Room

PLAYER_TOKEN_HEADER = "X-Player-Token"


def get_player_from_token(room: Room, token_header: str | None) -> Player:
    if not token_header:
        raise AuthenticationFailed(f"Informe o token do jogador (cabeçalho {PLAYER_TOKEN_HEADER}).")

    try:
        token = uuid.UUID(token_header)
    except ValueError as error:
        raise AuthenticationFailed("Token de jogador inválido.") from error

    try:
        return room.players.get(token=token)
    except Player.DoesNotExist as error:
        raise AuthenticationFailed("Jogador não encontrado nesta sala.") from error
