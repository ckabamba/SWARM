"""Alumni-path engine: lift-scored stops and ranked alumni for a goal.

Every count here comes from person_activity rows. Lift measures association,
not cause: it compares how common an activity is among alumni who reached a
goal with how common it is among all alumni.

Only alumni with a visible profile are counted or listed. These rules apply to
the alumni-path feature only; resource discovery, the feed and the maps do not
use the lift filter.

Callers pass an open SQLAlchemy connection. Nothing here writes to the database.
"""

from datetime import date

from sqlalchemy import text

# Starting thresholds from docs/mvp.md. Tune them against the seed data.
MIN_LIFT = 1.5
MIN_ACHIEVERS = 3
MAX_STOPS = 5

# People ranking weights: shared activities weigh most, then major, then year.
SHARED_WEIGHT = 0.6
MAJOR_WEIGHT = 0.25
YEAR_WEIGHT = 0.15
SHARED_CAP = 3  # shared activities beyond this add nothing more
YEAR_SPAN = 10  # graduation years apart at which closeness reaches zero


class NotFound(LookupError):
    """The goal, student or activity id does not exist."""


def school_year(grad_year, today=None):
    """Derive a student's current school year from their graduation year.

    Assumes a four-year degree and an academic year that starts in August.
    Returns None when the graduation year is unknown or too far away for the
    person to be enrolled yet. Values above 4 mean past the fourth year.
    """
    if grad_year is None:
        return None
    today = today or date.today()
    academic_year_end = today.year + 1 if today.month >= 8 else today.year
    year = 4 - (grad_year - academic_year_end)
    return year if year >= 1 else None


_ALUMNI = "SELECT id FROM person WHERE kind = 'alum' AND profile_visible"

# Visible alumni who reached the goal, with the year they reached it.
_ACHIEVER = f"""
    SELECT pa.person_id, pa.school_year AS goal_year
    FROM person_activity pa
    JOIN ({_ALUMNI}) alumni ON alumni.id = pa.person_id
    WHERE pa.activity_id = :goal_id
"""

# For each activity an achiever did in an earlier school year than the goal:
# how many achievers did it, their median year, and how many alumni did it at
# any time.
_STOPS = text(f"""
    WITH achiever AS ({_ACHIEVER}),
    prior AS (
        SELECT pa.activity_id, pa.school_year
        FROM person_activity pa
        JOIN achiever ON achiever.person_id = pa.person_id
        WHERE pa.school_year < achiever.goal_year
    ),
    prior_count AS (
        SELECT activity_id,
               count(*) AS achievers,
               percentile_disc(0.5) WITHIN GROUP (ORDER BY school_year) AS typical_year
        FROM prior
        GROUP BY activity_id
    ),
    base AS (
        SELECT pa.activity_id, count(*) AS alumni
        FROM person_activity pa
        JOIN ({_ALUMNI}) alumni ON alumni.id = pa.person_id
        GROUP BY pa.activity_id
    )
    SELECT a.id, a.name, a.type, pc.achievers, pc.typical_year, base.alumni
    FROM prior_count pc
    JOIN activity a ON a.id = pc.activity_id
    JOIN base ON base.activity_id = pc.activity_id
    WHERE pc.achievers >= :min_achievers
""")

_TOTALS = text(f"""
    SELECT (SELECT count(*) FROM ({_ALUMNI}) alumni) AS alumni,
           (SELECT count(*) FROM ({_ACHIEVER}) achiever) AS achievers,
           EXISTS (
               SELECT 1 FROM person
               WHERE kind = 'alum' AND profile_visible AND is_fixture
           ) AS fixture_evidence
""")

# Achievers, or only those who did one activity before the goal.
_CANDIDATES = text(f"""
    WITH achiever AS ({_ACHIEVER})
    SELECT p.id, p.name, p.major, p.grad_year
    FROM achiever
    JOIN person p ON p.id = achiever.person_id
    WHERE CAST(:activity_id AS integer) IS NULL
       OR EXISTS (
           SELECT 1 FROM person_activity pa
           WHERE pa.person_id = achiever.person_id
             AND pa.activity_id = CAST(:activity_id AS integer)
             AND pa.school_year < achiever.goal_year
       )
""")

# Activities the student and an achiever both have, other than the goal.
_SHARED = text(f"""
    WITH achiever AS ({_ACHIEVER})
    SELECT theirs.person_id, a.id AS activity_id, a.name, a.type,
           theirs.school_year AS their_year, mine.school_year AS my_year
    FROM person_activity mine
    JOIN person_activity theirs ON theirs.activity_id = mine.activity_id
    JOIN achiever ON achiever.person_id = theirs.person_id
    JOIN activity a ON a.id = mine.activity_id
    WHERE mine.person_id = :student_id AND mine.activity_id <> :goal_id
""")


def _goal(conn, goal_id):
    row = conn.execute(
        text("SELECT id, name FROM activity WHERE id = :id"), {"id": goal_id}
    ).mappings().first()
    if row is None:
        raise NotFound(f"No goal activity with id {goal_id}.")
    return row


def _student(conn, student_id):
    row = conn.execute(
        text(
            "SELECT id, name, major, grad_year FROM person "
            "WHERE id = :id AND kind = 'student'"
        ),
        {"id": student_id},
    ).mappings().first()
    if row is None:
        raise NotFound(f"No student with id {student_id}.")
    return row


