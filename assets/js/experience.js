/* Immersive editorial runtime. No takeover of normal page scroll. */
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
const hero=document.querySelector('.hero'),heroScenes=[...document.querySelectorAll('[data-hero-scene]')],heroBars=[...document.querySelectorAll('.rail-step')];
const droneSection=document.querySelector('.drone-story'),droneChapters=[...document.querySelectorAll('[data-drone-chapter]')];
const droneAltitude=document.getElementById('drone-alt'),droneNum=document.getElementById('drone-chapter-num'),droneFill=document.getElementById('drone-progress-fill');
let heroIndex=-1,droneIndex=-1,droneProgress=0,threeUpdate=()=>{},renderFrame=()=>{};
/* Drone Lab only: discrete three-stop flight, independent of continuous hover. */
const flightLayer=document.querySelector('.drone-canvas-wrap');
const flightStopsMobile=[{x:.25,y:.245},{x:.79,y:.445},{x:.34,y:.715}];
const flightStopsTablet=[{x:.75,y:.29},{x:.24,y:.49},{x:.71,y:.69}];
const flightStopsDesktop=[{x:.72,y:.30},{x:.25,y:.46},{x:.73,y:.69}];
const flightStops=()=>innerWidth<=760?flightStopsMobile:innerWidth<=1100?flightStopsTablet:flightStopsDesktop;
let flightPose={...flightStops()[0],bank:0};
let flightMotion=null,flightFrame=0;
function flightAt(now=performance.now()){
 if(!flightMotion)return {...flightPose,moving:0};
 const s=flightMotion;
 const t=clamp((now-s.start)/s.duration);
 const eased=t*t*(3-2*t);
 const one=1-eased;
 const x=one*one*s.from.x+2*one*eased*s.control.x+eased*eased*s.to.x;
 const y=one*one*s.from.y+2*one*eased*s.control.y+eased*eased*s.to.y;
 const bank=-Math.sign(s.to.x-s.from.x)*.16*Math.sin(Math.PI*eased);
 if(t>=1){flightPose={...s.to,bank:0};flightMotion=null;return {...flightPose,moving:0}}
 return {x,y,bank,moving:Math.sin(Math.PI*eased)};
}
function flightDraw(p){if(!flightLayer)return;
 flightLayer.style.setProperty('--drone-x',(p.x*100).toFixed(3)+'%');
 flightLayer.style.setProperty('--drone-y',(p.y*100).toFixed(3)+'%');
 flightLayer.style.setProperty('--drone-bank',(p.bank*180/Math.PI).toFixed(2)+'deg');
}
function flightAnimate(now){flightFrame=0;flightDraw(flightAt(now));if(flightMotion)flightFrame=requestAnimationFrame(flightAnimate)}
function droneFlyTo(index){
 const target={...flightStops()[index]};
 if(droneIndex<0||reduced){flightMotion=null;flightPose={...target,bank:0};flightDraw(flightPose);return}
 const start=flightAt(),old=droneIndex;
 // A gentle arc with bank during the crossing; reverse navigation uses the inverse endpoints.
 const control=old===0&&index===1||old===1&&index===0?{x:.52,y:.24}:{x:.51,y:.73};
 flightMotion={from:{x:start.x,y:start.y},to:target,control,start:performance.now(),duration:innerWidth>1100?1700:1050};
 if(!flightFrame)flightFrame=requestAnimationFrame(flightAnimate);
}
addEventListener('resize',()=>{
 if(droneIndex<0)return;
 flightMotion=null;flightPose={...flightStops()[droneIndex],bank:0};flightDraw(flightPose);
},{passive:true});

