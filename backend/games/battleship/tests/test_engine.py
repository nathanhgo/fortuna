"""
Testes do motor de regras da Batalha Naval — puros, sem Django (ver mvp.md, Fase 2, e
.cursor/rules/10-workflow.mdc sobre isolar regra de jogo da camada HTTP).
"""

import pytest

from games.battleship.engine import (
    InvalidConfigError,
    InvalidFleetError,
    InvalidShotError,
    fire,
    initial_state,
    serialize_state_for_player,
    set_fleet,
    validate_config,
)

BOARD_SIZE = 10
FLEET_SIZES = [5, 4, 3, 3, 2]


def horizontal_ship(row, start_col, length):
    return [[row, start_col + offset] for offset in range(length)]


def vertical_ship(start_row, col, length):
    return [[start_row + offset, col] for offset in range(length)]


def valid_fleet_a():
    return [
        horizontal_ship(0, 0, 5),
        horizontal_ship(1, 0, 4),
        horizontal_ship(2, 0, 3),
        horizontal_ship(3, 0, 3),
        horizontal_ship(4, 0, 2),
    ]


def valid_fleet_b():
    return [
        vertical_ship(0, 9, 5),
        vertical_ship(0, 8, 4),
        vertical_ship(0, 7, 3),
        vertical_ship(0, 6, 3),
        vertical_ship(0, 5, 2),
    ]


class TestValidateConfig:
    def test_accepts_a_reasonable_board_and_fleet(self):
        validate_config(BOARD_SIZE, FLEET_SIZES)

    def test_rejects_board_smaller_than_the_minimum(self):
        with pytest.raises(InvalidConfigError):
            validate_config(3, [2])

    def test_rejects_board_larger_than_the_maximum(self):
        with pytest.raises(InvalidConfigError):
            validate_config(50, [2])

    def test_rejects_ship_larger_than_five_cells(self):
        with pytest.raises(InvalidConfigError):
            validate_config(BOARD_SIZE, [6])

    def test_rejects_ship_smaller_than_one_cell(self):
        with pytest.raises(InvalidConfigError):
            validate_config(BOARD_SIZE, [0])

    def test_rejects_fleet_that_does_not_fit_the_board(self):
        with pytest.raises(InvalidConfigError):
            validate_config(5, [5, 5, 5, 5, 5, 5])

    def test_rejects_empty_fleet(self):
        with pytest.raises(InvalidConfigError):
            validate_config(BOARD_SIZE, [])


class TestSetFleet:
    def test_accepts_a_valid_fleet_placement(self):
        state = initial_state(BOARD_SIZE, FLEET_SIZES)
        set_fleet(state, "alice", valid_fleet_a())
        assert "alice" in state["fleets"]

    def test_rejects_fleet_with_wrong_number_of_ships(self):
        state = initial_state(BOARD_SIZE, FLEET_SIZES)
        with pytest.raises(InvalidFleetError):
            set_fleet(state, "alice", valid_fleet_a()[:-1])

    def test_rejects_fleet_with_wrong_ship_sizes(self):
        state = initial_state(BOARD_SIZE, FLEET_SIZES)
        broken = valid_fleet_a()
        broken[0] = horizontal_ship(0, 0, 4)
        with pytest.raises(InvalidFleetError):
            set_fleet(state, "alice", broken)

    def test_rejects_diagonal_ship(self):
        state = initial_state(BOARD_SIZE, FLEET_SIZES)
        broken = valid_fleet_a()
        broken[0] = [[0, 0], [1, 1], [2, 2], [3, 3], [4, 4]]
        with pytest.raises(InvalidFleetError):
            set_fleet(state, "alice", broken)

    def test_rejects_non_contiguous_ship(self):
        state = initial_state(BOARD_SIZE, FLEET_SIZES)
        broken = valid_fleet_a()
        broken[0] = [[0, 0], [0, 1], [0, 2], [0, 3], [0, 5]]
        with pytest.raises(InvalidFleetError):
            set_fleet(state, "alice", broken)

    def test_rejects_ship_outside_the_board(self):
        state = initial_state(BOARD_SIZE, FLEET_SIZES)
        broken = valid_fleet_a()
        broken[0] = horizontal_ship(0, 8, 5)
        with pytest.raises(InvalidFleetError):
            set_fleet(state, "alice", broken)

    def test_rejects_overlapping_ships(self):
        state = initial_state(BOARD_SIZE, FLEET_SIZES)
        broken = valid_fleet_a()
        broken[1] = horizontal_ship(0, 1, 4)
        with pytest.raises(InvalidFleetError):
            set_fleet(state, "alice", broken)

    def test_rejects_setting_the_fleet_twice_for_the_same_player(self):
        state = initial_state(BOARD_SIZE, FLEET_SIZES)
        set_fleet(state, "alice", valid_fleet_a())
        with pytest.raises(InvalidFleetError):
            set_fleet(state, "alice", valid_fleet_a())

    def test_turn_is_only_defined_once_both_fleets_are_set(self):
        state = initial_state(BOARD_SIZE, FLEET_SIZES)
        assert state["turn"] is None
        set_fleet(state, "alice", valid_fleet_a())
        assert state["turn"] is None
        set_fleet(state, "bob", valid_fleet_b())
        assert state["turn"] in {"alice", "bob"}


