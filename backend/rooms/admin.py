from django.contrib import admin

from .models import ChatMessage, Player, Room


class PlayerInline(admin.TabularInline):
    model = Player
    extra = 0
    readonly_fields = ["token", "created_at", "last_seen_at"]


@admin.register(Room)
class RoomAdmin(admin.ModelAdmin):
    list_display = ["code", "created_at"]
    readonly_fields = ["code", "created_at"]
    inlines = [PlayerInline]


@admin.register(Player)
class PlayerAdmin(admin.ModelAdmin):
    list_display = ["display_name", "avatar", "room", "is_connected", "created_at"]
    list_filter = ["is_connected"]
    readonly_fields = ["token", "created_at", "last_seen_at"]


@admin.register(ChatMessage)
class ChatMessageAdmin(admin.ModelAdmin):
    list_display = ["player", "room", "instance_id", "created_at"]
    readonly_fields = ["created_at"]
