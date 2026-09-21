import pytest
import yaml
from django.test import Client


@pytest.mark.django_db
def test_openapi_schema_is_served_and_lists_the_room_endpoints():
    response = Client().get("/api/schema/")

    assert response.status_code == 200
    schema = yaml.safe_load(response.content)
    assert "/api/rooms/" in schema["paths"]
    assert "/api/rooms/{code}/" in schema["paths"]
    assert "/api/rooms/{code}/players/" in schema["paths"]
    assert "/api/rooms/{code}/games/" in schema["paths"]


@pytest.mark.django_db
def test_swagger_ui_is_served():
    response = Client().get("/api/docs/")

    assert response.status_code == 200
    assert b"swagger" in response.content.lower()
