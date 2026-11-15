"""Typed goals resolve to path-engine activities, or honestly to no goal.

Runs against the seeded activities in a throwaway schema. The thresholds are
checked with plain numbers, the fallback with no model, and the real ranking
with the local model when it is already downloaded.
"""
from datetime import date
from uuid import uuid4

from alembic import command
from alembic.config import Config
import pytest
from sqlalchemy import create_engine, text

from backend.engine import goals
from backend.engine.goals import MARGIN, MATCH, SUGGEST, activity_text, decide, match_goal
from backend.engine.paths import path_for_goal
from backend.events import embeddings
from backend.events.embeddings import Unavailable
from backend.manage import ROOT, database_url
from backend.seed import path_fixtures


class Broken:
    def embed(self, documents):
        raise Unavailable("no model in this test")

    def query_embed(self, query):
        raise Unavailable("no model in this test")


@pytest.fixture(scope="module")
def loaded():
    engine = create_engine(database_url(test=True))
    schema = "goal_matching_test_" + uuid4().hex
    config = Config()
    config.set_main_option("script_location", str(ROOT / "backend/engine/migrations"))
    with engine.connect() as conn:
        assert conn.scalar(text("SELECT current_database()")) == "warmpath_test"
        # Identifier consists only of this constant prefix and a generated hex UUID.
        conn.execute(text(f"CREATE SCHEMA {schema}"))
        conn.execute(text(f"SET LOCAL search_path TO {schema}"))
        config.attributes["connection"] = conn
        command.upgrade(config, "head")
        ids = path_fixtures.load(conn)
        yield conn, ids
        conn.rollback()  # nothing is committed: the schema and its rows vanish
    engine.dispose()


def real_model():
    pytest.importorskip("fastembed")
    if not any(embeddings.CACHE.glob("*bge-small-en-v1.5*")):
        pytest.skip("model not downloaded; run python -m backend.events.embeddings once")


def row(id_):
    return {"id": id_, "name": f"Activity {id_}", "type": "lab"}


def test_activity_text():
    assert activity_text({"name": "SWE internship at NVIDIA", "type": "internship", "company": "NVIDIA",
                          "role": "SWE intern"}) == "SWE internship at NVIDIA. internship. at NVIDIA. SWE intern"
    assert activity_text({"name": "RoboJackets", "type": "club", "company": None, "role": None}) == "RoboJackets. club"


def test_thresholds():
    assert decide([]) == "no_match"
    assert decide([(SUGGEST - 0.01, row(1))]) == "no_match"
    assert decide([(MATCH + 0.1, row(1)), (MATCH + 0.1 - MARGIN - 0.01, row(2))]) == "matched"
    # Strong but too close to the next one: the student chooses.
    assert decide([(MATCH + 0.1, row(1)), (MATCH + 0.09, row(2))]) == "ambiguous"
    # Plausible but weak: offered, never chosen.
    assert decide([(MATCH - 0.01, row(1))]) == "ambiguous"
    assert decide([(MATCH, row(1))]) == "matched"


def test_empty_input_and_no_activities(loaded):
    conn, _ = loaded
    assert match_goal(conn, "  ")["status"] == "no_query"
    empty = create_engine(database_url(test=True))
    schema = "goal_matching_empty_" + uuid4().hex
    config = Config()
    config.set_main_option("script_location", str(ROOT / "backend/engine/migrations"))
    with empty.connect() as other:
        other.execute(text(f"CREATE SCHEMA {schema}"))
        other.execute(text(f"SET LOCAL search_path TO {schema}"))
        config.attributes["connection"] = other
        command.upgrade(config, "head")
        result = match_goal(other, "anything", embedder=Broken())
        assert result["status"] == "no_match" and result["reason"] == "No activities are loaded."
        other.rollback()
    empty.dispose()


def test_word_overlap_fallback(loaded):
    conn, ids = loaded
    result = match_goal(conn, "an NVIDIA internship", embedder=Broken())
    assert result["status"] == "matched" and result["match_basis"] == "keyword"
    assert result["goal"]["id"] == ids["activities"]["nvidia_intern"]
    assert result["fallback_reason"] == "no model in this test"
    # Two NVIDIA activities tie on one word: the student chooses.
    tied = match_goal(conn, "nvidia", embedder=Broken())
    assert tied["status"] == "ambiguous" and tied["goal"] is None and len(tied["candidates"]) >= 2
    assert match_goal(conn, "become a pastry chef", embedder=Broken())["status"] == "no_match"


@pytest.mark.parametrize("goal, expected", [
    ("I want a software internship at NVIDIA", "nvidia_intern"),
    ("research assistant in autonomy", "research_goal"),
    ("join a startup as an engineer", "thin_goal"),
])
def test_real_model_matches(loaded, goal, expected):
    real_model()
    conn, ids = loaded
    result = match_goal(conn, goal)
    assert result["status"] == "matched", result
    assert result["goal"]["id"] == ids["activities"][expected]
    assert type(result["goal"]["score"]) is float


@pytest.mark.parametrize("goal, status", [
    ("nvidia", "ambiguous"),                # GPU Systems and the NVIDIA job are too close
    ("work at nvidia after graduating", "ambiguous"),  # the job leads the internship by under MARGIN
    ("start a company", "ambiguous"),       # plausible but weak
    ("get a job at google", "no_match"),    # near the NVIDIA job, but must not be swapped in
    ("play varsity soccer", "no_match"),
    ("become a pastry chef", "no_match"),
])
def test_real_model_never_substitutes(loaded, goal, status):
    real_model()
    conn, _ = loaded
    result = match_goal(conn, goal)
    assert result["status"] == status, result
    assert result["goal"] is None
    if status == "no_match":
        assert result["candidates"] == []


def test_typed_goal_draws_its_path(loaded):
    """End to end: typed text, matched goal id, then the engine's path for it."""
    real_model()
    conn, ids = loaded
    goal = match_goal(conn, "I want a software internship at NVIDIA")["goal"]
    path = path_for_goal(conn, goal["id"], ids["students"]["compe"], today=date(2026, 11, 15))
    assert path["goal"]["label"] == "SWE internship at NVIDIA"
    assert path["stops"] and path["stops"][0]["achievers"] <= path["goal"]["achievers"]


def test_ambiguous_still_ranks_the_likely_goal_first(loaded):
    real_model()
    conn, ids = loaded
    result = match_goal(conn, "work at nvidia after graduating")
    assert result["candidates"][0]["id"] == ids["activities"]["nvidia_job"]
