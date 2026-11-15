"""Generated alumni and activities for developing and testing the path engine.

Everything here is invented and marked is_fixture. The membership counts are
planted on purpose so the engine has known answers to find; they are not
evidence about real alumni and must not be presented as such.

They are for local and test databases only. Keep them out of the shared
database, where they would be counted alongside real profiles. Load them with:

    python -m backend.seed.path_fixtures

The command refuses a database that is not on this machine unless you add
--allow-remote. Loading again first removes the previous fixture rows, so it
is safe to repeat.
"""

import random

from sqlalchemy import text

SEED = 2026
ALUMNI = 300
ACHIEVERS = 14
GOAL_YEAR = 3

# key: (name, type, company, role)
ACTIVITIES = {
    "nvidia_intern": ("SWE internship at NVIDIA", "internship", "NVIDIA", "SWE intern"),
    "research_goal": ("Autonomy Research Lab assistant", "lab", None, "Research assistant"),
    "thin_goal": ("Founding engineer at a campus startup", "job", None, "Founding engineer"),
    "embedded_vision": ("VIP: Embedded Vision", "vip", None, None),
    "gpu_systems": ("VIP: GPU Systems", "vip", None, None),
    "cs3210": ("CS 3210 Operating Systems", "course", None, None),
    "robojackets": ("RoboJackets", "club", None, None),
    "arch_lab": ("Computer Architecture Lab", "lab", None, None),
    "cs2110": ("CS 2110 Computer Organization", "course", None, None),
    "welcome_club": ("Jacket Welcome Club", "club", None, None),
    "racing": ("Formula Racing Electronics", "club", None, None),
    "nvidia_job": ("Full-time engineer at NVIDIA", "job", "NVIDIA", "Engineer"),
}

# Planted memberships: key -> (achievers who did it, other alumni, school year).
# With 14 achievers among 300 alumni these give the lifts in the comments.
PLANTED = {
    "embedded_vision": (9, 38, 2),  # lift 4.10
    "gpu_systems": (7, 35, 2),      # lift 3.57
    "cs3210": (8, 51, 2),           # lift 2.91
    "robojackets": (6, 48, 1),      # lift 2.38
    "arch_lab": (5, 44, 2),         # lift 2.19
    "cs2110": (4, 44, 1),           # lift 1.79: qualifies, cut by the top-5 limit
    "welcome_club": (13, 257, 1),   # lift 1.03: nearly everyone joins, drops out
    "racing": (2, 1, 1),            # lift 14.3 but only 2 achievers: too few
    "nvidia_job": (6, 4, 5),        # after the goal, so never a stop
}

_FIRST = ["Avery", "Jordan", "Priya", "Mateo", "Linh", "Omar", "Sofia", "Kwame",
          "Hana", "Diego", "Nia", "Ravi", "Elena", "Tomas", "Yuki", "Amara",
          "Caleb", "Ines", "Farid", "Mei"]
_LAST = ["Okafor", "Nguyen", "Patel", "Alvarez", "Kim", "Haddad", "Rossi",
         "Mensah", "Tanaka", "Silva", "Brooks", "Iyer", "Novak", "Castillo",
         "Sato", "Adeyemi", "Whitfield", "Moreau", "Rahimi", "Zhang"]
_MAJORS = ["CS", "CompE", "EE", "ME", "IE", "AE", "Math", "BME"]
_ACHIEVER_MAJORS = ["CompE"] * 6 + ["CS"] * 5 + ["EE"] * 3


def clear(conn):
    """Remove every fixture person and activity, and their memberships."""
    conn.execute(text("DELETE FROM person WHERE is_fixture"))
    conn.execute(text("DELETE FROM activity WHERE is_fixture"))


def _person(conn, name, kind, major, grad_year, visible=True):
    return conn.execute(
        text(
            "INSERT INTO person (name, kind, major, grad_year, profile_visible, is_fixture) "
            "VALUES (:name, :kind, :major, :grad_year, :visible, true) RETURNING id"
        ),
        {"name": name, "kind": kind, "major": major, "grad_year": grad_year, "visible": visible},
    ).scalar_one()


