import './sh-panel/sh-panel.js';
import {glowDefaults,glowControls,glowStorageKey} from './cable-glow-settings.js';

export function mountGlowTuner(host,controller,onClose){
  const events=new AbortController();
  // Canonical controls; the footer owns the inline panel's visibility/lifecycle.
  class FooterPanel extends window.SHPanel {
    _setupToggle(){document.addEventListener('keydown',event=>{if(event.code==='Backquote'&&!/INPUT|TEXTAREA/.test(event.target.tagName)){event.preventDefault();onClose();}},{signal:events.signal});}
    _setupHint(){}
  }
  const panel=new FooterPanel(host), state=controller.getGlow(), sliders=[];
  const update=()=>{controller.setGlow(state);try{localStorage.setItem(glowStorageKey,JSON.stringify(state));}catch{}};
  const folder=panel.folder('Cable glow');
  for(const [key,label,min,max,step] of glowControls){
    const control=folder.slider(state,key,{label,min,max,step}).on('change',update);
    control._input.setAttribute('aria-label',label);
    sliders.push([key,control]);
  }
  panel.button('Reset glow',()=>{Object.assign(state,glowDefaults);sliders.forEach(([key,control])=>control.setValue(state[key]));update();});
  const status=document.createElement('p');status.className='glow-copy-status';status.setAttribute('role','status');
  panel.button('Copy JSON',async()=>{
    const json=JSON.stringify({project:'syntax-labs-footer',version:1,settings:controller.getGlow()},null,2);
    try{await navigator.clipboard.writeText(json);status.textContent='Copied — paste these settings back in chat.';}
    catch{const area=document.createElement('textarea');area.value=json;area.setAttribute('aria-label','Cable glow settings');host.append(area);area.select();try{if(!document.execCommand('copy'))throw Error();status.textContent='Copied — paste these settings back in chat.';area.remove();}catch{status.textContent='Select and copy the settings below.';}}
  });
  panel.button('Close controls',onClose);host.append(status);
  return ()=>{events.abort();host.replaceChildren();host.classList.remove('sh-panel');};
}
