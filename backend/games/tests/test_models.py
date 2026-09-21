import pytest

from games.models import GAME_BATTLESHIP, GameInstance, GameParticipant
from rooms.models import Player, Room


@pytest.fixture
def room():
    return Room.objects.create()


@pytest.mark.django_db
class TestGameInstanceDefaults:
    def test_new_instance_starts_in_the_configuring_status(self, room):
        instance = GameInstance.objects.create(room=room, game=GAME_BATTLESHIP)
        assert instance.status == GameInstance.STATUS_CONFIGURING

    def test_battleship_accepts_at_most_two_players(self, room):
        instance = GameInstance.objects.create(room=room, game=GAME_BATTLESHIP)
        assert instance.max_players() == 2


@pytest.mark.django_db
class TestConfigurationAuthority:
    def test_the_only_participant_has_authority(self, room):
        instance = GameInstance.objects.create(room=room, game=GAME_BATTLESHIP)
        alice = Player.objects.create(room=room, display_name="Alice")
        GameParticipant.objects.create(instance=instance, player=alice, seat=0)

        assert instance.configuration_authority() == alice

    def test_the_earliest_seated_connected_player_has_authority(self, room):
        instance = GameInstance.objects.create(room=room, game=GAME_BATTLESHIP)
        alice = Player.objects.create(room=room, display_name="Alice")
        bob = Player.objects.create(room=room, display_name="Bob")
        GameParticipant.objects.create(instance=instance, player=alice, seat=0)
        GameParticipant.objects.create(instance=instance, player=bob, seat=1)

        assert instance.configuration_authority() == alice

    def test_authority_passes_to_the_remaining_player_if_the_first_disconnects(self, room):
        instance = GameInstance.objects.create(room=room, game=GAME_BATTLESHIP)
        alice = Player.objects.create(room=room, display_name="Alice", is_connected=False)
        bob = Player.objects.create(room=room, display_name="Bob")
        GameParticipant.objects.create(instance=instance, player=alice, seat=0)
        GameParticipant.objects.create(instance=instance, player=bob, seat=1)

        assert instance.configuration_authority() == bob

    def test_spectators_never_have_authority(self, room):
        instance = GameInstance.objects.create(room=room, game=GAME_BATTLESHIP)
        alice = Player.objects.create(room=room, display_name="Alice")
        GameParticipant.objects.create(
            instance=instance, player=alice, role=GameParticipant.ROLE_SPECTATOR
        )

        assert instance.configuration_authority() is None

    def test_no_authority_without_any_participant(self, room):
        instance = GameInstance.objects.create(room=room, game=GAME_BATTLESHIP)
        assert instance.configuration_authority() is None
