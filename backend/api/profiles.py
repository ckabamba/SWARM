"""Account-owned profiles and reviewed resume imports. No public resume endpoint."""
import asyncio
from datetime import datetime, timedelta, timezone
import hashlib
import hmac
import json
from pathlib import Path
import secrets
import subprocess
import sys
import threading
from uuid import uuid4

from fastapi import HTTPException, Request, Response
from pydantic import ValidationError
from sqlalchemy import MetaData, Table, delete, func, insert, select, update
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.exc import IntegrityError, NoSuchTableError
from starlette.concurrency import run_in_threadpool

from backend.manage import ROOT
from backend.api.profile_models import (Contact, Course, Credentials, Experience,
    ImportDraft, PastedResume, Profile, ProfileUpdate, Register)
from backend.api.resume_parser import MAX_BYTES, parse_text

COOKIE = 'warmpath_account'
PASSWORD_SLOTS = threading.BoundedSemaphore(2)


def now():
    return datetime.now(timezone.utc)


def digest(value):
    return hashlib.sha256(value.encode()).hexdigest()


def password_hash(password, salt=None):
    salt = salt or secrets.token_hex(16)
    with PASSWORD_SLOTS:
        value = hashlib.scrypt(password.encode(), salt=bytes.fromhex(salt), n=2**17,
                              r=8, p=1, maxmem=256 * 1024 * 1024, dklen=32)
    return salt + ':' + value.hex()


def bounded_extract(data, kind, mode='resume'):
    try:
        result = subprocess.run([sys.executable, '-m', 'backend.api.resume_parser', kind, mode],
            input=data, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL,
            cwd=ROOT, timeout=15, creationflags=getattr(subprocess, 'CREATE_NO_WINDOW', 0))
        parsed = json.loads(result.stdout)
    except subprocess.TimeoutExpired:
        raise HTTPException(422, 'Document processing timed out. Paste text or use a simpler file.')
    except (ValueError, OSError):
        raise HTTPException(422, 'Could not process the file. Paste text or try another document.')
    if result.returncode or 'error' in parsed:
        raise HTTPException(422, parsed.get('error', 'Document could not be read.'))
    return parsed


