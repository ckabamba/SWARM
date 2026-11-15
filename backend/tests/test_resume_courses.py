"""Mixed resume coursework lists survive parsing, review and independent course saves."""
import io
import pytest
from docx import Document
from fastapi.testclient import TestClient
from backend.api.resume_parser import parse_text
from backend.tests.test_profiles import app, register

TEXT = """Test Student
Education
Georgia Institute of Technology
Selected Coursework:
CS1331 - Object Oriented Programming; cs 1332: Data Structures, Machine Learning
CS 2200/3210
Computer Vision (CS 4476)
Technical Skills: Python, SQL
Experience
Software Intern | Example Org
2024 - Present
Built useful tools.
"""

def courses(value):
    return [c['value'] for c in parse_text(value)['candidates'] if c['section']=='courses']


def test_course_sections_ignore_grade_metadata():
    rows=courses('Test Student\nCoursework\nMachine Learning\nGPA 3.9\nCredits: 30')
    assert [r['title'] for r in rows]==['Machine Learning']


def test_table_cells_remain_one_course():
    rows=courses('Test Student\nRelevant Coursework\nCS 1332 | Data Structures')
    assert [(r['code'],r['title']) for r in rows]==[('CS 1332','Data Structures')]


def test_mixed_course_lists_preserve_titles_and_do_not_import_skills():
    rows=courses(TEXT)
    assert [(r['code'],r['title']) for r in rows] == [
        ('CS 1331','Object Oriented Programming'),('CS 1332','Data Structures'),
        ('','Machine Learning'),('CS 2200',''),('CS 3210',''),('CS 4476','Computer Vision')]
    assert all(r['status']=='unspecified' and r['institution']=='' for r in rows)
    assert all('resource_id' not in r for r in rows)


@pytest.mark.parametrize('heading',['Relevant Coursework','Selected Courses','Course Work','Academic Coursework','Related Courses'])
def test_heading_variants(heading):
    assert len(courses('Test Student\n'+heading+' - CS 1332: Data Structures; Machine Learning'))==2


def test_repeated_attempts_keep_terms_and_merge_repeated_mentions():
    rows=courses('Test Student\nCourses\nFall 2024: CS 1332 Data Structures\nSpring 2025: CS 1332 Data Structures\nSkills\nUsed CS 1332 concepts')
    assert [(r['code'],r['term']) for r in rows]==[('CS 1332','Fall 2024'),('CS 1332','Spring 2025')]
    assert not courses('Test Student\nEducation\nGraduation MAY 2028\nGPA: 3.9\nSkills: Python, SQL')


@pytest.mark.parametrize('upload',[False,True])
def test_reviewed_mixed_courses_save_privately_and_preserve_edits(app,upload):
    with TestClient(app) as client:
        _,me=register(client)
        if upload:
            doc=Document()
            for line in TEXT.splitlines(): doc.add_paragraph(line)
            out=io.BytesIO();doc.save(out)
            response=client.post('/api/resumes?filename=course-resume.docx',content=out.getvalue())
        else:
            response=client.post('/api/resumes/text',json={'text':TEXT})
        assert response.status_code==201,response.text
        draft=response.json()
        selected=[{'id':c['id'],'value':c['value']} for c in draft['candidates'] if c['section']=='courses']
        assert len(selected)==6
        assert client.get('/api/me/courses').json()['items']==[]
        selected[1]['value'].update(resource_id=102,status='taken')
        imported=client.post('/api/resumes/'+draft['id']+'/import',json={'version':me['version'],'courses_version':me['courses_version'],'selections':selected})
        assert imported.status_code==200,imported.text
        collection=client.get('/api/me/courses').json()
        assert len(collection['items'])==6
        assert all(c['source']=='resume' and not c['visible'] and not c['history_confirmed'] for c in collection['items'])
        assert 'courses' not in client.get('/api/me').json()['profile']
        course=next(c for c in collection['items'] if c['code']=='CS 1332')
        assert course['title']=='Data Structures' and course['resource_id']==102
        course['title']='My reviewed title'
        saved=client.put('/api/me/courses/'+course['id'],json={'version':collection['version'],'course':course})
        assert saved.status_code==200
        again=client.post('/api/resumes/text',json={'text':TEXT}).json()
        me=client.get('/api/me').json()
        imported=client.post('/api/resumes/'+again['id']+'/import',json={'version':me['version'],'courses_version':me['courses_version'],'selections':[{'id':c['id'],'value':c['value']} for c in again['candidates'] if c['section']=='courses']})
        assert imported.status_code==200,imported.text
        assert imported.json()['duplicates_skipped']==6
        assert next(c for c in client.get('/api/me/courses').json()['items'] if c['code']=='CS 1332')['title']=='My reviewed title'
