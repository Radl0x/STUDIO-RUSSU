"""Typography upgrade integration regression. Uses in-memory Firebase mock; no real data."""
from cms_audit_test import embed
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser=p.chromium.launch(headless=True, executable_path='/usr/bin/chromium', args=['--no-sandbox','--disable-dev-shm-usage'])
    for width in (390, 1440):
        page=browser.new_page(viewport={'width':width,'height':900})
        errors=[]
        page.on('pageerror', lambda err:errors.append(str(err)))
        html,mock,js=embed('admin',records={'siteContent':{'main':{'heroTitle':'ciao ciao ciao ciao','servicesHeading':'Titolo personalizzato'}}})
        page.set_content(html)
        page.add_script_tag(content=mock)
        page.add_script_tag(content=js)
        page.wait_for_timeout(200)
        if width<=750: page.locator('#sidebar-toggle').click()
        page.locator('[data-view="content"]').click()
        assert page.locator('[name="heroTitlePrimary"]').input_value()=='ciao ciao ciao ciao'
        assert page.locator('[name="heroTitleAccent"]').input_value()==''
        assert page.locator('[name="servicesHeadingPrimary"]').input_value()=='Titolo personalizzato'
        assert page.locator('[name="servicesHeadingAccent"]').input_value()==''
        pairs={'heroTitle':('Un rilievo migliore','porta nuove idee.'), 'servicesHeading':('Le nostre competenze','senza confini.'),'methodHeading':('Dall’analisi','alla soluzione.'),'contactHeading':('Parliamo del tuo progetto','insieme.')}
        for key,(primary,accent) in pairs.items():
            page.locator(f'[name="{key}Primary"]').fill(primary)
            page.locator(f'[name="{key}Accent"]').fill(accent)
            assert page.locator(f'[data-heading-preview="{key}"] em').inner_text()==accent
        page.locator('[name="contactHeadingAfter"]').fill('Contattaci oggi.')
        assert 'Contattaci oggi.' in page.locator('[data-heading-preview="contactHeading"]').inner_text()
        page.locator('#content-form [type="submit"]').click()
        page.wait_for_timeout(180)
        assert page.evaluate('window.FAKE_STORE.siteContent.main.servicesHeadingAccent')=='senza confini.'
        assert page.evaluate('window.FAKE_STORE.siteContent.main.contactHeadingAfter')=='Contattaci oggi.'
        assert page.evaluate('window.FAKE_STORE.siteContent.main.heroTitle')=='Un rilievo migliore porta nuove idee.'
        # Verify rich preview remains after rerender and no horizontal CMS overflow
        assert page.locator('[data-heading-preview="heroTitle"] em').inner_text()=='porta nuove idee.'
        assert page.evaluate('document.documentElement.scrollWidth <= window.innerWidth + 1')
        assert not errors, errors
        page.close()
        print('PASS CMS two/three-part typography, legacy fallback, live preview, Firestore mock save, responsive width',width)

    for kind,data in [('new',{'heroTitlePrimary':'Bianco personalizzato','heroTitleAccent':'Champagne personalizzato','servicesHeadingPrimary':'Tecnica','servicesHeadingAccent':'applicata.','methodHeadingPrimary':'Metodo','methodHeadingAccent':'chiaro.','contactHeadingPrimary':'Iniziamo','contactHeadingAccent':'insieme','contactHeadingAfter':'subito.'}), ('legacy',{'heroTitle':'Titolo vecchio personalizzato','servicesHeading':'Testo precedente'}),('legacyMultiline',{'heroTitle':'Prima riga\nSeconda riga'})]:
        page=browser.new_page(viewport={'width':390,'height':800})
        errors=[]
        page.on('pageerror',lambda err:errors.append(str(err)))
        html,mock,js=embed('public',records={'siteContent':{'main':data}})
        page.set_content(html)
        page.add_script_tag(content=(__import__('pathlib').Path(__file__).resolve().parents[1]/'assets/js/site-ui.js').read_text())
        page.add_script_tag(content=mock)
        page.add_script_tag(content=js)
        page.wait_for_timeout(200)
        if kind=='new':
            assert page.locator('#hero-heading em').inner_text()=='Champagne personalizzato'
            assert page.locator('#services-heading em').inner_text()=='applicata.'
            assert page.locator('#method-heading em').inner_text()=='chiaro.'
            assert page.locator('#contact-heading em').inner_text()=='insieme'
            assert 'subito.' in page.locator('#contact-heading').inner_text()
        elif kind=='legacy':
            assert page.locator('#hero-heading').inner_text().strip()=='Titolo vecchio personalizzato'
            assert page.locator('#hero-heading em').count()==0
            assert page.locator('#services-heading').inner_text().strip()=='Testo precedente'
        else:
            assert page.locator('#hero-heading em').inner_text()=='Seconda riga'
        assert not errors,errors
        print('PASS public styled heading rendering scenario:',kind)
        page.close()
    browser.close()
