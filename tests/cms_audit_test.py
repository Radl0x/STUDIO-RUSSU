"""UI integration regression checks with an in-memory Firestore/Auth simulator.
No network or real user data are accessed. Not an Emulator Rules test.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
import json, re
ROOT=Path(__file__).resolve().parents[1]

def embed(page_type, role='owner', records=None):
    html=(ROOT/('admin/index.html' if page_type=='admin' else 'index.html')).read_text()
    css=(ROOT/('assets/css/admin.css' if page_type=='admin' else 'assets/css/site.css')).read_text()
    html=re.sub(r'<link[^>]*href="[^\"]*fonts.googleapis.com[^>]*>','',html)
    html=re.sub(r'<link[^>]*rel="stylesheet"[^>]*>','<style>'+css+'</style>',html)
    html=re.sub(r'<script[^>]*>.*?</script>','',html,flags=re.S)
    data={k:v for k,v in (records or {}).items()}
    js_mock=r'''(()=>{
      const docs=JSON.parse(JSON.stringify(__DATA__));window.FAKE_STORE=docs;
      window.FAKE={
        initializeApp(){return {}},getAuth(){return {}},getFirestore(){return {}},
        onAuthStateChanged(a,cb){setTimeout(()=>cb({uid:'owner-123456789012345678901',email:'owner@example.test'}),15);return ()=>{}},
        signInWithEmailAndPassword:async()=>({}),signOut:async()=>{},
        doc(db,col,id){return {col,id}},collection(db,col){return {col}},
        getDoc:async function(ref){if(ref.col==='admins'&&ref.id==='owner-123456789012345678901')return {exists:()=>true,data:()=>({role:'__ROLE__',active:true,email:'owner@example.test'})};const value=docs[ref.col]?.[ref.id];return {exists:()=>!!value,data:()=>value}},
        getDocs:async ref=>({empty:!Object.keys(docs[ref.col]||{}).length,docs:Object.entries(docs[ref.col]||{}).map(([id,v])=>({id,data:()=>v}))}),
        onSnapshot(ref,callback){callback({docs:Object.entries(docs[ref.col]||{}).map(([id,v])=>({id,data:()=>v}))});return ()=>{}},
        addDoc:async(ref,data)=>{const id='new-'+Object.keys(docs[ref.col]||{}).length;docs[ref.col]??={};docs[ref.col][id]=data;return {id}},
        setDoc:async (ref,data,opts)=>{docs[ref.col]??={};docs[ref.col][ref.id]=opts?.merge?{...(docs[ref.col][ref.id]||{}),...data}:data},
        updateDoc:async(ref,data)=>{if(!docs[ref.col]?.[ref.id])throw Error('not found');Object.assign(docs[ref.col][ref.id],data)},
        deleteDoc:async(ref)=>{delete docs[ref.col]?.[ref.id]},
        serverTimestamp:()=>({toDate:()=>new Date()}),
        writeBatch:db=>{const actions=[];return {set(ref,value,opts){actions.push([ref,value,opts])},async commit(){for(const [ref,value,opts] of actions){docs[ref.col]??={};docs[ref.col][ref.id]=opts?.merge?{...(docs[ref.col][ref.id]||{}),...value}:value}}}},
        Timestamp:class {constructor(seconds,nanoseconds){this.seconds=seconds;this.nanoseconds=nanoseconds}static fromDate(date){return new this(Math.floor(date.getTime()/1000),0)}}
      };
    })();'''.replace('__DATA__',json.dumps(data,ensure_ascii=False)).replace('__ROLE__',role)
    defaults=(ROOT/'assets/js/defaults.js').read_text().replace('export const','const').replace('export function','function')
    if page_type=='admin':
        js=(ROOT/'assets/js/admin.js').read_text()
        js=re.sub(r'^import .*?;\s*\n','',js,flags=re.M)
        js='const {initializeApp,getAuth,onAuthStateChanged,signInWithEmailAndPassword,signOut,getFirestore,doc,getDoc,getDocs,collection,addDoc,setDoc,updateDoc,deleteDoc,onSnapshot,serverTimestamp,writeBatch,Timestamp}=window.FAKE;const firebaseConfig={projectId:"studio-russu"};const initOptionalAppCheck=async()=>false;\n'+defaults+'\n'+js
    else:
        js=(ROOT/'assets/js/site-data.js').read_text()
        js=re.sub(r'^import .*?;\s*\n','',js,flags=re.M)
        js='const {initializeApp,getFirestore,collection,getDocs,doc,getDoc,addDoc,serverTimestamp}=window.FAKE;const firebaseConfig={projectId:"studio-russu"};const initOptionalAppCheck=async()=>false;\n'+defaults+'\n'+js
    return html,js_mock,'(async()=>{'+js+'})().catch(e=>console.error(e))'


def main():
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

  # A) public: actual CMS content and service select must all display.
  content={'heroTitle':'Prima riga\nSeconda riga','heroSubtitle':'Sottotitolo di test',
    'studioHeading':'Studio aggiornato','servicesHeading':'Servizi aggiornati',
    'servicesIntro':'Nuova introduzione','methodHeading':'Metodo aggiornato',
    'contactHeading':'Contatti aggiornati','contactDescription':'Descrizione aggiornata',
    'aboutLead':'Lead nuovo','aboutBody':'Body nuovo','phone':'123 444 555',
    'phoneAlt':'333 888 444','email':'test@example.test','address':'Via Test 52, Olbia',
    'seoTitle':'SEO Nuovo','seoDescription':'Descrizione meta nuova'}
  publicdata={'siteContent':{'main':content},'services':{'drone':{'archived':True},'custom':{'title':'Rilievo specialistico','description':'Descrizione custom','order':2,'tags':['X'], 'icon':'X'}}}
  page,errors=page_ready('public',records=publicdata,w=390)
  assert page.locator('#hero-heading em').inner_text()=='Seconda riga'
  assert page.locator('#hero-subtitle').inner_text()=='Sottotitolo di test'
  for id,expected in [('studio-heading','Studio aggiornato'),('services-heading','Servizi aggiornati'),('services-intro','Nuova introduzione'),('method-heading','Metodo aggiornato'),('contact-heading','Contatti aggiornati'),('about-lead','Lead nuovo'),('about-body','Body nuovo'),('contact-description','Descrizione aggiornata'),('footer-phone','123 444 555'),('footer-mobile','333 888 444'),('footer-email','test@example.test'),('footer-address','Via Test 52, Olbia')]:
   assert page.locator('#'+id).inner_text().strip()==expected, (id,page.locator('#'+id).inner_text())
  options=page.locator('#service-select option').all_inner_texts()
  assert 'Rilievo specialistico' in options and 'Rilievi con drone' not in options, options
  assert page.title()=='SEO Nuovo'
  assert page.locator('meta[name="description"]').get_attribute('content')=='Descrizione meta nuova'
  assert not errors, errors
  print('PASS public: 13 text/contact/SEO bindings, service deletion and new service dropdown, mobile, zero JS errors')
  page.close()

  # B) admin: defaults persisted service archive on delete, with content and CRUD.
  page,errors=page_ready('admin',records={'services':{'drone':{'title':'Rilievi con drone','order':1,'description':'Drone','tags':[]}}})
  assert page.locator('#app-shell').is_visible()
  page.locator('[data-view="services"]').click()
  page.locator('[data-open="service"][data-id="drone"]').click()
  page.on('dialog',lambda d:d.accept())
  page.locator('[data-delete="services"]').click()
  page.wait_for_timeout(200)
  result=page.evaluate('window.FAKE_STORE.services.drone.archived')
  assert result is True,result
  assert page.locator('[data-open="service"][data-id="drone"]').count()==0
  page.locator('[data-view="content"]').click()
  assert page.locator('[name="projectsHeading"]').count()==0
  page.locator('[name="heroTitlePrimary"]').fill('Titolo nuovo')
  page.locator('[name="heroTitleAccent"]').fill('Evidenziato')
  assert page.locator('[data-heading-preview="heroTitle"] em').inner_text()=='Evidenziato'
  page.locator('#content-form [type="submit"]').click()
  page.wait_for_timeout(150)
  assert page.evaluate('window.FAKE_STORE.siteContent.main.heroTitle')=='Titolo nuovo Evidenziato'
  assert page.evaluate('window.FAKE_STORE.siteContent.main.heroTitleAccent')=='Evidenziato'
  page.locator('[data-view="settings"]').click()
  page.locator('[name="phoneAlt"]').fill('333222111')
  page.locator('#settings-form [type="submit"]').click()
  page.wait_for_timeout(150)
  assert page.evaluate('window.FAKE_STORE.siteContent.main.phoneAlt')=='333222111'
  assert not errors,errors
  print('PASS CMS owner: archive built-in service, no obsolete projectsHeading, content/settings persisted, zero JS errors')
  page.close()

  # C) viewer readonly modal and editor shouldn't pretend access to private CRM.
  page,errors=page_ready('admin',role='viewer',records={'clients':{'a':{'name':'Mario','email':'a@b.test'}},'services':{'other':{'title':'X'}}})
  page.locator('[data-view="clients"]').click()
  page.locator('[data-open="client"]').click()
  assert page.locator('#modal-content [name="name"]').is_disabled()
  assert page.locator('#modal-content button[type="submit"]').is_hidden()
  assert not errors,errors
  print('PASS CMS viewer: CRM is readable but its fields and save controls are read-only')
  page.close()
  page,errors=page_ready('admin',role='editor',records={'services':{'other':{'title':'X'}},'projects':{'p1':{'title':'Progetto privato'}}})
  assert page.locator('[data-view="clients"]').evaluate('(e)=>getComputedStyle(e).display')=='none'
  assert page.locator('#admin-main').inner_text().find('Progetti in archivio')!=-1
  assert not errors,errors
  print('PASS CMS editor: no misleading CRM dashboard/navigation, only permitted collections loaded')
  page.close()

  b.close()

if __name__=='__main__':main()
