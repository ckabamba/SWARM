"""Real, consent-filtered path queries and persistent participant-owned asks."""
from datetime import datetime, timezone
import hashlib
import json
from typing import Literal
from uuid import UUID

from fastapi import HTTPException, Query, Request
from pydantic import BaseModel, ConfigDict, Field, field_validator
from sqlalchemy import and_, insert, or_, select, text, update

from backend.engine.paths import NotFound, path_for_goal, people_for_goal, _PUBLIC_HISTORY


class AskCreate(BaseModel):
    # Preserve the exact edited message, including intentional whitespace.
    model_config = ConfigDict(extra='forbid')
    alum_id: int = Field(ge=1, le=2147483647)
    goal_id: int = Field(ge=1, le=2147483647)
    message: str = Field(min_length=1, max_length=2000)
    request_id: UUID

    @field_validator('message')
    @classmethod
    def meaningful_message(cls, value):
        if not value.strip():
            raise ValueError('Write a message before sending your ask.')
        return value


class PathwayService:
    def __init__(self, profiles, demo_histories=False):
        self.profiles = profiles
        self.demo_histories = demo_histories

    def path(self, conn, actor, goal_id):
        try:
            result = path_for_goal(conn, goal_id, actor['person_id'], include_fixtures=self.demo_histories)
        except NotFound as error:
            raise HTTPException(404, str(error)) from None
        resource_rows = conn.execute(text("""SELECT a.id AS activity_id,r.id,r.name,r.url,r.summary
            FROM activity a JOIN api_resources r ON r.id=a.resource_id WHERE a.id=ANY(:ids)"""),
            {'ids':[s['activity_id'] for s in result['stops']]}).mappings()
        resources = {r['activity_id']:{k:r[k] for k in ('id','name','url','summary')} for r in resource_rows}
        for stop in result['stops']:
            stop['resource'] = resources.get(stop['activity_id'])
        return {**result, 'mode': 'alumni' , 'evidence': 'synthetic_demo' if self.demo_histories else 'self_reported',
                'population': 'Includes invented demo alumni' if self.demo_histories else 'Public alumni with explicitly shared history',
                'school_year_basis': 'estimated_from_graduation_year'}

    def people(self, conn, actor, goal_id, activity_id, limit):
        try:
            people = people_for_goal(conn, goal_id, actor['person_id'], activity_id, limit=limit, include_fixtures=self.demo_histories)
        except NotFound as error:
            raise HTTPException(404, str(error)) from None
        goals = self.profiles.tables['activity']
        goal = conn.scalar(select(goals.c.name).where(goals.c.id == goal_id))
        accounts = self.profiles.tables['account']
        persons = self.profiles.tables['person']
        reachable = set(conn.scalars(select(accounts.c.person_id).join(persons, persons.c.id == accounts.c.person_id).where(
            accounts.c.person_id.in_([p['id'] for p in people]), persons.c.is_fixture.is_(False))))
        course_rows=conn.execute(text(f"""WITH history AS ({_PUBLIC_HISTORY})
            SELECT h.person_id,r.id,r.name,r.url,h.school_year
            FROM history h JOIN activity a ON a.id=h.activity_id
            JOIN api_resources r ON r.id=a.resource_id
            JOIN history goal ON goal.person_id=h.person_id AND goal.activity_id=:goal
            WHERE h.person_id=ANY(:ids) AND a.type='course' AND h.school_year<goal.school_year
            ORDER BY h.school_year,r.name"""),{'include_fixtures':self.demo_histories,'ids':[p['id'] for p in people],'goal':goal_id}).mappings().all()
        for person in people:
            person['courses']=[{k:r[k] for k in ('id','name','url','school_year')} for r in course_rows if r['person_id']==person['id']]
            tie = person['shared_tie']
            introduction = (' ' + tie + '.') if tie else ''
            person.update(can_ask=person['id'] in reachable,
                draft=f"Hi {person['name']},{introduction} I'm exploring {goal}. Would you be open to a short conversation about your experience?",
                evidence='synthetic_demo' if self.demo_histories else 'self_reported')
        return {'items': people, 'evidence': 'synthetic_demo' if self.demo_histories else 'self_reported', 'fixture_evidence': self.demo_histories}


