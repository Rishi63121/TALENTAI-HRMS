import pytest


def preflight(client, origin):
    return client.options(
        "/auth/login",
        headers={
            "Origin": origin,
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type",
        },
    )


@pytest.mark.parametrize(
    "origin",
    ["http://localhost:5173", "http://192.168.0.3:5173", "http://10.0.0.7:5173", "http://172.20.1.5:5173"],
)
def test_local_network_origins_allowed_in_development(client, origin):
    r = preflight(client, origin)
    assert r.status_code == 200
    assert r.headers["access-control-allow-origin"] == origin


@pytest.mark.parametrize("origin", ["https://evil.example.com", "http://192.168.0.3.evil.com", "http://172.32.0.1:5173"])
def test_other_origins_rejected(client, origin):
    assert "access-control-allow-origin" not in preflight(client, origin).headers
