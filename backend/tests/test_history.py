"""Reviewed history projections in the isolated PostgreSQL test database."""
from fastapi.testclient import TestClient
from sqlalchemy import text

from backend.api.history import participation_year
from backend.tests.test_profiles import app, register
from backend.tests.test_courses import TRANSCRIPT


def projection(app, person):
    with app.state.engine.connect() as conn:
        return [dict(r) for r in conn.execute(text('''
            SELECT a.id,a.name,a.resource_id,pa.school_year,pa.public_school_year
            FROM person_activity pa JOIN activity a ON a.id=pa.activity_id
            WHERE pa.person_id=:person AND pa.history_managed ORDER BY a.id
        '''), {'person': person}).mappings()]


def save_profile(client, **changes):
    me = client.get('/api/me').json()
    response = client.put('/api/me', json={'version': me['version'], 'profile': {**me['profile'], **changes}})
    assert response.status_code == 200, response.text
    return response.json()


def add_course(client, **changes):
    version = client.get('/api/me/courses').json()['version']
    body = dict(code='CS 1332', institution='Georgia Tech', term='Fall 2024', status='taken', school_year=1,
                history_confirmed=True, visible=False)
    response = client.post('/api/me/courses', json={'version': version, 'course': {**body, **changes}})
    assert response.status_code == 201, response.text
    return response.json()


def test_courses_canonical_identity_private_timing_and_delete(app):
    with TestClient(app) as client:
        _, me = register(client)
        first = add_course(client)
        row = projection(app, me['person_id'])[0]
        assert row['school_year'] == 1 and row['public_school_year'] is None
        assert row['resource_id'] is not None  # Exact catalog match without an explicit resource ID.
        second = add_course(client, term='Fall 2026', school_year=3, visible=True, resource_id=row['resource_id'],
                            institution='Georgia Institute of Technology')
        rows = projection(app, me['person_id'])
        assert len(rows) == 1 and rows[0]['id'] == row['id']
        assert rows[0]['school_year'] == 1 and rows[0]['public_school_year'] == 3
        with app.state.engine.connect() as conn:
            assert conn.scalar(text('SELECT count(*) FROM activity_contribution WHERE person_id=:p'), {'p':me['person_id']}) == 2
        # A stale edit cannot partially remove the projection or change either revision.
        assert client.delete('/api/me/courses/' + first['items'][0]['id'] + '?version=1').status_code == 409
        assert projection(app, me['person_id']) == rows
        assert client.delete('/api/me/courses/' + first['items'][0]['id'] + '?version=' + str(second['version'])).status_code == 200
        assert projection(app, me['person_id'])[0]['school_year'] == 3
        last = client.get('/api/me/courses').json()
        assert client.delete('/api/me/courses/' + last['items'][0]['id'] + '?version=' + str(last['version'])).status_code == 200
        assert projection(app, me['person_id']) == []


def test_confirmation_chronology_and_entry_type_gates(app):
    with TestClient(app) as client, TestClient(app) as other:
        _, me = register(client); register(other)
        save_profile(client, enrollment_year=2024, experiences=[
            dict(kind='internship', title='Engineer', organization='History Test', start='2025-06'),
            dict(kind='club', title='Robotics', organization='History Test', start='2025', history_confirmed=True),
            dict(kind='project', title='Website', school_year=1, history_confirmed=True),
        ])
        history = client.get('/api/me/history').json()
        assert [e['status'] for e in history['items']] == ['needs_review', 'needs_review', 'excluded']
        assert projection(app, me['person_id']) == []
        item = history['items'][0]
        review = dict(version=history['profile_version'], history_confirmed=True, visible=False)
        assert other.put('/api/me/history/experience/' + item['source_id'], json=review).status_code == 404
        assert client.put('/api/me/history/experience/' + item['source_id'], json=review).status_code == 200
        assert projection(app, me['person_id'])[0]['school_year'] == 1
        # Planned and transfer records stay in the course list, without claiming attendance.
        add_course(client, status='planned')
        add_course(client, record_type='transfer_credit', term='Fall 2023')
        assert len(projection(app, me['person_id'])) == 1
        add_course(client, code='CS 133', term='Spring 2025', resource_id=101)
        # A partial course code cannot silently become CS 1331/1332.
        history = client.get('/api/me/history').json()
        partial = next(e for e in history['items'] if e['label'] == 'CS 133')
        assert partial['status'] == 'needs_review'


def test_imports_write_only_reviewed_confirmed_participation(app):
    with TestClient(app) as client:
        _, me = register(client)
        save_profile(client, enrollment_year=2024)
        draft = client.post('/api/transcripts/text', json={'text':TRANSCRIPT}).json()
        assert projection(app, me['person_id']) == []
        selections = [{'id':c['id'], 'course':{**c['course'], 'history_confirmed':True, 'status':'taken' if c['course']['status']=='unspecified' else c['course']['status']}} for c in draft['candidates']]
        imported = client.post('/api/transcripts/' + draft['id'] + '/import', json={'version':1,'selections':selections})
        assert imported.status_code == 200, imported.text
        rows = projection(app, me['person_id'])
        assert len(rows) == 2  # CS 1332 retakes collapse; MATH remains; credit and in-progress excluded.
        assert all(r['public_school_year'] is None for r in rows)
        resume = client.post('/api/resumes/text', json={'text': 'Test Student\nExperience\nSoftware Intern | Example Robotics\n2025 - Present\nBuilt robots for research.'}).json()
        candidate = next(c for c in resume['candidates'] if c['section'] == 'experiences')
        current = client.get('/api/me').json()
        selected = {**candidate['value'], 'history_confirmed':True, 'school_year':2}
        imported = client.post('/api/resumes/' + resume['id'] + '/import', json={
            'version':current['version'],'selections':[{'id':candidate['id'],'value':selected}]})
        assert imported.status_code == 200, imported.text
        assert len(projection(app, me['person_id'])) == 3
        save_profile(client, experiences=[])
        assert len(projection(app, me['person_id'])) == 2


def test_explicit_activity_cannot_reveal_another_private_history(app):
    with TestClient(app) as a, TestClient(app) as b:
        _, alice = register(a); _, bob = register(b)
        entry = dict(kind='job', title='Private Researcher', organization='Private Test Org', school_year=5, history_confirmed=True)
        save_profile(a, experiences=[entry])
        private_id = projection(app, alice['person_id'])[0]['id']
        assert not any(r['id'] == private_id for r in b.get('/api/activities').json()['items'])
        save_profile(b, experiences=[{**entry, 'activity_id':private_id}])
        assert projection(app, bob['person_id']) == []
        assert b.get('/api/me/history').json()['items'][0]['status'] == 'needs_review'
        assert b.post('/api/path', json={'mode':'alumni','goal_id':private_id}).status_code == 404
        # Claiming the same normalized role independently is allowed as self-report;
        # it reveals no other person's participation or timing.
        save_profile(b, experiences=[entry])
        assert projection(app, bob['person_id'])[0]['id'] == private_id


def test_participation_year_requires_real_dates_or_explicit_year():
    assert participation_year({'term':'Fall 2024'}, {'enrollment_year':2024}, 'course') == 1
    assert participation_year({'term':'Spring 2025'}, {'enrollment_year':2024}, 'course') == 1
    assert participation_year({'start':'2024-06'}, {'enrollment_year':2024}, 'experience') is None
    assert participation_year({'start':'2024'}, {'enrollment_year':2024}, 'experience') is None
    assert participation_year({'term':'Fall 2024'}, {'grad_year':2028}, 'course') is None
    assert participation_year({'school_year':6}, {}, 'experience') == 6
