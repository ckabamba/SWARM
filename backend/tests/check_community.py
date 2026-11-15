"""Community persistence checks against isolated warmpath_test on port 8001."""
import json
from pathlib import Path
from uuid import uuid4
from playwright.sync_api import sync_playwright, expect

ROOT=Path(__file__).resolve().parents[2]
BASE='http://127.0.0.1:8001'


def main():
    with sync_playwright() as pw:
        browser=pw.chromium.launch(channel='msedge',headless=True)
        context=browser.new_context(viewport={'width':1440,'height':1000},reduced_motion='reduce')
        reader=browser.new_context(viewport={'width':1440,'height':1000},reduced_motion='reduce')
        page=context.new_page();other=reader.new_page();errors=[];requests=[]
        page.on('pageerror',lambda error:errors.append(str(error)))
        other.on('pageerror',lambda error:errors.append(str(error)))
        page.on('request',lambda request:requests.append(request.url))
        content='Persisted community check '+uuid4().hex
        try:
            response=context.request.post(BASE+'/api/auth/register',data={'email':str(uuid4())+'@profiles.test','password':'test-only-password-123','name':'Community Test Student'})
            assert response.status==201,response.text()
            record=response.json();profile=record['profile'];profile['profile_visible']=True
            profile['contacts']=[{'kind':'email','value':'private-contact@example.test','visible':False}]
            assert context.request.put(BASE+'/api/me',data={'version':record['version'],'profile':profile}).status==200
            page.goto(BASE+'/thermal/community.html')
            expect(page.get_by_role('heading',name='Social Jackets',exact=True)).to_be_visible(timeout=45000)
            expect(page.get_by_role('heading',name='Community Test Student',exact=True)).to_be_visible()
            page.get_by_role('button',name='Share an update?',exact=True).click()
            page.get_by_label('Post text',exact=True).fill(content)
            page.get_by_label('Link a campus resource or event (optional)',exact=True).select_option(json.dumps(['resource','3'],separators=(',',':')))
            # Simulate a lost response AFTER the server commits. Retry must not duplicate.
            def lose_response(route):
                if route.request.method=='POST':
                    route.fetch();route.abort()
                else: route.continue_()
            page.route('**/api/posts',lose_response)
            page.get_by_role('button',name='Share update',exact=True).click()
            expect(page.get_by_role('dialog').get_by_role('alert')).to_be_visible()
            page.unroute('**/api/posts')
            page.get_by_role('button',name='Share update',exact=True).click()
            expect(page.get_by_text(content,exact=True)).to_be_visible()
            expect(page.locator('.community-post').filter(has_text=content)).to_have_count(1)
            page.reload()
            expect(page.get_by_text(content,exact=True)).to_be_visible(timeout=45000)
            other.goto(BASE+'/thermal/community.html')
            expect(other.get_by_text(content,exact=True)).to_be_visible(timeout=45000)
            post=other.locator('.community-post').filter(has_text=content)
            expect(post.get_by_role('button',name='Edit post',exact=True)).to_have_count(0)
            post.get_by_role('button',name='Community Test Student',exact=True).click()
            expect(other.get_by_role('dialog')).to_be_visible()
            expect(other.get_by_text('private-contact@example.test',exact=True)).to_have_count(0)
            other.get_by_role('button',name='Close',exact=True).click()
            post.get_by_role('button',name='Linked resource',exact=False).click()
            expect(other.get_by_role('link',name='Open official source',exact=False)).to_have_attribute('href','https://career.gatech.edu/careerbuzz/')
            other.get_by_role('button',name='Close',exact=True).click()
            own=page.locator('.community-post').filter(has_text=content)
            own.get_by_role('button',name='Edit post',exact=True).click()
            page.get_by_label('Post text',exact=True).fill(content+' revised')
            page.get_by_role('button',name='Save changes',exact=True).click()
            expect(page.get_by_text(content+' revised',exact=True)).to_be_visible()
            other.get_by_role('button',name='Reload feed',exact=True).click()
            expect(other.get_by_text(content+' revised',exact=True)).to_be_visible()
            page.get_by_role('switch',name='Light theme',exact=True).click()
            expect(page.locator('.community-page')).to_have_attribute('data-theme','light')
            page.wait_for_timeout(500)  # Allow the existing theme transition to finish before capture.
            page.screenshot(path=str(ROOT/'.local/connected-community.png'))
            page.once('dialog',lambda dialog:dialog.accept())
            page.locator('.community-post').filter(has_text=content).get_by_role('button',name='Delete post',exact=True).click()
            expect(page.get_by_text('Post deleted.',exact=True)).to_be_visible()
            other.get_by_role('button',name='Reload feed',exact=True).click()
            expect(other.get_by_text(content+' revised',exact=True)).to_have_count(0)
            page.get_by_role('link',name='My Courses',exact=True).click()
            expect(page.get_by_role('heading',name='My Courses',exact=True)).to_be_visible(timeout=45000)
            page.goto(BASE+'/thermal/index.html#/community')
            expect(page).to_have_url(BASE+'/thermal/community.html',timeout=45000)
            expect(page.get_by_role('heading',name='Social Jackets',exact=True)).to_be_visible(timeout=45000)
            page.get_by_role('link',name='Resources',exact=True).click()
            expect(page.get_by_role('button',name='Find your starting point',exact=False)).to_be_visible(timeout=45000)
            assert not any('fake-api.js' in url for url in requests)
            assert not errors,errors
            print('Connected community checks passed: persistent cross-browser feed, safe retry, public profile filtering, real resource link, author edit/delete, theme, course navigation, legacy redirect, no fixtures or JS errors.')
        except Exception:
            print('JS errors:',errors)
            page.screenshot(path=str(ROOT/'.local/community-test-failure.png'))
            raise
        finally:
            context.request.delete(BASE+'/api/me')
            browser.close()


if __name__=='__main__':
    main()
