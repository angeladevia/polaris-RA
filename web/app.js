import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
const container=document.querySelector('#scene');
try {
 const renderer=new THREE.WebGLRenderer({antialias:true});
 renderer.setPixelRatio(Math.min(devicePixelRatio,2));
 renderer.outputColorSpace=THREE.SRGBColorSpace;
 renderer.setClearColor(0x000000);
 container.append(renderer.domElement);
 const scene=new THREE.Scene();
 const camera=new THREE.PerspectiveCamera(38,1,.01,100);
 const controls=new OrbitControls(camera,renderer.domElement);
 controls.enableDamping=true;controls.enablePan=false;
 controls.minDistance=1.5;controls.maxDistance=10;
 controls.target.set(0,0,.14);
 function fit(){
  const aspect=container.clientWidth/container.clientHeight;
  const vertical=Math.tan(THREE.MathUtils.degToRad(camera.fov/2));
  const distance=Math.max(.7/vertical,1.15/(vertical*aspect));
  camera.position.set(distance*.24,distance*.12,distance);
  controls.update();
 }
 function resize(){
  renderer.setSize(container.clientWidth,container.clientHeight);
  camera.aspect=container.clientWidth/container.clientHeight;
  camera.updateProjectionMatrix();fit();
 }
 new ResizeObserver(resize).observe(container);resize();
 const loader=new THREE.TextureLoader();
 const textures=await Promise.all(['fondo','estrellas','logo'].map(n=>loader.loadAsync(`assets/${n}.png`)));
 textures.forEach((map,i)=>{
  map.colorSpace=THREE.SRGBColorSpace;map.anisotropy=renderer.capabilities.getMaxAnisotropy();
  const plane=new THREE.Mesh(new THREE.PlaneGeometry(2,2*512/896),new THREE.MeshBasicMaterial({map,transparent:i>0,side:THREE.DoubleSide,depthWrite:i===0,alphaTest:i?0.01:0}));
  plane.position.z=[0,.158,.329][i];plane.renderOrder=i;scene.add(plane);
 });
 container.addEventListener('keydown',e=>{
  if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;
  e.preventDefault();const p=new THREE.Spherical().setFromVector3(camera.position.clone().sub(controls.target));
  p.theta+=e.key==='ArrowLeft'?.12:e.key==='ArrowRight'?-.12:0;
  p.phi+=e.key==='ArrowUp'?-.12:e.key==='ArrowDown'?.12:0;
  p.makeSafe();camera.position.copy(new THREE.Vector3().setFromSpherical(p).add(controls.target));controls.update();
 });
 renderer.setAnimationLoop(()=>{controls.update();renderer.render(scene,camera)});
}catch(error){document.querySelector('#error').hidden=false;console.error(error)}
