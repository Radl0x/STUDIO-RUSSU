from pathlib import Path
from playwright.sync_api import sync_playwright
import re
root=Path(__file__).resolve().parents[1]
html=(root/'admin/index.html').read_text()
css=(root/'assets/css/admin.css').read_text()
html=re.sub(r'<link[^>]*href="[^"]*fonts.googleapis.com[^>]*>','',html)
html=re.sub(r'<link[^>]*rel="stylesheet"[^>]*>','<style>'+css+'</style>',html)
html=re.sub(r'<script[^>]*src="[^"]*"[^>]*></script>','',html)
mock='''
window.FAKE={
 initializeApp(){return {}},getAuth(){return {}},getFirestore(){return {}},
 onAuthStateChanged(auth,cb){setTimeout(()=>cb({uid:'uid-owner-123456789012345',email:'owner@example.test'}),20);return ()=>{}},
 signInWithEmailAndPassword:async()=>({}),signOut:async()=>{},
 doc(db,col,id){return {col,id}},collection(db,col){return {col}},
 getDoc:async function(ref){if(ref.col==='admins')return {exists:()=>true,data:()=>({role:'owner',active:true,email:'owner@example.test'})};return {exists:()=>false,data:()=>null}},
 getDocs:async ref=>({docs:[]}),
 onSnapshot(ref,cb){cb({docs:[]});return ()=>{}},
 addDoc:async()=>({id:'mock-id'}),setDoc:async()=>{},updateDoc:async()=>{},deleteDoc:async()=>{},
 serverTimestamp:()=>({toDate:()=>new Date()})
};'''
defaults=(root/'assets/js/defaults.js').read_text().replace('export const','const').replace('export function','function')
js=(root/'assets/js/admin.js').read_text();js=re.sub(r'^import .*?;\s*\n','',js,flags=re.M)
js='const {initializeApp,getAuth,onAuthStateChanged,signInWithEmailAndPassword,signOut,getFirestore,doc,getDoc,getDocs,collection,addDoc,setDoc,updateDoc,deleteDoc,onSnapshot,serverTimestamp}=window.FAKE;const firebaseConfig={projectId:"studio-russu"};const initOptionalAppCheck=async()=>false;\n'+defaults+'\n'+js
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
 for w,h in [(1440,900),(390,844)]:
  page=b.new_page(viewport={'width':w,'height':h});errs=[];page.on('pageerror',lambda e:errs.append(str(e)))
  page.set_content(html)
  page.add_script_tag(content=mock)
  page.add_script_tag(content='(async()=>{'+js+'})().catch(e=>console.error(e))')
  page.wait_for_timeout(500)
  print('mock',w,'shell',page.locator('#app-shell').is_visible(),'main:',page.locator('#admin-main h1').first.inner_text() if page.locator('#admin-main h1').count() else 'none','errors',errs[:4])
  page.screenshot(path=f'/mnt/data/studio_russu_admin_dashboard_{w}.png')
  if w==1440:
   page.locator('[data-view="clients"]').click()
   page.locator('[data-new="client"]').click()
   print('client modal',page.locator('#modal-heading').inner_text())
   page.locator('[name="name"]').fill('Cliente Test')
   page.locator('[data-save="client"] button[type="submit"]').click()
   page.wait_for_timeout(200)
   print('client saved toast',page.locator('.toast').last.inner_text() if page.locator('.toast').count() else 'none')
   page.locator('[data-view="content"]').click()
   page.screenshot(path='/mnt/data/studio_russu_admin_content.png')
   page.locator('[data-view="quotes"]').click()
   page.locator('[data-new="quote"]').click()
   page.locator('[name="clientName"]').fill('Cliente Test')
   page.locator('[name="lineLabel"]').fill('Rilievo topografico')
   page.locator('[name="linePrice"]').fill('320')
   print('quote total',page.locator('#quote-total').inner_text())
   page.locator('[data-save="quote"] button[type="submit"]').click()
   page.wait_for_timeout(200)
   print('quote saved',page.locator('.toast').last.inner_text())
  else:
   page.locator('#sidebar-toggle').click()
   print('sidebar mobile',page.locator('#sidebar').evaluate('(e)=>e.classList.contains("open")'))
  print('end errors',errs[:5]);page.close()
 b.close()
