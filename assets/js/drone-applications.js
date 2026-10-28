/* DRONE LAB / APPLICAZIONI: three discrete, reversible horizontal scenes.
   Independent from the original Hero and Drone Lab Three.js controllers. */
const section = document.getElementById('drone-applications');
const track = document.getElementById('app-scene-track');
const pin = section?.querySelector('.drone-outputs-app-pin');
const cards = section ? [...section.querySelectorAll('[data-app-scene]')] : [];
const bars = section ? [...section.querySelectorAll('.app-hud-bars i')] : [];
const counter = document.getElementById('app-scene-counter');
const motionReduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const clamp = (x, lo=0, hi=1) => Math.max(lo, Math.min(hi, x));
let active = 0;
let settling = false;
let scrollingFrame = 0;
let lastGesture = -Infinity;
let lastWheel = -Infinity;
let touchStart = null;
let touchUsed = false;
let setTerrainScene = () => {};
const moveDuration = motionReduced ? 0 : 850;
const guardTime = motionReduced ? 240 : 675;

function geometry() {
  const r=section.getBoundingClientRect();
  const top=window.scrollY+r.top;
  const stay=Math.max(1,r.height-pin.getBoundingClientRect().height);
  return {top,end:top+stay,bottom:top+r.height,anchors:[top,top+stay/2,top+stay]};
}
function sceneFromScroll(pos,g){
  const f=clamp((pos-g.top)/Math.max(1,g.end-g.top));
  return f<.25?0:f<.75?1:2;
}
function display(index){
  active=clamp(index,0,2);
  track.style.setProperty('--app-index',String(active));
  cards.forEach((el,i)=>{
    const current=i===active;
    el.setAttribute('aria-hidden',String(!current));
    el.inert=!current;
  });
  bars.forEach((bar,i)=>bar.classList.toggle('is-active',i===active));
  if(counter)counter.textContent=String(active+1).padStart(2,'0')+' / 03';
  setTerrainScene(active);
}
function smoothTo(destination,finish){
  cancelAnimationFrame(scrollingFrame);
  const from=scrollY,diff=destination-from;
  if(motionReduced||Math.abs(diff)<1){window.scrollTo({top:destination,behavior:'instant'});finish();return}
  const start=performance.now();
  function paint(now){
    const t=clamp((now-start)/moveDuration);
    const easing=t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
    window.scrollTo({top:from+diff*easing,behavior:'instant'});
    if(t<1)scrollingFrame=requestAnimationFrame(paint);
    else{window.scrollTo({top:destination,behavior:'instant'});finish()}
  }
  scrollingFrame=requestAnimationFrame(paint);
}
function allowed(dir){
  if(!section||document.body.classList.contains('menu-open')||!dir)return false;
  const y=scrollY,g=geometry();
  // The browser owns entry/exit. Only scene-to-scene motion is intercepted.
  if(y<g.top-2||y>g.end+2)return false;
  const index=sceneFromScroll(y,g);
  return dir>0?index<2:index>0;
}
function next(dir){
  if(settling||!allowed(dir))return false;
  const g=geometry(),index=sceneFromScroll(scrollY,g)+dir;
  settling=true;
  display(index);
  smoothTo(g.anchors[index],()=>{settling=false});
  return true;
}
// Continuous wheel packets from one touchpad gesture are not separate scene changes.
window.addEventListener('wheel',event=>{
  if(!section||!event.deltaY||event.ctrlKey||event.metaKey||!allowed(Math.sign(event.deltaY)))return;
  if(event.target.closest('input,textarea,select,[contenteditable="true"]'))return;
  event.preventDefault();
  const now=performance.now(),burst=now-lastWheel<145;
  lastWheel=now;
  if(burst||settling||now-lastGesture<guardTime)return;
  if(next(Math.sign(event.deltaY)))lastGesture=now;
},{passive:false});
window.addEventListener('touchstart',event=>{
  if(event.touches.length!==1||!section)return;
  const g=geometry(),y=scrollY;
  touchStart={y:event.touches[0].clientY,inside:y>=g.top-2&&y<=g.end+2};touchUsed=false;
},{passive:true});
window.addEventListener('touchmove',event=>{
  if(!touchStart||event.touches.length!==1||!touchStart.inside)return;
  const delta=event.touches[0].clientY-touchStart.y;
  const dir=delta<0?1:-1;
  if(touchUsed){event.preventDefault();return}
  if(!allowed(dir))return; // Swipes crossing into or out of the section stay native.
  event.preventDefault();
  if(Math.abs(delta)<13)return;
  touchUsed=true;
  const now=performance.now();
  if(!settling&&now-lastGesture>=guardTime&&next(dir))lastGesture=now;
},{passive:false});
for(const name of ['touchend','touchcancel'])window.addEventListener(name,()=>{touchStart=null;touchUsed=false},{passive:true});
window.addEventListener('keydown',event=>{
  if(!section||event.altKey||event.ctrlKey||event.metaKey||event.shiftKey)return;
  if(event.target.closest('input,textarea,select,button,a,[contenteditable="true"]'))return;
  const dir=['ArrowDown','PageDown',' '].includes(event.key)?1:['ArrowUp','PageUp'].includes(event.key)?-1:0;
  if(!allowed(dir))return;
  event.preventDefault();
  const now=performance.now();
  if(!settling&&now-lastGesture>=guardTime&&next(dir))lastGesture=now;
});
// Restores a consistent scene when loading/reloading at a saved scroll position.
function alignOnEntry(){
  if(settling)return;
  const g=geometry(),y=scrollY;
  if(y>=g.top-2&&y<=g.end+2)display(sceneFromScroll(y,g));
}
display(0);
window.addEventListener('pageshow',alignOnEntry);
window.addEventListener('resize',alignOnEntry,{passive:true});
window.addEventListener('scroll',alignOnEntry,{passive:true});

