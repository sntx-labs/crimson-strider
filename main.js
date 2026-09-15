import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import { StriderRig } from './motion.js';
import { sourceSteel } from './steel.js';

const defaults = {
  tracking: true, trackingStrength: 1, bodyTurnRange: 37, pitchLimit: 2, rollLimit: 1,
  leanLimit: 0.08, smoothing: 10, legResponse: 1.45, stanceAllowance: 0.08, motionMode: 'Cursor', paused: false,
  stanceEnabled: true, turnDuration: 3.6, stepThreshold: 14,
  cableMotion: true, cableStiffness: 10.5, cableDamping: 4.5, cableGravity: 1, cableResponse: 1.8,
  cameraView: 'Hero', cameraYaw: 0, cameraElevation: 0, framing: 1, frameHeight: 6, horizontalShift: 0,
  exposure: 1, keyLight: 9, rimLight: 5, fillLight: 0.16, environmentLight: 0.2, stageBounce: 0.5,
  armorBrightness: 1, roughness: 1, metalness: 1, lampIntensity: 1,
  stageColor: '#c81619', stageShade: 0.4, reflection: 0.15, reflectionBlur: 0.008,
  shadowOpacity: 0.3, resolution: 1.5, shadows: true, reflections: true
};
const query = new URLSearchParams(location.search);
const settingsKey = 'crimson-strider-settings-v1';
let saved = {};
if (!query.has('fresh')) { try { saved = JSON.parse(localStorage.getItem(settingsKey) || '{}'); } catch {} }
const settings = Object.assign({}, defaults, Object.fromEntries(Object.entries(saved).filter(([k,v]) => k in defaults && typeof v === typeof defaults[k])));
const sceneEl = document.querySelector('#scene'), panelEl = document.querySelector('#controls');
if (query.has('clean')) sessionStorage.setItem('sh-panel-collapsed','true');
const panel = new window.SHPanel(panelEl);
const heading = document.createElement('h1'); heading.className = 'entry-heading'; heading.textContent = 'Crimson Strider';
const status = document.createElement('p'); status.className = 'entry-status'; status.textContent = 'Loading sculpture…';
panel._body.prepend(heading, status);
const bindings = [];
function persist() { try { localStorage.setItem(settingsKey, JSON.stringify(settings)); } catch {} }
function bind(folder, type, key, opts = {}) {
  const control = folder[type](settings,key,opts).on('change', () => { persist(); applySettings(); });
  if (control._input) control._input.setAttribute('aria-label', opts.label || key);
  bindings.push([key,control]); return control;
}
function slider(folder,key,label,min,max,step) { return bind(folder,'slider',key,{label,min,max,step}); }
const fileFolder = panel.folder('Session');
fileFolder.button('Copy JSON', copySettings);
fileFolder.button('Reset all', reset);
bind(fileFolder,'toggle','paused',{label:'Pause motion'});
const stanceFolder = panel.folder('Body and feet');
bind(stanceFolder,'toggle','stanceEnabled',{label:'Feet follow body'});
slider(stanceFolder,'turnDuration','Stepping pace (s)',2.4,6,.1);
slider(stanceFolder,'stepThreshold','Step threshold (°)',6,24,1);
const motionFolder = panel.folder('Attention');
bind(motionFolder,'select','motionMode',{label:'Behavior', options:['Cursor','Study','Still']});
bind(motionFolder,'toggle','tracking',{label:'Follow pointer'});
slider(motionFolder,'trackingStrength','Tracking strength',0,1.5,.01);
slider(motionFolder,'bodyTurnRange','Body turn range (°)',20,45,1);
slider(motionFolder,'pitchLimit','Pitch limit (°)',0,2,.1);
slider(motionFolder,'rollLimit','Roll limit (°)',0,1,.05);
slider(motionFolder,'leanLimit','Body lean (m)',0,.08,.005);
slider(motionFolder,'smoothing','Response speed',.8,10,.1);
slider(motionFolder,'legResponse','Leg response',.2,1.5,.05);
slider(motionFolder,'stanceAllowance','Stance adjustment (m)',0,.08,.005);
const cableFolder = panel.folder('Cable motion',{expanded:false});
bind(cableFolder,'toggle','cableMotion',{label:'Secondary motion'});
slider(cableFolder,'cableStiffness','Stiffness',5,40,.5);
slider(cableFolder,'cableDamping','Damping',1,12,.1);
slider(cableFolder,'cableGravity','Gravity',0,2,.05);
slider(cableFolder,'cableResponse','Swing response',0,2,.05);
const cameraFolder = panel.folder('Camera',{expanded:false});
bind(cameraFolder,'select','cameraView',{label:'View', options:['Hero','Top','Front','Left','Right']});
slider(cameraFolder,'cameraYaw','Around sculpture (°)',-12,12,.2);
slider(cameraFolder,'cameraElevation','Elevation offset (°)',-5,7,.1);
slider(cameraFolder,'framing','Framing',.8,1.4,.01);
slider(cameraFolder,'frameHeight','Vertical center',4.5,7.5,.05);
slider(cameraFolder,'horizontalShift','Horizontal center',-1,1,.02);
cameraFolder.button('Reset camera',() => { for(const key of ['cameraView','cameraYaw','cameraElevation','framing','frameHeight','horizontalShift']) settings[key]=defaults[key]; refresh(); });
const lightFolder = panel.folder('Light and steel',{expanded:false});
slider(lightFolder,'exposure','Exposure',.4,1.8,.01);
slider(lightFolder,'keyLight','Warm softbox',0,60,.2);
slider(lightFolder,'rimLight','Red edge light',0,20,.1);
slider(lightFolder,'fillLight','Soft fill',0,1.5,.01);
slider(lightFolder,'environmentLight','Steel reflections',0,1.5,.01);
slider(lightFolder,'stageBounce','Red stage bounce',0,1.5,.01);
slider(lightFolder,'armorBrightness','Steel tone',.5,1.8,.01);
slider(lightFolder,'roughness','Surface roughness',.5,1.5,.01);
slider(lightFolder,'metalness','Metal response',0,1.2,.01);
slider(lightFolder,'lampIntensity','Red lamps',0,3,.05);
const stageFolder=panel.folder('Red stage',{expanded:false});
bind(stageFolder,'color','stageColor',{label:'Stage red'});
slider(stageFolder,'stageShade','Foreground falloff',0,.5,.01);
slider(stageFolder,'reflection','Reflection strength',0,.4,.01);
slider(stageFolder,'reflectionBlur','Reflection softness',0,.015,.0005);
slider(stageFolder,'shadowOpacity','Contact shadow',0,.6,.01);
const qualityFolder=panel.folder('Rendering',{expanded:false});
slider(qualityFolder,'resolution','Resolution scale',.75,2,.25);
bind(qualityFolder,'toggle','shadows',{label:'Cast shadows'});
bind(qualityFolder,'toggle','reflections',{label:'Stage reflections'});
for(const type of ['pointerdown','pointermove','pointerup','wheel']) panelEl.addEventListener(type,e=>e.stopPropagation());
panelEl.addEventListener('keydown',e=>{if(e.code!=='Backquote')e.stopPropagation();});

