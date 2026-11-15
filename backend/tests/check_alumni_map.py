"""Local synthetic demo browser check; no account/profile writes."""
import json
from playwright.sync_api import sync_playwright, expect
from backend.manage import ROOT


def main():
    credentials = json.loads((ROOT / '.local/alumni-demo-login.json').read_text())
    base = 'http://127.0.0.1:8000'
    with sync_playwright() as pw:
        browser = pw.chromium.launch(channel='msedge',headless=True)
        context = browser.new_context(viewport={'width':1440,'height':960},reduced_motion='reduce')
        login = context.request.post(base+'/api/auth/login',data={k:credentials[k] for k in ('email','password')})
        assert login.status == 200,login.text()
        assert login.json()['profile']['kind']=='alum'
        page = context.new_page(); errors=[]
        page.on('pageerror',lambda e:errors.append(str(e)))
        page.goto(base+'/app/')
        page.get_by_role('button',name='Find fellow alumni',exact=False).click()
        page.locator('#goal').fill('Google')
        page.get_by_role('button',name='Find alumni',exact=True).click()
        expect(page.locator('.peer-node')).to_have_count(3)
        expect(page.locator('.peer-tie')).to_have_count(3)
        expect(page.locator('.map')).to_contain_text('Synthetic demo')
        expect(page.locator('.goal')).to_have_css('opacity','0')
        expect(page.locator('.peer-node').first).to_have_css('opacity','1')
        page.screenshot(path=str(ROOT / '.local/alumni-map-desktop.jpg'),quality=65)
        page.locator('.peer-node').first.click()
        panel = page.locator('aside[aria-label="Alumni connection"]')
        expect(panel).to_contain_text('What you have in common')
        expect(panel.locator('a').first).to_have_attribute('href',__import__('re').compile('https://'))
        expect(panel).to_contain_text('cannot receive real asks')
        page.keyboard.press('Escape')
        expect(panel).to_have_attribute('aria-hidden','true')
        page.set_viewport_size({'width':390,'height':844})
        expect(page.locator('.peer-node')).to_have_count(3)
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
        page.screenshot(path=str(ROOT / '.local/alumni-map-mobile.jpg'),quality=65)
        page.locator('.peer-node').first.click()
        expect(panel).to_have_attribute('aria-hidden','false')
        panel.get_by_role('button',name='Close',exact=True).click()
        page.get_by_role('button',name='Find other alumni',exact=True).click()
        page.locator('#goal').fill('NoSuchCompanyxyz')
        page.get_by_role('button',name='Find alumni',exact=True).click()
        expect(page.get_by_role('alert')).to_contain_text('No public alumni match')
        page.locator('#goal').fill('')
        page.get_by_role('button',name='Find alumni',exact=True).click()
        expect(page.locator('.peer-node')).to_have_count(3)
        page.get_by_role('button',name='Find other alumni',exact=True).click()
        page.route('**/api/alumni-connections*',lambda route:route.abort())
        page.get_by_role('button',name='Find alumni',exact=True).click()
        expect(page.get_by_role('alert')).to_be_visible()
        page.unroute('**/api/alumni-connections*')
        assert not errors,errors
        context.request.post(base+'/api/auth/logout')
        browser.close()
    print('PASS: alumni demo login, shared course map, desktop/mobile, drawer, no-match, browse, network failure')


if __name__ == '__main__':
    main()
