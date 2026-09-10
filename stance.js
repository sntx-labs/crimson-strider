import * as THREE from 'three';

const UP=new THREE.Vector3(0,1,0),rad=THREE.MathUtils.degToRad,deg=THREE.MathUtils.radToDeg;
const smooth=t=>t*t*(3-2*t),ORDER=['FL','RR','FR','RL'],MAX_STEP=rad(37),MAX_SPREAD=rad(26);

// The body aims independently. Only a foot that has fallen behind takes a step.
export class StanceController {
  constructor(legs){this.legs=legs;this.shift=new THREE.Vector3();this.reset();}
  reset(){
    this.targetYaw=0;this.lookYaw=0;this.pointerX=0;this.hasInput=false;
    this.step=null;this.completed=0;this.nextIndex=0;this.direction=1;
    for(const leg of this.legs){leg.plantedYaw=0;leg.footRotation??=new THREE.Quaternion();}this.apply();
  }
  get active(){return !!this.step;}
  get meanYaw(){return this.legs.reduce((n,l)=>n+l.footYaw,0)/this.legs.length;}
  aim(dt,pointerX,s,engaged,bodyYaw){
    const following=s.motionMode==='Study'||(s.motionMode==='Cursor'&&s.tracking);
    if(!following){this.targetYaw=bodyYaw;this.lookYaw=bodyYaw;return;}
    if(engaged){this.pointerX=THREE.MathUtils.clamp(pointerX,-1,1);this.hasInput=true;}
    if(this.hasInput)this.targetYaw=rad(37+(s.cameraYaw||0)+this.pointerX*s.bodyTurnRange);
    this.lookYaw=THREE.MathUtils.lerp(this.lookYaw,this.targetYaw,1-Math.exp(-s.smoothing*dt));
  }
  maybeStart(bodyYaw,s){
    if(this.step||!s.stanceEnabled||s.motionMode==='Still'||(!s.tracking&&s.motionMode!=='Study'))return;
    const direction=Math.sign(this.targetYaw-this.meanYaw)||this.direction;
    if(direction!==this.direction){this.direction=direction;this.nextIndex=direction>0?0:3;}
    for(let i=0;i<4;i++){
      const index=(this.nextIndex+i*direction+8)%4,leg=this.legs.find(l=>l.def.id===ORDER[index]);
      const wanted=this.targetYaw-leg.plantedYaw,twist=bodyYaw-leg.plantedYaw;
      if(Math.abs(wanted)<rad(2))continue;
      const behind=Math.sign(wanted)===Math.sign(twist);
      const thresholdReached=behind&&Math.abs(twist)>=rad(s.stepThreshold);
      if(!thresholdReached)continue;
      // Keep the four foot headings within one stride, even after a reversal.
      // This bounds the carrier's articulation without constraining the head.
      const others=this.legs.filter(l=>l!==leg).map(l=>l.plantedYaw);
      const desired=leg.plantedYaw+THREE.MathUtils.clamp(wanted,-MAX_STEP,MAX_STEP);
      const to=THREE.MathUtils.clamp(desired,Math.max(...others)-MAX_SPREAD,Math.min(...others)+MAX_SPREAD);
      if(Math.abs(to-leg.plantedYaw)<rad(1))continue;
      this.step={id:leg.def.id,index,direction,from:leg.plantedYaw,
        to,
        elapsed:0,duration:Math.max(2.4,s.turnDuration)/8};return;
    }
  }
  advance(dt){
    if(this.step){this.step.elapsed=Math.min(this.step.duration,this.step.elapsed+dt);
      if(this.step.elapsed>=this.step.duration){this.legs.find(l=>l.def.id===this.step.id).plantedYaw=this.step.to;
        this.nextIndex=(this.step.index+this.step.direction+4)%4;this.completed++;this.step=null;}}
    this.apply();
  }
  apply(){
    const t=this.step?this.step.elapsed/this.step.duration:0;
    const swing=smooth(THREE.MathUtils.clamp((t-.2)/.6,0,1));
    const lift=this.step ? .065*smooth(Math.min(1,t/.2,(1-t)/.2)) : 0;
    for(const leg of this.legs){const moving=this.step?.id===leg.def.id;
      leg.footYaw=moving?THREE.MathUtils.lerp(this.step.from,this.step.to,swing):leg.plantedYaw;
      leg.footRotation.setFromAxisAngle(UP,leg.footYaw);
      leg.footTarget.copy(leg.rest.foot).applyQuaternion(leg.footRotation);if(moving)leg.footTarget.y+=lift;}
    this.shift.set(0,0,0);
    if(this.step){for(const leg of this.legs)if(leg.def.id!==this.step.id)this.shift.add(leg.footTarget);
      this.shift.y=0;this.shift.multiplyScalar(.08/3*Math.sin(Math.PI*t)**2).clampLength(0,.06);}
  }
  snapshot(){return{step:this.step?{...this.step}:null,planted:this.legs.map(l=>l.plantedYaw),completed:this.completed,nextIndex:this.nextIndex};}
  restore(s){this.step=s.step;this.completed=s.completed;this.nextIndex=s.nextIndex;this.legs.forEach((l,i)=>l.plantedYaw=s.planted[i]);this.apply();}
  setRestStance(yaw){this.reset();this.targetYaw=yaw;this.lookYaw=yaw;for(const leg of this.legs)leg.plantedYaw=yaw;this.apply();}
  diagnostics(bodyYaw){return{bodyYawDegrees:deg(bodyYaw),targetYawDegrees:deg(this.targetYaw),stanceYawDegrees:deg(this.meanYaw),
    twistDegrees:deg(bodyYaw-this.meanYaw),swingLeg:this.step?.id||null,stepPhase:this.step?this.step.elapsed/this.step.duration:0,
    completedSteps:this.completed,footHeadings:this.legs.map(l=>({id:l.def.id,degrees:deg(l.footYaw)}))};}
}