class ProfileService:
    def __init__(self, engine):
        self.engine = engine
        self.tables = {}
        self.parser_slots = asyncio.Semaphore(2)

    def initialize(self):
        metadata = MetaData()
        for name in ('person', 'account', 'account_session', 'person_profile', 'resume_draft',
                     'account_rate_limit', 'alumni_city', 'api_resources', 'api_job_examples', 'person_course', 'transcript_draft'):
            try:
                self.tables[name] = Table(name, metadata, autoload_with=self.engine)
            except NoSuchTableError:
                raise RuntimeError('Shared profile schema is missing. Run python -m backend.manage migrate before starting the API.') from None
        self.cleanup()

    def cleanup(self):
        with self.engine.begin() as conn:
            for name in ('resume_draft', 'transcript_draft', 'account_session', 'account_rate_limit'):
                table = self.tables[name]
                conn.execute(delete(table).where(table.c.expires_at <= now()))

    async def cleanup_loop(self):
        while True:
            await asyncio.sleep(300)
            try:
                await run_in_threadpool(self.cleanup)
            except Exception:
                # Retry on the next interval; never log resume/account contents.
                continue

    def actor(self, request, conn):
        sessions, accounts = self.tables['account_session'], self.tables['account']
        record = conn.execute(select(accounts).join(sessions, sessions.c.account_id == accounts.c.id).where(
            sessions.c.token_hash == digest(request.cookies.get(COOKIE, '')),
            sessions.c.expires_at > now())).mappings().first()
        if not record:
            raise HTTPException(401, 'Sign in to access your private profile.')
        return record

    def throttle(self, key, maximum, minutes=15):
        table = self.tables['account_rate_limit']
        # A separate transaction preserves rate limits even on rejected attempts.
        with self.engine.begin() as conn:
            conn.execute(delete(table).where(table.c.key == key, table.c.expires_at <= now()))
            stmt = pg_insert(table).values(key=key, attempts=1, expires_at=now() + timedelta(minutes=minutes))
            count = conn.scalar(stmt.on_conflict_do_update(index_elements=['key'],
                set_={'attempts': table.c.attempts + 1}).returning(table.c.attempts))
        if count > maximum:
            raise HTTPException(429, 'Too many attempts. Please wait before retrying.')

    def issue_session(self, request, response, conn, account_id):
        table = self.tables['account_session']
        conn.execute(delete(table).where(table.c.token_hash == digest(request.cookies.get(COOKIE, ''))))
        token = secrets.token_urlsafe(32)
        conn.execute(insert(table).values(token_hash=digest(token), account_id=account_id,
            expires_at=now() + timedelta(days=7)))
        response.set_cookie(COOKIE, token, max_age=7*86400, httponly=True,
                            secure=request.url.scheme == 'https', samesite='strict', path='/')

    def profile(self, conn, actor):
        table = self.tables['person_profile']
        record = conn.execute(select(table).where(table.c.person_id == actor['person_id'])).mappings().one()
        return {'person_id': actor['person_id'], 'version': record['version'], 'courses_version': record['courses_version'],
                'profile': record['data'], 'email': actor['email'], 'identity_verified': False}

    def save(self, conn, actor, profile, version):
        table, people = self.tables['person_profile'], self.tables['person']
        if profile.city_id is not None:
            cities = self.tables['alumni_city']
            if not conn.scalar(select(cities.c.id).where(cities.c.id == profile.city_id)):
                raise HTTPException(422, 'Choose a known city; cities are managed by the map data owner.')
        resources = self.tables['api_resources']
        for entry in profile.experiences:
            if entry.resource_id is not None:
                kind = conn.scalar(select(resources.c.kind).where(resources.c.id == entry.resource_id))
                if kind not in ('VIP project', 'Research', 'Program', 'Club'):
                    raise HTTPException(422, 'Choose a matching course or experience resource.')
        result = conn.execute(update(table).where(table.c.person_id == actor['person_id'], table.c.version == version)
            .values(data=profile.model_dump(), version=version+1, updated_at=now()))
        if not result.rowcount:
            raise HTTPException(409, 'Your profile changed in another tab. Reload before saving; your unsaved edits are still on screen.')
        conn.execute(update(people).where(people.c.id == actor['person_id']).values(
            name=profile.name, kind=profile.kind, major=profile.major or None, grad_year=profile.grad_year,
            city_id=profile.city_id, share_city=profile.share_city, profile_visible=profile.profile_visible))
        return self.profile(conn, actor)

    def store_draft(self, actor, parsed, table_name='resume_draft'):
        self.cleanup()
        draft_id = str(uuid4())
        expires = now() + timedelta(hours=24)
        with self.engine.begin() as conn:
            # Authenticate existence again after potentially slow extraction.
            accounts = self.tables['account']
            if not conn.scalar(select(accounts.c.id).where(accounts.c.id == actor['id']).with_for_update()):
                raise HTTPException(401, 'Account no longer exists.')
            table = self.tables[table_name]
            if conn.scalar(select(func.count()).select_from(table).where(table.c.account_id == actor['id'])) >= 5:
                raise HTTPException(409, 'Review or discard an existing draft before uploading another (maximum five).')
            conn.execute(insert(table).values(id=draft_id, account_id=actor['id'], data=parsed, expires_at=expires))
        return {'id': draft_id, 'expires_at': expires, **parsed}

    def draft(self, conn, actor, draft_id, table_name='resume_draft'):
        table = self.tables[table_name]
        record = conn.execute(select(table).where(table.c.id == draft_id,
            table.c.account_id == actor['id'], table.c.expires_at > now()).with_for_update()).mappings().first()
        if not record:
            raise HTTPException(404, 'Draft not found or expired. Upload again or use manual entry.')
        return record


