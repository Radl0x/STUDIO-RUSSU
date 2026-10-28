# Studio Tecnico Russu — Audit CMS, collegamenti e sicurezza

**Data:** 28 ottobre 2026  
**Base analizzata:** `Studio_Russu_DroneLab_Rotazione_Sincronizzata.zip`  
**Ambito:** 28 file del pacchetto originale; codice pubblico, CMS, Firestore Rules, Hosting, CSS, SVG, documentazione e test.

## Sintesi

Sono stati individuati difetti effettivi di sincronizzazione CMS → sito, un problema di accesso pubblico alle bozze e incongruenze con le sezioni eliminate nelle precedenti revisioni. Le correzioni sono limitate a sei file applicativi/configurativi (`index.html`, `admin.js`, `site-data.js`, `site-ui.js`, `firestore.rules`, `firebase.json`) e alla documentazione/test. **Non sono stati modificati `experience.js`, CSS, struttura dei moduli, drone Three.js, hero cinematografiche o altre animazioni.**

**Stato verifiche:** test automatici su Firestore/Auth **simulati**, test responsive Chromium 320/390/1440 px, controllo sintassi JavaScript, CSS, JSON, SVG, ancore e link. **Non sono stati eseguiti test sul progetto Firebase reale né un penetration test; non si può garantire l'assenza di ogni vulnerabilità.**

## 1. Matrice CMS → Firestore → pagina pubblica

| Modulo CMS e campi | Database / destinazione | Risultato |
|---|---|---|
| **Contenuti**: `heroTitle`, `heroSubtitle`, `heroImageUrl` | `siteContent/main` → primo titolo, sottotitolo e immagine hero | **OK**. Preservato anche lo stile del titolo quando resta quello predefinito; testo su più righe supportato. |
| **Contenuti**: `aboutLead`, `aboutBody`, `studioHeading` | `siteContent/main` → sezione Studio | **OK** |
| **Contenuti**: `servicesHeading`, `servicesIntro` | `siteContent/main` → sezione Competenze | **OK** |
| **Contenuti**: `methodHeading` | `siteContent/main` → sezione Metodo | **OK** |
| **Contenuti**: `contactHeading`, `contactDescription` | `siteContent/main` → sezione Contatti | **OK** |
| **Contenuti**: `projectsHeading` | Sezione rimossa in una revisione precedente | **RIMOSSO DALL'EDITOR** perché era un input privo di destinazione. I dati storici Firestore non vengono cancellati. |
| **Servizi**: titolo, simbolo, ordine, slug, descrizione, tag | `services/{id}` → tab e pannello Competenze | **OK**, aggiunta/modifica/archiviazione; la cancellazione di un servizio predefinito ora non lo fa riapparire. |
| **Servizi del form pubblico** | `services` → tendina “Servizio di interesse” | **CORRETTO**: la tendina ora usa servizi e titoli realmente presenti, compresi i nuovi servizi e le archiviazioni. |
| **Richieste**: stato, assegnato a, note interne | `requests/{id}` → scheda richiesta CMS | **OK**; stato, filtro, ricerca, conversione cliente e pianifica appuntamento testati. `assignedTo` è testo libero, **non** un'associazione a UID del team. |
| **Clienti**: nome, azienda, email, telefono, indirizzo, note | `clients/{id}` → CRM | **OK** CRUD. La scheda non sincronizza automaticamente il preventivo quando il cliente viene rinominato: il nominativo è copiato come testo. |
| **Appuntamenti**: nome, email, telefono, servizio, data, ora, stato, note | `appointments/{id}` → elenco e calendario CMS | **OK**, inclusa creazione da richiesta. Non spedisce inviti email e non verifica conflitti tra appuntamenti. |
| **Preventivi**: riferimento, stato, cliente/email, oggetto, descrizione, righe, quantità, prezzi | `quotes/{id}` → elenco, editor, calcolo e stampa PDF | **OK**, importi numerici validati ulteriormente; il PDF usa i recapiti aggiornati nelle Impostazioni. IVA/oneri non automatici per scelta progettuale. |
| **SEO**: `seoTitle`, `seoDescription` | `siteContent/main` → `document.title` e meta-description in JavaScript | **PARZIALE / LIMITE CONOSCIUTO**. Il salvataggio funziona, ma crawler e anteprime social possono leggere i metadati statici prima di JavaScript. Per SEO reale serve aggiornamento dell'HTML statico al rilascio oppure prerendering. |
| **Impostazioni**: `phone`, `phoneAlt`, `email`, `address` | `siteContent/main` → contatti pagina, footer, e recapiti del PDF | **CORRETTO**. Restano statici nella pagina legale `privacy.html`, perché è una bozza da approvare e non va modificata automaticamente. |
| **Collaboratori**: UID, email, ruolo, account attivo | `admins/{uid}` → controllo ruolo via Firestore Rules | **OK** per autorizzare UID esistenti in Firebase Authentication; **non** crea automaticamente l'utente email/password. |
| **Progetti**: titolo, categoria, URL immagine, descrizione, pronto | `projects/{id}` → archivio privato CMS | **ARCHIVIO FUNZIONANTE, MA NON PUBBLICO**. La sezione Progetti era stata esplicitamente rimossa dal sito. Il CMS ora lo indica chiaramente. Nessuna sezione è stata ripristinata. |
| **Notifiche** | Browser Notifications + listener Firestore | **OK solo con CMS aperto** e permessi browser; nessuna notifica a browser chiuso. |
| **Esporta JSON** | Download locale dei dati caricati e autorizzati | **OK**; nessuna funzione di reimportazione o ripristino automatico. |
| **Dashboard** | Calcoli locali da richieste e appuntamenti | **OK**. Non equivale a Google Analytics; gli editor senza accesso CRM non vedono più totali fittizi a zero. |

