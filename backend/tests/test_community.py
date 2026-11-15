"""Persistent public community tests; synthetic users only in warmpath_test."""
from uuid import uuid4
from fastapi.testclient import TestClient
from backend.tests.test_profiles import app, register


def make_public(client, record):
    profile = record['profile']
    profile['profile_visible'] = True
    response = client.put('/api/me',json={'version':record['version'],'profile':profile})
    assert response.status_code==200,response.text
    return response.json()


def test_posts_persist_retries_author_edit_and_visibility(app):
    with TestClient(app) as author, TestClient(app) as reader:
        _,record=register(author);register(reader)
        payload={'body':'A real persisted test post','request_id':str(uuid4()),'link_kind':'resource','link_key':'3'}
        assert author.post('/api/posts',json=payload).status_code==403
        record=make_public(author,record)
        created=author.post('/api/posts',json=payload)
        assert created.status_code==201,created.text
        post=created.json()
        assert post['author']['id']==record['person_id'] and post['linked_record']['title']=='CareerBuzz'
        assert author.post('/api/posts',json=payload).json()['id']==post['id']
        assert author.post('/api/posts',json=dict(payload,body='Different content')).status_code==409
        # Server storage, not browser memory, supplies another account's feed.
        assert reader.get('/api/posts/'+str(post['id'])).json()['body']==payload['body']
        update={'body':'Edited persisted post','version':post['version']}
        make_public(reader,reader.get('/api/me').json())
        assert reader.put('/api/posts/'+str(post['id']),json=update).status_code==404
        assert reader.delete('/api/posts/'+str(post['id'])+'?version=1').status_code==404
        edited=author.put('/api/posts/'+str(post['id']),json=update)
        assert edited.status_code==200 and edited.json()['version']==2
        assert author.put('/api/posts/'+str(post['id']),json=update).status_code==409
        assert author.delete('/api/posts/'+str(post['id'])+'?version=1').status_code==409
        private=record['profile'];private['profile_visible']=False
        author.put('/api/me',json={'version':record['version'],'profile':private})
        assert reader.get('/api/posts/'+str(post['id'])).status_code==404
        assert not any(p['id']==post['id'] for p in reader.get('/api/posts').json()['items'])
        assert author.delete('/api/posts/'+str(post['id'])+'?version=2').status_code==200


def test_pagination_validation_and_account_deletion(app):
    with TestClient(app) as author, TestClient(app) as guest:
        _,record=register(author);make_public(author,record)
        assert guest.post('/api/posts',json={'body':'Not signed in','request_id':str(uuid4())}).status_code==401
        assert author.post('/api/posts',json={'body':' ','request_id':str(uuid4())}).status_code==422
        assert author.post('/api/posts',json={'body':'x'*2001,'request_id':str(uuid4())}).status_code==422
        assert author.post('/api/posts',json={'body':'Bad link','request_id':str(uuid4()),'link_kind':'resource','link_key':'999999'}).status_code==422
        assert author.post('/api/posts',json={'body':'Bad event','request_id':str(uuid4()),'link_kind':'event','link_key':'https://unrelated.invalid'}).status_code==422
        assert author.post('/api/posts',json={'body':'Spoof','request_id':str(uuid4()),'author_id':1}).status_code==422
        ids=[]
        for i in range(4):
            response=author.post('/api/posts',json={'body':f'Pagination test {i}','request_id':str(uuid4())})
            assert response.status_code==201,response.text
            ids.append(response.json()['id'])
        first=guest.get('/api/posts?limit=2').json()
        assert [p['id'] for p in first['items']]==list(reversed(ids))[:2]
        second=guest.get('/api/posts?limit=2&before='+str(first['next_cursor'])).json()
        assert [p['id'] for p in second['items']]==list(reversed(ids))[-2:]
        assert guest.get('/api/posts?limit=500').status_code==422
        assert author.post('/api/posts',json={'body':'CSRF','request_id':str(uuid4())},headers={'Origin':'https://evil.invalid'}).status_code==403
        author.delete('/api/me')
        assert all(guest.get('/api/posts/'+str(i)).status_code==404 for i in ids)
