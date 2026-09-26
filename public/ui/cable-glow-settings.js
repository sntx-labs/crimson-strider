export const glowDefaults = Object.freeze({ bloomStrength: .61, bloomSpread: 18.1, haloWidth: 9.5, emission: 1.46, coreHeat: 0, exposure: 1.1, variation: .43, frequency: 1, speed: 1.63 });
export const glowControls = [
  ['bloomStrength','Bloom strength',0,1,.01],
  ['bloomSpread','Bloom spread',0,20,.1],
  ['haloWidth','Halo width',1,40,.5],
  ['emission','Cable brightness',0,3,.01],
  ['coreHeat','White-hot core',0,1,.01],
  ['exposure','Exposure',.3,2.5,.01],
  ['variation','Uneven highlights',0,1,.01],
  ['frequency','Highlight density',1,20,.1],
  ['speed','Pulse speed',0,2,.01],
];
export function normalizeGlow(input={}) {
  const result={...glowDefaults};
  for(const [key,,min,max] of glowControls)if(typeof input[key]==='number'&&Number.isFinite(input[key]))result[key]=Math.max(min,Math.min(max,input[key]));
  return result;
}

export const glowStorageKey='syntax-labs-cable-glow-v1';
export function readSavedGlow(){try{return normalizeGlow(JSON.parse(localStorage.getItem(glowStorageKey)||'{}'));}catch{return {...glowDefaults};}}
