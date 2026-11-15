"""Authenticated typed-goal resolution using reviewed, shared account histories."""
from fastapi.testclient import TestClient
import pytest

from backend.events import embeddings
from backend.events.embeddings import Unavailable
from backend.tests.test_profiles import app, register
from backend.tests.test_history import save_profile


class Broken:
    def query_embed(self, query):
        raise Unavailable("no model in this test")


@pytest.fixture
def clients(app, monkeypatch):
    monkeypatch.setattr(embeddings, "_model", Broken())
    with TestClient(app) as alum, TestClient(app) as viewer:
        register(alum)
        _, account = register(viewer)
        save_profile(alum, kind='alum', profile_visible=True, experiences=[
            dict(kind='internship', title='Software internship', organization='NVIDIA',
                 school_year=3, history_confirmed=True, visible=True),
            dict(kind='job', title='Software engineer', organization='NVIDIA',
                 school_year=5, history_confirmed=True, visible=True),
            dict(kind='internship', title='Secret astrophysics', organization='Private lab',
                 school_year=2, history_confirmed=True, visible=False),
        ])
        yield alum, viewer, account


def test_typed_goal_and_selected_id_use_authenticated_actor(clients):
    _, viewer, account = clients
    response = viewer.post('/api/path', json={'mode':'alumni','goal':'NVIDIA internship'})
    assert response.status_code == 200, response.text
    body = response.json()
    assert body['match']['status'] == 'matched'
    assert body['match']['match_basis'] == 'keyword'
    assert body['match']['fallback_reason'] == 'no model in this test'
    path = body['path']
    assert path['student']['id'] == account['person_id']
    assert path['goal']['achievers'] == 1 and path['fixture_evidence'] is False
    selected = viewer.post('/api/path', json={'mode':'alumni','goal_id':path['goal']['id']})
    assert selected.json() == path
    people = viewer.get('/api/people', params={'goal_id':path['goal']['id']}).json()['items']
    assert len(people) == 1 and people[0]['can_ask'] and people[0]['draft']


def test_ambiguous_no_match_and_privacy_withdrawal(clients):
    alum, viewer, _ = clients
    tied = viewer.post('/api/path', json={'mode':'alumni','goal':'NVIDIA'}).json()
    assert tied['match']['status'] == 'ambiguous' and tied['path'] is None
    assert len(tied['match']['candidates']) == 2
    for query in ('pastry chef', 'secret astrophysics'):
        body = viewer.post('/api/path', json={'mode':'alumni','goal':query}).json()
        assert body['match']['status'] == 'no_match' and body['path'] is None
        assert body['match']['candidates'] == []
    save_profile(alum, profile_visible=False)
    hidden = viewer.post('/api/path', json={'mode':'alumni','goal':'NVIDIA'}).json()
    assert hidden['match']['status'] == 'no_match' and hidden['path'] is None


def test_validation_and_login(clients):
    _, viewer, account = clients
    for extra in ({}, {'goal':'  '}, {'goal':'x'*301}, {'goal_id':0},
                  {'goal':'NVIDIA','goal_id':1}, {'goal':'NVIDIA','student_id':account['person_id']}):
        assert viewer.post('/api/path', json={'mode':'alumni',**extra}).status_code == 422
    assert viewer.post('/api/path', json={'mode':'alumni','goal_id':2147483647}).status_code == 404
    viewer.post('/api/auth/logout')
    assert viewer.post('/api/path', json={'mode':'alumni','goal':'NVIDIA'}).status_code == 401
    assert viewer.post('/api/path', json={'mode':'alumni','goal_id':1}).status_code == 401
