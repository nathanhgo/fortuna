"""
Motor de regras do Coup — puro, sem Django (ver mvp.md, Fase 4).

Estado JSON em `GameInstance.state`. Personagens, ações, contestação, bloqueio,
perda de influência e a expansão Reformation (facções, conversão, desfalque,
Inquisidor no lugar do Embaixador).
"""

from __future__ import annotations

from collections import Counter
from copy import deepcopy
from random import Random

BASE_CHARACTERS = ("duke", "assassin", "captain", "ambassador", "contessa")
ALL_CHARACTERS = BASE_CHARACTERS + ("inquisitor",)
FACTIONS = ("loyalist", "reformist")
MUST_COUP_AT = 10
START_COINS = 2
START_CARDS = 2
MIN_PLAYERS = 2
MAX_PLAYERS = 10

DEFAULT_CONFIG = {
    "max_players": 6,
    "copies": {
        "duke": 3,
        "assassin": 3,
        "captain": 3,
        "ambassador": 3,
        "contessa": 3,
        "inquisitor": 0,
    },
    "reformation": False,
    "inquisitor": False,
    "challenge_seconds": 15,
}

ACTION_CHARACTER = {
    "tax": "duke",
    "assassinate": "assassin",
    "steal": "captain",
    "exchange": "ambassador",
    "inquisitor_exchange": "inquisitor",
    "examine": "inquisitor",
}

ACTION_COST = {
    "income": 0,
    "foreign_aid": 0,
    "coup": 7,
    "tax": 0,
    "assassinate": 3,
    "steal": 0,
    "exchange": 0,
    "inquisitor_exchange": 0,
    "examine": 0,
    "convert": 0,  # 1 ou 2, calculado na hora
    "embezzle": 0,
}

KILL_ACTIONS = {"coup", "assassinate"}
TARGET_ACTIONS = {"coup", "assassinate", "steal", "examine", "convert"}


class CoupError(ValueError):
    """Erros de regra do Coup — mensagem em pt-BR, chega até a UI."""


class InvalidConfigError(CoupError):
    pass


class InvalidActError(CoupError):
    pass


def validate_config(config: dict) -> None:
    max_players = config.get("max_players", 6)
    if not isinstance(max_players, int) or not (MIN_PLAYERS <= max_players <= MAX_PLAYERS):
        raise InvalidConfigError("O Coup aceita de 2 a 10 jogadores.")
    seconds = config.get("challenge_seconds", 15)
    if not isinstance(seconds, int) or not (5 <= seconds <= 60):
        raise InvalidConfigError("A janela de contestação precisa ter entre 5 e 60 segundos.")
    copies = effective_copies(config)
    if sum(copies.values()) < max_players * START_CARDS:
        raise InvalidConfigError("Esse baralho não tem cartas suficientes para todos os jogadores.")
    if copies.get("inquisitor") and copies.get("ambassador"):
        raise InvalidConfigError(
            "O Inquisidor substitui o Embaixador — não use os dois no baralho."
        )
    active = [name for name, count in copies.items() if count]
    if len(active) < 3:
        raise InvalidConfigError("Deixe pelo menos três personagens no baralho.")


def effective_copies(config: dict) -> dict[str, int]:
    copies = dict(DEFAULT_CONFIG["copies"])
    incoming = config.get("copies") or {}
    for name, count in incoming.items():
        if name not in ALL_CHARACTERS:
            raise InvalidConfigError(f"Personagem desconhecido: {name}.")
        if not isinstance(count, int) or count < 0 or count > 5:
            raise InvalidConfigError("Cada personagem pode ter de 0 a 5 cópias.")
        copies[name] = count
    if config.get("inquisitor"):
        n = copies.get("ambassador") or copies.get("inquisitor") or 3
        copies["inquisitor"] = n
        copies["ambassador"] = 0
    else:
        copies["inquisitor"] = 0
    return copies


def initial_state(player_ids: list, config: dict, rng: Random | None = None) -> dict:
    return start_game(player_ids, config, rng=rng)


