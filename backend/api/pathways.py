"""Real, consent-filtered path queries and persistent participant-owned asks."""
from datetime import datetime, timezone
import hashlib
import json
from typing import Literal
from uuid import UUID

from fastapi import HTTPException, Query, Request
from pydantic import BaseModel, ConfigDict, Field, field_validator
from sqlalchemy import and_, insert, or_, select, text, update

from backend.engine.paths import NotFound, path_for_goal, people_for_goal


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
    def __init__(self, profiles):
        self.profiles = profiles

    def path(self, conn, actor, goal_id):
        try:
            result = path_for_goal(conn, goal_id, actor['person_id'])
        except NotFound as error:
            raise HTTPException(404, str(error)) from None
        return {**result, 'mode': 'alumni', 'evidence': 'self_reported',
                'population': 'Public alumni with explicitly shared history',
                'school_year_basis': 'estimated_from_graduation_year'}

    def people(self, conn, actor, goal_id, activity_id, limit):
        try:
            people = people_for_goal(conn, goal_id, actor['person_id'], activity_id, limit=limit)
        except NotFound as error:
            raise HTTPException(404, str(error)) from None
        goals = self.profiles.tables['activity']
        goal = conn.scalar(select(goals.c.name).where(goals.c.id == goal_id))
        accounts = self.profiles.tables['account']
        reachable = set(conn.scalars(select(accounts.c.person_id).where(accounts.c.person_id.in_([p['id'] for p in people]))))
        for person in people:
            tie = person['shared_tie']
            introduction = (' ' + tie + '.') if tie else ''
            person.update(can_ask=person['id'] in reachable,
                draft=f"Hi {person['name']},{introduction} I'm exploring {goal}. Would you be open to a short conversation about your experience?",
                evidence='self_reported')
        return {'items': people, 'evidence': 'self_reported', 'fixture_evidence': False}


def install_pathways(app, service):
    engine = service.engine
    pathways = PathwayService(service)

    @app.get('/api/goals')
    def goals(q: str = Query(default='', max_length=100), limit: int = Query(default=50, ge=1, le=100)):
        # A canonical row made from a private resume is not a public goal listing.
        # Expose it only after an actual public alumnus shares participation.
        with engine.connect() as conn:
            rows = conn.execute(text("""
                SELECT a.id, a.name AS label, a.type, count(*) AS achievers
                FROM activity a JOIN person_activity pa ON pa.activity_id = a.id
                JOIN person p ON p.id = pa.person_id
                WHERE NOT a.is_fixture AND NOT p.is_fixture AND p.profile_visible
                  AND p.kind = 'alum' AND pa.history_managed AND pa.public_school_year IS NOT NULL
                  AND strpos(lower(a.name), lower(:query)) > 0
                GROUP BY a.id ORDER BY lower(a.name), a.id LIMIT :limit
            """), {'query': q.strip(), 'limit': limit}).mappings()
            return {'items': [dict(row) for row in rows], 'evidence': 'self_reported', 'fixture_evidence': False}

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
