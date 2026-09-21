import secrets
import string
import uuid

from django.db import models

ROOM_CODE_ALPHABET = string.ascii_uppercase.replace("O", "").replace(
    "I", ""
) + string.digits.replace("0", "").replace("1", "")
ROOM_CODE_LENGTH = 6

# Sala/instância sem jogador ativo expira depois desse tempo (ver architecture_docs/mvp.md,
# regras transversais). A limpeza em si é feita por um management command/job agendado, ainda
# não implementado nesta fase.
ROOM_INACTIVITY_TIMEOUT_SECONDS = 60 * 60

AVATAR_KEYS = (
    "owl",
    "laurel",
    "lyre",
    "column",
    "sun",
    "trident",
    "mask",
    "cornucopia",
)
AVATAR_CHOICES = [(key, key) for key in AVATAR_KEYS]


def pick_avatar() -> str:
    """Ícone de perfil aleatório naquela sala — não é conta persistente (ver idea.md)."""
    return secrets.choice(AVATAR_KEYS)


def generate_room_code() -> str:
    """Código curto, sem caracteres ambíguos (sem O/0/I/1), para caber num link de convite."""
    return "".join(secrets.choice(ROOM_CODE_ALPHABET) for _ in range(ROOM_CODE_LENGTH))


class Room(models.Model):
    code = models.CharField(max_length=12, unique=True, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        if not self.code:
            self.code = self._generate_unique_code()
        super().save(*args, **kwargs)

    @classmethod
    def _generate_unique_code(cls) -> str:
        code = generate_room_code()
        while cls.objects.filter(code=code).exists():
            code = generate_room_code()
        return code

    def __str__(self) -> str:
        return self.code


class Player(models.Model):
    room = models.ForeignKey(Room, related_name="players", on_delete=models.CASCADE)
    display_name = models.CharField(max_length=32)
    token = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    avatar = models.CharField(max_length=16, choices=AVATAR_CHOICES, default=pick_avatar)
    is_connected = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    last_seen_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["room", "display_name"], name="unique_display_name_per_room"
            )
        ]

    def __str__(self) -> str:
        return f"{self.display_name} @ {self.room.code}"


class ChatMessage(models.Model):
    """
    Mensagem de texto da sala de espera (`instance_id` nulo) ou de uma instância de jogo
    (UUID da GameInstance, sem FK para o app games — evita import circular).
    """

    room = models.ForeignKey(Room, related_name="messages", on_delete=models.CASCADE)
    instance_id = models.UUIDField(null=True, blank=True, db_index=True)
    player = models.ForeignKey(Player, related_name="messages", on_delete=models.CASCADE)
    text = models.CharField(max_length=400)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]

    def __str__(self) -> str:
        return f"{self.player.display_name}: {self.text[:40]}"
