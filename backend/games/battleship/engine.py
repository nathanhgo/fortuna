"""
Motor de regras da Batalha Naval — puro, sem dependência de Django/DRF/Channels
(ver .cursor/rules/10-workflow.mdc). Opera sobre um dicionário de estado serializável em JSON,
para caber direto no `GameInstance.state` (ver games/models.py) sem camada extra de tradução.

Convenções:
- Casas são pares `[linha, coluna]`, ambos 0-indexados.
- Um navio é uma lista de casas contíguas, todas na mesma linha (horizontal) ou na mesma coluna
  (vertical) — nunca diagonal (ver architecture_docs/idea.md).
- Jogadores são identificados por uma chave de texto (`str(player_id)`) — quem gera esse id é a
  camada acima (view), aqui é só uma chave de dicionário.
"""

MIN_BOARD_SIZE = 5
MAX_BOARD_SIZE = 15
MIN_SHIP_SIZE = 1
MAX_SHIP_SIZE = 5
MAX_FLEET_SIZE = 10

DEFAULT_BOARD_SIZE = 10
DEFAULT_FLEET_SIZES = [5, 4, 3, 3, 2]


class BattleshipError(ValueError):
    """Base de todos os erros de regra da Batalha Naval — sempre com mensagem em pt-BR, pois é
    a mensagem que chega até a UI (ver .cursor/rules/00-project-context.mdc)."""


class InvalidConfigError(BattleshipError):
    pass


class InvalidFleetError(BattleshipError):
    pass


class InvalidShotError(BattleshipError):
    pass


def validate_config(board_size: int, fleet_sizes: list[int]) -> None:
    if not (MIN_BOARD_SIZE <= board_size <= MAX_BOARD_SIZE):
        raise InvalidConfigError(
            f"O tabuleiro precisa ter entre {MIN_BOARD_SIZE} e {MAX_BOARD_SIZE} casas de lado."
        )
    if not fleet_sizes or len(fleet_sizes) > MAX_FLEET_SIZE:
        raise InvalidConfigError(f"Escolha entre 1 e {MAX_FLEET_SIZE} navios.")
    if any(not (MIN_SHIP_SIZE <= size <= MAX_SHIP_SIZE) for size in fleet_sizes):
        raise InvalidConfigError(
            f"Cada navio precisa ter entre {MIN_SHIP_SIZE} e {MAX_SHIP_SIZE} casas."
        )
    if sum(fleet_sizes) > board_size * board_size:
        raise InvalidConfigError("Essa frota não cabe em um tabuleiro desse tamanho.")


def initial_state(board_size: int, fleet_sizes: list[int]) -> dict:
    validate_config(board_size, fleet_sizes)
    return {
        "board_size": board_size,
        "fleet_sizes": list(fleet_sizes),
        "fleets": {},
        "turn": None,
        "winner": None,
    }


def _validate_ship_shape(cells: list[list[int]], board_size: int) -> None:
    for row, col in cells:
        if not (0 <= row < board_size and 0 <= col < board_size):
            raise InvalidFleetError("Um navio não pode ficar fora do tabuleiro.")

    rows = {row for row, _ in cells}
    cols = {col for _, col in cells}
    if len(rows) > 1 and len(cols) > 1:
        raise InvalidFleetError("Navios só podem ser posicionados na horizontal ou vertical.")

    if len(rows) == 1:
        ordered = sorted(col for _, col in cells)
    else:
        ordered = sorted(row for row, _ in cells)
    if ordered != list(range(ordered[0], ordered[0] + len(cells))):
        raise InvalidFleetError("As casas de um navio precisam ser contíguas.")


def validate_fleet(board_size: int, fleet_sizes: list[int], ships: list[list[list[int]]]) -> None:
    if not isinstance(ships, list):
        raise InvalidFleetError("Formato de frota inválido.")

    actual_sizes = sorted(len(ship) for ship in ships)
    if actual_sizes != sorted(fleet_sizes):
        raise InvalidFleetError("A frota não corresponde à configuração desta partida.")

    occupied: set[tuple[int, int]] = set()
    for ship in ships:
        cells = [(row, col) for row, col in ship]
        _validate_ship_shape([list(cell) for cell in cells], board_size)
        if occupied & set(cells):
            raise InvalidFleetError("Navios não podem se sobrepor.")
        occupied.update(cells)