def start_game(player_ids: list, config: dict, rng: Random | None = None) -> dict:
    validate_config(config)
    ids = [str(player_id) for player_id in player_ids]
    if not (MIN_PLAYERS <= len(ids) <= int(config.get("max_players", 6))):
        raise InvalidActError("São necessários pelo menos dois jogadores para começar.")
    if len(set(ids)) != len(ids):
        raise InvalidActError("Há jogadores repetidos nesta mesa.")

    copies = effective_copies(config)
    deck: list[str] = []
    for name, count in copies.items():
        deck.extend([name] * count)
    rng = rng or Random()
    rng.shuffle(deck)

    players = {}
    for index, player_id in enumerate(ids):
        faction = None
        if config.get("reformation"):
            faction = FACTIONS[index % 2]
        players[player_id] = {
            "coins": START_COINS,
            "hand": [deck.pop(), deck.pop()],
            "revealed": [],
            "faction": faction,
        }

    normalized = {
        "max_players": int(config.get("max_players", 6)),
        "copies": copies,
        "reformation": bool(config.get("reformation")),
        "inquisitor": bool(config.get("inquisitor")),
        "challenge_seconds": int(config.get("challenge_seconds", 15)),
    }
    return {
        "players": players,
        "order": ids,
        "deck": deck,
        "turn": ids[0],
        "phase": "action",
        "pending": {},
        "history": [{"text": "A partida começou."}],
        "treasury_reserve": 0,
        "winner": None,
        "status": "playing",
        "config": normalized,
        "rng_seed": rng.randrange(1, 2**31),
    }


def apply_act(state: dict, player_id, act: dict, now_ms: int = 0) -> dict:
    if state.get("status") != "playing":
        raise InvalidActError("A partida já terminou.")
    player_id = str(player_id)
    kind = (act or {}).get("kind")
    if not kind:
        raise InvalidActError("Informe a ação.")

    if kind == "timeout":
        _expire_if_due(state, now_ms, force=True)
        return state

    _expire_if_due(state, now_ms)

    if kind == "pass":
        _handle_pass(state, player_id, now_ms)
    elif kind == "challenge":
        _handle_challenge(state, player_id, now_ms)
    elif kind == "block":
        _handle_block(state, player_id, act, now_ms)
    elif kind == "reveal":
        _handle_reveal(state, player_id, act, now_ms)
    elif kind == "replace":
        _handle_replace_proof(state, player_id, now_ms)
    elif kind == "keep":
        _handle_keep(state, player_id, act, now_ms)
    elif kind == "examine_show":
        _handle_examine_show(state, player_id, act, now_ms)
    elif kind == "examine_decide":
        _handle_examine_decide(state, player_id, act, now_ms)
    else:
        _declare_action(state, player_id, act, now_ms)
    return state


def serialize_state_for_player(state: dict, viewer_id) -> dict:
    viewer = str(viewer_id) if viewer_id is not None else None
    players = {}
    for player_id, data in state["players"].items():
        hidden = list(data["hand"])
        if player_id != viewer:
            hidden = [None] * len(hidden)
        players[player_id] = {
            "coins": data["coins"],
            "hand": hidden,
            "hidden_count": len(data["hand"]),
            "revealed": list(data["revealed"]),
            "faction": data.get("faction"),
            "alive": bool(data["hand"]),
        }
    pending = deepcopy(state.get("pending") or {})
    if state["phase"] == "exchange" and viewer != pending.get("actor"):
        pending["drawn"] = [None] * len(pending.get("drawn") or [])
    if state["phase"] in {"examine_show", "examine_decide"} and viewer not in {
        pending.get("actor"),
        pending.get("target"),
    }:
        pending["shown"] = None
    return {
        "players": players,
        "order": list(state["order"]),
        "turn": state["turn"],
        "phase": state["phase"],
        "pending": pending,
        "history": list(state.get("history") or [])[-40:],
        "treasury_reserve": state.get("treasury_reserve", 0),
        "winner": state.get("winner"),
        "status": state.get("status"),
        "deck_count": len(state.get("deck") or []),
        "challenge_seconds": state["config"]["challenge_seconds"],
        "reformation": state["config"].get("reformation", False),
        "inquisitor": state["config"].get("inquisitor", False),
        "viewer_id": viewer,
        "legal_acts": legal_acts(state, viewer) if viewer else [],
    }


