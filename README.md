# STUDIO TECNICO RUSSU — SITO PUBBLICO + CMS (FIREBASE SPARK)

**Versione:** 2.0 EXPERIENCE — 28 ottobre 2026  
**Progetto Firebase:** `studio-russu`  
**Piano:** Spark gratuito — Authentication (email/password), Cloud Firestore Standard, hosting statico.

Questo pacchetto contiene un sito pubblico responsive e un CMS amministrativo. **Il codice è predisposto per il progetto Firebase indicato, ma non è ancora collegato a un database verificato dall'esterno: devi attivare i servizi e pubblicare le regole prima di ricevere richieste reali.** Nessuna password o account amministratore è incorporato nel codice.

## 1. File principali

```
index.html                       Sito pubblico
privacy.html                     Bozza informativa da completare
admin/index.html                 CMS riservato
assets/css/site.css              Design pubblico
assets/css/admin.css             Design CMS
assets/js/firebase-config.js     Configurazione web Firebase fornita
assets/js/defaults.js            Contenuti predefiniti
assets/js/site-ui.js             Navigazione, tab servizi e modulo
assets/js/experience.js          Nuove scene cinematiche, drone Three.js, confronto tecnico
assets/js/site-data.js           Lettura Firestore e invio dei form
assets/js/admin.js               Login, ruoli e CRUD gestionale
assets/img/*.svg                 Illustrazioni locali e fallback per le fotografie
firestore.rules                  Regole di sicurezza: PUBBLICARE
firebase.json                    Configurazione Firebase Hosting
.firebaserc                      Alias progetto studio-russu
sitemap.xml / robots.txt         SEO iniziale
docs/                             Guida operativa e limiti
```

## 2. Attivazione Firebase — passaggi obbligatori

