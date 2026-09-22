import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
const $=s=>document.querySelector(s), container=$('#scene'), status=$('#status');
const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.outputColorSpace=THREE.SRGBColorSpace;container.append(renderer.domElement);
const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(38,1,.01,100),group=new THREE.Group();scene.add(group);
const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.enablePan=false;controls.minDistance=2.2;controls.maxDistance=8;controls.minPolarAngle=.35;controls.maxPolarAngle=2.8;
const loader=new THREE.TextureLoader();const meshes=[];let textures=[];
function reset(){camera.position.set(.9,.52,3.2);controls.target.set(0,0,.12);controls.update()}
function resize(){const w=container.clientWidth,h=container.clientHeight;renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix()}
function depth(){const n=Number($('#depth').value)/100;$('#depth-value').value=`${Math.round(n*100)}%`;if(meshes.length){meshes[1].position.z=.015+n*.22;meshes[2].position.z=.03+n*.46;}}
$('#depth').addEventListener('input',depth);$('#reset').addEventListener('click',reset);new ResizeObserver(resize).observe(container);reset();renderer.setAnimationLoop(()=>{controls.update();renderer.render(scene,camera)});
try{textures=await Promise.all(['fondo','estrellas','logo'].map(n=>loader.loadAsync(`assets/${n}.png`)));textures.forEach((t,i)=>{t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=renderer.capabilities.getMaxAnisotropy();const m=new THREE.Mesh(new THREE.PlaneGeometry(2,2*512/896),new THREE.MeshBasicMaterial({map:t,transparent:i>0,side:THREE.DoubleSide,depthWrite:i===0,alphaTest:i?0.01:0}));m.renderOrder=i;group.add(m);meshes.push(m)});depth();status.textContent='';}catch(e){status.textContent='No pudimos cargar las imágenes. Recarga la página para intentarlo de nuevo.';console.error(e)}
container.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;e.preventDefault();const o=new THREE.Spherical().setFromVector3(camera.position.clone().sub(controls.target));o.theta+=e.key==='ArrowLeft'?.12:e.key==='ArrowRight'?-.12:0;o.phi+=e.key==='ArrowUp'?-.12:e.key==='ArrowDown'?.12:0;o.makeSafe();camera.position.copy(new THREE.Vector3().setFromSpherical(o).add(controls.target));controls.update()});
async function targetCanvas(){const c=document.createElement('canvas');c.width=896;c.height=512;const ctx=c.getContext('2d');for(const t of textures)ctx.drawImage(t.image,0,0);return c;}
$('#target').onclick=async()=>{const c=await targetCanvas();const a=document.createElement('a');a.download='Polaris-cartel.png';a.href=c.toDataURL('image/png');a.click()};


let arSession=null, arStarting=false, arToken=0;
const overlay=$('#ar-overlay'),arStatus=$('#ar-status');
function stopSession(s){if(!s)return;s.renderer.setAnimationLoop(null);s.controller?.stopProcessVideo();s.video?.srcObject?.getTracks().forEach(t=>t.stop());s.video?.remove();}
function closeAR(){arToken++;overlay.hidden=true;document.body.style.overflow='';stopSession(arSession);$('#ar').disabled=arStarting;$('#ar').focus();}
$('#close-ar').onclick=closeAR;
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!overlay.hidden)closeAR()});
window.addEventListener('pagehide',()=>stopSession(arSession));
document.addEventListener('visibilitychange',()=>{if(document.hidden&&!overlay.hidden)closeAR()});
$('#ar').onclick=async()=>{
 if(arStarting||textures.length!==3)return;
 if(!isSecureContext||!navigator.mediaDevices?.getUserMedia){status.textContent='Abre esta página en Safari o Chrome con una conexión segura para usar la cámara.';return;}
 const token=++arToken;arStarting=true;$('#ar').disabled=true;overlay.hidden=false;document.body.style.overflow='hidden';arStatus.textContent='Cargando realidad aumentada…';$('#close-ar').focus();
 try{
  const {MindARThree}=await import('https://cdn.jsdelivr.net/npm/mind-ar@1.2.5/dist/mindar-image-three.prod.js');
  if(token!==arToken)return;
  if(!arSession){
   arSession=new MindARThree({container:$('#ar-scene'),imageTargetSrc:'assets/targets.mind',maxTrack:1,uiLoading:'no',uiScanning:'no',uiError:'no',warmupTolerance:5,missTolerance:10});
   arSession.renderer.setPixelRatio(Math.min(devicePixelRatio,2));
   const anchor=arSession.addAnchor(0);
   // The opaque background covers the printed artwork; the two transparent layers float above it.
   textures.forEach((texture,i)=>{const mesh=new THREE.Mesh(new THREE.PlaneGeometry(1,512/896),new THREE.MeshBasicMaterial({map:texture,transparent:i>0,side:THREE.DoubleSide,depthWrite:i===0,alphaTest:i?0.01:0}));mesh.position.z=[.001,.08,.18][i];mesh.renderOrder=i;anchor.group.add(mesh)});
   anchor.onTargetFound=()=>{arStatus.textContent='Cartel encontrado · Muévete para ver la profundidad';};
   anchor.onTargetLost=()=>{arStatus.textContent='Apunta al cartel completo, con buena iluminación';};
  }
  arStatus.textContent='Permite la cámara para continuar…';
  await arSession.start();
  if(token!==arToken){stopSession(arSession);return;}
  arStatus.textContent='Apunta al cartel completo, con buena iluminación';
  arSession.renderer.setAnimationLoop(()=>arSession.renderer.render(arSession.scene,arSession.camera));
 }catch(error){
  console.error(error);stopSession(arSession);
  if(token===arToken){overlay.hidden=true;document.body.style.overflow='';status.textContent='No se pudo iniciar la cámara. Revisa sus permisos, cierra otras aplicaciones que la usen y vuelve a intentarlo en Safari o Chrome.';$('#ar').focus();}
 }finally{arStarting=false;$('#ar').disabled=false;}
};
const context=document.modelContext;
if(context?.registerTool){try{Promise.resolve(context.registerTool({name:'set_depth',title:'Ajustar profundidad',description:'Ajusta la separación de las capas de Polaris en la vista 3D.',inputSchema:{type:'object',properties:{percent:{type:'number',minimum:0,maximum:100}},required:['percent'],additionalProperties:false},annotations:{readOnlyHint:false},execute:({percent})=>{if(typeof percent!=='number'||!Number.isFinite(percent)||percent<0||percent>100)throw new Error('La profundidad debe estar entre 0 y 100.');$('#depth').value=percent;depth();return{percent:Number($('#depth').value)}}})).catch(()=>{});}catch{}}