def legal_acts(state: dict, player_id: str | None) -> list[dict]:
    if not player_id or state.get("status") != "playing":
        return []
    player_id = str(player_id)
    phase = state["phase"]
    pending = state.get("pending") or {}
    if phase == "action" and state["turn"] == player_id:
        return _legal_turn_actions(state, player_id)
    if phase in {"challenge_action", "block", "challenge_block"}:
        if player_id in _eligible(state) and player_id not in pending.get("passed", []):
            acts = [{"kind": "pass"}]
            if phase != "block":
                acts.append({"kind": "challenge"})
            else:
                for card in _block_cards(state):
                    acts.append({"kind": "block", "card": card})
            return acts
    if phase == "show_proof":
        if player_id == pending.get("shown_by"):
            return [{"kind": "replace"}]
        return []
    if phase == "lose_influence":
        queue = pending.get("lose_queue") or []
        if not queue:
            return []
        current = queue[0]
        chooser = current.get("chooser")
        if chooser:
            if player_id != chooser:
                return []
            hand = state["players"][current["player"]]["hand"]
            return [{"kind": "reveal", "slot": index} for index in range(len(hand))]
        if current["player"] == player_id:
            return [
                {"kind": "reveal", "card": card}
                for card in state["players"][player_id]["hand"]
            ]
        return []
    if phase == "exchange" and pending.get("actor") == player_id:
        return [{"kind": "keep"}]
    return []


def _legal_turn_actions(state: dict, player_id: str) -> list[dict]:
    coins = state["players"][player_id]["coins"]
    if coins >= MUST_COUP_AT:
        return [{"kind": "coup", "target": target} for target in _other_living(state, player_id)]
    acts: list[dict] = [{"kind": "income"}, {"kind": "foreign_aid"}]
    if coins >= 7:
        for target in _other_living(state, player_id):
            if not _forbidden_target(state, player_id, target, "coup"):
                acts.append({"kind": "coup", "target": target})
    acts.append({"kind": "tax"})
    if coins >= 3:
        for target in _other_living(state, player_id):
            if not _forbidden_target(state, player_id, target, "assassinate"):
                acts.append({"kind": "assassinate", "target": target})
    for target in _other_living(state, player_id):
        if not _forbidden_target(state, player_id, target, "steal"):
            acts.append({"kind": "steal", "target": target})
    copies = state["config"]["copies"]
    if copies.get("ambassador"):
        acts.append({"kind": "exchange"})
    if copies.get("inquisitor"):
        acts.append({"kind": "inquisitor_exchange"})
        for target in _other_living(state, player_id):
            if not _forbidden_target(state, player_id, target, "examine"):
                acts.append({"kind": "examine", "target": target})
    if state["config"].get("reformation"):
        acts.append({"kind": "convert"})
        for target in _other_living(state, player_id):
            acts.append({"kind": "convert", "target": target})
        acts.append({"kind": "embezzle"})
    return acts


