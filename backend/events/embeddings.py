"""Semantic search over imported public events, with local embeddings.

Each event's title, organizer, location and description are embedded with
fastembed (BAAI/bge-small-en-v1.5, 384 dimensions, runs on this machine with no
API key) and stored in event_embedding. search() ranks upcoming events by
cosine similarity to a query such as a student's goal.

Embeddings only rank and suggest. They never produce counts or alumni
evidence, and results are labelled match_basis "description_similarity" so
they are not mistaken for either. Event text is untrusted listing content; it
is embedded as data and is never given to a model as instructions.

When fastembed is not installed or the model cannot load, search() falls back
to keyword matching and says why, so the demo keeps working.

    pip install -r backend/requirements-embeddings.txt
    python -m backend.events.embeddings                  # embed new or changed events
    python -m backend.events.embeddings "robotics club"  # show the closest events
"""

import hashlib
import math
import re

from sqlalchemy import text

from backend.manage import ROOT

MODEL = "BAAI/bge-small-en-v1.5"
CACHE = ROOT / ".local" / "models"
TEXT_LIMIT = 2000
_STOP = set(
    "i me my a an the to for in of at and or want would like find get into become help with how can do be am looking on".split()
)
_UPCOMING = " AND e.ends_at >= now()"
_model = None


class Unavailable(RuntimeError):
    """Embeddings cannot be computed on this machine right now."""


def default_embedder():
    """The fastembed model, loaded once. Raises Unavailable when it cannot be used."""
    global _model
    if _model is None:
        try:
            from fastembed import TextEmbedding
        except ImportError as exc:
            raise Unavailable("fastembed is not installed (pip install -r backend/requirements-embeddings.txt).") from exc
        try:
            _model = TextEmbedding(MODEL, cache_dir=str(CACHE))
        except Exception as exc:
            raise Unavailable(f"The embedding model could not load ({type(exc).__name__}).") from exc
    return _model


def event_text(row):
    """What is embedded for an event: its title, organizer, location and description."""
    parts = [row.get(key) for key in ("title", "organizer", "location", "description")]
    return "\n".join(part.strip() for part in parts if part and part.strip())[:TEXT_LIMIT]


def text_hash(value):
    return hashlib.sha256((MODEL + "\n" + value).encode("utf-8")).hexdigest()


def embed_events(conn, embedder=None):
    """Embed every event whose text changed since its last embedding. Returns counts."""
    rows = conn.execute(text(
        "SELECT e.url, e.title, e.organizer, e.location, e.description, ee.text_hash "
        "FROM api_public_events e LEFT JOIN event_embedding ee ON ee.event_url = e.url"
    )).mappings().all()
    todo = []
    for row in rows:
        body = event_text(row)
        digest = text_hash(body)
        if body and digest != row["text_hash"]:
            todo.append((row["url"], body, digest))
    if todo:
        embedder = embedder or default_embedder()
        vectors = list(embedder.embed([body for _, body, _ in todo]))
        for (url, _, digest), vector in zip(todo, vectors):
            conn.execute(text(
                "INSERT INTO event_embedding (event_url, model, text_hash, vector) "
                "VALUES (:url, :model, :digest, :vector) "
                "ON CONFLICT (event_url) DO UPDATE SET model = EXCLUDED.model, "
                "text_hash = EXCLUDED.text_hash, vector = EXCLUDED.vector, embedded_at = now()"
            ), {"url": url, "model": MODEL, "digest": digest, "vector": [float(x) for x in vector]})
    return {"embedded": len(todo), "unchanged": len(rows) - len(todo)}


def _cosine(a, b):
    dot = sum(x * y for x, y in zip(a, b))
    norm = math.sqrt(sum(x * x for x in a)) * math.sqrt(sum(y * y for y in b))
    return dot / norm if norm else 0.0


def _item(row, score, basis):
    item = {key: row[key] for key in ("url", "title", "starts_at", "ends_at", "location", "organizer", "source")}
    return item | {"score": round(score, 4), "match_basis": basis}


def keyword_search(conn, query, limit=5, upcoming_only=True):
    """Events whose title, organizer or description contain the query's words."""
    terms = sorted(set(re.findall(r"[a-z0-9]+", query.lower())) - _STOP)[:20]
    if not terms:
        return []
    rows = conn.execute(text(
        "SELECT e.url, e.title, e.starts_at, e.ends_at, e.location, e.organizer, e.source, "
        "lower(concat_ws(' ', e.title, e.organizer, e.description)) AS haystack "
        "FROM api_public_events e WHERE true" + (_UPCOMING if upcoming_only else "")
    )).mappings().all()
    scored = []
    for row in rows:
        words = set(re.findall(r"[a-z0-9]+", row["haystack"]))
        hits = sum(term in words for term in terms)
        if hits:
            scored.append((hits / len(terms), row["starts_at"], row))
    scored.sort(key=lambda entry: (-entry[0], entry[1]))
    return [_item(row, score, "keyword") for score, _, row in scored[:limit]]


def search(conn, query, limit=5, embedder=None, upcoming_only=True):
    """Upcoming events closest in meaning to query, best first.

    Returns {"items", "match_basis", "status"} and, after a fallback,
    "fallback_reason". Scores are similarities for ranking only; there is no
    relevance cutoff yet, so the top results are returned even when weak.
    """
    query = (query or "").strip()
    if not query:
        return {"items": [], "match_basis": None, "status": "no_query"}
    try:
        embedder = embedder or default_embedder()
        # Plain floats: the real model returns numpy values, which JSON cannot encode.
        target = [float(x) for x in list(embedder.query_embed(query))[0]]
    except Unavailable as exc:
        items = keyword_search(conn, query, limit, upcoming_only)
        return {"items": items, "match_basis": "keyword", "status": "matched" if items else "no_match",
                "fallback_reason": str(exc)}
    rows = conn.execute(text(
        "SELECT e.url, e.title, e.starts_at, e.ends_at, e.location, e.organizer, e.source, ee.vector "
        "FROM event_embedding ee JOIN api_public_events e ON e.url = ee.event_url "
        "WHERE ee.model = :model" + (_UPCOMING if upcoming_only else "")
    ), {"model": MODEL}).mappings().all()
    scored = sorted(((_cosine(target, row["vector"]), row) for row in rows), key=lambda entry: -entry[0])
    items = [_item(row, score, "description_similarity") for score, row in scored[:limit]]
    return {"items": items, "match_basis": "description_similarity", "status": "matched" if items else "no_match"}


if __name__ == "__main__":
    import sys

    from sqlalchemy import create_engine

    from backend.manage import database_url

    engine = create_engine(database_url())
    query = " ".join(sys.argv[1:])
    with engine.begin() as conn:
        if query:
            result = search(conn, query)
            note = f" ({result['fallback_reason']})" if "fallback_reason" in result else ""
            print(f"{result['status']} by {result['match_basis']}{note}")
            for item in result["items"]:
                print(f"  {item['score']:.3f}  {item['title']}  [{item['location'] or 'no location'}]")
        else:
            counts = embed_events(conn)
            print(f"Event embeddings: {counts['embedded']} embedded, {counts['unchanged']} unchanged ({MODEL}).")
    engine.dispose()
