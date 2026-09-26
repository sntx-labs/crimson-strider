(function () {
  'use strict';
  // Each experience opens with the artwork first.
  try{sessionStorage.setItem('sh-panel-collapsed','true');}catch{}
  const curatedControls={
  "lilac-frontier": {
    "controls": [
      "View mode",
      "Walking pace",
      "Exposure"
    ],
    "buttons": [
      "Enter hallway",
      "Reset position",
      "Reset all"
    ]
  },
  "vesper-drift": {
    "controls": [
      "Mouse mode",
      "Cruise assist",
      "Cruise speed"
    ],
    "buttons": [
      "Return home",
      "Reset all"
    ]
  },
  "2000-bugs": {
    "controls": [
      "Machines",
      "Pursuit speed",
      "Ground red",
      "Pause"
    ],
    "buttons": [
      "Shockwave",
      "Scatter the horde",
      "Reset all"
    ]
  },
  "portfolio-particle-spheres": {
    "controls": [
      "Spheres",
      "Rotation speed",
      "Resting color",
      "Active color"
    ],
    "buttons": [
      "Reset"
    ]
  },
  "engine-lab": {
    "controls": [
      "Sound on",
      "Volume",
      "Engine pitch",
      "Brightness"
    ],
    "buttons": [
      "Accelerate W",
      "Brake S",
      "Boost Shift",
      "Zero Motion",
      "Reset all"
    ]
  },
  "2026-07-14-viscous-ink": {
    "controls": [
      "Paper",
      "Ink one",
      "Ink two",
      "Brush size",
      "Stroke force"
    ],
    "buttons": [
      "Clear",
      "Reset all"
    ]
  },
  "asterion-cockpit": {
    "controls": [
      "Autopilot",
      "Thrust",
      "Cabin lights",
      "Exposure"
    ],
    "buttons": [
      "Replay arrival",
      "Reset"
    ]
  },
  "twigl-plume-sphere": {
    "hideAdvanced": true,
    "controls": [
      "Preset"
    ],
    "buttons": []
  },
  "particle-landscape": {
    "controls": [
      "terrain Color",
      "Point Size",
      "Hover Strength",
      "Scroll Speed",
      "Animate"
    ],
    "buttons": [
      "Reset all"
    ]
  },
  "topo-contour-terrain": {
    "controls": [
      "elevation Scale",
      "line Low Color",
      "line High Color",
      "scroll Speed"
    ],
    "buttons": [
      "Reset all"
    ]
  },
  "pc-greebles-editor": {
    "controls": [
      "Color Preset",
      "Density",
      "Speed"
    ],
    "buttons": [
      "Reset Defaults"
    ]
  },
  "crimson-strider": {
    "controls": [
      "Behavior",
      "Follow pointer",
      "Stepping pace (s)",
      "Stage red"
    ],
    "buttons": [
      "Reset camera",
      "Reset all"
    ]
  },
  "morrow-hauler": {
    "controls": [
      "camera Mode",
      "top Speed",
      "ground",
      "paused"
    ],
    "buttons": [
      "Reset vehicle",
      "Reset all"
    ]
  }
};
  const starPresets={
    'Azure Plume':'authored-default',
    'Chromosphere Surge':'chromosphere-surge',
    'Ember Veins':'ember-veins',
    'Ember Current':'ember-current',
    'Abyssal Current':'abyssal-current',
    'White Coral Labyrinth':'white-coral-labyrinth'
  };
  const curatedPanels=new WeakMap();
  const controlName=value=>value.trim().replace(/\s+/g,' ').toLowerCase();
  function curatePanel(panel){
    const selection=curatedControls[location.pathname.split('/')[2]],body=panel.querySelector('.sh-panel-body');
    if(!selection||!body||!window.SHPanel||!body.querySelector('.sh-folder,.sh-ctrl,.sh-btn'))return;
    let groups=curatedPanels.get(panel);
    if(!groups){
      // Use SHPanel's own folder implementation without constructing another
      // panel or installing a second keyboard-toggle listener.
      const context={_body:body},make=window.SHPanel.prototype.folder;
      const basic=make.call(context,'Explore',{expanded:true});
      const advanced=make.call(context,'Advanced',{expanded:false});
      basic.el.dataset.labsExplore='';advanced.el.dataset.labsAdvanced='';
      if(selection.hideAdvanced){advanced.el.hidden=true;advanced.el.inert=true;}
      groups={basic,advanced};curatedPanels.set(panel,groups);
    }
    const {basic,advanced}=groups;
    const controlCount=body.querySelectorAll('.sh-ctrl,button.sh-btn').length;
    const ungrouped=Array.from(body.children).some(child=>!child.classList.contains('labs-project-card')&&child!==basic.el&&child!==advanced.el);
    if(groups.controlCount===controlCount&&!ungrouped)return;
    groups.controlCount=controlCount;
    for(const child of Array.from(body.children)){
      if(child.classList.contains('labs-project-card')||child===basic.el||child===advanced.el)continue;
      advanced._body.append(child);
    }
    // Reparent the original live controls: their handlers, reset bindings,
    // conditional visibility, and JSON state remain owned by each project.
    for(const name of selection.controls){
      const row=Array.from(advanced._body.querySelectorAll('.sh-ctrl')).find(el=>controlName(el.querySelector('.sh-label')?.textContent||'')===controlName(name));
      if(row)basic._body.append(row);
    }
    for(const name of selection.buttons){
      const button=Array.from(advanced._body.querySelectorAll('button.sh-btn')).find(el=>controlName(el.textContent)===controlName(name));
      if(button)basic._body.append(button);
    }
    for(const folder of advanced._body.querySelectorAll('.sh-folder')){
      const empty=folder.querySelector(':scope > .sh-folder-body')?.children.length===0;
      if(empty){folder.hidden=true;folder.dataset.curationEmpty='true';}
      else if(folder.dataset.curationEmpty){folder.hidden=false;delete folder.dataset.curationEmpty;}
    }
  }

  // Project adapters leave the shared Screenhouse library unchanged.
  function adapt(panel) {
    const bindings=[];
    function folder(api) {
      api.body=api._body;
      api.setVisible=visible=>{(api.el||api._container).hidden=!visible;};
      const makeFolder=api.folder.bind(api);
      api.folder=(title,options)=>folder(makeFolder(title,options));
      for(const kind of ['slider','color','toggle','select']){
        const make=api[kind].bind(api);
        api[kind]=(object,key,options={})=>{
          if(kind==='select'&&key==='scenePreset'&&location.pathname.split('/')[2]==='twigl-plume-sphere')options={...options,label:'Preset',options:starPresets};
          if(kind==='select'&&Array.isArray(options.options)&&typeof options.options[0]==='object')options={...options,options:Object.fromEntries(options.options.map(o=>[o.label,o.value]))};
          const control=make(object,key,options);
          control.property=key;control.input=control._input;
          control._input?.setAttribute('aria-label',options.label||key.replace(/([A-Z])/g,' $1'));
          control.setVisible=visible=>{control._input.closest('.sh-ctrl').hidden=!visible;};
          bindings.push({object,key,control});return control;
        };
      }
      const makeButton=api.button.bind(api);
      api.button=(label,callback)=>{const control=makeButton(label,callback);control.input=api._body.lastElementChild;return control;};
      return api;
    }
    folder(panel);
    panel.refresh=(emit=false)=>bindings.forEach(({object,key,control})=>{control.setValue(object[key]);if(emit)control._emit('change',{value:object[key]});});
    return panel;
  }
  async function copy(project,settings,folder){
    const text=JSON.stringify({project,version:1,settings},null,2);
    const parent=folder._body;let status=parent.querySelector('[data-copy-status]');
    if(!status){status=document.createElement('p');status.dataset.copyStatus='';status.setAttribute('role','status');parent.append(status);}
    let success=false;
    try{await navigator.clipboard.writeText(text);success=true;}catch{
      const input=document.createElement('textarea');input.value=text;input.style.cssText='position:fixed;left:-9999px';parent.append(input);input.select();
      try{success=document.execCommand('copy');}catch{}input.remove();
    }
    status.textContent=success?'JSON copied.':'Copy unavailable. Please try again.';
  }
  const projects={
  "lilac-frontier": {
    "title": "Tal Cera: Surface Operations",
    "description": "A quiet observation bay overlooking an alien frontier."
  },
  "vesper-drift": {
    "title": "Avocet 2-6",
    "description": "Pilot a spacecraft through an endless asteroid belt."
  },
  "2000-bugs": {
    "title": "2000 Mechanical Bugs",
    "description": "A swarm of black steel machines that follows your pointer and scatters in shockwaves."
  },
  "portfolio-particle-spheres": {
    "title": "Particle Spheres",
    "description": "An interactive study of spherical forms built from moving particles."
  },
  "engine-lab": {
    "title": "Engine Lab",
    "description": "Shape engine sounds for games with synthesis and layered audio loops.",
    "github": "https://github.com/taylorallenux/engine-lab"
  },
  "2026-07-14-viscous-ink": {
    "title": "Viscous Ink",
    "description": "Paint with flowing pigment, textured paper, and fluid motion."
  },
  "asterion-cockpit": {
    "title": "ASTERION / Cockpit",
    "description": "Explore the controls, lighting, and atmosphere of a spacecraft cockpit."
  },
  "twigl-plume-sphere": {
    "title": "Star Simulator",
    "description": "Explore six animated star compositions, from flowing currents to a turbulent chromosphere."
  },
  "particle-landscape": {
    "title": "Particle Landscape",
    "description": "Explore a terrain made from particles, with soft edges and pointer interaction.",
    "github": "https://github.com/taylorallenux/study-particle-landscape"
  },
  "topo-contour-terrain": {
    "title": "Topo Contour Terrain",
    "description": "Shape a procedural landscape drawn in topographic contour lines."
  },
  "pc-greebles-editor": {
    "title": "PC: Greebles Editor",
    "description": "Build intricate mechanical surfaces from procedural geometric details."
  },
  "crimson-strider": {
    "title": "Crimson Strider",
    "description": "A mechanical walker study in motion, materials, and articulated limbs."
  },
  "morrow-hauler": {
    "title": "Morrow Hauler",
    "description": "Drive a lunar rover across an illustrated, procedural landscape."
  }
};
  const project=projects[location.pathname.split('/')[2]];
  function projectCard(panel){
    const body=panel.querySelector('.sh-panel-body');
    if(!project||!body||panel.dataset.projectCard)return;
    const card=document.createElement('section');card.className='labs-project-card';
    card.setAttribute('aria-label','About this project');
    const title=document.createElement('h1');title.className='labs-project-title';title.textContent=project.title;
    const description=document.createElement('p');description.className='labs-project-description';description.textContent=project.description;
    card.append(title,description);
    if(project.github){
      const link=document.createElement('a');link.className='labs-project-source';link.href=project.github;
      link.target='_blank';link.rel='noopener noreferrer';link.textContent='View on GitHub ↗';
      link.setAttribute('aria-label',project.title+' on GitHub (opens in a new tab)');card.append(link);
    }
    const hint=document.createElement('p');hint.className='labs-project-hint';
    const key=document.createElement('kbd');key.textContent='~';hint.append('Press ',key,' to toggle panel.');card.append(hint);
    panel.dataset.projectCard='true';body.prepend(card);
  }
  function enhance(){
    for(const panel of document.querySelectorAll('.sh-panel')){
      projectCard(panel);
      curatePanel(panel);
      if(!panel.dataset.labsReady){
        panel.dataset.labsReady='true';
        for(const type of ['pointerdown','pointermove','pointerup','wheel'])panel.addEventListener(type,e=>e.stopPropagation());
        panel.addEventListener('keydown',e=>{if(e.code!=='Backquote')e.stopPropagation();});
      }
      for(const head of panel.querySelectorAll('.sh-folder-head:not([role])')){
        head.setAttribute('role','button');head.tabIndex=0;
        const sync=()=>{const closed=head.parentElement.classList.contains('collapsed');head.setAttribute('aria-expanded',String(!closed));head.nextElementSibling.inert=closed;};
        head.addEventListener('click',sync);head.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();head.click();}});sync();
      }
      for(const input of panel.querySelectorAll('input:not([aria-label]),select:not([aria-label])')){
        const label=input.closest('.sh-ctrl')?.querySelector('.sh-label')?.textContent;
        if(label)input.setAttribute('aria-label',label);
      }
    }
  }
  if(new URLSearchParams(location.search).get('capture')==='1')document.documentElement.classList.add('capture-mode');
  window.LabsPanels={adapt,copy};
  window.addEventListener('message',event=>{
    if(event.source===parent&&event.origin===location.origin&&event.data?.source==='syntax-labs-controls'&&event.data.type==='toggle')document.dispatchEvent(new KeyboardEvent('keydown',{code:'Backquote',key:'`',bubbles:true}));
  });
  function reportPanel(){const panel=document.querySelector('.sh-panel');if(panel){const collapsed=panel.classList.contains('collapsed');panel.inert=collapsed;parent.postMessage({source:'syntax-labs-controls',type:'state',collapsed},location.origin);}}
  window.addEventListener('sh-panel-toggle',reportPanel);
  window.addEventListener('load',reportPanel);
  document.addEventListener('DOMContentLoaded',()=>{enhance();new MutationObserver(enhance).observe(document.body,{childList:true,subtree:true});});
})();
