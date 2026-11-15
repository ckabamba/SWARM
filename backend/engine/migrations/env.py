"""Alembic environment for the WarmPath shared schema.

Reads DATABASE_URL from the environment, falling back to the .env file at the
repo root. Migrations are written by hand; there is no autogenerate metadata.
"""

import os
from logging.config import fileConfig
from pathlib import Path

from alembic import context
from dotenv import load_dotenv
from sqlalchemy import create_engine, pool
from sqlalchemy.engine import URL, make_url

REPO_ROOT = Path(__file__).resolve().parents[3]

# Real environment variables win over the .env file.
load_dotenv(REPO_ROOT / ".env")

config = context.config
if config.config_file_name is not None:
    fileConfig(config.config_file_name)


def database_url() -> URL:
    raw = os.environ.get("DATABASE_URL")
    if not raw:
        raise RuntimeError(
            "DATABASE_URL is not set. Copy .env.example to .env at the repo "
            "root and fill it in."
        )
    url = make_url(raw)
    # Accept the plain postgresql:// form and use the psycopg 3 driver.
    if url.drivername in ("postgresql", "postgres"):
        url = url.set(drivername="postgresql+psycopg")
    return url


def run_migrations() -> None:
    supplied = config.attributes.get("connection")
    if supplied is not None:
        context.configure(connection=supplied, target_metadata=None)
        with context.begin_transaction():
            context.run_migrations()
        return
    url = database_url()
    # Say which database is about to change, without printing the password.
    print(f"Target database: '{url.database}' on host '{url.host}'")

    engine = create_engine(url, poolclass=pool.NullPool)
    with engine.connect() as connection:
        context.configure(connection=connection, target_metadata=None)
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    raise RuntimeError(
        "Offline (--sql) mode is not set up. Run migrations against a database."
    )

run_migrations()
