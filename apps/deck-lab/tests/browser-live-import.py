"""Live Scryfall UI check using curl's verified environment CA transport.

The workspace HTTPS proxy CA is trusted by curl but absent from Chromium's
ephemeral certificate store. Routing forwards real HTTPS requests through curl;
it neither disables certificate verification nor substitutes card fixtures.
"""
import json
import subprocess
import tempfile
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
ARTIFACTS = ROOT / 'artifacts'
ARTIFACTS.mkdir(exist_ok=True)
requests = []


def live_transport(route):
    with tempfile.TemporaryDirectory(prefix='morrow-live-') as directory:
        headers_path = Path(directory) / 'headers'
        body_path = Path(directory) / 'body'
        result = subprocess.run([
            'curl', '--silent', '--show-error', '--location', '--connect-timeout', '8', '--max-time', '15',
            '--header', 'Accept: application/json,image/*;q=0.8',
            '--dump-header', str(headers_path), '--output', str(body_path), '--write-out', '%{http_code}',
            route.request.url,
        ], capture_output=True, timeout=20)
        if result.returncode:
            route.abort()
            raise RuntimeError(result.stderr.decode('utf-8', errors='replace'))
        status = int(result.stdout.decode())
        headers = {}
        for line in headers_path.read_text().splitlines():
            if line.startswith('HTTP/'):
                headers = {}
            elif ':' in line:
                key, value = line.split(':', 1)
                if key.lower() not in {'transfer-encoding', 'content-length', 'connection'}:
                    headers[key.strip()] = value.strip()
        requests.append({'url': route.request.url, 'status': status})
        route.fulfill(status=status, headers=headers, body=body_path.read_bytes())


with sync_playwright() as playwright:
    browser = playwright.chromium.launch(executable_path='/usr/bin/chromium', headless=True, args=['--no-sandbox'])
    page = browser.new_page(viewport={'width': 390, 'height': 844})
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.route('https://api.scryfall.com/**', live_transport)
    page.route('https://cards.scryfall.io/**', live_transport)
    page.goto('http://127.0.0.1:4173', wait_until='domcontentloaded')
    page.locator('[data-tab="decks"]').click()
    page.locator('#deck-name').fill('Live import verification')
    page.locator('#deck-text').fill('8 Forest\n2 Grizzly Bears\n1 Delver of Secrets // Insectile Aberration\n1 Morrow intentionally nonexistent card 928374')
    page.locator('#resolve-deck-button').click()
    page.wait_for_function("!document.querySelector('#resolve-deck-button').disabled", timeout=90000)
    assert page.locator('#import-errors li').count() == 1
    assert '11 resolved cards only' in page.locator('#save-deck-button').inner_text()
    page.locator('#save-deck-button').click()
    data = page.evaluate("JSON.parse(localStorage.getItem('morrow-deck-lab-v1'))")
    deck = data['decks'][0]
    assert len(deck['entries']) == 3
    assert sum(entry['quantity'] for entry in deck['entries']) == 11
    assert len(deck.get('importErrors', [])) == 1
    page.locator('#preview-cards').scroll_into_view_if_needed()
    page.wait_for_function("[...document.querySelectorAll('#preview-cards img')].some(image => image.complete && image.naturalWidth > 0)", timeout=30000)
    page.screenshot(path=str(ARTIFACTS / 'phone-decks.png'), full_page=True)
    dfc = next(entry for entry in deck['entries'] if entry['card']['name'].startswith('Delver'))
    page.locator(f'#preview-cards [data-card-id="{dfc["card"]["id"]}"]').click()
    page.wait_for_function("document.querySelector('#card-dialog img')?.naturalWidth > 0", timeout=30000)
    page.get_by_role('button', name='View other face', exact=True).click()
    page.wait_for_function("document.querySelector('#card-dialog h2')?.textContent === 'Insectile Aberration' && document.querySelector('#card-dialog img')?.naturalWidth > 0", timeout=30000)
    page.screenshot(path=str(ARTIFACTS / 'phone-card.png'))
    page.locator('#card-dialog .close-dialog').click()
    page.locator('[data-tab="play"]').click()
    page.locator('#player-deck').select_option('sample-0')
    page.locator('#start-button').click()
    page.locator('#keep-button').click()
    page.wait_for_function("[...document.querySelectorAll('#player-hand img')].some(image => image.complete && image.naturalWidth > 0)", timeout=30000)
    page.screenshot(path=str(ARTIFACTS / 'phone-playmat.png'), full_page=True)
    assert not errors, errors
    print(json.dumps({'status': 'passed', 'resolved_cards': 11, 'unresolved_lines': 1, 'double_faced_image': True, 'live_requests': len(requests), 'page_errors': errors}, indent=2))
    browser.close()
