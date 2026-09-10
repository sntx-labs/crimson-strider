import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { cableGeometry, placeWorld } from './kinematics.js';
import { StanceController } from './stance.js';
const V=a=>new THREE.Vector3().fromArray(a),deg=THREE.MathUtils.radToDeg,rad=THREE.MathUtils.degToRad;
const identity=new THREE.Quaternion();

export class StriderRig {
  constructor(model,manifest,scene){
    this.model=model;this.manifest=manifest;this.scene=scene;this.body=model.getObjectByName(manifest.body);
    if(!this.body)throw Error('BODY_CTRL missing from export');
    this.carrier=model.getObjectByName(manifest.leg_carrier);
    if(!this.carrier||this.carrier===this.body)throw Error('Independent leg carrier missing from export');
    this.bodyRest={p:this.body.position.clone(),q:this.body.quaternion.clone(),inverse:this.body.matrixWorld.clone().invert()};
    this.carrierRest={p:this.carrier.position.clone(),q:this.carrier.quaternion.clone(),inverse:this.carrier.matrixWorld.clone().invert()};
    this.bodyOffset=new THREE.Vector3();
    this.legs=[];this.cables=[];this.groups=[];this.safeScale=1;this.current=new THREE.Vector2();
    this.nodeRest=new Map();model.traverse(o=>this.nodeRest.set(o.name,{p:o.position.clone(),q:o.quaternion.clone(),inverse:o.matrixWorld.clone().invert()}));
    for(const def of manifest.legs.filter(l=>l.articulated)){
      const nodes=Object.fromEntries(Object.entries(def.nodes).map(([key,name])=>[key,model.getObjectByName(name)]));
      if(Object.values(nodes).some(n=>!n))throw Error('Incomplete leg '+def.id);
      const rest=Object.fromEntries(Object.entries(def.world_rest_joints).map(([k,p])=>[k,V(p)]));
      this.legs.push({def,nodes,rest,upper:rest.knee.clone().sub(rest.hip).normalize(),lower:rest.foot.clone().sub(rest.knee).normalize(),hipLocal:this.carrier.worldToLocal(rest.hip.clone()),footTarget:rest.foot.clone(),pole:V(def.rest_bend_direction)});
    }
    this.stance=new StanceController(this.legs);
    this.reset();
  }
  async init(){
    const response=await fetch('./assets/'+this.manifest.artifacts.cables);if(!response.ok)throw Error('Cable export unavailable');
    const data=await response.json();const groups=new Map();
    for(const cable of data.cables){
      const points=cable.points_world.map(V),free=cable.type==='free_tail';
      const zone=(points[0].x>0?'R':'L')+(cable.length>3?'long':'short');
      const groupKey=[cable.owner_a,cable.owner_b||cable.owner_a,free?zone:'bridge'].join(':');
      let group=groups.get(groupKey);
      if(!group){
        const ownerA=this.model.getObjectByName(cable.owner_a),ownerB=this.model.getObjectByName(cable.owner_b||cable.owner_a);
        if(!ownerA||!ownerB)throw Error('Cable owner missing '+cable.id);
        group={ownerA,ownerB,restA:ownerA.matrixWorld.clone().invert(),restB:ownerB.matrixWorld.clone().invert(),matrixA:new THREE.Matrix4(),matrixB:new THREE.Matrix4(),offset:new THREE.Vector3(),velocity:new THREE.Vector3(),gravity:new THREE.Vector3(),reference:new THREE.Vector3(),last:new THREE.Vector3(),cables:[],geometries:[]};groups.set(groupKey,group);
      }
      const record={...cable,points,free,group,tip:this.model.getObjectByName(cable.tip_node),anchorA:this.model.getObjectByName(cable.anchor_a),anchorB:cable.anchor_b?this.model.getObjectByName(cable.anchor_b):null};
      group.geometries.push(cableGeometry(points,cable.radius,free));group.reference.add(points.at(-1));group.cables.push(record);this.cables.push(record);
    }
    for(const [name,g]of groups){
      g.reference.divideScalar(g.cables.length);g.last.copy(g.reference);
      const mat=new THREE.MeshStandardMaterial({color:new THREE.Color(.006,.0048,.0045),roughness:.4,metalness:.16});
      const uniforms={cableA:{value:g.matrixA},cableB:{value:g.matrixB},cableSwing:{value:g.offset},cableSag:{value:g.gravity}};
      const declarations='attribute float cableU; attribute float cableFree; uniform mat4 cableA; uniform mat4 cableB; uniform vec3 cableSwing; uniform vec3 cableSag;';
      const deform=`vec3 transformed = mix((cableA*vec4(position,1.)).xyz,(cableB*vec4(position,1.)).xyz,cableU*(1.-cableFree));float envelope=mix(sin(cableU*3.14159265),pow(cableU,1.5),cableFree);transformed+=(cableSwing+cableSag)*envelope;`;
      mat.onBeforeCompile=shader=>{Object.assign(shader.uniforms,uniforms);shader.vertexShader=declarations+'\n'+shader.vertexShader.replace('#include <begin_vertex>',deform).replace('#include <beginnormal_vertex>','#include <beginnormal_vertex>\nobjectNormal = mix(mat3(cableA)*objectNormal,mat3(cableB)*objectNormal,cableU*(1.-cableFree));');};mat.customProgramCacheKey=()=> 'strider-cable-v2';
      const geo=mergeGeometries(g.geometries);g.geometries.forEach(x=>x.dispose());delete g.geometries;
      const mesh=new THREE.Mesh(geo,mat);mesh.name='Cable bundle '+name;mesh.frustumCulled=false;mesh.castShadow=false;this.scene.add(mesh);g.mesh=mesh;this.groups.push(g);
    }
  }
  reset(){
    this.model.traverse(o=>{const rest=this.nodeRest.get(o.name);if(rest){o.position.copy(rest.p);o.quaternion.copy(rest.q);}});this.model.updateMatrixWorld(true);this.current.set(0,0);this.safeScale=1;
    this.stance.reset();this.bodyYaw=0;this.carrierYaw=0;this.bodyOffset.set(0,0,0);this.drop=0;this.failedPoses=0;this.blockedStepFrames=0;
    for(const g of this.groups){g.offset.set(0,0,0);g.velocity.set(0,0,0);g.gravity.set(0,0,0);g.last.copy(g.reference);g.matrixA.identity();g.matrixB.identity();}
  }
  setBody(dt,p,s){
    const strength=Math.min(1.5,s.trackingStrength),clamp=THREE.MathUtils.clamp;
    this.body.quaternion.setFromAxisAngle(new THREE.Vector3(0,1,0),this.bodyYaw).multiply(this.bodyRest.q).multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(rad(clamp(-p.y*s.pitchLimit*strength,-2,2)),0,rad(clamp(-p.x*s.rollLimit*strength,-1,1)),'YXZ')));
    // The overlapping bearing sleeve accommodates a smoothly following shell.
    const offset=this.carrier.position.clone().sub(this.carrierRest.p);
    this.bodyOffset.lerp(offset,1-Math.exp(-10*dt));
    this.body.position.copy(this.bodyRest.p).add(this.bodyOffset).add(new THREE.Vector3(p.x*s.leanLimit*strength,0,-p.y*s.leanLimit*strength).clampLength(0,.08));this.body.updateWorldMatrix(true,false);
  }
  setCarrier(yaw,drop){
    this.carrier.quaternion.setFromAxisAngle(new THREE.Vector3(0,1,0),yaw).multiply(this.carrierRest.q);
    this.carrier.position.copy(this.carrierRest.p).add(this.stance.shift);this.carrier.position.y-=drop;this.carrier.updateWorldMatrix(true,false);
  }
  propose(drop=0,yaw=this.carrierYaw,validate=true){
    this.setCarrier(yaw,drop);
    const carrierDelta=new THREE.Matrix4().multiplyMatrices(this.carrier.matrixWorld,this.carrierRest.inverse),carrierQ=this.carrier.getWorldQuaternion(new THREE.Quaternion());
    const solutions=[];
    for(const leg of this.legs){
      const hip=this.carrier.localToWorld(leg.hipLocal.clone()),foot=leg.footTarget,direction=foot.clone().sub(hip),distance=direction.length();direction.normalize();
      const [a,b]=leg.def.two_bone_lengths;
      if(distance>=a+b-1e-6||distance<=Math.abs(a-b)+1e-6)return null;
      const along=(a*a-b*b+distance*distance)/(2*distance),height=Math.sqrt(Math.max(0,a*a-along*along));
      const pole=leg.pole.clone().transformDirection(carrierDelta);pole.addScaledVector(direction,-pole.dot(direction)).normalize();
      const knee=hip.clone().addScaledVector(direction,along).addScaledVector(pole,height);
      const upper=knee.clone().sub(hip).normalize(),lower=foot.clone().sub(knee).normalize();
      const reference=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),yaw);
      const upperQ=new THREE.Quaternion().setFromUnitVectors(leg.upper.clone().applyQuaternion(reference),upper).multiply(reference),lowerQ=new THREE.Quaternion().setFromUnitVectors(leg.lower.clone().applyQuaternion(reference),lower).multiply(reference);
      const deflection=deg(upper.angleTo(lower)),limits=leg.def.joint_limits_degrees;
      const hipSwing=deg(upperQ.angleTo(carrierQ));
      const relative=carrierQ.clone().invert().multiply(upperQ),axis=leg.upper,dot=relative.x*axis.x+relative.y*axis.y+relative.z*axis.z;
      const twist=new THREE.Quaternion(axis.x*dot,axis.y*dot,axis.z*dot,relative.w).normalize(),hipTwist=deg(twist.angleTo(identity));
      const limitStress=Math.max(hipSwing/limits.hip_swing_from_rest,hipTwist/limits.hip_twist_from_rest,Math.max(limits.knee_deflection[0],leg.def.rest_knee_deflection_degrees*.6)/deflection,deflection/limits.knee_deflection[1]);
      if(validate&&limitStress>1)return null;
      const ankle=leg.rest.ankle.clone().sub(leg.rest.knee).applyQuaternion(lowerQ).add(knee);
      const geometryFootError=leg.rest.foot.clone().sub(leg.rest.ankle).applyQuaternion(lowerQ).add(ankle).distanceTo(foot);
      solutions.push({leg,hip,knee,ankle,foot:foot.clone(),upperQ,lowerQ,hipSwing,hipTwist,deflection,geometryFootError,limitStress});
    }
    return solutions;
  }
  poseAtYaw(yaw,s,preferredDrop){
      this.setCarrier(yaw,0);
      // The native sleeve clears the carrier throughout its downward travel.
      let lo=0,hi=Math.min(this.manifest.leg_carrier_motion_limits?.height_correction_meters??.15,.14+(s.stanceAllowance||0));
      // Intersect the exact reach intervals first, before checking hip rotation.
      for(const leg of this.legs){
        const hip=this.carrier.localToWorld(leg.hipLocal.clone()),foot=leg.footTarget,[a,b]=leg.def.two_bone_lengths;
        const limits=leg.def.joint_limits_degrees.knee_deflection;
        const minBend=rad(Math.max(limits[0],leg.def.rest_knee_deflection_degrees*.6)),maxBend=rad(limits[1]);
        const horizontal=(hip.x-foot.x)**2+(hip.z-foot.z)**2,vertical=hip.y-foot.y;
        const far=a*a+b*b+2*a*b*Math.cos(minBend)-horizontal;
        const near=a*a+b*b+2*a*b*Math.cos(maxBend)-horizontal;
        if(far<=0)return null;
        lo=Math.max(lo,vertical-Math.sqrt(far)+1e-7);hi=Math.min(hi,vertical-Math.sqrt(Math.max(0,near))-1e-7);
      }
      if(lo>hi)return null;
      const preferred=THREE.MathUtils.clamp(preferredDrop,lo,hi);
      const candidates=[preferred,...Array.from({length:25},(_,i)=>lo+(hi-lo)*i/24)];
      candidates.sort((a,b)=>Math.abs(a-preferred)-Math.abs(b-preferred));
      for(const drop of candidates){const solutions=this.propose(drop,yaw);if(solutions)return{yaw,drop,solutions};}
      return null;
  }
  findPose(requested,s,preferredDrop){
    const direct=this.poseAtYaw(requested,s,preferredDrop);if(direct)return direct;
    let best=this.poseAtYaw(this.carrierYaw,s,preferredDrop)||this.poseAtYaw(this.stance.meanYaw,s,preferredDrop);
    if(!best){
      const headings=this.legs.map(l=>l.footYaw),lo=Math.min(...headings)-rad(12),hi=Math.max(...headings)+rad(12);
      for(let i=0;i<=24;i++){const pose=this.poseAtYaw(lo+(hi-lo)*i/24,s,preferredDrop);if(pose&&(!best||Math.abs(pose.yaw-requested)<Math.abs(best.yaw-requested)))best=pose;}
    }
    if(!best)return null;
    let feasible=best.yaw,blocked=requested;
    for(let i=0;i<9;i++){const mid=(feasible+blocked)/2,pose=this.poseAtYaw(mid,s,preferredDrop);if(pose){feasible=mid;best=pose;}else blocked=mid;}
    return best;
  }
  update(dt,p,s,trigger=p,engaged=true){
    if(dt>1/30){
      const steps=Math.ceil(dt/(1/60));
      for(let i=0;i<steps;i++)this.update(dt/steps,p,s,trigger,engaged);
      return;
    }
    this.stance.aim(dt,trigger.x,s,engaged,this.bodyYaw);
    // Head aiming has no dependency on IK, foot angles, or the gait clock.
    this.bodyYaw=this.stance.lookYaw;
    this.current.lerp(p,1-Math.exp(-12*s.legResponse*dt));
    this.stance.maybeStart(this.bodyYaw,s);
    const before=this.stance.snapshot();this.stance.advance(dt);
    // The undercarriage follows the feet, independently of the looking shell.
    const maxYawStep=rad(130)*dt;
    const requested=this.carrierYaw+THREE.MathUtils.clamp(this.stance.meanYaw-this.carrierYaw,-maxYawStep,maxYawStep);
    const preferredDrop=THREE.MathUtils.lerp(this.drop,0,1-Math.exp(-4*dt));
    let pose=this.findPose(requested,s,preferredDrop);
    if(!pose||Math.abs(pose.yaw-this.carrierYaw)>maxYawStep+1e-6){
      const recovery=this.carrierYaw+THREE.MathUtils.clamp((pose?.yaw??this.stance.meanYaw)-this.carrierYaw,-maxYawStep,maxYawStep);
      this.stance.restore(before);this.blockedStepFrames++;pose=this.findPose(recovery,s,preferredDrop);
    }
    const solutions=pose?.solutions;
    if(pose){this.carrierYaw=pose.yaw;this.drop=pose.drop;this.setCarrier(pose.yaw,pose.drop);}
    if(solutions)for(const result of solutions){
      const {leg,hip,knee,ankle,foot,upperQ,lowerQ}=result;
      placeWorld(leg.nodes.hip,hip,upperQ);placeWorld(leg.nodes.knee,knee,lowerQ);placeWorld(leg.nodes.ankle,ankle,lowerQ);placeWorld(leg.nodes.foot,foot,leg.footRotation);leg.last=result;
    }
    if(!solutions)this.failedPoses++;
    this.setBody(dt,this.current,s);
    this.model.updateMatrixWorld(true);
    for(const g of this.groups){
      g.matrixA.multiplyMatrices(g.ownerA.matrixWorld,g.restA);g.matrixB.multiplyMatrices(g.ownerB.matrixWorld,g.restB);
      const current=g.reference.clone().applyMatrix4(g.matrixA),movement=current.clone().sub(g.last);g.last.copy(current);
      if(s.cableMotion){
        g.offset.addScaledVector(movement,-s.cableResponse*1.8);
        const steps=Math.ceil(dt/(1/120)),h=dt/steps;
        for(let i=0;i<steps;i++){g.velocity.addScaledVector(g.offset,-s.cableStiffness*(.6+.4*s.cableGravity)*h);g.velocity.multiplyScalar(Math.exp(-s.cableDamping*h));g.offset.addScaledVector(g.velocity,h);}
        g.offset.clampLength(0,.4);g.gravity.set(0,-(s.cableGravity-1)*.055,0);
      }else{g.offset.set(0,0,0);g.velocity.set(0,0,0);g.gravity.set(0,0,0);}
      for(const cable of g.cables)if(cable.tip){const tip=this.cablePoint(cable,1);cable.tip.position.copy(cable.tip.parent.worldToLocal(tip));cable.tip.updateMatrixWorld(true);}
    }
  }
  cablePoint(c,t){const index=Math.round(t*(c.points.length-1)),p=c.points[index].clone(),g=c.group;const a=p.clone().applyMatrix4(g.matrixA),b=p.applyMatrix4(g.matrixB);a.lerp(b,c.free?0:t);return a.addScaledVector(g.offset,(c.free?t**1.5:Math.sin(t*Math.PI))).addScaledVector(g.gravity,(c.free?t**1.5:Math.sin(t*Math.PI)));}
  diagnostics(){
    let maxAnchorError=0;for(const c of this.cables){maxAnchorError=Math.max(maxAnchorError,this.cablePoint(c,0).distanceTo(c.anchorA.getWorldPosition(new THREE.Vector3())));if(c.anchorB)maxAnchorError=Math.max(maxAnchorError,this.cablePoint(c,1).distanceTo(c.anchorB.getWorldPosition(new THREE.Vector3())));}
    return{revision:this.manifest.revision,stance:{...this.stance.diagnostics(this.bodyYaw),carrierYawDegrees:deg(this.carrierYaw),bearingYawDegrees:deg(this.bodyYaw-this.carrierYaw)},failedPoses:this.failedPoses,blockedStepFrames:this.blockedStepFrames,legs:this.legs.map(l=>({id:l.def.id,target:l.footTarget.toArray(),footError:l.nodes.foot.getWorldPosition(new THREE.Vector3()).distanceTo(l.footTarget),geometryFootError:l.last?.geometryFootError,hipSwing:l.last?.hipSwing,hipTwist:l.last?.hipTwist,kneeDeflection:l.last?.deflection,limitStress:l.last?.limitStress})),cables:this.cables.length,bundles:this.groups.length,body:this.body.quaternion.toArray(),bodyPosition:this.body.position.toArray(),carrierPosition:this.carrier.position.toArray(),safeScale:this.safeScale,stanceDrop:this.drop,maxAnchorError,swing:this.groups.map(g=>g.offset.length()),representativeTip:this.cables[0]?this.cablePoint(this.cables[0],1).toArray():null};
  }
}
