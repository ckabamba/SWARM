"""Explicit local synthetic data must not make private real history public."""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text
from backend.api.app import create_app
from backend.manage import database_url
from backend.seed.load_demo_alumni import load, enrich_courses, PREFIX
from backend.tests.test_profiles import app, register
from backend.tests.test_history import save_profile
from backend.events import embeddings
from backend.tests.test_alumni_path_api import Broken


def test_local_demo_opt_in_and_privacy(app, monkeypatch):
    monkeypatch.setattr(embeddings,'_model',Broken())
    with app.state.engine.begin() as conn:
        people=load(conn)
        before=conn.scalar(text('SELECT count(*) FROM person_activity WHERE person_id=ANY(:ids)'),{'ids':people})
        enrich_courses(conn)
        assert conn.scalar(text('SELECT count(*) FROM person_activity WHERE person_id=ANY(:ids)'),{'ids':people})==before
    try:
        with TestClient(app) as normal:
            register(normal)
            assert not normal.get('/api/health').json()['synthetic_histories']
            assert not any(g['label']=='Software engineer at NVIDIA' for g in normal.get('/api/goals').json()['items'])
        demo=create_app(database_url(test=True),demo_histories=True)
        with TestClient(demo) as client:
            register(client)
            save_profile(client,kind='alum',profile_visible=True,experiences=[dict(kind='job',title='Private secretxyz',organization='Secretxyz org',school_year=5,history_confirmed=True,visible=False)])
            result=client.post('/api/path',json={'mode':'alumni','goal':'Software engineer at NVIDIA'}).json()
            assert result['path']['goal']['achievers']==40
            assert result['path']['fixture_evidence'] and result['path']['evidence']=='synthetic_demo'
            assert result['path']['stops']
            courses=[s for s in result['path']['stops'] if s['type']=='course']
            assert courses and all(s['resource']['id'] in range(101,109) for s in courses)
            assert all(s['achievers']>=3 and s['lift']>=1.5 and s['typical_year']<5 for s in courses)
            goal=result['path']['goal']['id']
            alumni=client.get('/api/people',params={'goal_id':goal}).json()
            assert alumni['fixture_evidence'] and alumni['items']
            assert all(not p['can_ask'] for p in alumni['items'])
            assert all(p['courses'] and all(c['school_year']<5 for c in p['courses']) for p in alumni['items'])
            hidden=client.post('/api/path',json={'mode':'alumni','goal':'secretxyz'}).json()
            assert hidden['match']['status']=='no_match'
            # Private contributions cannot leak into the public demo population either.
            from backend.engine.paths import _PUBLIC_HISTORY
            with app.state.engine.connect() as conn:
                names=conn.execute(text('SELECT a.name FROM ('+_PUBLIC_HISTORY+') h JOIN activity a ON a.id=h.activity_id'),{'include_fixtures':True}).scalars().all()
                assert not any('secretxyz' in name for name in names)
    finally:
        with app.state.engine.begin() as conn:
            conn.execute(text('DELETE FROM person WHERE id=ANY(:ids)'),{'ids':people})
            conn.execute(text('DELETE FROM activity WHERE is_fixture AND canonical_key LIKE :prefix'),{'prefix':PREFIX+'%'})


def test_demo_refuses_remote_database():
    with pytest.raises(ValueError,match='local-only'):
        create_app('postgresql+psycopg://example:example@remote.invalid/warmpath',demo_histories=True)