def set_fleet(state: dict, player_id, ships: list[list[list[int]]]) -> None:
    player_key = str(player_id)
    if player_key in state["fleets"]:
        raise InvalidFleetError("Você já posicionou sua frota nesta partida.")

    validate_fleet(state["board_size"], state["fleet_sizes"], ships)
    state["fleets"][player_key] = {
        "ships": [[list(cell) for cell in ship] for ship in ships],
        "shots_received": [],
    }

    if len(state["fleets"]) == 2 and state["turn"] is None:
        state["turn"] = next(iter(state["fleets"]))


def _ship_at(ships: list[list[list[int]]], cell: list[int]):
    for ship in ships:
        if cell in ship:
            return ship
    return None


def _is_ship_sunk(ship: list[list[int]], shot_cells: list[list[int]]) -> bool:
    return all(cell in shot_cells for cell in ship)


def _all_ships_sunk(ships: list[list[list[int]]], shot_cells: list[list[int]]) -> bool:
    return all(_is_ship_sunk(ship, shot_cells) for ship in ships)


def _shot_cells(shots_received: list[dict]) -> list[list[int]]:
    return [shot["cell"] for shot in shots_received]


def fire(state: dict, attacker_id, target_id, cell: list[int]) -> str:
    if state["winner"] is not None:
        raise InvalidShotError("Esta partida já terminou.")

    attacker_key, target_key = str(attacker_id), str(target_id)
    if attacker_key == target_key:
        raise InvalidShotError("Não é possível atirar no próprio tabuleiro.")
    if attacker_key not in state["fleets"] or target_key not in state["fleets"]:
        raise InvalidShotError("Os dois jogadores precisam posicionar a frota antes de atirar.")
    if state["turn"] != attacker_key:
        raise InvalidShotError("Não é a sua vez de atirar.")

    cell = [int(cell[0]), int(cell[1])]
    board_size = state["board_size"]
    if not (0 <= cell[0] < board_size and 0 <= cell[1] < board_size):
        raise InvalidShotError("Esse tiro cai fora do tabuleiro.")

    target_fleet = state["fleets"][target_key]
    shot_cells_before = _shot_cells(target_fleet["shots_received"])
    if cell in shot_cells_before:
        raise InvalidShotError("Essa casa já foi atingida.")

    hit_ship = _ship_at(target_fleet["ships"], cell)
    shot_cells_after = [*shot_cells_before, cell]

    if hit_ship is None:
        result = "miss"
    elif _is_ship_sunk(hit_ship, shot_cells_after):
        result = "sunk"
    else:
        result = "hit"

    target_fleet["shots_received"].append({"cell": cell, "result": result})

    if result == "miss":
        # Regra usada pelos principais sites de Batalha Naval online: o turno só passa para o
        # outro jogador quando o tiro erra; um acerto dá o direito de atirar de novo.
        state["turn"] = target_key
    elif _all_ships_sunk(target_fleet["ships"], shot_cells_after):
        state["winner"] = attacker_key

    return result


def visible_ships_for_opponent(fleet: dict) -> list[list[list[int]]]:
    """Só revela o formato de um navio depois que ele afunda por completo — evita que a UI do
    adversário deixe escapar onde estão os navios ainda de pé (ver BUGBOT.md sobre confiar no
    backend como fonte de verdade e nunca vazar estado oculto ao cliente)."""
    shot_cells = _shot_cells(fleet["shots_received"])
    return [ship for ship in fleet["ships"] if _is_ship_sunk(ship, shot_cells)]


def serialize_state_for_player(state: dict, viewer_id) -> dict:
    """Monta a visão do estado que pode ser enviada com segurança para um jogador/espectador
    específico: a própria frota aparece completa, a do adversário só mostra navios afundados."""
    viewer_key = str(viewer_id)
    fleets = {}
    for player_key, fleet in state["fleets"].items():
        is_owner = player_key == viewer_key
        fleets[player_key] = {
            "ships": fleet["ships"] if is_owner else visible_ships_for_opponent(fleet),
            "shots_received": fleet["shots_received"],
        }

    return {
        "board_size": state["board_size"],
        "fleet_sizes": state["fleet_sizes"],
        "fleets": fleets,
        "turn": state["turn"],
        "winner": state["winner"],
    }
