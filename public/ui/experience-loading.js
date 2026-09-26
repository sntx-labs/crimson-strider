(() => {
  if (window.parent === window) return;
  const slug = location.pathname.split('/').at(-2);
  const explicit = ['asterion-cockpit', 'crimson-strider'].includes(slug);
  const pending = new Map(), restore = [];
  let sequence=0, stopped=false, loaded=false, fonts=false, drawn=false, signaled=!explicit, quietTimer, lastStatus=0;
  const post=(type,extra={})=>window.parent.postMessage({source:'syntax-labs-loading',type,...extra},location.origin);
  function label(url) {
    const name=String(url).toLowerCase();
    if (/footwell/.test(name)) return 'Loading cockpit details';
    if (/terrain|heightmap/.test(name)) return 'Loading terrain';
    if (/\.bin|\.glb|\.gltf|geometry/.test(name)) return slug==='asterion-cockpit'?'Loading cockpit geometry':'Loading 3D geometry';
    if (/\.woff|\.ttf/.test(name)) return 'Loading typefaces';
    if (/\.mp3|\.wav|\.ogg/.test(name)) return 'Loading sound assets';
    if (/\.png|\.jpg|\.webp|\.hdr|\.ktx|blob:/.test(name)) return 'Loading textures';
    if (/\.json|manifest/.test(name)) return 'Loading scene data';
    return 'Loading scene assets';
  }
  function status(text) { if(!stopped)post('progress',{text}); }
  function fail() {
    if(stopped)return;
    stopped=true;cleanup();post('error',{text:'This experience could not finish loading.'});
  }
  function cleanup(){clearTimeout(quietTimer);clearTimeout(watchdog);restore.splice(0).reverse().forEach(fn=>fn());}
  function check() {
    clearTimeout(quietTimer);
    if(stopped||!loaded||!fonts||!drawn||!signaled||pending.size)return;
    status('Preparing the scene');
    quietTimer=setTimeout(()=>{
      if(stopped||pending.size)return;
      requestAnimationFrame(()=>requestAnimationFrame(()=>{
        if(stopped||pending.size)return;
        stopped=true;cleanup();post('ready');
      }));
    },350);
  }
  function begin(url) {
    if(stopped)return {end(){},progress(){}};
    clearTimeout(quietTimer);
    const id=++sequence,text=label(url);pending.set(id,text);status(text);
    let done=false;
    return {
      end(error=false){if(done)return;done=true;pending.delete(id);if(error){fail();return;}if(pending.size)status([...pending.values()].at(-1));check();},
      progress(bytes,total){const now=performance.now();if(now-lastStatus<150)return;lastStatus=now;status(`${text} · ${(bytes/1048576).toFixed(1)}${total?' / '+(total/1048576).toFixed(1):''} MB`);}
    };
  }
  window.SyntaxLabsLoading={status,ready(){signaled=true;check();},fail};
  // Observe downloads without cloning or buffering large geometry responses.
  const originalFetch=window.fetch;
  window.fetch=async function(...args){
    const job=begin(args[0]?.url??args[0]);
    try {
      const response=await originalFetch.apply(this,args);
      if(!response.ok){job.end(true);return response;}
      if(!response.body){job.end();return response;}
      for(const method of ['arrayBuffer','blob','json','text','formData','bytes']){
        if(!response[method])continue;
        const original=response[method].bind(response);
        response[method]=async(...values)=>{try{const result=await original(...values);job.end();return result;}catch(error){job.end(true);throw error;}};
      }
      const stream=response.body, getReader=stream.getReader.bind(stream);
      stream.getReader=(...values)=>{
        const reader=getReader(...values),read=reader.read.bind(reader),cancel=reader.cancel.bind(reader);
        let bytes=0;const total=Number(response.headers.get('content-length'))||0;
        reader.read=async(...readArgs)=>{try{const part=await read(...readArgs);bytes+=part.value?.byteLength||0;if(part.done)job.end();else job.progress(bytes,total);return part;}catch(error){job.end(true);throw error;}};
        reader.cancel=async(...cancelArgs)=>{try{return await cancel(...cancelArgs);}finally{job.end(true);}};
        return reader;
      };
      return response;
    }catch(error){job.end(true);throw error;}
  };
  restore.push(()=>window.fetch=originalFetch);
  // Three.js texture loaders also use images, including blob URLs after GLB parsing.
  const descriptor=Object.getOwnPropertyDescriptor(HTMLImageElement.prototype,'src');
  if(descriptor?.set){
    const imageJobs=new WeakMap();
    const watch=(image,url)=>{
      imageJobs.get(image)?.end();const job=begin(url);imageJobs.set(image,job);
      const complete=()=>{remove();job.end();},error=()=>{remove();job.end(true);};
      const remove=()=>{image.removeEventListener('load',complete);image.removeEventListener('error',error);};
      image.addEventListener('load',complete,{once:true});image.addEventListener('error',error,{once:true});
    };
    Object.defineProperty(HTMLImageElement.prototype,'src',{...descriptor,set(value){watch(this,value);descriptor.set.call(this,value);}});
    restore.push(()=>Object.defineProperty(HTMLImageElement.prototype,'src',descriptor));
    const originalSetAttribute=HTMLImageElement.prototype.setAttribute;
    HTMLImageElement.prototype.setAttribute=function(name,value){if(name.toLowerCase()==='src')watch(this,value);return originalSetAttribute.call(this,name,value);};
    restore.push(()=>HTMLImageElement.prototype.setAttribute=originalSetAttribute);
  }
  if(window.createImageBitmap){const original=window.createImageBitmap;window.createImageBitmap=async function(...args){const job=begin('texture.png');try{const bitmap=await original.apply(this,args);job.end();return bitmap;}catch(error){job.end(true);throw error;}};restore.push(()=>window.createImageBitmap=original);}
  const originalSend=XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.send=function(...args){const job=begin('scene assets');this.addEventListener('loadend',()=>job.end(this.status===0||this.status>=400),{once:true});return originalSend.apply(this,args);};
  restore.push(()=>XMLHttpRequest.prototype.send=originalSend);
  // A paint, not just a loaded document, is required before the curtain opens.
  function firstDraw(){if(drawn)return;drawn=true;check();}
  for(const Type of [window.WebGLRenderingContext,window.WebGL2RenderingContext]){
    if(!Type)continue;
    for(const method of ['drawArrays','drawElements','drawArraysInstanced','drawElementsInstanced']){
      const original=Type.prototype[method];if(!original)continue;
      Type.prototype[method]=function(...args){const result=original.apply(this,args);firstDraw();return result;};
      restore.push(()=>Type.prototype[method]=original);
    }
  }
  if(['engine-lab','pc-greebles-editor'].includes(slug)){
    const original=CanvasRenderingContext2D.prototype.stroke;
    CanvasRenderingContext2D.prototype.stroke=function(...args){const result=original.apply(this,args);firstDraw();return result;};
    restore.push(()=>CanvasRenderingContext2D.prototype.stroke=original);
  }
  const onError=e=>{if(e.target?.tagName==='IMG'&&e.target.src?.includes('favicon'))return;fail();};
  window.addEventListener('error',onError,true);window.addEventListener('unhandledrejection',onError);
  document.addEventListener('webglcontextlost',onError,true);
  restore.push(()=>{window.removeEventListener('error',onError,true);window.removeEventListener('unhandledrejection',onError);document.removeEventListener('webglcontextlost',onError,true);});
  window.addEventListener('load',()=>{
    loaded=true;
    Promise.resolve(document.fonts?.ready).then(()=>{fonts=true;check();},fail);check();
  },{once:true});
  const watchdog=setTimeout(fail,120000);
  status('Starting the experience');
})();