def install_profiles(app, engine):
    service = ProfileService(engine)
    from backend.api.courses import install_courses
    courses = install_courses(app, service, bounded_extract, now)

    @app.post('/api/auth/register', status_code=201)
    def register(body: Register, request: Request, response: Response):
        service.throttle('register:' + digest(request.client.host), 10, 60)
        hashed = password_hash(body.password)
        accounts, people, profiles = (service.tables[n] for n in ('account', 'person', 'person_profile'))
        account_id = str(uuid4())
        try:
            with engine.begin() as conn:
                person_id = conn.scalar(insert(people).values(name=body.name, kind='student',
                    profile_visible=False, share_city=False, is_fixture=False).returning(people.c.id))
                conn.execute(insert(accounts).values(id=account_id, person_id=person_id, email=body.email, password_hash=hashed))
                conn.execute(insert(profiles).values(person_id=person_id, data=Profile(name=body.name).model_dump()))
                service.issue_session(request, response, conn, account_id)
                actor = {'id': account_id, 'person_id': person_id, 'email': body.email}
                return service.profile(conn, actor)
        except IntegrityError:
            raise HTTPException(409, 'Could not create this account. Try signing in instead.')

    @app.post('/api/auth/login')
    def login(body: Credentials, request: Request, response: Response):
        service.throttle('login-ip:' + digest(request.client.host), 30)
        service.throttle('login-email:' + digest(body.email), 10)
        accounts = service.tables['account']
        with engine.begin() as conn:
            actor = conn.execute(select(accounts).where(accounts.c.email == body.email)).mappings().first()
            expected = actor['password_hash'] if actor else '00'*16 + ':' + '00'*32
            if not hmac.compare_digest(password_hash(body.password, expected.split(':')[0]), expected) or not actor:
                raise HTTPException(401, 'Email or password is incorrect.')
            service.issue_session(request, response, conn, actor['id'])
            return service.profile(conn, actor)

    @app.post('/api/auth/logout')
    def logout(request: Request, response: Response):
        table = service.tables['account_session']
        with engine.begin() as conn:
            conn.execute(delete(table).where(table.c.token_hash == digest(request.cookies.get(COOKIE, ''))))
        response.delete_cookie(COOKIE, path='/')
        return {'status': 'signed_out'}

    @app.get('/api/me')
    def get_profile(request: Request):
        with engine.connect() as conn:
            return service.profile(conn, service.actor(request, conn))

    @app.put('/api/me')
    def save_profile(body: ProfileUpdate, request: Request):
        with engine.begin() as conn:
            actor = service.actor(request, conn)
            old = service.profile(conn, actor)['profile']
            existing = {entry['id']: entry for key in ('contacts', 'experiences') for entry in old[key]}
            # Ordinary profile edits cannot manufacture resume provenance.
            for entry in [*body.profile.contacts, *body.profile.experiences]:
                prior = existing.get(entry.id, {})
                entry.source, entry.source_id = prior.get('source', 'manual'), prior.get('source_id')
            return service.save(conn, actor, body.profile, body.version)

    @app.delete('/api/me')
    def delete_account(request: Request, response: Response):
        with engine.begin() as conn:
            actor = service.actor(request, conn)
            people = service.tables['person']
            conn.execute(delete(people).where(people.c.id == actor['person_id']))
        response.delete_cookie(COOKIE, path='/')
        return {'status': 'deleted'}

    @app.get('/api/profile-options')
    def options(request: Request):
        with engine.connect() as conn:
            service.actor(request, conn)
            resources, cities = service.tables['api_resources'], service.tables['alumni_city']
            return {'resources': [dict(r) for r in conn.execute(select(resources.c.id, resources.c.name,
                resources.c.kind).where(resources.c.kind.in_(['Course', 'VIP project']))).mappings()],
                'cities': [dict(r) for r in conn.execute(select(cities).order_by(cities.c.name)).mappings()]}

    @app.get('/api/profiles/{person_id}')
    def public_profile(person_id: int):
        with engine.connect() as conn:
            people, profiles = service.tables['person'], service.tables['person_profile']
            data = conn.scalar(select(profiles.c.data).join(people, people.c.id == profiles.c.person_id).where(
                people.c.id == person_id, people.c.profile_visible.is_(True), people.c.is_fixture.is_(False)))
            if not data:
                raise HTTPException(404, 'Profile not found.')
            result = {key: data[key] for key in ('name', 'kind', 'major', 'grad_year', 'introduction')}
            data['courses'] = courses.rows(conn, person_id)
            for key in ('contacts', 'experiences', 'courses'):
                result[key] = [{k: v for k, v in row.items() if k not in ('source_id', 'visible')}
                               for row in data[key] if row['visible']]
            if data['share_city']:
                result['city_id'] = data['city_id']
            return {'person_id': person_id, 'profile': result, 'evidence': 'self_reported', 'identity_verified': False}

    @app.get('/api/me/matches')
    def matches(request: Request):
        with engine.connect() as conn:
            data = service.profile(conn, service.actor(request, conn))['profile']
            data['courses'] = courses.rows(conn, service.actor(request, conn)['person_id'])
            ids = {entry['resource_id'] for key in ('courses', 'experiences') for entry in data[key] if entry.get('resource_id')}
            resources, jobs = service.tables['api_resources'], service.tables['api_job_examples']
            rows = list(conn.execute(select(resources).where(resources.c.id.in_(ids))).mappings())
            topics = set(topic for row in rows for topic in row['topics'])
            items = []
            for job in conn.execute(select(jobs).where(jobs.c.topics.overlap(sorted(topics)))).mappings():
                shared = sorted(topics.intersection(job['topics']))
                items.append({'id': job['id'], 'title': job['title'], 'url': job['url'], 'matched_topics': shared,
                    'resource_ids': [r['id'] for r in rows if set(r['topics']).intersection(shared)]})
            return {'items': sorted(items, key=lambda j: (-len(j['matched_topics']), j['id'])),
                'basis': 'catalog_description_overlap', 'message': 'Topics in linked course/project descriptions; not verified skills or job eligibility.',
                'lift': None, 'alumni_count': None}

    @app.post('/api/resumes', status_code=201)
    async def upload(request: Request, filename: str):
        with engine.connect() as conn:
            actor = dict(service.actor(request, conn))
        service.throttle('upload:' + actor['id'], 10)
        kind = Path(filename).suffix.lower().lstrip('.')
        if kind not in ('pdf', 'docx') or len(filename) > 255:
            raise HTTPException(422, 'Choose a PDF or DOCX file.')
        if request.headers.get('content-length', '').isdigit() and int(request.headers['content-length']) > MAX_BYTES:
            raise HTTPException(413, 'Upload a resume up to 5 MB.')
        data = bytearray()
        try:
            async with asyncio.timeout(20):
                async for chunk in request.stream():
                    data.extend(chunk)
                    if len(data) > MAX_BYTES:
                        raise HTTPException(413, 'Upload a resume up to 5 MB.')
        except TimeoutError:
            raise HTTPException(408, 'Upload timed out. Please retry.')
        # Limit simultaneous parser processes. No filenames or bytes are persisted.
        async with service.parser_slots:
            parsed = await run_in_threadpool(bounded_extract, bytes(data), kind)
        data.clear()
        return await run_in_threadpool(service.store_draft, actor, parsed)

    @app.post('/api/resumes/text', status_code=201)
    def paste(body: PastedResume, request: Request):
        with engine.connect() as conn:
            actor = dict(service.actor(request, conn))
        service.throttle('upload:' + actor['id'], 10)
        return service.store_draft(actor, parse_text(body.text))

    @app.get('/api/resumes')
    def list_drafts(request: Request):
        service.cleanup()
        with engine.connect() as conn:
            actor = service.actor(request, conn)
            table = service.tables['resume_draft']
            return {'items': [dict(row) for row in conn.execute(select(table.c.id, table.c.expires_at).where(
                table.c.account_id == actor['id'], table.c.expires_at > now())).mappings()]}

    @app.get('/api/resumes/{draft_id}')
    def get_draft(draft_id: str, request: Request):
        with engine.begin() as conn:
            row = service.draft(conn, service.actor(request, conn), draft_id)
            return {'id': row['id'], 'expires_at': row['expires_at'], **row['data']}

    @app.delete('/api/resumes/{draft_id}')
    def discard(draft_id: str, request: Request):
        with engine.begin() as conn:
            actor = service.actor(request, conn)
            table = service.tables['resume_draft']
            conn.execute(delete(table).where(table.c.id == draft_id, table.c.account_id == actor['id']))
        return {'status': 'discarded'}

    @app.post('/api/resumes/{draft_id}/import')
    def import_draft(draft_id: str, body: ImportDraft, request: Request):
        with engine.begin() as conn:
            actor = service.actor(request, conn)
            draft = service.draft(conn, actor, draft_id)
            existing = service.profile(conn, actor)
            data = existing['profile']
            candidates = {c['id']: c for c in draft['data']['candidates']}
            if len({s.id for s in body.selections}) != len(body.selections):
                raise HTTPException(422, 'Select each suggestion only once.')
            skipped = 0
            imported_courses = []
            try:
                for selection in body.selections:
                    candidate = candidates.get(selection.id)
                    if not candidate:
                        raise HTTPException(422, 'Unknown draft suggestion.')
                    section = candidate['section']
                    if section == 'courses':
                        imported_courses.append((Course.model_validate(selection.value), False))
                        continue
                    if section in ('name', 'major', 'grad_year'):
                        data[section] = selection.value
                        continue
                    model = {'contacts': Contact, 'experiences': Experience}[section]
                    if not isinstance(selection.value, dict):
                        raise HTTPException(422, 'Review the selected entry fields.')
                    entry = model.model_validate(selection.value).model_dump()
                    entry.update(id=str(uuid4()), source='resume', source_id=draft_id, visible=False)
                    keys = {'contacts': ('kind', 'value'),
                            'experiences': ('title', 'organization', 'start')}[section]
                    def identity(row):
                        return tuple(str(row.get(k, '')).strip().lower() for k in keys)
                    if any(identity(old) == identity(entry) for old in data[section]):
                        skipped += 1
                    else:
                        data[section].append(entry)
                profile = Profile.model_validate(data)
            except ValidationError:
                raise HTTPException(422, 'Check selected fields, links, dates, and profile entry limits.')
            if imported_courses:
                skipped += courses.merge(conn, actor, imported_courses, body.courses_version, 'resume', draft_id)
            result = service.save(conn, actor, profile, body.version)
            conn.execute(delete(service.tables['resume_draft']).where(service.tables['resume_draft'].c.id == draft_id))
            return {**result, 'duplicates_skipped': skipped}

    return service
