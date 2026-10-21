import itertools

import pytest

from backend.models.models import Candidate, EmailLog
from backend.services import email_service
from database.db import SessionLocal

_counter = itertools.count(1)


@pytest.fixture()
def outbox(monkeypatch):
    """SMTP configured, but messages are captured instead of sent."""
    sent = []
    monkeypatch.setenv("SMTP_HOST", "smtp.test")
    monkeypatch.setenv("SMTP_FROM", "TalentAI <hr@test.com>")
    monkeypatch.setenv("COMPANY_NAME", "Acme")
    monkeypatch.setattr(email_service, "_send_smtp", sent.append)
    return sent


def make_candidate(name="Ada Lovelace", email="auto"):
    n = next(_counter)
    with SessionLocal() as db:
        c = Candidate(name=name, email=f"cand{n}@example.com" if email == "auto" else email)
        db.add(c)
        db.commit()
        return c.id


def logs(candidate_id):
    with SessionLocal() as db:
        rows = db.query(EmailLog).filter(EmailLog.candidate_id == candidate_id).order_by(EmailLog.id).all()
        return [(r.template, r.status, r.error) for r in rows]


def start(client, headers, cid, **params):
    return client.post("/onboarding/create", json={"candidate_id": cid}, params=params, headers=headers)


def move(client, headers, cid, status, **params):
    return client.patch(f"/onboarding/{cid}/status", params={"status": status, **params}, headers=headers)


def test_accepted_rejected_and_hired_emails(client, recruiter, outbox):
    a, b = make_candidate("Ada Lovelace"), make_candidate("Grace Hopper")

    r = start(client, recruiter, a)
    assert r.status_code == 200 and r.json()["email"]["queued"] is True
    assert logs(a) == [("accepted", "sent", None)]
    assert outbox[0]["To"].startswith("cand") and "Ada Lovelace" in outbox[0].get_body(("plain",)).get_content()
    assert "Acme" in outbox[0]["Subject"]

    assert move(client, recruiter, a, "completed").json()["email"]["template"] == "hired"
    start(client, recruiter, b)
    assert move(client, recruiter, b, "rejected").json()["email"]["template"] == "rejected"

    assert logs(a) == [("accepted", "sent", None), ("hired", "sent", None)]
    assert logs(b) == [("accepted", "sent", None), ("rejected", "sent", None)]
    rejection = outbox[-1].get_body(("plain",)).get_content()
    assert "not to move forward" in rejection and "Grace Hopper" in rejection


def test_in_progress_sends_nothing(client, recruiter, outbox):
    cid = make_candidate()
    start(client, recruiter, cid)
    outbox.clear()
    assert move(client, recruiter, cid, "in_progress").json()["email"] is None
    assert outbox == []


def test_same_email_is_never_sent_twice(client, recruiter, outbox):
    cid = make_candidate()
    start(client, recruiter, cid)
    move(client, recruiter, cid, "rejected")
    again = move(client, recruiter, cid, "rejected").json()
    assert again["email"] is None  # status did not change
    move(client, recruiter, cid, "pending")
    third = move(client, recruiter, cid, "rejected").json()
    assert third["email"]["queued"] is False and "already" in third["email"]["reason"]
    assert [t for t, _, _ in logs(cid)].count("rejected") == 1


def test_notify_false_and_auto_email_off(client, recruiter, outbox, monkeypatch):
    quiet = make_candidate()
    assert start(client, recruiter, quiet, notify="false").json()["email"] is None
    assert logs(quiet) == []

    monkeypatch.setenv("AUTO_EMAIL", "false")
    off = make_candidate()
    assert start(client, recruiter, off).json()["email"] is None
    assert logs(off) == []


def test_candidate_without_email(client, recruiter, outbox):
    cid = make_candidate(email=None)
    r = start(client, recruiter, cid).json()
    assert r["email"]["queued"] is False and "no email" in r["email"]["reason"]
    assert logs(cid) == []


def test_not_configured_is_recorded_as_skipped_then_resendable(client, recruiter, monkeypatch):
    monkeypatch.delenv("SMTP_HOST", raising=False)
    cid = make_candidate()
    r = start(client, recruiter, cid).json()
    assert r["status"] == "pending" and r["email"]["queued"] is False
    assert logs(cid)[0][:2] == ("accepted", "skipped")

    email_id = next(e["id"] for e in client.get("/emails", headers=recruiter).json() if e["candidate_id"] == cid)
    assert client.post(f"/emails/{email_id}/resend", headers=recruiter).status_code == 400  # still not set up

    sent = []
    monkeypatch.setenv("SMTP_HOST", "smtp.test")
    monkeypatch.setattr(email_service, "_send_smtp", sent.append)
    assert client.post(f"/emails/{email_id}/resend", headers=recruiter).status_code == 200
    assert logs(cid)[0][:2] == ("accepted", "sent") and len(sent) == 1


def test_smtp_failure_is_logged_and_does_not_break_the_status_change(client, recruiter, monkeypatch):
    monkeypatch.setenv("SMTP_HOST", "smtp.test")

    def boom(_):
        raise ConnectionRefusedError("mail server down")

    monkeypatch.setattr(email_service, "_send_smtp", boom)
    cid = make_candidate()
    assert start(client, recruiter, cid).status_code == 200
    (template, status, error), = logs(cid)
    assert (template, status) == ("accepted", "failed") and "mail server down" in error
    # the status itself still changed
    assert any(o["candidate_id"] == cid and o["status"] == "pending" for o in client.get("/onboarding", headers=recruiter).json())


def test_names_cannot_inject_headers_or_html(outbox):
    subject, text, page = email_service.render("accepted", "Eve\r\nBcc: spy@evil.com <b>", "Dev\nRole")
    assert "\n" not in subject and "\r" not in subject
    assert "<b>" not in page and "&lt;b&gt;" in page


def test_email_endpoints_permissions(client, employee, recruiter, admin, outbox):
    assert client.get("/emails", headers=employee).status_code == 403
    assert client.get("/emails/status", headers=employee).status_code == 403
    assert client.get("/emails/status", headers=recruiter).json()["configured"] is True
    assert client.post("/emails/test", json={"to": "me@example.com"}, headers=recruiter).status_code == 403
    assert client.post("/emails/test", json={"to": "not-an-email"}, headers=admin).status_code == 422
    assert client.post("/emails/test", json={"to": "me@example.com"}, headers=admin).status_code == 200
    assert outbox[-1]["To"] == "me@example.com"


def test_deleting_a_candidate_removes_their_email_log(client, recruiter, outbox):
    cid = make_candidate()
    start(client, recruiter, cid)
    assert logs(cid)
    assert client.delete(f"/candidates/{cid}", headers=recruiter).status_code == 200
    assert logs(cid) == []
