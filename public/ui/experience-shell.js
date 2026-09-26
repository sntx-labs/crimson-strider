(() => {
  if(new URLSearchParams(location.search).get('capture')==='1')document.body.classList.add('capture-mode');
  const frame=document.querySelector('.experience-frame');
  const loader=document.querySelector('.hero-loader');
  const status=loader.querySelector('.loader-status');
  const actions=loader.querySelector('.loader-actions');
  const bar=document.querySelector('.labs-bar');
  const controls=document.createElement('button');controls.type='button';controls.className='labs-controls-toggle';controls.innerHTML='<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>';controls.setAttribute('aria-label','Toggle project information and controls');controls.title='Project information and controls';controls.setAttribute('aria-expanded','true');bar.append(controls);
  controls.addEventListener('click',()=>frame.contentWindow.postMessage({source:'syntax-labs-controls',type:'toggle'},location.origin));
  window.addEventListener('message',event=>{if(event.origin===location.origin&&event.source===frame.contentWindow&&event.data?.source==='syntax-labs-controls'&&event.data.type==='state')controls.setAttribute('aria-expanded',String(!event.data.collapsed));});
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const source=new URL('./experience.html',window.location.href);
  source.search=window.location.search;source.hash=window.location.hash;
  let done=false,started=false,timer;
  function motion(){loader.classList.toggle('is-playing',started&&!done&&!document.hidden&&!reduced.matches);}
  function error(){
    if(done)return;done=true;clearTimeout(timer);motion();loader.classList.add('is-fallback');
    status.textContent='This experience could not finish loading.';actions.hidden=false;
    loader.setAttribute('aria-busy','false');
  }
  function ready(){
    if(done)return;done=true;clearTimeout(timer);motion();
    frame.inert=false;frame.removeAttribute('aria-hidden');bar.inert=false;bar.removeAttribute('aria-hidden');
    document.body.classList.remove('is-loading');
    loader.hidden=true;loader.setAttribute('aria-busy','false');
  }
  window.addEventListener('message',event=>{
    if(event.origin!==location.origin||event.source!==frame.contentWindow||event.data?.source!=='syntax-labs-loading'||done)return;
    if(event.data.type==='progress'&&typeof event.data.text==='string')status.textContent=event.data.text.slice(0,160);
    if(event.data.type==='ready')ready();
    if(event.data.type==='error')error();
  });
  loader.querySelector('.loader-retry').addEventListener('click',()=>location.reload());
  frame.addEventListener('error',error);
  window.addEventListener('hashchange',()=>{try{frame.contentWindow.location.hash=window.location.hash;}catch{}});
  document.addEventListener('visibilitychange',motion);reduced.addEventListener('change',motion);
  // Start downloads without waiting on animation frames: background/new browser
  // views may suspend them before the embedded experience has even been created.
  function start(){
    if(started)return;started=true;
    loader.hidden=false;motion();
    frame.src=source.href;timer=setTimeout(error,125000);
  }
  const noticeKey='syntax-labs-mobile-performance-ack-v1';
  let acknowledged=false;try{acknowledged=sessionStorage.getItem(noticeKey)==='true';}catch{}
  const mobile=matchMedia('(max-width:680px)').matches||matchMedia('(pointer:coarse)').matches;
  if(mobile&&!acknowledged){
    loader.hidden=true;
    const notice=document.createElement('dialog');notice.className='mobile-performance-notice';
    notice.setAttribute('aria-labelledby','mobile-performance-message');
    const icon=document.createElement('div');icon.className='mobile-performance-icon';icon.setAttribute('aria-hidden','true');
    // Lucide Info, licensed in /ui/lucide-license.txt.
    icon.innerHTML='<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>';
    const message=document.createElement('p');message.id='mobile-performance-message';message.textContent='Performance may vary on mobile devices.';
    const okay=document.createElement('button');okay.type='button';okay.textContent='OK';okay.autofocus=true;
    notice.append(icon,message,okay);document.body.append(notice);
    okay.addEventListener('click',()=>notice.close());
    notice.addEventListener('close',()=>{
      try{sessionStorage.setItem(noticeKey,'true');}catch{}
      notice.remove();start();
    },{once:true});
    notice.showModal();
  }else start();
})();
