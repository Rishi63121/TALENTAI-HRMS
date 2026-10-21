def test_health(client):
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json() == {"status": "ok", "database": "up"}


def test_login_wrong_password(client):
    r = client.post("/auth/login", json={"email": "admin@test.com", "password": "nope"})
    assert r.status_code == 401
    assert r.json()["code"] == "unauthorized"


def test_me_requires_token(client):
    assert client.get("/auth/me").status_code == 401


def test_me_returns_user(client, admin):
    r = client.get("/auth/me", headers=admin)
    assert r.status_code == 200
    assert r.json()["role"] == "admin"


def test_register_cannot_create_admin(client):
    r = client.post(
        "/auth/register",
        json={"name": "X", "email": "x@test.com", "password": "secret1", "role": "admin"},
    )
    assert r.status_code == 403


def test_register_rejects_short_password_and_duplicates(client):
    body = {"name": "Y", "email": "y@test.com", "password": "abc", "role": "employee"}
    assert client.post("/auth/register", json=body).status_code == 422
    body["password"] = "secret1"
    assert client.post("/auth/register", json=body).status_code == 201
    assert client.post("/auth/register", json=body).status_code == 400


def test_validation_error_shape(client):
    r = client.post("/auth/login", json={})
    assert r.status_code == 422
    assert r.json()["code"] == "validation_error"
