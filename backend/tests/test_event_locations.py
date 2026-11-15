"""Calendar events carry their Location field, which links them to campus places."""
from datetime import datetime, timezone

from backend.api.sync_events import calendar_location, parse_feed
from backend.events.places import match

NOW = datetime.now(timezone.utc)

# Shape of a real calendar.gatech.edu item after the body: labelled fields, one per block.
FIELDS = '''
        Summary sentence
      Robotics club open house.
    Summary
      <p>Location of the demo is a secret.</p>
    Event time
      <time datetime="2026-11-13T22:00:00Z">Fri, 11/13/2026 - 17:00</time>
 - <time datetime="2026-11-14T00:00:00Z">Fri, 11/13/2026 - 19:00</time>

    Location URL
      <a href="https://example.edu/tickets">Tickets</a>
    Location
      {location}
              <p><a href="mailto:organizer@example.edu">Pat Organizer</a></p>
'''


def item(fields, url='https://calendar.gatech.edu/event/test'):
    return (f'<rss><channel><item><title>Open house</title><link>{url}</link>'
            f'<description><![CDATA[{fields}]]></description></item></channel></rss>').encode()


def test_calendar_location_is_read_from_its_field():
    row = parse_feed(item(FIELDS.format(location='Klaus Advance Computing Bldg., Atrium')), NOW)[0]
    assert row['location'] == 'Klaus Advance Computing Bldg., Atrium'
    # Not "Location URL", not body text, and not the contact block after it.
    assert 'Tickets' not in row['location'] and 'Organizer' not in row['location']


def test_calendar_location_entities_are_decoded():
    # The feed double-escapes ampersands inside the description.
    assert calendar_location(FIELDS.format(location='L1125 Ford ES&amp;amp;T')) == 'L1125 Ford ES&T'


def test_calendar_item_without_a_location_field():
    fields = FIELDS.replace('    Location\n      {location}\n', '')
    assert parse_feed(item(fields), NOW)[0]['location'] is None


def test_calendar_locations_reach_the_place_matcher():
    # A location from the feed must be usable by the campus-place matcher as-is.
    location = calendar_location(FIELDS.format(location='Klaus Advance Computing Bldg., Atrium'))
    assert match(location)[:2] == ('campus', 'Klaus Advanced Computing Building')
