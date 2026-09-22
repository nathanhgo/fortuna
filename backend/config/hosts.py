"""Hostname extra que o Render injeta (RENDER_EXTERNAL_HOSTNAME)."""


def with_render_hostname(
    hosts: list[str], origins: list[str], render_hostname: str
) -> tuple[list[str], list[str]]:
    host = render_hostname.strip()
    if not host:
        return hosts, origins
    next_hosts = hosts if host in hosts else [*hosts, host]
    origin = f"https://{host}"
    next_origins = origins if origin in origins else [*origins, origin]
    return next_hosts, next_origins
