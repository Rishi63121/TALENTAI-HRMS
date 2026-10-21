from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from database.db import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    role = Column(String, default="recruiter")
    created_at = Column(DateTime, default=datetime.utcnow)


class Job(Base):
    __tablename__ = "jobs"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(Text)
    required_skills = Column(Text)  # JSON string
    created_at = Column(DateTime, default=datetime.utcnow)

    scores = relationship("CandidateScore", back_populates="job")


class Candidate(Base):
    __tablename__ = "candidates"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True)
    education = Column(Text)
    experience_years = Column(Integer, default=0)
    resume_path = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)

    scores = relationship("CandidateScore", back_populates="candidate")
    interview_questions = relationship("InterviewQuestion", back_populates="candidate")
    onboarding = relationship("OnboardingRecord", back_populates="candidate")


class CandidateScore(Base):
    __tablename__ = "candidate_scores"

    id = Column(Integer, primary_key=True, index=True)
    candidate_id = Column(Integer, ForeignKey("candidates.id"))
    job_id = Column(Integer, ForeignKey("jobs.id"))
    match_score = Column(Float, default=0.0)
    matched_skills = Column(Text)   # JSON string
    missing_skills = Column(Text)   # JSON string
    rank = Column(Integer, default=0)

    candidate = relationship("Candidate", back_populates="scores")
    job = relationship("Job", back_populates="scores")


class InterviewQuestion(Base):
    __tablename__ = "interview_questions"

    id = Column(Integer, primary_key=True, index=True)
    candidate_id = Column(Integer, ForeignKey("candidates.id"))
    questions = Column(Text)  # JSON string
    generated_at = Column(DateTime, default=datetime.utcnow)

    candidate = relationship("Candidate", back_populates="interview_questions")


class OnboardingRecord(Base):
    __tablename__ = "onboarding_records"

    id = Column(Integer, primary_key=True, index=True)
    candidate_id = Column(Integer, ForeignKey("candidates.id"))
    status = Column(String, default="pending")
    created_at = Column(DateTime, default=datetime.utcnow)

    candidate = relationship("Candidate", back_populates="onboarding")

# ================= EMPLOYEE =================

class Employee(Base):
    __tablename__ = "employees"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False)
    department = Column(String)
    designation = Column(String)
    salary = Column(Float)
    joining_date = Column(DateTime, default=datetime.utcnow)


# ================= ATTENDANCE =================

class Attendance(Base):
    __tablename__ = "attendance"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"))
    date = Column(DateTime, default=datetime.utcnow)
    status = Column(String)  # Present / Absent / WFH / Leave


# ================= PAYROLL =================

class Payroll(Base):
    __tablename__ = "payroll"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"))

    basic_salary = Column(Float, default=0)
    bonus = Column(Float, default=0)
    deductions = Column(Float, default=0)
    net_salary = Column(Float, default=0)

    month = Column(String)


# ================= PERFORMANCE =================

class PerformanceReview(Base):
    __tablename__ = "performance_reviews"

    id = Column(Integer, primary_key=True, index=True)

    employee_id = Column(Integer, ForeignKey("employees.id"))

    rating = Column(Integer)
    comments = Column(Text)

    created_at = Column(DateTime, default=datetime.utcnow)


# ================= EMAIL LOG =================

class EmailLog(Base):
    """One row per email the system tried to send to a candidate (also the audit trail)."""
    __tablename__ = "email_log"

    id = Column(Integer, primary_key=True, index=True)
    candidate_id = Column(Integer, ForeignKey("candidates.id"), index=True)
    to_email = Column(String)
    template = Column(String)   # accepted | hired | rejected | test
    subject = Column(String)
    status = Column(String, default="queued")   # queued | sent | failed | skipped
    error = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    sent_at = Column(DateTime)
