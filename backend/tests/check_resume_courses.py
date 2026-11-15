"""React resume course review against profile_server and its isolated test database."""
import io
from uuid import uuid4
from docx import Document
from playwright.sync_api import sync_playwright,expect
from backend.tests.test_resume_courses import TEXT


def main():
    base='http://127.0.0.1:8001'
    doc=Document()
    for line in TEXT.splitlines():doc.add_paragraph(line)
    output=io.BytesIO();doc.save(output)
    with sync_playwright() as p:
        browser=p.chromium.launch(channel='msedge',headless=True)
        context=browser.new_context(viewport={'width':1280,'height':900})
        errors=[]
        try:
            response=context.request.post(base+'/api/auth/register',data={'email':uuid4().hex+'@profiles.test','password':'test-only-password-123','name':'Course Review Test'})
            assert response.status==201,response.text()
            page=context.new_page();page.on('pageerror',lambda e:errors.append(str(e)))
            page.goto(base+'/app/')
            page.get_by_role('button',name='Account: Course Review Test',exact=True).click()
            page.get_by_role('button',name='Edit profile',exact=True).click()
            panel=page.get_by_role('complementary',name='Account',exact=True)
            panel.locator('input[type=file]').set_input_files({'name':'resume.docx','mimeType':'application/vnd.openxmlformats-officedocument.wordprocessingml.document','buffer':output.getvalue()})
            expect(panel.get_by_role('button',name='Select all courses')).to_be_visible(timeout=25000)
            expect(panel.get_by_label('Course code',exact=True)).to_have_count(6)
            panel.get_by_label('Course title',exact=True).nth(1).fill('Reviewed Data Structures')
            panel.get_by_label('Course resource (optional; confirm the match)',exact=True).nth(1).select_option('102')
            panel.get_by_role('button',name='Select all courses').click()
            panel.get_by_role('button',name='Add 6 selected entries',exact=True).click()
            expect(panel.get_by_text('Courses are saved to My Courses.',exact=False)).to_be_visible()
            panel.get_by_role('link',name='Open My Courses',exact=True).click()
            expect(page.get_by_text('Reviewed Data Structures',exact=False)).to_be_visible()
            page.reload()
            expect(page.get_by_text('Reviewed Data Structures',exact=False)).to_be_visible()
            rows=context.request.get(base+'/api/me/courses').json()['items']
            assert len(rows)==6 and all(r['source']=='resume' and not r['visible'] for r in rows)
            assert next(r for r in rows if r['code']=='CS 1332')['resource_id']==102
            assert not errors,errors
            print('PASS: DOCX mixed courses, explicit selection, course editing, catalog link, My Courses navigation and reload persistence.')
        finally:
            context.request.delete(base+'/api/me')
            context.close();browser.close()

if __name__=='__main__':main()
