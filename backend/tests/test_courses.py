"""Transcript/course tests use synthetic documents and the isolated test DB."""
from datetime import timedelta
import io
import json
from fastapi.testclient import TestClient
from pypdf import PdfWriter
from pypdf.generic import DecodedStreamObject, DictionaryObject, NameObject
from sqlalchemy import text

from backend.tests.test_profiles import app, register
from backend.api.transcript_parser import parse_transcript
from backend.api.profiles import now

TRANSCRIPT = '''Georgia Institute of Technology
Academic History
Fall 2024
Subject Course Level Title Grade Credit Hours Quality Points
CS 1332 UG Data Structures A 3.000 12.000
MATH 1552 UG Integral Calculus B+ 4.000 13.200
Term GPA: 3.9827
Spring 2025
CS 1332 UG Data Structures C 3.000 6.000
Transfer Credit
Transfer institution: Example College
Fall 2023
ENGL 1101 English Composition A- 3.000 11.100
Exam Credit
BIOL 1107 Biology TR 4.000 0.000
Courses in Progress
Fall 2026
CS 4641 UG Machine Learning IP 3.000
'''


def transcript_pdf():
    writer = PdfWriter()
    for part in TRANSCRIPT.split('Spring 2025'):
        page = writer.add_blank_page(width=612,height=792)
        font = DictionaryObject({NameObject('/Type'):NameObject('/Font'),NameObject('/Subtype'):NameObject('/Type1'),NameObject('/BaseFont'):NameObject('/Helvetica')})
        page[NameObject('/Resources')] = DictionaryObject({NameObject('/Font'):DictionaryObject({NameObject('/F1'):font})})
        lines = (part if len(writer.pages)==1 else 'Spring 2025\n'+part).splitlines()
        stream = DecodedStreamObject()
        stream.set_data(('BT /F1 10 Tf 40 750 Td '+ ' '.join('('+line.replace('(','\\(').replace(')','\\)')+') Tj 0 -18 Td' for line in lines)+' ET').encode())
        page[NameObject('/Contents')] = writer._add_object(stream)
    out=io.BytesIO();writer.write(out);return out.getvalue()


def selections(draft):
    return [{'id':c['id'],'course':c['course']} for c in draft['candidates']]


def test_transcript_parser_grade_exclusion_and_record_types():
    parsed = parse_transcript(TRANSCRIPT)
    courses = [c['course'] for c in parsed['candidates']]
    assert len(courses)==6
    assert courses[0]['title']=='Data Structures'
    assert courses[0]['term']=='Fall 2024' and courses[2]['term']=='Spring 2025'
    assert courses[0]['status']=='unspecified'
    assert courses[3]['record_type']=='transfer_credit' and courses[3]['institution']=='Example College'
    assert courses[4]['record_type']=='exam_credit'
    assert courses[5]['status']=='in_progress'
    serialized=json.dumps(parsed)
    for secret in ['3.9827','12.000','13.200','11.100','B+','A-']:
        assert secret not in serialized
    assert 'text' not in parsed and all('grade' not in c and 'gpa' not in c for c in courses)
    assert parse_transcript('Unrecognized document layout with no course rows')['row_count']==0
    unusual=parse_transcript('Georgia Tech\nSubject Course Grade Title Credit\nCS 1332 A Data Structures 3.0\nCS 1301 97 Introduction to Computing 3.0')
    assert all(c['course']['title']=='' and c['warnings'] for c in unusual['candidates'])


def test_course_revision_profile_independence_visibility_and_ownership(app):
    with TestClient(app) as a, TestClient(app) as b:
        _, original=register(a);register(b)
        response=a.post('/api/me/courses',json={'version':1,'course':{'code':'CS 1332','term':'Fall 2024','institution':'Georgia Tech','resource_id':102,'visible':True}})
        assert response.status_code==201,response.text
        row=response.json()['items'][0]
        p=original['profile'];p['major']='Computer Science';p['profile_visible']=True
        assert a.put('/api/me',json={'version':1,'profile':p}).status_code==200
        assert a.get('/api/me/courses').json()['items']==[row]
        assert a.put('/api/me',json={'version':2,'profile':dict(p,courses=[])}).status_code==422
        assert b.put('/api/me/courses/'+row['id'],json={'version':1,'course':row}).status_code==404
        assert b.get('/api/me/courses').json()['version']==1
        assert b.get('/api/me/courses').json()['items']==[]
        assert a.put('/api/me/courses/'+row['id'],json={'version':1,'course':row}).status_code==409
        public=b.get('/api/profiles/'+str(original['person_id'])).json()['profile']['courses']
        assert len(public)==1 and 'source_id' not in public[0]
        assert a.get('/api/me/matches').json()['items']
        row['visible']=False
        assert a.put('/api/me/courses/'+row['id'],json={'version':2,'course':row}).status_code==200
        assert b.get('/api/profiles/'+str(original['person_id'])).json()['profile']['courses']==[]
        assert a.delete('/api/me/courses/'+row['id']+'?version=3').status_code==200
        assert a.get('/api/me/courses').json()['items']==[]


