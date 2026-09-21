from django.urls import path

from . import views

urlpatterns = [
    path("", views.GameInstanceListCreateView.as_view(), name="game-instance-list-create"),
    path(
        "<uuid:instance_id>/",
        views.GameInstanceDetailView.as_view(),
        name="game-instance-detail",
    ),
    path(
        "<uuid:instance_id>/join/",
        views.GameInstanceJoinView.as_view(),
        name="game-instance-join",
    ),
    path(
        "<uuid:instance_id>/config/",
        views.GameInstanceConfigView.as_view(),
        name="game-instance-config",
    ),
    path(
        "<uuid:instance_id>/fleet/",
        views.BattleshipFleetView.as_view(),
        name="battleship-fleet",
    ),
    path(
        "<uuid:instance_id>/shots/",
        views.BattleshipShotView.as_view(),
        name="battleship-shots",
    ),
    path(
        "<uuid:instance_id>/rematch/",
        views.GameInstanceRematchView.as_view(),
        name="game-instance-rematch",
    ),
]
