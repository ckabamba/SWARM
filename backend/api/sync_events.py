"""Refresh public event metadata from GT's advertised RSS feed; no login/scraping of profiles."""
from datetime import datetime, timezone
import html
import json
import re
from urllib.parse import urlparse, urlencode
from urllib.request import Request, urlopen
import xml.etree.ElementTree as ET

from sqlalchemy import create_engine
from sqlalchemy.dialects.postgresql import insert
from backend.manage import database_url
from backend.api.app import initialize_schema, events, feeds

FEED_URL = 'https://calendar.gatech.edu/event-calendar-week.xml'
ENGAGE_URL = 'https://gatech.campuslabs.com/engage/api/discovery/event/search'
DESCRIPTION_LIMIT = 4000
_LINE_BREAK = re.compile(r'<\s*(br|/p|/li|/div|/h[1-6]|/tr)\b[^>]*>', re.IGNORECASE)


def plain_text(markup, limit=DESCRIPTION_LIMIT):
    """Listing HTML as plain text: tags removed, entities decoded, whitespace tidied.

    The result is untrusted text written by whoever posted the listing. Render it
    as text, and treat it as data rather than instructions when it is given to a model.
    """
    value = re.sub(r'(?is)<(script|style)\b.*?</\1\s*>', ' ', str(markup or ''))
    value = _LINE_BREAK.sub('\n', value)
    value = html.unescape(re.sub(r'<[^>]*>', '', value)).replace('\xa0', ' ')
    lines = [re.sub(r'[ \t\r\f\v]+', ' ', line).strip() for line in value.split('\n')]
    value = re.sub(r'\n{3,}', '\n\n', '\n'.join(lines)).strip()
    return value[:limit] or None


def calendar_description(markup):
    """The body of a calendar listing, without its header or trailing fields.

    The feed wraps the body between a header (title, author, publication time)
    and labelled fields that start at "Summary sentence". Stopping there also
    keeps the contact names and email addresses that follow out of the text.
    """
    body = re.split(r'Summary sentence|Event time', markup, maxsplit=1)[0]
    header = re.search(r'</time>\s*(</span>)?', body)
    if header:
        body = body[header.end():]
    return plain_text(body)


def parse_feed(payload, fetched_at):
    if len(payload) > 4_000_000 or b'<!DOCTYPE' in payload.upper() or b'<!ENTITY' in payload.upper():
        raise ValueError('Unsupported or oversized calendar feed.')
    root = ET.fromstring(payload)
    if root.tag != 'rss' or root.find('channel') is None:
        raise ValueError('Expected an RSS channel; keeping the previous import.')
    rows = {}
    for item in root.findall('./channel/item'):
        title = (item.findtext('title') or '').strip()
        url = (item.findtext('link') or '').strip()
        parsed = urlparse(url)
        if parsed.scheme != 'https' or parsed.netloc != 'calendar.gatech.edu' or not parsed.path.startswith('/event/'):
            continue
        markup = item.findtext('description') or ''
        description = html.unescape(markup)
        # The first <time> is publication time. Only dates following the
        # explicit Event time label represent the event itself.
        section = description.partition('Event time')[2]
        times = re.findall(r'<time\b[^>]*datetime="([^"]+)"', section)[:2]
        if not title or not times:
            continue
        try:
            start = datetime.fromisoformat(times[0].replace('Z', '+00:00'))
            end = datetime.fromisoformat(times[-1].replace('Z', '+00:00'))
        except ValueError:
            continue
        if start.tzinfo is None or end.tzinfo is None or end < start:
            continue
        rows[url] = dict(url=url, title=title[:500], starts_at=start, ends_at=end, fetched_at=fetched_at, source='gt-calendar',
                        description=calendar_description(markup))
    if root.findall('./channel/item') and not rows:
        raise ValueError('No event timestamps could be parsed; keeping previous import.')
    return list(rows.values())


def parse_engage(payload, fetched_at):
    if len(payload) > 4_000_000:
        raise ValueError('Oversized Engage response.')
    data = json.loads(payload)
    if not isinstance(data, dict) or not isinstance(data.get('value'), list):
        raise ValueError('Unexpected Engage response; keeping previous import.')
    rows = {}
    for item in data['value']:
        if item.get('visibility') != 'Public' or item.get('status') != 'Approved':
            continue
        if str(item.get('organizationName', '')).strip().casefold() in {'sandbox', 'test organization', 'test org'}:
            continue
        identifier = str(item.get('id', ''))
        if not identifier.isdigit():
            continue
        try:
            start = datetime.fromisoformat(item['startsOn'].replace('Z', '+00:00'))
            end = datetime.fromisoformat(item['endsOn'].replace('Z', '+00:00'))
        except (KeyError, ValueError, TypeError):
            continue
        title = str(item.get('name', '')).strip()
        if not title or not start.tzinfo or not end.tzinfo or end < start:
            continue
        url = f'https://gatech.campuslabs.com/engage/event/{identifier}'
        rows[url] = dict(url=url, title=title[:500], starts_at=start, ends_at=end,
                        fetched_at=fetched_at, source='gt-engage',
                        location=str(item.get('location') or '')[:500] or None,
                        organizer=str(item.get('organizationName') or '')[:300] or None,
                        description=plain_text(item.get('description')))
    if data['value'] and not rows:
        raise ValueError('No usable public events in Engage response; keeping previous import.')
    return list(rows.values())


def download(url):
    request = Request(url, headers={'User-Agent': 'WarmPath-local-prototype/0.1 (public campus event metadata)'})
    with urlopen(request, timeout=25) as response:
        return response.read(4_000_001)


def sync(url=None):
    fetched = datetime.now(timezone.utc)
    engine = create_engine(url or database_url())
    initialize_schema(engine)
    query = urlencode({'take':60, 'orderByField':'startsOn', 'orderByDirection':'ascending',
                       'status':'Approved', 'endsAfter':fetched.isoformat()})
    failures = []
    for source, address, parser in [('gt-calendar', FEED_URL, parse_feed), ('gt-engage', ENGAGE_URL+'?'+query, parse_engage)]:
        try:
            rows = parser(download(address), fetched)
            with engine.begin() as conn:
                for row in rows:
                    stmt = insert(events).values(**row)
                    conn.execute(stmt.on_conflict_do_update(index_elements=['url'], set_=row))
                stmt = insert(feeds).values(name=source, fetched_at=fetched)
                conn.execute(stmt.on_conflict_do_update(index_elements=['name'], set_={'fetched_at': fetched}))
            print(f'Imported {len(rows)} public event records from {source}.')
        except Exception as exc:
            failures.append(source)
            print(f'{source}: refresh failed ({type(exc).__name__}); previous snapshot retained.')
    engine.dispose()
    if failures:
        raise SystemExit(1)


if __name__ == '__main__':
    sync()
