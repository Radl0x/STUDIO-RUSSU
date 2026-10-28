/* Studio Russu / Mobile menu: subtle, low-cost topographic Three.js background.
   Loaded on first menu opening; never affects page sections or other Three.js scenes. */
const canvas=document.getElementById('mobile-menu-three');
const backdrop=canvas?.closest('.mobile-nav-backdrop');
const motion=matchMedia('(prefers-reduced-motion: reduce)');
let active=false,loading=null,ready=false,renderer=null,scene=null,camera=null,terrain=null,scan=null;
let lastFrame=0,raf=0;
function resize(){if(!renderer||!canvas||!camera)return;
 const w=Math.max(1,canvas.clientWidth),h=Math.max(1,canvas.clientHeight);
 renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}
function tick(now){raf=0;
 if(!active||document.hidden||!ready)return;
 raf=requestAnimationFrame(tick);
 if(now-lastFrame<42)return; // ~24fps: intentional low-power limit
 const dt=now/1000;
 if(terrain){terrain.rotation.z=Math.sin(dt*.12)*.025;terrain.rotation.y=-.20+Math.sin(dt*.15)*.065}
 if(scan){scan.position.y=-2.25+((dt*.35)%4.5);scan.material.opacity=.11+Math.sin(dt*1.2)*.045}
 renderer.render(scene,camera);lastFrame=now;
}
async function ensure(){
 if(ready||loading||!canvas||motion.matches)return loading;
 loading=(async()=>{
   let THREE;
   try{THREE=await import('https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js')}catch{return}
   if(!active){loading=null;return}
   try{
     renderer=new THREE.WebGLRenderer({canvas,antialias:false,alpha:true,powerPreference:'low-power'});
     renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.2));
     scene=new THREE.Scene();
     camera=new THREE.PerspectiveCamera(39,1,.1,80);
     camera.position.set(0,4.3,14.5);camera.lookAt(1.6,-.25,0);
     const group=new THREE.Group();group.position.set(2.5,-.25,0);scene.add(group);
     // Layered wire terrain: modest geometry count, no textures, no shadow calculations.
     const geometry=new THREE.PlaneGeometry(12,10,36,24);geometry.rotateX(-Math.PI/2);
     const pos=geometry.getAttribute('position');
     for(let i=0;i<pos.count;i++){
       const x=pos.getX(i),z=pos.getZ(i);
       pos.setY(i,Math.sin(x*.66)*.42+Math.cos(z*.88)*.32+Math.sin((x+z)*.54)*.36);
     }
     pos.needsUpdate=true;
     const wire=new THREE.WireframeGeometry(geometry);
     terrain=new THREE.LineSegments(wire,new THREE.LineBasicMaterial({color:0x95b6ac,transparent:true,opacity:.22,depthWrite:false}));
     terrain.rotation.set(.05,0,-.12);group.add(terrain);
     const positions=[];
     for(let i=0;i<165;i++){
       const x=(Math.random()-.5)*12,z=(Math.random()-.5)*10;
       positions.push(x,Math.sin(x*.66)*.42+Math.cos(z*.88)*.32+Math.sin((x+z)*.54)*.36,z);
     }
     const points=new THREE.BufferGeometry();points.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
     group.add(new THREE.Points(points,new THREE.PointsMaterial({color:0xc6ab83,size:.04,transparent:true,opacity:.44,depthWrite:false})));
     const scanMat=new THREE.LineBasicMaterial({color:0xd8bd94,transparent:true,opacity:.13,depthWrite:false});
     const scanGeom=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-6,0,0),new THREE.Vector3(6,0,0)]);
     scan=new THREE.Line(scanGeom,scanMat);group.add(scan);
     resize();backdrop?.classList.add('has-three');ready=true;
   }catch{
     renderer?.dispose();renderer=null;
     backdrop?.classList.remove('has-three');
   }
 })();
 return loading;
}
export function open(){active=true;if(motion.matches||document.hidden)return;
 if(ready){resize();if(!raf)raf=requestAnimationFrame(tick)}
 else ensure().then(()=>{if(active&&!document.hidden&&ready&&!raf){resize();raf=requestAnimationFrame(tick)}});
}
export function close(){active=false;if(raf){cancelAnimationFrame(raf);raf=0}}
addEventListener('resize',resize,{passive:true});
document.addEventListener('visibilitychange',()=>{if(document.hidden)closeFrame();else if(active&&ready&&!raf)raf=requestAnimationFrame(tick)});
function closeFrame(){if(raf){cancelAnimationFrame(raf);raf=0}}
canvas?.addEventListener('webglcontextlost',e=>{e.preventDefault();closeFrame();ready=false;backdrop?.classList.remove('has-three')});
