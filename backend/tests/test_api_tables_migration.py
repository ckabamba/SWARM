"""Migration 0006 must create the same api_ tables the API defines for itself."""
from uuid import uuid4

from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, inspect, text

from backend.api.app import metadata
from backend.manage import ROOT, database_url

API_TABLES = sorted(metadata.tables)


def describe(conn, schema):
    """Columns, keys and foreign keys of the api_ tables, in a comparable form."""
    found = inspect(conn)
    result = {}
    for table in API_TABLES:
        # Sequence defaults mention the throwaway schema name; blank it out.
        columns = [(c['name'], str(c['type']), c['nullable'], c['default'] and c['default'].replace(schema, ''))
                   for c in found.get_columns(table, schema=schema)]
        keys = found.get_pk_constraint(table, schema=schema)['constrained_columns']
        foreign = sorted((tuple(k['constrained_columns']), k['referred_table'], tuple(k['referred_columns']),
                          k['options'].get('ondelete')) for k in found.get_foreign_keys(table, schema=schema))
        result[table] = (sorted(columns), keys, foreign)
    return result


def in_schema(engine, config, steps):
    """Run steps(conn, schema) in a throwaway schema that is rolled back afterwards."""
    schema = 'api_tables_test_' + uuid4().hex
    with engine.connect() as conn:
        assert conn.scalar(text('SELECT current_database()')) == 'warmpath_test'
        # Identifier consists only of this constant prefix and a generated hex UUID.
        conn.execute(text(f'CREATE SCHEMA {schema}'))
        conn.execute(text(f'SET LOCAL search_path TO {schema}'))
        config.attributes['connection'] = conn
        try:
            return steps(conn, schema)
        finally:
            conn.rollback()


def test_migration_matches_api_definitions_and_adopts_existing_tables():
    engine = create_engine(database_url(test=True))
    config = Config()
    config.set_main_option('script_location', str(ROOT/'backend/engine/migrations'))

    def migrated_only(conn, schema):
        command.upgrade(config, 'head')
        return describe(conn, schema)

    def api_first(conn, schema):
        # The API created its tables and saved a row before the migration existed.
        command.upgrade(config, '0005')
        metadata.create_all(conn)
        conn.execute(text("INSERT INTO api_workspaces(id, goal, expires_at) VALUES ('kept', 'Find an internship', now())"))
        command.upgrade(config, 'head')
        assert conn.scalar(text("SELECT goal FROM api_workspaces WHERE id = 'kept'")) == 'Find an internship'
        return describe(conn, schema)

    def early_api_tables(conn, schema):
        # An early API version had no source/location/organizer/topics columns.
        command.upgrade(config, '0005')
        conn.execute(text('CREATE TABLE api_public_events (url TEXT PRIMARY KEY, title TEXT NOT NULL, '
                          'starts_at TIMESTAMPTZ NOT NULL, ends_at TIMESTAMPTZ NOT NULL, fetched_at TIMESTAMPTZ NOT NULL)'))
        command.upgrade(config, 'head')
        columns = {c['name'] for c in inspect(conn).get_columns('api_public_events', schema=schema)}
        assert {'source', 'location', 'organizer'} <= columns
        command.downgrade(config, '0005')
        return [t for t in inspect(conn).get_table_names(schema=schema) if t.startswith('api_')]

    fresh = in_schema(engine, config, migrated_only)
    assert sorted(fresh) == API_TABLES and len(API_TABLES) == 6
    assert fresh == in_schema(engine, config, api_first)
    assert in_schema(engine, config, early_api_tables) == []
    engine.dispose()
