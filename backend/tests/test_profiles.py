"""Synthetic documents only, isolated PostgreSQL test database."""
from datetime import timedelta
import io
import json
from uuid import uuid4

from docx import Document
from fastapi.testclient import TestClient
from pypdf import PdfWriter
from pypdf.generic import DecodedStreamObject, DictionaryObject, NameObject
import pytest
from sqlalchemy import create_engine, text

from backend.api.app import create_app
from backend.api.profiles import bounded_extract, now
from backend.api.resume_parser import parse_text
from backend.manage import database_url
from backend.migrate import migrate


@pytest.fixture
def app():
    url = database_url(test=True)
    engine = create_engine(url)
    with engine.connect() as conn:
        assert conn.scalar(text('SELECT current_database()')) == 'warmpath_test'
    migrate(url)
    with engine.begin() as conn:
        conn.execute(text('DELETE FROM account_rate_limit'))
    yield create_app(url)
    with engine.begin() as conn:
        conn.execute(text("DELETE FROM person WHERE id IN (SELECT person_id FROM account WHERE email LIKE '%@profiles.test')"))
    engine.dispose()


def register(client):
    data = {'email': str(uuid4()) + '@profiles.test', 'password': 'test-only-password-123', 'name': 'Test Student'}
    response = client.post('/api/auth/register', json=data)
    assert response.status_code == 201, response.text
    return data, response.json()


def docx_bytes():
    doc = Document()
    doc.add_paragraph('Test Student')
    doc.add_paragraph('test.student@example.test')
    doc.add_heading('Experience', 1)
    doc.add_paragraph('Research Assistant | Test Lab')
    doc.add_paragraph('2024 - Present')
    doc.add_paragraph('Built robot navigation experiments.')
    doc.add_heading('Relevant Coursework', 1)
    table = doc.add_table(rows=1, cols=2)
    table.cell(0,0).text = 'CS 1332'
    table.cell(0,1).text = 'Data Structures and Algorithms'
    out = io.BytesIO()
    doc.save(out)
    return out.getvalue()


def pdf_bytes(blank=False):
    writer = PdfWriter()
    page = writer.add_blank_page(width=612, height=792)
    if not blank:
        font = DictionaryObject({NameObject('/Type'):NameObject('/Font'), NameObject('/Subtype'):NameObject('/Type1'), NameObject('/BaseFont'):NameObject('/Helvetica')})
        page[NameObject('/Resources')] = DictionaryObject({NameObject('/Font'):DictionaryObject({NameObject('/F1'):font})})
        stream = DecodedStreamObject()
        stream.set_data(b'BT /F1 12 Tf 50 700 Td (Test Student) Tj 0 -20 Td (student@example.test) Tj 0 -20 Td (Relevant Coursework: CS 1332) Tj ET')
        page[NameObject('/Contents')] = writer._add_object(stream)
    out = io.BytesIO(); writer.write(out)
    return out.getvalue()


def test_accounts_ownership_visibility_and_sessions(app):
    with TestClient(app) as a, TestClient(app) as b:
        assert a.get('/api/me').status_code == 401
        credentials, first = register(a)
        _, second = register(b)
        assert a.get('/api/profiles/'+str(first['person_id'])).status_code == 404
        p = first['profile']
        p['major'] = 'Computer Engineering'
        p['profile_visible'] = True
        p['contacts'] = [dict(kind='email', value='private@example.test'), dict(kind='github', value='https://github.com/example', visible=True)]
        response = a.put('/api/me', json={'version':1,'profile':p})
        assert response.status_code == 200, response.text
        public = b.get('/api/profiles/'+str(first['person_id'])).json()['profile']
        assert len(public['contacts']) == 1 and public['contacts'][0]['kind'] == 'github'
        assert 'source_id' not in public['contacts'][0] and 'email' not in public
        assert b.get('/api/me').json()['profile']['major'] == ''
        assert a.put('/api/me', json={'version':1,'profile':p}).status_code == 409
        assert a.put('/api/me', json={'version':2,'profile':p}, headers={'Origin':'https://evil.example'}).status_code == 403
        assert a.put('/api/me', json={'version':2,'profile':dict(p, person_id=second['person_id'])}).status_code == 422
        cookie = a.cookies.get('warmpath_account')
        a.post('/api/auth/logout')
        a.cookies.set('warmpath_account',cookie)
        assert a.get('/api/me').status_code == 401
        a.cookies.clear()
        assert a.post('/api/auth/login',json={k:v for k,v in credentials.items() if k!='name'}).status_code == 200
        assert a.get('/api/me').json()['profile']['major'] == 'Computer Engineering'
        assert a.delete('/api/me').status_code == 200
        assert a.get('/api/me').status_code == 401
        assert b.get('/api/profiles/'+str(first['person_id'])).status_code == 404


