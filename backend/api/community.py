"""Real public member posts, author-owned mutations and source-backed links."""
from datetime import datetime, timezone
import hashlib
import json
from typing import Literal
from uuid import UUID

from fastapi import HTTPException, Query, Request
from pydantic import Field, model_validator
from sqlalchemy import delete, select, update
from sqlalchemy.dialects.postgresql import insert as pg_insert

from backend.api.profile_models import Model


class PostContent(Model):
    body: str = Field(min_length=1, max_length=2000)
    link_kind: Literal['resource','event'] | None = None
    link_key: str | None = Field(default=None, max_length=1000)

    @model_validator(mode='after')
    def paired(self):
        if (self.link_kind is None) != (self.link_key is None):
            raise ValueError('Choose a complete resource/event link or no link.')
        return self


class CreatePost(PostContent):
    request_id: UUID


class EditPost(PostContent):
    version: int = Field(ge=1)


def install_community(app, service):
    engine = service.engine

    def link_record(conn, kind, key, strict=False):
        if kind is None:
            return None
        if kind == 'resource':
            table = service.tables['api_resources']
            row = conn.execute(select(table).where(table.c.id == int(key))).mappings().first() if key.isdigit() and len(key)<10 else None
            result = None if row is None else {'kind':kind,'key':str(row['id']),'title':row['name'],
                'url':row['url'],'description':row['summary'],'source_url':row['source_url']}
        else:
            table = service.tables['api_public_events']
            row = conn.execute(select(table).where(table.c.url == key)).mappings().first()
            result = None if row is None else {'kind':kind,'key':row['url'],'title':row['title'],
                'url':row['url'],'starts_at':row['starts_at'],'ends_at':row['ends_at'],
                'location':row['location'],'organizer':row['organizer'],'source':row['source']}
        if strict and result is None:
            raise HTTPException(422, 'The linked resource/event is unavailable. Choose a current record or remove the link.')
        return result

    def visible_query():
        posts, people = service.tables['post'], service.tables['person']
        return select(posts, people.c.name, people.c.kind, people.c.major).join(people, people.c.id == posts.c.author_id).where(
            people.c.profile_visible.is_(True), people.c.is_fixture.is_(False))

    def rendered(conn, row):
        return {'id':row['id'],'body':row['body'],'version':row['version'],
            'created_at':row['created_at'],'updated_at':row['updated_at'],
            'author':{'id':row['author_id'],'name':row['name'],'kind':row['kind'],'major':row['major']},
            'link_kind':row['link_kind'],'link_key':row['link_key'],
            'linked_record':link_record(conn,row['link_kind'],row['link_key'])}

    def public_actor(request, conn):
        actor = service.actor(request, conn)
        people = service.tables['person']
        allowed = conn.scalar(select(people.c.id).where(people.c.id == actor['person_id'],
            people.c.profile_visible.is_(True), people.c.is_fixture.is_(False)).with_for_update())
        if not allowed:
            raise HTTPException(403, 'Make your profile public in My Profile before sharing a community post. Individual contacts and courses stay private unless you choose otherwise.')
        return actor

    @app.get('/api/posts')
    def feed(before: int | None = Query(default=None, ge=1), limit: int = Query(default=20, ge=1, le=50)):
        posts = service.tables['post']
        stmt = visible_query()
        if before is not None:
            stmt = stmt.where(posts.c.id < before)
        with engine.connect() as conn:
            rows = list(conn.execute(stmt.order_by(posts.c.id.desc()).limit(limit+1)).mappings())
            return {'items':[rendered(conn,r) for r in rows[:limit]],
                'next_cursor':rows[limit-1]['id'] if len(rows)>limit else None}

    @app.get('/api/posts/{post_id}')
    def detail(post_id: int):
        with engine.connect() as conn:
            row = conn.execute(visible_query().where(service.tables['post'].c.id == post_id)).mappings().first()
            if row is None:
                raise HTTPException(404, 'Post not found.')
            return rendered(conn,row)

    @app.post('/api/posts', status_code=201)
    def create(body: CreatePost, request: Request):
        with engine.begin() as conn:
            actor = public_actor(request,conn)
            service.throttle('community:' + actor['id'], 30)
            link_record(conn, body.link_kind, body.link_key, strict=True)
            posts = service.tables['post']
            content = body.model_dump(exclude={'request_id'})
            fingerprint = hashlib.sha256(json.dumps(content, sort_keys=True).encode()).hexdigest()
            post_id = conn.scalar(pg_insert(posts).values(author_id=actor['person_id'],**content,
                request_id=str(body.request_id),request_hash=fingerprint).on_conflict_do_nothing(
                    constraint='uq_post_author_request').returning(posts.c.id))
            if post_id is None:
                existing = conn.execute(select(posts.c.id,posts.c.request_hash).where(posts.c.author_id==actor['person_id'],
                    posts.c.request_id==str(body.request_id))).mappings().one()
                if existing['request_hash'] != fingerprint:
                    raise HTTPException(409, 'This request ID was already used for a different post. Reload before sharing.')
                post_id = existing['id']
            row = conn.execute(visible_query().where(posts.c.id==post_id)).mappings().one()
            return rendered(conn,row)

    @app.put('/api/posts/{post_id}')
    def edit(post_id: int, body: EditPost, request: Request):
        with engine.begin() as conn:
            actor = public_actor(request,conn)
            service.throttle('community:' + actor['id'], 30)
            posts = service.tables['post']
            if not conn.scalar(select(posts.c.id).where(posts.c.id==post_id,posts.c.author_id==actor['person_id'])):
                raise HTTPException(404, 'Post not found.')
            link_record(conn,body.link_kind,body.link_key,strict=True)
            if not conn.execute(update(posts).where(posts.c.id==post_id,posts.c.author_id==actor['person_id'],posts.c.version==body.version)
                .values(**body.model_dump(exclude={'version'}),version=body.version+1,updated_at=datetime.now(timezone.utc))).rowcount:
                raise HTTPException(409, 'This post changed in another session. Reload the feed before editing again.')
            row = conn.execute(visible_query().where(posts.c.id==post_id)).mappings().one()
            return rendered(conn,row)

    @app.delete('/api/posts/{post_id}')
    def remove(post_id: int, request: Request, version: int = Query(ge=1)):
        with engine.begin() as conn:
            actor = service.actor(request,conn)
            posts = service.tables['post']
            if not conn.scalar(select(posts.c.id).where(posts.c.id==post_id,posts.c.author_id==actor['person_id'])):
                raise HTTPException(404, 'Post not found.')
            if not conn.execute(delete(posts).where(posts.c.id==post_id,posts.c.author_id==actor['person_id'],posts.c.version==version)).rowcount:
                raise HTTPException(409, 'This post changed. Reload before deleting it.')
            return {'status':'deleted'}

    @app.get('/api/community/options')
    def options(request: Request):
        with engine.connect() as conn:
            service.actor(request,conn)
            resources = service.tables['api_resources']
            return {'resources':[dict(row) for row in conn.execute(select(resources.c.id,resources.c.name,resources.c.kind).order_by(resources.c.name)).mappings()]}
