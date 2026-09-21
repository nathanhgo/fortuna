"""
Configuração do Django para o backend de Fortuna.

Todo valor sensível ou dependente de ambiente vem de variáveis de ambiente (.env, nunca
commitado — ver .env.example e .cursor/rules/90-commits.mdc). Nada de segredo hardcoded aqui.
"""

import os
from pathlib import Path

from corsheaders.defaults import default_headers
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
REPO_ROOT = BASE_DIR.parent

# Um único .env na raiz do repositório, compartilhado com o frontend e com o docker-compose —
# não um .env por serviço (ver .env.example e architecture_docs/stack.md). Ao rodar via Docker,
# as variáveis já chegam via `env_file` do compose; este load_dotenv é só para quem roda o
# backend fora de container (sem Docker) — nesse caso, se o arquivo não existir, é um no-op.
load_dotenv(REPO_ROOT / ".env")


def env_bool(name: str, default: bool) -> bool:
    value = os.environ.get(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def env_list(name: str, default: list[str]) -> list[str]:
    value = os.environ.get(name)
    if not value:
        return default
    return [item.strip() for item in value.split(",") if item.strip()]


SECRET_KEY = os.environ.get("DJANGO_SECRET_KEY", "insecure-dev-key-only-for-local-use")
DEBUG = env_bool("DJANGO_DEBUG", True)
ALLOWED_HOSTS = env_list("DJANGO_ALLOWED_HOSTS", ["localhost", "127.0.0.1"])

INSTALLED_APPS = [
    # daphne precisa vir antes de django.contrib.staticfiles para o `runserver` servir ASGI
    # (WebSockets via Channels). Sem isso, o runserver cai no WSGI e o `/ws/` não funciona.
    "daphne",
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "rest_framework",
    "drf_spectacular",
    "corsheaders",
    "channels",
    "rooms",
    "games",
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"

# Banco de dados
# Em desenvolvimento local sem Postgres disponível, cai para SQLite — mas o padrão do projeto
# é Postgres (ver docker-compose.yml e architecture_docs/stack.md). Defina DATABASE_URL-like
# variáveis individuais no .env para usar Postgres.
if os.environ.get("POSTGRES_DB"):
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.postgresql",
            "NAME": os.environ["POSTGRES_DB"],
            "USER": os.environ.get("POSTGRES_USER", "fortuna"),
            "PASSWORD": os.environ.get("POSTGRES_PASSWORD", ""),
            "HOST": os.environ.get("POSTGRES_HOST", "localhost"),
            "PORT": os.environ.get("POSTGRES_PORT", "5432"),
        }
    }
else:
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": BASE_DIR / "db.sqlite3",
        }
    }

# Channels — Fase 0 usa o channel layer em memória, suficiente para um único processo.
# Trocar para channels_redis quando o projeto precisar de múltiplos workers (ver questions.md).
CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels.layers.InMemoryChannelLayer",
    }
}

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

REST_FRAMEWORK = {
    "DEFAULT_PERMISSION_CLASSES": [],
    "DEFAULT_AUTHENTICATION_CLASSES": [],
    "TEST_REQUEST_DEFAULT_FORMAT": "json",
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
}

# Fortuna não exige login para as funcionalidades essenciais (ver idea.md) — sem classes de
# autenticação/permissão globais por padrão. Views específicas que precisarem de alguma
# verificação (ex.: só o host da sala pode configurar) implementam isso explicitamente.

# Swagger/OpenAPI (drf-spectacular) — schema em /api/schema/, UI navegável em /api/docs/.
# Todas as rotas de API ficam visíveis por padrão; SERVE_PUBLIC porque o projeto não tem login.
SPECTACULAR_SETTINGS = {
    "TITLE": "Fortuna API",
    "DESCRIPTION": "API do backend de Fortuna — salas, jogadores e (nas próximas fases) jogos.",
    "VERSION": "1.0.0",
    "SERVE_INCLUDE_SCHEMA": False,
    "SERVE_PUBLIC": True,
}

CORS_ALLOWED_ORIGINS = env_list(
    "CORS_ALLOWED_ORIGINS", ["http://localhost:3000", "http://127.0.0.1:3000"]
)

# Cabeçalho customizado com o token do jogador na sala (não é login — ver rooms/auth.py).
CORS_ALLOW_HEADERS = [*default_headers, "x-player-token"]

# Internacionalização — conteúdo lido por pessoas é pt-br (ver
# .cursor/rules/00-project-context.mdc); isso inclui o admin do Django.
LANGUAGE_CODE = "pt-br"
TIME_ZONE = "America/Sao_Paulo"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