def _declare_action(state: dict, player_id: str, act: dict, now_ms: int) -> None:
    if state["phase"] != "action":
        raise InvalidActError("Não é hora de declarar uma ação.")
    if state["turn"] != player_id:
        raise InvalidActError("Não é a sua vez.")
    if not _alive(state, player_id):
        raise InvalidActError("Você já está eliminado.")

    kind = act["kind"]
    if kind not in ACTION_COST and kind not in {"convert", "embezzle"}:
        raise InvalidActError("Essa ação não existe.")

    coins = state["players"][player_id]["coins"]
    if coins >= MUST_COUP_AT and kind != "coup":
        raise InvalidActError("Com 10 ou mais moedas você é obrigado a dar o golpe.")

    target = act.get("target")
    target = str(target) if target is not None else None
    if kind in KILL_ACTIONS or kind in {"steal", "examine"}:
        if not target or not _alive(state, target) or target == player_id:
            raise InvalidActError("Escolha um adversário válido.")
        if _forbidden_target(state, player_id, target, kind):
            raise InvalidActError("Não pode atacar alguém da sua facção.")

    cost = ACTION_COST.get(kind, 0)
    if kind == "convert":
        cost = 1 if target in {None, player_id} else 2
        if target in {None, player_id}:
            target = player_id
        elif not _alive(state, target):
            raise InvalidActError("Escolha um adversário válido.")
        if not state["config"].get("reformation"):
            raise InvalidActError("Conversão só existe com a expansão de alianças.")
    if kind == "embezzle" and not state["config"].get("reformation"):
        raise InvalidActError("Desfalque só existe com a expansão de alianças.")
    if kind == "exchange" and not state["config"]["copies"].get("ambassador"):
        raise InvalidActError("O Embaixador não está neste baralho.")
    if kind in {"inquisitor_exchange", "examine"} and not state["config"]["copies"].get(
        "inquisitor"
    ):
        raise InvalidActError("O Inquisidor não está neste baralho.")
    if coins < cost:
        raise InvalidActError("Você não tem moedas suficientes.")

    if cost:
        state["players"][player_id]["coins"] -= cost

    claimed = ACTION_CHARACTER.get(kind)
    pending = {
        "action": kind,
        "actor": player_id,
        "target": target,
        "claimed": claimed,
        "paid": cost,
        "passed": [],
        "lose_queue": [],
        "drawn": [],
        "resume": None,
    }
    state["pending"] = pending
    _log(state, _action_log(player_id, kind, target))

    if kind == "income":
        _resolve_action(state, now_ms)
        return
    if kind == "coup":
        _resolve_action(state, now_ms)
        return
    if kind == "convert":
        _resolve_action(state, now_ms)
        return
    if kind == "foreign_aid":
        _open_window(state, "block", now_ms)
        return
    if kind == "embezzle":
        _open_window(state, "challenge_action", now_ms)
        return
    if claimed:
        _open_window(state, "challenge_action", now_ms)
        return
    _resolve_action(state, now_ms)


def _handle_pass(state: dict, player_id: str, now_ms: int) -> None:
    if state["phase"] not in {"challenge_action", "block", "challenge_block"}:
        raise InvalidActError("Não há nada para recusar agora.")
    if player_id not in _eligible(state):
        raise InvalidActError("Você não pode responder essa ação.")
    pending = state["pending"]
    if player_id in pending.get("passed", []):
        return
    pending.setdefault("passed", []).append(player_id)
    _advance_if_all_passed(state, now_ms)


def _handle_challenge(state: dict, player_id: str, now_ms: int) -> None:
    phase = state["phase"]
    if phase not in {"challenge_action", "challenge_block"}:
        raise InvalidActError("Não há o que contestar agora.")
    if player_id not in _eligible(state):
        raise InvalidActError("Você não pode contestar isso.")

    pending = state["pending"]
    if phase == "challenge_action":
        claimant = pending["actor"]
        claimed = pending["claimed"]
        inverted = pending["action"] == "embezzle"
    else:
        claimant = pending["blocker"]
        claimed = pending["block_claimed"]
        inverted = False

    if inverted:
        # Desfalque: o desafiado perde se TIVER o Duque.
        has_card = "duke" in state["players"][claimant]["hand"]
        if has_card:
            pending["lose_queue"] = [{"player": claimant, "reason": "challenge"}]
            pending["resume"] = "cancel_refund"
            _log(state, f"{_name(claimant)} tinha o Duque — o desfalque falha.")
        else:
            pending["lose_queue"] = [{"player": player_id, "reason": "challenge"}]
            pending["resume"] = "resolve"
            _log(state, f"{_name(player_id)} contestou o desfalque e perdeu.")
        state["phase"] = "lose_influence"
        return

    if not claimed:
        raise InvalidActError("Essa ação não pode ser contestada.")

    has_card = claimed in state["players"][claimant]["hand"]
    if has_card:
        pending["shown"] = claimed
        pending["shown_by"] = claimant
        pending["lose_queue"] = [{"player": player_id, "reason": "challenge"}]
        pending["resume"] = "after_proof"
        pending["challenger"] = player_id
        state["phase"] = "show_proof"
        _log(
            state,
            f"{_name(claimant)} mostrou {_label(claimed)}. "
            f"{_name(player_id)} perde influência depois da troca.",
        )
    else:
        pending["lose_queue"] = [
            {"player": claimant, "reason": "challenge", "chooser": player_id}
        ]
        pending["challenger"] = player_id
        if (
            phase == "challenge_block"
            and pending["action"] == "assassinate"
            and claimant == pending.get("target")
        ):
            pending["lose_queue"].append({"player": claimant, "reason": "assassinate"})
            pending["resume"] = "next_turn"
            pending["kill_applied"] = True
        elif phase == "challenge_action":
            pending["resume"] = "cancel_refund"
        else:
            pending["resume"] = "resolve"
        _log(state, f"{_name(claimant)} não tinha {_label(claimed)}.")
        state["phase"] = "lose_influence"


