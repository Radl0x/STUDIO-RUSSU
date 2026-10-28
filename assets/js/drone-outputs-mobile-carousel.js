/* Drone Lab / Restituzione topografica — carosello mobile 3D.
 * Mantiene i quattro articoli originali nel DOM (accessibilità e SEO).
 * THREE.js governa lo spazio orbitale e disegna una scansione topografica
 * WebGL dietro le schede. In assenza di CDN/WebGL funziona il fallback CSS 3D.
 * Non intercetta mai lo scroll verticale della pagina. */
const grid = document.querySelector('.drone-outputs-grid');
const container = grid?.closest('.drone-outputs-capabilities');
const cards = grid ? [...grid.querySelectorAll('.drone-outputs-tech-card')] : [];
const controls = container?.querySelector('.drone-topo-carousel-controls');
const previous = controls?.querySelector('.drone-topo-prev');
const following = controls?.querySelector('.drone-topo-next');
const counter = controls?.querySelector('.drone-topo-carousel-current');
const media = window.matchMedia('(max-width:760px)');
const reduced = window.matchMedia('(prefers-reduced-motion:reduce)');
let current = 0;
let active = false;
let three = null;
let sceneDrive = () => {};
let launchPending = false;
let pointer = null;
let resizeObserver = null;
const clamp = (v,lo,hi) => Math.max(lo,Math.min(hi,v));

function dimensions(){
  // Dimensioni reali delle schede, inclusi titoli su due o tre righe.
  const cardHeight=Math.max(...cards.map(c=>c.scrollHeight),0);
  grid.style.setProperty('--topo-stage-height',`${Math.ceil(cardHeight+18)}px`);
}
function orbitPosition(offset){
  const w=grid.clientWidth;
  if (three) {
    // Proiezione prospettica reale con le coordinate e la camera di THREE.
    const camera = new three.PerspectiveCamera(50,w/Math.max(grid.clientHeight,1),.1,100);
    camera.position.z=12;
    camera.updateProjectionMatrix();
    const worldWidth=2*12*Math.tan(25*Math.PI/180)*camera.aspect;
    const p=new three.Vector3(Math.sign(offset)*worldWidth*.74,0,-2.4).project(camera);
    return p.x*w/2;
  }
  return Math.sign(offset)*w*.62; // Fallback deterministico senza WebGL.
}
function show(index){
  current=clamp(index,0,cards.length-1);
  if (!active)return;
  cards.forEach((card,i)=>{
    const d=i-current,near=Math.abs(d)===1,front=d===0;
    const x=front?0:near?orbitPosition(d):Math.sign(d)*grid.clientWidth*1.3;
    const angle=front?0:d<0?37:-37;
    const size=front?1:.81;
    card.style.transform=`translate3d(calc(-50% + ${x.toFixed(2)}px),0,0) rotateY(${angle}deg) scale(${size})`;
    card.style.opacity=front?'1':near?'0.52':'0';
    card.style.filter=front?'none':near?'brightness(.72)':'brightness(.55)';
    card.style.zIndex=String(front?4:near?2:1);
    card.style.pointerEvents=front?'auto':'none';
    card.dataset.topoActive=String(front);
    card.setAttribute('aria-hidden',String(!front));
    card.inert=!front;
  });
  previous.disabled=current===0;
  following.disabled=current===cards.length-1;
  counter.textContent=String(current+1).padStart(2,'0');
  sceneDrive(current);
}
function navigate(delta){show(current+delta)}
function activate(){
  if(active||!media.matches||!grid||cards.length!==4)return;
  active=true;
  grid.classList.add('is-topo-carousel');
  grid.setAttribute('role','region');
  grid.setAttribute('aria-label','Quattro restituzioni topografiche: scorri lateralmente o usa le frecce');
  grid.tabIndex=0;
  dimensions();show(current);
  resizeObserver = new ResizeObserver(()=>{if(active){dimensions();show(current)}});
  cards.forEach(card=>resizeObserver.observe(card));
  ensureThree();
}
function deactivate(){
  if(!active)return;
  active=false;
  if(resizeObserver){resizeObserver.disconnect();resizeObserver=null}
  grid.classList.remove('is-topo-carousel');
  grid.removeAttribute('role');grid.removeAttribute('aria-label');grid.removeAttribute('tabindex');
  grid.style.removeProperty('--topo-stage-height');
  cards.forEach(card=>{
    for(const prop of ['transform','opacity','filter','z-index','pointer-events'])card.style.removeProperty(prop);
    card.removeAttribute('aria-hidden');card.removeAttribute('data-topo-active');card.inert=false;
  });
  if(threeCanvas)threeCanvas.style.display='none';
}
previous?.addEventListener('click',()=>navigate(-1));
following?.addEventListener('click',()=>navigate(1));
grid?.addEventListener('keydown',event=>{
  if(!active)return;
  const dir=event.key==='ArrowRight'?1:event.key==='ArrowLeft'?-1:0;
  if(dir){event.preventDefault();navigate(dir)}
});
grid?.addEventListener('pointerdown',event=>{
  if(!active||event.button!==0)return;
  pointer={x:event.clientX,y:event.clientY,time:performance.now()};
});
grid?.addEventListener('pointerup',event=>{
  if(!active||!pointer)return;
  const dx=event.clientX-pointer.x,dy=event.clientY-pointer.y;
  const start=pointer;pointer=null;
  if(Math.abs(dx)>42&&Math.abs(dx)>Math.abs(dy)*1.25&&performance.now()-start.time<1250)navigate(dx<0?1:-1);
});
grid?.addEventListener('pointercancel',()=>{pointer=null});
media.addEventListener('change',()=>media.matches?activate():deactivate());
if(media.matches)activate();

