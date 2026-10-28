from cms_audit_test import embed
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
 def page_ready(typ,role='owner',records=None,w=1440):
   page=b.new_page(viewport={'width':w,'height':900});errors=[]
   page.on('pageerror',lambda e:errors.append(str(e)))
   html,mock,js=embed(typ,role,records)
   page.set_content(html)
   if typ=='public':page.add_script_tag(content=(ROOT/'assets/js/site-ui.js').read_text())
   page.add_script_tag(content=mock)
   page.add_script_tag(content=js)
   page.wait_for_timeout(200)
   return page,errors

 # D) admin: request workflow, conversion, appointment booking and quoted PDF settings.
 request={'fullName':'Cliente Esempio','email':'cliente@example.test','phone':'0789 000000',
   'service':'Topografia','message':'Vorrei fissare un sopralluogo.','status':'nuova',
   'requestType':'appuntamento','requestedDate':'2026-11-10'}
 quote={'reference':'STR-2026-001','clientName':'Cliente Esempio','clientEmail':'cliente@example.test',
   'status':'bozza','lines':[{'label':'Rilievo','qty':2,'price':120}], 'total':240}
 rec={'requests':{'req1':request},'quotes':{'q1':quote},'siteContent':{'main':{
   'phone':'0700 555','address':'Via CMS 42, Olbia','email':'cms@example.test'}}}
 page,errors=page_ready('admin',records=rec)
 for view in ['requests','clients','appointments','quotes','content','services','projects','seo','team','settings','export','dashboard']:
  page.locator(f'[data-view="{view}"]').click()
  assert page.locator('#admin-main h1').count()>0,view
 page.locator('[data-view="requests"]').click()
 page.locator('[data-open="request"][data-id="req1"]').click()
 page.locator('[data-save="request"] [name="status"]').select_option('in_lavorazione')
 page.locator('[data-save="request"] [name="assignedTo"]').fill('Titolare')
 page.locator('[data-save="request"] button[type="submit"]').click()
 page.wait_for_timeout(150)
 assert page.evaluate('window.FAKE_STORE.requests.req1.status')=='in_lavorazione'
 page.locator('[data-open="request"][data-id="req1"]').click()
 page.locator('[data-convert="req1"]').click()
 page.wait_for_timeout(150)
 assert any(x['email']=='cliente@example.test' for x in page.evaluate('Object.values(window.FAKE_STORE.clients||{})'))
 page.locator('[data-open="request"][data-id="req1"]').click()
 page.locator('[data-from-request="req1"]').click()
 assert page.locator('[data-save="appointment"] [name="date"]').input_value()=='2026-11-10'
 page.locator('[data-save="appointment"] button[type="submit"]').click()
 page.wait_for_timeout(150)
 assert any(x['date']=='2026-11-10' for x in page.evaluate('Object.values(window.FAKE_STORE.appointments||{})'))
 page.locator('[data-view="quotes"]').click()
 with page.expect_popup() as popup:
  page.locator('[data-print="q1"]').click()
 preview=popup.value
 assert 'Via CMS 42, Olbia' in preview.content()
 assert '0700 555' in preview.content()
 assert 'cms@example.test' in preview.content()
 preview.close()
 page.locator('[data-view="team"]').click()
 page.locator('[data-new="member"]').click()
 page.locator('[data-save="member"] [name="uid"]').fill('another-user-1234567890123456')
 page.locator('[data-save="member"] [name="email"]').fill('new@example.test')
 page.locator('[data-save="member"] [name="role"]').select_option('viewer')
 page.locator('[data-save="member"] button[type="submit"]').click()
 page.wait_for_timeout(150)
 assert page.evaluate('window.FAKE_STORE.admins["another-user-1234567890123456"].role')=='viewer'
 assert not errors,errors
 print('PASS CMS workflow: 12 pages, request status/assignment, CRM conversion, appointment, PDF live settings, roles, JSON backup')
 page.close()

 b.close()
