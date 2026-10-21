#!/usr/bin/env python3
"""
Seed script.

    python seed.py          -> creates the default admin only
    python seed.py --demo   -> also adds demo recruiter/employee accounts and sample data
                               (jobs, employees, attendance, payroll, reviews, candidates)

Safe to run repeatedly: existing records are left alone.
"""
import json
import os
import random
import sys
from datetime import datetime, timedelta

sys.path.insert(0, os.path.dirname(__file__))

from database.db import SessionLocal  # noqa: E402
from database.migrate import upgrade_to_head  # noqa: E402
from backend.models.models import (  # noqa: E402
    Attendance,
    Candidate,
    CandidateScore,
    Employee,
    Job,
    OnboardingRecord,
    Payroll,
    PerformanceReview,
    User,
)
from backend.services.auth_service import hash_password  # noqa: E402
from backend.services.ranking_service import recompute_ranks  # noqa: E402

DEMO_PASSWORD = "Demo@1234"


def ensure_user(db, name, email, password, role):
    user = db.query(User).filter(User.email == email).first()
    if user:
        return user, False
    user = User(name=name, email=email, password_hash=hash_password(password), role=role)
    db.add(user)
    db.commit()
    return user, True


def seed_demo(db):
    rng = random.Random(42)

    ensure_user(db, "Riya Recruiter", "recruiter@talentai.com", DEMO_PASSWORD, "recruiter")
    ensure_user(db, "Ethan Employee", "employee@talentai.com", DEMO_PASSWORD, "employee")

    # ---- employees -------------------------------------------------------
    people = [
        ("Ethan Employee", "employee@talentai.com", "Engineering", "Software Engineer", 95000),
        ("Priya Sharma", "priya.sharma@talentai.com", "Engineering", "Senior Engineer", 128000),
        ("Marcus Lee", "marcus.lee@talentai.com", "Design", "Product Designer", 88000),
        ("Aisha Khan", "aisha.khan@talentai.com", "Sales", "Account Executive", 82000),
        ("Diego Alvarez", "diego.alvarez@talentai.com", "Operations", "Operations Lead", 91000),
        ("Sofia Rossi", "sofia.rossi@talentai.com", "People", "HR Business Partner", 86000),
        ("Noah Williams", "noah.williams@talentai.com", "Engineering", "Data Engineer", 112000),
        ("Hana Suzuki", "hana.suzuki@talentai.com", "Finance", "Financial Analyst", 90000),
    ]
    employees = []
    for name, email, dept, role, salary in people:
        emp = db.query(Employee).filter(Employee.email == email).first()
        if not emp:
            emp = Employee(
                name=name,
                email=email,
                department=dept,
                designation=role,
                salary=salary,
                joining_date=datetime.utcnow() - timedelta(days=rng.randint(60, 900)),
            )
            db.add(emp)
            db.commit()
            ensure_user(db, name, email, DEMO_PASSWORD, "employee")
            new = True
        else:
            new = False
        employees.append((emp, new))

    today = datetime.utcnow().replace(hour=9, minute=0, second=0, microsecond=0)
    for emp, new in employees:
        if not new:
            continue
        # attendance: last 14 weekdays
        for back in range(14):
            day = today - timedelta(days=back)
            if day.weekday() >= 5:
                continue
            status = rng.choices(["Present", "WFH", "Leave", "Absent"], [72, 17, 7, 4])[0]
            db.add(Attendance(employee_id=emp.id, date=day, status=status))
        # payroll: last 3 months
        for back in (2, 1, 0):
            month = (today.replace(day=1) - timedelta(days=30 * back)).strftime("%B %Y")
            basic = round(emp.salary / 12, 2)
            bonus = rng.choice([0, 0, 250, 500, 1000])
            deductions = round(basic * 0.12, 2)
            db.add(
                Payroll(
                    employee_id=emp.id,
                    basic_salary=basic,
                    bonus=bonus,
                    deductions=deductions,
                    net_salary=basic + bonus - deductions,
                    month=month,
                )
            )
        # reviews
        for rating, comment in rng.sample(
            [
                (5, "Outstanding ownership and delivery this quarter."),
                (4, "Consistently reliable and a great collaborator."),
                (4, "Strong technical growth, mentoring teammates well."),
                (3, "Meets expectations; could be more proactive in planning."),
            ],
            k=2,
        ):
            db.add(
                PerformanceReview(
                    employee_id=emp.id,
                    rating=rating,
                    comments=comment,
                    created_at=datetime.utcnow() - timedelta(days=rng.randint(5, 120)),
                )
            )
    db.commit()

    # ---- jobs & candidates ----------------------------------------------
    if db.query(Job).count() == 0:
        jobs = [
            ("Senior Backend Engineer", "Build and scale our FastAPI services.", ["Python", "FastAPI", "PostgreSQL", "Docker", "AWS"]),
            ("Frontend Engineer", "Craft delightful, fast React interfaces.", ["React", "TypeScript", "Tailwind", "Testing"]),
            ("Data Scientist", "Turn hiring data into insight with ML.", ["Python", "Pandas", "Machine Learning", "SQL"]),
        ]
        job_rows = []
        for title, desc, skills in jobs:
            job = Job(title=title, description=desc, required_skills=json.dumps(skills))
            db.add(job)
            db.commit()
            job_rows.append(job)

        candidates = [
            ("Alex Morgan", "alex.morgan@example.com", 6, 0),
            ("Jordan Blake", "jordan.blake@example.com", 4, 0),
            ("Taylor Quinn", "taylor.quinn@example.com", 8, 0),
            ("Casey Nguyen", "casey.nguyen@example.com", 3, 1),
            ("Riley Chen", "riley.chen@example.com", 5, 1),
            ("Morgan Patel", "morgan.patel@example.com", 2, 2),
            ("Jamie Fox", "jamie.fox@example.com", 7, None),
        ]
        statuses = [None, "pending", "completed", "in_progress", None, "rejected", None]
        for (name, email, years, job_idx), onboarding in zip(candidates, statuses):
            if db.query(Candidate).filter(Candidate.email == email).first():
                continue
            cand = Candidate(name=name, email=email, experience_years=years, education="B.Tech, Computer Science")
            db.add(cand)
            db.commit()
            if job_idx is not None:
                job = job_rows[job_idx]
                skills = json.loads(job.required_skills)
                have = skills[: max(1, int(len(skills) * rng.uniform(0.4, 1.0)))]
                missing = [s for s in skills if s not in have]
                db.add(
                    CandidateScore(
                        candidate_id=cand.id,
                        job_id=job.id,
                        match_score=round(len(have) / len(skills) * 100 - rng.uniform(0, 8), 1),
                        matched_skills=json.dumps(have),
                        missing_skills=json.dumps(missing),
                    )
                )
                db.commit()
            if onboarding:
                db.add(OnboardingRecord(candidate_id=cand.id, status=onboarding))
                db.commit()
        for job in job_rows:
            recompute_ranks(job.id, db)

    print("Demo data ready.")
    print(f"  recruiter@talentai.com / {DEMO_PASSWORD}")
    print(f"  employee@talentai.com  / {DEMO_PASSWORD}")


def main():
    upgrade_to_head()
    db = SessionLocal()
    try:
        _, created = ensure_user(db, "Admin", "admin@talentai.com", "admin123", "admin")
        if created:
            print("Admin user created - email: admin@talentai.com | password: admin123")
            print("Change this password before using the app with real data.")
        else:
            print("Admin user already exists.")

        if "--demo" in sys.argv:
            seed_demo(db)
    finally:
        db.close()


if __name__ == "__main__":
    main()
