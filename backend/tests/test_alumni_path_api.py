"""POST /api/alumni-path and GET /api/people against the seeded alumni.

The API runs on its own schema in warmpath_test, so the seeded people never
mix with other tests' data. Goal text is resolved by word overlap here (no
model), which keeps the results fixed; test_goal_matching.py covers the model.
"""
from uuid import uuid4

from fastapi.testclient import TestClient
import pytest
from sqlalchemy import create_engine, text

from backend.api.app import create_app
from backend.events import embeddings
from backend.events.embeddings import Unavailable
from backend.manage import database_url
from backend.migrate import migrate
from backend.seed import path_fixtures


class Broken:
    def embed(self, documents):
        raise Unavailable("no model in this test")

    def query_embed(self, query):
        raise Unavailable("no model in this test")


@pytest.fixture(scope="module")
def seeded():
    base = database_url(test=True)
    admin = create_engine(base)
    schema = "alumni_path_api_test_" + uuid4().hex
    with admin.begin() as conn:
        assert conn.scalar(text("SELECT current_database()")) == "warmpath_test"
        # Identifier consists only of this constant prefix and a generated hex UUID.
        conn.execute(text(f"CREATE SCHEMA {schema}"))
    url = base + ("&" if "?" in base else "?") + f"options=-csearch_path%3D{schema}"
    try:
        migrate(url)
        engine = create_engine(url)
        with engine.begin() as conn:
            ids = path_fixtures.load(conn)
        engine.dispose()
        yield create_app(url), ids
    finally:
        with admin.begin() as conn:
            conn.execute(text(f"DROP SCHEMA {schema} CASCADE"))
        admin.dispose()


@pytest.fixture
def client(seeded, monkeypatch):
    app, ids = seeded
    monkeypatch.setattr(embeddings, "_model", Broken())
    with TestClient(app) as test_client:
        yield test_client, ids


def test_typed_goal_returns_its_path(client):
    api, ids = client
    student = ids["students"]["compe"]
    body = api.post("/api/alumni-path", json={"goal": "an NVIDIA internship", "student_id": student}).json()
    assert body["match"]["status"] == "matched" and body["match"]["match_basis"] == "keyword"
    path = body["path"]
    assert path["goal"]["id"] == ids["activities"]["nvidia_intern"]
    assert path["student"]["id"] == student
    assert path["stops"] and path["fixture_evidence"] is True
    assert sum(stop["next"] for stop in path["stops"]) <= 1
    for stop in path["stops"]:
        assert stop["achievers"] <= path["goal"]["achievers"] and stop["lift"] >= 1.5


def test_ambiguous_and_unmatched_goals_draw_nothing(client):
    api, ids = client
    student = ids["students"]["compe"]
    ambiguous = api.post("/api/alumni-path", json={"goal": "nvidia", "student_id": student}).json()
    assert ambiguous["match"]["status"] == "ambiguous" and ambiguous["path"] is None
    assert len(ambiguous["match"]["candidates"]) >= 2
    unmatched = api.post("/api/alumni-path", json={"goal": "become a pastry chef", "student_id": student}).json()
    assert unmatched["match"]["status"] == "no_match" and unmatched["path"] is None


def test_picking_a_candidate_by_id(client):
    api, ids = client
    goal = ids["activities"]["research_goal"]
    body = api.post("/api/alumni-path", json={"goal_id": goal, "student_id": ids["students"]["cs"]}).json()
    assert body["match"]["status"] == "selected" and body["path"]["goal"]["id"] == goal


def test_alumni_path_validation(client):
    api, ids = client
    student = ids["students"]["compe"]
    assert api.post("/api/alumni-path", json={"student_id": student}).status_code == 422
    assert api.post("/api/alumni-path", json={"goal": "  ", "student_id": student}).status_code == 422
    both = {"goal": "nvidia", "goal_id": ids["activities"]["nvidia_intern"], "student_id": student}
    assert api.post("/api/alumni-path", json=both).status_code == 422
    assert api.post("/api/alumni-path", json={"goal": "x" * 301, "student_id": student}).status_code == 422
    assert api.post("/api/alumni-path", json={"goal_id": 999999, "student_id": student}).status_code == 404
    assert api.post("/api/alumni-path", json={"goal": "an NVIDIA internship", "student_id": 999999}).status_code == 404


def test_people_behind_a_goal_and_a_stop(client):
    api, ids = client
    goal, student = ids["activities"]["nvidia_intern"], ids["students"]["compe"]
    everyone = api.get("/api/people", params={"goal_id": goal, "student_id": student}).json()
    assert everyone["status"] == "ok" and everyone["items"]
    person = everyone["items"][0]
    assert {"id", "name", "major", "grad_year", "shared_tie", "score", "draft"} <= person.keys()
    assert person["draft"] is None
    stop = ids["activities"]["embedded_vision"]
    behind = api.get("/api/people", params={"goal_id": goal, "student_id": student, "activity_id": stop}).json()
    assert behind["items"] and len(behind["items"]) <= len(everyone["items"])
    assert api.get("/api/people", params={"goal_id": goal, "student_id": student, "limit": 2}).json()["items"].__len__() <= 2


def test_people_without_ids_or_with_unknown_ids(client):
    api, ids = client
    assert api.get("/api/people").json()["status"] == "not_available"
    assert api.get("/api/people", params={"goal_id": 999999, "student_id": ids["students"]["compe"]}).status_code == 404


def test_real_model_through_the_api(seeded):
    pytest.importorskip("fastembed")
    if not any(embeddings.CACHE.glob("*bge-small-en-v1.5*")):
        pytest.skip("model not downloaded; run python -m backend.events.embeddings once")
    app, ids = seeded
    student = ids["students"]["compe"]
    with TestClient(app) as api:
        body = api.post("/api/alumni-path", json={"goal": "I want a software internship at NVIDIA",
                                                  "student_id": student}).json()
        assert body["match"]["match_basis"] == "description_similarity"
        assert body["path"]["goal"]["id"] == ids["activities"]["nvidia_intern"]
        refused = api.post("/api/alumni-path", json={"goal": "get a job at google", "student_id": student}).json()
        assert refused["match"]["status"] == "no_match" and refused["path"] is None