const renderer = new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance',preserveDrawingBuffer:true});
renderer.outputColorSpace=THREE.SRGBColorSpace; renderer.toneMapping=THREE.NoToneMapping;
renderer.shadowMap.enabled=true; renderer.shadowMap.type=THREE.PCFSoftShadowMap; renderer.info.autoReset=false;
sceneEl.appendChild(renderer.domElement);
const scene = new THREE.Scene();
const camera = new THREE.OrthographicCamera(-5,5,9.85,-9.85,.1,500);
const baseAzimuth=Math.atan2(22.6208477,30.0188751), baseElevation=20*Math.PI/180;
const camTarget=new THREE.Vector3(), pointer=new THREE.Vector2(), smoothPointer=new THREE.Vector2();
let pointerInside=false; let manifest, model, rig, ready=false, time=0, frames=0, last=performance.now(), lastFrameMs=0;
const materials=[];
RectAreaLightUniformsLib.init();
const key = new THREE.RectAreaLight(0xffdacb,30,9,9); key.position.set(-6,18,3); key.lookAt(0,8,0);scene.add(key);
const rim = new THREE.RectAreaLight(0xff4033,5,5,10); rim.position.set(5,14,-6);rim.lookAt(0,8,0);scene.add(rim);
const bounce=new THREE.AmbientLight(0xff170d,.5);scene.add(bounce);
const fill = new THREE.HemisphereLight(0xc6b1a7,0xa70a08,.4);scene.add(fill);
const shadowLight=new THREE.DirectionalLight(0xffcfbf,1.4);shadowLight.position.set(-6,18,3);shadowLight.target.position.set(0,6,0);shadowLight.castShadow=true;shadowLight.shadow.mapSize.set(2048,2048);Object.assign(shadowLight.shadow.camera,{left:-9,right:9,top:13,bottom:-10,near:1,far:40});shadowLight.shadow.normalBias=.025;shadowLight.shadow.bias=-.00015;shadowLight.shadow.radius=4;scene.add(shadowLight,shadowLight.target);
// A live studio reflection environment, independent of the red background.
const envScene=new THREE.Scene();envScene.background=new THREE.Color(0x120707);
for(const [pos,size,color] of [[[-6,14,3],[9,9],0xffc7b0],[[5,11,-6],[5,10],0xff3827]]){
  const card=new THREE.Mesh(new THREE.PlaneGeometry(...size),new THREE.MeshBasicMaterial({color,side:THREE.DoubleSide}));card.position.fromArray(pos);card.lookAt(0,7,0);envScene.add(card);
}
const pmrem=new THREE.PMREMGenerator(renderer);const envMap=pmrem.fromScene(envScene,.02,.1,100);scene.environment=envMap.texture;pmrem.dispose();envScene.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});
const mirrorTarget=new THREE.WebGLRenderTarget(512,512,{type:THREE.HalfFloatType});
const mirrorCamera=camera.clone(), textureMatrix=new THREE.Matrix4();
const stageMaterial=new THREE.ShaderMaterial({uniforms:{tReflection:{value:mirrorTarget.texture},reflectionMatrix:{value:textureMatrix},red:{value:new THREE.Color(settings.stageColor)},reflection:{value:.15},blur:{value:.004},shade:{value:.24},gain:{value:1},contact:{value:.3},feet:{value:Array.from({length:4},()=>new THREE.Vector3())}},vertexShader:`uniform mat4 reflectionMatrix; varying vec4 reflectedUv; varying vec3 world; void main(){vec4 p=modelMatrix*vec4(position,1.);world=p.xyz;reflectedUv=reflectionMatrix*p;gl_Position=projectionMatrix*viewMatrix*p;}`,fragmentShader:`uniform sampler2D tReflection;uniform vec3 red;uniform vec3 feet[4];uniform float reflection,blur,shade,gain,contact;varying vec4 reflectedUv;varying vec3 world;void main(){vec2 uv=reflectedUv.xy/reflectedUv.w;vec3 r=texture2D(tReflection,uv).rgb*.4;r+=(texture2D(tReflection,uv+vec2(blur,0)).rgb+texture2D(tReflection,uv-vec2(blur,0)).rgb+texture2D(tReflection,uv+vec2(0,blur)).rgb+texture2D(tReflection,uv-vec2(0,blur)).rgb)*.15;float fore=smoothstep(-5.,16.,dot(world.xz,vec2(.602,.799)));vec3 base=red*(1.-shade*fore);float occlusion=0.;for(int i=0;i<4;i++){vec2 delta=world.xz-feet[i].xz;float lift=max(0.,feet[i].y);occlusion+=(exp(-dot(delta,delta)*12./(1.+lift*12.))*.8+exp(-dot(delta,delta)*1.4)*.25)*exp(-lift*8.);}occlusion+=exp(-dot(world.xz,world.xz)*.06)*.16;vec3 c=mix(base,min(base,r*red*1.4),reflection)*gain*(1.-contact*min(1.,occlusion));gl_FragColor=vec4(c,1.);#include <colorspace_fragment>}`.replace(';#include',';\n#include')});
const stage=new THREE.Mesh(new THREE.PlaneGeometry(300,300),stageMaterial);stage.rotation.x=-Math.PI/2;stage.position.y=-.012;scene.add(stage);
const shadowPlane=new THREE.Mesh(new THREE.PlaneGeometry(100,100),new THREE.ShadowMaterial({color:0x270000,opacity:.3}));shadowPlane.rotation.x=-Math.PI/2;shadowPlane.position.y=-.01;shadowPlane.receiveShadow=true;scene.add(shadowPlane);

