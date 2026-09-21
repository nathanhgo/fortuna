"""
Motor de regras do Xadrez — puro, sem Django (ver mvp.md, Fase 3).

A legalidade de lances, xeque, mate, afogamento, en passant, roque, promoção e empates
por repetição/50 lances vêm de `python-chess`. Este módulo só traduz isso para um estado
JSON (FEN + histórico) que cabe em `GameInstance.state`, e aplica as regras de Fortuna
(quem é branco/preto, modo realista vs assistido, relógio).
"""

import secrets

import chess

MODES = ("realistic", "assisted")
HOST_COLORS = ("random", "white", "black")
PROMOTIONS = ("q", "r", "b", "n")

DEFAULT_CONFIG = {
    "mode": "assisted",
    "host_color": "random",
    "initial_seconds": None,
    "increment_seconds": 0,
}


class ChessError(ValueError):
    """Erros de regra do Xadrez — mensagem em pt-BR, chega até a UI."""


class InvalidConfigError(ChessError):
    pass


class InvalidMoveError(ChessError):
    pass


def validate_config(config: dict) -> None:
    mode = config.get("mode")
    if mode not in MODES:
        raise InvalidConfigError("Escolha o modo realista ou o assistido.")
    if config.get("host_color", "random") not in HOST_COLORS:
        raise InvalidConfigError("A cor do anfitrião precisa ser branca, preta ou aleatória.")
    initial = config.get("initial_seconds")
    increment = config.get("increment_seconds") or 0
    if initial is not None and (not isinstance(initial, int) or initial <= 0):
        raise InvalidConfigError("O tempo inicial precisa ser um número positivo de segundos.")
    if not isinstance(increment, int) or increment < 0:
        raise InvalidConfigError("O acréscimo por lance não pode ser negativo.")
    if mode == "realistic" and initial:
        raise InvalidConfigError("O relógio só está disponível no modo assistido.")


def assign_colors(host_id, guest_id, host_color: str) -> tuple[str, str]:
    host_key, guest_key = str(host_id), str(guest_id)
    if host_color == "white":
        return host_key, guest_key
    if host_color == "black":
        return guest_key, host_key
    if secrets.randbelow(2) == 0:
        return host_key, guest_key
    return guest_key, host_key


def initial_state(white_id, black_id, config: dict, now_ms: int = 0) -> dict:
    validate_config(config)
    initial_seconds = config.get("initial_seconds")
    clock_ms = None if initial_seconds is None else initial_seconds * 1000
    board = chess.Board()
    return {
        "fen": board.fen(),
        "white_id": str(white_id),
        "black_id": str(black_id),
        "turn": "white",
        "moves": [],
        "status": "playing",
        "winner": None,
        "increment_ms": (config.get("increment_seconds") or 0) * 1000,
        "clocks": {
            "white_ms": clock_ms,
            "black_ms": clock_ms,
            "last_stamp_ms": now_ms,
        },
        "mode": config.get("mode", "assisted"),
    }


def apply_move(
    state: dict,
    player_id,
    from_square: str,
    to_square: str,
    promotion=None,
    now_ms: int = 0,
):
    board = chess.Board(state["fen"])
    _refresh_status(state, board)
    if state["status"] != "playing":
        raise InvalidMoveError("Esta partida já terminou.")

    player_key = str(player_id)
    expected = state["white_id"] if board.turn == chess.WHITE else state["black_id"]
    if player_key != expected:
        raise InvalidMoveError("Não é a sua vez de jogar.")

    try:
        move = chess.Move.from_uci(_uci(from_square, to_square, promotion))
    except ValueError as error:
        raise InvalidMoveError("Esse lance não é válido.") from error

    realistic = state.get("mode") == "realistic"
    allowed = board.pseudo_legal_moves if realistic else board.legal_moves
    if move not in allowed:
        raise InvalidMoveError("Esse lance não é legal nesta posição.")

    _tick_clocks(state, board.turn, now_ms)
    if state["status"] != "playing":
        raise InvalidMoveError("O tempo acabou.")

    try:
        san = board.san(move)
    except ValueError:
        san = move.uci()
    moved_white = board.turn == chess.WHITE
    board.push(move)
    state["moves"].append(
        {
            "uci": move.uci(),
            "san": san,
            "from": from_square,
            "to": to_square,
            "promotion": promotion,
        }
    )
    state["fen"] = board.fen()
    state["turn"] = "white" if board.turn == chess.WHITE else "black"
    _apply_increment(state, moved_white)
    state["clocks"]["last_stamp_ms"] = now_ms
    if realistic and _left_own_king_in_check(board):
        state["status"] = "ignored_check"
        state["winner"] = state["black_id"] if moved_white else state["white_id"]
        return state
    _refresh_status(state, board)
    return state


