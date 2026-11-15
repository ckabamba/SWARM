"""Location matching on real listing text, and the event-to-place link in a throwaway schema."""
from uuid import uuid4

from alembic import command
from alembic.config import Config
import pytest
from sqlalchemy import create_engine, text

from backend.events.places import PLACES, events_with_places, link_events, load_places, match
from backend.manage import ROOT, database_url

# Location text exactly as GT Engage listings wrote it on 2026-11-15.
CASES = [
    ('Klaus 1443', 'campus', 'Klaus Advanced Computing Building', '1443'),
    ('Klaus Atrium', 'campus', 'Klaus Advanced Computing Building', 'Atrium'),
    ('Klaus Classroom 2448', 'campus', 'Klaus Advanced Computing Building', 'Classroom 2448'),
    ('IC 111', 'campus', 'Instructional Center', '111'),
    ('Instructional Center 205', 'campus', 'Instructional Center', '205'),
    ('Kendeda', 'campus', 'Kendeda Building', None),
    ('Kendeda Building Room 230', 'campus', 'Kendeda Building', 'Room 230'),
    ('Skiles Walkway', 'campus', 'Skiles Classroom Building', 'Walkway'),
    ('Bunger Henry 380', 'campus', 'Bunger-Henry Building', '380'),
    ('CoC Clasroom 102', 'campus', 'College of Computing Building', 'Clasroom 102'),
    ('Howey Physics Room L3', 'campus', 'Howey Physics Building', 'Room L3'),
    ('Van Leer C241', 'campus', 'Van Leer Building', 'C241'),
    ('Scheller CoB', 'campus', 'Scheller College of Business', None),
    ('West Architecture Building ', 'campus', 'Architecture West', None),
    (' Georgia Tech Global Learning Center', 'campus', 'Global Learning Center', None),
    ('Exhibition Hall - Summer Hill', 'campus', 'Exhibition Hall', 'Summer Hill'),
    ('Exhibition Hall, Home Park', 'campus', 'Exhibition Hall', 'Home Park'),
    ('Student Center 3108', 'campus', 'John Lewis Student Center', '3108'),
    ('John Lewis Student Center- Multicultural Lounge', 'campus', 'John Lewis Student Center', 'Multicultural Lounge'),
    ('John Lewis Student Center, Center for Student Engagement, CSE Conference Room 3108', 'campus',
     'John Lewis Student Center', 'Center for Student Engagement, CSE Conference Room 3108'),
    ('Piedmont - John Lewis Student Center and Stamps Commons', 'campus', 'John Lewis Student Center',
     'Piedmont - and Stamps Commons'),
    ('Rafael Bras', 'campus', 'John Lewis Student Center', 'Rafael Bras'),
    ('Georgia Tech Police Department - Conference Room ', 'campus', 'Georgia Tech Police Department', 'Conference Room'),
    ('MFG. Related Disciplines Complex(MRDC)-135-2405 Classroom MRDC ', 'campus',
     'Manufacturing Related Disciplines Complex', '135-2405 Classroom'),
    # Calendar and Engage text from 2026-11-15, buildings added from OpenStreetMap.
    ('George Tower (TS3 0210)', 'campus', 'George Tower', 'TS3 0210'),
    ('Room 232, George/Scheller Tower', 'campus', 'George Tower', 'Room 232'),
    ('Classroom 0210 George | Scheller Tower', 'campus', 'George Tower', 'Classroom 0210'),
    ('L1125 Ford ES&T', 'campus', 'Ford Environmental Science and Technology Building', 'L1125'),
    ('Room 357, Clough Undergraduate Learning Commons', 'campus', 'Clough Undergraduate Learning Commons', 'Room 357'),
    ('Scholars Event Theater, Price Gilbert Library', 'campus', 'Price Gilbert Memorial Library', 'Scholars Event Theater'),
    ('West Village Dining Hall', 'campus', 'West Village Dining Commons', None),
    ('Online', 'online', None, None),
    ('Virtual (Zoom link sent after RSVP)', 'online', None, None),
    # Not known buildings: never guessed.
    ('ATLAS Center Peachtree Corners', 'unknown', None, None),
    ('Barnes and Noble', 'unknown', None, None),
    ('Flex Space', 'unknown', None, None),
    ('Brittain Rec Room', 'unknown', None, None),
    # Short aliases only match whole words.
    ('Epic Picnic Spot', 'unknown', None, None),
    ('', 'unknown', None, None),
    (None, 'unknown', None, None),
]


