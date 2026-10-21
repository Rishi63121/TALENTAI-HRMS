import os
from pathlib import Path

from dotenv import load_dotenv
from sqlalchemy import create_engine, event
from sqlalchemy.orm import declarative_base, sessionmaker

PROJECT_ROOT = Path(__file__).resolve().parent.parent
load_dotenv(dotenv_path=PROJECT_ROOT / ".env")

DEFAULT_DB_PATH = Path(__file__).resolve().parent / "talentai.db"


def _resolve_database_url() -> str:
    url = os.getenv("DATABASE_URL") or f"sqlite:///{DEFAULT_DB_PATH.as_posix()}"
    # Hosting providers hand out postgres:// or postgresql:// URLs; SQLAlchemy needs the driver named (psycopg 3).
    for legacy in ("postgres://", "postgresql://"):
        if url.startswith(legacy):
            url = "postgresql+psycopg://" + url[len(legacy):]
            break
    # Make relative sqlite paths independent of the directory uvicorn was started from.
    prefix = "sqlite:///"
    if url.startswith(prefix) and not url.startswith("sqlite:////"):
        raw = url[len(prefix):]
        if raw and not Path(raw).is_absolute() and raw != ":memory:":
            url = f"{prefix}{(PROJECT_ROOT / raw).resolve().as_posix()}"
    return url


DATABASE_URL = _resolve_database_url()
IS_SQLITE = DATABASE_URL.startswith("sqlite")

if IS_SQLITE:
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})

    @event.listens_for(engine, "connect")
    def _enforce_foreign_keys(dbapi_connection, _):
        # PostgreSQL enforces foreign keys; make SQLite behave the same so bugs show up in development.
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()
else:
    engine = create_engine(
        DATABASE_URL,
        pool_pre_ping=True,  # drop dead connections after a database restart
        pool_size=int(os.getenv("DB_POOL_SIZE", "10")),
        max_overflow=int(os.getenv("DB_MAX_OVERFLOW", "20")),
        pool_recycle=1800,
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