def claim_flag(state: dict, config: dict, now_ms: int) -> str | None:
    if config.get("initial_seconds") is None:
        return None
    board = chess.Board(state["fen"])
    if state["status"] != "playing":
        return None
    _tick_clocks(state, board.turn, now_ms)
    if state["status"] == "timeout":
        return "flag"
    return None


def serialize_state_for_player(state: dict, config: dict, viewer_id) -> dict:
    board = chess.Board(state["fen"])
    _refresh_status(state, board)
    assisted = config.get("mode") == "assisted"
    last = state["moves"][-1] if state["moves"] else None
    legal = []
    if assisted:
        legal = [
            {
                "from": chess.square_name(move.from_square),
                "to": chess.square_name(move.to_square),
                "promotion": chess.piece_symbol(move.promotion).lower() if move.promotion else None,
            }
            for move in board.legal_moves
        ]
    return {
        "fen": state["fen"],
        "white_id": state["white_id"],
        "black_id": state["black_id"],
        "turn": state["turn"],
        "status": state["status"],
        "winner": state["winner"],
        "clocks": state["clocks"],
        "in_check": bool(assisted and board.is_check()),
        "legal_moves": legal,
        "pgn": _pgn(state) if assisted else "",
        "last_move": {"from": last["from"], "to": last["to"]} if assisted and last else None,
        "viewer_color": _viewer_color(state, viewer_id),
    }


def _viewer_color(state: dict, viewer_id) -> str | None:
    key = str(viewer_id) if viewer_id is not None else None
    if key == state["white_id"]:
        return "white"
    if key == state["black_id"]:
        return "black"
    return None


def _uci(from_square: str, to_square: str, promotion=None) -> str:
    uci = f"{from_square}{to_square}"
    if promotion:
        if promotion not in PROMOTIONS:
            raise InvalidMoveError("Promova para dama, torre, bispo ou cavalo.")
        uci += promotion
    return uci


def _tick_clocks(state: dict, turn, now_ms: int) -> None:
    clocks = state["clocks"]
    if clocks["white_ms"] is None:
        return
    elapsed = max(0, now_ms - clocks["last_stamp_ms"])
    side = "white_ms" if turn == chess.WHITE else "black_ms"
    clocks[side] = max(0, clocks[side] - elapsed)
    clocks["last_stamp_ms"] = now_ms
    if clocks[side] <= 0:
        state["status"] = "timeout"
        state["winner"] = state["black_id"] if side == "white_ms" else state["white_id"]


def _apply_increment(state: dict, moved_white: bool) -> None:
    clocks = state["clocks"]
    if clocks["white_ms"] is None:
        return
    key = "white_ms" if moved_white else "black_ms"
    clocks[key] += state.get("increment_ms") or 0


def _refresh_status(state: dict, board: chess.Board) -> None:
    if state.get("status") == "timeout":
        return
    outcome = board.outcome(claim_draw=True)
    if outcome is None:
        state["status"] = "playing"
        state["winner"] = None
        return
    if outcome.winner is chess.WHITE:
        state["winner"] = state["white_id"]
        state["status"] = "checkmate"
        return
    if outcome.winner is chess.BLACK:
        state["winner"] = state["black_id"]
        state["status"] = "checkmate"
        return
    if outcome.termination == chess.Termination.STALEMATE:
        state["status"] = "stalemate"
    elif outcome.termination in (
        chess.Termination.FIFTY_MOVES,
        chess.Termination.SEVENTY_FIVE_MOVES,
    ):
        state["status"] = "draw_fifty"
    elif outcome.termination in (
        chess.Termination.THREEFOLD_REPETITION,
        chess.Termination.FIVEFOLD_REPETITION,
    ):
        state["status"] = "draw_repetition"
    else:
        state["status"] = "draw_insufficient"
    state["winner"] = None


def _left_own_king_in_check(board: chess.Board) -> bool:
    mover = not board.turn
    king = board.king(mover)
    return king is not None and board.is_attacked_by(board.turn, king)


def _pgn(state: dict) -> str:
    parts = []
    for index, item in enumerate(state["moves"]):
        if index % 2 == 0:
            parts.append(f"{index // 2 + 1}.")
        parts.append(item["san"])
    return " ".join(parts)