@pytest.mark.parametrize('location, kind, place, room', CASES)
def test_match(location, kind, place, room):
    assert match(location) == (kind, place, room)


def test_place_data_is_usable():
    names = [place['name'] for place in PLACES]
    assert len(names) == len(set(names)) == 28
    for place in PLACES:
        # Roughly the Atlanta campus and Tech Square.
        assert 33.76 < place['latitude'] < 33.79 and -84.41 < place['longitude'] < -84.38
        assert place['aliases']
        # Every way of writing a building must lead back to that building.
        for alias in place['aliases'] + place.get('rooms', []):
            assert match(alias)[:2] == ('campus', place['name'])


def test_events_link_to_places():
    engine = create_engine(database_url(test=True))
    schema = 'event_places_test_' + uuid4().hex
    config = Config()
    config.set_main_option('script_location', str(ROOT/'backend/engine/migrations'))
    with engine.connect() as conn:
        assert conn.scalar(text('SELECT current_database()')) == 'warmpath_test'
        # Identifier consists only of this constant prefix and a generated hex UUID.
        conn.execute(text(f'CREATE SCHEMA {schema}'))
        conn.execute(text(f'SET LOCAL search_path TO {schema}'))
        config.attributes['connection'] = conn
        command.upgrade(config, 'head')

        assert load_places(conn) == load_places(conn)  # repeatable, same ids
        assert conn.scalar(text('SELECT count(*) FROM campus_place')) == 28

        def add(key, location):
            conn.execute(text(
                "INSERT INTO api_public_events (url, title, starts_at, ends_at, fetched_at, source, location) "
                "VALUES (:url, :title, now(), now(), now(), 'gt-engage', :location)"),
                {'url': f'https://example.test/{key}', 'title': key, 'location': location})

        add('klaus', 'Klaus 1443')
        add('online', 'Online')
        add('offcampus', 'ATLAS Center Peachtree Corners')
        add('none', None)
        assert link_events(conn) == {'campus': 1, 'online': 1, 'unknown': 2}

        add('late', 'IC 111')  # imported after the last link run
        events = {event['title']: event for event in events_with_places(conn)}
        klaus = events['klaus']
        assert (klaus['location_kind'], klaus['room'], klaus['location']) == ('campus', '1443', 'Klaus 1443')
        assert klaus['place']['name'] == 'Klaus Advanced Computing Building'
        assert (klaus['place']['latitude'], klaus['place']['longitude']) == (33.77716, -84.3962)
        for key, kind in (('online', 'online'), ('offcampus', 'unknown'), ('none', 'unknown'), ('late', 'unknown')):
            assert (events[key]['location_kind'], events[key]['place'], events[key]['room']) == (kind, None, None)

        # A listing that changes location is relinked on the next run.
        conn.execute(text("UPDATE api_public_events SET location = 'Online' WHERE title = 'klaus'"))
        assert link_events(conn) == {'campus': 1, 'online': 2, 'unknown': 2}
        events = {event['title']: event for event in events_with_places(conn)}
        assert events['klaus']['location_kind'] == 'online' and events['klaus']['place'] is None
        assert events['late']['place']['name'] == 'Instructional Center'
        assert conn.scalar(text('SELECT count(*) FROM event_place')) == 5

        command.downgrade(config, '0006')
        assert conn.scalar(text("SELECT to_regclass('event_place')")) is None
        conn.rollback()
    engine.dispose()
