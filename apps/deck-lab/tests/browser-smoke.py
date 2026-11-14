"""Browser integration checks. Run against `npm start` with Python Playwright installed."""
import json
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
ARTIFACTS = ROOT / 'artifacts'
ARTIFACTS.mkdir(exist_ok=True)
STORE = 'morrow-deck-lab-v1'


def saved(page):
    return page.evaluate("key => JSON.parse(localStorage.getItem(key))", STORE)


def play_hand(page, card):
    page.locator(f'#player-hand [data-card-id="{card["id"]}"]').click()
    page.locator('#card-dialog').get_by_role('button', name='Play land' if 'Land' in card['card']['type_line'] else 'Play card', exact=True).click()


with sync_playwright() as playwright:
    browser = playwright.chromium.launch(executable_path='/usr/bin/chromium', headless=True, args=['--no-sandbox'])
    page = browser.new_page(viewport={'width': 1440, 'height': 1000})
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.goto('http://127.0.0.1:4173', wait_until='domcontentloaded')
    page.wait_for_function("document.querySelector('#player-deck').options.length === 2")
    page.locator('#start-button').click()
    assert page.locator('#hand-count').inner_text() == '7'
    page.locator('#mulligan-button').click()
    assert page.locator('#keep-button').is_disabled()
    page.locator('#player-hand .card-tile').first.click()
    page.locator('#keep-button').click()
    assert page.locator('#hand-count').inner_text() == '6'
    assert saved(page)['game']['players'][0]['kept']

    hand = saved(page)['game']['players'][0]['hand']
    forest = next(card for card in hand if card['card']['name'] == 'Forest')
    play_hand(page, forest)
    assert len(saved(page)['game']['players'][0]['battlefield']) == 1
    second = next(card for card in saved(page)['game']['players'][0]['hand'] if card['card']['name'] == 'Forest')
    play_hand(page, second)
    assert len(saved(page)['game']['players'][0]['battlefield']) == 1
    assert 'one land' in page.locator('#toast').inner_text().lower()
    page.locator('#card-dialog .close-dialog').click()

    page.get_by_role('button', name='Decrease your life', exact=True).click()
    assert page.locator('#player-life').inner_text() == '39'
    page.locator('#coin-button').click()
    assert saved(page)['game']['lastRandom']['kind'] == 'coin'
    page.locator('#die-sides').select_option('20')
    page.locator('#die-button').click()
    roll = saved(page)['game']['lastRandom']
    assert roll['kind'] == 'die' and 1 <= roll['result'] <= 20

    page.locator('#end-turn-button').click()
    assert saved(page)['game']['round'] == 2
    hand = saved(page)['game']['players'][0]['hand']
    play_hand(page, next(card for card in hand if card['card']['name'] == 'Forest'))
    bear = next(card for card in saved(page)['game']['players'][0]['hand'] if card['card']['name'] == 'Grizzly Bears')
    play_hand(page, bear)
    assert page.locator('#stack-count').inner_text() == '1'
    assert not any(card['id'] == bear['id'] for card in saved(page)['game']['players'][0]['battlefield'])
    page.locator('#resolve-button').click()
    assert page.locator('#stack-count').inner_text() == '0'
    assert any(card['id'] == bear['id'] for card in saved(page)['game']['players'][0]['battlefield'])
    page.locator(f'#player-field [data-card-id="{bear["id"]}"]').click()
    page.get_by_role('button', name='Attack with creature', exact=True).click()
    assert 'summoning sickness' in page.locator('#toast').inner_text()
    page.locator('#card-dialog .close-dialog').click()
    page.locator('#end-turn-button').click()
    page.locator(f'#player-field [data-card-id="{bear["id"]}"]').click()
    page.get_by_role('button', name='Attack with creature', exact=True).click()
    page.locator('#combat-button').click()
    page.locator('#confirm-combat').click()
    assert saved(page)['game']['combatDone']
    assert saved(page)['game']['players'][1]['life'] <= 38

    game_before_reload = saved(page)['game']
    page.reload(wait_until='domcontentloaded')
    page.locator('#resume-button').click()
    assert saved(page)['game'] == game_before_reload
    page.screenshot(path=str(ARTIFACTS / 'desktop-playmat.png'), full_page=True)

    page.locator('[data-tab="results"]').click()
    page.locator('#test-rounds').select_option('8')
    page.locator('#run-test-button').click()
    page.wait_for_function("!document.querySelector('#results-content').hidden")
    first_report = saved(page)['report']
    assert first_report['summary']['runs'] == 100
    assert len(first_report['rounds']) == 8
    page.locator('#run-test-button').click()
    page.wait_for_function("!document.querySelector('#run-test-button').disabled")
    second_report = saved(page)['report']
    assert first_report['summary'] == second_report['summary']
    assert first_report['rounds'] == second_report['rounds']
    page.screenshot(path=str(ARTIFACTS / 'desktop-results.png'), full_page=True)
    assert not errors, errors
    print(json.dumps({'status': 'passed', 'workflow': 'mulligan, land limit, stack, sickness, combat, life, coin, die, resume, 100-run deterministic results', 'summary': first_report['summary'], 'page_errors': errors}, indent=2))
    browser.close()