def _handle_block(state: dict, player_id: str, act: dict, now_ms: int) -> None:
    if state["phase"] != "block":
        raise InvalidActError("Não há o que bloquear agora.")
    if player_id not in _eligible(state):
        raise InvalidActError("Você não pode bloquear essa ação.")
    card = act.get("card")
    if card not in _block_cards(state):
        raise InvalidActError("Esse personagem não bloqueia essa ação.")
    action = state["pending"]["action"]
    if action == "foreign_aid" and _forbidden_block_aid(state, player_id):
        raise InvalidActError("Não pode bloquear a ajuda externa da sua facção.")
    state["pending"]["blocker"] = player_id
    state["pending"]["block_claimed"] = card
    state["pending"]["passed"] = []
    _log(state, f"{_name(player_id)} alega {_label(card)} e tenta bloquear.")
    _open_window(state, "challenge_block", now_ms)


def _handle_reveal(state: dict, player_id: str, act: dict, now_ms: int) -> None:
    if state["phase"] != "lose_influence":
        raise InvalidActError("Ninguém está perdendo influência agora.")
    queue = state["pending"].get("lose_queue") or []
    if not queue:
        raise InvalidActError("Ninguém está perdendo influência agora.")
    current = queue[0]
    target = current["player"]
    chooser = current.get("chooser")
    if chooser:
        if player_id != chooser:
            raise InvalidActError("Quem contestou escolhe a carta, sem vê-la.")
        slot = act.get("slot")
        if not isinstance(slot, int):
            raise InvalidActError("Escolha uma das cartas ocultas.")
        hand = state["players"][target]["hand"]
        if slot < 0 or slot >= len(hand):
            raise InvalidActError("Essa carta não está na mão.")
        card = hand.pop(slot)
    else:
        if current["player"] != player_id:
            raise InvalidActError("Não é você quem perde influência agora.")
        card = act.get("card")
        hand = state["players"][player_id]["hand"]
        if card not in hand:
            raise InvalidActError("Essa carta não está na sua mão.")
        hand.remove(card)
        target = player_id
    state["players"][target]["revealed"].append(card)
    queue.pop(0)
    _log(state, f"{_name(target)} revela {_label(card)} e perde influência.")
    if _check_winner(state):
        return
    if queue:
        return
    _resume(state, now_ms)


def _handle_replace_proof(state: dict, player_id: str, now_ms: int) -> None:
    if state["phase"] != "show_proof":
        raise InvalidActError("Não há carta para devolver à corte agora.")
    pending = state["pending"]
    if pending.get("shown_by") != player_id:
        raise InvalidActError("Só quem mostrou a carta devolve ela à corte.")
    shown = pending.get("shown")
    if not shown:
        raise InvalidActError("Não há carta para devolver à corte agora.")
    _replace_proven_card(state, player_id, shown)
    pending["shown"] = None
    pending["shown_by"] = None
    _log(state, f"{_name(player_id)} devolveu {_label(shown)} à corte e tirou outra.")
    state["phase"] = "lose_influence"


