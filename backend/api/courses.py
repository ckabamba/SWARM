"""Independent course revision/CRUD and private transcript review."""
import asyncio
import re
from uuid import uuid4

from fastapi import HTTPException, Request
from sqlalchemy import delete, insert, select, update
from starlette.concurrency import run_in_threadpool

from backend.api.profile_models import Course, CourseWrite, PastedResume, TranscriptImport
from backend.api.resume_parser import MAX_BYTES
from backend.api.transcript_parser import parse_transcript


def normalized(value):
    value = re.sub(r'[^a-z0-9]', '', value.lower())
    return 'georgiatech' if value == 'georgiainstituteoftechnology' else value


def course_key(course):
    term = course.get('term', '')
    season = re.search(r'(fall|spring|summer|winter)', term, re.I)
    year = re.search(r'\b(?:19|20)\d{2}\b', term)
    if season and year:
        # Retain session suffixes, so Summer I and Summer II remain distinct.
        remainder = re.sub(r'\b(?:19|20)\d{2}\b|fall|spring|summer|winter|semester|term', '', term, flags=re.I)
        term = season[0] + year[0] + remainder
    return (normalized(course.get('institution', '')), normalized(course.get('code') or course.get('title', '')),
            normalized(term), course.get('record_type', 'coursework'))


def possible_match(first, second):
    a, b = course_key(first), course_key(second)
    return a[1] == b[1] and a[3] == b[3] and (not a[0] or not b[0] or a[0] == b[0]) and (not a[2] or not b[2] or a[2] == b[2])


class CourseService:
    def __init__(self, profiles):
        self.profiles = profiles

    def rows(self, conn, person_id):
        table = self.profiles.tables['person_course']
        return [Course.model_validate(row).model_dump() for row in conn.scalars(
            select(table.c.data).where(table.c.person_id == person_id).order_by(table.c.id))]

    def collection(self, conn, actor):
        profile = self.profiles.tables['person_profile']
        version = conn.scalar(select(profile.c.courses_version).where(profile.c.person_id == actor['person_id']))
        rows = self.rows(conn, actor['person_id'])
        return {'version': version, 'items': rows, 'total': len(rows)}

    def revision(self, conn, actor, version):
        table = self.profiles.tables['person_profile']
        if version is None or not conn.execute(update(table).where(table.c.person_id == actor['person_id'],
                table.c.courses_version == version).values(courses_version=version+1)).rowcount:
            raise HTTPException(409, 'Your courses changed. Reload My Courses before saving or importing; your draft is preserved.')

    def validate_link(self, conn, course):
        if course.resource_id is not None:
            table = self.profiles.tables['api_resources']
            if conn.scalar(select(table.c.kind).where(table.c.id == course.resource_id)) != 'Course':
                raise HTTPException(422, 'Choose an existing course resource.')

    def merge(self, conn, actor, entries, version, source, source_id):
        self.revision(conn, actor, version)
        rows = self.rows(conn, actor['person_id'])
        skipped = 0
        table = self.profiles.tables['person_course']
        for course, confirm_separate in entries:
            self.validate_link(conn, course)
            entry = course.model_dump()
            key = course_key(entry)
            if key[0] and key[2] and any(course_key(old) == key for old in rows):
                skipped += 1
                continue
            # Repeated resume import can be identified even without a transcript term.
            if source == 'resume' and any(course_key(old) == key and old['source'] == 'resume' for old in rows):
                skipped += 1
                continue
            if not confirm_separate and any(possible_match(old, entry) for old in rows):
                raise HTTPException(409, f"Possible duplicate for {course.code or 'a course'}: confirm the institution/term or explicitly keep a separate entry.")
            if len(rows) >= 1000:
                raise HTTPException(422, 'The 1,000-course limit would be exceeded. No partial import was saved.')
            entry.update(id=str(uuid4()), source=source, source_id=source_id, visible=False)
            conn.execute(insert(table).values(person_id=actor['person_id'], id=entry['id'], data=entry))
            rows.append(entry)
        self.profiles.history.sync(conn, actor['person_id'])
        return skipped


