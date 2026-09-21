from django.urls import path

from . import views

urlpatterns = [
    path("rooms/", views.RoomListCreateView.as_view(), name="room-list-create"),
    path("rooms/<str:code>/", views.RoomDetailView.as_view(), name="room-detail"),
    path(
        "rooms/<str:code>/players/",
        views.RoomPlayerListCreateView.as_view(),
        name="room-player-list-create",
    ),
]