def _handle_keep(state: dict, player_id: str, act: dict, now_ms: int) -> None:
    pending = state["pending"]
    if state["phase"] != "exchange" or pending.get("actor") != player_id:
        raise InvalidActError("Não é hora de devolver cartas à corte.")
    keep = list(act.get("cards") or [])
    player = state["players"][player_id]
    drawn = list(pending.get("drawn") or [])
    pool = list(player["hand"]) + drawn
    need = len(player["hand"])
    if len(keep) != need:
        raise InvalidActError(f"Fique com {need} carta(s).")
    pool_count = Counter(pool)
    keep_count = Counter(keep)
    if any(keep_count[card] > pool_count[card] for card in keep_count):
        raise InvalidActError("Você só pode ficar com cartas que tirou da corte ou já tinha.")
    remainder = list((pool_count - keep_count).elements())
    player["hand"] = list(keep)
    state["deck"].extend(remainder)
    _shuffle_deck(state)
    pending["drawn"] = []
    _log(state, f"{_name(player_id)} devolveu cartas à corte.")
    _next_turn(state)


def _handle_examine_show(state: dict, player_id: str, act: dict, now_ms: int) -> None:
    pending = state["pending"]
    if state["phase"] != "examine_show" or pending.get("target") != player_id:
        raise InvalidActError("Não é você quem mostra a carta.")
    card = act.get("card")
    if card not in state["players"][player_id]["hand"]:
        raise InvalidActError("Essa carta não está na sua mão.")
    pending["shown"] = card
    state["phase"] = "examine_decide"
    _log(state, f"{_name(player_id)} mostrou uma carta ao Inquisidor.")


def _handle_examine_decide(state: dict, player_id: str, act: dict, now_ms: int) -> None:
    pending = state["pending"]
    if state["phase"] != "examine_decide" or pending.get("actor") != player_id:
        raise InvalidActError("Não é você quem decide o exame.")
    target = pending["target"]
    shown = pending.get("shown")
    if act.get("swap"):
        hand = state["players"][target]["hand"]
        if shown in hand:
            hand.remove(shown)
            state["deck"].append(shown)
            _shuffle_deck(state)
            hand.append(_draw(state))
            _log(state, f"{_name(player_id)} forçou {_name(target)} a trocar a carta.")
    else:
        _log(state, f"{_name(player_id)} devolveu a carta de {_name(target)}.")
    _next_turn(state)


def _resume(state: dict, now_ms: int) -> None:
    if _check_winner(state):
        return
    resume = (state.get("pending") or {}).get("resume")
    if resume == "cancel_refund":
        _refund(state)
        _next_turn(state)
        return
    if resume == "next_turn":
        _next_turn(state)
        return
    if resume == "after_proof":
        if state["pending"].get("blocker"):
            # contestou o bloqueio e o bloqueador provou: bloqueio vale
            _log(state, "O bloqueio se sustenta.")
            _next_turn(state)
            return
        _go_block_or_resolve(state, now_ms)
        return
    if resume == "resolve":
        _resolve_action(state, now_ms)
        return
    _next_turn(state)


def _go_block_or_resolve(state: dict, now_ms: int) -> None:
    if _block_cards(state) and _eligible_for_phase(state, "block"):
        _open_window(state, "block", now_ms)
        return
    _resolve_action(state, now_ms)