function progress(section){if(!section)return 0;const rect=section.getBoundingClientRect();return clamp(-rect.top/Math.max(1,rect.height-innerHeight));}
function changeHero(index){if(index===heroIndex)return;heroIndex=index;hero.dataset.scene=index;heroScenes.forEach((el,i)=>{const active=index===i;el.classList.toggle('is-active',active);el.setAttribute('aria-hidden',String(!active));el.inert=!active});heroBars.forEach((el,i)=>el.classList.toggle('active',i===index));const n=document.getElementById('hero-progress-num');if(n)n.textContent=String(index+1).padStart(2,'0')+' / 03'}
function changeDrone(index){if(index===droneIndex)return;droneFlyTo(index);droneIndex=index;droneChapters.forEach((el,i)=>{const on=i===index;el.classList.toggle('is-active',on);el.setAttribute('aria-hidden',String(!on))});if(droneNum)droneNum.textContent=String(index+1).padStart(2,'0')+' / 03'}
/* Hero only: one intentional wheel/touch/key gesture = one complete scene.
   Native sticky positioning remains untouched; the rest of the page scrolls normally. */
let heroSnapActive=false;
let heroSnapFrame=0;
let heroGestureTime=-Infinity;
let heroTouchStart=null;
let heroTouchHandled=false;
let heroLastWheelAt=-Infinity;
const heroSnapDuration=reduced?0:580;
const heroGestureGuard=510;
function heroPositions(){
 const rect=hero.getBoundingClientRect(),top=rect.top+scrollY;
 const pinHeight=hero.querySelector('.hero-sticky').getBoundingClientRect().height;
 const end=Math.max(top,top+rect.height-pinHeight);
 return {top,end,bottom:top+rect.height,anchors:[top,(top+end)/2,end]};
}
function heroSceneAt(y,p){
 const normalized=clamp((y-p.top)/Math.max(1,p.end-p.top));
 return normalized<.25?0:normalized<.75?1:2;
}
function heroSmoothScroll(destination,onDone){
 cancelAnimationFrame(heroSnapFrame);
 const from=scrollY,change=destination-from;
 if(reduced||Math.abs(change)<1){scrollTo({top:destination,behavior:'instant'});onDone();return}
 const started=performance.now();
 function frame(now){
  const t=clamp((now-started)/heroSnapDuration);
  const ease=1-Math.pow(1-t,3);
  scrollTo({top:from+change*ease,behavior:'instant'});
  if(t<1)heroSnapFrame=requestAnimationFrame(frame);
  else{scrollTo({top:destination,behavior:'instant'});onDone()}
 }
 heroSnapFrame=requestAnimationFrame(frame);
}
function heroCanStep(direction){
 if(!hero||!direction)return false;
 const p=heroPositions(),y=scrollY;
 // Keep native scrolling at both section boundaries: snap ONLY between internal scenes.
 if(y<p.top-2||y>p.end+2)return false;
 const current=heroSceneAt(y,p);
 return direction>0?current<2:current>0;
}
function heroStep(direction){
 if(!heroCanStep(direction))return false;
 const p=heroPositions(),target=heroSceneAt(scrollY,p)+direction;
 heroSnapActive=true;
 changeHero(target);
 heroSmoothScroll(p.anchors[target],()=>{heroSnapActive=false;requestPaint()});
 return true;
}
function onHeroWheel(e){
 if(e.ctrlKey||!hero||e.deltaY===0||document.body.classList.contains('menu-open'))return;
 if(e.target.closest('input,textarea,select,[contenteditable="true"]'))return;
 const dir=Math.sign(e.deltaY);
 if(!heroCanStep(dir))return; // Natural entry and exit: do not consume the gesture.
 e.preventDefault();
 const now=performance.now();
 const sameBurst=now-heroLastWheelAt<125;
 heroLastWheelAt=now;
 if(sameBurst||heroSnapActive||now-heroGestureTime<heroGestureGuard)return;
 if(heroStep(dir))heroGestureTime=now;
}
addEventListener('wheel',onHeroWheel,{passive:false});
// Each swipe may change at most one scene, even if the finger travels far.
addEventListener('touchstart',e=>{
 if(e.touches.length!==1||!hero)return;
 const p=heroPositions(),y=scrollY;
 heroTouchStart={y:e.touches[0].clientY,inside:y>=p.top-2&&y<=p.end+2};heroTouchHandled=false;
},{passive:true});
addEventListener('touchmove',e=>{
 if(!heroTouchStart||e.touches.length!==1||!hero||!heroTouchStart.inside)return;
 const dy=e.touches[0].clientY-heroTouchStart.y;
 const dir=dy<0?1:-1;
 if(heroTouchHandled){e.preventDefault();return}
 if(!heroCanStep(dir))return; // Do not hijack a swipe entering or leaving the section.
 e.preventDefault();
 if(Math.abs(dy)<15)return;
 heroTouchHandled=true;
 const now=performance.now();
 if(!heroSnapActive&&now-heroGestureTime>=heroGestureGuard&&heroStep(dir))heroGestureTime=now;
},{passive:false});
addEventListener('touchend',()=>{heroTouchStart=null;heroTouchHandled=false},{passive:true});
addEventListener('touchcancel',()=>{heroTouchStart=null;heroTouchHandled=false},{passive:true});
// Keyboard navigation uses the same scene boundaries as wheel and touch.
addEventListener('keydown',e=>{
 if(e.altKey||e.ctrlKey||e.metaKey||e.shiftKey||e.target.closest('input,textarea,select,button,a,[contenteditable="true"]'))return;
 const dir=['ArrowDown','PageDown',' '].includes(e.key)?1:['ArrowUp','PageUp'].includes(e.key)?-1:0;
 if(!dir)return;
 if(!heroCanStep(dir))return;
 e.preventDefault();
 const now=performance.now();
 if(!heroSnapActive&&now-heroGestureTime>=heroGestureGuard&&heroStep(dir))heroGestureTime=now;
});

