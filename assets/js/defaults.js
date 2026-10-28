export const defaultContent = {
  heroTitle: 'La precisione dà forma al futuro.',
  studioHeading: 'Ogni progetto inizia da una misura fatta bene.',
  servicesHeading: 'Il sapere tecnico, in ogni dettaglio.',
  servicesIntro: 'Un insieme di competenze complementari per affrontare ogni intervento con metodo, rigore e visione d’insieme.',
  methodHeading: 'Un processo chiaro. Risultati concreti.',
  projectsHeading: 'Il territorio, da diversi punti di vista.',
  contactHeading: 'Le idee hanno bisogno di spazio. Iniziamo a parlarne.',
  heroImageUrl: '',
  heroSubtitle: 'Dalla lettura del territorio alla realizzazione del progetto. Competenze tecniche, esperienza e strumenti contemporanei al servizio delle tue idee.',
  aboutLead: 'Un percorso professionale costruito sul campo, dall’edilizia alla topografia, dalla progettazione alle tecnologie di rilievo più evolute.',
  aboutBody: 'Lo Studio Tecnico Russu opera a Olbia e nel territorio della Sardegna. L’attività professionale inizia nel 1974, con iscrizione all’albo nel 1982. Nel tempo, esperienza diretta e innovazione si sono integrate in un approccio attento a ogni fase del lavoro.',
  contactDescription: 'Hai un intervento da realizzare, un rilievo da pianificare o una pratica da gestire? Raccontaci di cosa hai bisogno.',
  phone: '0789 69158',
  phoneAlt: '335 6296587',
  email: 'studio.russu@gmail.com',
  address: 'Via Faenza 64, 07026 Olbia (SS)',
  legalEntity: 'Studio Tecnico Russu — DATI DIMOSTRATIVI',
  vatNumber: '00000000000',
  professionalName: 'Geom. Nome Cognome (esempio)',
  professionalRegister: 'Collegio Geometri — esempio',
  professionalRegisterNumber: '0000',
  seoCanonical: '',
  seoTitle: 'Studio Tecnico Russu | Geometra, progettazione e rilievi a Olbia',
  seoDescription: 'Studio Tecnico Russu a Olbia: progettazione, topografia, rilievi con drone, pratiche catastali, sicurezza cantieri e perizie. Richiedi una consulenza.'
};

// CMS typography: keep stylistic emphasis independent from the editable words.
// Legacy Firestore documents with only the old single heading field remain readable.
export const styledHeadingConfig = {
  heroTitle: {primary:'La precisione\ndà forma',accent:'al futuro.',beforeAccentBreak:false,afterAccentBreak:false},
  servicesHeading: {primary:'Il sapere tecnico,',accent:'in ogni dettaglio.',beforeAccentBreak:true,afterAccentBreak:false},
  methodHeading: {primary:'Un processo chiaro.',accent:'Risultati concreti.',beforeAccentBreak:true,afterAccentBreak:false},
  contactHeading: {primary:'Le idee hanno\nbisogno di',accent:'spazio.',after:'Iniziamo a parlarne.',beforeAccentBreak:false,afterAccentBreak:true}
};
export function getStyledHeadingParts(key, data={}) {
  const spec=styledHeadingConfig[key];
  if(!spec)throw new Error('Titolo non configurato: '+key);
  const fieldNames=[key+'Primary',key+'Accent',key+'After'];
  if(fieldNames.some(name=>Object.prototype.hasOwnProperty.call(data,name))) {
    return {primary:String(data[key+'Primary']??''),accent:String(data[key+'Accent']??''),after:String(data[key+'After']??'')};
  }
  const oldTitle=typeof data[key]==='string'?data[key]:defaultContent[key];
  if(oldTitle!==defaultContent[key]) {
    // Keep previously customized text: never guess which words the user wanted colored.
    if(key==='heroTitle' && /\r?\n/.test(oldTitle)) {
      const lines=oldTitle.split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
      if(lines.length>1)return {primary:lines[0],accent:lines.slice(1).join(' '),after:''};
    }
    return {primary:oldTitle,accent:'',after:''};
  }
  return {primary:spec.primary,accent:spec.accent,after:spec.after||''};
}
export function renderStyledHeading(target,key,parts) {
  const spec=styledHeadingConfig[key];
  if(!target||!spec)return;
  target.replaceChildren();
  function addLines(value) {
    String(value||'').split(/\r?\n/).forEach((part,i)=>{
      if(i)target.append(document.createElement('br'));
      if(part)target.append(document.createTextNode(part));
    });
  }
  if(parts.primary)addLines(parts.primary);
  if(parts.accent){
    if(spec.beforeAccentBreak&&parts.primary)target.append(document.createElement('br'));
    else if(parts.primary&&!/\n$/.test(parts.primary))target.append(document.createTextNode(' '));
    const em=document.createElement('em');em.textContent=parts.accent;target.append(em);
  }
  if(parts.after){
    if(spec.afterAccentBreak&&(parts.primary||parts.accent))target.append(document.createElement('br'));
    else if(parts.primary||parts.accent)target.append(document.createTextNode(' '));
    addLines(parts.after);
  }
}

export const defaultServices = [
 {id:'drone',order:1,title:'Rilievi con drone',icon:'⌁',description:'Fotogrammetria, nuvole di punti, modelli tridimensionali e ortomosaici per conoscere e misurare il territorio.',tags:['Aerofotogrammetria','Ortomosaici','Modelli digitali']},
 {id:'progettazione',order:2,title:'Progettazione',icon:'▱',description:'Progettazione di nuove costruzioni, ampliamenti e opere urbane, con gestione della documentazione necessaria.',tags:['Edilizia','Ampliamenti','Pratiche tecniche']},
 {id:'topografia',order:3,title:'Topografia',icon:'⌖',description:'Rilievi di precisione, tracciamenti, riconfinamenti, piani quotati e calcoli di volumi.',tags:['Rilievi','Tracciamenti','Riconfinamenti']},
 {id:'cantiere',order:4,title:'Cantieri e sicurezza',icon:'▦',description:'Direzione lavori, piani di sicurezza, computi metrici e certificazioni energetiche APE.',tags:['Direzione lavori','Sicurezza','APE']},
 {id:'catasto',order:5,title:'Catasto e pratiche',icon:'▤',description:'Frazionamenti, accatastamenti, accorpamenti e variazioni catastali.',tags:['Frazionamenti','Accatastamenti','Variazioni']},
 {id:'perizie',order:6,title:'Perizie e stime',icon:'◇',description:'Stime immobiliari, consulenze tecniche, valutazioni di danni, successioni e divisioni ereditarie.',tags:['CTU / CTP','Stime','Successioni']}
];
export const requestStatuses = ['nuova','in_lavorazione','in_attesa','completata','archiviata'];
export const appointmentStatuses = ['da_confermare','confermato','completato','annullato'];
export const quoteStatuses = ['bozza','inviato','accettato','rifiutato'];
export const roleLabels = {owner:'Titolare',editor:'Editor',staff:'Collaboratore',viewer:'Sola lettura'};
