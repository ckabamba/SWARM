from contextlib import ExitStack
from uuid import uuid4

from fastapi.testclient import TestClient

from backend.tests.test_profiles import app, register
from backend.tests.test_history import save_profile


def test_connections_auth_ranking_privacy_and_asks(app):
    with ExitStack() as stack:
        clients = [stack.enter_context(TestClient(app)) for _ in range(4)]
        assert clients[0].get('/api/alumni-connections').status_code == 401
        accounts = [register(c)[1] for c in clients]
        assert clients[0].get('/api/alumni-connections').status_code == 403
        def experience(title, visible=True, kind='club'):
            return dict(kind=kind,title=title,organization='Connections Test',school_year=2,
                        history_confirmed=True,visible=visible)
        for i, client in enumerate(clients):
            save_profile(client,kind='alum',profile_visible=i!=3,major='Computer Science',
                         experiences=[experience('Robotics', i!=0),experience('Secretxyz',False),
                                      experience('Engineer',kind='job')])
        viewer = clients[0]
        response = viewer.get('/api/alumni-connections?q=Connections')
        assert response.status_code == 200,response.text
        data = response.json()
        assert {p['id'] for p in data['items']} == {a['person_id'] for a in accounts[1:3]}
        assert not data['fixture_evidence']
        assert all(p['shared_count']==1 and p['shared'] and p['can_ask'] for p in data['items'])
        assert 'secretxyz' not in response.text.lower()
        assert viewer.get('/api/alumni-connections?q=Secretxyz').json()['items'] == []
        peer = data['items'][0]
        sent = viewer.post('/api/asks',json={'alum_id':peer['id'],'goal_id':peer['goal']['id'],
                    'message':peer['draft'],'request_id':str(uuid4())})
        assert sent.status_code == 201,sent.text
        save_profile(clients[1],profile_visible=False)
        assert len(viewer.get('/api/alumni-connections?q=Connections').json()['items']) == 1
        assert viewer.get('/api/alumni-connections?q=NoSuchCompany').json()['items'] == []
        # Search is literal and cannot treat SQL or LIKE tokens as patterns.
        assert viewer.get('/api/alumni-connections',params={'q':"%' OR 1=1 --"}).json()['items'] == []