def path_for_goal(
    conn,
    goal_id,
    student_id,
    *,
    min_lift=MIN_LIFT,
    min_achievers=MIN_ACHIEVERS,
    max_stops=MAX_STOPS,
    today=None,
):
    """Return the POST /path data for one goal and one student.

    Stops are activities that achievers did before reaching the goal, kept when
    lift >= min_lift and at least min_achievers achievers did them, sorted by
    lift and cut to max_stops. An empty stops list comes with a reason instead
    of an error. Raises NotFound for an unknown goal or student.
    """
    goal = _goal(conn, goal_id)
    student = _student(conn, student_id)
    totals = conn.execute(_TOTALS, {"goal_id": goal_id}).mappings().one()
    total_alumni, total_achievers = totals["alumni"], totals["achievers"]

    stops = []
    if total_achievers >= min_achievers:
        rows = conn.execute(
            _STOPS, {"goal_id": goal_id, "min_achievers": min_achievers}
        ).mappings()
        for row in rows:
            lift = (row["achievers"] / total_achievers) / (row["alumni"] / total_alumni)
            if lift >= min_lift:
                stops.append((lift, row))
        stops.sort(key=lambda item: (-item[0], -item[1]["achievers"], item[1]["id"]))
        stops = stops[:max_stops]

    have = set(
        conn.execute(
            text("SELECT activity_id FROM person_activity WHERE person_id = :id"),
            {"id": student_id},
        ).scalars()
    )
    next_id = next((row["id"] for _, row in stops if row["id"] not in have), None)

    if total_achievers < min_achievers:
        reason = "not_enough_achievers"
    elif not stops:
        reason = "no_stop_meets_threshold"
    else:
        reason = None

    return {
        "goal": {"id": goal["id"], "label": goal["name"], "achievers": total_achievers},
        "student": {
            "id": student["id"],
            "name": student["name"],
            "major": student["major"],
            "school_year": school_year(student["grad_year"], today),
        },
        "stops": [
            {
                "activity_id": row["id"],
                "name": row["name"],
                "type": row["type"],
                "achievers": row["achievers"],
                "lift": round(lift, 2),
                "have": row["id"] in have,
                "next": row["id"] == next_id,
                "typical_year": row["typical_year"],
                # Events are not matched to activities yet (issue #12).
                "event": None,
            }
            for lift, row in stops
        ],
        "events": [],
        "reason": reason,
        # True when generated demo alumni are part of the counts above.
        "fixture_evidence": totals["fixture_evidence"],
    }


_VERB = {"club": "joined", "vip": "joined", "lab": "joined", "course": "took"}
_ORDINAL = {1: "first", 2: "second", 3: "third", 4: "fourth"}


def _shared_tie(student, alum, strongest):
    """One factual sentence about what the student and alum share, or None."""
    same_major = bool(student["major"]) and student["major"] == alum["major"]
    if strongest is None:
        return f"You are both {student['major']}" if same_major else None
    verb = _VERB.get(strongest["type"], "did")
    phrase = f"both {verb} {strongest['name']}"
    year = strongest["their_year"]
    if year == strongest["my_year"] and year in _ORDINAL:
        phrase += f" in {_ORDINAL[year]} year"
    if same_major:
        return f"You are both {student['major']} and {phrase}"
    return f"You {phrase}"


def people_for_goal(conn, goal_id, student_id, activity_id=None, *, limit=10):
    """Return ranked alumni for GET /people.

    Without activity_id these are the visible alumni who reached the goal. With
    it, only those who did that activity before reaching the goal. Each entry
    has id, name, major, grad_year, shared_tie and score. The drafted message
    is added by the API layer, not here. Raises NotFound for unknown ids.
    """
    _goal(conn, goal_id)
    student = _student(conn, student_id)
    if activity_id is not None:
        found = conn.execute(
            text("SELECT 1 FROM activity WHERE id = :id"), {"id": activity_id}
        ).first()
        if found is None:
            raise NotFound(f"No activity with id {activity_id}.")

    candidates = conn.execute(
        _CANDIDATES, {"goal_id": goal_id, "activity_id": activity_id}
    ).mappings().all()

    shared = {}
    for row in conn.execute(
        _SHARED, {"goal_id": goal_id, "student_id": student_id}
    ).mappings():
        shared.setdefault(row["person_id"], []).append(row)

    def strength(row):
        # Prefer the stop being viewed, then a tie from the same school year.
        return (
            row["activity_id"] != activity_id,
            row["their_year"] != row["my_year"],
            row["activity_id"],
        )

    people = []
    for alum in candidates:
        ties = sorted(shared.get(alum["id"], []), key=strength)
        same_major = bool(student["major"]) and student["major"] == alum["major"]
        closeness = 0.0
        if student["grad_year"] is not None and alum["grad_year"] is not None:
            gap = abs(student["grad_year"] - alum["grad_year"])
            closeness = max(0.0, 1 - gap / YEAR_SPAN)
        score = (
            SHARED_WEIGHT * min(len(ties), SHARED_CAP) / SHARED_CAP
            + MAJOR_WEIGHT * same_major
            + YEAR_WEIGHT * closeness
        )
        people.append(
            {
                "id": alum["id"],
                "name": alum["name"],
                "major": alum["major"],
                "grad_year": alum["grad_year"],
                "shared_tie": _shared_tie(student, alum, ties[0] if ties else None),
                "score": round(score, 2),
            }
        )

    people.sort(key=lambda person: (-person["score"], person["id"]))
    return people[:limit]
