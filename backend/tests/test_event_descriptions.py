"""Event descriptions are imported as bounded plain text from both public sources."""
from datetime import datetime, timezone
import json

from backend.api.sync_events import DESCRIPTION_LIMIT, parse_engage, parse_feed, plain_text

NOW = datetime.now(timezone.utc)


def test_plain_text_removes_markup_and_tidies_whitespace():
    markup = ('<p>Drop-ins run <strong>Monday</strong>&nbsp;through&nbsp;<strong>Friday</strong>.</p>\n'
              '<ul><li>Bring a   resume</li><li>Ask &amp; learn</li></ul>'
              '<script>alert("x")</script><style>p { color: red }</style>'
              '<p>See <a href="https://example.edu/more">the site</a>.<br>Free!</p>')
    assert plain_text(markup) == ('Drop-ins run Monday through Friday.\n\n'
                                  'Bring a resume\nAsk & learn\nSee the site.\nFree!')
    assert plain_text('') is None and plain_text(None) is None and plain_text('<p> &nbsp; </p>') is None
    assert len(plain_text('<p>' + 'word ' * 5000 + '</p>')) == DESCRIPTION_LIMIT
    # Escaped markup stays as visible text; it is never turned back into tags.
    assert plain_text('<p>&lt;script&gt;x&lt;/script&gt;</p>') == '<script>x</script>'


def test_engage_description():
    event = {'id': '123', 'visibility': 'Public', 'status': 'Approved', 'name': 'Test event',
             'startsOn': '2026-11-16T18:00:00Z', 'endsOn': '2026-11-16T20:00:00Z',
             'description': '<p>Meet the <em>team</em>.</p><p>Food provided.</p>'}
    payload = {'value': [event, dict(event, id='124', description=None), dict(event, id='125', description='<p></p>')]}
    rows = {row['url'].rsplit('/', 1)[1]: row for row in parse_engage(json.dumps(payload).encode(), NOW)}
    assert rows['123']['description'] == 'Meet the team.\nFood provided.'
    assert rows['124']['description'] is None and rows['125']['description'] is None


def test_calendar_description_is_the_body_only():
    # Shape of a real calendar.gatech.edu feed item: header, body, then labelled fields.
    description = '''
<span>Singapore Society Friday Dinner</span>

<span><span>Admin</span></span>

<span><time datetime="2026-11-06T11:58:32-05:00" title="Friday, November 6, 2026 - 11:58">Fri, 11/06/2026 - 11:58</time>
</span>
            <p>Grab dinner together. It&rsquo;s a casual way to meet new people.</p><p>Everyone is welcome.</p>
        Summary sentence
      Join us for our Friday dinner!
    Summary
      <p>Join us for our Friday dinner!</p>
    Event time
      <time datetime="2026-11-13T11:30:00Z">Fri, 11/13/2026 - 06:30</time>
 - <time datetime="2026-11-14T00:30:00Z">Fri, 11/13/2026 - 19:30</time>

    Location
      West Village Dining Hall
              <p><a href="mailto:organizer@example.edu">Pat Organizer</a></p>
'''
    xml = ('<rss><channel><item><title>Singapore Society Friday Dinner</title>'
           '<link>https://calendar.gatech.edu/event/test</link>'
           f'<description><![CDATA[{description}]]></description></item></channel></rss>').encode()
    row = parse_feed(xml, NOW)[0]
    assert row['description'] == 'Grab dinner together. It’s a casual way to meet new people.\nEveryone is welcome.'
    assert row['starts_at'].day == 13
    # The contact name and address after the body are not kept.
    assert 'Organizer' not in row['description'] and '@' not in row['description']

    bare = (b'<rss><channel><item><title>Bare</title><link>https://calendar.gatech.edu/event/bare</link>'
            b'<description><![CDATA[<time datetime="2020-01-01T12:00:00Z"></time>Event time '
            b'<time datetime="2026-11-16T18:00:00Z"></time>]]></description></item></channel></rss>')
    assert parse_feed(bare, NOW)[0]['description'] is None
