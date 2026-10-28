# Studio Russu — checklist obbligatoria pre-pubblicazione (28/10/2026)

> **Il pacchetto NON costituisce una certificazione legale né di sicurezza.** Lavori tecnici eseguiti nel codice, integrazioni e risultati da validare sul dominio reale.

## Blocchi da chiudere PRIMA di pubblicare

- [ ] Sostituire P.IVA **00000000000** (fittizia), denominazione giuridica, nome professionista, albo, numero iscrizione con dati ufficiali. I campi sono nel CMS → Impostazioni. Verificare i contenuti del footer **anche in HTML statico** per gli utenti con JavaScript disattivato.
- [ ] Approvare la bozza `privacy.html` con: titolare vero, categorie di dati, base giuridica, eventuali destinatari, rapporti con fornitori, trasferimenti, tempo di conservazione, procedure per diritti e incidenti. Il testo attuale resta volutamente marcato BOZZA.
- [ ] Convalidare tecnologie e cookie sul dominio pubblicato: Google Fonts, Firebase, CDN Three.js, immagini Wixstatic e qualsiasi script successivamente aggiunto. Il codice non installa pubblicità/profilazione: non aggiungere un banner fittizio. Se saranno aggiunti tracker soggetti a consenso, bloccarli prima dell'opt-in, con gestione revoca.
- [ ] Verificare titolarità e licenze delle fotografie; non usare risorse esterne senza permesso (inventario `LICENZE_FOTOGRAFICHE.md`).
- [ ] Verificare il consenso al trattamento e la minima raccolta di dati del modulo. Definire tempi e procedura di cancellazione per richieste, clienti, appuntamenti e preventivi.
- [ ] Pubblicare `firestore.rules`; testare in Firebase Console/Emulator con ruoli owner, staff, editor, viewer, anonimo. In particolare: utente anonimo non può leggere /requests e /clients; l'anonimo può solo creare richieste formalmente valide; nessuno può creare amministratori senza ruolo owner.
- [ ] Testare login e salvataggi reali sul progetto `studio-russu` (i test locali nel pacchetto usano una simulazione). Verificare gestione sessione di logout, revoca permessi, dominio HTTPS autorizzato.
- [ ] Valutare Firebase App Check gratuito con reCAPTCHA v3 per mitigare l'abuso: configurare il sito, dichiararlo nelle informative, registrare sito e dominio, provare pubblico e CMS prima di attivare enforcement; non garantisce rate limiting. Evitare traffico anomalo sulle quote Spark.
- [ ] Eseguire un export JSON e ripristino controllato su dati test; conservare almeno una copia protetta e documentare periodicità e responsabilità. Il ripristino non è automatico e non include le credenziali Firebase Authentication.
- [ ] Test reali su iOS Safari, Android Chrome, Firefox desktop, navigazione con tastiera/screen reader; verificare focus, etichette, contenuti in zoom 200%, motion reduction e CTA.
- [ ] Controllare metriche Web Vitals sul dominio pubblico e testare banda lenta; i file Three.js sono caricati da CDN esterno e possono fallire senza Internet.
- [ ] Convalidare metadati statici: utilizzare il download in CMS → SEO e pubblicare l'HTML generato; aggiornare sitemap e robots quando cambia dominio. Non considerare il solo salvataggio Firestore sufficiente alla SEO statica.
- [ ] Confermare documentazione contrattuale, proprietà del dominio e del progetto Firebase, licenze, condizioni di supporto e responsabilità su dati e contenuti.

## Limiti deliberati del piano Spark

- Nessun Cloud Functions, Storage Firebase o email transazionali automatizzate.
- Non c'è protezione server-side completa contro invii massivi; validazioni Firestore e App Check sono mitigazioni e richiedono monitoraggio e valutazione dei rischi.
- Backup e ripristino manuali: non c'è una retention automatica o una disaster recovery garantita.
- Le notifiche CMS funzionano solo con la finestra web aperta e permessi browser accordati.

## Verifiche tecniche svolte sul sorgente

- Script sintatticamente controllati, CSS parse, HTML strutturato.
- Dati legali marcati esplicitamente come dimostrativi e modificabili dal CMS.
- SEO esportabile in HTML statico, backup ripristinabile senza toccare admins.
- Nessuna modifica ai modelli Drone Lab / visualizzazioni Three.js o ai controller multiscroll.

## Fonti normative di riferimento (da verificare con consulente)

- GDPR UE 2016/679, artt. 5, 6, 12, 13, 28, 32.
- Garante Privacy, Linee guida cookie e altri strumenti di tracciamento, provv. 231 del 10/06/2021.
- D.P.R. 633/1972, art. 35 (informazioni IVA per i soggetti interessati).
- Requisiti di accessibilità applicabili in funzione del soggetto e dei servizi forniti, da valutare in concreto.
