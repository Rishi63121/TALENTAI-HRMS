import pdfplumber
import PyPDF2
import re
import os
from typing import Dict, Any


def extract_text_from_pdf(pdf_path: str) -> str:
    """Extract text using pdfplumber first; fall back to PyPDF2."""
    text = ""
    try:
        with pdfplumber.open(pdf_path) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    text += page_text + "\n"
    except Exception:
        pass

    if not text.strip():
        try:
            with open(pdf_path, "rb") as f:
                reader = PyPDF2.PdfReader(f)
                for page in reader.pages:
                    text += page.extract_text() or ""
        except Exception:
            pass

    return text


def parse_resume(pdf_path: str) -> Dict[str, Any]:
    """Parse a resume PDF and return structured candidate info."""
    text = extract_text_from_pdf(pdf_path)
    return {
        "raw_text": text,
        "name": _extract_name(text),
        "email": _extract_email(text),
        "experience_years": _extract_experience_years(text),
        "education": _extract_education(text),
        "skills": _extract_skills(text),
    }


# ── Extraction helpers ────────────────────────────────────────────────────────

def _extract_email(text: str) -> str:
    match = re.search(r"[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+", text)
    return match.group(0) if match else ""


def _extract_name(text: str) -> str:
    """Heuristic: the first non-empty line is typically the candidate's name."""
    lines = [l.strip() for l in text.splitlines() if l.strip()]
    for line in lines[:5]:
        # Skip lines that look like section headers or contact info
        if re.search(r"@|http|www|\d{3}", line):
            continue
        if len(line.split()) <= 5:
            return line
    return lines[0] if lines else "Unknown"


def _extract_experience_years(text: str) -> int:
    """Look for patterns like '5 years', '3+ years of experience'."""
    patterns = [
        r"(\d+)\+?\s*years? of experience",
        r"experience[:\s]+(\d+)\+?\s*years?",
        r"(\d+)\+?\s*years? experience",
    ]
    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            return int(match.group(1))
    return 0


def _extract_education(text: str) -> str:
    """Return the first line containing a degree keyword."""
    degree_keywords = [
        "bachelor", "master", "phd", "b.tech", "m.tech", "b.e", "m.e",
        "b.sc", "m.sc", "mba", "bca", "mca", "diploma",
    ]
    for line in text.splitlines():
        lower = line.lower()
        if any(kw in lower for kw in degree_keywords):
            return line.strip()
    return ""


_COMMON_SKILLS = [
    "python", "java", "javascript", "typescript", "c++", "c#", "go", "rust",
    "fastapi", "django", "flask", "react", "vue", "angular", "node",
    "sql", "postgresql", "mysql", "sqlite", "mongodb", "redis",
    "docker", "kubernetes", "aws", "gcp", "azure", "linux",
    "machine learning", "deep learning", "nlp", "tensorflow", "pytorch",
    "scikit-learn", "pandas", "numpy", "spark", "kafka",
    "git", "ci/cd", "restful", "graphql", "microservices",
    "gemini", "openai", "langchain", "llm",
]


def _extract_skills(text: str) -> list:
    lower = text.lower()
    found = []
    for skill in _COMMON_SKILLS:
        # Whole-token match so "go" does not fire on "good" and "java" not on "javascript".
        pattern = r"(?<![a-z0-9+#])" + re.escape(skill) + r"(?![a-z0-9+#])"
        if re.search(pattern, lower):
            found.append(skill)
    return list(dict.fromkeys(found))  # deduplicate while preserving order
