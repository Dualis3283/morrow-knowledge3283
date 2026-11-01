"""Mobile viewport, keyboard, and real touch-event integration checks."""
import json
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]


def touch_swipe(page, locator, dx, dy):
    locator.scroll_into_view_if_needed()
    box = locator.bounding_box()
    x, y = box['x'] + box['width'] / 2, box['y'] + box['height'] / 2
    session = page.context.new_cdp_session(page)
    session.send('Input.dispatchTouchEvent', {'type': 'touchStart', 'touchPoints': [{'x': x, 'y': y, 'id': 0}]})
    for step in range(1, 7):
        session.send('Input.dispatchTouchEvent', {'type': 'touchMove', 'touchPoints': [{'x': x + dx * step / 6, 'y': y + dy * step / 6, 'id': 0}]})
    session.send('Input.dispatchTouchEvent', {'type': 'touchEnd', 'touchPoints': []})
    session.detach()


with sync_playwright() as playwright:
    browser = playwright.chromium.launch(executable_path='/usr/bin/chromium', headless=True, args=['--no-sandbox'])
    page = browser.new_page(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True)
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.goto('http://127.0.0.1:4173', wait_until='domcontentloaded')
    page.wait_for_function("document.querySelector('#player-deck').options.length === 2")
    for width in [320, 390, 844]:
        page.set_viewport_size({'width': width, 'height': 844})
        assert not page.evaluate('document.documentElement.scrollWidth > innerWidth'), f'Overflow at {width}'
    page.set_viewport_size({'width': 390, 'height': 844})
    tab = page.locator('[data-tab="play"]')
    tab.focus()
    page.keyboard.press('ArrowRight')
    assert page.locator('[data-tab="decks"]').get_attribute('aria-selected') == 'true'
    page.keyboard.press('Home')
    assert page.locator('[data-tab="play"]').get_attribute('aria-selected') == 'true'
    page.locator('#start-button').click()
    page.locator('#keep-button').click()
    state = page.evaluate("JSON.parse(localStorage.getItem('morrow-deck-lab-v1')).game")
    forest = next(card for card in state['players'][0]['hand'] if card['card']['name'] == 'Forest')
    touch_swipe(page, page.locator(f'#player-hand [data-card-id="{forest["id"]}"]'), 0, -70)
    page.wait_for_function("JSON.parse(localStorage.getItem('morrow-deck-lab-v1')).game.players[0].battlefield.length === 1")
    touch_swipe(page, page.locator(f'#player-lands [data-card-id="{forest["id"]}"]'), 65, 0)
    page.wait_for_function("JSON.parse(localStorage.getItem('morrow-deck-lab-v1')).game.players[0].battlefield[0].tapped")
    page.locator(f'#player-lands [data-card-id="{forest["id"]}"]').click()
    assert page.locator('#card-dialog').is_visible()
    page.keyboard.press('Escape')
    assert not page.locator('#card-dialog').is_visible()
    for width in [320, 390, 844]:
        page.set_viewport_size({'width': width, 'height': 844})
        assert not page.evaluate('document.documentElement.scrollWidth > innerWidth'), f'Game overflow at {width}'
    assert not errors, errors
    print(json.dumps({'status': 'passed', 'viewports': [320, 390, 844], 'touch': ['swipe up plays land', 'swipe right taps permanent'], 'keyboard': ['tab arrows', 'Home', 'dialog Escape'], 'page_errors': errors}, indent=2))
    browser.close()
