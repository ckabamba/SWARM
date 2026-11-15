"""Peer discovery from public histories, with private viewer personalization."""
from fastapi import HTTPException, Query, Request
from sqlalchemy import text

from backend.engine.paths import _PUBLIC_HISTORY


def alumni_connections(conn, person_id, query, include_fixtures=False):
    viewer = conn.execute(text('SELECT id,name,kind,major,grad_year FROM person WHERE id=:id'),
                          {'id': person_id}).mappings().one()
    if viewer['kind'] != 'alum':
        raise HTTPException(403, 'Alumni connections are available to alumni accounts.')
    params = {'viewer': person_id, 'include_fixtures': include_fixtures,
              'tokens': query.lower().split()}
    # A resource ID joins equivalent course records; otherwise require the same
    # canonical activity. The viewer's own private history is never sent to peers.
    rows = conn.execute(text(f"""
        WITH history AS ({_PUBLIC_HISTORY}),
        mine AS (
            SELECT a.id,a.resource_id FROM person_activity pa
            JOIN activity a ON a.id=pa.activity_id WHERE pa.person_id=:viewer
        ), eligible AS (
            SELECT p.id,p.name,p.major,p.grad_year,p.is_fixture,
                count(*) FILTER (WHERE a.type NOT IN ('job','internship') AND EXISTS (
                    SELECT 1 FROM mine m WHERE m.id=a.id OR m.resource_id=a.resource_id)) AS shared_count,
                lower(concat_ws(' ',p.name,p.major,string_agg(a.name,' '))) AS searchable
            FROM person p JOIN history h ON h.person_id=p.id JOIN activity a ON a.id=h.activity_id
            WHERE p.id<>:viewer AND p.kind='alum' AND p.profile_visible
            GROUP BY p.id
        )
        SELECT e.* FROM eligible e JOIN person v ON v.id=:viewer
        WHERE NOT EXISTS (SELECT 1 FROM unnest(CAST(:tokens AS text[])) token
                          WHERE strpos(e.searchable,token)=0)
        ORDER BY shared_count DESC, (coalesce(e.major,'')<>'' AND e.major=v.major) DESC,
                 abs(e.grad_year-v.grad_year) NULLS LAST, lower(e.name), e.id
        LIMIT 3
    """), params).mappings().all()
    items = []
    for row in rows:
        history = conn.execute(text(f"""WITH history AS ({_PUBLIC_HISTORY})
            SELECT a.id,a.name,a.type,r.id AS resource_id,r.name AS resource_name,r.url,
                h.school_year, EXISTS (SELECT 1 FROM person_activity pa JOIN activity own ON own.id=pa.activity_id
                    WHERE pa.person_id=:viewer AND (own.id=a.id OR own.resource_id=a.resource_id)) AS shared
            FROM history h JOIN activity a ON a.id=h.activity_id
            LEFT JOIN api_resources r ON r.id=a.resource_id
            WHERE h.person_id=:peer ORDER BY h.school_year DESC,a.id
        """), {**params, 'peer': row['id']}).mappings().all()
        ties = [dict(h) for h in history if h['shared'] and h['type'] not in ('job', 'internship')]
        ties.sort(key=lambda h: (h['type'] != 'course', h['id']))
        goal = next((h for h in history if h['type'] in ('job','internship')), history[0])
        tie = ('You both shared ' + (ties[0]['resource_name'] or ties[0]['name']) + '.') if ties else (
            'You both studied ' + row['major'] + '.' if row['major'] and row['major'] == viewer['major']
            else 'No shared course or activity yet.')
        reachable = bool(conn.scalar(text('SELECT EXISTS(SELECT 1 FROM account WHERE person_id=:id)'), {'id':row['id']}))
        items.append({k:row[k] for k in ('id','name','major','grad_year')} | {
            'goal': {'id':goal['id'],'label':goal['name']}, 'shared_tie':tie,
            'shared': ties[:3], 'shared_count': row['shared_count'],
            'can_ask': reachable and not row['is_fixture'],
            'evidence': 'synthetic_demo' if row['is_fixture'] else 'self_reported',
            'draft': f"Hi {row['name']}, {tie} Would you be open to connecting with a fellow Tech alum?",
        })
    return {'viewer': dict(viewer), 'items':items,
            'fixture_evidence': any(p['evidence']=='synthetic_demo' for p in items)}


def install_connections(app, service, *, demo_histories=False):
    @app.get('/api/alumni-connections')
    def connections(request: Request, q: str = Query(default='', max_length=300)):
        with service.engine.connect() as conn:
            actor = service.actor(request, conn)
            return alumni_connections(conn, actor['person_id'], q.strip(), demo_histories)
