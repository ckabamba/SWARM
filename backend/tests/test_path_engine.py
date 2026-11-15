"""Path engine checks against the planted fixtures, in a throwaway schema."""
from datetime import date
from uuid import uuid4

from alembic import command
from alembic.config import Config
import pytest
from sqlalchemy import create_engine, text

from functools import partial
from backend.engine.paths import NotFound, path_for_goal as real_path, people_for_goal as real_people, school_year

path_for_goal = partial(real_path, include_fixtures=True)
people_for_goal = partial(real_people, include_fixtures=True)
from backend.manage import ROOT, database_url
from backend.seed import path_fixtures

TODAY = date(2026, 11, 15)


@pytest.fixture(scope='module')
def loaded():
    engine = create_engine(database_url(test=True))
    schema = 'path_engine_test_' + uuid4().hex
    config = Config()
    config.set_main_option('script_location', str(ROOT/'backend/engine/migrations'))
    with engine.connect() as conn:
        assert conn.scalar(text('SELECT current_database()')) == 'warmpath_test'
        # Identifier consists only of this constant prefix and a generated hex UUID.
        conn.execute(text(f'CREATE SCHEMA {schema}'))
        conn.execute(text(f'SET LOCAL search_path TO {schema}'))
        config.attributes['connection'] = conn
        command.upgrade(config, 'head')
        ids = path_fixtures.load(conn)
        yield conn, ids
        # Nothing is committed, so the schema and its rows vanish here.
        conn.rollback()
    engine.dispose()


def nvidia_path(conn, ids, student, **options):
    goal = ids['activities']['nvidia_intern']
    return path_for_goal(conn, goal, ids['students'][student], today=TODAY, **options)


def test_planted_stops_rank_by_lift(loaded):
    conn, ids = loaded
    path = nvidia_path(conn, ids, 'compe')
    assert path['goal'] == {'id': ids['activities']['nvidia_intern'],
                            'label': 'SWE internship at NVIDIA', 'achievers': 14}
    assert [(s['name'], s['achievers'], s['lift'], s['typical_year']) for s in path['stops']] == [
        ('VIP: Embedded Vision', 9, 4.1, 2),
        ('VIP: GPU Systems', 7, 3.57, 2),
        ('CS 3210 Operating Systems', 8, 2.91, 2),
        ('RoboJackets', 6, 2.38, 1),
        ('Computer Architecture Lab', 5, 2.19, 2),
    ]
    assert path['reason'] is None and path['events'] == []
    assert path['fixture_evidence'] is True
    assert all(s['event'] is None for s in path['stops'])


def test_common_rare_and_later_activities_are_not_stops(loaded):
    conn, ids = loaded
    # Lift the top-5 limit so only the lift and support rules decide.
    names = [s['name'] for s in nvidia_path(conn, ids, 'compe', max_stops=50)['stops']]
    assert len(names) == 6 and names[-1] == 'CS 2110 Computer Organization'
    assert 'Jacket Welcome Club' not in names           # nearly everyone joins: lift near 1
    assert 'Formula Racing Electronics' not in names    # high lift, only 2 achievers
    assert 'Full-time engineer at NVIDIA' not in names  # happened after the goal
    loose = nvidia_path(conn, ids, 'compe', max_stops=50, min_lift=0, min_achievers=1)
    loose = {s['name'] for s in loose['stops']}
    assert {'Jacket Welcome Club', 'Formula Racing Electronics'} <= loose
    assert 'Full-time engineer at NVIDIA' not in loose


def test_students_get_different_next_stops(loaded):
    conn, ids = loaded
    compe, cs = nvidia_path(conn, ids, 'compe'), nvidia_path(conn, ids, 'cs')
    assert compe['student'] == {'id': ids['students']['compe'], 'name': 'Maya Chen',
                                'major': 'CompE', 'school_year': 2}
    assert cs['student']['school_year'] == 1
    assert [s['name'] for s in compe['stops'] if s['have']] == ['VIP: Embedded Vision', 'RoboJackets']
    assert [s['name'] for s in cs['stops'] if s['have']] == ['RoboJackets']
    assert [s['name'] for s in compe['stops'] if s['next']] == ['VIP: GPU Systems']
    assert [s['name'] for s in cs['stops'] if s['next']] == ['VIP: Embedded Vision']
    # The scores themselves do not depend on the student.
    assert [s['lift'] for s in compe['stops']] == [s['lift'] for s in cs['stops']]