// Scena di rilevamento Three.js, indipendente dal Three.js del drone.
let threeCanvas=null;
let visible=false,animationId=0,renderer=null,scan=null,terrain=null,camera=null;
let target=0,blend=0;
async function ensureThree(){
  if(launchPending||three||!active||reduced.matches)return;
  launchPending=true;
  // Caricamento solo quando il carosello entra nel campo visivo.
  if(!('IntersectionObserver' in window))return loadThree();
  const observer=new IntersectionObserver(entries=>{
    if(!entries.some(e=>e.isIntersecting))return;
    observer.disconnect();loadThree();
  },{rootMargin:'180px'});
  observer.observe(grid);
}
async function loadThree(){
  if(!active||reduced.matches)return;
  try{
    three=await import('https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js');
    if(!active)return;
    dimensions();show(current);
    startWebGL();
  }catch{
    // I controlli e le trasformazioni 3D CSS rimangono funzionanti.
    three=null;
  }
}
function startWebGL(){
  threeCanvas=document.createElement('canvas');
  threeCanvas.className='drone-topo-three-backdrop';
  threeCanvas.setAttribute('aria-hidden','true');
  grid.insertBefore(threeCanvas,grid.firstChild);
  try{renderer=new three.WebGLRenderer({canvas:threeCanvas,alpha:true,antialias:false,powerPreference:'low-power'})}
  catch{threeCanvas.remove();threeCanvas=null;return}
  renderer.setClearColor(0x000000,0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.35));
  const scene=new three.Scene();
  camera=new three.PerspectiveCamera(46,1,.1,80);
  camera.position.set(0,5.8,10.2);camera.lookAt(0,0,0);
  terrain=new three.Group();scene.add(terrain);
  const cols=33,rows=19,vertices=[],colsRGB=[];
  const dark=new three.Color(0x5b999b),light=new three.Color(0xc3a778);
  for(let z=0;z<rows;z++)for(let x=0;x<cols;x++){
    const X=(x/(cols-1)-.5)*12,Z=(z/(rows-1)-.5)*8;
    const Y=Math.sin(X*.7)*Math.cos(Z*.67)*.6+Math.sin(X*.29+Z*.73)*.27;
    vertices.push(X,Y,Z);
    const col=dark.clone().lerp(light,(Y+1)/2);colsRGB.push(col.r,col.g,col.b);
  }
  const geo=new three.BufferGeometry();
  geo.setAttribute('position',new three.Float32BufferAttribute(vertices,3));
  geo.setAttribute('color',new three.Float32BufferAttribute(colsRGB,3));
  terrain.add(new three.Points(geo,new three.PointsMaterial({vertexColors:true,size:.042,transparent:true,opacity:.75,depthWrite:false})));
  const ring=new three.Mesh(new three.RingGeometry(3.8,3.82,100),new three.MeshBasicMaterial({color:0xb8a080,transparent:true,opacity:.36,side:three.DoubleSide,depthWrite:false}));
  ring.rotation.x=-Math.PI/2;ring.position.y=-1.2;terrain.add(ring);
  scan=new three.Mesh(new three.PlaneGeometry(12,.045),new three.MeshBasicMaterial({color:0xd8c09b,transparent:true,opacity:.62,side:three.DoubleSide,depthWrite:false}));
  scan.rotation.x=-Math.PI/2;scan.position.y=1.3;terrain.add(scan);
  sceneDrive=index=>{target=index};sceneDrive(current);
  let last=0,width=0,height=0;
  function frame(now){
    animationId=0;if(!active||!visible||document.hidden)return;
    const w=grid.clientWidth,h=grid.clientHeight;
    if(w!==width||h!==height){width=w;height=h;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix()}
    blend+=(target-blend)*.037;
    terrain.rotation.y=blend*.31+Math.sin(now*.0003)*.025;
    terrain.rotation.z=Math.sin(now*.00025)*.045;
    scan.position.z=Math.sin(now*.00055+blend)*3.8;
    scan.material.opacity=.3+.21*(Math.sin(now*.0015)**2);
    renderer.render(scene,camera);last=now;
    animationId=requestAnimationFrame(frame);
  }
  function manageVisibility(){
    visible=active&&media.matches&&grid.getBoundingClientRect().bottom>0&&grid.getBoundingClientRect().top<innerHeight;
    if(threeCanvas)threeCanvas.style.display=visible?'block':'none';
    if(visible&&!animationId&&!document.hidden)animationId=requestAnimationFrame(frame);
  }
  window.addEventListener('scroll',manageVisibility,{passive:true});
  window.addEventListener('resize',manageVisibility,{passive:true});
  document.addEventListener('visibilitychange',manageVisibility);
  manageVisibility();
}
