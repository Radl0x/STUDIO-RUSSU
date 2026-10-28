import {initializeApp} from 'https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js';
import {getFirestore,collection,getDocs,doc,getDoc,addDoc,serverTimestamp} from 'https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js';
import {firebaseConfig} from './firebase-config.js';
import {initOptionalAppCheck} from './app-check-optional.js';
import {defaultServices,defaultContent,styledHeadingConfig,getStyledHeadingParts,renderStyledHeading} from './defaults.js';
const app=initializeApp(firebaseConfig);
await initOptionalAppCheck(app,firebaseConfig.appCheckSiteKey);
const db=getFirestore(app);
const $=s=>document.querySelector(s);
const toTel=s=>String(s||'').replace(/[^+\d]/g,'');
const validImage=s=>typeof s==='string' && /^https:\/\//i.test(s);
window.renderServices?.(defaultServices);
async function loadPublic(){
 try{
  const [contentSnap,servicesSnap]=await Promise.all([
   getDoc(doc(db,'siteContent','main')),getDocs(collection(db,'services'))
  ]);
  if(contentSnap.exists()){
   const c=contentSnap.data();
   const map={heroSubtitle:'#hero-subtitle',aboutLead:'#about-lead',aboutBody:'#about-body',contactDescription:'#contact-description',studioHeading:'#studio-heading',servicesIntro:'#services-intro',projectsHeading:'#projects-heading'};
   for(const [key,selector] of Object.entries(map)){
    const node=$(selector),value=c[key];
    if(!node||typeof value!=='string')continue;
    // Preserve the original approved editorial emphasis when the content is unchanged.
    if(value===defaultContent[key]&&node.querySelector('em,br'))continue;
    node.textContent=value;
   }
   // Styled headings retain the approved white / champagne typography even after CMS edits.
   for(const key of Object.keys(styledHeadingConfig)) {
    const selector={heroTitle:'#hero-heading',servicesHeading:'#services-heading',methodHeading:'#method-heading',contactHeading:'#contact-heading'}[key];
    renderStyledHeading($(selector),key,getStyledHeadingParts(key,c));
   }
   if(validImage(c.heroImageUrl)){const heroImg=$('.hero-visual img');if(heroImg){heroImg.src=c.heroImageUrl;heroImg.classList.add('custom-hero-image')}}
   const syncLink=(selector,text,url)=>{const el=$(selector);if(el&&typeof text==='string'&&text.trim()){el.firstChild.textContent=text+' ';el.href=url}};
   if(c.phone){syncLink('#site-phone',c.phone,'tel:'+toTel(c.phone));syncLink('#footer-phone',c.phone,'tel:'+toTel(c.phone))}
   if(c.phoneAlt)syncLink('#footer-mobile',c.phoneAlt,'tel:'+toTel(c.phoneAlt));
   if(c.email){syncLink('#site-email',c.email,'mailto:'+c.email);syncLink('#footer-email',c.email,'mailto:'+c.email)}
   if(c.address){const url='https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(c.address);syncLink('#site-address',c.address,url);const footerAddress=$('#footer-address');if(footerAddress){footerAddress.textContent=c.address;footerAddress.href=url}}
   const legalMap={legalEntity:'#legal-entity',vatNumber:'#legal-vat',professionalName:'#legal-professional',professionalRegister:'#legal-register',professionalRegisterNumber:'#legal-register-number'};
   for(const [field,selector] of Object.entries(legalMap))if(typeof c[field]==='string'&&$(selector))$(selector).textContent=c[field].slice(0,240);
   const legalPending=$('#legal-placeholder-warning');
   if(legalPending){
     const rawVat=String(c.vatNumber??'00000000000').replace(/\D/g,'');
     const stillDemo=!/^\d{11}$/.test(rawVat)||rawVat==='00000000000'||(String(c.professionalName||'').toLowerCase().includes('esempio')||!c.professionalName)||String(c.professionalRegister||'').toLowerCase().includes('esempio')||String(c.professionalRegisterNumber||'')==='0000';
     legalPending.textContent=stillDemo?'(DATI FITTIZI / DA SOSTITUIRE PRIMA DELLA PUBBLICAZIONE)':'';
   }
   if(c.seoTitle)document.title=String(c.seoTitle).slice(0,160);
   if(c.seoDescription){let meta=$('meta[name=description]');if(meta)meta.content=String(c.seoDescription).slice(0,300)}
  }
  if(!servicesSnap.empty){
   const updates=servicesSnap.docs.map(d=>({...d.data(),id:d.id}));
   const merged=[...defaultServices.filter(s=>!updates.some(u=>u.id===s.id)),...updates].filter(s=>s.archived!==true);
   window.renderServices?.(merged);
  }
 }catch(e){console.warn('Contenuti Firebase non disponibili: uso la versione locale.',e.code||e.message)}
}
loadPublic();
const form=$('#public-request-form'),feedback=$('#form-feedback'),submit=$('#submit-request');
const lastSubmissionKey='str_last_submission';
form?.addEventListener('submit',async e=>{
 e.preventDefault();feedback.className='form-feedback';feedback.textContent='';
 const fd=new FormData(form);
 if(fd.get('website'))return; // honeypot
 if(!form.reportValidity())return;
 let previousSubmission=0;try{previousSubmission=Number(sessionStorage.getItem(lastSubmissionKey)||0)}catch(_){}
 if(Date.now()-previousSubmission<60000){feedback.classList.add('error');feedback.textContent='Per favore attendi un minuto prima di inviare un’altra richiesta.';return}
 const requestedDate=String(fd.get('requestedDate')||'');
 const entry={fullName:String(fd.get('fullName')||'').trim(),email:String(fd.get('email')||'').trim(),phone:String(fd.get('phone')||'').trim(),service:String(fd.get('service')||'Da definire').slice(0,80),message:String(fd.get('message')||'').trim(),requestType:window.getPublicFormType?.()||'preventivo',requestedDate,privacyAcknowledged:true,privacyVersion:'2026-10',source:'website',status:'nuova',createdAt:serverTimestamp()};
 if(entry.fullName.length<2||entry.message.length<10){feedback.classList.add('error');feedback.textContent='Inserisci un nome e un messaggio di almeno 10 caratteri.';return}
 if(entry.requestType==='appuntamento'&&!requestedDate){feedback.classList.add('error');feedback.textContent='Seleziona la data preferita.';return}
 submit.disabled=true;submit.firstChild.textContent='Invio in corso… ';
 try{await addDoc(collection(db,'requests'),entry);try{sessionStorage.setItem(lastSubmissionKey,String(Date.now()))}catch(_){}form.reset();feedback.classList.add('ok');feedback.textContent='La tua richiesta è stata registrata correttamente. Lo studio potrà consultarla e ricontattarti attraverso i recapiti forniti.'}
 catch(err){console.error(err);feedback.classList.add('error');feedback.textContent=err.code==='permission-denied'?'Invio non disponibile: verificare le regole Firestore e la configurazione del sito.':'Invio non riuscito. Riprova oppure contatta direttamente lo studio via email o telefono.'}
 finally{submit.disabled=false;submit.firstChild.textContent='Invia la richiesta '}
});
