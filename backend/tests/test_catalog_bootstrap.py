"""Explicit catalog/bootstrap checks in isolated, disposable PostgreSQL schemas."""
import re
from uuid import uuid4

from fastapi.testclient import TestClient
import pytest
from sqlalchemy import create_engine, event, inspect, text
from sqlalchemy.engine import make_url

from backend.api.app import create_app
from backend.api.catalog_setup import initialize_catalog, load_catalog, catalog_records
from backend.api.resource_tables import verify_schema
from backend.manage import database_url
from backend.migrate import migrate


@pytest.fixture
def isolated_database():
    # New schemas keep this suite independent of shared test account cleanup.
    root_url = database_url(test=True)
    root_engine = create_engine(root_url)
    schema = 'catalog_test_' + uuid4().hex
    with root_engine.begin() as conn:
        assert conn.scalar(text('SELECT current_database()')) == 'warmpath_test'
        conn.execute(text(f'CREATE SCHEMA {schema}'))
    scoped_url = make_url(root_url).update_query_dict({'options': '-csearch_path=' + schema})
    engine = create_engine(scoped_url)
    try:
        yield scoped_url, engine
    finally:
        engine.dispose()
        with root_engine.begin() as conn:
            conn.execute(text(f'DROP SCHEMA {schema} CASCADE'))
        root_engine.dispose()


def test_unmigrated_database_is_rejected_without_creating_tables(isolated_database):
    url, engine = isolated_database
    with pytest.raises(RuntimeError, match='manage migrate'):
        verify_schema(engine)
    with pytest.raises(RuntimeError, match='manage migrate'):
        initialize_catalog(url)
    assert inspect(engine).get_table_names() == []


def test_catalog_setup_is_idempotent_and_imports_no_personal_data(isolated_database):
    url, engine = isolated_database
    migrate(url)
    with engine.begin() as conn:
        assert load_catalog(conn) == {'resources': len(catalog_records()[0]), 'job_examples': 2}
        first = list(conn.execute(text('SELECT id, name, url, topics FROM api_resources ORDER BY id')))
        assert load_catalog(conn) == {'resources': len(catalog_records()[0]), 'job_examples': 2}
        assert list(conn.execute(text('SELECT id, name, url, topics FROM api_resources ORDER BY id'))) == first
        assert conn.scalar(text('SELECT count(*) FROM api_job_examples')) == 2
        for table in ('person', 'account', 'person_profile', 'person_course', 'post',
                      'resume_draft', 'transcript_draft', 'person_activity', 'api_workspaces',
                      'api_public_events', 'api_feeds'):
            assert conn.scalar(text('SELECT count(*) FROM ' + table)) == 0


def test_api_startup_requires_catalog_and_never_changes_schema_or_catalog(isolated_database):
    url, engine = isolated_database
    migrate(url)
    missing_catalog_app = create_app(url)
    try:
        with pytest.raises(RuntimeError, match='manage init-catalog'):
            with TestClient(missing_catalog_app):
                pass
    finally:
        missing_catalog_app.state.engine.dispose()
    initialize_catalog(url)
    with engine.begin() as conn:
        conn.execute(text("UPDATE api_resources SET summary='Operator-maintained summary' WHERE id=3"))
    app = create_app(url)
    statements = []

    def record(_conn, _cursor, statement, _parameters, _context, _many):
        statements.append(statement)

    event.listen(app.state.engine, 'before_cursor_execute', record)
    try:
        with TestClient(app) as client:
            assert client.get('/api/ready').status_code == 200
            assert client.get('/api/session').json()['resource_count'] == len(catalog_records()[0])
        assert not any(re.match(r'\s*(CREATE|ALTER|DROP|TRUNCATE)\b', sql, re.I) for sql in statements)
        assert not any(re.match(r'\s*(INSERT\s+INTO|UPDATE|DELETE\s+FROM)\s+api_(resources|job_examples)\b', sql, re.I)
                       for sql in statements)
        with engine.connect() as conn:
            assert conn.scalar(text('SELECT summary FROM api_resources WHERE id=3')) == 'Operator-maintained summary'
    finally:
        event.remove(app.state.engine, 'before_cursor_execute', record)
        app.state.engine.dispose()
