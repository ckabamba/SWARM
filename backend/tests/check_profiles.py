"""End-to-end profile test on a dedicated test-server port, never real profiles.

Run with --url http://127.0.0.1:8001 after starting the test database server.
"""
import argparse
from pathlib import Path
from uuid import uuid4
from playwright.sync_api import sync_playwright, expect
from backend.tests.test_profiles import docx_bytes

ROOT = Path(__file__).resolve().parents[2]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--url', default='http://127.0.0.1:8001')
    url = parser.parse_args().url
    with sync_playwright() as pw:
        browser = pw.chromium.launch(channel='msedge', headless=True)
        context = browser.new_context(viewport={'width':1440,'height':1050}, reduced_motion='reduce')
        page = context.new_page()
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        email = str(uuid4())+'@profiles.test'
        password = 'test-only-password-123'
        try:
            page.goto(url+'/thermal/')
            page.get_by_role('button', name='My Profile', exact=True).click(timeout=45000)
            page.get_by_role('button', name='Create an account', exact=True).click()
            page.get_by_label('Your name', exact=True).fill('Test Student')
            page.get_by_label('Account email', exact=True).fill(email)
            page.get_by_label('Password (12–128 characters)',exact=True).fill(password)
            page.get_by_role('button',name='Create account',exact=True).click()
            expect(page.get_by_role('heading',name='About you',exact=True)).to_be_visible()
            page.get_by_label('Major',exact=True).fill('Computer Engineering')
            page.get_by_role('button',name='Add experience',exact=True).click()
            page.get_by_label('Role or project title',exact=True).fill('Personal project')
            page.get_by_label('Organization',exact=True).fill('Independent')
            page.get_by_role('button',name='Save profile',exact=True).first.click()
            expect(page.get_by_text('Profile saved.',exact=True)).to_be_visible()
            page.get_by_label('Resume file',exact=True).set_input_files({'name':'test-resume.docx', 'mimeType':'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'buffer':docx_bytes()})
            expect(page.get_by_role('heading',name='Review resume suggestions',exact=True)).to_be_visible(timeout=25000)
            review = page.locator('.resume-review')
            review.get_by_label('Import class',exact=True).check()
            review.get_by_label('Course status',exact=True).select_option('completed')
            review.get_by_label('Link a campus resource (optional; confirm the match)',exact=True).first.select_option('102')
            review.get_by_label('Import experience',exact=True).check()
            review.get_by_label('Description',exact=True).fill('Reviewed and corrected research description.')
            review.get_by_role('button',name='Import selected entries',exact=True).click()
            expect(page.get_by_text('Selected entries imported.',exact=False)).to_be_visible()
            expect(page.get_by_label('Role or project title',exact=True)).to_have_count(2)
            expect(page.get_by_label('Course code',exact=True)).to_have_count(0)
            page.get_by_role('button',name='Reload profile',exact=True).click()
            expect(page.get_by_label('Major',exact=True)).to_have_value('Computer Engineering')
            expect(page.get_by_label('Role or project title',exact=True).first).to_have_value('Personal project')
            expect(page.get_by_label('Description',exact=True).last).to_have_value('Reviewed and corrected research description.')
            page.screenshot(path=str(ROOT/'.local/thermal-profile.png'),full_page=False)
            other = browser.new_context(viewport={'width':1440,'height':1050})
            other_page = other.new_page()
            other_page.goto(url+'/thermal/')
            other_page.get_by_role('button',name='My Profile',exact=True).click(timeout=45000)
            expect(other_page.get_by_role('heading',name='Sign in',exact=True)).to_be_visible()
            other_page.get_by_label('Account email',exact=True).fill(email)
            other_page.get_by_label('Password (12–128 characters)',exact=True).fill(password)
            other_page.get_by_role('button',name='Sign in',exact=True).click()
            expect(other_page.get_by_label('Major',exact=True)).to_have_value('Computer Engineering')
            other_page.get_by_role('button',name='My Courses',exact=True).click()
            expect(other_page.get_by_role('button',name='Edit CS 1332',exact=True)).to_be_visible()
            other.close()
            page.get_by_role('button',name='My Courses',exact=True).click()
            page.once('dialog',lambda dialog:dialog.accept())
            page.get_by_role('button',name='Remove CS 1332',exact=True).click()
            expect(page.get_by_text('Course removed.',exact=True)).to_be_visible()
            page.get_by_role('button',name='Reload courses',exact=True).click()
            expect(page.get_by_role('button',name='Edit CS 1332',exact=True)).to_have_count(0)
            page.get_by_role('button',name='My Profile',exact=True).click()
            page.get_by_text('Delete my account and profile',exact=True).click()
            page.get_by_label('Type DELETE to confirm',exact=True).fill('DELETE')
            page.get_by_role('button',name='Delete account permanently',exact=True).click()
            expect(page.get_by_text('Account and profile deleted.',exact=True)).to_be_visible()
            assert not errors, errors
            print('Profile browser checks passed: create account, manual edit, DOCX upload/review/import, saved matches, reload, cross-browser sign-in, entry removal, account deletion; no JS errors.')
        except Exception:
            print('Browser errors:', errors)
            print('Visible state:', page.locator('body').inner_text()[:5000])
            page.screenshot(path=str(ROOT/'.local/profile-test-failure.png'))
            raise
        finally:
            # Owner-only cleanup in case an assertion interrupted the UI test.
            context.request.delete(url+'/api/me')
            context.close()
            browser.close()


if __name__ == '__main__':
    main()
