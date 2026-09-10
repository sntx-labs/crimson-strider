import { Vector3, Quaternion, Matrix4, BufferGeometry, Float32BufferAttribute } from 'three';

// FABRIK preserves segment lengths; pose acceptance separately enforces reach and joint limits.
export function solveChain(rest, root, target, iterations=40) {
  const lengths=rest.slice(1).map((p,i)=>p.distanceTo(rest[i]));
  const total=lengths.reduce((a,b)=>a+b,0);
  if(root.distanceTo(target)>total-1e-7) return {reachable:false,error:root.distanceTo(target)-total};
  const rootDelta=root.clone().sub(rest[0]);
  let traveled=0;
  const points=rest.map((p,i)=>{if(i)traveled+=lengths[i-1];return p.clone().addScaledVector(rootDelta,1-traveled/total);});
  const direction=new Vector3();
  for(let step=0;step<iterations;step++){
    points.at(-1).copy(target);
    for(let i=points.length-2;i>=0;i--){direction.subVectors(points[i],points[i+1]).normalize();points[i].copy(points[i+1]).addScaledVector(direction,lengths[i]);}
    points[0].copy(root);
    for(let i=1;i<points.length;i++){direction.subVectors(points[i],points[i-1]).normalize();points[i].copy(points[i-1]).addScaledVector(direction,lengths[i-1]);}
    if(points.at(-1).distanceToSquared(target)<1e-12)break;
  }
  const bends=points.slice(1,-1).map((p,i)=>p.clone().sub(points[i]).normalize().angleTo(points[i+2].clone().sub(p).normalize()));
  return{reachable:true,points,lengths,bends,error:points.at(-1).distanceTo(target)};
}

export function placeWorld(object, position, quaternion) {
  object.parent?.updateWorldMatrix(true,false);
  object.position.copy(position);
  object.quaternion.copy(quaternion);
  if(object.parent){object.parent.worldToLocal(object.position);const parentQ=object.parent.getWorldQuaternion(new Quaternion());object.quaternion.premultiply(parentQ.invert());}
  object.updateMatrixWorld(true);
}

export function deltaMatrix(object, restInverse) {
  return new Matrix4().multiplyMatrices(object.matrixWorld,restInverse);
}

// Rings follow the exported samples directly. No resampling into a different authored curve.
export function cableGeometry(points,radius,freeTail=true,sides=6){
  const positions=[],normals=[],u=[],free=[],indices=[];
  const cumulative=[0];for(let i=1;i<points.length;i++)cumulative.push(cumulative[i-1]+points[i].distanceTo(points[i-1]));
  const length=cumulative.at(-1)||1;
  let normal=new Vector3(1,0,0),previousTangent;
  for(let i=0;i<points.length;i++){
    const tangent=points[Math.min(i+1,points.length-1)].clone().sub(points[Math.max(0,i-1)]).normalize();
    if(i===0){if(Math.abs(tangent.dot(normal))>.9)normal.set(0,0,1);normal.addScaledVector(tangent,-normal.dot(tangent)).normalize();}
    else normal.applyQuaternion(new Quaternion().setFromUnitVectors(previousTangent,tangent));
    const binormal=new Vector3().crossVectors(tangent,normal).normalize();
    for(let j=0;j<sides;j++){const a=j/sides*Math.PI*2;const n=normal.clone().multiplyScalar(Math.cos(a)).addScaledVector(binormal,Math.sin(a));positions.push(...points[i].clone().addScaledVector(n,radius).toArray());normals.push(...n.toArray());u.push(cumulative[i]/length);free.push(freeTail?1:0);}
    previousTangent=tangent;
    if(i<points.length-1)for(let j=0;j<sides;j++){const a=i*sides+j,b=i*sides+(j+1)%sides,c=a+sides,d=b+sides;indices.push(a,c,b,b,c,d);}
  }
  const geometry=new BufferGeometry();geometry.setAttribute('position',new Float32BufferAttribute(positions,3));geometry.setAttribute('normal',new Float32BufferAttribute(normals,3));geometry.setAttribute('cableU',new Float32BufferAttribute(u,1));geometry.setAttribute('cableFree',new Float32BufferAttribute(free,1));geometry.setIndex(indices);return geometry;
}
