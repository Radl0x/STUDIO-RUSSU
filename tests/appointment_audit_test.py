from cms_audit_test import embed
from playwright.sync_api import sync_playwright
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
 page=b.new_page(viewport={'width':390,'height':844});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 html,mock,js=embed('public')
 page.set_content(html);page.add_script_tag(content=(ROOT/'assets/js/site-ui.js').read_text());page.add_script_tag(content=mock);page.add_script_tag(content=js)
 page.locator('[data-form-type="appuntamento"]').click()
 page.locator('[name="fullName"]').fill('Cliente appuntamento')
 page.locator('[name="email"]').fill('app@example.test')
 page.locator('[name="message"]').fill('Richiedo un appuntamento per consulenza edilizia.')
 page.locator('[name="requestedDate"]').fill('2026-11-10')
 page.locator('[name="privacy"]').check()
 page.locator('#submit-request').click();page.wait_for_timeout(150)
 rec=page.evaluate('Object.values(window.FAKE_STORE.requests||{})[0]')
 assert rec['requestType']=='appuntamento' and rec['requestedDate']=='2026-11-10'
 assert page.locator('#form-feedback').inner_text().startswith('La tua richiesta')
 assert not errors,errors
 print('PASS public appointment: requestType, date, consent, Firestore payload')
 page.close();b.close()