def test_second_goal_and_thin_goal(loaded):
    conn, ids = loaded
    student = ids['students']['cs']
    research = path_for_goal(conn, ids['activities']['research_goal'], student, today=TODAY)
    assert research['goal']['achievers'] == 10
    top = research['stops'][0]
    assert (top['name'], top['achievers'], top['lift'], top['have']) == ('RoboJackets', 7, 3.89, True)
    thin = path_for_goal(conn, ids['activities']['thin_goal'], student, today=TODAY)
    assert thin['goal']['achievers'] == 2 and thin['stops'] == []
    assert thin['reason'] == 'not_enough_achievers'
    strict = nvidia_path(conn, ids, 'cs', min_lift=100)
    assert strict['stops'] == [] and strict['reason'] == 'no_stop_meets_threshold'


def test_unknown_ids_raise(loaded):
    conn, ids = loaded
    goal, student = ids['activities']['nvidia_intern'], ids['students']['cs']
    with pytest.raises(NotFound):
        path_for_goal(conn, -1, student)
    with pytest.raises(NotFound):
        path_for_goal(conn, goal, -1)
    # Alumni can browse using their own history as well.
    assert path_for_goal(conn, goal, ids['achievers'][0])['student']['id'] == ids['achievers'][0]
    with pytest.raises(NotFound):
        people_for_goal(conn, goal, student, activity_id=-1)


def test_people_ranking_and_shared_ties(loaded):
    conn, ids = loaded
    goal = ids['activities']['nvidia_intern']
    compe = people_for_goal(conn, goal, ids['students']['compe'], limit=50)
    cs = people_for_goal(conn, goal, ids['students']['cs'], limit=50)
    assert {p['id'] for p in compe} == set(ids['achievers']) == {p['id'] for p in cs}
    assert not {p['id'] for p in compe} & set(ids['hidden_achievers'])
    for ranked in (compe, cs):
        assert [p['score'] for p in ranked] == sorted((p['score'] for p in ranked), reverse=True)
        assert all(set(p) == {'id', 'name', 'major', 'grad_year', 'shared_tie', 'score'} for p in ranked)
        assert all(0 <= p['score'] <= 1 for p in ranked)
    assert [p['id'] for p in compe[:3]] != [p['id'] for p in cs[:3]]
    assert len(people_for_goal(conn, goal, ids['students']['cs'])) == 10

    # Every sentence must be backed by rows in the database.
    def year_done(person, name):
        return conn.scalar(text(
            'SELECT pa.school_year FROM person_activity pa JOIN activity a ON a.id = pa.activity_id '
            'WHERE pa.person_id = :p AND a.name = :n'), {'p': person, 'n': name})

    for key, major, ranked in (('compe', 'CompE', compe), ('cs', 'CS', cs)):
        student = ids['students'][key]
        for person in ranked:
            tie = person['shared_tie']
            if tie is None:
                assert person['major'] != major
                continue
            assert (f'You are both {major}' in tie) == (person['major'] == major)
            for name in ('VIP: Embedded Vision', 'RoboJackets'):
                if name in tie:
                    assert year_done(person['id'], name) and year_done(student, name)
                    if ' year' in tie:
                        assert year_done(person['id'], name) == year_done(student, name)
    expected = 'You are both CompE and both joined VIP: Embedded Vision in second year'
    assert any(p['shared_tie'] == expected for p in compe)

    stop = ids['activities']['embedded_vision']
    behind_stop = people_for_goal(conn, goal, ids['students']['compe'], stop, limit=50)
    assert len(behind_stop) == 9
    assert all('VIP: Embedded Vision' in p['shared_tie'] for p in behind_stop)


def test_school_year_from_graduation_year():
    assert school_year(2029, date(2026, 11, 15)) == 2
    assert school_year(2030, date(2026, 11, 15)) == 1
    assert school_year(2029, date(2027, 3, 1)) == 2
    assert school_year(2029, date(2027, 8, 20)) == 3
    assert school_year(2026, date(2026, 11, 15)) == 5
    assert school_year(2035, date(2026, 11, 15)) is None
    assert school_year(None) is None