def install_pathways(app, service, *, demo_histories=False):
    from backend.api.connections import install_connections
    install_connections(app, service, demo_histories=demo_histories)
    engine = service.engine
    pathways = PathwayService(service, demo_histories)

    @app.get('/api/goals')
    def goals(q: str = Query(default='', max_length=100), limit: int = Query(default=50, ge=1, le=100)):
        # A canonical row made from a private resume is not a public goal listing.
        # Expose it only after an actual public alumnus shares participation.
        with engine.connect() as conn:
            rows = conn.execute(text("""
                SELECT a.id, a.name AS label, a.type, count(*) AS achievers
                FROM activity a JOIN person_activity pa ON pa.activity_id = a.id
                JOIN person p ON p.id = pa.person_id
                WHERE p.profile_visible AND p.kind = 'alum' AND (
                    (:demo AND a.is_fixture AND p.is_fixture) OR
                    (NOT a.is_fixture AND NOT p.is_fixture AND pa.history_managed AND pa.public_school_year IS NOT NULL))
                  AND strpos(lower(a.name), lower(:query)) > 0
                GROUP BY a.id ORDER BY lower(a.name), a.id LIMIT :limit
            """), {'query': q.strip(), 'limit': limit, 'demo': demo_histories}).mappings()
            return {'items': [dict(row) for row in rows], 'evidence': 'synthetic_demo' if demo_histories else 'self_reported', 'fixture_evidence': demo_histories}

    @app.get('/api/people')
    def people(request: Request, goal_id: int | None = Query(default=None, ge=1),
               activity_id: int | None = Query(default=None, ge=1), limit: int = Query(default=10, ge=1, le=50)):
        if goal_id is None:
            if activity_id is not None:
                raise HTTPException(422, 'Choose a goal first.')
            return {'items': [], 'status': 'not_available', 'message': 'Choose a shared alumni goal to browse people.'}
        with engine.connect() as conn:
            actor = service.actor(request, conn)
            return pathways.people(conn, actor, goal_id, activity_id, limit)

    def render(conn, row, actor):
        people = service.tables['person']
        names = {p['id']: p['name'] for p in conn.execute(select(people.c.id, people.c.name).where(
            people.c.id.in_([row['sender_id'], row['recipient_id']]))).mappings()}
        return {'id': row['id'], 'sender': {'id': row['sender_id'], 'name': names[row['sender_id']]},
                'recipient': {'id': row['recipient_id'], 'name': names[row['recipient_id']]},
                'goal': {'id': row['goal_id'], 'label': row['goal_label']},
                'message': row['message'], 'status': row['status'],
                'created_at': row['created_at'], 'accepted_at': row['accepted_at'],
                'can_accept': actor['person_id'] == row['recipient_id'] and row['status'] == 'sent',
                'reply_url': '/app/#/reply/' + str(row['id'])}

    def participant(conn, actor, ask_id):
        asks = service.tables['ask']
        row = conn.execute(select(asks).where(asks.c.id == ask_id,
            or_(asks.c.sender_id == actor['person_id'], asks.c.recipient_id == actor['person_id']))).mappings().first()
        if row is None:
            raise HTTPException(404, 'Ask not found.')
        return row

    @app.get('/api/asks')
    def asks(request: Request, box: Literal['all', 'inbox', 'outbox'] = 'all',
             before: int | None = Query(default=None, ge=1), limit: int = Query(default=20, ge=1, le=50)):
        with engine.connect() as conn:
            actor = service.actor(request, conn)
            table = service.tables['ask']
            filters = [table.c.recipient_id == actor['person_id']] if box == 'inbox' else [table.c.sender_id == actor['person_id']] if box == 'outbox' else [or_(table.c.sender_id == actor['person_id'], table.c.recipient_id == actor['person_id'])]
            if before is not None:
                filters.append(table.c.id < before)
            rows = list(conn.execute(select(table).where(*filters).order_by(table.c.id.desc()).limit(limit+1)).mappings())
            return {'items': [render(conn, row, actor) for row in rows[:limit]],
                    'next_cursor': rows[limit-1]['id'] if len(rows) > limit else None}

    @app.post('/api/asks', status_code=201)
    def create_ask(body: AskCreate, request: Request):
        with engine.begin() as conn:
            actor = service.actor(request, conn)
            service.throttle('asks:' + actor['id'], 20)
            table, people = service.tables['ask'], service.tables['person']
            # Serialize same-sender requests and hold recipient visibility stable
            # through commit. Consistent lock order avoids cross-ask deadlocks.
            conn.execute(select(people.c.id).where(people.c.id.in_([actor['person_id'], body.alum_id]))
                         .order_by(people.c.id).with_for_update()).all()
            payload = body.model_dump(exclude={'request_id'})
            fingerprint = hashlib.sha256(json.dumps(payload, sort_keys=True).encode()).hexdigest()
            existing = conn.execute(select(table).where(table.c.sender_id == actor['person_id'],
                table.c.request_id == str(body.request_id))).mappings().first()
            if existing:
                if existing['request_hash'] != fingerprint:
                    raise HTTPException(409, 'This request ID was already used for a different ask.')
                return render(conn, existing, actor)
            if body.alum_id == actor['person_id']:
                raise HTTPException(422, 'Choose another member to contact.')
            recipient = conn.execute(text("""
                SELECT p.id, a.name AS goal_label
                FROM person p JOIN account acc ON acc.person_id = p.id
                JOIN person_activity pa ON pa.person_id = p.id
                JOIN activity a ON a.id = pa.activity_id
                WHERE p.id = :recipient_id AND p.kind = 'alum' AND p.profile_visible
                  AND NOT p.is_fixture AND NOT a.is_fixture AND pa.activity_id = :goal_id
                  AND pa.history_managed AND pa.public_school_year IS NOT NULL
                FOR SHARE OF pa
            """), {'recipient_id': body.alum_id, 'goal_id': body.goal_id}).mappings().first()
            if recipient is None:
                raise HTTPException(404, 'This alumni goal or recipient is no longer available.')
            ask_id = conn.scalar(insert(table).values(sender_id=actor['person_id'], recipient_id=body.alum_id,
                goal_id=body.goal_id, goal_label=recipient['goal_label'], message=body.message,
                request_id=str(body.request_id), request_hash=fingerprint).returning(table.c.id))
            return render(conn, participant(conn, actor, ask_id), actor)

    @app.get('/api/asks/{ask_id}')
    def ask_detail(ask_id: int, request: Request):
        with engine.connect() as conn:
            actor = service.actor(request, conn)
            return render(conn, participant(conn, actor, ask_id), actor)

    @app.post('/api/asks/{ask_id}/accept')
    def accept(ask_id: int, request: Request):
        with engine.begin() as conn:
            actor = service.actor(request, conn)
            row = participant(conn, actor, ask_id)
            if actor['person_id'] != row['recipient_id']:
                raise HTTPException(403, 'Only the recipient can accept this ask.')
            table = service.tables['ask']
            conn.execute(update(table).where(table.c.id == ask_id, table.c.recipient_id == actor['person_id'],
                table.c.status == 'sent').values(status='accepted', accepted_at=datetime.now(timezone.utc)))
            return render(conn, participant(conn, actor, ask_id), actor)

    return pathways
