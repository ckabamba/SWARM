"""Thermal's first local, real-source resource service.

Public resources are curated, not inferred alumni evidence. No personal records
are seeded. Anonymous workspace cookies scope saved goals/resources to a browser.
"""
from contextlib import asynccontextmanager
import asyncio
from contextlib import suppress
from datetime import datetime, timedelta, timezone
import hashlib
import os
import re
import secrets
from typing import Literal

from fastapi import FastAPI, HTTPException, Query, Request, Response
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator
from sqlalchemy import case, create_engine, delete, func, select, text, update
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.exc import SQLAlchemyError
from starlette.middleware.trustedhost import TrustedHostMiddleware

from backend.manage import ROOT, database_url
from backend.api.settings import allowed_hosts, public_origin

from backend.api.resource_tables import (metadata, resources, jobs, workspaces, saved, events, feeds, verify_schema)
from backend.api.catalog_setup import verify_catalog


class GoalInput(BaseModel):
    model_config = ConfigDict(extra='forbid')
    mode: Literal['resources'] = 'resources'
    goal: str = Field(min_length=1, max_length=300)
    job_id: str | None = Field(default=None, max_length=100)

    @field_validator('goal')
    @classmethod
    def meaningful(cls, value):
        value = value.strip()
        if not value:
            raise ValueError('Enter a goal or resource keyword.')
        return value


class AlumniGoalInput(BaseModel):
    model_config = ConfigDict(extra='forbid')
    mode: Literal['alumni']
    goal_id: int | None = Field(default=None, ge=1, le=2147483647)
    goal: str | None = Field(default=None, min_length=1, max_length=300)

    @model_validator(mode='after')
    def one_goal(self):
        if (self.goal is None) == (self.goal_id is None):
            raise ValueError('Send either goal text or a goal_id.')
        if self.goal is not None:
            self.goal = self.goal.strip()
            if not self.goal:
                raise ValueError('Enter a goal.')
        return self


STOP_WORDS = set('i me my a an the to for in of at and or want would like find get into become help with how can do be am looking'.split())