def _did(conn, rows):
    conn.execute(
        text(
            "INSERT INTO person_activity (person_id, activity_id, school_year) "
            "VALUES (:person_id, :activity_id, :school_year)"
        ),
        [{"person_id": p, "activity_id": a, "school_year": y} for p, a, y in rows],
    )


def load(conn, seed=SEED):
    """Insert the fixtures and return their ids.

    The result has "activities" (key -> id), "students" ("compe" and "cs" -> id),
    "achievers" and "hidden_achievers" (lists of person ids).
    """
    rng = random.Random(seed)

    activity = {}
    for key, (name, kind, company, role) in ACTIVITIES.items():
        activity[key] = conn.execute(
            text(
                "INSERT INTO activity (name, type, company, role, is_fixture) "
                "VALUES (:name, :type, :company, :role, true) RETURNING id"
            ),
            {"name": name, "type": kind, "company": company, "role": role},
        ).scalar_one()

    def name():
        return f"{rng.choice(_FIRST)} {rng.choice(_LAST)}"

    achievers = [
        _person(conn, name(), "alum", major, rng.randint(2016, 2025))
        for major in _ACHIEVER_MAJORS
    ]
    others = [
        _person(conn, name(), "alum", rng.choice(_MAJORS), rng.randint(2016, 2025))
        for _ in range(ALUMNI - ACHIEVERS)
    ]

    memberships = [(p, activity["nvidia_intern"], GOAL_YEAR) for p in achievers]
    members = {}
    for key, (from_achievers, from_others, year) in PLANTED.items():
        members[key] = rng.sample(achievers, from_achievers) + rng.sample(others, from_others)
        memberships += [(p, activity[key], year) for p in members[key]]

    # A second goal with its own pattern: 7 of its 10 achievers were in
    # RoboJackets. They are drawn from existing members so the RoboJackets
    # total, and with it the NVIDIA lifts above, stays the same.
    robo_others = [p for p in members["robojackets"] if p not in achievers]
    robo_set = set(members["robojackets"])
    researchers = rng.sample(robo_others, 7) + rng.sample(
        [p for p in others if p not in robo_set], 3
    )
    memberships += [(p, activity["research_goal"], GOAL_YEAR) for p in researchers]

    # A goal with too few achievers to say anything about.
    memberships += [(p, activity["thin_goal"], 5) for p in rng.sample(others, 2)]

    # Hidden alumni who reached the goal. The engine must not count or list them.
    hidden = [
        _person(conn, name(), "alum", "CompE", rng.randint(2016, 2025), visible=False)
        for _ in range(6)
    ]
    hidden_achievers = hidden[:2]
    for p in hidden_achievers:
        memberships += [
            (p, activity["nvidia_intern"], GOAL_YEAR),
            (p, activity["embedded_vision"], 2),
        ]

    # Two students with different starting points.
    compe = _person(conn, "Maya Chen", "student", "CompE", 2029)
    cs = _person(conn, "Devon Brooks", "student", "CS", 2030)
    memberships += [
        (compe, activity["embedded_vision"], 2),
        (compe, activity["robojackets"], 1),
        (cs, activity["robojackets"], 1),
    ]

    _did(conn, memberships)
    return {
        "activities": activity,
        "students": {"compe": compe, "cs": cs},
        "achievers": achievers,
        "hidden_achievers": hidden_achievers,
    }


if __name__ == "__main__":
    import sys

    from sqlalchemy import create_engine
    from sqlalchemy.engine import make_url

    from backend.manage import database_url

    url = make_url(database_url())
    if url.host not in ("127.0.0.1", "localhost") and "--allow-remote" not in sys.argv:
        raise SystemExit(
            f"Refusing to load fixtures into '{url.host}'. They are for local and "
            "test databases. Add --allow-remote only if you are sure."
        )
    engine = create_engine(url)
    with engine.begin() as conn:
        clear(conn)
        ids = load(conn)
    engine.dispose()
    print(
        f"Loaded {ALUMNI + 6} fixture alumni, 2 students and "
        f"{len(ids['activities'])} activities. All are marked is_fixture."
    )