def install_courses(app, service, bounded_extract, now):
    courses = CourseService(service)
    engine = service.engine

    @app.get('/api/me/courses')
    def list_courses(request: Request):
        with engine.connect() as conn:
            return courses.collection(conn, service.actor(request, conn))

    @app.post('/api/me/courses', status_code=201)
    def add_course(body: CourseWrite, request: Request):
        with engine.begin() as conn:
            actor = service.actor(request, conn)
            courses.revision(conn, actor, body.version)
            courses.validate_link(conn, body.course)
            rows = courses.rows(conn, actor['person_id'])
            if len(rows) >= 1000:
                raise HTTPException(422, 'Maximum 1,000 courses. No record was added.')
            key = course_key(body.course.model_dump())
            if key[0] and key[2] and any(course_key(old) == key for old in rows):
                raise HTTPException(409, 'This course and term already exist. Edit the existing course instead.')
            entry = body.course.model_dump()
            entry.update(id=str(uuid4()), source='manual', source_id=None)
            conn.execute(insert(service.tables['person_course']).values(person_id=actor['person_id'], id=entry['id'], data=entry))
            service.history.sync(conn, actor['person_id'])
            return courses.collection(conn, actor)

    @app.put('/api/me/courses/{course_id}')
    def edit_course(course_id: str, body: CourseWrite, request: Request):
        with engine.begin() as conn:
            actor = service.actor(request, conn)
            courses.revision(conn, actor, body.version)
            table = service.tables['person_course']
            old = conn.scalar(select(table.c.data).where(table.c.person_id == actor['person_id'], table.c.id == course_id))
            if not old:
                raise HTTPException(404, 'Course not found.')
            courses.validate_link(conn, body.course)
            entry = body.course.model_dump()
            key = course_key(entry)
            if key[0] and key[2] and any(row['id'] != course_id and course_key(row) == key for row in courses.rows(conn, actor['person_id'])):
                raise HTTPException(409, 'Another entry already has this course, institution and term.')
            entry.update(id=course_id, source=old.get('source','manual'), source_id=old.get('source_id'))
            conn.execute(update(table).where(table.c.person_id == actor['person_id'], table.c.id == course_id).values(data=entry))
            service.history.sync(conn, actor['person_id'])
            return courses.collection(conn, actor)

    @app.delete('/api/me/courses/{course_id}')
    def remove_course(course_id: str, request: Request, version: int):
        with engine.begin() as conn:
            actor = service.actor(request, conn)
            courses.revision(conn, actor, version)
            table = service.tables['person_course']
            if not conn.execute(delete(table).where(table.c.person_id == actor['person_id'], table.c.id == course_id)).rowcount:
                raise HTTPException(404, 'Course not found.')
            service.history.sync(conn, actor['person_id'])
            return courses.collection(conn, actor)

    def store(actor, parsed):
        return service.store_draft(actor, parsed, table_name='transcript_draft')

    @app.post('/api/transcripts', status_code=201)
    async def upload_transcript(request: Request):
        with engine.connect() as conn:
            actor = dict(service.actor(request, conn))
        service.throttle('transcript:' + actor['id'], 10)
        data = bytearray()
        try:
            async with asyncio.timeout(20):
                async for chunk in request.stream():
                    data.extend(chunk)
                    if len(data) > MAX_BYTES:
                        raise HTTPException(413, 'Upload a PDF up to 5 MB.')
        except TimeoutError:
            raise HTTPException(408, 'Upload timed out; try again.')
        async with service.parser_slots:
            parsed = await run_in_threadpool(bounded_extract, bytes(data), 'pdf', 'transcript')
        data.clear()
        return await run_in_threadpool(store, actor, parsed)

    @app.post('/api/transcripts/text', status_code=201)
    def paste_transcript(body: PastedResume, request: Request):
        with engine.connect() as conn:
            actor = dict(service.actor(request, conn))
        service.throttle('transcript:' + actor['id'], 10)
        try:
            parsed = parse_transcript(body.text)
        except ValueError as error:
            raise HTTPException(422, str(error))
        return store(actor, parsed)

    @app.get('/api/transcripts')
    def drafts(request: Request):
        service.cleanup()
        with engine.connect() as conn:
            actor = service.actor(request, conn)
            table = service.tables['transcript_draft']
            return {'items': [dict(r) for r in conn.execute(select(table.c.id, table.c.expires_at).where(
                table.c.account_id == actor['id'], table.c.expires_at > now())).mappings()]}

    @app.get('/api/transcripts/{draft_id}')
    def draft(draft_id: str, request: Request):
        with engine.begin() as conn:
            actor = service.actor(request, conn)
            row = service.draft(conn, actor, draft_id, table_name='transcript_draft')
            parsed = row['data']
            existing = courses.rows(conn, actor['person_id'])
            for candidate in parsed['candidates']:
                candidate['possible_duplicates'] = [r['id'] for r in existing if possible_match(r, candidate['course'])]
            return {'id': row['id'], 'expires_at': row['expires_at'], **parsed}

    @app.delete('/api/transcripts/{draft_id}')
    def discard(draft_id: str, request: Request):
        with engine.begin() as conn:
            actor = service.actor(request, conn)
            table = service.tables['transcript_draft']
            conn.execute(delete(table).where(table.c.id == draft_id, table.c.account_id == actor['id']))
        return {'status': 'discarded'}

    @app.post('/api/transcripts/{draft_id}/import')
    def import_transcript(draft_id: str, body: TranscriptImport, request: Request):
        with engine.begin() as conn:
            actor = service.actor(request, conn)
            row = service.draft(conn, actor, draft_id, table_name='transcript_draft')
            valid = {c['id'] for c in row['data']['candidates']}
            ids = [s.id for s in body.selections]
            if len(ids) != len(set(ids)) or not set(ids) <= valid:
                raise HTTPException(422, 'Select each valid transcript suggestion at most once.')
            skipped = courses.merge(conn, actor, [(s.course, s.confirm_separate) for s in body.selections],
                body.version, 'transcript', draft_id)
            conn.execute(delete(service.tables['transcript_draft']).where(service.tables['transcript_draft'].c.id == draft_id))
            return {**courses.collection(conn, actor), 'duplicates_skipped': skipped}

    return courses