def create_app(url=None, *, demo_histories=False):
    origin = public_origin()
    engine = create_engine(url or database_url(), pool_pre_ping=True)
    if demo_histories and (engine.url.host not in ('localhost', '127.0.0.1', '::1') or origin):
        raise ValueError('Synthetic history mode is local-only.')

    @asynccontextmanager
    async def lifespan(app):
        verify_schema(engine)
        verify_catalog(engine)
        profile_service.initialize()
        cleanup_task = asyncio.create_task(profile_service.cleanup_loop())
        with engine.begin() as conn:
            conn.execute(delete(workspaces).where(workspaces.c.expires_at < datetime.now(timezone.utc)))
        try:
            yield
        finally:
            cleanup_task.cancel()
            with suppress(asyncio.CancelledError):
                await cleanup_task
            engine.dispose()

    app = FastAPI(title='WarmPath API', lifespan=lifespan)
    app.state.public_origin = origin
    app.state.secure_cookies = bool(origin)
    app.state.engine = engine
    from backend.api.profiles import install_profiles
    profile_service = install_profiles(app, engine)
    from backend.api.pathways import install_pathways
    pathways = install_pathways(app, profile_service, demo_histories=demo_histories)
    app.add_middleware(TrustedHostMiddleware, allowed_hosts=allowed_hosts(origin))

    @app.middleware('http')
    async def same_origin(request: Request, call_next):
        request_origin = request.headers.get('origin')
        expected_origin = app.state.public_origin or str(request.base_url).rstrip('/')
        if request.method not in ('GET', 'HEAD', 'OPTIONS') and request_origin and request_origin != expected_origin:
            return JSONResponse({'error': {'code': 'forbidden', 'message': 'Use the same-origin WarmPath app.'}}, status_code=403)
        response = await call_next(request)
        if request.url.path.startswith('/api/'):
            response.headers['Cache-Control'] = 'no-store'
        response.headers['X-Content-Type-Options'] = 'nosniff'
        return response

    @app.exception_handler(HTTPException)
    async def http_error(request, exc):
        return JSONResponse({'error': {'code': str(exc.status_code), 'message': exc.detail}}, status_code=exc.status_code)

    @app.exception_handler(RequestValidationError)
    async def validation_error(request, exc):
        fields = sorted({'.'.join(str(p) for p in error['loc'][1:]) for error in exc.errors()})
        return JSONResponse({'error': {'code': 'validation', 'message': 'Check these fields: ' + ', '.join(fields)}}, status_code=422)

    @app.exception_handler(SQLAlchemyError)
    async def database_error(request, exc):
        return JSONResponse({'error': {'code': 'database_unavailable', 'message': 'Database unavailable. Please retry.'}}, status_code=503)

    def workspace(request, conn):
        token = request.cookies.get('warmpath_workspace', '')
        key = hashlib.sha256(token.encode()).hexdigest()
        record = conn.execute(select(workspaces).where(workspaces.c.id == key,
            workspaces.c.expires_at > datetime.now(timezone.utc))).mappings().first()
        if not record:
            raise HTTPException(401, 'Your workspace expired. Reload the page.')
        return record

    def visible_resource(row, saved_ids, conn, selected_job=None):
        related = []
        if row['topics']:
            query = select(jobs).where(jobs.c.topics.overlap(row['topics'])).order_by(jobs.c.id)
            if selected_job:
                query = query.where(jobs.c.id == selected_job)
            for job in conn.execute(query).mappings():
                shared = sorted(set(row['topics']) & set(job['topics']))
                related.append(dict(job) | {'matched_topics': shared, 'match_basis': 'description_topic_overlap'})
        return {k: v for k, v in dict(row).items() if k not in ('tags', 'rank')} | {
            'saved': row['id'] in saved_ids, 'related_jobs': related,
            'evidence_basis': 'course_catalog' if row['kind'] == 'Course' else 'project_description' if row['kind'] == 'VIP project' else 'public_resource'}

    @app.get('/api/health')
    def health():
        return {'status': 'ok', 'mode': 'local-real-resources', 'synthetic_histories': demo_histories}

    @app.get('/api/ready')
    def ready():
        try:
            with engine.connect() as conn:
                conn.execute(text('SELECT 1'))
            return {'status': 'ready', 'database': 'PostgreSQL'}
        except Exception:
            raise HTTPException(503, 'Database is unavailable.')

    @app.get('/api/session')
    def session(request: Request, response: Response):
        with engine.begin() as conn:
            try:
                record = workspace(request, conn)
            except HTTPException:
                token = secrets.token_urlsafe(32)
                key = hashlib.sha256(token.encode()).hexdigest()
                record = {'id': key, 'goal': '', 'expires_at': datetime.now(timezone.utc) + timedelta(days=30)}
                conn.execute(insert(workspaces).values(**record))
                response.set_cookie('warmpath_workspace', token, httponly=True, samesite='strict',
                                    secure=app.state.secure_cookies or request.url.scheme == 'https', max_age=30*86400)
            count = conn.scalar(select(func.count()).select_from(resources))
            return {'goal': record['goal'], 'resource_count': count, 'identity': 'private browser workspace',
                    'alumni_status': 'not_available', 'suggestions': ['Find an internship', 'Explore robotics research', 'Launch a startup', 'Find campus events']}

    @app.get('/api/resources')
    def catalog(request: Request, saved_only: bool = False):
        with engine.connect() as conn:
            current = workspace(request, conn)
            ids = set(conn.scalars(select(saved.c.resource_id).where(saved.c.workspace_id == current['id'])))
            stmt = select(resources).order_by(resources.c.name)
            if saved_only:
                stmt = stmt.where(resources.c.id.in_(ids))
            return {'items': [visible_resource(row, ids, conn) for row in conn.execute(stmt).mappings()]}

    @app.get('/api/jobs')
    def job_examples():
        with engine.connect() as conn:
            return {'items': [dict(row) for row in conn.execute(select(jobs).order_by(jobs.c.id)).mappings()],
                    'mode': 'curated_public_examples', 'message': 'Source-checked examples, not a live vacancy feed.'}

    @app.post('/api/path')
    def path(body: GoalInput | AlumniGoalInput, request: Request):
        if isinstance(body, AlumniGoalInput):
            with engine.connect() as conn:
                actor = profile_service.actor(request, conn)
                if body.goal_id is not None:
                    return pathways.path(conn, actor, body.goal_id)
                from backend.engine.goals import match_goal
                match = match_goal(conn, body.goal, include_fixtures=demo_histories)
                result = pathways.path(conn, actor, match['goal']['id']) if match['status'] == 'matched' else None
                return {'match': match, 'path': result}
        terms = sorted(set(re.findall(r'[a-z0-9]+', body.goal.lower())) - STOP_WORDS)[:20]
        with engine.begin() as conn:
            current = workspace(request, conn)
            selected_job = None
            if body.job_id:
                selected_job = conn.execute(select(jobs).where(jobs.c.id == body.job_id)).mappings().first()
                if not selected_job:
                    raise HTTPException(404, 'Job example not found.')
            haystack = func.lower(resources.c.name + ' ' + resources.c.tags)
            score = sum((case((haystack.like(f'%{term}%'), 1), else_=0) for term in terms), 0)
            rows = []
            if selected_job:
                score = sum((case((resources.c.topics.contains([topic]), 1), else_=0) for topic in selected_job['topics']), 0)
                rows = conn.execute(select(resources, score.label('rank')).where(score > 0)
                    .order_by(score.desc(), resources.c.name).limit(5)).mappings().all()
            elif terms:
                rows = conn.execute(select(resources, score.label('rank')).where(score > 0)
                    .order_by(score.desc(), resources.c.name).limit(5)).mappings().all()
            ids = set(conn.scalars(select(saved.c.resource_id).where(saved.c.workspace_id == current['id'])))
            conn.execute(update(workspaces).where(workspaces.c.id == current['id']).values(goal=body.goal))
            return {'goal': {'label': selected_job['title'] if selected_job else body.goal},
                    'resources': [visible_resource(row, ids, conn, body.job_id) for row in rows],
                    'job': dict(selected_job) if selected_job else None,
                    'status': 'matched' if rows else 'no_match', 'matching': 'description_topic_overlap' if selected_job else 'keyword',
                    'evidence': {'status': 'not_available', 'achievers': None, 'lift': None},
                    'message': 'Source-linked campus resources. Alumni histories are not available; these connections do not claim outcomes.'}

    @app.put('/api/saved/{resource_id}')
    def save_resource(resource_id: int, request: Request):
        with engine.begin() as conn:
            current = workspace(request, conn)
            if not conn.scalar(select(resources.c.id).where(resources.c.id == resource_id)):
                raise HTTPException(404, 'Resource not found.')
            conn.execute(insert(saved).values(workspace_id=current['id'], resource_id=resource_id).on_conflict_do_nothing())
            return {'id': resource_id, 'saved': True}

    @app.delete('/api/saved/{resource_id}')
    def unsave_resource(resource_id: int, request: Request):
        with engine.begin() as conn:
            current = workspace(request, conn)
            conn.execute(delete(saved).where(saved.c.workspace_id == current['id'], saved.c.resource_id == resource_id))
            return {'id': resource_id, 'saved': False}

    def event_places(urls):
        """Campus place for each event url, from backend/events/places.py's event_place links.

        Same fields as events_with_places(). Returns {} when the event_place migration has
        not been applied, so the events list keeps working without place data.
        """
        if not urls:
            return {}
        try:
            with engine.connect() as conn:
                rows = conn.execute(text(
                    'SELECT ep.event_url, ep.kind, ep.room, p.id, p.name, p.latitude, p.longitude '
                    'FROM event_place ep LEFT JOIN campus_place p ON p.id = ep.place_id '
                    'WHERE ep.event_url = ANY(:urls)'), {'urls': list(urls)}).all()
        except SQLAlchemyError:
            return {}
        return {url: {'location_kind': kind, 'room': room,
                      'place': None if place_id is None else
                      {'id': place_id, 'name': name, 'latitude': latitude, 'longitude': longitude}}
                for url, kind, room, place_id, name, latitude, longitude in rows}


    @app.get('/api/events')
    def public_events():
        now = datetime.now(timezone.utc)
        with engine.connect() as conn:
            snapshots = conn.execute(select(feeds)).mappings().all()
            rows = conn.execute(select(events).join(feeds, events.c.source == feeds.c.name)
                .where(events.c.fetched_at == feeds.c.fetched_at, events.c.ends_at >= now)
                .order_by(case((events.c.starts_at >= now, 0), else_=1), events.c.starts_at, events.c.url).limit(12)).mappings().all()
            fetched = min((row['fetched_at'] for row in snapshots), default=None)
            places = event_places([row['url'] for row in rows])
            unlinked = {'location_kind': 'unknown', 'room': None, 'place': None}
            return {'items': [dict(row) | places.get(row['url'], unlinked) for row in rows],
                    'source': 'GT Engage and Georgia Tech Campus Calendar',
                    'source_url': 'https://gatech.campuslabs.com/engage/events', 'fetched_at': fetched,
                    'sources': [dict(row) for row in snapshots],
                    'stale': len(snapshots) < 2 or fetched is None or now - fetched > timedelta(hours=24)}

    @app.get('/api/events/search')
    def search_events(q: str = Query(min_length=1, max_length=300), limit: int = Query(default=5, ge=1, le=20)):
        """Upcoming public events closest in meaning to q (backend/events/embeddings.py).

        Results are similarity rankings, labelled match_basis, never alumni evidence.
        Falls back to keyword matching, with fallback_reason, when embeddings are unavailable.
        """
        from backend.events.embeddings import search
        with engine.connect() as conn:
            return search(conn, q, limit=limit)


    @app.get('/')
    def root():
        return RedirectResponse('/thermal/')

    if (ROOT / 'frontend/dist/index.html').exists():
        app.mount('/app', StaticFiles(directory=ROOT / 'frontend/dist', html=True), name='react_ui')
    # Optional fixture-mode build (docs/demo-alumni.md): invented alumni bundled in the page and
    # labelled as synthetic. It reads no API data, so the shared database stays free of fixtures.
    if (ROOT / 'frontend/dist-demo/index.html').exists():
        app.mount('/demo', StaticFiles(directory=ROOT / 'frontend/dist-demo', html=True), name='demo_ui')
    app.mount('/', StaticFiles(directory=ROOT / 'prototypes', html=True), name='ui')
    return app


app = create_app(demo_histories=os.environ.get("WARMPATH_DEMO_HISTORIES") == "1")
