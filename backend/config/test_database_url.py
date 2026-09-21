from config.database_url import database_config_from_url


def test_parses_a_neon_postgres_url():
    config = database_config_from_url(
        "postgresql://fortuna:s3cret%21@ep-cool.aws.neon.tech/neondb?sslmode=require"
    )
    assert config["ENGINE"] == "django.db.backends.postgresql"
    assert config["NAME"] == "neondb"
    assert config["USER"] == "fortuna"
    assert config["PASSWORD"] == "s3cret!"
    assert config["HOST"] == "ep-cool.aws.neon.tech"
    assert config["PORT"] == "5432"
    assert config["OPTIONS"]["sslmode"] == "require"
