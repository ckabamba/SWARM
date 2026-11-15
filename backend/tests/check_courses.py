"""Course/transcript UI regression using synthetic records on port 8001."""
from uuid import uuid4
from pathlib import Path
from playwright.sync_api import sync_playwright, expect
from backend.tests.test_courses import transcript_pdf, TRANSCRIPT

ROOT=Path(__file__).resolve().parents[2]
URL='http://127.0.0.1:8001'


def main():
    with sync_playwright() as pw:
        browser=pw.chromium.launch(channel='msedge',headless=True)
        context=browser.new_context(viewport={'width':1440,'height':1050},reduced_motion='reduce')
        page=context.new_page();errors=[]
        page.on('pageerror',lambda error:errors.append(str(error)))
        try:
            account=context.request.post(URL+'/api/auth/register',data={'email':str(uuid4())+'@profiles.test','password':'test-only-password-123','name':'Course Test Student'})
            assert account.status==201,account.text()
            page.goto(URL+'/thermal/#/courses')
            expect(page.get_by_role('heading',name='My Courses',exact=True)).to_be_visible(timeout=45000)
            page.get_by_role('button',name='Add course',exact=True).click()
            page.get_by_label('Course code',exact=True).fill('CS 1301')
            page.get_by_label('Course title',exact=True).fill('My manual course')
            page.get_by_label('Institution',exact=True).fill('Georgia Tech')
            page.get_by_label('Term (for example Fall 2026)',exact=True).fill('Spring 2024')
            page.get_by_role('button',name='Save course',exact=True).click()
            expect(page.get_by_text('Course saved.',exact=True)).to_be_visible()
            page.get_by_label('Transcript PDF',exact=True).set_input_files({'name':'synthetic-transcript.pdf','mimeType':'application/pdf','buffer':transcript_pdf()})
            review=page.locator('.transcript-review')
            expect(review.get_by_role('heading',name='Review transcript courses',exact=True)).to_be_visible(timeout=25000)
            expect(review.get_by_text('6 course rows detected.',exact=False)).to_be_visible()
            assert '3.9827' not in review.inner_text() and '12.000' not in review.inner_text()
            review.get_by_role('button',name='Select all courses',exact=True).click()
            review.get_by_role('button',name='Import selected courses',exact=True).click()
            expect(page.get_by_text('Courses imported. 0 duplicates skipped;',exact=False)).to_be_visible()
            expect(page.get_by_role('button',name='Edit CS 1332',exact=True)).to_have_count(2)
            expect(page.get_by_role('button',name='Edit CS 1301',exact=True)).to_have_count(1)
            page.get_by_label('Search courses',exact=True).fill('CS 1332')
            expect(page.get_by_role('button',name='Edit CS 1332',exact=True)).to_have_count(2)
            expect(page.get_by_role('button',name='Edit CS 1301',exact=True)).to_have_count(0)
            page.get_by_label('Search courses',exact=True).fill('')
            page.get_by_label('Filter by institution',exact=True).select_option('Example College')
            expect(page.get_by_role('button',name='Edit ENGL 1101',exact=True)).to_be_visible()
            expect(page.get_by_role('button',name='Edit CS 1332',exact=True)).to_have_count(0)
            page.get_by_label('Filter by institution',exact=True).select_option('')
            page.get_by_role('button',name='Edit CS 1332',exact=True).first.click()
            page.get_by_label('Course title',exact=True).fill('My reviewed course title')
            page.get_by_role('button',name='Save course',exact=True).click()
            expect(page.get_by_text('Course saved.',exact=True)).to_be_visible()
            page.reload()
            expect(page.get_by_text('My reviewed course title',exact=False)).to_be_visible(timeout=45000)
            page.get_by_text('Paste transcript text instead',exact=True).click()
            page.get_by_label('Transcript text',exact=True).fill(TRANSCRIPT)
            page.get_by_role('button',name='Parse transcript text',exact=True).click()
            expect(review.get_by_role('heading',name='Review transcript courses',exact=True)).to_be_visible()
            review.get_by_role('button',name='Select all courses',exact=True).click()
            review.get_by_role('button',name='Import selected courses',exact=True).click()
            expect(page.get_by_text('Courses imported. 6 duplicates skipped;',exact=False)).to_be_visible()
            expect(page.get_by_text('My reviewed course title',exact=False)).to_be_visible()
            page.get_by_role('button',name='My Profile',exact=True).click()
            expect(page.get_by_role('heading',name='My Profile',exact=True)).to_be_visible()
            expect(page.get_by_role('heading',name='Classes',exact=True)).to_have_count(0)
            page.get_by_label('Major',exact=True).fill('Mechanical Engineering')
            page.get_by_role('button',name='Save profile',exact=True).first.click()
            expect(page.get_by_text('Profile saved.',exact=True)).to_be_visible()
            page.get_by_role('button',name='My Courses',exact=True).click()
            expect(page.get_by_text('7 saved course entries',exact=False)).to_be_visible()
            page.screenshot(path=str(ROOT/'.local/thermal-courses.png'))
            assert not errors,errors
            print('Course browser checks passed: separate page/deep link, manual CRUD, PDF and text review/import, repeat terms, filters, duplicate preservation, reload and profile isolation; no JS errors.')
        except Exception:
            print('JS errors:',errors)
            print(page.locator('body').inner_text()[:2500])
            page.screenshot(path=str(ROOT/'.local/courses-test-failure.png'))
            raise
        finally:
            context.request.delete(URL+'/api/me')
            browser.close()


if __name__=='__main__':
    main()
