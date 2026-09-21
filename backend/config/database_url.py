"""Interpreta DATABASE_URL (Neon, Render, etc.) sem depender de pacote extra."""

from urllib.parse import parse_qs, unquote, urlparse


def database_config_from_url(url: str) -> dict:
    parsed = urlparse(url)
    if parsed.scheme not in {"postgres", "postgresql"}:
        raise ValueError("DATABASE_URL precisa ser postgres:// ou postgresql://")
    query = parse_qs(parsed.query)
    sslmode = (query.get("sslmode") or ["require"])[0]
    name = unquote(parsed.path.lstrip("/"))
    return {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": name,
        "USER": unquote(parsed.username or ""),
        "PASSWORD": unquote(parsed.password or ""),
        "HOST": parsed.hostname or "",
        "PORT": str(parsed.port or 5432),
        "CONN_MAX_AGE": 60,
        "OPTIONS": {"sslmode": sslmode},
    }
