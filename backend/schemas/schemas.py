from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime


# ── Auth ──────────────────────────────────────────────────────────────────────

class LoginRequest(BaseModel):
    email: str
    password: str


class LoginResponse(BaseModel):
    token: str
    role: str
    name: Optional[str] = None
    email: Optional[str] = None
    user_id: Optional[int] = None


class UserCreate(BaseModel):
    name: str
    email: str
    password: str
    role: str = "recruiter"


# ── Jobs ──────────────────────────────────────────────────────────────────────

class JobRequest(BaseModel):
    title: str
    description: str
    required_skills: List[str]


class JobUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    required_skills: Optional[List[str]] = None


class JobResponse(BaseModel):
    job_id: int
    message: str


class JobListItem(BaseModel):
    id: int
    title: str

    class Config:
        from_attributes = True


# ── Resumes ───────────────────────────────────────────────────────────────────

class ResumeUploadResponse(BaseModel):
    candidate_id: int
    message: str
    name: Optional[str] = None
    skills: List[str] = []


# ── Candidates ────────────────────────────────────────────────────────────────

class ScreenRequest(BaseModel):
    candidate_id: int
    job_id: int


class CandidateScoreResponse(BaseModel):
    candidate_id: int
    score: float
    matched_skills: List[str]
    missing_skills: List[str]
    summary: str = ""
    source: str = "ai"  # "ai" or "keyword" (fallback when the AI service is unavailable)


class CandidateRankItem(BaseModel):
    candidate_id: int
    rank: int
    score: float


class CandidateDetail(BaseModel):
    candidate_id: int
    name: str
    score: Optional[float] = None
    email: Optional[str] = None
    education: Optional[str] = None
    experience_years: Optional[int] = None


# ── Interview ─────────────────────────────────────────────────────────────────

class InterviewQuestionRequest(BaseModel):
    candidate_id: int


class InterviewQuestionResponse(BaseModel):
    questions: List[str]


# ── Onboarding ────────────────────────────────────────────────────────────────

class OnboardingRequest(BaseModel):
    candidate_id: int


class OnboardingResponse(BaseModel):
    status: str
    email: Optional[dict] = None  # what happened with the candidate email, if one was triggered


# ── Dashboard ─────────────────────────────────────────────────────────────────

class DashboardResponse(BaseModel):
    total_candidates: int
    jobs: int
    screened: int
# ================= EMPLOYEE =================

class EmployeeCreate(BaseModel):
    name: str
    email: str
    department: str
    designation: str
    salary: float


class EmployeeUpdate(BaseModel):
    name: Optional[str] = None
    department: Optional[str] = None
    designation: Optional[str] = None
    salary: Optional[float] = None


class EmployeeResponse(EmployeeCreate):
    id: int

    class Config:
        from_attributes = True


# ================= ATTENDANCE =================

class AttendanceCreate(BaseModel):
    employee_id: int
    status: str  # Present / Absent / WFH / Leave


# ================= PAYROLL =================

class PayrollCreate(BaseModel):
    employee_id: int
    basic_salary: float
    bonus: float = 0
    deductions: float = 0
    month: str


# ================= PERFORMANCE =================

class PerformanceCreate(BaseModel):
    employee_id: int
    rating: int
    comments: str