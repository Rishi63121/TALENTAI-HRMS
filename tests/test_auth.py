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


# ---- recruiter approval ------------------------------------------------------

def _register(client, email, role="recruiter"):
    return client.post("/auth/register", json={"name": "New Person", "email": email, "password": "secret1", "role": role})


def _login(client, email, password="secret1"):
    return client.post("/auth/login", json={"email": email, "password": password})


def test_new_recruiter_is_pending_and_cannot_sign_in(client):
    r = _register(client, "pending.rec@test.com")
    assert r.status_code == 201
    assert r.json()["status"] == "pending"
    blocked = _login(client, "pending.rec@test.com")
    assert blocked.status_code == 403
    assert "approval" in blocked.json()["detail"].lower()


def test_wrong_password_does_not_reveal_pending_state(client):
    _register(client, "hidden.rec@test.com")
    r = _login(client, "hidden.rec@test.com", "not-the-password")
    assert r.status_code == 401


def test_employee_signs_in_immediately(client):
    assert _register(client, "instant.emp@test.com", "employee").json()["status"] == "active"
    assert _login(client, "instant.emp@test.com").status_code == 200


def test_admin_approves_then_recruiter_can_sign_in(client, admin, recruiter):
    rid = _register(client, "approve.me@test.com").json()["user_id"]
    listing = client.get("/recruiters", headers=admin).json()
    me = next(x for x in listing if x["id"] == rid)
    assert me["status"] == "pending"
    assert listing[0]["status"] == "pending"  # pending requests are listed first

    assert client.post(f"/recruiters/{rid}/approve", headers=recruiter).status_code == 403
    assert client.post(f"/recruiters/{rid}/approve", headers=admin).json()["status"] == "active"
    assert _login(client, "approve.me@test.com").status_code == 200


def test_rejected_recruiter_is_blocked_and_existing_session_stops(client, admin):
    rid = _register(client, "reject.me@test.com").json()["user_id"]
    client.post(f"/recruiters/{rid}/approve", headers=admin)
    token = _login(client, "reject.me@test.com").json()["token"]
    headers = {"Authorization": f"Bearer {token}"}
    assert client.get("/jobs", headers=headers).status_code == 200

    assert client.post(f"/recruiters/{rid}/reject", headers=admin).json()["status"] == "rejected"
    assert client.get("/jobs", headers=headers).status_code == 403  # already signed-in session is cut off
    assert _login(client, "reject.me@test.com").status_code == 403

    client.post(f"/recruiters/{rid}/approve", headers=admin)  # an admin can restore access
    assert _login(client, "reject.me@test.com").status_code == 200


def test_pending_requests_show_up_in_admin_activity_only(client, admin, recruiter):
    _register(client, "feed.rec@test.com")
    admin_events = client.get("/insights/activity", headers=admin).json()
    assert any(e["kind"] == "recruiter" and e["detail"] == "New Person" for e in admin_events)
    assert not any(e["kind"] == "recruiter" for e in client.get("/insights/activity", headers=recruiter).json())


def test_unknown_recruiter_id_is_404(client, admin):
    assert client.post("/recruiters/999999/approve", headers=admin).status_code == 404
