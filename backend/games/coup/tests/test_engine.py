"""Regras do Coup — escritas antes do motor (TDD)."""

from random import Random

import pytest

from games.coup.engine import (
    DEFAULT_CONFIG,
    CoupError,
    apply_act,
    initial_state,
    legal_acts,
    serialize_state_for_player,
    start_game,
    validate_config,
)


def living_hands(state, **hands):
    for player_id, cards in hands.items():
        state["players"][player_id]["hand"] = list(cards)
        state["players"][player_id]["revealed"] = []


def pass_window(state, claimant, now=1_000):
    pending = state["pending"]
    for player_id in list(state["order"]):
        if player_id == claimant:
            continue
        if not state["players"][player_id]["hand"]:
            continue
        if player_id in pending.get("passed", []):
            continue
        apply_act(state, player_id, {"kind": "pass"}, now)


def two_player_game(**overrides):
    config = {**DEFAULT_CONFIG, **overrides}
    state = start_game(["alice", "bob"], config, rng=Random(1))
    return state


class TestConfig:
    def test_official_default_uses_three_copies_of_each_base_character(self):
        validate_config(DEFAULT_CONFIG)
        copies = DEFAULT_CONFIG["copies"]
        assert copies["duke"] == 3
        assert copies["assassin"] == 3
        assert copies["captain"] == 3
        assert copies["ambassador"] == 3
        assert copies["contessa"] == 3
        assert copies["inquisitor"] == 0
        assert DEFAULT_CONFIG["max_players"] == 6
        assert DEFAULT_CONFIG["reformation"] is False

    def test_rejects_more_seats_than_the_deck_can_deal(self):
        config = {**DEFAULT_CONFIG, "max_players": 6, "copies": {**DEFAULT_CONFIG["copies"]}}
        config["copies"] = {name: 1 for name in config["copies"]}
        with pytest.raises(CoupError, match="baralho"):
            validate_config(config)

    def test_inquisitor_replaces_ambassador_when_enabled(self):
        config = {**DEFAULT_CONFIG, "inquisitor": True}
        validate_config(config)
        built = initial_state(["alice", "bob"], config, rng=Random(0))
        all_cards = (
            built["deck"]
            + built["players"]["alice"]["hand"]
            + built["players"]["bob"]["hand"]
        )
        assert "ambassador" not in all_cards
        assert all_cards.count("inquisitor") == 3


class TestDeal:
    def test_each_player_starts_with_two_hidden_cards_and_two_coins(self):
        state = two_player_game()
        for player_id in ("alice", "bob"):
            assert len(state["players"][player_id]["hand"]) == 2
            assert state["players"][player_id]["coins"] == 2
            assert state["players"][player_id]["revealed"] == []
        assert state["turn"] == "alice"
        assert state["phase"] == "action"
        assert len(state["deck"]) == 11  # 15 - 4 dealt


class TestIncome:
    def test_income_gives_one_coin_and_passes_the_turn(self):
        state = two_player_game()
        apply_act(state, "alice", {"kind": "income"}, now_ms=10)
        assert state["players"]["alice"]["coins"] == 3
        assert state["turn"] == "bob"
        assert state["phase"] == "action"


