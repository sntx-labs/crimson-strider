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
    "setup": "The runtime is in public/experiments/lilac-frontier/. Editable scene modules and rebuild instructions are in its source/README.md and source/lilac-frontier/src/. For authoring, first run npm run labs:authoring from the repository root, then follow source/README.md and the printed npm ci/build instructions. Preserve walking and view modes, streamed geometry, camera framing, exposure, and mobile joystick.",
    "license": "Preserve the existing third-party notices, including the Blender-derived noise shader GPL-2.0-or-later notice. Do not apply one blanket license to the project or its geometry.",
    "licenseLabel": "See repository notices",
    "github": "https://github.com/sntx-labs/tal-cera-surface-operations",
    "download": "https://github.com/sntx-labs/tal-cera-surface-operations/archive/refs/heads/main.zip",
    "repository": "tal-cera-surface-operations"
  },
  "vesper-drift": {
    "title": "Avocet 2-6",
    "description": "Pilot a spacecraft through an endless asteroid belt.",
    "technology": "Three.js",
    "setup": "Edit the ES modules in public/experiments/vesper-drift/, including flight-controls.js. Preserve the default orbit view, flight and chase modes, A/D roll, reticule, cruise assist, return-home controls, and touch flight.",
    "license": "No project-wide source license is established by this Labs page. Read the actual LICENSE, dependency notices, and asset terms in the repository. Do not infer permission to reuse or redistribute from the fact that the demo is public.",
    "licenseLabel": "See repository notices",
    "github": "https://github.com/sntx-labs/avocet-2-6",
    "download": "https://github.com/sntx-labs/avocet-2-6/archive/refs/heads/main.zip",
    "repository": "avocet-2-6"
  },
  "2000-bugs": {
    "title": "2000 Mechanical Bugs",
    "description": "A swarm of black steel machines that follows your pointer and scatters in shockwaves.",
    "technology": "Three.js",
    "setup": "Edit public/experiments/2000-bugs/, especially main.js, bug.js, simulation.js, and steel.js. Preserve pointer pursuit, touch drag, shockwaves, scatter, pause, authored machine count, rendering, and reset.",
    "license": "No project-wide source license is established by this Labs page. Read the actual LICENSE, dependency notices, and asset terms in the repository. Do not infer permission to reuse or redistribute from the fact that the demo is public.",
    "licenseLabel": "See repository notices",
    "github": "https://github.com/sntx-labs/2000-bugs",
    "download": "https://github.com/sntx-labs/2000-bugs/archive/refs/heads/main.zip",
    "repository": "2000-bugs"
  },
  "portfolio-particle-spheres": {
    "title": "Particle Spheres",
    "description": "An interactive study of spherical forms built from moving particles.",
    "technology": "Three.js",
    "setup": "The published runtime is in public/experiments/portfolio-particle-spheres/. Editable authoring source is in authoring/particle-spheres/. Run npm run labs:authoring at the root to prepare its assets, then follow the printed install/build instructions in that authoring folder. The authoring snapshot may predate Labs changes; compare against the published runtime before replacing a bundle. Preserve the authored defaults, sphere count, rotation, resting and active colors, pointer interaction, resize, and reset.",
    "license": "No project-wide source license is established by this Labs page. Read the actual LICENSE, dependency notices, and asset terms in the repository. Do not infer permission to reuse or redistribute from the fact that the demo is public.",
    "licenseLabel": "See repository notices",
    "github": "https://github.com/sntx-labs/particle-spheres",
    "download": "https://github.com/sntx-labs/particle-spheres/archive/refs/heads/main.zip",
    "repository": "particle-spheres"
  },
  "engine-lab": {
    "title": "Engine Lab",
    "description": "Shape engine sounds for games with synthesis and layered audio loops.",
    "github": "https://github.com/sntx-labs/engine-lab",
    "download": "https://github.com/sntx-labs/engine-lab/archive/refs/heads/main.zip",
    "technology": "Web Audio",
    "setup": "Edit the Labs runtime in public/experiments/engine-lab/. The original standalone source and README are retained at repository root: its separate Vite workflow uses npm install, npm run dev, engine-lab.html, and npm run build. Use the labs scripts below to reproduce the Labs adaptation instead. Preserve audio activation by user gesture, localized sample loading, synthesis, layered loops, scope, keyboard/pointer acceleration, braking, boost, and reset. Test audio after a user gesture.",
    "license": "The existing Engine Lab source is CC BY 4.0. Preserve appropriate credit, a link to the license, and an indication of changes. Check sample and dependency licenses separately; do not replace existing license terms.",
    "licenseLabel": "CC BY 4.0",
    "repository": "engine-lab"
  },
  "2026-07-14-viscous-ink": {
    "title": "Liquid Painting",
    "description": "Paint with flowing pigment, textured paper, and fluid motion.",
    "technology": "Three.js",
    "setup": "Liquid Painting retains the historical repository name viscous-ink. Edit its Three.js/WebGL fluid modules in public/experiments/2026-07-14-viscous-ink/. Preserve the clean white startup, shader advection, paper texture, two ink colors, brush size, low stroke force, pointer/touch painting, clear action, reset, and resize.",
    "license": "No project-wide source license is established by this Labs page. Read the actual LICENSE, dependency notices, and asset terms in the repository. Do not infer permission to reuse or redistribute from the fact that the demo is public.",
    "licenseLabel": "See repository notices",
    "github": "https://github.com/sntx-labs/viscous-ink",
    "download": "https://github.com/sntx-labs/viscous-ink/archive/refs/heads/main.zip",
    "repository": "viscous-ink"
  },
  "asterion-cockpit": {
    "title": "ASTERION / Cockpit",
    "description": "Explore the controls, lighting, and atmosphere of a spacecraft cockpit.",
    "technology": "Three.js",
    "setup": "The published runtime is in public/experiments/asterion-cockpit/. Editable authoring source is in authoring/asterion-cockpit/. Run npm run labs:authoring at the root to reconstruct/copy its large assets, then follow the printed npm ci/build instructions. The authoring snapshot may predate Labs changes; compare with the runtime before replacing its bundle. Preserve loading/arrival sequence, arrival replay, camera, autopilot, thrust, cabin lights, exposure, reset, and streamed assets.",
    "license": "Check the licenses and provenance of the cockpit models, textures, and other assets separately before reuse or redistribution. Do not infer asset rights from the rendering library license.",
    "licenseLabel": "See repository notices",
    "github": "https://github.com/sntx-labs/asterion-cockpit",
    "download": "https://github.com/sntx-labs/asterion-cockpit/archive/refs/heads/main.zip",
    "repository": "asterion-cockpit"
  },
  "twigl-plume-sphere": {
    "title": "Star Simulator",
    "description": "Explore six animated star compositions, from flowing currents to a turbulent chromosphere.",
    "technology": "WebGL",
    "setup": "The published runtime is in public/experiments/twigl-plume-sphere/. Editable authoring source is in authoring/star-simulator/. Run npm run labs:authoring at the root to prepare assets, then follow the printed install/build instructions. The authoring snapshot may predate Labs changes. Preserve the pre-entry High/Medium/Low graphics choice, per-preset rendering budgets, Chromosphere Surge startup, and all six presets: Azure Plume, Chromosphere Surge, Ember Veins, Ember Current, Abyssal Current, and White Coral Labyrinth. Keep the simple preset-only panel, animation, and responsive canvas.",
    "license": "Preserve the existing shader credits and third-party notices, including applicable Yohei Nishitsuji MIT attribution. Do not replace or remove upstream attribution or assume one license covers every asset.",
    "licenseLabel": "See repository notices",
    "github": "https://github.com/sntx-labs/star-simulator",
    "download": "https://github.com/sntx-labs/star-simulator/archive/refs/heads/main.zip",
    "repository": "star-simulator"
  },
  "particle-landscape": {
    "title": "Particle Landscape",
    "description": "Explore a terrain made from particles, with soft edges and pointer interaction.",
    "github": "https://github.com/sntx-labs/particle-landscape",
    "download": "https://github.com/sntx-labs/particle-landscape/archive/refs/heads/main.zip",
    "technology": "Three.js",
    "setup": "Edit the Labs modules in public/experiments/particle-landscape/. Preserve heightmap loading, tiling, pointer hover, fog, animation, camera, reset, oval framing, and the airplane-disabled default. The original standalone source and README are retained at repository root and describe Tweakpane and CDN imports; the Labs adaptation uses local dependencies and SHPanel. Labs was originally imported from upstream commit a940f8a3bb9495a36e6296c16707375f26892648. Use the labs scripts below for the current Labs version instead of serving the original root index.html.",
    "license": "The upstream Particle Landscape source is MIT-licensed. Preserve its copyright and permission notice in copies or substantial portions. Check dependency and asset licenses separately; do not replace the upstream MIT license.",
    "licenseLabel": "MIT source",
    "repository": "particle-landscape"
  },
  "topo-contour-terrain": {
    "title": "Topo Contour Terrain",
    "description": "Shape a procedural landscape drawn in topographic contour lines.",
    "technology": "Three.js",
    "setup": "Edit the modules and shaders in public/experiments/topo-contour-terrain/. Preserve heightmap_512x512.png loading, contour lines, CRT display effects, bloom, color/elevation settings, drag/zoom, scroll speed, and reset.",
    "license": "No project-wide source license is established by this Labs page. Read the actual LICENSE, dependency notices, and asset terms in the repository. Do not infer permission to reuse or redistribute from the fact that the demo is public.",
    "licenseLabel": "See repository notices",
    "github": "https://github.com/sntx-labs/topo-contour-terrain",
    "download": "https://github.com/sntx-labs/topo-contour-terrain/archive/refs/heads/main.zip",
    "repository": "topo-contour-terrain"
  },
  "pc-greebles-editor": {
    "title": "PC: Greebles Editor",
    "description": "Build intricate mechanical surfaces from procedural geometric details.",
    "technology": "Three.js",
    "setup": "The published runtime is in public/experiments/pc-greebles-editor/. Editable authoring source is in authoring/greebles-editor/. Run npm run labs:authoring at the root to prepare assets, then follow the printed install/build instructions. Compare this older authoring snapshot with the current runtime before replacing a bundle. Preserve procedural geometry controls, camera, materials, color presets, density, speed, and reset.",
    "license": "Read the license and any grants accompanying the provided editor source, models, and assets. Preserve applicable third-party notices and existing grants; do not assume a public demo grants reuse rights.",
    "licenseLabel": "See repository notices",
    "github": "https://github.com/sntx-labs/greebles-editor",
    "download": "https://github.com/sntx-labs/greebles-editor/archive/refs/heads/main.zip",
    "repository": "greebles-editor"
  },
  "crimson-strider": {
    "title": "Crimson Strider",
    "description": "A mechanical walker study in motion, materials, and articulated limbs.",
    "technology": "Three.js",
    "setup": "Edit public/experiments/crimson-strider/, especially main.js, kinematics.js, motion.js, stance.js, and steel.js. Preserve articulated stepping, follow-pointer behavior, pace, stage color, camera reset, and full reset.",
    "license": "No project-wide source license is established by this Labs page. Read the actual LICENSE, dependency notices, and asset terms in the repository. Do not infer permission to reuse or redistribute from the fact that the demo is public.",
    "licenseLabel": "See repository notices",
    "github": "https://github.com/sntx-labs/crimson-strider",
    "download": "https://github.com/sntx-labs/crimson-strider/archive/refs/heads/main.zip",
    "repository": "crimson-strider"
  },
  "morrow-hauler": {
    "title": "Morrow Hauler",
    "description": "Drive a lunar rover across an illustrated, procedural landscape.",
    "technology": "Three.js",
    "setup": "Edit the Three.js modules in public/experiments/morrow-hauler/ for rover, terrain, illustration, engraving, and tires. Preserve WASD/arrow driving, Space braking, R reset, C camera switching, camera modes, top speed, ground color, pause, and touch behavior.",
    "license": "No project-wide source license is established by this Labs page. Read the actual LICENSE, dependency notices, and asset terms in the repository. Do not infer permission to reuse or redistribute from the fact that the demo is public.",
    "licenseLabel": "See repository notices",
    "github": "https://github.com/sntx-labs/morrow-hauler",
    "download": "https://github.com/sntx-labs/morrow-hauler/archive/refs/heads/main.zip",
    "repository": "morrow-hauler"
  }
};
  const projectSlug=location.pathname.split('/')[2];
  const project=projects[projectSlug];
  const implementationOffer='Want an experience like this, designed for your product? Work with Syntax on a custom implementation: ';
  const implementationUrl='https://sntx.co/';
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
    return 'Help me explore and adapt '+project.title+' for my project.\n\n'+
      'My goal: [describe the change, product, or experiment I want to make].\n\n'+
      project.description+'\n\nLive Labs reference:\nhttps://labs.sntx.co/experiments/'+projectSlug+'/\n\n'+
      'GitHub repository (SNTX Labs):\n'+project.github+'\n\n'+
      'Get the source and run locally:\nRead README.md, LABS.md, license/third-party notices, and any repository instructions first. Requires Git and Node.js 20+ with npm. Clone into a new directory, or use my existing checkout without overwriting local changes. The main branch contains the Labs snapshot.\n\n'+
      'git clone '+project.github+'.git\n'+
      'cd '+project.repository+'\n'+
      'npm run labs:verify\n'+
      'npm run labs:dev\n\n'+
      'No dependency installation is needed for this Labs preview. Open the localhost URL printed by the server at /experiments/'+projectSlug+'/. Keep the server running; stop it with Ctrl+C. If GitHub denies access, ask me for authorized access or a source archive; do not substitute a different repository.\n\n'+
      'Project-specific editing:\n'+project.setup+'\n\n'+
      'Build and verify:\nFrom the repository root, npm run labs:build creates dist/ and reconstructs any large assets from their checked-in parts. This assembles the published runtime; it does not recompile a separate authoring snapshot. npm run labs:verify checks the checked-in snapshot hashes before editing; an intentional runtime edit changes those hashes. Inspect and document those changes rather than hiding a mismatch. Test the built output over HTTP, not file://.\n\n'+
      'Labs integration:\nThe repository includes the Labs navigation shell, loading UI, and SHPanel in public/ui/. Preserve the authored startup, controls, reset/export where available, keyboard/touch interactions, and mobile layout. Keep changes focused on my goal. Compare any older authoring source with the current runtime before rebuilding it.\n\n'+
      'Implementation and verification:\nTest the scene, controls, repeated actions, panel open/close, resize behavior, and browser console. Report what actually ran and any blocked checks. Explain changed files, run instructions, and remaining decisions. Do not deploy or publish without my request.\n\n'+
      'License and attribution:\n'+project.license+'\n\n'+
      'Follow and implementation help (optional actions for me):\n'+
      '- Follow Taylor on Twitter/X for more experiments: @taylor_sntx — https://x.com/taylor_sntx\n'+
      '- '+implementationOffer+implementationUrl+'\n'+
      '- I can star '+project.github+' to find it again. Do not star it on my behalf.\n'+
      '- I can sign up for experiment updates at https://labs.sntx.co/. Do not submit an email address or subscribe me automatically.\n'+
      'Do not follow accounts, send messages, or book a call on my behalf.\n';
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
    const offer=sourceElement('p','source-implementation');
    const contact=sourceElement('a','','sntx.co');
    contact.href=implementationUrl;contact.target='_blank';contact.rel='noopener noreferrer';
    contact.setAttribute('aria-label','Work with Syntax on a custom implementation (opens in a new tab)');
    offer.append(implementationOffer,contact);
    fallback.append(label,field);card.append(intro,actions,offer,status,fallback);
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
