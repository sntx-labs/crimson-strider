// Shared touch input dock. Each pad owns its pointer so two thumbs work together.
(function(){
  const mediaQuery='(max-width:760px), (pointer:coarse)';
  window.LabsTouchControls=function({label,pads=[],buttons=[],panel}){
    const media=matchMedia(mediaQuery),resets=[],listeners=[];
    const dock=document.createElement('nav');dock.className='labs-touch-controls';dock.setAttribute('aria-label',label);
    const listen=(target,type,fn)=>{target.addEventListener(type,fn);listeners.push(()=>target.removeEventListener(type,fn));};
    let enabled=false;
    function hold(element,move,release){
      let pointer=null;
      const end=()=>{const id=pointer;pointer=null;if(id!==null&&element.hasPointerCapture(id))element.releasePointerCapture(id);element.classList.remove('held');release();};
      resets.push(end);
      listen(element,'pointerdown',event=>{
        if(!enabled||pointer!==null||event.button!==0)return;
        event.preventDefault();event.stopPropagation();pointer=event.pointerId;element.setPointerCapture(pointer);element.classList.add('held');move(event);
      });
      listen(element,'pointermove',event=>{if(pointer===event.pointerId){event.preventDefault();move(event);}});
      for(const type of ['pointerup','pointercancel','lostpointercapture'])listen(element,type,event=>{if(pointer===event.pointerId)end();});
    }
    for(const pad of pads){
      const group=document.createElement('div');group.className='labs-touch-pad-group';
      const caption=document.createElement('span');caption.textContent=pad.label;
      const surface=document.createElement('div');surface.className='labs-touch-pad';surface.setAttribute('role','group');surface.setAttribute('aria-label',pad.label+' touch pad');
      const knob=document.createElement('span');knob.className='labs-touch-knob';knob.setAttribute('aria-hidden','true');surface.append(knob);
      hold(surface,event=>{
        const box=surface.getBoundingClientRect(),radius=Math.min(box.width,box.height)*.36;
        let x=(event.clientX-box.left-box.width/2)/radius,y=(event.clientY-box.top-box.height/2)/radius;
        const length=Math.hypot(x,y),scale=Math.max(1,length);x/=scale;y/=scale;
        knob.style.transform=`translate(${x*radius}px,${y*radius}px)`;
        const strength=Math.max(0,(Math.min(1,length)-.12)/.88),angle=Math.atan2(y,x);
        pad.change(Math.cos(angle)*strength,Math.sin(angle)*strength);
      },()=>{knob.style.transform='';pad.change(0,0);});
      group.append(caption,surface);dock.append(group);
    }
    const actions=document.createElement('div');actions.className='labs-touch-actions';
    for(const action of buttons){
      const button=document.createElement('button');button.type='button';button.textContent=action.label;button.setAttribute('aria-label',action.label);
      if(action.hold)hold(button,()=>action.hold(true),()=>action.hold(false));
      else listen(button,'click',()=>{if(enabled)action.click(button);});
      actions.append(button);
    }
    dock.append(actions);document.body.append(dock);
    const reset=()=>resets.forEach(fn=>fn());
    const sync=()=>{reset();enabled=media.matches&&(!panel||panel.classList.contains('collapsed'));dock.hidden=!enabled;document.body.classList.toggle('labs-touch-layout',enabled);};
    listen(media,'change',sync);listen(window,'sh-panel-toggle',sync);listen(window,'blur',reset);
    listen(document,'visibilitychange',()=>{if(document.hidden)reset();});
    sync();
    return {reset,dock,destroy(){reset();listeners.forEach(fn=>fn());dock.remove();document.body.classList.remove('labs-touch-layout');}};
  };
})();
