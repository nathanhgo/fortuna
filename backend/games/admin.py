from django.contrib import admin

from .models import GameInstance, GameParticipant


class GameParticipantInline(admin.TabularInline):
    model = GameParticipant
    extra = 0
    readonly_fields = ["joined_at"]


@admin.register(GameInstance)
class GameInstanceAdmin(admin.ModelAdmin):
    list_display = ["id", "game", "room", "status", "created_at"]
    list_filter = ["game", "status"]
    readonly_fields = ["id", "created_at", "updated_at"]
    inlines = [GameParticipantInline]
