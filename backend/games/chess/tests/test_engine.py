"""
Testes do motor de Xadrez — puros, sem Django (ver mvp.md, Fase 3).
"""

import pytest

from games.chess.engine import (
    InvalidConfigError,
    InvalidMoveError,
    apply_move,
    assign_colors,
    claim_flag,
    initial_state,
    serialize_state_for_player,
    validate_config,
)

DEFAULT_CONFIG = {
    "mode": "assisted",
    "host_color": "white",
    "initial_seconds": None,
    "increment_seconds": 0,
}


def start(white="alice", black="bob", config=None, now_ms=0):
    return initial_state(white, black, config or DEFAULT_CONFIG, now_ms=now_ms)


class TestValidateConfig:
    def test_accepts_realistic_and_assisted_modes(self):
        validate_config({"mode": "realistic", "host_color": "random"})
        validate_config(
            {
                "mode": "assisted",
                "host_color": "black",
                "initial_seconds": 300,
                "increment_seconds": 5,
            }
        )

    def test_rejects_unknown_mode(self):
        with pytest.raises(InvalidConfigError):
            validate_config({"mode": "arcade", "host_color": "white"})

    def test_rejects_unknown_host_color(self):
        with pytest.raises(InvalidConfigError):
            validate_config({"mode": "realistic", "host_color": "green"})

    def test_rejects_clock_on_realistic_mode(self):
        with pytest.raises(InvalidConfigError):
            validate_config(
                {"mode": "realistic", "host_color": "white", "initial_seconds": 300}
            )


class TestAssignColors:
    def test_host_can_sit_as_white(self):
        assert assign_colors("host", "guest", "white") == ("host", "guest")

    def test_host_can_sit_as_black(self):
        assert assign_colors("host", "guest", "black") == ("guest", "host")

    def test_random_assignment_uses_both_players(self):
        white, black = assign_colors("host", "guest", "random")
        assert {white, black} == {"host", "guest"}


class TestMoves:
    def test_starting_position_is_the_standard_board(self):
        state = start()
        assert state["fen"].startswith("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR")
        assert state["turn"] == "white"
        assert state["white_id"] == "alice"
        assert state["black_id"] == "bob"

    def test_white_opens_with_a_pawn(self):
        state = start()
        apply_move(state, "alice", "e2", "e4")
        assert "e4" in state["fen"] or state["moves"][-1]["san"] == "e4"
        assert state["turn"] == "black"

    def test_rejects_moving_out_of_turn(self):
        state = start()
        with pytest.raises(InvalidMoveError):
            apply_move(state, "bob", "e7", "e5")

    def test_rejects_an_illegal_piece_move(self):
        state = start()
        with pytest.raises(InvalidMoveError):
            apply_move(state, "alice", "e2", "e5")

    def test_knights_can_jump(self):
        state = start()
        apply_move(state, "alice", "g1", "f3")
        assert state["moves"][-1]["san"] == "Nf3"

    def test_kingside_castling(self):
        # Posição com caminho livre para o roque curto das brancas.
        state = start()
        state["fen"] = "r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1"
        apply_move(state, "alice", "e1", "g1")
        assert state["moves"][-1]["san"] == "O-O"

    def test_cannot_castle_through_check(self):
        state = start()
        state["fen"] = "4k3/8/8/8/8/8/4r3/R3K2R w KQ - 0 1"
        with pytest.raises(InvalidMoveError):
            apply_move(state, "alice", "e1", "g1")

    def test_en_passant(self):
        state = start()
        apply_move(state, "alice", "e2", "e4")
        apply_move(state, "bob", "a7", "a6")
        apply_move(state, "alice", "e4", "e5")
        apply_move(state, "bob", "d7", "d5")
        apply_move(state, "alice", "e5", "d6")
        assert state["moves"][-1]["san"] == "exd6"

    def test_promotion_to_queen(self):
        state = start()
        state["fen"] = "4k3/P7/8/8/8/8/8/4K3 w - - 0 1"
        apply_move(state, "alice", "a7", "a8", promotion="q")
        assert state["moves"][-1]["san"].startswith("a8=Q")

    def test_checkmate_ends_the_game(self):
        state = start()
        apply_move(state, "alice", "f2", "f3")
        apply_move(state, "bob", "e7", "e5")
        apply_move(state, "alice", "g2", "g4")
        apply_move(state, "bob", "d8", "h4")
        assert state["status"] == "checkmate"
        assert state["winner"] == "bob"

    def test_stalemate_is_a_draw(self):
        state = start()
        state["fen"] = "7k/5Q2/8/8/8/8/8/4K3 b - - 0 1"
        # Pretas na vez, rei encurralado sem xeque — afogamento.
        with pytest.raises(InvalidMoveError):
            apply_move(state, "bob", "h8", "h7")
        # O estado em si já nasce afogado: o motor marca isso ao reconstruir.
        viewed = serialize_state_for_player(state, DEFAULT_CONFIG, "alice")
        assert viewed["status"] == "stalemate"
        assert viewed["winner"] is None


class TestAssistedVersusRealistic:
    def test_assisted_mode_exposes_check_and_legal_moves(self):
        state = start()
        apply_move(state, "alice", "e2", "e4")
        apply_move(state, "bob", "f7", "f6")
        apply_move(state, "alice", "d1", "h5")
        view = serialize_state_for_player(state, DEFAULT_CONFIG, "bob")
        assert view["in_check"] is True
        assert any(move["from"] == "g7" and move["to"] == "g6" for move in view["legal_moves"])
        assert view["pgn"]
        assert view["last_move"] == {"from": "d1", "to": "h5"}

    def test_realistic_mode_hides_assistance(self):
        config = {"mode": "realistic", "host_color": "white"}
        state = start(config=config)
        apply_move(state, "alice", "e2", "e4")
        apply_move(state, "bob", "f7", "f6")
        apply_move(state, "alice", "d1", "h5")
        view = serialize_state_for_player(state, config, "bob")
        assert view["in_check"] is False
        assert view["legal_moves"] == []
        assert view["pgn"] == ""
        assert view["last_move"] is None

    def test_realistic_mode_lets_you_ignore_check_and_lose(self):
        config = {"mode": "realistic", "host_color": "white"}
        state = start(config=config)
        apply_move(state, "alice", "e2", "e4")
        apply_move(state, "bob", "f7", "f6")
        apply_move(state, "alice", "d1", "h5")
        apply_move(state, "bob", "a7", "a6")
        assert state["status"] == "ignored_check"
        assert state["winner"] == "alice"

    def test_assisted_mode_still_rejects_ignoring_check(self):
        state = start()
        apply_move(state, "alice", "e2", "e4")
        apply_move(state, "bob", "f7", "f6")
        apply_move(state, "alice", "d1", "h5")
        with pytest.raises(InvalidMoveError):
            apply_move(state, "bob", "a7", "a6")


class TestClock:
    def test_losing_on_time_awards_the_opponent(self):
        config = {
            "mode": "assisted",
            "host_color": "white",
            "initial_seconds": 60,
            "increment_seconds": 0,
        }
        state = start(config=config, now_ms=1_000)
        apply_move(state, "alice", "e2", "e4", now_ms=2_000)
        result = claim_flag(state, config, now_ms=2_000 + 61_000)
        assert result == "flag"
        assert state["status"] == "timeout"
        assert state["winner"] == "alice"
