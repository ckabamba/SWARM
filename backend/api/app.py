"""Thermal's first local, real-source resource service.

Public resources are curated, not inferred alumni evidence. No personal records
are seeded. Anonymous workspace cookies scope saved goals/resources to a browser.
"""
from contextlib import asynccontextmanager
import asyncio
from contextlib import suppress
from datetime import datetime, timedelta, timezone
import hashlib
import json
from pathlib import Path
import re
import secrets

from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import (Column, DateTime, ForeignKey, Integer, MetaData, String,
                        Table, Text, case, create_engine, delete, func, select, text, update)
from sqlalchemy.dialects.postgresql import ARRAY, insert
from sqlalchemy.exc import SQLAlchemyError
from starlette.middleware.trustedhost import TrustedHostMiddleware

from backend.manage import ROOT, database_url

metadata = MetaData()
resources = Table('api_resources', metadata,
    Column('id', Integer, primary_key=True), Column('name', Text, nullable=False),
    Column('kind', Text, nullable=False), Column('summary', Text, nullable=False),
    Column('url', Text, nullable=False), Column('source_url', Text, nullable=False),
    Column('access', Text, nullable=False), Column('tags', Text, nullable=False),
    Column('verified_on', String(10), nullable=False),
    Column('topics', ARRAY(Text), nullable=False, server_default='{}'))
jobs = Table('api_job_examples', metadata,
    Column('id', Text, primary_key=True), Column('title', Text, nullable=False),
    Column('employer', Text, nullable=False), Column('summary', Text, nullable=False),
    Column('url', Text, nullable=False), Column('topics', ARRAY(Text), nullable=False),
    Column('context', Text, nullable=False), Column('location', Text, nullable=False),
    Column('verified_on', String(10), nullable=False))
workspaces = Table('api_workspaces', metadata,
    Column('id', String(64), primary_key=True), Column('goal', Text, nullable=False, default=''),
    Column('expires_at', DateTime(timezone=True), nullable=False))
saved = Table('api_saved_resources', metadata,
    Column('workspace_id', ForeignKey('api_workspaces.id', ondelete='CASCADE'), primary_key=True),
    Column('resource_id', ForeignKey('api_resources.id'), primary_key=True))
events = Table('api_public_events', metadata,
    Column('url', Text, primary_key=True), Column('title', Text, nullable=False),
    Column('starts_at', DateTime(timezone=True), nullable=False),
    Column('ends_at', DateTime(timezone=True), nullable=False),
    Column('fetched_at', DateTime(timezone=True), nullable=False),
    Column('source', Text, nullable=False, server_default='gt-calendar'),
    Column('location', Text, nullable=True), Column('organizer', Text, nullable=True))
feeds = Table('api_feeds', metadata, Column('name', Text, primary_key=True),
    Column('fetched_at', DateTime(timezone=True), nullable=False))

class GoalInput(BaseModel):
    goal: str = Field(min_length=1, max_length=300)
    job_id: str | None = Field(default=None, max_length=100)

    @field_validator('goal')
    @classmethod
    def meaningful(cls, value):
        value = value.strip()
        if not value:
            raise ValueError('Enter a goal or resource keyword.')
        return value


STOP_WORDS = set('i me my a an the to for in of at and or want would like find get into become help with how can do be am looking'.split())


def initialize_schema(engine):
    # Initial local schema only; serialize bootstrap and additive upgrade.
    # Production migration ownership remains with role 1.
    with engine.begin() as conn:
        conn.execute(text('SELECT pg_advisory_xact_lock(78142026)'))
        metadata.create_all(conn)
        conn.execute(text("ALTER TABLE api_public_events ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'gt-calendar'"))
        conn.execute(text('ALTER TABLE api_public_events ADD COLUMN IF NOT EXISTS location TEXT'))
        conn.execute(text('ALTER TABLE api_public_events ADD COLUMN IF NOT EXISTS organizer TEXT'))
        conn.execute(text("ALTER TABLE api_resources ADD COLUMN IF NOT EXISTS topics TEXT[] NOT NULL DEFAULT '{}'"))


