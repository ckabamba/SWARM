"""Turn a typed goal into an activity the path engine can score.

The path engine (paths.py) takes a goal as an activity id. This module reads
what a student types, such as "I want a software internship at NVIDIA", and
finds the activity it means, using the same local embeddings as event search
(backend/events/embeddings.py).

It never substitutes a goal. A clear, confident match is "matched". A weak or
close call is "ambiguous" and returns candidates for the student to choose
from. Anything else is "no_match", so the UI can say there is no path for
that goal instead of drawing an unrelated one (docs/mvp.md, LLM use).

When embeddings are unavailable it falls back to word overlap and says why.

    python -m backend.engine.goals "I want to do robotics research"
"""

import math
import re

from sqlalchemy import text

from backend.events.embeddings import MODEL, Unavailable, default_embedder

# Tuned on the seeded activities with BAAI/bge-small-en-v1.5 on 2026-11-15.
# Correct goals scored 0.81 to 0.94; unrelated goals ("a job at Google", "play
# varsity soccer", "become a pastry chef") scored 0.53 to 0.62; vague ones
# ("start a company", "do robotics research") fell between. Retune if the model
# or the activity list changes.
MATCH = 0.70     # at least this similar to choose the goal
MARGIN = 0.05    # and this far ahead of the next activity
SUGGEST = 0.63   # at least this similar to offer it as a candidate

_STOP = set(
    "i me my a an the to for in of at and or want would like find get into become help with how can do be am "
    "looking on as some".split()
)
_vectors = {}  # id(model) -> {activity text: vector}, for the shared default model


def activity_text(row):
    """What is embedded for an activity: its name, type, company and role."""
    company = row.get("company")
    parts = [row.get("name"), row.get("type"), company and f"at {company}", row.get("role")]
    return ". ".join(part.strip() for part in parts if part and part.strip())


def _cosine(a, b):
    dot = sum(x * y for x, y in zip(a, b))
    norm = math.sqrt(sum(x * x for x in a)) * math.sqrt(sum(y * y for y in b))
    return dot / norm if norm else 0.0


def _candidate(row, score):
    return {"id": row["id"], "label": row["name"], "type": row["type"], "score": round(float(score), 4)}


def decide(scored):
    """Status for (score, row) pairs sorted best first: matched, ambiguous or no_match."""
    if not scored or scored[0][0] < SUGGEST:
        return "no_match"
    top = scored[0][0]
    second = scored[1][0] if len(scored) > 1 else 0.0
    return "matched" if top >= MATCH and top - second >= MARGIN else "ambiguous"


def _result(status, scored, basis, limit, **extra):
    candidates = [] if status == "no_match" else [
        _candidate(row, score) for score, row in scored[:limit] if score >= SUGGEST or basis == "keyword"]
    goal = candidates[0] if status == "matched" else None
    return {"status": status, "goal": goal, "candidates": candidates, "match_basis": basis} | extra


def _keywords(goal, rows, limit, reason):
    terms = set(re.findall(r"[a-z0-9]+", goal.lower())) - _STOP
    scored = []
    for row in rows:
        words = set(re.findall(r"[a-z0-9]+", activity_text(row).lower()))
        hits = len(terms & words)
        if hits:
            scored.append((hits / len(terms), row))
    scored.sort(key=lambda entry: (-entry[0], entry[1]["id"]))
    if not scored:
        status = "no_match"
    elif len(scored) == 1 or scored[0][0] > scored[1][0]:
        status = "matched"
    else:
        status = "ambiguous"
    return _result(status, scored, "keyword", limit, fallback_reason=reason)


def match_goal(conn, goal, embedder=None, limit=3, *, include_fixtures=False):
    """The activity a typed goal refers to.

    Returns {"status", "goal", "candidates", "match_basis"}: goal is
    {id, label, type, score} when status is "matched", else None. Pass
    goal["id"] to paths.path_for_goal. Scores rank meaning only; they are not
    evidence that anyone reached the goal.
    """
    goal = (goal or "").strip()
    if not goal:
        return {"status": "no_query", "goal": None, "candidates": [], "match_basis": None}
    rows = conn.execute(text("""
        SELECT a.id, a.name, a.type, a.company, a.role FROM activity a
        WHERE :include_fixtures OR (NOT a.is_fixture AND EXISTS (
            SELECT 1 FROM person_activity pa JOIN person p ON p.id = pa.person_id
            WHERE pa.activity_id = a.id AND NOT p.is_fixture AND p.profile_visible
              AND p.kind = 'alum' AND pa.history_managed AND pa.public_school_year IS NOT NULL
        )) ORDER BY a.id
    """), {"include_fixtures": include_fixtures}).mappings().all()
    if not rows:
        return {"status": "no_match", "goal": None, "candidates": [], "match_basis": None,
                "reason": "No activities are loaded."}
    try:
        # Cache per model object, so vectors from one embedder are never read for another.
        cache = {} if embedder is not None else None
        embedder = embedder or default_embedder()
        cache = _vectors.setdefault(id(embedder), {}) if cache is None else cache
        target = [float(x) for x in list(embedder.query_embed(goal))[0]]
        missing = sorted({activity_text(row) for row in rows} - cache.keys())
        if missing:
            for body, vector in zip(missing, embedder.embed(missing)):
                cache[body] = [float(x) for x in vector]
    except Unavailable as exc:
        return _keywords(goal, rows, limit, str(exc))
    scored = sorted(((_cosine(target, cache[activity_text(row)]), row) for row in rows), key=lambda entry: -entry[0])
    return _result(decide(scored), scored, "description_similarity", limit, model=MODEL)


if __name__ == "__main__":
    import sys

    from sqlalchemy import create_engine

    from backend.manage import database_url

    engine = create_engine(database_url())
    with engine.connect() as conn:
        result = match_goal(conn, " ".join(sys.argv[1:]))
    engine.dispose()
    note = f" ({result['fallback_reason']})" if "fallback_reason" in result else ""
    print(f"{result['status']} by {result['match_basis']}{note}")
    for candidate in result["candidates"]:
        print(f"  {candidate['score']:.3f}  #{candidate['id']} {candidate['label']} ({candidate['type']})")