/* Drone Lab multi-scroll: a short intentional wheel/swipe/key gesture changes one scene.
   Native sticky section and its entry/exit remain untouched. */
let droneSnapActive=false,droneSnapFrame=0,droneLastGesture=-Infinity,droneLastWheel=-Infinity;
let droneTouchOrigin=null,droneTouchConsumed=false;
const droneScrollDuration=reduced?0:650,droneGestureGuard=500;
function dronePositions(){
 const r=droneSection.getBoundingClientRect(),top=r.top+scrollY;
 const stickyHeight=droneSection.querySelector('.drone-sticky').getBoundingClientRect().height;
 const end=Math.max(top,top+r.height-stickyHeight);
 return {top,end,bottom:top+r.height,anchors:[top,(top+end)/2,end]};
}
function droneSceneAt(y,p){const x=clamp((y-p.top)/Math.max(1,p.end-p.top));return x<.25?0:x<.75?1:2}
function droneAnimateScroll(destination,done){
 cancelAnimationFrame(droneSnapFrame);
 const from=scrollY,diff=destination-from;
 if(reduced||Math.abs(diff)<1){scrollTo({top:destination,behavior:'instant'});done();return}
 const initial=performance.now();
 function step(now){const x=clamp((now-initial)/droneScrollDuration),e=1-Math.pow(1-x,3);
  scrollTo({top:from+diff*e,behavior:'instant'});
  if(x<1)droneSnapFrame=requestAnimationFrame(step);else{scrollTo({top:destination,behavior:'instant'});done()}
 }
 droneSnapFrame=requestAnimationFrame(step);
}
function droneCanControl(dir){
 if(!droneSection||!dir)return false;
 const p=dronePositions(),y=scrollY;
 if(y<p.top-2||y>p.end+2)return false;
 const current=droneSceneAt(y,p);
 return dir>0?current<2:current>0;
}
function droneStep(dir){
 if(!droneCanControl(dir))return false;
 const p=dronePositions(),target=droneSceneAt(scrollY,p)+dir;
 droneSnapActive=true;
 changeDrone(target);
 droneAnimateScroll(p.anchors[target],()=>{droneSnapActive=false;requestPaint()});
 return true;
}
addEventListener('wheel',e=>{
 if(e.ctrlKey||!droneSection||!e.deltaY||document.body.classList.contains('menu-open'))return;
 if(e.target.closest('input,textarea,select,[contenteditable="true"]'))return;
 const dir=Math.sign(e.deltaY);if(!droneCanControl(dir))return;
 e.preventDefault();const now=performance.now(),burst=now-droneLastWheel<125;
 droneLastWheel=now;
 if(burst||droneSnapActive||now-droneLastGesture<droneGestureGuard)return;
 if(droneStep(dir))droneLastGesture=now;
},{passive:false});
addEventListener('touchstart',e=>{
 if(e.touches.length!==1||!droneSection)return;
 const p=dronePositions(),y=scrollY;
 droneTouchOrigin={y:e.touches[0].clientY,inside:y>=p.top-2&&y<=p.end+2};droneTouchConsumed=false;
},{passive:true});
addEventListener('touchmove',e=>{
 if(!droneTouchOrigin||e.touches.length!==1||!droneTouchOrigin.inside)return;
 const dy=e.touches[0].clientY-droneTouchOrigin.y,dir=dy<0?1:-1;
 if(droneTouchConsumed){e.preventDefault();return}
 if(!droneCanControl(dir))return;
 e.preventDefault();if(Math.abs(dy)<13)return;
 droneTouchConsumed=true;const now=performance.now();
 if(!droneSnapActive&&now-droneLastGesture>=droneGestureGuard&&droneStep(dir))droneLastGesture=now;
},{passive:false});
addEventListener('touchend',()=>{droneTouchOrigin=null;droneTouchConsumed=false},{passive:true});
addEventListener('touchcancel',()=>{droneTouchOrigin=null;droneTouchConsumed=false},{passive:true});
addEventListener('keydown',e=>{
 if(e.altKey||e.ctrlKey||e.metaKey||e.shiftKey||e.target.closest('input,textarea,select,button,a,[contenteditable="true"]'))return;
 const dir=['ArrowDown','PageDown',' '].includes(e.key)?1:['ArrowUp','PageUp'].includes(e.key)?-1:0;
 if(!dir||!droneCanControl(dir))return;
 e.preventDefault();const now=performance.now();
 if(!droneSnapActive&&now-droneLastGesture>=droneGestureGuard&&droneStep(dir))droneLastGesture=now;
});
let latestProgress=0;
function paint(){const hp=progress(hero),dp=progress(droneSection);latestProgress=dp;
 if(!heroSnapActive)changeHero(hp<.325?0:hp<.675?1:2);if(!droneSnapActive)changeDrone(dp<.325?0:dp<.675?1:2);
 if(droneFill)droneFill.style.width=(33+dp*67).toFixed(2)+'%';if(droneAltitude)droneAltitude.textContent=String(Math.round(24+dp*110)).padStart(3,'0');
 const topo=document.querySelector('.drone-topo');if(topo&&!reduced)topo.style.transform=`translateY(${Math.round((dp-.5)*75)}px) scale(1.17)`;
 const line=document.querySelector('#method-line-fill'),method=document.querySelector('.method-section');if(line&&method){const r=method.getBoundingClientRect();line.style.transform=`scaleX(${clamp((innerHeight-r.top)/Math.max(1,r.height-innerHeight))})`}
 threeUpdate(dp);}