class TestTaxAndChallenge:
    def test_unchallenged_tax_pays_three_coins(self):
        state = two_player_game()
        living_hands(state, alice=["captain", "contessa"], bob=["duke", "assassin"])
        apply_act(state, "alice", {"kind": "tax"}, now_ms=10)
        assert state["phase"] == "challenge_action"
        pass_window(state, "alice", now=11)
        assert state["players"]["alice"]["coins"] == 5
        assert state["turn"] == "bob"

    def test_bluffing_tax_loses_influence(self):
        state = two_player_game()
        living_hands(state, alice=["captain", "contessa"], bob=["duke", "assassin"])
        apply_act(state, "alice", {"kind": "tax"}, now_ms=10)
        apply_act(state, "bob", {"kind": "challenge"}, now_ms=11)
        assert state["phase"] == "lose_influence"
        assert state["pending"]["lose_queue"][0]["player"] == "alice"
        assert state["pending"]["lose_queue"][0]["chooser"] == "bob"
        with pytest.raises(CoupError, match="escolhe"):
            apply_act(state, "alice", {"kind": "reveal", "card": "captain"}, now_ms=12)
        assert legal_acts(state, "bob") == [
            {"kind": "reveal", "slot": 0},
            {"kind": "reveal", "slot": 1},
        ]
        assert legal_acts(state, "alice") == []
        apply_act(state, "bob", {"kind": "reveal", "slot": 0}, now_ms=12)
        assert "captain" in state["players"]["alice"]["revealed"]
        assert state["players"]["alice"]["hand"] == ["contessa"]
        assert state["players"]["alice"]["coins"] == 2  # coins returned / never paid
        assert state["turn"] == "bob"

    def test_honest_tax_makes_the_challenger_lose_and_still_pays(self):
        state = two_player_game()
        living_hands(state, alice=["duke", "contessa"], bob=["captain", "assassin"])
        apply_act(state, "alice", {"kind": "tax"}, now_ms=10)
        apply_act(state, "bob", {"kind": "challenge"}, now_ms=11)
        assert state["phase"] == "show_proof"
        assert state["pending"]["shown"] == "duke"
        assert state["pending"]["shown_by"] == "alice"
        assert "duke" in state["players"]["alice"]["hand"]
        apply_act(state, "alice", {"kind": "replace"}, now_ms=12)
        assert state["phase"] == "lose_influence"
        assert state["pending"]["lose_queue"][0]["player"] == "bob"
        assert state["pending"].get("shown") in (None, "")
        apply_act(state, "bob", {"kind": "reveal", "card": "captain"}, now_ms=13)
        assert state["players"]["alice"]["coins"] == 5
        assert len(state["players"]["alice"]["hand"]) == 2
        assert "duke" not in state["players"]["alice"]["revealed"]


class TestForeignAid:
    def test_duke_block_cancels_foreign_aid(self):
        state = two_player_game()
        living_hands(state, alice=["captain", "contessa"], bob=["duke", "assassin"])
        apply_act(state, "alice", {"kind": "foreign_aid"}, now_ms=10)
        assert state["phase"] == "block"
        apply_act(state, "bob", {"kind": "block", "card": "duke"}, now_ms=11)
        pass_window(state, "bob", now=12)
        assert state["players"]["alice"]["coins"] == 2
        assert state["turn"] == "bob"


class TestCoup:
    def test_coup_costs_seven_and_forces_the_target_to_lose_influence(self):
        state = two_player_game()
        state["players"]["alice"]["coins"] = 7
        living_hands(state, alice=["duke", "captain"], bob=["contessa", "assassin"])
        apply_act(state, "alice", {"kind": "coup", "target": "bob"}, now_ms=10)
        assert state["players"]["alice"]["coins"] == 0
        assert state["phase"] == "lose_influence"
        apply_act(state, "bob", {"kind": "reveal", "card": "contessa"}, now_ms=11)
        assert state["players"]["bob"]["revealed"] == ["contessa"]
        assert state["turn"] == "bob"

    def test_player_with_ten_coins_must_coup(self):
        state = two_player_game()
        state["players"]["alice"]["coins"] = 10
        with pytest.raises(CoupError, match="golpe"):
            apply_act(state, "alice", {"kind": "income"}, now_ms=10)


class TestSteal:
    def test_unchallenged_steal_takes_up_to_two_coins(self):
        state = two_player_game()
        state["players"]["bob"]["coins"] = 3
        living_hands(state, alice=["captain", "contessa"], bob=["duke", "assassin"])
        apply_act(state, "alice", {"kind": "steal", "target": "bob"}, now_ms=10)
        pass_window(state, "alice", now=11)
        # block window for the target
        if state["phase"] == "block":
            apply_act(state, "bob", {"kind": "pass"}, now_ms=12)
        assert state["players"]["alice"]["coins"] == 4
        assert state["players"]["bob"]["coins"] == 1


class TestAssassinate:
    def test_contessa_block_saves_the_target_but_keeps_the_fee(self):
        state = two_player_game()
        state["players"]["alice"]["coins"] = 3
        living_hands(state, alice=["assassin", "duke"], bob=["contessa", "captain"])
        apply_act(state, "alice", {"kind": "assassinate", "target": "bob"}, now_ms=10)
        pass_window(state, "alice", now=11)
        apply_act(state, "bob", {"kind": "block", "card": "contessa"}, now_ms=12)
        pass_window(state, "bob", now=13)
        assert state["players"]["bob"]["hand"] == ["contessa", "captain"]
        assert state["players"]["alice"]["coins"] == 0

    def test_failed_contessa_bluff_loses_two_influences(self):
        state = two_player_game()
        state["players"]["alice"]["coins"] = 3
        living_hands(state, alice=["assassin", "duke"], bob=["captain", "ambassador"])
        apply_act(state, "alice", {"kind": "assassinate", "target": "bob"}, now_ms=10)
        pass_window(state, "alice", now=11)
        apply_act(state, "bob", {"kind": "block", "card": "contessa"}, now_ms=12)
        apply_act(state, "alice", {"kind": "challenge"}, now_ms=13)
        # bob loses the challenge, then the assassination still hits
        assert [item["player"] for item in state["pending"]["lose_queue"]] == ["bob", "bob"]


