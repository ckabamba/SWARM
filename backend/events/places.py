"""Campus places and the link from imported events to them.

Event listings give their location as free text ("Klaus 1443", "IC 111",
"Online"). This module holds the known campus buildings with coordinates,
works out which building and room a location text refers to, and records the
result in event_place for the campus map.

A location is only linked when it names a known building. Anything else is
recorded as online or unknown rather than guessed.

Refresh the shared database after importing events with:

    python -m backend.events.places
"""

import json
from pathlib import Path
import re

from sqlalchemy import text

_DATA = json.loads(Path(__file__).with_name("campus_places.json").read_text(encoding="utf-8"))
PLACES = _DATA["places"]

_TOKEN = re.compile(r"[A-Za-z0-9]+")
_ONLINE = {"online", "virtual", "zoom", "webinar"}
_EDGE = " \t\r\n,;:-/.–—"


def _tokens(value):
    """Words and numbers in value as (lowercase text, start, end)."""
    return [(m.group().casefold(), m.start(), m.end()) for m in _TOKEN.finditer(value)]


def _phrase(value):
    return [word for word, _, _ in _tokens(value)]


# (words, place name, whether the phrase names a room rather than the building)
_PHRASES = [
    (_phrase(alias), place["name"], is_room)
    for place in PLACES
    for is_room, key in ((False, "aliases"), (True, "rooms"))
    for alias in place.get(key, [])
]


def _find(words, phrase):
    """Index where phrase starts inside words, or None."""
    size = len(phrase)
    for start in range(len(words) - size + 1):
        if words[start:start + size] == phrase:
            return start
    return None


def _clean(value):
    value = re.sub(r"\(\s*\)", " ", value)
    value = re.sub(r"\s+", " ", value).strip(_EDGE)
    if value.startswith("(") and value.endswith(")"):
        value = value[1:-1].strip(_EDGE)
    return value[:200] or None


def match(location):
    """Work out what a location text refers to.

    Returns (kind, place name, room). kind is "campus" when the text names a
    known building, "online" for a remote event, and "unknown" otherwise; the
    place name and room are None unless kind is "campus".
    """
    if not location or not location.strip():
        return ("unknown", None, None)
    words = _phrase(location)

    # A building name wins over a room name, and a longer phrase over a shorter
    # one, so "Kendeda Building Room 230" matches "Kendeda Building".
    best = None
    for phrase, name, is_room in _PHRASES:
        at = _find(words, phrase)
        if at is None:
            continue
        rank = (not is_room, len(phrase), -at)
        if best is None or rank > best[0]:
            best = (rank, name, is_room)
    if best is None:
        return ("online", None, None) if _ONLINE & set(words) else ("unknown", None, None)

    _, name, is_room = best
    if is_room:
        return ("campus", name, _clean(location))

    # The room is what remains after removing every way of writing the building.
    rest = location
    aliases = sorted(
        (phrase for phrase, owner, room in _PHRASES if owner == name and not room),
        key=len, reverse=True,
    )
    for phrase in aliases:
        while True:
            found = _tokens(rest)
            at = _find([word for word, _, _ in found], phrase)
            if at is None:
                break
            rest = rest[:found[at][1]] + " " + rest[found[at + len(phrase) - 1][2]:]
    return ("campus", name, _clean(rest))


def load_places(conn):
    """Insert or update the known campus places. Returns {name: id}."""
    ids = {}
    for place in PLACES:
        ids[place["name"]] = conn.execute(
            text(
                "INSERT INTO campus_place (name, latitude, longitude) "
                "VALUES (:name, :latitude, :longitude) "
                "ON CONFLICT (name) DO UPDATE SET latitude = EXCLUDED.latitude, "
                "longitude = EXCLUDED.longitude RETURNING id"
            ),
            {key: place[key] for key in ("name", "latitude", "longitude")},
        ).scalar_one()
    return ids


def link_events(conn):
    """Match every imported event to a place. Returns how many fell in each kind.

    Safe to run again: each event's link is replaced with the current match.
    """
    ids = load_places(conn)
    counts = {"campus": 0, "online": 0, "unknown": 0}
    rows = conn.execute(text("SELECT url, location FROM api_public_events")).all()
    for url, location in rows:
        kind, name, room = match(location)
        counts[kind] += 1
        conn.execute(
            text(
                "INSERT INTO event_place (event_url, kind, place_id, room) "
                "VALUES (:url, :kind, :place_id, :room) "
                "ON CONFLICT (event_url) DO UPDATE SET kind = EXCLUDED.kind, "
                "place_id = EXCLUDED.place_id, room = EXCLUDED.room"
            ),
            {"url": url, "kind": kind, "place_id": ids.get(name), "room": room},
        )
    return counts


def events_with_places(conn):
    """Every imported event with its place, for the campus map and event details.

    location_kind is "campus", "online" or "unknown"; an event that has not been
    linked yet reads as "unknown". place is None unless location_kind is "campus".
    """
    rows = conn.execute(text(
        "SELECT e.url, e.title, e.starts_at, e.ends_at, e.source, e.organizer, e.location, "
        "       COALESCE(ep.kind, 'unknown') AS location_kind, ep.room, "
        "       p.id AS place_id, p.name AS place_name, p.latitude, p.longitude "
        "FROM api_public_events e "
        "LEFT JOIN event_place ep ON ep.event_url = e.url "
        "LEFT JOIN campus_place p ON p.id = ep.place_id "
        "ORDER BY e.starts_at, e.url"
    )).mappings()
    events = []
    for row in rows:
        event = {key: row[key] for key in
                 ("url", "title", "starts_at", "ends_at", "source", "organizer", "location", "location_kind", "room")}
        event["place"] = None if row["place_id"] is None else {
            "id": row["place_id"], "name": row["place_name"],
            "latitude": row["latitude"], "longitude": row["longitude"],
        }
        events.append(event)
    return events


if __name__ == "__main__":
    from sqlalchemy import create_engine

    from backend.manage import database_url

    engine = create_engine(database_url())
    with engine.begin() as conn:
        counts = link_events(conn)
    engine.dispose()
    print(
        f"{len(PLACES)} campus places loaded. Events linked: {counts['campus']} on campus, "
        f"{counts['online']} online, {counts['unknown']} with an unknown location."
    )
