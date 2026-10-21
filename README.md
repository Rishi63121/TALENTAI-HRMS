# TalentAI HRMS

AI-assisted recruitment and HR operations in one place. Three role-based workspaces - **Admin**, **Recruiter** and **Employee** - on a FastAPI backend and a React frontend that works on phones and laptops.

## Highlights

- **AI resume screening** - upload a PDF, pick a job, get a match score with matched/missing skills (Groq, Llama 3.3). Falls back to keyword matching - and says so - when the AI is unavailable.
- **Interview question generation** tailored to each candidate.
- **Hiring pipeline** - applied -> screened -> onboarding -> hired, with rankings per job.
- **HR operations** - employees, attendance (with employee self check-in), payroll, performance reviews.
- **Live insights** - role-aware dashboards and analytics.
- **Secure by default** - JWT auth, server-enforced roles on every endpoint, employees can only see their own attendance/payroll/reviews, admins cannot be self-registered.
- **Polished UX** - light/dark themes, smooth animations (respecting reduced-motion), skeleton loading, a branded loading screen, and error screens that explain *what happened* and *what to do* (offline, server down, session expired, no access, not found).

## Run it locally

Requirements: Python 3.10+, Node 20+.

### 1. Backend (from the project root, i.e. the folder containing `backend/`)

```bash
python -m venv venv
venv\Scripts\activate            # macOS/Linux: source venv/bin/activate
pip install -r backend/requirements.txt

copy .env.example .env           # macOS/Linux: cp .env.example .env  -> then edit it
python seed.py --demo            # creates the admin + demo data (omit --demo for the admin only)
uvicorn backend.main:app --reload
```

API: <http://localhost:8000> - interactive docs: <http://localhost:8000/docs> - health: `/health`

### 2. Frontend

```bash
cd frontend
copy .env.example .env           # optional: only needed if the API is not on localhost:8000
npm install
npm run dev
```

App: <http://localhost:5173>. The dev server also listens on your network, so you can open it from a phone on the same Wi-Fi to test the mobile layout.

### Demo accounts (after `python seed.py --demo`)

| Role      | Email                    | Password   |
| --------- | ------------------------ | ---------- |
| Admin     | admin@talentai.com       | admin123   |
| Recruiter | recruiter@talentai.com   | Demo@1234  |
| Employee  | employee@talentai.com    | Demo@1234  |

Change these before using real data. In development the login page shows one-click demo buttons.

## Configuration (`.env`)

| Variable | Purpose |
| --- | --- |
| `SECRET_KEY` | Signs login tokens. **Set a long random value.** |
| `GROQ_API_KEY` | Enables AI scoring and interview questions. Without it the app falls back to keyword matching. |
| `DATABASE_URL` | Defaults to SQLite in `database/`. Use `postgresql://user:pass@host:5432/db` for PostgreSQL. |
| `AUTO_MIGRATE` | `true` (default) applies pending migrations when the API starts. Set `false` to run `alembic upgrade head` yourself. |
| `RATE_LIMIT_DEFAULT` / `_AUTH` / `_HEAVY` | Per-IP limits: all endpoints (`120/minute`), login + register (`10/minute`), uploads + AI (`20/minute`). `RATE_LIMIT_ENABLED=false` turns limiting off. |
| `RATE_LIMIT_STORAGE_URI` | `memory://` by default. Use `redis://...` when running several workers. |
| `TRUST_PROXY` | `true` only behind your own reverse proxy, so the real client IP is read from `X-Forwarded-For`. |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Session length. |
| `CORS_ORIGINS` | Comma-separated browser origins allowed to call the API in production. |

## Candidate emails

Candidates are emailed automatically over SMTP when their onboarding status changes:

| Event | Email |
| --- | --- |
| Onboarding started | "You have been selected" |
| Onboarding completed | Welcome email |
| Onboarding rejected | Polite rejection |

Reject and Complete ask for confirmation first and let you untick "send email". Each email is sent at most once per candidate,
runs in the background (a mail outage never blocks a status change), and is recorded in the `email_log` table
(`GET /emails`; failed or skipped ones can be re-sent with `POST /emails/{id}/resend`).

Set it up in `.env` (see `.env.example`): `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM`, `COMPANY_NAME`.
For Gmail use `smtp.gmail.com`, port 587 and an App Password. Until `SMTP_HOST` is set nothing is sent; attempts are logged as
"skipped". Admins can verify the settings with `POST /emails/test` (`{"to": "you@example.com"}`).
`AUTO_EMAIL=false` turns automatic emails off entirely.

## Database and migrations

The schema is managed by Alembic (`migrations/`). The API applies pending migrations on startup, and `seed.py` does too.
An existing database created before Alembic was added is detected and adopted automatically.

```bash
alembic revision --autogenerate -m "describe the change"   # after editing backend/models/models.py
alembic upgrade head                                        # apply
alembic downgrade -1                                        # roll back one step
```

Review every generated migration before committing it. A test fails if the models and migrations drift apart.

PostgreSQL locally: `docker compose up -d db`, then set
`DATABASE_URL=postgresql://talentai:talentai@localhost:5432/talentai` in `.env`.

## Tests

```bash
pip install -r requirements-dev.txt
python -m pytest                          # uses a throwaway SQLite database
TEST_DATABASE_URL=postgresql://... python -m pytest   # same suite on PostgreSQL (CI does both)
```

## Project layout

```
talentai-hrms/
  backend/
    main.py            app, CORS, uniform error responses, /health
    routers/           auth, employees, attendance, payroll, performance, jobs,
                       candidates, resumes, resume_screening, interview, onboarding, dashboard
    services/          auth (JWT + role guards), ai, resume parsing, ranking
    models/ schemas/
  database/            SQLAlchemy engine/session
  frontend/src/
    api/               axios client + react-query hooks (queries.js)
    components/        ui kit, feedback (loaders, errors), layout shell, charts
    pages/             admin/ recruiter/ employee/ shared/ auth/
    context/           auth, theme, toasts
  seed.py              admin (+ optional demo data)
```

## Roles at a glance

| | Admin | Recruiter | Employee |
| --- | :-: | :-: | :-: |
| Dashboard & analytics | yes | yes (hiring) | yes (personal) |
| Employees, attendance, payroll, performance | manage | - | view own |
| Jobs, candidates, screening, interviews, onboarding | yes | yes | - |
| Recruiter directory | yes | - | - |

## Before going to production

- Set a strong `SECRET_KEY`, change the seeded passwords, set `CORS_ORIGINS`.
- Use PostgreSQL (`DATABASE_URL`); back it up. Migrations run automatically unless `AUTO_MIGRATE=false`.
- Behind a proxy, set `TRUST_PROXY=true`; with more than one worker, set `RATE_LIMIT_STORAGE_URI` to Redis.
- Serve the frontend (`npm run build` -> `frontend/dist`) behind HTTPS.
- CI (`.github/workflows/ci.yml`) runs the tests on SQLite and PostgreSQL once the project is pushed to GitHub.