def create_app(url=None):
    engine = create_engine(url or database_url(), pool_pre_ping=True)

    @asynccontextmanager
    async def lifespan(app):
        initialize_schema(engine)
        profile_service.initialize()
        cleanup_task = asyncio.create_task(profile_service.cleanup_loop())
        catalog = json.loads(Path(__file__).with_name('catalog.json').read_text())
        for row in json.loads(Path(__file__).with_name('curriculum.json').read_text(encoding='utf-8')):
            if row['kind'] == 'Course':
                row.update(url='https://catalog.gatech.edu/coursesaz/cs/',
                    source_url='https://catalog.gatech.edu/coursesaz/cs/',
                    access='Catalog coverage only. Check prerequisites, restrictions, and term availability in the official catalog and registration system.')
            row['verified_on'] = '2026-11-14'
            catalog.append(row)
        with engine.begin() as conn:
            for row in catalog:
                stmt = insert(resources).values(**row)
                conn.execute(stmt.on_conflict_do_update(index_elements=['id'], set_=row))
            for row in json.loads(Path(__file__).with_name('job_examples.json').read_text(encoding='utf-8')):
                stmt = insert(jobs).values(**row)
                conn.execute(stmt.on_conflict_do_update(index_elements=['id'], set_=row))
            conn.execute(delete(workspaces).where(workspaces.c.expires_at < datetime.now(timezone.utc)))
        try:
            yield
        finally:
            cleanup_task.cancel()
            with suppress(asyncio.CancelledError):
                await cleanup_task
            engine.dispose()

    app = FastAPI(title='WarmPath local resource API', lifespan=lifespan)
    app.state.engine = engine
    from backend.api.profiles import install_profiles
    profile_service = install_profiles(app, engine)
    app.add_middleware(TrustedHostMiddleware, allowed_hosts=['127.0.0.1', 'localhost', 'testserver'])

    @app.middleware('http')
    async def same_origin(request: Request, call_next):
        origin = request.headers.get('origin')
        if request.method not in ('GET', 'HEAD', 'OPTIONS') and origin and origin != str(request.base_url).rstrip('/'):
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
            raise HTTPException(401, 'Your local workspace expired. Reload the page.')
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
        return {'status': 'ok', 'mode': 'local-real-resources'}

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
                response.set_cookie('warmpath_workspace', token, httponly=True, samesite='strict', max_age=30*86400)
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
    def path(body: GoalInput, request: Request):
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

    @app.get('/api/people')
    def people():
        return {'items': [], 'status': 'not_available', 'message': 'No authorized alumni-history dataset is connected.'}

    @app.get('/api/events')
    def public_events():
        now = datetime.now(timezone.utc)
        with engine.connect() as conn:
            snapshots = conn.execute(select(feeds)).mappings().all()
            rows = conn.execute(select(events).join(feeds, events.c.source == feeds.c.name)
                .where(events.c.fetched_at == feeds.c.fetched_at, events.c.ends_at >= now)
                .order_by(case((events.c.starts_at >= now, 0), else_=1), events.c.starts_at, events.c.url).limit(12)).mappings().all()
            fetched = min((row['fetched_at'] for row in snapshots), default=None)
            return {'items': [dict(row) for row in rows], 'source': 'GT Engage and Georgia Tech Campus Calendar',
                    'source_url': 'https://gatech.campuslabs.com/engage/events', 'fetched_at': fetched,
                    'sources': [dict(row) for row in snapshots],
                    'stale': len(snapshots) < 2 or fetched is None or now - fetched > timedelta(hours=24)}

    @app.get('/api/asks/{ask_id}')
    def missing_ask(ask_id: int):
        raise HTTPException(404, 'This ask does not exist. Prototype asks are not real outreach.')

    @app.get('/')
    def root():
        return RedirectResponse('/thermal/')

    app.mount('/', StaticFiles(directory=ROOT / 'prototypes', html=True), name='ui')
    return app


app = create_app()
