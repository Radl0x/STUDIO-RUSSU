from pathlib import Path
from playwright.sync_api import sync_playwright
import re
root=Path(__file__).resolve().parents[1]
html=(root/'index.html').read_text();css=(root/'assets/css/site.css').read_text()
html=re.sub(r'<link[^>]*rel="stylesheet"[^>]*>','<style>'+css+'</style>',html)
html=re.sub(r'<script[^>]*src="[^"]*"[^>]*></script>','',html)
js=(root/'assets/js/site-data.js').read_text();js=re.sub(r'^import .*?;\s*\n','',js,flags=re.M)
defaults=(root/'assets/js/defaults.js').read_text().replace('export const','const').replace('export function','function')
js='const {initializeApp,getFirestore,collection,getDocs,doc,getDoc,addDoc,serverTimestamp}=window.FAKE;const firebaseConfig={projectId:"studio-russu"};const initOptionalAppCheck=async()=>false;\n'+defaults+'\n'+js
mock='''window.FAKE={initializeApp(){return {}},getFirestore(){return {}},collection(db,name){return {name}},doc(db,col,id){return {col,id}},getDoc:async()=>({exists:()=>false}),getDocs:async()=>({empty:true,docs:[]}),addDoc:async(ref,v)=>{window.lastSavedRequest=v;return {id:'test'}},serverTimestamp:()=>({server:true})};'''
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
 page=browser.new_page(viewport={'width':390,'height':844});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.set_content(html);page.add_script_tag(content=(root/'assets/js/site-ui.js').read_text());page.add_script_tag(content=mock);page.add_script_tag(content='(async()=>{'+js+'})().catch(e=>console.error(e))')
 page.locator('[name="fullName"]').fill('Mario Rossi')
 page.locator('[name="email"]').fill('mario@example.test')
 page.locator('[name="message"]').fill('Vorrei un rilievo per un terreno a Olbia.')
 page.locator('[name="privacy"]').check()
 page.locator('#submit-request').click();page.wait_for_timeout(300)
 print('feedback:',page.locator('#form-feedback').inner_text())
 print('saved keys:',sorted(page.evaluate('Object.keys(window.lastSavedRequest||{})')))
 print('saved values:',page.evaluate('({status:window.lastSavedRequest?.status,source:window.lastSavedRequest?.source,ack:window.lastSavedRequest?.privacyAcknowledged})'))
 print('errors:',errors)
 browser.close()