## 2. Problemi corretti

1. **[ALTO — privacy] `projects` consultabile da visitatori anonimi, inclusi i record non pubblicati.** Le regole ora richiedono un ruolo autorizzato. Poiché il portfolio pubblico è stato rimosso, il sito pubblico non interroga più questa collezione. **Occorre pubblicare le nuove regole.**
2. **[ALTO — gestione accessi] Il titolare poteva disabilitare/eliminare il proprio record via operazioni dirette.** Le regole ora impediscono la cancellazione e la perdita del ruolo `owner` sul documento proprio e richiedono ruoli/flag validi. **Occorre pubblicare le regole.**
3. **[MEDIO] Eliminando un servizio predefinito, ricompariva automaticamente.** Ora viene archiviato in Firestore con `archived:true`, preservando il resto dei dati e permettendo il ripristino mediante una successiva pubblicazione dello stesso slug o ripubblicazione dei servizi predefiniti.
4. **[MEDIO] La tendina del modulo pubblico aveva servizi codificati nell'HTML.** Ora si aggiorna con la lista effettiva gestita nel CMS.
5. **[MEDIO] Le Impostazioni aggiornate non raggiungevano footer e stampa dei preventivi.** Sistemato, compreso il telefono mobile.
6. **[MEDIO] La voce `projectsHeading` in Contenuti non corrispondeva a una sezione esistente.** Rimossa solo dal modulo contenuti, mantenendo il campo storico Firestore.
7. **[MEDIO] Il modulo Progetti dichiarava falsamente la pubblicazione sul sito.** Ora è presentato come archivio interno, senza cambiare i record salvati.
8. **[MEDIO] Editor non operativi vedevano dashboard CRM senza dati e i lettori potevano tentare di salvare da moduli editabili.** Caricamenti adattati al ruolo; i campi diventano di sola lettura quando l'utente non può modificarli. La sicurezza effettiva continua a dipendere da Firestore Rules.
9. **[BASSO] Quote con numeri fuori scala potevano produrre importi non finiti.** Aggiunta validazione prima del salvataggio.
10. **[BASSO — difesa web] Configurazione Hosting rafforzata** con `Referrer-Policy`, `nosniff` e `X-Frame-Options: DENY` sulle pagine admin (solo su Firebase Hosting; per hosting esterni vanno replicate le intestazioni).

## 3. Rischi e limiti NON completamente risolvibili qui