1. Accedi a [Firebase Console](https://console.firebase.google.com/) e seleziona il progetto **studio-russu**.
2. In **Build → Authentication → Sign-in method**, abilita **Email/Password**.
3. In **Build → Firestore Database**, crea il database **Standard** (preferibilmente in una regione UE compatibile con le tue esigenze). Non lasciarlo in test mode con regole aperte.
4. Apri **Firestore Database → Regole** e incolla **tutto** il file `firestore.rules`, poi pubblica. In alternativa: `firebase deploy --only firestore:rules --project studio-russu` con la CLI autorizzata.
5. In **Authentication → Users**, crea il primo account amministratore con email e password che sceglierai tu. **Copia l'UID** generato da Firebase Authentication.
6. In **Firestore Database → Dati**, crea la raccolta `admins`, poi un documento il cui **ID è l'UID esatto** dell'utente Auth; imposta questi campi:

   | Campo | Tipo | Valore |
   |-------|------|--------|
   | `active` | Boolean | `true` |
   | `role` | String | `owner` |
   | `email` | String | email di accesso dell'utente |

   **Attenzione:** il documento iniziale si crea nella console Firebase con credenziali di progetto, non dal sito pubblico. Non usare un ID generico come `admin` e non mettere mai la password nel codice.
7. In **Authentication → Settings → Authorized domains**, aggiungi il dominio su cui pubblichi il sito (se non già presente).
8. Pubblica l'intera cartella su hosting statico HTTPS (oppure Firebase Hosting nel piano Spark). Apri `https://tuo-dominio/admin/` ed effettua il login. Da quel momento il CMS legge e scrive tramite Firestore.
9. Vai su **CMS → Servizi → Pubblica 6 servizi predefiniti**. In **CMS → Contenuti**, salva i testi attuali per creare il documento `siteContent/main` (facoltativo: il sito ha già contenuti di fallback).
10. Apri il sito pubblico e invia una richiesta di prova reale, con dati di prova e un'email di tua proprietà. Controlla che compaia in **CMS → Richieste** e che sia leggibile solo dagli account autorizzati.

**Il file `firebase-config.js` è pubblico per natura e non equivale a una credenziale segreta.** La sicurezza reale è garantita da Firebase Auth e Security Rules pubblicate.

## 3. Pubblicazione con Firebase Hosting (facoltativa)

Usando Node.js e la Firebase CLI:

```bash
npm install -g firebase-tools
firebase login
cd studio-russu-spark
firebase use studio-russu
firebase deploy --only firestore:rules,hosting --project studio-russu
```

Il piano Spark consente quote gratuite di Firebase Hosting; controlla sul tuo progetto limiti di spazio e banda. Puoi anche usare hosting statico esterno **senza usare Firebase Hosting**, purché HTTPS e dominio autorizzato in Firebase Authentication.

**Prima del cambio DNS:** conferma che il nuovo dominio e la proprietà dei contenuti siano autorizzati. Aggiorna `sitemap.xml`, `robots.txt`, metadata, canonical (se aggiunto) e i riferimenti al dominio quando la destinazione differisce da quella attuale.

## 4. Funzioni effettivamente implementate

### Pubblico
- Hero immersiva in tre scene scroll-driven con testi cinematografici e rivelazione tipografica; sistema nativo sticky senza blocco dello scroll.
- Drone Lab immersivo in tre capitoli: scena Three.js con drone 3D in volo, rotori, camera e terreno topografico. Caricamento differito quando la sezione si avvicina; fallback SVG se WebGL/CDN non disponibili.
- Confronto visivo interattivo tra territorio e modello tecnico, slider accessibile anche da tastiera. Visualizzazione concettuale, non rappresenta un rilievo realmente eseguito.
- Parallax lieve, animazioni tramite trasformazioni CSS e IntersectionObserver, opzione di movimento ridotto, menu responsive.
- Testi studio, sezione sei servizi interattiva, processo, ambiti di intervento.
- La galleria pubblica **è stata rimossa su richiesta**; il CMS conserva l’archivio interno Progetti, senza pubblicazione automatica sul sito.
- Form per richiesta preventivo o appuntamento, validazione locale, checkbox informativa, honeypot antispam, limite locale per tentativi ravvicinati e salvataggio **diretto in Firestore**.
- Telefono, email e posizione reale dello studio.
- Metadati iniziali SEO, robots, sitemap, dati strutturati LocalBusiness/ProfessionalService.

### CMS
- Login Firebase Authentication + verifica ruolo/attivo nel documento `admins/{uid}`.
- Dashboard con KPI **operativi** (non statistiche di traffico).
- Avvisi visivi per nuove richieste e notifiche browser opzionali mentre il CMS è aperto (non push in background).
- Richieste: ricerca, filtri, assegnazione, note interne, stato, conversione in anagrafica e creazione appuntamento.
- CRM: creazione, lettura, modifica, eliminazione contatti.
- Calendario appuntamenti con navigazione mensile e stato.
- Preventivi: righe quantità/prezzo, totale, stati, stampa PDF tramite browser.
- Editor testi e immagini via URL HTTPS per hero, sezioni e contatti.
- Editor servizi (aggiunta, modifica e archiviazione anche per quelli predefiniti) e archivio interno Progetti (la sezione pubblica è disattivata).
- SEO editor dei metadati Firestore (vedi avvertenza sotto).
- Ruoli `owner`, `staff`, `editor`, `viewer`, configurati su UID esistenti.
- Esportazione manuale JSON (i dati personali richiedono protezione).

### Autorizzazioni
- `owner`: accesso completo, incluso team.
- `staff`: gestione richieste, clienti, appuntamenti, preventivi.
- `editor`: gestione contenuti, servizi, progetti, SEO.
- `viewer`: lettura operativa senza modifiche.
- Gli utenti pubblici possono **soltanto creare** richieste con campi rigidamente validati. Non possono leggere richieste, clienti o CRM.

## 5. Limiti che NON vanno nascosti al cliente

1. **Nessuna email automatica.** Senza funzioni server o servizio esterno configurato, l'invio del form *salva nel CMS* ma non spedisce email. Il CMS visualizza le nuove richieste e permette di prenderle in carico.
2. **Nessun upload documenti su Firebase Storage.** Il piano Spark con il bucket fornito `*.firebasestorage.app` non offre la stessa operatività di Blaze. Il sito usa SVG locali e, se impostate nel CMS, immagini con URL HTTPS; per documenti riservati serve un'architettura aggiuntiva autorizzata.
3. **Nessun sistema automatico di backup o notifiche programmate.** L'export JSON è manuale. Lo storico dei documenti in Firestore non è un backup.
4. **Il modulo pubblico non ha rate limiting server-side per IP.** Honeypot e limite browser sono deterrenti deboli. Prima di aprire al pubblico valuta **Firebase App Check** (reCAPTCHA Enterprise o provider appropriato), monitoraggio quote e protezione antispam aggiuntiva. App Check da solo non risolve ogni tipo di spam.
5. **SEO dinamico limitato:** modifiche CMS ai meta tag sono client-side; motori e anteprime possono non rilevarle. Titolo e descrizione statici vanno aggiornati anche nel sorgente HTML prima della pubblicazione.
6. **Privacy:** `privacy.html` è una **bozza**, non un'informativa approvata. Devi completarla con il titolare del trattamento e valutare i fornitori, le basi giuridiche, i tempi di conservazione, i cookie e l'eventuale trasferimento dei dati prima di gestire dati di persone reali.
7. **Preventivi non fiscali:** i PDF non gestiscono automaticamente IVA, contributi, ritenute o obblighi di fatturazione; vanno verificati da chi li emette.
8. **Nessun invio effettivo è stato effettuato sul progetto Firebase dell'utente in fase di generazione.** Test svolti localmente con dati simulati.
9. **Nessuna foto dello studio/portfolio è stata copiata senza autorizzazione.** Le immagini di progetto vanno caricate solo dal titolare o su sua autorizzazione.

## 6. Dati e collezioni Firestore

| Collezione/documento | Lettura pubblico | Scrittura pubblico | CMS |
|---|---|---|---|
| `siteContent/main` | sì | no | owner/editor |
| `services/{id}` | sì | no | owner/editor |
| `projects/{id}` | **no** | no | owner/editor modifica; owner/staff/editor/viewer lettura autenticata |
| `requests/{id}` | NO | solo create validata | owner/staff; viewer lettura |
| `clients/{id}` | NO | NO | owner/staff; viewer lettura |
| `appointments/{id}` | NO | NO | owner/staff; viewer lettura |
| `quotes/{id}` | NO | NO | owner/staff; viewer lettura |
| `admins/{uid}` | NO | NO | owner gestisce; utente legge il proprio documento |

Le Security Rules sono necessarie **anche se il CMS ha un login visivo**. Non rimuovere il blocco finale `allow read, write: if false;`.

## 7. Contenuti consultati e diritti

Testi e competenze rielaborati dalle pagine pubbliche dello studio:
- https://www.studiotecnicorussu.com/
- https://www.studiotecnicorussu.com/chi-siamo
- https://www.studiotecnicorussu.com/lavori-con-drone
- https://www.studiotecnicorussu.com/topografia
- https://www.studiotecnicorussu.com/progettazione-e-cantiere
- https://www.studiotecnicorussu.com/pratiche-catastali-e-perizie
- https://www.studiotecnicorussu.com/contatti

Illustrazioni SVG originali create per il progetto. Font esterni DM Sans / Manrope caricati da Google Fonts (verificare gli aspetti privacy/hosting nel progetto definitivo).

## 8. Test effettuati prima della consegna

- Analisi sintattica JavaScript con `node --check`.
- Controllo layout con Chromium a 1440, 390, 320 px.
- Verifica menu mobile e comparsa del campo data per appuntamento.
- Simulazione dell'accesso a CMS con ruoli e datastore fittizi (senza toccare Firestore reale), creazione cliente e preventivo, ricalcolo totale.
- Controllo struttura HTML, collegamenti relativi, dimensioni archivio ZIP.

**Test da eseguire nell'ambiente del cliente:** autenticazione e autorizzazioni reali, salvataggio su Firestore, blocco delle letture pubbliche dei dati privati, form con regole pubblicate, permessi editor/staff/viewer, compatibilità Safari iOS e test GDPR prima del go-live.


## 8. Novità EXPERIENCE 2.0 — importanti per la consegna

**Il CMS esistente non è stato modificato.** Il sito pubblico continua a utilizzare gli stessi ID di contenuto (per esempio `hero-heading`, `studio-heading`, `service-tabs`, `public-request-form`) e le stesse collezioni Firestore. Le `firestore.rules` incluse sono la versione corretta con l'accesso `d['service']`.

La fotografia delle hero è **di repertorio** caricata da Unsplash tramite URL HTTPS; sono comprese anche tre grafiche vettoriali locali che si vedono se le immagini esterne non sono disponibili. Per una consegna commerciale definitiva, verifica diritti d'uso, sostituzione con fotografie autorizzate dello studio e disclosure dei servizi di terze parti.

La scena Three.js utilizza il modulo CDN `https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js`; per il funzionamento 3D occorre accesso a Internet e supporto WebGL. Se il caricamento non riesce, rimane un modello SVG animato. L'utilizzo del CDN va riportato nelle informative tecniche/privacy aggiornate prima della pubblicazione. In Firebase Spark non sono state aggiunte Cloud Functions, Storage, email automatiche né API a pagamento.

Per modificare i tempi delle scene è sufficiente aggiornare la durata CSS dei blocchi `.hero` e `.drone-story`; la logica nelle scene usa percentuali relative alla posizione nella viewport, evitando blocchi dello scroll e gesti che non producono progressione.

**Verifiche in ambiente di test:** HTML, CSS, sintassi JS, rendering desktop/mobile, nav mobile, tab servizi, form pubblico con Firestore simulato, CMS CRUD con Firebase simulato. **Non è stato verificato il rendering WebGL con accesso effettivo al CDN né il Firestore reale di produzione.** Esegui un test su un dispositivo reale prima di pubblicare.


## 11. Audit CMS e sicurezza — 28 ottobre 2026

Il rapporto dettagliato e la matrice campi → destinazioni si trovano in `AUDIT_CMS_SICUREZZA.md`.
Per le correzioni di privacy, archiviazione dei servizi e protezione del ruolo titolare
è **obbligatorio pubblicare le nuove `firestore.rules`** sul progetto Firebase.
Le modifiche ai contatti pubblici richiedono la pubblicazione dei file del sito.
Gli script in `tests/` usano Firebase simulato e non accedono a dati reali.


## Titoli bicolore gestibili dal CMS — aggiornamento editoriale

In **CMS → Contenuti** i titoli Hero, Competenze e Metodo sono ora composti da **due campi**: testo principale e testo champagne in corsivo. Il titolo Contatti dispone anche del testo bianco conclusivo, perché nella composizione originale prosegue dopo la parola champagne. Tutti dispongono di un’anteprima in tempo reale, utile prima del salvataggio.

Il documento `siteContent/main` usa campi `heroTitlePrimary`, `heroTitleAccent`, `servicesHeadingPrimary`, `servicesHeadingAccent`, `methodHeadingPrimary`, `methodHeadingAccent`, `contactHeadingPrimary`, `contactHeadingAccent`, `contactHeadingAfter`. I campi storici (`heroTitle`, ecc.) restano presenti e vengono aggiornati come testo unificato per compatibilità. **Non è necessaria una migrazione manuale di Firestore né una modifica alle Security Rules**: i vecchi titoli salvati in un solo campo vengono recuperati nel campo principale, senza cancellazioni automatiche. Se un vecchio titolo personalizzato non aveva indicazioni di colore, sarà necessario specificare la porzione champagne nel nuovo campo.

Pubblica **insieme** `assets/js/defaults.js`, `assets/js/admin.js`, `assets/js/site-data.js`, `assets/css/admin.css` e `admin/index.html`: il CMS e il sito pubblico devono usare la stessa versione della logica tipografica. La modifica non riguarda il Drone Lab, le animazioni, i moduli di contatto o i dati CRM.


## Aggiornamento demo pre-vendita (solo servizi gratuiti)

- **Dati professionali / P.IVA:** sono segnaposto ESPLICITAMENTE FITTIZI e si modificano dal CMS → Impostazioni. Finché non sono reali e verificati NON utilizzare il sito in produzione.
- **Privacy e cookie:** `privacy.html` è una bozza non validata e `cookie.html` documenta i servizi esterni censiti nel codice. Non è stato aggiunto un banner non necessario: qualora vengano attivati tracciamenti soggetti a consenso, andrà realizzato un consenso preventivo prima di caricarli.
- **Backup:** nel CMS → Esporta dati il Titolare può leggere un backup JSON e ripristinare con conferma. Il ripristino è per upsert: NON cancella documenti preesistenti e NON modifica gli account `admins`. L'operazione può essere parziale se una scrittura fallisce; testare con dati dimostrativi e archiviare copie cifrate. I dati JSON possono contenere dati personali.
- **SEO:** CMS → SEO permette di esportare un `index-seo-da-pubblicare.html` con title, description e Open Graph aggiornati. Rinominare in `index.html` e pubblicare dopo aver verificato i contenuti. L'operazione non modifica automaticamente Hosting o sitemap; aggiorna sitemap/robots se il dominio cambia.
- **Antispam:** conserva validazioni, honeypot e un limite solo locale. La protezione più forte e compatibile con Spark è Firebase App Check (reCAPTCHA v3) in `assets/js/app-check-optional.js`, inizialmente **disattivato** fino a quando l'operatore configura chiave, dominio e Firebase Console. Non attivare enforcement Firestore senza avere verificato pubblico e CMS. App Check non è un rate limit e non blocca ogni abuso.
- **Quote Spark:** non sono presenti nuove Cloud Functions, Storage o servizi che richiedono Blaze.
- **Accessibilità:** aggiunto link da tastiera «Salta al contenuto»; i test assistivi manuali rimangono da effettuare.
- **Sicurezza:** controlli server nelle Security Rules; aggiornate validazioni date e header Hosting; non condividere credenziali.
- **Consegna:** consulta `docs/VERIFICA_PRIMA_PUBBLICAZIONE.md`, `docs/LICENZE_FOTOGRAFICHE.md` e `docs/BOZZA_ACCORDO_CLIENTE.md`. Sono supporti operativi, non consulenza legale.
