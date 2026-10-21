import json
import logging
import os
import re
from typing import Dict, Any, List

from pathlib import Path
from dotenv import load_dotenv
from openai import OpenAI

logger = logging.getLogger("talentai.ai")

dotenv_path = Path(__file__).resolve().parent.parent.parent / ".env"
load_dotenv(dotenv_path=dotenv_path)
load_dotenv()

# ==========================================================
# GROQ CONFIGURATION
# ==========================================================

client = OpenAI(
    api_key=os.getenv("GROQ_API_KEY") or "dummy-groq-key",
    base_url="https://api.groq.com/openai/v1"
)

# Groq retires models over time; override with GROQ_MODEL in .env without touching code.
MODEL_NAME = os.getenv("GROQ_MODEL") or "openai/gpt-oss-120b"


# ==========================================================
# LLM CALL
# ==========================================================

def _call_llm(prompt: str) -> str:
    if not os.getenv("GROQ_API_KEY"):
        logger.warning("GROQ_API_KEY is not set; using fallback logic")
        return ""
    try:
        response = client.chat.completions.create(
            model=MODEL_NAME,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
            max_tokens=1000,
            timeout=30,
        )
        return response.choices[0].message.content or ""
    except Exception as exc:  # network, quota, auth...
        logger.warning("Groq request failed: %s", exc)
        return ""


# ==========================================================
# JSON PARSER
# ==========================================================

def _parse_json_response(text: str) -> Any:
    text = re.sub(r"```(?:json)?", "", text).strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        # The model sometimes wraps JSON in prose: grab the first {...} or [...] block.
        match = re.search(r"(\{.*\}|\[.*\])", text, re.DOTALL)
        if match:
            return json.loads(match.group(1))
        raise


# ==========================================================
# CANDIDATE SCORING
# ==========================================================

def score_candidate(
    resume_text: str,
    candidate_skills: List[str],
    job_title: str,
    job_description: str,
    required_skills: List[str],
) -> Dict[str, Any]:

    prompt = f"""
You are an expert HR recruiter.

Evaluate the candidate against the job requirements.

SCORING RULES:

- Candidate has ALL required skills = score between 90 and 100
- Candidate has MOST required skills = score between 70 and 89
- Candidate has SOME required skills = score between 40 and 69
- Candidate has FEW required skills = score between 0 and 39

JOB TITLE:
{job_title}

JOB DESCRIPTION:
{job_description}

REQUIRED SKILLS:
{', '.join(required_skills)}

CANDIDATE SKILLS:
{', '.join(candidate_skills)}

RESUME:
{resume_text[:3000]}

Return ONLY valid JSON.

Example:

{{
    "match_score": 95,
    "matched_skills": ["Python", "FastAPI"],
    "missing_skills": ["Docker"],
    "summary": "Strong candidate with most required skills."
}}

Do not return markdown.
Do not return explanations.
Return only JSON.
"""

    raw = _call_llm(prompt)

    try:

        if raw:

            result = _parse_json_response(raw)

            return {
                "match_score": max(0.0, min(100.0, float(result.get("match_score", 0)))),
                "matched_skills": result.get("matched_skills", []),
                "missing_skills": result.get("missing_skills", []),
                "summary": result.get(
                    "summary",
                    "Candidate evaluated using AI."
                ),
                "source": "ai",
            }

    except Exception as e:
        logger.warning("AI scoring parse error: %s", e)

    # ======================================================
    # FALLBACK SCORING
    # ======================================================

    matched = [
        skill
        for skill in required_skills
        if skill.lower() in resume_text.lower()
    ]

    missing = [
        skill
        for skill in required_skills
        if skill not in matched
    ]

    score = (
        len(matched) /
        max(len(required_skills), 1)
    ) * 100

    return {
        "match_score": round(score, 2),
        "matched_skills": matched,
        "missing_skills": missing,
        "summary": "Score computed via keyword matching (AI unavailable).",
        "source": "keyword",
    }


# ==========================================================
# INTERVIEW QUESTIONS
# ==========================================================

def generate_interview_questions(
    candidate_name: str,
    candidate_skills: List[str],
    resume_text: str,
    job_title: str = "",
) -> List[str]:

    prompt = f"""
You are a senior technical interviewer.

Generate 8 personalized interview questions.

Candidate Name:
{candidate_name}

Skills:
{', '.join(candidate_skills)}

Job Role:
{job_title}

Resume:
{resume_text[:2000]}

Rules:
- Mix technical questions.
- Mix behavioural questions.
- Mix situational questions.
- Questions must relate to candidate profile.

Return ONLY a JSON array.

Example:

[
  "Question 1",
  "Question 2"
]
"""

    raw = _call_llm(prompt)

    try:

        if raw:

            questions = _parse_json_response(raw)

            if isinstance(questions, list):
                return questions

    except Exception as e:
        logger.warning("Question generation parse error: %s", e)

    # ======================================================
    # FALLBACK QUESTIONS
    # ======================================================

    fallback = [
        f"Tell me about your experience with {skill}."
        for skill in candidate_skills[:5]
    ]

    fallback.extend([
        "Describe a challenging project you worked on.",
        "How do you approach debugging a difficult issue?",
        "Why are you interested in this role?",
        "Where do you see yourself in 3 years?"
    ])

    return fallback