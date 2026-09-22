from config.hosts import with_render_hostname


def test_appends_render_hostname_to_allowed_hosts_and_csrf():
    hosts, origins = with_render_hostname(
        ["localhost"],
        ["https://fortuna-beige.vercel.app"],
        "fortuna-api-337z.onrender.com",
    )
    assert hosts == ["localhost", "fortuna-api-337z.onrender.com"]
    assert origins == [
        "https://fortuna-beige.vercel.app",
        "https://fortuna-api-337z.onrender.com",
    ]


def test_does_not_duplicate_when_already_listed():
    hosts, origins = with_render_hostname(
        ["fortuna-api-337z.onrender.com"],
        ["https://fortuna-api-337z.onrender.com"],
        "fortuna-api-337z.onrender.com",
    )
    assert hosts == ["fortuna-api-337z.onrender.com"]
    assert origins == ["https://fortuna-api-337z.onrender.com"]


def test_ignores_blank_render_hostname():
    hosts, origins = with_render_hostname(["localhost"], [], "")
    assert hosts == ["localhost"]
    assert origins == []
