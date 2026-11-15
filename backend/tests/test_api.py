from datetime import datetime, timedelta, timezone
import json

from fastapi.testclient import TestClient
import pytest
from sqlalchemy import create_engine, text

from backend.api.app import create_app
from backend.api.sync_events import parse_feed, parse_engage
from backend.manage import database_url
from backend.migrate import migrate


@pytest.fixture
def app():
    url = database_url(test=True)
    engine = create_engine(url)
    with engine.connect() as conn:
        assert conn.scalar(text('SELECT current_database()')) == 'warmpath_test', 'Use the isolated warmpath_test database.'
    engine.dispose()
    migrate(url)
    return create_app(url)


def test_real_resources_and_goal_matching(app):
    with TestClient(app) as client:
        assert client.get('/api/ready').json()['database'] == 'PostgreSQL'
        assert client.get('/api/resources').status_code == 401
        session = client.get('/api/session').json()
        assert session['resource_count'] == 18
        startup = client.post('/api/path', json={'goal': 'Launch a startup'}).json()
        robotics = client.post('/api/path', json={'goal': 'Explore robotics research'}).json()
        assert startup['resources'] and robotics['resources']
        assert {r['id'] for r in startup['resources']} != {r['id'] for r in robotics['resources']}
        assert startup['evidence']['achievers'] is None
        assert startup['evidence']['lift'] is None
        for row in startup['resources']:
            assert row['source_url'].startswith('https://')
            assert 'achievers' not in row
        assert client.post('/api/path', json={'goal':'zzzzunmatched999'}).json()['status'] == 'no_match'


def test_persistence_and_browser_isolation(app):
    with TestClient(app) as first, TestClient(app) as second:
        first.get('/api/session'); second.get('/api/session')
        assert first.put('/api/saved/3').status_code == 200
        assert first.put('/api/saved/3').status_code == 200
        assert len(first.get('/api/resources?saved_only=true').json()['items']) == 1
        assert second.get('/api/resources?saved_only=true').json()['items'] == []
        first.post('/api/path', json={'goal':'Find an internship'})
        cookies = dict(first.cookies)
    # A fresh application/connection pool demonstrates server state is in PG.
    with TestClient(create_app(database_url(test=True))) as restarted:
        restarted.cookies.update(cookies)
        assert restarted.get('/api/session').json()['goal'] == 'Find an internship'
        assert restarted.get('/api/resources?saved_only=true').json()['items'][0]['id'] == 3
        assert restarted.delete('/api/saved/3').status_code == 200
        assert restarted.delete('/api/saved/3').status_code == 200
        assert restarted.get('/api/resources?saved_only=true').json()['items'] == []


def test_validation_permissions_and_missing_data(app):
    with TestClient(app) as client:
        client.get('/api/session')
        assert client.post('/api/path', json={'goal':'  '}).status_code == 422
        assert client.post('/api/path', json={'goal':'a'*301}).status_code == 422
        assert client.put('/api/saved/987654').status_code == 404
        assert client.put('/api/saved/3', headers={'Origin':'https://unrelated.example'}).status_code == 403
        assert client.get('/api/people').json()['items'] == []
        assert client.get('/api/asks/5').status_code == 404
        assert client.get('/api/resources').headers['Cache-Control'] == 'no-store'
        assert client.get('/api/health', headers={'Host':'unrelated.example'}).status_code == 400


def test_calendar_uses_event_time_not_publication_time():
    now = datetime.now(timezone.utc)
    xml = b'''<rss><channel><item><title>Test event</title><link>https://calendar.gatech.edu/event/test</link>
    <description><![CDATA[<time datetime="2020-01-01T12:00:00Z"></time>Event time
    <time datetime="2026-11-16T18:00:00Z"></time> - <time datetime="2026-11-16T20:00:00Z"></time>]]></description>
    </item></channel></rss>'''
    row = parse_feed(xml, now)[0]
    assert row['starts_at'].year == 2026
    assert row['source'] == 'gt-calendar'
    with pytest.raises(ValueError):
        parse_feed(xml.replace(b'Event time', b'changed markup'), now)
    with pytest.raises(ValueError):
        parse_feed(b'<!DOCTYPE rss><rss><channel/></rss>', now)


