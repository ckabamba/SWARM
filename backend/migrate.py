"""Explicit migrations; API workers never apply shared schema changes."""
from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, text
from backend.manage import ROOT, database_url


def migrate(url=None, target='head'):
    engine = create_engine(url or database_url())
    cfg = Config()
    cfg.set_main_option('script_location', str(ROOT / 'backend/engine/migrations'))
    with engine.begin() as conn:
        conn.execute(text('SELECT pg_advisory_xact_lock(78142027)'))
        cfg.attributes['connection'] = conn
        command.upgrade(cfg, target)
    engine.dispose()


if __name__ == '__main__':
    migrate()
    print('Shared schema migrations applied to the configured database.')