class TestExchange:
    def test_ambassador_draws_two_and_returns_two(self):
        state = two_player_game()
        living_hands(state, alice=["ambassador", "contessa"], bob=["duke", "assassin"])
        deck_before = list(state["deck"])
        apply_act(state, "alice", {"kind": "exchange"}, now_ms=10)
        pass_window(state, "alice", now=11)
        assert state["phase"] == "exchange"
        drawn = state["pending"]["drawn"]
        assert len(drawn) == 2
        keep = [state["players"]["alice"]["hand"][0], drawn[0]]
        apply_act(state, "alice", {"kind": "keep", "cards": keep}, now_ms=12)
        assert sorted(state["players"]["alice"]["hand"]) == sorted(keep)
        assert len(state["deck"]) == len(deck_before)


class TestSerialize:
    def test_opponent_hand_is_hidden_but_own_hand_is_visible(self):
        state = two_player_game()
        living_hands(state, alice=["duke", "captain"], bob=["contessa", "assassin"])
        view = serialize_state_for_player(state, "alice")
        assert view["players"]["alice"]["hand"] == ["duke", "captain"]
        assert view["players"]["bob"]["hand"] == [None, None]
        assert view["players"]["bob"]["hidden_count"] == 2
        assert "deck" not in view or all(card is None for card in view.get("deck", []))
        spectator = serialize_state_for_player(state, None)
        assert spectator["players"]["alice"]["hand"] == [None, None]


class TestVictory:
    def test_last_player_with_influence_wins(self):
        state = two_player_game()
        state["players"]["alice"]["coins"] = 7
        living_hands(state, alice=["duke", "captain"], bob=["contessa"])
        apply_act(state, "alice", {"kind": "coup", "target": "bob"}, now_ms=10)
        apply_act(state, "bob", {"kind": "reveal", "card": "contessa"}, now_ms=11)
        assert state["status"] == "finished"
        assert state["winner"] == "alice"


class TestTimeout:
    def test_expired_challenge_window_resolves_the_action(self):
        state = two_player_game()
        living_hands(state, alice=["captain", "contessa"], bob=["duke", "assassin"])
        apply_act(state, "alice", {"kind": "tax"}, now_ms=10)
        deadline = 10 + DEFAULT_CONFIG["challenge_seconds"] * 1000 + 1
        apply_act(state, "alice", {"kind": "timeout"}, now_ms=deadline)
        assert state["players"]["alice"]["coins"] == 5
        assert state["turn"] == "bob"


class TestReformation:
    def test_cannot_coup_a_teammate(self):
        config = {**DEFAULT_CONFIG, "reformation": True}
        state = start_game(["alice", "bob", "cara"], config, rng=Random(2))
        # alternating factions: alice loyalist, bob reformist, cara loyalist
        assert state["players"]["alice"]["faction"] == "loyalist"
        assert state["players"]["bob"]["faction"] == "reformist"
        assert state["players"]["cara"]["faction"] == "loyalist"
        state["turn"] = "alice"
        state["phase"] = "action"
        state["players"]["alice"]["coins"] = 7
        with pytest.raises(CoupError, match="facção"):
            apply_act(state, "alice", {"kind": "coup", "target": "cara"}, now_ms=10)

    def test_convert_self_costs_one_coin_into_the_reserve(self):
        config = {**DEFAULT_CONFIG, "reformation": True}
        state = start_game(["alice", "bob"], config, rng=Random(3))
        state["turn"] = "alice"
        state["phase"] = "action"
        before = state["players"]["alice"]["faction"]
        apply_act(state, "alice", {"kind": "convert"}, now_ms=10)
        assert state["players"]["alice"]["coins"] == 1
        assert state["treasury_reserve"] == 1
        assert state["players"]["alice"]["faction"] != before
