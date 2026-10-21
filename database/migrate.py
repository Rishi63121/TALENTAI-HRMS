"""Bring the database schema up to date. Used by the API on startup and by seed.py."""
import logging

from alembic import command
from alembic.config import Config
from sqlalchemy import inspect

from database.db import PROJECT_ROOT, engine

BASELINE_REVISION = "0001"
logger = logging.getLogger("talentai.migrate")


def _config() -> Config:
    cfg = Config(str(PROJECT_ROOT / "alembic.ini"))
    cfg.set_main_option("script_location", str(PROJECT_ROOT / "migrations"))
    return cfg


def upgrade_to_head() -> None:
    cfg = _config()
    tables = set(inspect(engine).get_table_names())
    # Databases created before Alembic existed already hold the baseline schema: mark them
    # as migrated instead of failing on "table already exists".
    if "users" in tables and "alembic_version" not in tables:
        logger.info("Existing un-versioned database found; stamping baseline revision")
        command.stamp(cfg, BASELINE_REVISION)
        return
    command.upgrade(cfg, "head")
