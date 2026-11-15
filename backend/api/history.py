"""Atomic projections of reviewed personal history, with independent public timing."""
import re
from collections import defaultdict

from fastapi import HTTPException, Query, Request
from pydantic import Field
from sqlalchemy import delete, insert, select, text, update
from sqlalchemy.dialects.postgresql import insert as pg_insert

from backend.api.profile_models import Model, Course, Experience, Profile


def normalized(value):
    return ' '.join(str(value or '').strip().casefold().split())


def course_code(value):
    match = re.match(r'^\s*([A-Za-z]{2,5})\s*(\d{4}[A-Za-z]?)\b', value or '')
    return ''.join(match.groups()).upper() if match else None


def participation_year(entry, profile, kind):
    if entry.get('school_year'):
        return entry['school_year']
    enrollment = profile.get('enrollment_year')
    if not enrollment:
        return None
    if kind == 'course':
        match = re.fullmatch(r'\s*(Fall|Spring|Summer)\s+(\d{4})\s*', entry.get('term', ''), re.I)
        if not match:
            return None
        start = int(match[2]) - (match[1].lower() != 'fall')
    else:
        match = re.fullmatch(r'(\d{4})-(\d{2})', entry.get('start', ''))
        if not match:
            return None
        start = int(match[1]) - (int(match[2]) < 8)
    year = start - enrollment + 1
    return year if 1 <= year <= 80 else None


class HistoryReview(Model):
    version: int = Field(ge=1)
    activity_id: int | None = Field(default=None, ge=1)
    school_year: int | None = Field(default=None, ge=1, le=80)
    history_confirmed: bool
    visible: bool