/* Lightweight procedural aerial-terrain scan — an independent Three.js canvas.
   Lazy loaded; invisible/offscreen WebGL is paused. The CSS topography remains if unavailable. */
const canvas=document.getElementById('app-terrain-three');
if(canvas&&!motionReduced&&'IntersectionObserver' in window){
 let started=false;
 const load=new IntersectionObserver(entries=>{
   if(!entries.some(e=>e.isIntersecting)||started)return;
   started=true;load.disconnect();
   startTerrain().catch(()=>{/* Original photography and CSS fallback stay visible. */});
 },{rootMargin:'240px 0px',threshold:0});
 load.observe(pin);
}
async function startTerrain(){
 const THREE=await import('https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js');
 let renderer;
 try{renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true,powerPreference:'low-power'})}
 catch{return}
 renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.55));
 renderer.setClearColor(0x000000,0);
 const scene=new THREE.Scene();
 const camera=new THREE.PerspectiveCamera(47,1,.1,80);
 camera.position.set(3.5,7.0,12.3);camera.lookAt(0,-.5,0);
 const terrain=new THREE.Group();scene.add(terrain);
 const rows=37,cols=62;
 const at=(x,z)=>.65*Math.sin(x*.68)*Math.cos(z*.75)+.33*Math.sin(x*1.23+z*.36)+.21*Math.cos(z*1.4-x*.28);
 const positions=[],colors=[];
 const light=new THREE.Color(0xc5ac85),dark=new THREE.Color(0x4b8a92);
 for(let iz=0;iz<rows;iz++)for(let ix=0;ix<cols;ix++){
   const x=(ix/(cols-1)-.5)*11.5,z=(iz/(rows-1)-.5)*7.1;
   const y=at(x,z);
   positions.push(x,y,z);
   const c=dark.clone().lerp(light,clamp((y+1.4)/2.8));colors.push(c.r,c.g,c.b);
 }
 const dotGeometry=new THREE.BufferGeometry();
 dotGeometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
 dotGeometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
 const dots=new THREE.Points(dotGeometry,new THREE.PointsMaterial({size:.043,vertexColors:true,transparent:true,opacity:.86,depthWrite:false}));terrain.add(dots);
 const wires=new THREE.PlaneGeometry(11.5,7.1,61,36);wires.rotateX(-Math.PI/2);
 const vs=wires.attributes.position;
 for(let n=0;n<vs.count;n++)vs.setY(n,at(vs.getX(n),vs.getZ(n)));
 wires.computeVertexNormals();
 const mesh=new THREE.Mesh(wires,new THREE.MeshBasicMaterial({color:0x729d9c,wireframe:true,opacity:.19,transparent:true,depthWrite:false}));
 terrain.add(mesh);
 const scanLine=new THREE.Mesh(new THREE.PlaneGeometry(11.5,.08),new THREE.MeshBasicMaterial({color:0xf0d5a1,transparent:true,opacity:.65,side:THREE.DoubleSide,depthWrite:false}));
 scanLine.rotation.x=-Math.PI/2;scanLine.position.y=1.5;terrain.add(scanLine);
 const horizon=new THREE.Mesh(new THREE.RingGeometry(2.45,2.47,112),new THREE.MeshBasicMaterial({color:0xe0c39b,transparent:true,opacity:.15,side:THREE.DoubleSide,depthWrite:false}));
 horizon.rotation.x=-Math.PI/2;horizon.position.y=-.82;terrain.add(horizon);
 let shown=false,frameId=0,last=0,w=0,h=0,target=active,blend=active;
 let mouseX=0,mouseY=0;
 setTerrainScene=index=>{target=index};
 function resize(){
  const rect=canvas.getBoundingClientRect();
  const W=Math.max(1,Math.floor(rect.width)),H=Math.max(1,Math.floor(rect.height));
  if(W===w&&H===h)return;
  w=W;h=H;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();
 }
 function animate(time){
  if(!shown||document.hidden){frameId=0;return}
  frameId=requestAnimationFrame(animate);
  const dt=Math.min(.05,Math.max(.001,(time-last)/1000||.016));last=time;
  resize();blend+=(target-blend)*Math.min(1,dt*1.6);
  const phase=time*.00034;
  terrain.rotation.y=-.22+blend*.23+Math.sin(phase)*.034+mouseX*.08;
  terrain.rotation.z=-.08+Math.sin(phase*.6)*.015;
  terrain.rotation.x=.08+mouseY*.04;
  terrain.position.x=Math.sin(blend*Math.PI*.48)*-.43;
  scanLine.position.z=((time*.00088+blend*1.25)%7.5)-3.75;
  scanLine.material.opacity=.3+.25*Math.sin(phase*3)**2;
  dots.material.opacity=.72+.13*Math.sin(phase*2)**2;
  renderer.render(scene,camera);
 }
 const observe=new IntersectionObserver(entries=>{
  const on=entries.some(e=>e.isIntersecting);
  shown=on;
  if(on&&!frameId){last=performance.now();frameId=requestAnimationFrame(animate)}
 },{threshold:.03});observe.observe(pin);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden&&shown&&!frameId){last=performance.now();frameId=requestAnimationFrame(animate)}});
 pin.addEventListener('pointermove',e=>{
  const r=pin.getBoundingClientRect();mouseX=clamp((e.clientX-r.left)/r.width,-.2,1.2)-.5;
  mouseY=clamp((e.clientY-r.top)/r.height,-.2,1.2)-.5;
 },{passive:true});
 window.addEventListener('resize',resize,{passive:true});
 resize();
}