def _resolve_action(state: dict, now_ms: int) -> None:
    pending = state["pending"]
    kind = pending.get("action")
    actor = pending["actor"]
    target = pending.get("target")
    if pending.get("kill_applied"):
        _next_turn(state)
        return
    if kind == "income":
        state["players"][actor]["coins"] += 1
        _next_turn(state)
        return
    if kind == "foreign_aid":
        state["players"][actor]["coins"] += 2
        _next_turn(state)
        return
    if kind == "tax":
        state["players"][actor]["coins"] += 3
        _next_turn(state)
        return
    if kind == "steal" and target:
        taken = min(2, state["players"][target]["coins"])
        state["players"][target]["coins"] -= taken
        state["players"][actor]["coins"] += taken
        _next_turn(state)
        return
    if kind == "coup" and target:
        pending["lose_queue"] = [{"player": target, "reason": "coup"}]
        pending["resume"] = "next_turn"
        state["phase"] = "lose_influence"
        return
    if kind == "assassinate" and target:
        pending["lose_queue"] = [{"player": target, "reason": "assassinate"}]
        pending["resume"] = "next_turn"
        state["phase"] = "lose_influence"
        return
    if kind == "exchange":
        pending["drawn"] = [_draw(state), _draw(state)]
        state["phase"] = "exchange"
        pending["resume"] = None
        return
    if kind == "inquisitor_exchange":
        pending["drawn"] = [_draw(state)]
        state["phase"] = "exchange"
        pending["resume"] = None
        return
    if kind == "examine" and target:
        state["phase"] = "examine_show"
        return
    if kind == "convert" and target:
        cost = pending.get("paid") or 0
        state["treasury_reserve"] = state.get("treasury_reserve", 0) + cost
        current = state["players"][target]["faction"]
        other = "reformist" if current == "loyalist" else "loyalist"
        state["players"][target]["faction"] = other
        _next_turn(state)
        return
    if kind == "embezzle":
        gained = state.get("treasury_reserve", 0)
        state["players"][actor]["coins"] += gained
        state["treasury_reserve"] = 0
        _next_turn(state)
        return
    _next_turn(state)


def _open_window(state: dict, phase: str, now_ms: int) -> None:
    state["phase"] = phase
    state["pending"]["passed"] = []
    seconds = state["config"]["challenge_seconds"]
    state["pending"]["deadline_ms"] = now_ms + seconds * 1000
    if not _eligible(state):
        _advance_if_all_passed(state, now_ms)


def _advance_if_all_passed(state: dict, now_ms: int) -> None:
    eligible = set(_eligible(state))
    passed = set(state["pending"].get("passed") or [])
    if eligible - passed:
        return
    phase = state["phase"]
    if phase == "challenge_action":
        _go_block_or_resolve(state, now_ms)
    elif phase == "block":
        _resolve_action(state, now_ms)
    elif phase == "challenge_block":
        _log(state, "Ninguém contestou o bloqueio.")
        _next_turn(state)


def _expire_if_due(state: dict, now_ms: int, force: bool = False) -> None:
    if state["phase"] not in {"challenge_action", "block", "challenge_block"}:
        if force:
            raise InvalidActError("Não há janela aberta para encerrar.")
        return
    deadline = (state.get("pending") or {}).get("deadline_ms")
    if deadline is None or now_ms < deadline:
        if force:
            raise InvalidActError("A janela de resposta ainda não acabou.")
        return
    for player_id in _eligible(state):
        if player_id not in state["pending"].get("passed", []):
            state["pending"].setdefault("passed", []).append(player_id)
    _advance_if_all_passed(state, now_ms)


def _eligible(state: dict) -> list[str]:
    return _eligible_for_phase(state, state["phase"])


def _eligible_for_phase(state: dict, phase: str) -> list[str]:
    pending = state.get("pending") or {}
    living = [player_id for player_id in state["order"] if _alive(state, player_id)]
    if phase == "challenge_action":
        return [player_id for player_id in living if player_id != pending.get("actor")]
    if phase == "challenge_block":
        return [player_id for player_id in living if player_id != pending.get("blocker")]
    if phase == "block":
        action = pending.get("action")
        if action == "foreign_aid":
            return [
                player_id
                for player_id in living
                if player_id != pending.get("actor") and not _forbidden_block_aid(state, player_id)
            ]
        target = pending.get("target")
        if target and _alive(state, target):
            return [target]
        return []
    return []


def _block_cards(state: dict) -> list[str]:
    action = (state.get("pending") or {}).get("action")
    copies = state["config"]["copies"]
    if action == "foreign_aid":
        return ["duke"]
    if action == "assassinate":
        return ["contessa"]
    if action == "steal":
        cards = ["captain"]
        if copies.get("ambassador"):
            cards.append("ambassador")
        if copies.get("inquisitor"):
            cards.append("inquisitor")
        return cards
    return []


