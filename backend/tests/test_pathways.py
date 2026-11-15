from contextlib import ExitStack
from uuid import uuid4
from fastapi.testclient import TestClient
from backend.api.app import create_app
from backend.manage import database_url
from backend.tests.test_profiles import app, register
from backend.tests.test_history import save_profile


def test_paths_privacy_and_persistent_asks(app):
    with ExitStack() as stack:
        clients = [stack.enter_context(TestClient(app)) for _ in range(7)]
        accounts = [register(c)[1] for c in clients]
        def entry(title, year, visible=True):
            return dict(kind='internship', title=title, organization='Path Test Org', school_year=year,
                        history_confirmed=True, visible=visible)
        for i, client in enumerate(clients[:6]):
            entries = [entry('Common activity',1)]
            if i < 3: entries += [entry('Selective activity',2),entry('Goal role',4)]
            save_profile(client, kind='alum', profile_visible=True, experiences=entries)
        viewer = clients[-1]
        goals = viewer.get('/api/goals').json()['items']
        goal = next(g for g in goals if g['label']=='goal role at path test org')
        body = {'mode':'alumni','goal_id':goal['id']}
        path = viewer.post('/api/path',json=body).json()
        assert path['goal']['achievers']==3 and not path['fixture_evidence']
        assert len(path['stops'])==1
        assert path['stops'][0]['achievers']==3 and path['stops'][0]['lift']==2
        assert viewer.post('/api/path',json={**body,'student_id':accounts[0]['person_id']}).status_code==422
        people=viewer.get('/api/people',params={'goal_id':goal['id']}).json()['items']
        assert len(people)==3 and all(p['can_ask'] for p in people)
        payload=dict(alum_id=accounts[0]['person_id'],goal_id=goal['id'],message='  Can we discuss your experience?\n',request_id=str(uuid4()))
        sent=viewer.post('/api/asks',json=payload)
        assert sent.status_code==201,sent.text
        ask=sent.json(); url='/api/asks/'+str(ask['id'])
        assert ask['message']==payload['message']
        assert viewer.post('/api/asks',json=payload).json()['id']==ask['id']
        assert viewer.post('/api/asks',json={**payload,'message':'Changed'}).status_code==409
        assert clients[5].get(url).status_code==404
        assert viewer.post(url+'/accept').status_code==403
        accepted=clients[0].post(url+'/accept').json()
        assert accepted['status']=='accepted'
        assert clients[0].post(url+'/accept').json()['accepted_at']==accepted['accepted_at']
        with TestClient(create_app(database_url(test=True))) as restarted:
            restarted.cookies.update(dict(viewer.cookies))
            assert restarted.get(url).json()['status']=='accepted'
        # Withdrawing sharing immediately removes evidence and prevents new asks.
        save_profile(clients[0],profile_visible=False)
        assert viewer.post('/api/path',json=body).json()['goal']['achievers']==2
        assert viewer.post('/api/asks',json={**payload,'request_id':str(uuid4())}).status_code==404
        assert clients[0].get(url).status_code==200
        # An earlier private occurrence cannot be used as public chronology.
        save_profile(clients[1], experiences=[entry('Selective activity',1,False),entry('Selective activity',5),entry('Goal role',4)])
        assert not any(p['id']==accounts[1]['person_id'] for p in viewer.get('/api/people',params={
            'goal_id':goal['id'],'activity_id':path['stops'][0]['activity_id']}).json()['items'])
        viewer.post('/api/auth/logout')
        assert viewer.get(url).status_code==401
