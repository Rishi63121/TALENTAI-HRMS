import pytest

from backend.services.rate_limit import AUTH_LIMIT, limiter


@pytest.fixture()
def limiting_on():
    limiter.reset()
    limiter.enabled = True
    yield
    limiter.enabled = False
    limiter.reset()


def test_login_is_rate_limited(client, limiting_on):
    attempts = int(AUTH_LIMIT.split("/")[0])
    body = {"email": "admin@test.com", "password": "wrong"}
    for _ in range(attempts):
        assert client.post("/auth/login", json=body).status_code == 401
    r = client.post("/auth/login", json=body)
    assert r.status_code == 429
    assert r.json()["code"] == "rate_limited"
    assert int(r.headers["retry-after"]) >= 1


def test_health_is_exempt(client, limiting_on):
    for _ in range(200):
        assert client.get("/health").status_code == 200
