"""Event embeddings: what is embedded, incremental refresh, ranking and the keyword fallback.

The tests use a small word-count embedder so they run without downloading the
model. One test uses the real model when it is already cached locally.
"""
from datetime import datetime, timedelta, timezone
import math
import re
from uuid import uuid4

from alembic import command
from alembic.config import Config
import pytest
from sqlalchemy import create_engine, text

from backend.events import embeddings
from backend.events.embeddings import Unavailable, embed_events, event_text, search, text_hash
from backend.manage import ROOT, database_url

VOCABULARY = ["robot", "robotics", "club", "resume", "career", "workshop", "dinner", "food", "music", "concert"]


class WordCounts:
    """Stands in for fastembed: one dimension per vocabulary word."""

    def __init__(self):
        self.calls = 0

    def _vector(self, value):
        words = re.findall(r"[a-z]+", value.lower())
        return [float(words.count(word)) + 0.01 for word in VOCABULARY]

    def embed(self, documents):
        self.calls += 1
        return [self._vector(document) for document in documents]

    def query_embed(self, query):
        return [self._vector(query)]


class Broken:
    def embed(self, documents):
        raise Unavailable("no model in this test")

    def query_embed(self, query):
        raise Unavailable("no model in this test")


@pytest.fixture
def conn():
    engine = create_engine(database_url(test=True))
    schema = "event_embeddings_test_" + uuid4().hex
    config = Config()
    config.set_main_option("script_location", str(ROOT / "backend/engine/migrations"))
    with engine.connect() as connection:
        assert connection.scalar(text("SELECT current_database()")) == "warmpath_test"
        # Identifier consists only of this constant prefix and a generated hex UUID.
        connection.execute(text(f"CREATE SCHEMA {schema}"))
        connection.execute(text(f"SET LOCAL search_path TO {schema}"))
        config.attributes["connection"] = connection
        command.upgrade(config, "head")
        yield connection
        connection.rollback()  # drops the schema with everything in it
    engine.dispose()


def add_event(conn, key, title, description, days=1):
    now = datetime.now(timezone.utc)
    conn.execute(text(
        "INSERT INTO api_public_events (url, title, starts_at, ends_at, fetched_at, source, description) "
        "VALUES (:url, :title, :start, :end, :now, 'test', :description)"
    ), {"url": f"https://example.edu/{key}", "title": title, "description": description, "now": now,
        "start": now + timedelta(days=days), "end": now + timedelta(days=days, hours=2)})


def test_event_text_skips_empty_fields():
    row = {"title": " Robotics Club ", "organizer": None, "location": "", "description": "Build a robot."}
    assert event_text(row) == "Robotics Club\nBuild a robot."
    assert text_hash("a") != text_hash("b") and len(text_hash("a")) == 64


def test_embeds_only_new_or_changed_events(conn):
    add_event(conn, "robots", "Robotics club", "Build a robot with the robotics club.")
    add_event(conn, "resume", "Resume workshop", "Career center resume workshop.")
    embedder = WordCounts()
    assert embed_events(conn, embedder) == {"embedded": 2, "unchanged": 0}
    assert embed_events(conn, embedder) == {"embedded": 0, "unchanged": 2}
    assert embedder.calls == 1  # nothing to embed means no model call
    conn.execute(text("UPDATE api_public_events SET description = 'Now with food.' WHERE url LIKE '%resume'"))
    assert embed_events(conn, embedder) == {"embedded": 1, "unchanged": 1}


def test_search_ranks_by_meaning_and_labels_the_basis(conn):
    add_event(conn, "robots", "Robotics club", "Build a robot with the robotics club.")
    add_event(conn, "resume", "Resume workshop", "Career center resume workshop.")
    add_event(conn, "dinner", "Friday dinner", "Food and dinner together.")
    embed_events(conn, WordCounts())
    result = search(conn, "robot", embedder=WordCounts())
    assert result["status"] == "matched" and result["match_basis"] == "description_similarity"
    assert result["items"][0]["url"].endswith("robots")
    assert all(item["match_basis"] == "description_similarity" for item in result["items"])
    scores = [item["score"] for item in result["items"]]
    assert scores == sorted(scores, reverse=True)
    # No counts or alumni evidence ride along with a similarity result.
    assert not {"achievers", "lift"} & result["items"][0].keys()