def test_pdf_review_repeat_terms_duplicate_preservation_and_expiry(app):
    with TestClient(app) as a, TestClient(app) as b:
        _,owner=register(a);register(b)
        response=a.post('/api/transcripts',content=transcript_pdf(),headers={'Content-Type':'application/octet-stream'})
        assert response.status_code==201,response.text
        draft=response.json();assert draft['row_count']==6
        assert any(c['location']['page']==2 for c in draft['candidates'])
        assert b.get('/api/transcripts/'+draft['id']).status_code==404
        assert b.post('/api/transcripts/'+draft['id']+'/import',json={'version':1,'selections':selections(draft)}).status_code==404
        with app.state.engine.connect() as conn:
            saved=conn.scalar(text('SELECT data FROM transcript_draft WHERE id=:id'),{'id':draft['id']})
            assert 'text' not in saved and '3.9827' not in json.dumps(saved)
        response=a.post('/api/transcripts/'+draft['id']+'/import',json={'version':1,'selections':selections(draft)})
        assert response.status_code==200,response.text
        items=response.json()['items'];assert len(items)==6
        assert len([c for c in items if c['code']=='CS 1332'])==2
        assert all(c['source']=='transcript' and not c['visible'] for c in items)
        assert a.get('/api/transcripts/'+draft['id']).status_code==404
        first=next(c for c in items if c['code']=='CS 1332' and c['term']=='Fall 2024')
        first['title']='My corrected title'
        assert a.put('/api/me/courses/'+first['id'],json={'version':2,'course':first}).status_code==200
        again=a.post('/api/transcripts/text',json={'text':TRANSCRIPT}).json()
        assert a.post('/api/transcripts/'+again['id']+'/import',json={'version':2,'selections':selections(again)}).status_code==409
        assert a.get('/api/transcripts/'+again['id']).status_code==200
        result=a.post('/api/transcripts/'+again['id']+'/import',json={'version':3,'selections':selections(again)})
        assert result.status_code==200,result.text
        assert result.json()['duplicates_skipped']==6
        assert next(c for c in result.json()['items'] if c['id']==first['id'])['title']=='My corrected title'
        expired=a.post('/api/transcripts/text',json={'text':TRANSCRIPT}).json()
        with app.state.engine.begin() as conn:
            conn.execute(text('UPDATE transcript_draft SET expires_at=:at WHERE id=:id'),{'id':expired['id'],'at':now()-timedelta(seconds=1)})
        assert a.get('/api/transcripts/'+expired['id']).status_code==404
        a.get('/api/transcripts')
        with app.state.engine.connect() as conn:
            assert not conn.scalar(text('SELECT count(*) FROM transcript_draft WHERE id=:id'),{'id':expired['id']})
        remaining=a.post('/api/transcripts/text',json={'text':TRANSCRIPT}).json()
        a.delete('/api/me')
        with app.state.engine.connect() as conn:
            assert not conn.scalar(text('SELECT count(*) FROM person_course WHERE person_id=:id'),{'id':owner['person_id']})
            assert not conn.scalar(text('SELECT count(*) FROM transcript_draft WHERE id=:id'),{'id':remaining['id']})


def test_ambiguous_duplicates_and_invalid_upload_are_not_silently_imported(app):
    with TestClient(app) as a:
        register(a)
        assert a.post('/api/transcripts',content=b'not a pdf').status_code==422
        assert a.post('/api/transcripts',content=b'x'*(5*1024*1024+1)).status_code==413
        a.post('/api/me/courses',json={'version':1,'course':{'code':'CS 1332'}})
        draft=a.post('/api/transcripts/text',json={'text':'Georgia Tech\nCS 1332 Data Structures A 3.0 12.0'}).json()
        selected=selections(draft)
        assert a.post('/api/transcripts/'+draft['id']+'/import',json={'version':2,'selections':selected}).status_code==409
        assert a.get('/api/me/courses').json()['total']==1
        selected[0]['confirm_separate']=True
        assert a.post('/api/transcripts/'+draft['id']+'/import',json={'version':2,'selections':selected}).status_code==200
        bad=dict(code='CS 1332',grade='A')
        assert a.post('/api/me/courses',json={'version':3,'course':bad}).status_code==422
