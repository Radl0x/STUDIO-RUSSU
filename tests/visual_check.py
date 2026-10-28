from pathlib import Path
from playwright.sync_api import sync_playwright
from base64 import b64encode
root=Path(__file__).resolve().parents[1]
def html_file(kind):
 p=root/kind
 html=p.read_text()
 css=(root/('assets/css/admin.css' if kind.startswith('admin') else 'assets/css/site.css')).read_text()
 import re
 html=re.sub(r'<link[^>]*href="[^"]*fonts.googleapis.com[^>]*>', '',html)
 html=re.sub(r'<link[^>]*href="[^"]*fonts.gstatic.com[^>]*>', '',html)
 html=re.sub(r'<link[^>]*rel="stylesheet"[^>]*>', '<style>'+css+'</style>',html)
 html=re.sub(r'<script[^>]*src="[^"]*"[^>]*></script>', '',html)
 for n in ['architecture.svg','topography.svg','favicon.svg']:
  data='data:image/svg+xml;base64,'+b64encode((root/'assets/img'/n).read_bytes()).decode()
  html=html.replace('assets/img/'+n,data).replace('../assets/img/'+n,data)
 return html
with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
 for w,h in [(1440,900),(390,844),(320,700)]:
  page=browser.new_page(viewport={'width':w,'height':h},device_scale_factor=1)
  page.set_content(html_file('index.html'),wait_until='domcontentloaded')
  page.add_script_tag(content=(root/'assets/js/site-ui.js').read_text())
  page.wait_for_timeout(1000)
  page.screenshot(path=f'/mnt/data/studio_russu_public_{w}.png',full_page=True,animations='disabled')
  print('public',w,'horizontal-overflow:',page.evaluate('document.documentElement.scrollWidth>innerWidth'),'heading:',page.locator('h1').inner_text())
  if w==390:
   page.locator('#nav-toggle').click(); print('nav opens',page.locator('#primary-nav').evaluate('(e)=>e.classList.contains("open")'))
   page.locator('#primary-nav a[href="#servizi"]').click(); print('nav closes',page.locator('#primary-nav').evaluate('(e)=>!e.classList.contains("open")'))
   page.locator('[data-form-type="appuntamento"]').click();print('appointment date visible',page.locator('#date-label').is_visible())
  page.close()
 page=browser.new_page(viewport={'width':1440,'height':900})
 page.set_content(html_file('admin/index.html'),wait_until='domcontentloaded')
 page.screenshot(path='/mnt/data/studio_russu_admin_login.png')
 print('admin login screenshot created')
 page.evaluate("document.getElementById('auth-screen').hidden=true;document.getElementById('app-shell').hidden=false;document.getElementById('admin-main').innerHTML='<div class=page-heading><h1>Panoramica.</h1></div><div class=stats-grid><div class=stat><span class=stat-label>Richieste</span><strong class=stat-value>12</strong></div><div class=stat><span class=stat-label>Appuntamenti</span><strong class=stat-value>4</strong></div></div>'")
 page.screenshot(path='/mnt/data/studio_russu_admin_preview.png');page.close();browser.close()