def test_engage_only_imports_public_approved_valid_events():
    event = {'id':'123', 'visibility':'Public', 'status':'Approved', 'name':'Test event',
             'startsOn':'2026-11-16T18:00:00Z', 'endsOn':'2026-11-16T20:00:00Z', 'location':'Test Hall'}
    payload = {'value':[event, dict(event, id='124', visibility='Private'),
                         dict(event, id='125', status='Cancelled'), dict(event, id='126', organizationName='Sandbox'), dict(event, id='../wrong')]}
    rows = parse_engage(json.dumps(payload).encode(), datetime.now(timezone.utc))
    assert len(rows) == 1
    assert rows[0]['url'] == 'https://gatech.campuslabs.com/engage/event/123'
    assert rows[0]['location'] == 'Test Hall'


def test_courses_and_vip_match_job_topics_without_alumni_claims(app):
    with TestClient(app) as client:
        client.get('/api/session')
        catalog = client.get('/api/resources').json()['items']
        assert len([row for row in catalog if row['kind'] == 'Course']) == 8
        assert len([row for row in catalog if row['kind'] == 'VIP project']) == 3
        course = next(row for row in catalog if row['id'] == 104)
        assert course['evidence_basis'] == 'course_catalog'
        assert 'operating systems' in course['topics']
        assert any('operating systems' in job['matched_topics'] for job in course['related_jobs'])
        response = client.post('/api/path', json={'goal':'Software internship', 'job_id':'nvidia-jr2023495'}).json()
        assert response['matching'] == 'description_topic_overlap'
        assert response['evidence']['achievers'] is None and response['evidence']['lift'] is None
        assert response['resources']
        for resource in response['resources']:
            for job in resource['related_jobs']:
                assert job['id'] == response['job']['id']
                assert set(job['matched_topics']) == set(resource['topics']) & set(job['topics'])
                assert job['match_basis'] == 'description_topic_overlap'
        assert client.post('/api/path', json={'goal':'unknown', 'job_id':'invented'}).status_code == 404


def test_events_carry_their_campus_place(app):
    """GET /api/events adds location_kind, room and place from the event_place links."""
    from uuid import uuid4
    from backend.events.places import link_events
    engine = create_engine(database_url(test=True))
    source = 'test-places-' + uuid4().hex
    now = datetime.now(timezone.utc)
    soon, later = now + timedelta(minutes=1), now + timedelta(days=1)  # first in the 12-item list
    urls = {loc: f'https://example.edu/{source}/{i}' for i, loc in enumerate(['Klaus 1443', 'Online', 'Somewhere else'])}
    with engine.begin() as conn:
        conn.execute(text('INSERT INTO api_feeds (name, fetched_at) VALUES (:s, :t)'), {'s': source, 't': now})
        for location, url in urls.items():
            conn.execute(text(
                'INSERT INTO api_public_events (url, title, starts_at, ends_at, fetched_at, source, location) '
                'VALUES (:u, :title, :start, :end, :f, :s, :loc)'),
                {'u': url, 'title': location, 'start': soon, 'end': later, 'f': now, 's': source, 'loc': location})
        link_events(conn)
    try:
        with TestClient(app) as client:
            items = {item['url']: item for item in client.get('/api/events').json()['items']}
        klaus = items[urls['Klaus 1443']]
        assert klaus['location_kind'] == 'campus' and klaus['room'] == '1443'
        assert klaus['place']['name'] == 'Klaus Advanced Computing Building'
        assert {'id', 'latitude', 'longitude'} <= klaus['place'].keys()
        assert items[urls['Online']]['location_kind'] == 'online' and items[urls['Online']]['place'] is None
        assert items[urls['Somewhere else']]['location_kind'] == 'unknown'
    finally:
        with engine.begin() as conn:
            conn.execute(text('DELETE FROM api_public_events WHERE source = :s'), {'s': source})
            conn.execute(text('DELETE FROM api_feeds WHERE name = :s'), {'s': source})
        engine.dispose()
