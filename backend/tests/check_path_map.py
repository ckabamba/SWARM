"""Browser integration against profile_server (warmpath_test only), built in API mode."""
from uuid import uuid4
from playwright.sync_api import sync_playwright, expect
from sqlalchemy import create_engine, text
from backend.manage import database_url

BASE = 'http://127.0.0.1:8001'

def main():
    engine = create_engine(database_url(test=True))
    with engine.begin() as conn:
        assert conn.scalar(text('SELECT current_database()')) == 'warmpath_test'
        conn.execute(text('DELETE FROM account_rate_limit'))
    ids = []
    try:
        with sync_playwright() as pw:
            browser = pw.chromium.launch(channel='msedge', headless=True)
            contexts = [browser.new_context(viewport={'width':1280,'height':900}) for _ in range(7)]
            for i, context in enumerate(contexts):
                response = context.request.post(BASE+'/api/auth/register', data={
                    'email':uuid4().hex+'@path-map.test','password':'test-only-password-123','name':'Map test '+str(i)})
                assert response.status == 201, response.text()
                me = response.json(); ids.append(me['person_id'])
                if i < 6:
                    def entry(title, year):
                        return dict(kind='internship',title=title,organization='Browser Path Org',school_year=year,history_confirmed=True,visible=True)
                    entries = [entry('Common activity',1)]
                    if i < 3: entries += [entry('Selective activity',2),entry('Goal role',4)]
                    response = context.request.put(BASE+'/api/me', data={'version':me['version'],'profile':{
                        **me['profile'],'kind':'alum','profile_visible':True,'experiences':entries}})
                    assert response.status == 200, response.text()
            context = contexts[-1]; page = context.new_page(); errors=[]
            page.on('pageerror', lambda e: errors.append(str(e)))
            page.goto(BASE+'/app/')
            goals = context.request.get(BASE+'/api/goals').json()['items']
            goal = next(g for g in goals if g['label']=='goal role at browser path org')
            page.get_by_label('Goal',exact=True).select_option(str(goal['id']))
            page.get_by_role('button',name='Explore path',exact=True).click()
            expect(page.locator('.live-map .node')).to_have_count(2)
            expect(page.locator('.live-map')).to_contain_text('3 of 3')
            page.locator('.live-map .node').first.click()
            expect(page.get_by_role('region',name='Matching alumni')).to_be_visible()
            expect(page.get_by_role('button',name='Send ask',exact=True)).to_have_count(3)
            page.locator('.live-map').screenshot(path='.local/path-map-desktop.png')
            page.set_viewport_size({'width':390,'height':844})
            expect(page.locator('.live-map-scroll')).to_be_visible()
            assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
            page.locator('.live-map-scroll').screenshot(path='.local/path-map-mobile.png')
            page.get_by_label('Describe your alumni goal').fill('goal role at browser path org')
            page.get_by_role('button',name='Trace the path',exact=True).click()
            expect(page.locator('.live-map .node')).to_have_count(2,timeout=30000)
            # Force deterministic edge responses; populated map above uses the real API/database.
            def reply(route):
                route.fulfill(json={'match':{'status':'ambiguous','candidates':[goal], 'fallback_reason':'test'},'path':None})
            page.route('**/api/path',reply)
            page.get_by_role('button',name='Trace the path',exact=True).click()
            expect(page.get_by_text('Several shared goals may fit.',exact=False)).to_be_visible()
            expect(page.locator('.live-map')).to_have_count(0)
            page.unroute('**/api/path',reply)
            page.route('**/api/path',lambda route: route.fulfill(json={'match':{'status':'no_match','candidates':[]},'path':None}))
            page.get_by_role('button',name='Trace the path',exact=True).click()
            expect(page.get_by_text('No shared alumni goal matches this text.',exact=False)).to_be_visible()
            page.unroute('**/api/path')
            page.route('**/api/path',lambda route: route.abort())
            page.get_by_role('button',name='Trace the path',exact=True).click()
            expect(page.get_by_role('alert')).to_be_visible()
            expect(page.locator('.live-map')).to_have_count(0)
            page.unroute('**/api/path')
            context.request.post(BASE+'/api/auth/logout')
            page.reload()
            expect(page.get_by_role('heading',name='Sign in to continue')).to_be_visible()
            assert not errors, errors
            browser.close()
        print('PASS: real path, text matching, people, desktop/mobile, ambiguity, no-match, failure, sign-out')
    finally:
        with engine.begin() as conn:
            conn.execute(text('DELETE FROM person WHERE id = ANY(:ids)'),{'ids':ids})
        engine.dispose()

if __name__ == '__main__':
    main()
