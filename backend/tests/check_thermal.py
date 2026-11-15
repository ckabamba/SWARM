"""Browser smoke test against the running local API; isolated browser contexts."""
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[2]


def main():
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(channel='msedge', headless=True)
        context = browser.new_context(viewport={'width':1440, 'height':1000}, reduced_motion='reduce')
        page = context.new_page()
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.goto('http://127.0.0.1:8000/thermal/')
        expect(page.get_by_role('button', name='Find your starting point')).to_be_visible(timeout=45000)
        page.get_by_role('button', name='Find your starting point').click()
        page.get_by_role('button', name='Explore robotics research', exact=False).click()
        expect(page.get_by_role('button', name='Explore LIDAR Robotics VIP Projects')).to_be_visible()
        page.get_by_role('button', name='Explore LIDAR Robotics VIP Projects').click()
        page.get_by_role('button', name='Save resource', exact=True).click()
        expect(page.get_by_text('Saved to your private browser workspace.', exact=True)).to_be_visible()
        page.get_by_role('button', name='Close', exact=True).click()
        page.screenshot(path=str(ROOT / '.local' / 'thermal-connected.png'))
        page.reload()
        page.get_by_role('button', name='Saved', exact=True).click()
        expect(page.get_by_role('button', name='LIDAR Robotics VIP Projects', exact=False)).to_be_visible()
        page.get_by_role('button', name='LIDAR Robotics VIP Projects', exact=False).click()
        page.get_by_role('button', name='Remove from saved', exact=True).click()
        expect(page.get_by_text('Nothing saved yet', exact=True)).to_be_visible()
        other = browser.new_context(viewport={'width':1440,'height':1000})
        other_page = other.new_page()
        other_page.goto('http://127.0.0.1:8000/thermal/')
        other_page.get_by_role('button', name='Saved', exact=True).click()
        expect(other_page.get_by_text('Nothing saved yet', exact=True)).to_be_visible()
        other.close()
        page.get_by_role('button', name='Events', exact=True).click()
        expect(page.locator('.events-panel article').first).to_be_visible()
        page.screenshot(path=str(ROOT / '.local' / 'thermal-events.png'))
        page.get_by_role('button', name='Close', exact=True).click()
        page.get_by_role('button', name='Change goal', exact=True).first.click()
        page.get_by_label('What would you like to explore at Georgia Tech?').fill('zzzzunmatched999')
        page.get_by_role('button', name='Find resources', exact=True).click()
        expect(page.get_by_text('No matching resources yet', exact=True)).to_be_visible()
        page.route('**/api/path', lambda route: route.abort())
        page.get_by_role('button', name='Change goal', exact=True).first.click()
        page.get_by_label('What would you like to explore at Georgia Tech?').fill('Launch a startup')
        page.get_by_role('button', name='Find resources', exact=True).click()
        expect(page.get_by_role('alert').first).to_be_visible()
        page.unroute('**/api/path')
        page.get_by_role('button', name='Find resources', exact=True).click()
        expect(page.get_by_role('button', name='Explore CREATE-X Startup Lab')).to_be_visible()
        page.get_by_role('button', name='Change goal', exact=True).first.click()
        page.get_by_label('Or match courses and VIP projects to a public job example').select_option('nvidia-jr2023495')
        page.get_by_role('button', name='Match topics', exact=True).click()
        expect(page.get_by_text('Description-based topic matches', exact=False)).to_be_visible()
        page.get_by_role('button', name='Explore CS 1332', exact=False).click()
        expect(page.get_by_role('heading', name='Related job topics')).to_be_visible()
        expect(page.get_by_text('Shared topics:', exact=False).first).to_be_visible()
        page.screenshot(path=str(ROOT / '.local' / 'thermal-job-match.png'))
        assert not errors, errors
        browser.close()
        print('Thermal browser checks passed: search, save/reload, isolation, events, no-match, failed request, retry, course/job matching; no JS errors.')


if __name__ == '__main__':
    main()