let queued=false;function requestPaint(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;paint()})}addEventListener('scroll',requestPaint,{passive:true});addEventListener('resize',requestPaint,{passive:true});paint();
/* typing a short technical label without altering the CMS-owned headline */
const overline=document.querySelector('.hero-scene .hero-overline');if(overline&&!reduced){const node=[...overline.childNodes].find(n=>n.nodeType===Node.TEXT_NODE&&n.textContent.trim());if(node){const full=node.textContent.trim();const slot=document.createElement('span');slot.className='hero-typewriter';slot.setAttribute('aria-label',full);node.replaceWith(slot);let i=0;const t=setInterval(()=>{if(i<full.length){slot.textContent=full.slice(0,++i)}else clearInterval(t)},50)}}
/* Input range is accessible by mouse, touch and keyboard. */
const range=document.getElementById('compare-range'),widget=document.getElementById('compare-widget');range?.addEventListener('input',()=>widget?.style.setProperty('--split',range.value+'%'));
/* Lazy-load the 3D drone only when approaching; SVG fallback remains fully usable. */
const stage=document.querySelector('.drone-canvas-wrap'),canvas=document.getElementById('drone-three');
let activated=false;
if(stage&&canvas&&!reduced){const observer=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){observer.disconnect();if(!activated){activated=true;initThree()}}},{rootMargin:'350px 0px',threshold:0});observer.observe(droneSection)}
async function initThree(){let THREE;try{THREE=await import('https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js')}catch(e){console.info('Three.js non disponibile, fallback grafico attivo.');return}
let renderer;try{renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:'low-power'})}catch(e){console.info('WebGL non disponibile, fallback grafico attivo.');return}
const scene=new THREE.Scene();scene.fog=new THREE.FogExp2(0x17272c,.055);const cam=new THREE.PerspectiveCamera(33,1,.1,100);cam.position.set(0,2.4,14.2);cam.lookAt(0,.1,0);
const fill=new THREE.HemisphereLight(0xb9d4d3,0x101719,2.3);scene.add(fill);
const key=new THREE.DirectionalLight(0xffebc8,4);key.position.set(-4,8,6);scene.add(key);const rim=new THREE.DirectionalLight(0x8cbdc7,2.7);rim.position.set(6,4,-5);scene.add(rim);
const mat=(color,metal=.25,rough=.4)=>new THREE.MeshStandardMaterial({color,metalness:metal,roughness:rough});
const graphite=mat(0x27383d,.75,.28),silver=mat(0xc7d1ce,.8,.2),dark=mat(0x0f171a,.5,.3),amber=mat(0xc5ac85,.7,.2),blade=mat(0x95a7a9,.65,.25);
const drone=new THREE.Group();scene.add(drone);
function box(w,h,d,m,where,x=0,y=0,z=0){const obj=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);obj.position.set(x,y,z);where.add(obj);return obj}
function cyl(rt,rb,h,m,where,x,y,z,sides=16){const obj=new THREE.Mesh(new THREE.CylinderGeometry(rt,rb,h,sides),m);obj.position.set(x,y,z);where.add(obj);return obj}
const main=box(2.4,.36,1.08,graphite,drone);main.castShadow=true;box(1.22,.17,1.22,silver,drone,0,.2,0);box(.7,.11,1.45,graphite,drone,0,.28,0);
for(const sx of [-1,1])for(const sz of [-1,1]){
 const arm=box(1.85,.11,.15,silver,drone,sx*1.46,.15,sz*.56);arm.rotation.y=-sz*sx*.21;
 const hub=new THREE.Group();hub.position.set(sx*2.15,.24,sz*1.09);drone.add(hub);
 cyl(.27,.27,.22,graphite,hub,0,0,0);
 const rotor=new THREE.Group();rotor.position.y=.17;hub.add(rotor);const b1=box(1.38,.025,.13,blade,rotor);const b2=box(.13,.025,1.38,blade,rotor);rotors.push(rotor);
 cyl(.14,.14,.06,amber,hub,0,.2,0)
}
const camArm=new THREE.Group();camArm.position.y=-.42;drone.add(camArm);cyl(.22,.22,.4,dark,camArm,0,-.06,0);const sphere=new THREE.Mesh(new THREE.SphereGeometry(.34,22,16),silver);sphere.position.y=-.28;camArm.add(sphere);const lens=new THREE.Mesh(new THREE.CylinderGeometry(.18,.18,.13,20),dark);lens.rotation.x=Math.PI/2;lens.position.set(0,-.26,.32);camArm.add(lens);const eye=new THREE.Mesh(new THREE.CylinderGeometry(.11,.11,.139,24),amber);eye.rotation.x=Math.PI/2;eye.position.set(0,-.26,.41);camArm.add(eye);
const geo=new THREE.PlaneGeometry(36,26,76,64);geo.rotateX(-Math.PI/2);const pos=geo.attributes.position;function elevation(x,z){return .45*Math.sin(x*.37)*Math.cos(z*.21)+.2*Math.sin(x*.82+z*.47)+.15*Math.cos(z*.91)}for(let i=0;i<pos.count;i++){const x=pos.getX(i),z=pos.getZ(i);pos.setY(i,elevation(x,z)-5.25)}geo.computeVertexNormals();const terrain=new THREE.Mesh(geo,new THREE.MeshStandardMaterial({color:0x253e3e,metalness:.1,roughness:.92,wireframe:true,transparent:true,opacity:.36}));scene.add(terrain);
const scan=new THREE.GridHelper(50,46,0x8f8d7b,0x567070);scan.position.y=-5.28;scan.material.transparent=true;scan.material.opacity=.17;scene.add(scan);
renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.26;
let visible=true;const obs=new IntersectionObserver(e=>{visible=e[0]?.isIntersecting??false},{threshold:.01});obs.observe(droneSection);
let w=0,h=0;function resize(){const r=canvas.getBoundingClientRect();const W=Math.max(1,Math.floor(r.width)),H=Math.max(1,Math.floor(r.height));if(W===w&&H===h)return;w=W;h=H;renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.7));renderer.setSize(w,h,false);cam.aspect=w/h;cam.fov=w<640?39:33;cam.updateProjectionMatrix()}
let t=0;threeUpdate=p=>{droneProgress=p};let droneProgress=latestProgress;stage.classList.add('is-three-ready');const clock=new THREE.Clock();
const point=new THREE.Vector3();
// Desktop scene 02: rotate toward the title over the entire existing flight.
let desktopYaw=0,desktopYawFlight=null,desktopYawStart=0;
function frame(){
 requestAnimationFrame(frame);
 if(!visible||document.hidden){clock.getDelta();return}
 resize();const delta=Math.min(.05,clock.getDelta());t+=delta;
 const pose=flightAt(),rect=droneSection.querySelector('.drone-sticky').getBoundingClientRect();
 cam.position.set(0,2.4,14.2);cam.lookAt(0,.1,0);cam.updateMatrixWorld();
 point.set(pose.x*2-1,1-pose.y*2,.5).unproject(cam);
 const ray=point.clone().sub(cam.position).normalize();
 const reach=-cam.position.z/ray.z;
 const world=cam.position.clone().addScaledVector(ray,reach);
 const heading=droneChapters[Math.max(0,droneIndex)]?.querySelector('h2'),box=heading?.getBoundingClientRect();
 const aimX=box?clamp((box.left+box.width*.5-rect.left)/Math.max(1,rect.width)):0.5;
 const aimY=box?clamp((box.top+box.height*.5-rect.top)/Math.max(1,rect.height)):0.54;
 const dx=aimX-pose.x,dy=aimY-pose.y;
 // Maintain the original on-screen apparent size at all three stops (no zoom during flight).
 const worldWidth=5.7,projection=rect.height/(2*Math.tan(THREE.MathUtils.degToRad(cam.fov/2))*cam.position.z);
 const pixels=innerWidth<=760?innerWidth*.72:innerWidth<=1100?innerWidth*.45:Math.min(innerWidth*.47,650);
 drone.scale.setScalar(clamp(pixels/(worldWidth*projection),.3,1.2));
 // Target heading is foreground content. The drone always stays behind its z-index layer.
 const baseYaw=clamp(Math.atan2(dx*rect.width,rect.height*.85),-.68,.68);
 // Desktop: synchronize heading to flight progress instead of turning on the first scroll frame.
 // The turn completes when the drone reaches the next stop; coordinates and hovering are unchanged.
 const desktop=innerWidth>1100;
 const targetYaw=desktop&&droneIndex===1?Math.PI/2:baseYaw;
 let yaw=targetYaw;
 if(desktop){
  if(flightMotion){
   if(desktopYawFlight!==flightMotion){desktopYawFlight=flightMotion;desktopYawStart=desktopYaw}
   const u=clamp((performance.now()-flightMotion.start)/flightMotion.duration);
   const eased=u*u*(3-2*u);
   yaw=desktopYawStart+(targetYaw-desktopYawStart)*eased;
  }else desktopYawFlight=null;
  desktopYaw=yaw;
 }
 drone.position.set(world.x,world.y+Math.sin(t*1.37)*.12+Math.cos(t*.59)*.035,0);
 drone.rotation.set(clamp(-dy*.35,-.2,.2)+Math.sin(t*.8)*.04,
  yaw+Math.sin(t*.35)*.035,
  pose.bank+Math.cos(t*.65)*.055);
 camArm.rotation.y=yaw*.42;camArm.rotation.x=clamp(-dy*.4,-.22,.22);
 rotors.forEach((r,i)=>r.rotation.y+=(i%2?1:-1)*delta*44);
 terrain.position.z=(droneProgress-.5)*3;
 renderer.render(scene,cam)
}
frame();
}
const rotors=[];
