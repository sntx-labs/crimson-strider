import { Vector3 } from 'three';

// v006 procedural graph parameters, with normalized batch coordinates replacing
// per-source-object Generated coordinates after export consolidation.
export function sourceSteel(mesh,material){
  if(!/^WEB_(Armor|Edges)|^(Armor|Edges)/.test(material.name))return;
  mesh.geometry.computeBoundingBox();const bounds=mesh.geometry.boundingBox;
  const uniforms={steelMin:{value:bounds.min.clone()},steelSize:{value:bounds.getSize(new Vector3()).max(new Vector3(.05,.05,.05))}};
  const noise=`varying vec3 steelPosition;
  float h3(vec3 p){p=fract(p*.1031);p+=dot(p,p.yzx+33.33);return fract((p.x+p.y)*p.z);}
  float n3(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(h3(i),h3(i+vec3(1,0,0)),f.x),mix(h3(i+vec3(0,1,0)),h3(i+vec3(1,1,0)),f.x),f.y),mix(mix(h3(i+vec3(0,0,1)),h3(i+vec3(1,0,1)),f.x),mix(h3(i+vec3(0,1,1)),h3(i+vec3(1,1,1)),f.x),f.y),f.z);}
  float fbm(vec3 p){return n3(p)*.57+n3(p*2.03)*.28+n3(p*4.01)*.15;}
  vec3 steelBump(vec3 surf,vec3 norm,vec2 dh){vec3 sx=dFdx(surf),sy=dFdy(surf);vec3 r1=cross(sy,norm),r2=cross(norm,sx);float d=dot(sx,r1);return normalize(abs(d)*norm-sign(d)*(dh.x*r1+dh.y*r2));}
  `;
  material.onBeforeCompile=shader=>{
    Object.assign(shader.uniforms,uniforms);
    shader.vertexShader='uniform vec3 steelMin,steelSize; varying vec3 steelPosition;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nsteelPosition=(position-steelMin)/steelSize;');
    shader.fragmentShader=noise+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
      float broad=fbm(steelPosition*6.);float grain=fbm(steelPosition*46.);
      vec3 sourceColor=mix(vec3(.009,.006,.005),vec3(.043,.028,.023),clamp((broad-.22)/.56,0.,1.));
      diffuseColor.rgb*=sourceColor/vec3(.026,.017,.014);`);
    shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\nroughnessFactor*=mix(.29,.47,grain)/.38;');
    shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>','#include <normal_fragment_maps>\nfloat steelHeight=broad*.0116+grain*.0075;normal=steelBump(-vViewPosition,normal,vec2(dFdx(steelHeight),dFdy(steelHeight)));');
  };
  material.customProgramCacheKey=()=> 'v006-steel-'+mesh.name;
}
