import sqlite3

from sqlalchemy import create_engine, inspect

from database import db as db_module
from database.migrate import BASELINE_REVISION, _config
from database.db import Base


def test_models_match_migrations():
    """Fails when a model changes without a new Alembic revision."""
    from alembic.autogenerate import compare_metadata
    from alembic.migration import MigrationContext

    with db_module.engine.connect() as conn:
        diff = compare_metadata(MigrationContext.configure(conn), Base.metadata)
    assert diff == [], f"models differ from migrations, run `alembic revision --autogenerate`: {diff}"


def test_legacy_database_is_stamped_not_recreated(tmp_path, monkeypatch):
    """A database made by the old create_all() (no alembic_version) must be adopted, not crash."""
    from database import migrate

    path = tmp_path / "legacy.db"
    legacy = create_engine(f"sqlite:///{path.as_posix()}")
    Base.metadata.create_all(legacy)
    monkeypatch.setattr(migrate, "engine", legacy)
    monkeypatch.setattr(db_module, "engine", legacy)

    migrate.upgrade_to_head()

    tables = inspect(legacy).get_table_names()
    assert "alembic_version" in tables
    with sqlite3.connect(path) as conn:
        assert conn.execute("SELECT version_num FROM alembic_version").fetchone()[0] == BASELINE_REVISION
