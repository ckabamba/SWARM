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
from backend.api.resource_tables import verify_schema, events, feeds

FEED_URL = 'https://calendar.gatech.edu/event-calendar-week.xml'
ENGAGE_URL = 'https://gatech.campuslabs.com/engage/api/discovery/event/search'


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
        description = html.unescape(item.findtext('description') or '')
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
        rows[url] = dict(url=url, title=title[:500], starts_at=start, ends_at=end, fetched_at=fetched_at, source='gt-calendar')
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
                        organizer=str(item.get('organizationName') or '')[:300] or None)
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
    verify_schema(engine)
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