def test_resume_review_atomic_import_duplicate_preservation(app):
    with TestClient(app) as a, TestClient(app) as b:
        register(a); register(b)
        response = a.post('/api/resumes?filename=resume.docx', content=docx_bytes(), headers={'Content-Type':'application/octet-stream'})
        assert response.status_code == 201, response.text
        draft = response.json()
        assert 'courses' not in a.get('/api/me').json()['profile']
        assert a.get('/api/me/courses').json()['items'] == []
        assert b.get('/api/resumes/'+draft['id']).status_code == 404
        assert b.post('/api/resumes/'+draft['id']+'/import',json={'version':1,'selections':[]}).status_code == 404
        candidates = draft['candidates']
        assert any(c['section']=='experiences' and c['value']['organization']=='Test Lab' for c in candidates)
        course = next(c for c in candidates if c['section']=='courses')
        course['value'].update(status='completed', resource_id=102)
        selections = [{'id':c['id'],'value':c['value']} for c in candidates if c['section']!='name']
        response = a.post('/api/resumes/'+draft['id']+'/import',json={'version':1,'courses_version':1,'selections':selections})
        assert response.status_code == 200, response.text
        profile = response.json()['profile']
        assert a.get('/api/me/courses').json()['items'][0]['status'] == 'completed'
        assert profile['experiences'][0]['source'] == 'resume'
        assert all(not item['visible'] for key in ('contacts','experiences') for item in profile[key])
        assert not a.get('/api/me/courses').json()['items'][0]['visible']
        assert a.get('/api/resumes/'+draft['id']).status_code == 404
        matches = a.get('/api/me/matches').json()
        assert matches['items'] and matches['alumni_count'] is None and matches['lift'] is None
        profile['experiences'][0]['description'] = 'My corrected description'
        assert a.put('/api/me',json={'version':2,'profile':profile}).status_code == 200
        again = a.post('/api/resumes?filename=resume.docx',content=docx_bytes()).json()
        selected = [{'id':c['id'],'value':c['value']} for c in again['candidates'] if c['section']!='name']
        conflict = a.post('/api/resumes/'+again['id']+'/import',json={'version':2,'selections':selected})
        assert conflict.status_code == 409
        assert a.get('/api/resumes/'+again['id']).status_code == 200
        imported = a.post('/api/resumes/'+again['id']+'/import',json={'version':3,'courses_version':2,'selections':selected}).json()
        assert imported['duplicates_skipped'] >= 3
        assert imported['profile']['experiences'][0]['description'] == 'My corrected description'
        assert len(a.get('/api/me/courses').json()['items']) == 1


def test_validation_expiry_and_failed_document_fallback(app):
    with TestClient(app) as a:
        _,record = register(a)
        assert a.post('/api/resumes?filename=file.exe',content=b'123').status_code == 422
        assert a.post('/api/resumes?filename=file.pdf',content=b'not a pdf').status_code == 422
        assert a.post('/api/resumes?filename=file.pdf',content=pdf_bytes(blank=True)).status_code == 422
        assert a.post('/api/resumes?filename=file.pdf',content=b'x'*(5*1024*1024+1)).status_code == 413
        response = a.post('/api/resumes?filename=file.pdf',content=pdf_bytes())
        assert response.status_code == 201, response.text
        draft_id = response.json()['id']
        with app.state.engine.begin() as conn:
            conn.execute(text('UPDATE resume_draft SET expires_at=:expiry WHERE id=:id'),{'expiry':now()-timedelta(seconds=1),'id':draft_id})
        assert a.get('/api/resumes/'+draft_id).status_code == 404
        a.get('/api/resumes')
        with app.state.engine.connect() as conn:
            assert conn.scalar(text('SELECT count(*) FROM resume_draft WHERE id=:id'),{'id':draft_id}) == 0
        p = record['profile']; p['contacts']=[{'kind':'portfolio','value':'javascript:alert(1)'}]
        assert a.put('/api/me',json={'version':1,'profile':p}).status_code == 422
        p['contacts']=[];p['share_city']=True
        assert a.put('/api/me',json={'version':1,'profile':p}).status_code == 422
        pasted = a.post('/api/resumes/text',json={'text':'Test Student\nRelevant Coursework: CS 1332'}).json()
        a.delete('/api/resumes/'+pasted['id'])
        assert a.get('/api/resumes/'+pasted['id']).status_code == 404


def test_login_throttle_and_password_not_stored_in_plaintext(app):
    with TestClient(app) as a:
        credentials,record = register(a)
        with app.state.engine.connect() as conn:
            hashed = conn.scalar(text('SELECT password_hash FROM account WHERE person_id=:id'),{'id':record['person_id']})
            assert credentials['password'] not in hashed
        a.post('/api/auth/logout')
        for _ in range(10):
            assert a.post('/api/auth/login',json={'email':credentials['email'],'password':'incorrect-password'}).status_code == 401
        assert a.post('/api/auth/login',json={'email':credentials['email'],'password':credentials['password']}).status_code == 429


def test_unknown_fields_and_partial_dates_remain_reviewable():
    parsed = parse_text('Test Student\nExperience\nResearch Assistant | Test Lab\n2024 - Present\nBuilt robots.\nRelevant Coursework: CS 1332')
    experience = next(c['value'] for c in parsed['candidates'] if c['section']=='experiences')
    assert experience['start'] == '2024' and experience['end'] == '' and experience['ongoing']
    course = next(c['value'] for c in parsed['candidates'] if c['section']=='courses')
    assert course['status'] == 'unspecified' and course['institution'] == ''
    profile = parse_text('Test Student\nEducation\nB.S. in Computer Science\nExpected graduation: May 2028\nRelevant Coursework\nData Structures, Machine Learning')
    assert next(c['value'] for c in profile['candidates'] if c['section']=='major') == 'Computer Science'
    assert next(c['value'] for c in profile['candidates'] if c['section']=='grad_year') == 2028
    assert [c['value']['title'] for c in profile['candidates'] if c['section']=='courses'] == ['Data Structures', 'Machine Learning']