sceneEl.addEventListener('pointermove',e=>{pointerInside=true;const r=sceneEl.getBoundingClientRect();pointer.set(THREE.MathUtils.clamp((e.clientX-r.left)/r.width*2-1,-1,1),THREE.MathUtils.clamp(1-(e.clientY-r.top)/r.height*2,-1,1));});
sceneEl.addEventListener('pointerleave',()=>{pointerInside=false;pointer.set(0,0);});
sceneEl.addEventListener('pointerdown',e=>sceneEl.setPointerCapture?.(e.pointerId));
document.addEventListener('visibilitychange',()=>{last=performance.now();});
renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();status.textContent='Graphics context interrupted. Reload to resume.';ready=false;});
function resize(){const r=sceneEl.getBoundingClientRect();if(r.width<1||r.height<1)return;renderer.setPixelRatio(Math.min(devicePixelRatio,settings.resolution));renderer.setSize(r.width,r.height,false);const scale=Math.min(1,900/Math.max(r.width,r.height));mirrorTarget.setSize(Math.max(1,Math.round(r.width*scale)),Math.max(1,Math.round(r.height*scale)));updateCamera();}
function updateCamera(){
  const {width,height}=sceneEl.getBoundingClientRect(),aspect=width/Math.max(1,height),view=settings.cameraView;
  const span=Math.max(view==='Top'?9.8:19.7,10.9/aspect)/settings.framing;
  camera.left=-span*aspect/2;camera.right=span*aspect/2;camera.top=span/2;camera.bottom=-span/2;camera.updateProjectionMatrix();
  const az=(view==='Hero'?baseAzimuth:view==='Left'?-Math.PI/2:view==='Right'?Math.PI/2:0)+THREE.MathUtils.degToRad(settings.cameraYaw);
  const el=view==='Top'?Math.PI/2:(view==='Hero'?baseElevation:0)+THREE.MathUtils.degToRad(settings.cameraElevation);
  camTarget.set(0,settings.frameHeight,0).addScaledVector(new THREE.Vector3(Math.cos(az),0,-Math.sin(az)),settings.horizontalShift);
  camera.position.set(Math.sin(az)*Math.cos(el)*40,Math.sin(el)*40,Math.cos(az)*Math.cos(el)*40).add(camTarget);
  camera.up.set(0,view==='Top'?0:1,view==='Top'?-1:0);camera.lookAt(camTarget);camera.updateMatrixWorld();
}
new ResizeObserver(resize).observe(sceneEl);
window.addEventListener('sh-panel-toggle',resize);
function applySettings(){if(!renderer)return;scene.background=new THREE.Color(settings.stageColor).multiplyScalar(settings.exposure);stageMaterial.uniforms.red.value.set(settings.stageColor);stageMaterial.uniforms.gain.value=settings.exposure;stageMaterial.uniforms.shade.value=settings.stageShade;stageMaterial.uniforms.reflection.value=settings.reflections?settings.reflection:0;stageMaterial.uniforms.blur.value=settings.reflectionBlur;stageMaterial.uniforms.contact.value=settings.shadows?settings.shadowOpacity:0;shadowPlane.material.opacity=settings.shadowOpacity;shadowPlane.visible=false;key.intensity=settings.keyLight*settings.exposure;rim.intensity=settings.rimLight*settings.exposure;fill.intensity=settings.fillLight*settings.exposure;bounce.intensity=settings.stageBounce*settings.exposure;shadowLight.intensity=settings.shadows?.8*settings.exposure:0;shadowLight.castShadow=settings.shadows;scene.environmentIntensity=settings.environmentLight*settings.exposure;for(const {material,base} of materials){material.color?.copy(base.color).multiplyScalar(settings.armorBrightness);if('roughness'in material)material.roughness=Math.min(1,base.roughness*settings.roughness);if('metalness'in material)material.metalness=Math.min(1,base.metalness*settings.metalness);material.emissiveIntensity=base.emissiveIntensity*settings.lampIntensity;}resize();}
function refresh(){for(const [k,c]of bindings)c.setValue(settings[k]);persist();applySettings();}
function reset(){Object.assign(settings,defaults);pointer.set(0,0);smoothPointer.set(0,0);time=0;pointerInside=false;rig?.reset();refresh();}
function payload(){return{project:'crimson-strider',version:1,settings:{...settings}};}
async function copySettings(){const text=JSON.stringify(payload(),null,2);let copied=false;try{await navigator.clipboard.writeText(text);copied=true;}catch{const ta=document.createElement('textarea');ta.value=text;panel._body.appendChild(ta);ta.select();try{copied=document.execCommand('copy');}catch{}if(copied)ta.remove();}status.textContent=copied?'Settings copied.':'Select and copy the JSON in the panel.';setTimeout(()=>{if(ready)status.textContent='Move the mouse · Body leads, feet follow · ` toggles controls';},2500);}
async function init(){try{const response=await fetch('./assets/rig-manifest.json');if(!response.ok)throw Error('Rig export not available yet');manifest=await response.json();const gltf=await new GLTFLoader().loadAsync('./assets/'+manifest.artifacts.glb);model=gltf.scene;scene.add(model);model.updateMatrixWorld(true);const seen=new Set();model.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;for(const m of Array.isArray(o.material)?o.material:[o.material])if(!seen.has(m)){seen.add(m);sourceSteel(o,m);materials.push({material:m,base:{color:m.color.clone(),roughness:m.roughness,metalness:m.metalness,emissiveIntensity:m.emissiveIntensity}});}}});rig=new StriderRig(model,manifest,scene);await rig.init();applySettings();await renderer.compileAsync(scene,camera);ready=true;window.SyntaxLabsLoading?.ready();last=performance.now();status.textContent='Move the mouse · Body leads, feet follow · ` toggles controls';}catch(error){window.SyntaxLabsLoading?.fail();status.textContent=error.message;console.error(error);}}
function renderMirror(){if(!settings.reflections)return;mirrorCamera.copy(camera);mirrorCamera.position.y=-camera.position.y;const target=camTarget.clone();target.y=-target.y;mirrorCamera.up.copy(camera.up);mirrorCamera.up.y*=-1;mirrorCamera.lookAt(target);mirrorCamera.updateMatrixWorld();textureMatrix.set(.5,0,0,.5,0,.5,0,.5,0,0,.5,.5,0,0,0,1).multiply(mirrorCamera.projectionMatrix).multiply(mirrorCamera.matrixWorldInverse);stage.visible=false;shadowPlane.visible=false;renderer.setRenderTarget(mirrorTarget);renderer.render(scene,mirrorCamera);renderer.setRenderTarget(null);stage.visible=true;shadowPlane.visible=false;}
function animate(now){requestAnimationFrame(animate);const dt=Math.min((now-last)/1000,.1);lastFrameMs=now-last;last=now;if(ready&&!settings.paused){time+=dt;const target=settings.motionMode==='Study'?new THREE.Vector2(Math.sin(time*.52)*.85,Math.sin(time*.31)*.65):(settings.tracking&&settings.motionMode==='Cursor'?pointer:new THREE.Vector2());smoothPointer.lerp(target,1-Math.exp(-settings.smoothing*dt));rig.update(dt,smoothPointer,settings,target,settings.motionMode==='Study'||pointerInside);}if(rig)rig.legs.forEach((leg,i)=>stageMaterial.uniforms.feet.value[i].copy(leg.footTarget));renderer.info.reset();renderMirror();renderer.render(scene,camera);frames++;}
window.strider={settings,defaults,payload,reset,applySettings,setPointer:(x,y)=>{pointerInside=true;pointer.set(x,y);},get ready(){return ready},get rig(){return rig},diagnostics:()=>({ready,time,frames,frameMs:lastFrameMs,three:THREE.REVISION,canvas:{width:renderer.domElement.width,height:renderer.domElement.height,rect:sceneEl.getBoundingClientRect().toJSON()},panel:panelEl.getBoundingClientRect().toJSON(),pointer:pointer.toArray(),smoothed:smoothPointer.toArray(),draws:renderer.info.render.calls,triangles:renderer.info.render.triangles,geometries:renderer.info.memory.geometries,textures:renderer.info.memory.textures,rig:rig?.diagnostics()})};
applySettings();resize();init();requestAnimationFrame(animate);