class HistoryService:
    def __init__(self, profiles):
        self.profiles = profiles

    def entries(self, conn, person_id):
        tables = self.profiles.tables
        record = conn.execute(select(tables['person_profile']).where(
            tables['person_profile'].c.person_id == person_id)).mappings().one()
        profile = record['data']
        entries = [('experience', e) for e in profile.get('experiences', [])]
        entries += [('course', e) for e in conn.scalars(select(tables['person_course'].c.data).where(
            tables['person_course'].c.person_id == person_id))]
        return record, entries

    def activity(self, conn, person_id, kind, entry, create=False):
        activities = self.profiles.tables['activity']
        expected = 'course' if kind == 'course' else {'research': 'lab'}.get(entry['kind'], entry['kind'])
        if expected not in ('course', 'lab', 'job', 'internship', 'club', 'vip'):
            return None, 'This experience type is not supported by the path engine yet.'
        explicit = entry.get('activity_id')
        if explicit:
            row = conn.execute(select(activities).where(activities.c.id == explicit,
                activities.c.type == expected, activities.c.is_fixture.is_(False))).mappings().first()
            # Users may select sourced, their own, or publicly shared activities.
            if row and self.selectable(conn, person_id, explicit):
                if entry.get('resource_id') and row['resource_id'] != entry['resource_id']:
                    return None, 'The chosen activity and campus resource do not match.'
                return row['id'], None
            return None, 'Choose an available activity with the matching type.'
        resource_id = entry.get('resource_id')
        resource = None
        if resource_id:
            resources = self.profiles.tables['api_resources']
            resource = conn.execute(select(resources).where(resources.c.id == resource_id)).mappings().first()
            if not resource:
                return None, 'Choose an available campus resource.'
        elif kind == 'course' and normalized(entry.get('institution')) in ('georgia tech', 'georgia institute of technology'):
            # A transcript and a manually linked course must resolve to one activity.
            resources = self.profiles.tables['api_resources']
            code = course_code(entry.get('code'))
            if code:
                matches = [r for r in conn.execute(select(resources).where(resources.c.kind == 'Course')).mappings()
                           if course_code(r['name']) == code]
                if len(matches) == 1:
                    resource = matches[0]
                    resource_id = resource['id']
        if resource:
            resource_type = {'Course': 'course', 'VIP project': 'vip', 'Research': 'lab', 'Club': 'club'}.get(resource['kind'])
            if resource_type != expected:
                return None, 'The campus resource does not match this participation type.'
            if kind == 'course':
                institution = normalized(entry.get('institution'))
                code = course_code(entry.get('code'))
                source_code = course_code(resource['name'])
                if institution not in ('georgia tech', 'georgia institute of technology') or not code or source_code != code:
                    return None, 'Confirm the Georgia Tech institution and matching course code.'
            key, name = f'resource:{resource_id}', resource['name']
        elif kind == 'course':
            institution = normalized(entry.get('institution'))
            if institution == 'georgia institute of technology': institution = 'georgia tech'
            code = re.sub(r'\s+', '', entry.get('code', '').upper())
            if not institution or not code:
                return None, 'Add a course code and institution, or select a matching activity.'
            key = f'course:{institution}:{code}'
            name = f'{institution}: {code}'
        else:
            organization, title = normalized(entry.get('organization')), normalized(entry.get('title'))
            if not organization or not title:
                return None, 'Add the organization and role/title, or select a matching activity.'
            key = f'{expected}:{organization}:{title}'
            name = f'{title} at {organization}'
        existing = conn.scalar(select(activities.c.id).where(activities.c.canonical_key == key))
        if existing or not create:
            return existing, None
        # Atomic unique canonical key also deduplicates simultaneous member imports.
        identifier = conn.scalar(pg_insert(activities).values(name=name, type=expected,
            company=entry.get('organization') or None, role=entry.get('title') if expected in ('job', 'internship') else None,
            canonical_key=key, resource_id=resource_id, is_fixture=False).on_conflict_do_nothing().returning(activities.c.id))
        if not identifier:
            identifier = conn.scalar(select(activities.c.id).where(activities.c.canonical_key == key))
        if not identifier:
            return None, 'This name already has another activity definition. Select the matching activity.'
        return identifier, None

    def selectable(self, conn, person_id, activity_id):
        return bool(conn.scalar(text('''SELECT EXISTS (
            SELECT 1 FROM activity a WHERE a.id=:activity AND NOT a.is_fixture AND (
                a.resource_id IS NOT NULL OR EXISTS (
                    SELECT 1 FROM person_activity pa JOIN person p ON p.id=pa.person_id
                    WHERE pa.activity_id=a.id AND pa.history_managed AND (
                        p.id=:person OR (p.profile_visible AND NOT p.is_fixture AND pa.public_school_year IS NOT NULL)))))'''),
            {'activity': activity_id, 'person': person_id}))

    def evaluate(self, conn, person_id, profile, kind, entry, create=False):
        result = {'source_kind': kind, 'source_id': entry['id'],
            'label': (entry.get('code') or entry.get('title') or 'Activity'),
            'activity_id': entry.get('activity_id'), 'school_year': participation_year(entry, profile, kind),
            'history_confirmed': entry.get('history_confirmed', False), 'visible': entry.get('visible', False),
            'status': 'needs_review', 'reason': None}
        if kind == 'course' and (entry.get('record_type', 'coursework') != 'coursework' or entry.get('status') not in ('taken', 'completed')):
            result.update(status='excluded', reason='Only taken/completed coursework contributes; planned courses and transfer/exam credit do not establish attendance.')
            return result
        if kind == 'experience' and entry['kind'] in ('project', 'volunteering'):
            result.update(status='excluded', reason='This experience type is not supported by the path engine yet.')
            return result
        if not result['history_confirmed']:
            result['reason'] = 'Confirm that this entry describes your participation.'
            return result
        if result['school_year'] is None:
            result['reason'] = 'Confirm the school year, or supply an enrollment year and a precise term/start month.'
            return result
        identifier, reason = self.activity(conn, person_id, kind, entry, create=create)
        result.update(activity_id=identifier, status='needs_review' if reason else 'ready', reason=reason)
        return result

    def sync(self, conn, person_id):
        tables = self.profiles.tables
        # Serialize profile and course writers on the same profile revision row.
        conn.execute(select(tables['person_profile'].c.person_id).where(
            tables['person_profile'].c.person_id == person_id).with_for_update()).all()
        record, entries = self.entries(conn, person_id)
        contributions = tables['activity_contribution']
        projected = tables['person_activity']
        # Evaluate while old rows exist so explicit canonical selections remain resolvable.
        rows = []
        grouped = defaultdict(list)
        for kind, entry in entries:
            value = self.evaluate(conn, person_id, record['data'], kind, entry, create=True)
            if value['status'] == 'ready' and value['activity_id']:
                row = dict(person_id=person_id, source_kind=kind, source_entry_id=entry['id'],
                    activity_id=value['activity_id'], school_year=value['school_year'],
                    shared=value['visible'], source=entry.get('source', 'manual'))
                rows.append(row); grouped[row['activity_id']].append(row)
        conn.execute(delete(contributions).where(contributions.c.person_id == person_id))
        if rows: conn.execute(insert(contributions), rows)
        conn.execute(delete(projected).where(projected.c.person_id == person_id, projected.c.history_managed.is_(True)))
        for activity_id, items in grouped.items():
            values = dict(school_year=min(r['school_year'] for r in items), history_managed=True,
                public_school_year=min((r['school_year'] for r in items if r['shared']), default=None))
            conn.execute(pg_insert(projected).values(person_id=person_id, activity_id=activity_id, **values)
                .on_conflict_do_update(index_elements=['person_id', 'activity_id'], set_=values))

    def collection(self, conn, person_id):
        record, entries = self.entries(conn, person_id)
        return {'items': [self.evaluate(conn, person_id, record['data'], kind, entry) for kind, entry in entries],
            'profile_version': record['version'], 'courses_version': record['courses_version'],
            'profile_visible': record['data']['profile_visible'], 'evidence': 'self_reported'}


