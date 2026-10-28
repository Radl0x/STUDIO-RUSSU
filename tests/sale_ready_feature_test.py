"""Integration smoke tests for Spark-only updates; in-memory Firestore simulation only."""
from pathlib import Path
import json
from playwright.sync_api import sync_playwright
from cms_audit_test import embed
ROOT=Path(__file__).resolve().parents[1]
with sync_playwright() as p:
    b=p.chromium.launch(headless=True, executable_path='/usr/bin/chromium', args=['--no-sandbox','--disable-dev-shm-usage'])
    page=b.new_page(viewport={'width':390,'height':844},accept_downloads=True)
    errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    html,mock,js=embed('admin',records={'siteContent':{'main':{'seoTitle':'SEO originale','vatNumber':'00000000000'}}})
    page.set_content(html,wait_until='domcontentloaded')
    page.add_script_tag(content=mock)
    page.add_script_tag(content=js)
    page.wait_for_timeout(250)
    assert page.locator('#app-shell').is_visible(), errors
    page.locator('#sidebar-toggle').click()
    page.locator('[data-view="settings"]').click()
    assert page.locator('[name=vatNumber]').input_value()=='00000000000'
    page.locator('[name=vatNumber]').fill('12345678903')
    page.locator('[name=professionalName]').fill('Geom. Nome TEST')
    page.locator('#settings-form [type=submit]').click()
    page.wait_for_timeout(160)
    stored=page.evaluate('window.FAKE_STORE.siteContent.main')
    assert stored['vatNumber']=='12345678903' and stored['professionalName']=='Geom. Nome TEST',stored
    print('PASS CMS legal fields in Settings and Firestore mock')
    page.locator('#sidebar-toggle').click()
    page.locator('[data-view="seo"]').click()
    page.locator('[name=seoTitle]').fill('Studio SEO pagina pubblica')
    page.locator('[name=seoDescription]').fill('Descrizione tecnica aggiornata')
    page.locator('#seo-form [type=submit]').click()
    page.wait_for_timeout(150)
    src=(ROOT/'index.html').read_text()
    page.evaluate('s=>window.fetch=async()=>({ok:true,text:async()=>s})',src)
    with page.expect_download(timeout=9000) as download_info:
        page.locator('[data-export="seo-html"]').click()
    d=download_info.value
    rendered=Path(d.path()).read_text()
    assert 'Studio SEO pagina pubblica' in rendered
    assert 'Descrizione tecnica aggiornata' in rendered
    assert 'data-drone-chapter' in rendered
    assert d.suggested_filename=='index-seo-da-pubblicare.html'
    print('PASS SEO static HTML export, untouched Drone Lab markup')
    page.locator('#sidebar-toggle').click()
    page.locator('[data-view="export"]').click()
    with page.expect_download(timeout=8000) as download_info:
        page.locator('[data-export="json"]').click()
    exported=Path(download_info.value.path()).read_text()
    data=json.loads(exported)
    assert data['firebaseProject']=='studio-russu'
    assert 'admins' in data['collections']
    test_backup={'firebaseProject':'studio-russu','collections':{k:[] for k in ('requests','clients','appointments','quotes','services','projects')},'siteContent':{'heroSubtitle':'Ripristinato dal backup'}}
    test_backup['collections']['services']=[{'id':'speciale','title':'Servizio di prova','order':7,'tags':[]}]
    path=ROOT/'tests'/'temp_restore_sample.json';path.write_text(json.dumps(test_backup))
    page.locator('#backup-restore-file').set_input_files(str(path))
    page.wait_for_timeout(130)
    assert 'Backup valido' in page.locator('#backup-restore-preview').inner_text(),page.locator('#backup-restore-preview').inner_text()
    page.once('dialog',lambda dialog:dialog.accept('RIPRISTINA'))
    page.locator('#backup-restore-run').click()
    page.wait_for_timeout(180)
    assert page.evaluate('window.FAKE_STORE.services.speciale.title')=='Servizio di prova'
    assert page.evaluate('window.FAKE_STORE.siteContent.main.heroSubtitle')=='Ripristinato dal backup'
    path.unlink()
    print('PASS JSON backup export + validation + owner-only non-destructive restore')
    assert not errors,errors
    page.close();b.close()
print('PASS no JS errors in tested flows')
