(()=>{
'use strict';
const $=(s)=>document.querySelector(s), $$=(s)=>[...document.querySelectorAll(s)];
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
const loader=$('#page-loader');window.addEventListener('load',()=>{setTimeout(()=>loader?.classList.add('done'),260)},{once:true});setTimeout(()=>loader?.classList.add('done'),2000);
const year=$('#year');if(year)year.textContent=new Date().getFullYear();
const toggle=$('#nav-toggle'),nav=$('#primary-nav');
// Menu visual: lazy-load the optional Three.js module only after a user opens the mobile menu.
// The menu itself remains fully functional even without WebGL / network access.
let mobileMenuFX=null,mobileMenuFXRequest=null;
const setMenuFX=(open)=>{
 if(!open){mobileMenuFX?.close();return}
 if(reduced)return;
 if(mobileMenuFX){mobileMenuFX.open();return}
 if(!mobileMenuFXRequest){mobileMenuFXRequest=import('./mobile-menu-three.js').then(module=>{
   mobileMenuFX=module;if(nav?.classList.contains('open'))mobileMenuFX.open();
 }).catch(()=>{mobileMenuFXRequest=null})}
};
const closeMenu=()=>{if(!nav?.classList.contains('open'))return;nav.classList.remove('open');document.body.classList.remove('menu-open');toggle?.setAttribute('aria-expanded','false');toggle?.setAttribute('aria-label','Apri menu');setMenuFX(false)};
toggle?.addEventListener('click',()=>{const open=!nav.classList.contains('open');nav.classList.toggle('open',open);document.body.classList.toggle('menu-open',open);toggle.setAttribute('aria-expanded',String(open));toggle.setAttribute('aria-label',open?'Chiudi menu':'Apri menu');setMenuFX(open)});
nav?.addEventListener('click',(e)=>{if(e.target.closest('a'))closeMenu()});
document.addEventListener('keydown',e=>{
 if(e.key==='Escape'&&nav?.classList.contains('open')){closeMenu();toggle?.focus();return}
 if(e.key!=='Tab'||!nav?.classList.contains('open'))return;
 // Keep keyboard focus in the open mobile navigation (including the close button).
 const items=[toggle,...nav.querySelectorAll('a')].filter(Boolean);
 const first=items[0],last=items[items.length-1];
 if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}
 else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}
});
window.addEventListener('resize',()=>{if(innerWidth>1020)closeMenu()},{passive:true});
const reveal=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('visible');reveal.unobserve(e.target)}}),{threshold:.1,rootMargin:'0px 0px -4% 0px'});$$('.reveal').forEach(el=>reveal.observe(el));
const back=$('#back-to-top'),header=$('.site-header');let pending=false;
function checkScroll(){pending=false;header?.classList.toggle('scrolled',scrollY>70);back?.classList.toggle('visible',scrollY>450)}
addEventListener('scroll',()=>{if(!pending){pending=true;requestAnimationFrame(checkScroll)}},{passive:true});checkScroll();back?.addEventListener('click',()=>scrollTo({top:0,behavior:reduced?'instant':'smooth'}));
const formBtns=$$('.form-switch button'),dateLabel=$('#date-label'),date=$('#requested-date');let formType='preventivo';window.getPublicFormType=()=>formType;
formBtns.forEach(btn=>btn.addEventListener('click',()=>{formType=btn.dataset.formType;formBtns.forEach(b=>{const active=b===btn;b.classList.toggle('active',active);b.setAttribute('aria-selected',String(active))});if(dateLabel)dateLabel.hidden=formType!=='appuntamento';if(date)date.required=formType==='appuntamento'}));
const escape=(s)=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let allServices=[],activeId='';
const tabs=$('#service-tabs');
function renderService(id){const s=allServices.find(x=>x.id===id)||allServices[0];if(!s)return;activeId=s.id;
 tabs.querySelectorAll('button').forEach(b=>{const selected=b.dataset.service===s.id;b.classList.toggle('active',selected);b.setAttribute('aria-selected',String(selected));b.tabIndex=selected?0:-1});
 $('#service-number').textContent='/ '+String(allServices.indexOf(s)+1).padStart(2,'0');$('#service-icon').textContent=s.icon||'⌁';$('#service-title').textContent=s.title;$('#service-description').textContent=s.description||'';$('#service-tags').innerHTML=(Array.isArray(s.tags)?s.tags:[]).map(t=>`<li>${escape(t)}</li>`).join('');
 const over=$('.service-overline');if(over)over.textContent=String(allServices.indexOf(s)+1).padStart(2,'0')+' / SPECIALIZZAZIONE';
 }
window.renderServices=(services)=>{const list=(Array.isArray(services)?services:[]).filter(x=>x?.id&&x?.title&&x.archived!==true).sort((a,b)=>(a.order||0)-(b.order||0));
 const publicSelect=$('#service-select');if(publicSelect){const previous=publicSelect.value;publicSelect.replaceChildren(new Option('Seleziona un servizio','Da definire'),...list.map(s=>new Option(s.title,s.title)));publicSelect.value=[...publicSelect.options].some(o=>o.value===previous)?previous:'Da definire'}
 if(!list.length){allServices=[];activeId='';tabs.replaceChildren();$('#service-title').textContent='Servizi in aggiornamento';$('#service-description').textContent='Contattaci per informazioni sulle attività dello studio.';$('#service-tags').replaceChildren();$('#service-icon').textContent='';return}
 const keep=list.some(x=>x.id===activeId)?activeId:list[0].id;allServices=list;
 tabs.innerHTML=allServices.map((s,i)=>`<button type="button" class="service-tab" role="tab" data-service="${escape(s.id)}" aria-selected="false"><span>${String(i+1).padStart(2,'0')}</span> ${escape(s.title)} <span class="tab-arrow">↗</span></button>`).join('');renderService(keep)
};
tabs?.addEventListener('click',e=>{const btn=e.target.closest('[data-service]');if(btn)renderService(btn.dataset.service)});
tabs?.addEventListener('keydown',e=>{if(!['ArrowDown','ArrowUp','ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;const btn=e.target.closest('[data-service]');if(!btn)return;e.preventDefault();const choices=[...tabs.querySelectorAll('[data-service]')],i=choices.indexOf(btn);const dir=e.key==='ArrowDown'||e.key==='ArrowRight'?1:-1;const next=e.key==='Home'?choices[0]:e.key==='End'?choices.at(-1):choices[(i+dir+choices.length)%choices.length];next.focus();renderService(next.dataset.service)});
const cur=$('.cursor-light');if(cur&&!reduced&&matchMedia('(pointer:fine)').matches){addEventListener('pointermove',e=>{cur.style.left=e.clientX+'px';cur.style.top=e.clientY+'px';cur.style.opacity='1'},{passive:true});document.addEventListener('mouseleave',()=>cur.style.opacity='0')}
window.STUDIO_UI_READY=true;
})();