def test_search_skips_past_events(conn):
    add_event(conn, "old", "Robotics club", "Build a robot.", days=-3)
    embed_events(conn, WordCounts())
    assert search(conn, "robot", embedder=WordCounts())["status"] == "no_match"
    assert search(conn, "robot", embedder=WordCounts(), upcoming_only=False)["items"]


def test_falls_back_to_keywords_when_embeddings_are_unavailable(conn):
    add_event(conn, "robots", "Robotics club", "Build a robot with the robotics club.")
    add_event(conn, "dinner", "Friday dinner", "Food and dinner together.")
    result = search(conn, "I want to join a robotics club", embedder=Broken())
    assert result["match_basis"] == "keyword" and result["fallback_reason"] == "no model in this test"
    assert [item["url"].rsplit("/", 1)[1] for item in result["items"]] == ["robots"]
    assert search(conn, "zzzz nothing", embedder=Broken())["status"] == "no_match"
    assert search(conn, "   ")["status"] == "no_query"


def test_missing_fastembed_is_reported_as_unavailable(monkeypatch):
    import builtins
    real_import = builtins.__import__

    def no_fastembed(name, *args, **kwargs):
        if name == "fastembed":
            raise ImportError(name)
        return real_import(name, *args, **kwargs)

    monkeypatch.setattr(embeddings, "_model", None)
    monkeypatch.setattr(builtins, "__import__", no_fastembed)
    with pytest.raises(Unavailable, match="fastembed is not installed"):
        embeddings.default_embedder()


def test_real_model_when_cached(conn):
    pytest.importorskip("fastembed")
    if not any(embeddings.CACHE.glob("*bge-small-en-v1.5*")):
        pytest.skip("model not downloaded; run python -m backend.events.embeddings once")
    add_event(conn, "robots", "Robotics club build night", "Assemble and program competition robots.")
    add_event(conn, "dinner", "Friday dinner", "Food and conversation in the dining hall.")
    embed_events(conn)
    top = search(conn, "I want to get into robotics")["items"][0]
    assert top["url"].endswith("robots")
    assert type(top["score"]) is float  # numpy values would break the JSON response
    vector = conn.execute(text("SELECT vector FROM event_embedding LIMIT 1")).scalar_one()
    assert len(vector) == 384 and math.isfinite(sum(vector))


def test_search_route(monkeypatch):
    """GET /api/events/search ranks by meaning, validates input and falls back to keywords."""
    from fastapi.testclient import TestClient
    from backend.api.app import create_app
    from backend.migrate import migrate

    url = database_url(test=True)
    migrate(url)
    engine = create_engine(url)
    source = "test-search-" + uuid4().hex
    now = datetime.now(timezone.utc)
    events = {"robots": ("Robotics club", "Build a robot with the robotics club."),
              "dinner": ("Friday dinner", "Food and dinner together.")}
    with engine.begin() as connection:
        assert connection.scalar(text("SELECT current_database()")) == "warmpath_test"
        for key, (title, description) in events.items():
            connection.execute(text(
                "INSERT INTO api_public_events (url, title, starts_at, ends_at, fetched_at, source, description) "
                "VALUES (:url, :title, :start, :end, :now, :source, :description)"
            ), {"url": f"https://example.edu/{source}/{key}", "title": title, "description": description,
                "now": now, "start": now + timedelta(days=1), "end": now + timedelta(days=1, hours=2), "source": source})
        embed_events(connection, WordCounts())
    try:
        monkeypatch.setattr(embeddings, "_model", WordCounts())
        with TestClient(create_app(url)) as client:
            body = client.get("/api/events/search", params={"q": "robot", "limit": 20}).json()
            ours = [item for item in body["items"] if source in item["url"]]
            assert body["match_basis"] == "description_similarity"
            assert ours and ours[0]["url"].endswith("/robots")
            assert client.get("/api/events/search", params={"q": ""}).status_code == 422
            assert client.get("/api/events/search", params={"q": "x", "limit": 21}).status_code == 422
            assert client.get("/api/events/search").status_code == 422

            monkeypatch.setattr(embeddings, "_model", Broken())
            body = client.get("/api/events/search", params={"q": "robotics club", "limit": 20}).json()
            assert body["match_basis"] == "keyword" and "fallback_reason" in body
            assert any(item["url"].endswith(f"{source}/robots") for item in body["items"])
    finally:
        with engine.begin() as connection:
            connection.execute(text("DELETE FROM api_public_events WHERE source = :source"), {"source": source})
        engine.dispose()
