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
    "description": "A quiet observation bay overlooking an alien frontier.",
    "technology": "Three.js",
    "setup": "This Labs scene uses a Vite-built Three.js observation bay with walking and view modes, exposure controls, and streamed geometry. Preserve the walking controls, camera framing, geometry loading, and mobile joystick. The provided source README describes a Node.js 24 build with npm ci and npm run build; confirm these against an owner-provided checkout before running them.",
    "license": "Preserve the existing third-party notices, including the Blender-derived noise shader GPL-2.0-or-later notice. Do not apply one blanket license to the project or its geometry.",
    "licenseLabel": "Source not linked"
  },
  "vesper-drift": {
    "title": "Avocet 2-6",
    "description": "Pilot a spacecraft through an endless asteroid belt.",
    "technology": "Three.js",
    "setup": "This Labs scene uses JavaScript ES modules and Three.js for spacecraft flight, asteroid fields, mouse modes, and cruise assist. Preserve flight-controls.js behavior, camera orbit, return-home controls, keyboard flight, and touch input. Inspect an owner-provided checkout for its actual entry point and run instructions; do not invent npm scripts.",
    "license": "No project-wide source license is established by this Labs page. Read the actual LICENSE, dependency notices, and asset terms in the owner-provided project. Do not infer permission to reuse or redistribute from the fact that the demo is public.",
    "licenseLabel": "Source not linked"
  },
  "2000-bugs": {
    "title": "2000 Mechanical Bugs",
    "description": "A swarm of black steel machines that follows your pointer and scatters in shockwaves.",
    "technology": "Three.js",
    "setup": "This Labs scene uses local Three.js ES modules with main.js, bug.js, simulation.js, and steel.js. Preserve pointer pursuit, touch drag, shockwaves, scatter, pause, machine count, rendering, and reset. For an authorized complete static checkout, serve its root over HTTP with its vendor dependencies present; confirm its own instructions first.",
    "license": "No project-wide source license is established by this Labs page. Read the actual LICENSE, dependency notices, and asset terms in the owner-provided project. Do not infer permission to reuse or redistribute from the fact that the demo is public.",
    "licenseLabel": "Source not linked"
  },
  "portfolio-particle-spheres": {
    "title": "Particle Spheres",
    "description": "An interactive study of spherical forms built from moving particles.",
    "technology": "Three.js",
    "setup": "This Labs scene is a bundled Three.js particle-sphere study. Preserve sphere count, rotation speed, resting and active colors, pointer interaction, resize handling, and reset. Obtain the editable project before choosing install or build commands; the deployed bundle is not a substitute for a source checkout.",
    "license": "No project-wide source license is established by this Labs page. Read the actual LICENSE, dependency notices, and asset terms in the owner-provided project. Do not infer permission to reuse or redistribute from the fact that the demo is public.",
    "licenseLabel": "Source not linked"
  },
  "engine-lab": {
    "title": "Engine Lab",
    "description": "Shape engine sounds for games with synthesis and layered audio loops.",
    "github": "https://github.com/sntx-labs/engine-lab",
    "download": "https://github.com/sntx-labs/engine-lab/archive/refs/heads/main.zip",
    "technology": "Web Audio",
    "setup": "The sntx-labs repository contains the current Labs snapshot alongside the original standalone project. Read LABS.md first: Node.js 20 or newer, npm run labs:dev to run the Labs adaptation, npm run labs:verify to validate its files, and npm run labs:build to assemble a deployable snapshot. This is a browser-based Web Audio engine-sound lab with synthesis, layered loops, a scope, keyboard and pointer acceleration, braking, and boost. Preserve audio activation by user gesture, sample loading, volume, pitch, brightness, and reset. The current upstream README documents npm install, npm run dev, and Vite's local URL with engine-lab.html; npm run build creates the production build. Confirm the current README and package scripts before running commands, and test audio after a user gesture. The Labs snapshot has localized audio and dependencies and an adapted SHPanel, so upstream may differ.",
    "license": "The existing Engine Lab source is CC BY 4.0. Preserve appropriate credit, a link to the license, and an indication of changes. Check sample and dependency licenses separately; do not replace existing license terms.",
    "licenseLabel": "CC BY 4.0"
  },
  "2026-07-14-viscous-ink": {
    "title": "Liquid Painting",
    "description": "Paint with flowing pigment, textured paper, and fluid motion.",
    "technology": "Three.js",
    "setup": "This Labs scene is a Three.js/WebGL fluid painting study with shader-based advection, paper texture, two ink colors, brush size, and stroke force. Preserve pointer and touch painting, the clear action, reset, simulation behavior, and resize. For an authorized complete static checkout, inspect its ES module imports and serve the root over HTTP; do not assume a package build exists.",
    "license": "No project-wide source license is established by this Labs page. Read the actual LICENSE, dependency notices, and asset terms in the owner-provided project. Do not infer permission to reuse or redistribute from the fact that the demo is public.",
    "licenseLabel": "Source not linked"
  },
  "asterion-cockpit": {
    "title": "ASTERION / Cockpit",
    "description": "Explore the controls, lighting, and atmosphere of a spacecraft cockpit.",
    "technology": "Three.js",
    "setup": "This Labs scene is a bundled spacecraft cockpit with an arrival sequence, autopilot, thrust, cabin lights, exposure, and reset. Preserve the arrival replay, camera, lighting, control bindings, and streamed large assets. Obtain editable source and the matching asset set before selecting the build workflow.",
    "license": "Check the licenses and provenance of the cockpit models, textures, and other assets separately before reuse or redistribution. Do not infer asset rights from the rendering library license.",
    "licenseLabel": "Source not linked"
  },
  "twigl-plume-sphere": {
    "title": "Star Simulator",
    "description": "Explore six animated star compositions, from flowing currents to a turbulent chromosphere.",
    "technology": "WebGL",
    "setup": "This Labs scene is a bundled shader-based star simulator with six authored presets: Azure Plume, Chromosphere Surge, Ember Veins, Ember Current, Abyssal Current, and White Coral Labyrinth. Preserve all six presets, animation, rendering, and responsive canvas behavior. Inspect the owner-provided editable source and its package scripts before choosing a build workflow.",
    "license": "Preserve the existing shader credits and third-party notices, including applicable Yohei Nishitsuji MIT attribution. Do not replace or remove upstream attribution or assume one license covers every asset.",
    "licenseLabel": "Source not linked"
  },
  "particle-landscape": {
    "title": "Particle Landscape",
    "description": "Explore a terrain made from particles, with soft edges and pointer interaction.",
    "github": "https://github.com/sntx-labs/particle-landscape",
    "download": "https://github.com/sntx-labs/particle-landscape/archive/refs/heads/main.zip",
    "technology": "Three.js",
    "setup": "The sntx-labs repository contains the current Labs snapshot alongside the original standalone project. Read LABS.md first: Node.js 20 or newer, npm run labs:dev to run the Labs adaptation, npm run labs:verify to validate its files, and npm run labs:build to assemble a deployable snapshot. The upstream README describes a static Three.js/WebGL 2 study with ES modules/CDN imports, no build step, index.html, and assets/heightmap_512x512.png. Read the current README and imports first. For local testing, use a static HTTP server from the repository root; if Python 3 is already available, python3 -m http.server 8000 is suitable. Open http://localhost:8000 in a WebGL 2 browser. Preserve heightmap loading, tiling, pointer hover, fog, animation, camera behavior, and reset. Labs was imported from upstream commit a940f8a3bb9495a36e6296c16707375f26892648 and adapted to SHPanel with a docked panel, artwork-first launch, Explore/Advanced groups, settings export/reset, and oval framing. The upstream README describes Tweakpane: do not claim the upstream repository exactly reproduces the Labs adaptation.",
    "license": "The upstream Particle Landscape source is MIT-licensed. Preserve its copyright and permission notice in copies or substantial portions. Check dependency and asset licenses separately; do not replace the upstream MIT license.",
    "licenseLabel": "MIT source"
  },
  "topo-contour-terrain": {
    "title": "Topo Contour Terrain",
    "description": "Shape a procedural landscape drawn in topographic contour lines.",
    "technology": "Three.js",
    "setup": "This Labs scene uses Three.js, shader contour lines, heightmap displacement, bloom, orbit controls, and color/elevation settings. Its included README describes serving the folder with a static HTTP server, and uses heightmap_512x512.png. Preserve contour rendering, camera drag/zoom, scroll speed, reset, and all shader controls. Confirm the actual entry point, imports, and run instructions in the owner-provided source first.",
    "license": "No project-wide source license is established by this Labs page. Read the actual LICENSE, dependency notices, and asset terms in the owner-provided project. Do not infer permission to reuse or redistribute from the fact that the demo is public.",
    "licenseLabel": "Source not linked"
  },
  "pc-greebles-editor": {
    "title": "PC: Greebles Editor",
    "description": "Build intricate mechanical surfaces from procedural geometric details.",
    "technology": "Three.js",
    "setup": "This Labs scene is a bundled procedural mechanical-surface editor with color presets, density, speed, and reset. Preserve the live geometry controls, camera, materials, and reset behavior. Obtain the editable source and inspect its current scripts before choosing an install or build workflow.",
    "license": "Read the license and any grants accompanying the provided editor source, models, and assets. Preserve applicable third-party notices and existing grants; do not assume a public demo grants reuse rights.",
    "licenseLabel": "Source not linked"
  },
  "crimson-strider": {
    "title": "Crimson Strider",
    "description": "A mechanical walker study in motion, materials, and articulated limbs.",
    "technology": "Three.js",
    "setup": "This Labs scene uses local Three.js ES modules with main.js, kinematics.js, motion.js, stance.js, and steel.js. Preserve articulated stepping, follow-pointer behavior, pace, stage color, camera reset, and full reset. For an authorized complete static checkout, inspect its module imports and serve its root over HTTP with vendor dependencies present.",
    "license": "No project-wide source license is established by this Labs page. Read the actual LICENSE, dependency notices, and asset terms in the owner-provided project. Do not infer permission to reuse or redistribute from the fact that the demo is public.",
    "licenseLabel": "Source not linked"
  },
  "morrow-hauler": {
    "title": "Morrow Hauler",
    "description": "Drive a lunar rover across an illustrated, procedural landscape.",
    "technology": "Three.js",
    "setup": "This Labs scene uses Three.js ES modules for a lunar rover, terrain, illustration, engraving, and tires. Preserve WASD/arrow driving, Space braking, R reset, C camera switching, camera modes, top speed, ground color, pause, and touch behavior. For an authorized complete static checkout, inspect its imports and serve its root over HTTP with its dependencies present.",
    "license": "No project-wide source license is established by this Labs page. Read the actual LICENSE, dependency notices, and asset terms in the owner-provided project. Do not infer permission to reuse or redistribute from the fact that the demo is public.",
    "licenseLabel": "Source not linked"
  }
};
  const projectSlug=location.pathname.split('/')[2];
  const project=projects[projectSlug];
  const sourceIcons={
    github:'<path d="M9 19c-4 1-4-2-6-2m12 4v-4a3.5 3.5 0 0 0-1-3c3-.4 6-1.5 6-6a4.7 4.7 0 0 0-1.3-3.3 4.3 4.3 0 0 0-.1-3.3S17.4 1 15 2.6a11 11 0 0 0-6 0C6.6 1 5.4 1.4 5.4 1.4a4.3 4.3 0 0 0-.1 3.3A4.7 4.7 0 0 0 4 8c0 4.5 3 5.6 6 6a3.5 3.5 0 0 0-1 3v4"/>',
    download:'<path d="M12 3v12m-4-4 4 4 4-4M4 16v5h16v-5"/>',
    chevron:'<path d="m6 9 6 6 6-6"/>',
    link:'<path d="M10 13a5 5 0 0 0 7 .2l3-3a5 5 0 0 0-7-7l-1.7 1.7M14 11a5 5 0 0 0-7-.2l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>',
    copy:'<rect x="8" y="8" width="12" height="13" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/>'
  };
  function sourceElement(tag,className,text){
    const element=document.createElement(tag);element.className=className;
    if(text!==undefined)element.textContent=text;
    return element;
  }
  function sourceRow(label,detail,icon,url,className='source-menu-item'){
    const row=sourceElement(url?'a':'button',className);
    if(url){row.href=url;row.target='_blank';row.rel='noopener noreferrer';row.setAttribute('aria-label',project.title+' '+label+' (opens in a new tab)');}
    else row.type='button';
    const graphic=document.createElementNS('http://www.w3.org/2000/svg','svg');
    graphic.setAttribute('viewBox','0 0 24 24');graphic.setAttribute('fill','none');graphic.setAttribute('stroke','currentColor');graphic.setAttribute('stroke-width','1.5');graphic.setAttribute('aria-hidden','true');graphic.innerHTML=sourceIcons[icon];
    row.append(graphic,sourceElement('span','source-action-label',label),sourceElement('span','source-action-detail',detail));
    return row;
  }
  function agentPrompt(){
    const source=project.github
      ?'Source repository:\n'+project.github+'\n\nRead the current README, LICENSE, source, and any agent instructions. Confirm the default branch and current commit. Clone into a new working directory, or use my existing checkout if I provide one. Do not overwrite existing local changes.'
      :'Source availability:\nA public source repository and downloadable source release are not linked from this Labs page. Ask me for an authorized repository, archive, or existing checkout before implementation. Do not invent a GitHub destination, clone command, or source license.';
    return 'Help me explore and adapt '+project.title+' for my project.\n\n'+
      'My goal: [describe the change, product, or experiment I want to make].\n\n'+
      project.description+'\n\nLive Labs reference:\nhttps://labs.sntx.co/experiments/'+projectSlug+'/\n\n'+source+'\n\n'+
      'Project and setup context:\n'+project.setup+'\n\n'+
      'Labs integration:\nThe live demo uses SHPanel controls and a Labs navigation shell. Treat it as a deployed snapshot; an upstream repository may differ. If I need the exact Labs adaptation, ask for the relevant Labs source before changing the architecture. Preserve existing controls, rendering, reset/export, keyboard and touch interactions, and mobile layout. Inspect the actual project before installing dependencies; never invent package scripts.\n\n'+
      'Implementation and verification:\nKeep the requested change focused. Test the scene, controls, repeated actions, panel open/close, resize behavior, and browser console. Report what actually ran and any blocked checks. Explain the changed files, run instructions, and remaining decisions. Do not deploy or publish without my request.\n\n'+
      'License and attribution:\n'+project.license+'\n\n'+
      'Optional next steps for me, not automatic agent actions:\n'+
      (project.github?'- I can star '+project.github+' to find it again. Do not star it on my behalf.\n':'')+
      '- I can choose to sign up for occasional experiment emails at https://labs.sntx.co/. Do not submit an email address or subscribe me automatically.\n'+
      '- For custom implementation help, I can use the Book a Call link at https://www.sntx.co/. Do not send a message or book a call on my behalf.\n';
  }
  function projectCard(panel){
    const body=panel.querySelector('.sh-panel-body');
    if(!project||!body||panel.dataset.projectCard)return;
    const card=sourceElement('section','labs-project-card source-rows-card');
    card.setAttribute('aria-label','About '+project.title);
    const intro=sourceElement('div','source-intro');
    intro.append(sourceElement('h1','labs-project-title',project.title),sourceElement('p','source-description',project.description));
    const actions=sourceElement('div','source-actions');actions.setAttribute('aria-label','Project source');
    const github=sourceRow('GitHub','','github',project.github,'source-github');
    github.disabled=!project.github;
    if(!project.github){github.title='Source not available';github.setAttribute('aria-label','GitHub source not available');}
    const split=sourceElement('div','source-split');
    const copyButton=sourceRow('Copy prompt','','copy',null,'source-copy-button');
    const toggle=sourceRow('','','chevron',null,'source-menu-toggle');
    toggle.setAttribute('aria-label','More project actions');toggle.setAttribute('aria-haspopup','menu');toggle.setAttribute('aria-expanded','false');
    const menu=sourceElement('div','source-menu');menu.id='labs-actions-'+projectSlug;menu.hidden=true;
    menu.setAttribute('role','menu');menu.setAttribute('aria-label','Project actions');toggle.setAttribute('aria-controls',menu.id);
    const promptItem=sourceRow('Copy prompt','Project context for your coding assistant.','copy');
    const linkItem=sourceRow('Copy project link','Share the live experience.','link');
    const downloadItem=sourceRow('Download source',project.download?'Repository ZIP. GitHub access required.':'Source not available.','download',project.download);
    downloadItem.disabled=!project.download;
    const menuItems=[promptItem,linkItem,downloadItem];
    menuItems.forEach(item=>{item.setAttribute('role','menuitem');item.tabIndex=-1;});
    menu.append(...menuItems);split.append(copyButton,toggle);actions.append(github,split,menu);
    const status=sourceElement('span','source-status');status.setAttribute('role','status');status.setAttribute('aria-live','polite');status.setAttribute('aria-atomic','true');
    const fallback=sourceElement('div','prompt-copy-fallback');fallback.hidden=true;
    const label=sourceElement('label','','Select and copy this prompt');
    const field=sourceElement('textarea','');field.id='labs-prompt-'+projectSlug;field.rows=8;field.readOnly=true;field.setAttribute('aria-label',project.title+' agent prompt');label.htmlFor=field.id;
    fallback.append(label,field);card.append(intro,actions,status,fallback);
    function closeMenu(restoreFocus=false){
      menu.hidden=true;toggle.setAttribute('aria-expanded','false');if(restoreFocus)toggle.focus();
    }
    function openMenu(last=false){
      menu.hidden=false;toggle.setAttribute('aria-expanded','true');
      const enabled=menuItems.filter(item=>!item.disabled);(last?enabled.at(-1):enabled[0])?.focus();
      menu.scrollIntoView?.({block:'nearest',inline:'nearest'});
    }
    toggle.addEventListener('click',()=>{if(menu.hidden)openMenu();else closeMenu(true);});
    toggle.addEventListener('keydown',event=>{
      if(event.key==='ArrowDown'||event.key==='ArrowUp'){event.preventDefault();openMenu(event.key==='ArrowUp');}
      else if(event.key==='Escape'){event.preventDefault();event.stopPropagation();closeMenu(true);}
    });
    menu.addEventListener('keydown',event=>{
      const enabled=menuItems.filter(item=>!item.disabled),index=enabled.indexOf(document.activeElement);
      let next;
      if(event.key==='ArrowDown')next=(index+1)%enabled.length;
      if(event.key==='ArrowUp')next=(index-1+enabled.length)%enabled.length;
      if(event.key==='Home')next=0;
      if(event.key==='End')next=enabled.length-1;
      if(next!==undefined){event.preventDefault();enabled[next]?.focus();}
      if(event.key==='Escape'){event.preventDefault();event.stopPropagation();closeMenu(true);}
      if(event.key==='Tab')closeMenu();
    });
    // Capture observes outside interactions even when the panel stops scene input.
    document.addEventListener('pointerdown',event=>{if(!menu.hidden&&!actions.contains(event.target))closeMenu();},true);
    document.addEventListener('focusin',event=>{if(!menu.hidden&&!actions.contains(event.target))closeMenu();},true);
    window.addEventListener('sh-panel-toggle',()=>closeMenu());
    downloadItem.addEventListener('click',()=>closeMenu());
    let copying=false,noticeTimer;
    async function copyText(text,kind){
      if(copying)return;
      copying=true;closeMenu();[copyButton,promptItem,linkItem].forEach(item=>item.disabled=true);copyButton.setAttribute('aria-busy','true');
      clearTimeout(noticeTimer);status.textContent='';copyButton.querySelector('.source-action-label').textContent='Copy prompt';fallback.hidden=true;
      let copied=false;
      try{
        try{await navigator.clipboard.writeText(text);copied=true;}catch{}
        if(!copied){
          const temporary=document.createElement('textarea');temporary.value=text;temporary.setAttribute('aria-label',kind);temporary.style.cssText='position:fixed;left:-9999px;top:0';document.body.append(temporary);temporary.select();
          try{copied=document.execCommand('copy');}catch{}finally{temporary.remove();}
        }
        if(copied){
          status.textContent=kind+' copied';copyButton.querySelector('.source-action-label').textContent='Copied';
          noticeTimer=setTimeout(()=>{status.textContent='';copyButton.querySelector('.source-action-label').textContent='Copy prompt';},2500);
        }else{
          label.textContent='Select and copy this '+(kind==='Project link'?'link':'prompt');field.setAttribute('aria-label',project.title+' '+kind.toLowerCase());
          field.value=text;fallback.hidden=false;status.textContent='Copy blocked';field.focus();field.select();
        }
      }finally{
        copying=false;[copyButton,promptItem,linkItem].forEach(item=>item.disabled=false);copyButton.removeAttribute('aria-busy');if(copied)copyButton.focus();
      }
    }
    copyButton.addEventListener('click',()=>copyText(agentPrompt(),'Prompt'));
    promptItem.addEventListener('click',()=>copyText(agentPrompt(),'Prompt'));
    linkItem.addEventListener('click',()=>copyText('https://labs.sntx.co/experiments/'+projectSlug+'/','Project link'));
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
