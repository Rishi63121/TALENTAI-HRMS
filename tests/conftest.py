import os
import tempfile
from pathlib import Path

# Must be set before the app (and database.db) is imported.
_tmp = tempfile.mkdtemp(prefix="talentai-test-")
# CI sets TEST_DATABASE_URL to run the same suite against PostgreSQL.
os.environ["DATABASE_URL"] = os.getenv("TEST_DATABASE_URL") or f"sqlite:///{(Path(_tmp) / 'test.db').as_posix()}"
os.environ["GROQ_API_KEY"] = ""  # force the keyword-scoring fallback
os.environ["RATE_LIMIT_ENABLED"] = "false"  # test_rate_limit.py switches it on explicitly

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from backend.main import app  # noqa: E402
from backend.models.models import User  # noqa: E402
from backend.services.auth_service import hash_password  # noqa: E402
from database.db import SessionLocal  # noqa: E402

PASSWORD = "Test@1234"


@pytest.fixture(scope="session")
def client():
    with SessionLocal() as db:
        for name, email, role in [
            ("Admin", "admin@test.com", "admin"),
            ("Recruiter", "recruiter@test.com", "recruiter"),
            ("Employee", "employee@test.com", "employee"),
        ]:
            db.add(User(name=name, email=email, password_hash=hash_password(PASSWORD), role=role))
        db.commit()
    with TestClient(app) as c:
        yield c


def _headers(client, email):
    r = client.post("/auth/login", json={"email": email, "password": PASSWORD})
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['token']}"}


@pytest.fixture(scope="session")
def admin(client):
    return _headers(client, "admin@test.com")


@pytest.fixture(scope="session")
def recruiter(client):
    return _headers(client, "recruiter@test.com")


@pytest.fixture(scope="session")
def employee(client):
    return _headers(client, "employee@test.com")