| Rischio / funzionalità | Priorità | Motivo e azione necessaria |
|---|---|---|
| **Spam e consumo quote Firestore** | **Alta** | Il form pubblico usa solo honeypot e limite in `sessionStorage`, aggirabili. Le Security Rules verificano struttura e contenuti, ma non il numero di invii per IP. Configurare una protezione ant-abuso server-side / App Check compatibile con il progetto e monitoraggio quote prima di campagne pubbliche. |
| **Privacy GDPR incompleta** | **Alta / blocco go-live** | `privacy.html` è esplicitamente una bozza: contiene segnaposto su titolare, conservazione, fornitori. Va approvata/completata prima della pubblicazione definitiva. |
| **Regole Firestore non testate in produzione** | Alta | Test eseguiti con simulazioni, non con account o database reale. Verificare con Emulator Suite o utenti test owner/editor/staff/viewer e un visitatore anonimo, poi pubblicare le regole. |
| **SEO editato via JavaScript** | Media | Modifica visibile all'utente ma non necessariamente nei crawler/social. Sincronizzare metadati statici in fase di rilascio. |
| **Archivio Progetti senza galleria pubblica** | Funzionale/voluto | Il CMS archivia progetti, ma la sezione pubblica è stata rimossa in precedenza. Non ripristinata per rispettare la richiesta di non modificare altre sezioni. |
| **Area appuntamenti senza email/inviti/conflitti** | Media | È un calendario gestionale, non un sistema di prenotazione con disponibilità verificata o email automatiche. |
| **Assegnazione richieste non vincolata a collaboratori** | Media | `assignedTo` è testo libero; un collegamento autentico richiederebbe una funzionalità esplicita aggiuntiva. |
| **Contenuti pubblici non interamente editabili dal CMS** | Media | Testi fissi delle scene hero 02/03, Drone Lab, metodologia e footer-brand non hanno campi CMS dedicati. I campi CMS esistenti sono stati verificati; non è stato esteso il CMS a sezioni che non lo prevedevano. |
| **Backup unidirezionale** | Media | Esportazione manuale JSON ma nessun import/restore; non sostituisce un backup automatico testato. |
| **Risorse esterne** | Media | Fotografie remote, Google Fonts, Firebase CDN e Three.js CDN. Richiedono connettività e valutazione privacy/fornitore. |
| **Impostazioni legali statiche** | Media | La pagina privacy non è modificata dalle Impostazioni (richiede approvazione umana). Sitemap/OG meta possono richiedere aggiornamento manuale quando cambia il dominio/contenuto. |

## 4. Verifiche svolte

- Tutti gli **originali 28 file** presenti e leggibili; sintassi di tutti gli script JavaScript (`node --check`).
- CSS analizzati con `tinycss2` e sette SVG analizzati con parser XML: **0 errori di parsing**.
- HTML: nessun ID duplicato; nessun anchor interno orfano; link `target="_blank"` con `noopener` ove necessario.
- Layout: Chromium 1440, 390, 320 px, **nessun overflow orizzontale** nelle schermate provate.
- Browser con Firebase simulato: salvataggio richieste e appuntamenti, CRM, preventivi, conversioni, ruoli, export, selettore servizi dinamico, privacy dei progetti lato codice, sincronizzazione contenuti, footer e PDF.
- CMS: controllate le **12 schermate** e i principali pulsanti/azioni. Nessun errore JavaScript nei test completati.
- Confronto dei file: `experience.js`, `site.css` e `admin.css` identici alla versione di partenza. Nessuna modifica alla cinematica o all'aspetto visuale del sito.

**Non dimostrato:** compatibilità Firefox/Safari fisici, correttezza delle regole pubblicate nel tuo progetto Firebase e resistenza ad attacchi reali. L'assenza di errori di sintassi o di console nei test non garantisce l'assenza di vulnerabilità.

## 5. Come pubblicare le correzioni

1. Fai una **copia di sicurezza** del sito e dei dati Firestore.
2. Dalla root del pacchetto, pubblica **`firestore.rules`** con il file completo: `firebase deploy --only firestore:rules --project studio-russu`, oppure incollalo integralmente in **Firestore → Regole → Pubblica**.
3. Pubblica i file statici aggiornati. Se utilizzi Firebase Hosting: `firebase deploy --only hosting --project studio-russu` (non sovrascrivere configurazioni personalizzate senza confrontarle).
4. Verifica con due account test diversi: owner e viewer; ripeti lo stesso controllo su editor e staff se utilizzati. Da una finestra anonima, controlla che `projects` e tutti i dati CRM restino inaccessibili.
5. Prova a salvare un recapito nel CMS e verifica **contatti, footer, PDF**; poi modifica/archivia un servizio e verifica le **tab e la tendina del form**.
6. Completa la privacy e i dispositivi di protezione anti-abuso prima di un utilizzo pubblico significativo.

**Nota:** non inserire mai password o chiavi di servizio private nel JavaScript pubblico. La configurazione Firebase web è un identificativo pubblico, non sostituisce Authentication e Rules.
