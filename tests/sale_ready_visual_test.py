from pathlib import Path
from playwright.sync_api import sync_playwright
import re
p=Path(__file__).resolve().parents[1]
html=(p/'index.html').read_text();css=(p/'assets/css/site.css').read_text()
html=re.sub(r'<link[^>]*href="[^"]*fonts.googleapis.com[^>]*>','',html)
html=re.sub(r'<link[^>]*rel="stylesheet"[^>]*>','<style>'+css+'</style>',html)
html=re.sub(r'<script[^>]*>.*?</script>','',html,flags=re.S)
with sync_playwright() as w:
 b=w.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
 for width,height in [(390,844),(1440,900)]:
  page=b.new_page(viewport={'width':width,'height':height})
  page.set_content(html,wait_until='domcontentloaded')
  page.evaluate('''() => { const loader=document.querySelector('#page-loader'); if(loader)loader.style.display='none'; window.scrollTo(0,document.documentElement.scrollHeight) }''')
  page.wait_for_timeout(130)
  assert page.locator('#legal-vat').inner_text()=='00000000000'
  assert page.locator('footer a[href="cookie.html"]').count()==1
  assert page.locator('.skip-to-content').count()==1
  assert page.evaluate('document.documentElement.scrollWidth <= innerWidth+2')
  page.locator('footer').screenshot(path=f'/mnt/data/Studio_Russu_Vendita_Footer_{width}.png',timeout=6000)
  print('PASS visual footer legal placeholder, privacy links, no horizontal overflow:',width)
  page.close()
 b.close()