class TestFire:
    def _ready_state(self):
        state = initial_state(BOARD_SIZE, FLEET_SIZES)
        set_fleet(state, "alice", valid_fleet_a())
        set_fleet(state, "bob", valid_fleet_b())
        state["turn"] = "alice"
        return state

    def test_rejects_shot_before_both_fleets_are_ready(self):
        state = initial_state(BOARD_SIZE, FLEET_SIZES)
        set_fleet(state, "alice", valid_fleet_a())
        with pytest.raises(InvalidShotError):
            fire(state, "alice", "bob", [0, 0])

    def test_rejects_shot_out_of_turn(self):
        state = self._ready_state()
        with pytest.raises(InvalidShotError):
            fire(state, "bob", "alice", [0, 0])

    def test_rejects_shooting_your_own_board(self):
        state = self._ready_state()
        with pytest.raises(InvalidShotError):
            fire(state, "alice", "alice", [0, 0])

    def test_rejects_shot_outside_the_board(self):
        state = self._ready_state()
        with pytest.raises(InvalidShotError):
            fire(state, "alice", "bob", [0, 10])

    def test_miss_is_reported_and_passes_the_turn(self):
        state = self._ready_state()
        # bob's fleet occupies columns 5-9; column 0 is guaranteed empty.
        result = fire(state, "alice", "bob", [9, 0])
        assert result == "miss"
        assert state["turn"] == "bob"

    def test_hit_is_reported_and_keeps_the_turn(self):
        state = self._ready_state()
        result = fire(state, "alice", "bob", [0, 9])
        assert result == "hit"
        assert state["turn"] == "alice"

    def test_sinking_the_last_cell_of_a_ship_is_reported_as_sunk(self):
        state = self._ready_state()
        # bob's 2-cell ship occupies [0, 5] and [1, 5].
        fire(state, "alice", "bob", [0, 5])
        result = fire(state, "alice", "bob", [1, 5])
        assert result == "sunk"

    def test_rejects_shooting_the_same_cell_twice(self):
        state = self._ready_state()
        fire(state, "alice", "bob", [0, 9])  # hit: keeps alice's turn.
        with pytest.raises(InvalidShotError):
            fire(state, "alice", "bob", [0, 9])

    def test_sinking_the_last_cell_of_the_last_ship_sets_the_winner(self):
        state = self._ready_state()
        bob_cells = [cell for ship in valid_fleet_b() for cell in ship]
        for cell in bob_cells[:-1]:
            fire(state, "alice", "bob", cell)
        assert state["winner"] is None

        result = fire(state, "alice", "bob", bob_cells[-1])
        assert result == "sunk"
        assert state["winner"] == "alice"

    def test_rejects_shooting_after_the_game_is_over(self):
        state = self._ready_state()
        for cell in [cell for ship in valid_fleet_b() for cell in ship]:
            fire(state, "alice", "bob", cell)
        with pytest.raises(InvalidShotError):
            fire(state, "bob", "alice", [0, 0])


class TestSerializeStateForPlayer:
    def _ready_state(self):
        state = initial_state(BOARD_SIZE, FLEET_SIZES)
        set_fleet(state, "alice", valid_fleet_a())
        set_fleet(state, "bob", valid_fleet_b())
        state["turn"] = "alice"
        return state

    def test_owner_sees_their_own_ships(self):
        state = self._ready_state()
        view = serialize_state_for_player(state, "alice")
        assert view["fleets"]["alice"]["ships"] == valid_fleet_a()

    def test_owner_does_not_see_the_opponents_unsunk_ships(self):
        state = self._ready_state()
        view = serialize_state_for_player(state, "alice")
        assert view["fleets"]["bob"]["ships"] == []

    def test_sunk_opponent_ships_become_visible(self):
        state = self._ready_state()
        two_cell_ship = vertical_ship(0, 5, 2)
        for cell in two_cell_ship:
            fire(state, "alice", "bob", cell)

        view = serialize_state_for_player(state, "alice")
        assert view["fleets"]["bob"]["ships"] == [two_cell_ship]

    def test_shots_received_are_always_visible_to_both_players(self):
        state = self._ready_state()
        fire(state, "alice", "bob", [9, 0])

        alice_view = serialize_state_for_player(state, "alice")
        bob_view = serialize_state_for_player(state, "bob")
        assert alice_view["fleets"]["bob"]["shots_received"] == [{"cell": [9, 0], "result": "miss"}]
        assert bob_view["fleets"]["bob"]["shots_received"] == [{"cell": [9, 0], "result": "miss"}]

    def test_a_viewer_without_a_fleet_sees_no_ships_at_all(self):
        state = self._ready_state()
        view = serialize_state_for_player(state, "spectator")
        assert view["fleets"]["alice"]["ships"] == []
        assert view["fleets"]["bob"]["ships"] == []