def _replace_proven_card(state: dict, player_id: str, card: str) -> None:
    hand = state["players"][player_id]["hand"]
    hand.remove(card)
    state["deck"].append(card)
    _shuffle_deck(state)
    hand.append(_draw(state))


def _draw(state: dict) -> str:
    if not state["deck"]:
        raise InvalidActError("O baralho da corte está vazio.")
    return state["deck"].pop()


def _shuffle_deck(state: dict) -> None:
    rng = Random(state.get("rng_seed", 1))
    rng.shuffle(state["deck"])
    state["rng_seed"] = rng.randrange(1, 2**31)


def _refund(state: dict) -> None:
    pending = state.get("pending") or {}
    paid = pending.get("paid") or 0
    actor = pending.get("actor")
    if paid and actor:
        state["players"][actor]["coins"] += paid


def _next_turn(state: dict) -> None:
    if _check_winner(state):
        return
    order = state["order"]
    current = state["turn"]
    start = order.index(current) if current in order else -1
    for step in range(1, len(order) + 1):
        nxt = order[(start + step) % len(order)]
        if _alive(state, nxt):
            state["turn"] = nxt
            state["phase"] = "action"
            state["pending"] = {}
            return
    _check_winner(state)


def _check_winner(state: dict) -> bool:
    alive = [player_id for player_id in state["order"] if _alive(state, player_id)]
    if len(alive) <= 1:
        state["status"] = "finished"
        state["winner"] = alive[0] if alive else None
        state["phase"] = "finished"
        if alive:
            _log(state, f"{_name(alive[0])} venceu.")
        return True
    return False


def _alive(state: dict, player_id: str) -> bool:
    player = state["players"].get(player_id)
    return bool(player and player["hand"])


def _other_living(state: dict, player_id: str) -> list[str]:
    return [other for other in state["order"] if other != player_id and _alive(state, other)]


def _forbidden_target(state: dict, actor: str, target: str, action: str) -> bool:
    if action not in {"coup", "assassinate", "steal", "examine"}:
        return False
    if not state["config"].get("reformation"):
        return False
    if _all_same_faction(state):
        return False
    return _same_faction(state, actor, target)


def _forbidden_block_aid(state: dict, blocker: str) -> bool:
    if not state["config"].get("reformation"):
        return False
    if _all_same_faction(state):
        return False
    actor = (state.get("pending") or {}).get("actor")
    return bool(actor) and _same_faction(state, blocker, actor)


def _same_faction(state: dict, a: str, b: str) -> bool:
    fa = state["players"][a].get("faction")
    fb = state["players"][b].get("faction")
    return bool(fa) and fa == fb


def _all_same_faction(state: dict) -> bool:
    factions = {
        data.get("faction")
        for player_id, data in state["players"].items()
        if _alive(state, player_id)
    }
    factions.discard(None)
    return len(factions) <= 1


def _log(state: dict, text: str) -> None:
    state.setdefault("history", []).append({"text": text})


def _name(player_id: str) -> str:
    return player_id


def _label(character: str) -> str:
    return {
        "duke": "Duque",
        "assassin": "Assassino",
        "captain": "Capitão",
        "ambassador": "Embaixador",
        "contessa": "Condessa",
        "inquisitor": "Inquisidor",
    }.get(character, character)


def _action_log(actor: str, kind: str, target: str | None) -> str:
    labels = {
        "income": "toma renda",
        "foreign_aid": "pede ajuda externa",
        "coup": "dá o golpe",
        "tax": "taxa como Duque",
        "assassinate": "assassina",
        "steal": "rouba",
        "exchange": "troca cartas com a corte",
        "inquisitor_exchange": "consulta a corte",
        "examine": "examina",
        "convert": "converte",
        "embezzle": "desfalca o tesouro",
    }
    text = f"{_name(actor)} {labels.get(kind, kind)}"
    if target and target != actor:
        text += f" {_name(target)}"
    return text + "."
