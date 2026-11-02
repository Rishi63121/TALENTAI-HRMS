import pytest

JOB = {"title": "Backend Engineer", "description": "APIs", "required_skills": ["Python", "python", "SQL"]}


def test_job_create_dedupes_skills(client, recruiter):
    r = client.post("/jobs", json=JOB, headers=recruiter)
    assert r.status_code == 201
    jobs = client.get("/jobs", headers=recruiter).json()
    created = next(j for j in jobs if j["id"] == r.json()["job_id"])
    assert created["required_skills"] == ["Python", "SQL"]


def test_job_create_blocked_for_employee(client, employee):
    assert client.post("/jobs", json=JOB, headers=employee).status_code == 403


def test_job_create_requires_auth(client):
    assert client.post("/jobs", json=JOB).status_code == 401


def test_job_blank_title_rejected(client, recruiter):
    r = client.post("/jobs", json={**JOB, "title": "   "}, headers=recruiter)
    assert r.status_code == 422


EMP = {
    "name": "Ada Lovelace",
    "email": "Ada@Test.com",
    "department": "Eng",
    "designation": "Engineer",
    "salary": 50000,
}


def test_employee_crud_admin_only(client, admin, recruiter, employee):
    assert client.post("/employees", json=EMP, headers=recruiter).status_code == 403
    assert client.post("/employees", json=EMP, headers=employee).status_code == 403

    r = client.post("/employees", json=EMP, headers=admin)
    assert r.status_code == 201, r.text

    # email is normalised, duplicates rejected
    assert client.post("/employees", json=EMP, headers=admin).status_code == 400


@pytest.mark.parametrize("path", ["/employees", "/dashboard/overview", "/jobs", "/candidates"])
def test_endpoints_reject_anonymous(client, path):
    assert client.get(path).status_code == 401


def test_deleting_employee_and_job_respects_foreign_keys(client, admin, recruiter):
    """Foreign keys are enforced (as in PostgreSQL), so deletes must clean up child rows first."""
    emp = client.post(
        "/employees",
        json={**EMP, "email": "grace@test.com", "name": "Grace Hopper"},
        headers=admin,
    ).json()
    emp_id = emp.get("id") or emp.get("employee", {}).get("id")
    assert emp_id, emp
    assert client.delete(f"/employees/{emp_id}", headers=admin).status_code == 200

    job_id = client.post("/jobs", json=JOB, headers=recruiter).json()["job_id"]
    assert client.delete(f"/jobs/{job_id}", headers=recruiter).status_code == 200


# ---- insights + copilot -----------------------------------------------------

def test_activity_and_skills_are_staff_only(client, admin, recruiter, employee):
    for url in ("/insights/activity", "/insights/skills"):
        assert client.get(url).status_code == 401
        assert client.get(url, headers=employee).status_code == 403
        assert client.get(url, headers=recruiter).status_code == 200
        assert client.get(url, headers=admin).status_code == 200


def test_activity_lists_new_job(client, recruiter):
    client.post("/jobs", json={"title": "Activity Test Role", "description": "x", "required_skills": ["Go"]}, headers=recruiter)
    events = client.get("/insights/activity", headers=recruiter).json()
    assert any(e["kind"] == "job" and e["detail"] == "Activity Test Role" for e in events)
    assert all("at" in e and e["at"].endswith("Z") for e in events)


def test_copilot_answers_from_data_without_ai_key(client, recruiter, employee):
    assert client.post("/copilot/chat", json={"messages": [{"role": "user", "content": "open jobs?"}]}, headers=employee).status_code == 403
    r = client.post("/copilot/chat", json={"messages": [{"role": "user", "content": "What jobs are open?"}]}, headers=recruiter)
    assert r.status_code == 200
    assert r.json()["source"] == "data"
    assert "job" in r.json()["reply"].lower()


def test_copilot_rejects_bad_payload(client, recruiter):
    assert client.post("/copilot/chat", json={"messages": []}, headers=recruiter).status_code == 422
    assert client.post("/copilot/chat", json={"messages": [{"role": "system", "content": "x"}]}, headers=recruiter).status_code == 422