def install_history(app, service, courses):
    history = HistoryService(service)
    service.history = history

    @app.get('/api/me/history')
    def get_history(request: Request):
        with service.engine.connect() as conn:
            return history.collection(conn, service.actor(request, conn)['person_id'])

    @app.get('/api/activities')
    def activities(request: Request, q: str = Query(default='', max_length=100)):
        with service.engine.connect() as conn:
            actor = service.actor(request, conn)
            rows = conn.execute(text('''SELECT a.id,a.name,a.type,a.company,a.role,a.resource_id FROM activity a
                WHERE NOT a.is_fixture AND strpos(lower(a.name),lower(:q))>0 AND (a.resource_id IS NOT NULL OR EXISTS (
                    SELECT 1 FROM person_activity pa JOIN person p ON p.id=pa.person_id
                    WHERE pa.activity_id=a.id AND pa.history_managed AND (p.id=:person OR (
                        NOT p.is_fixture AND p.profile_visible AND pa.public_school_year IS NOT NULL))))
                ORDER BY a.name,a.id LIMIT 100'''), {'q':q.strip(),'person':actor['person_id']}).mappings()
            return {'items': [dict(r) for r in rows]}

    @app.put('/api/me/history/{source_kind}/{source_id}')
    def review(source_kind: str, source_id: str, body: HistoryReview, request: Request):
        with service.engine.begin() as conn:
            actor = service.actor(request, conn)
            # Lock before reading either source collection.
            profiles = service.tables['person_profile']
            conn.execute(select(profiles.c.person_id).where(profiles.c.person_id == actor['person_id']).with_for_update()).all()
            changes = body.model_dump(exclude={'version'})
            if source_kind == 'experience':
                record = service.profile(conn, actor)
                data = record['profile']
                entry = next((e for e in data['experiences'] if e['id'] == source_id), None)
                if entry is None: raise HTTPException(404, 'Experience not found.')
                entry.update(changes)
                service.save(conn, actor, Profile.model_validate(data), body.version)
            elif source_kind == 'course':
                table = service.tables['person_course']
                entry = conn.scalar(select(table.c.data).where(table.c.person_id == actor['person_id'],table.c.id == source_id))
                if entry is None: raise HTTPException(404, 'Course not found.')
                courses.revision(conn, actor, body.version)
                entry.update(changes)
                entry = Course.model_validate(entry).model_dump()
                conn.execute(update(table).where(table.c.person_id == actor['person_id'],table.c.id == source_id).values(data=entry))
                history.sync(conn, actor['person_id'])
            else:
                raise HTTPException(404, 'History source not found.')
            return history.collection(conn, actor['person_id'])

    return history
