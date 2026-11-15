"""Migration round trip in a throwaway schema inside the isolated test DB."""
from uuid import uuid4
import json
from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, inspect, text
from backend.manage import ROOT, database_url


def test_shared_profile_migration_round_trip():
    engine = create_engine(database_url(test=True))
    schema = 'migration_test_' + uuid4().hex
    config = Config()
    config.set_main_option('script_location', str(ROOT/'backend/engine/migrations'))
    with engine.begin() as conn:
        assert conn.scalar(text('SELECT current_database()')) == 'warmpath_test'
        # Identifier consists only of this constant prefix and a generated hex UUID.
        conn.execute(text(f'CREATE SCHEMA {schema}'))
        conn.execute(text(f'SET LOCAL search_path TO {schema}'))
        config.attributes['connection'] = conn
        command.upgrade(config, '0002')
        person_id = conn.scalar(text("INSERT INTO person(name,kind) VALUES ('Migration Test','student') RETURNING id"))
        course = {'id':'preserved-course', 'code':'CS 1332','title':'User corrected title','institution':'Georgia Tech','term':'Fall 2024','status':'completed','source':'resume','source_id':'original-import','resource_id':102,'visible':True}
        payload = {'name':'Migration Test','courses':[course]}
        conn.execute(text('INSERT INTO person_profile(person_id,data) VALUES (:id,CAST(:data AS jsonb))'),{'id':person_id,'data':json.dumps(payload)})
        command.upgrade(config, 'head')
        assert conn.scalar(text('SELECT data FROM person_course WHERE person_id=:id'),{'id':person_id}) == course
        assert 'courses' not in conn.scalar(text('SELECT data FROM person_profile WHERE person_id=:id'),{'id':person_id})
        command.downgrade(config, '0002')
        assert conn.scalar(text('SELECT data FROM person_profile WHERE person_id=:id'),{'id':person_id})['courses'] == [course]
        command.upgrade(config, 'head')
        assert {'person','person_profile','account','resume_draft'} <= set(inspect(conn).get_table_names(schema=schema))
        command.downgrade(config, '0001')
        assert 'person' in inspect(conn).get_table_names(schema=schema)
        assert 'account' not in inspect(conn).get_table_names(schema=schema)
        command.upgrade(config, 'head')
        assert 'account_session' in inspect(conn).get_table_names(schema=schema)
        command.downgrade(config, 'base')
        assert inspect(conn).get_table_names(schema=schema) == ['alembic_version']
        conn.execute(text(f'DROP SCHEMA {schema} CASCADE'))
    engine.dispose()
