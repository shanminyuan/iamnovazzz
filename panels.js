/* On touch screens, retain each document instead of replacing Safari's live page. */
(() => {
 'use strict';
 if(window.NovaNavigate)return;
 const embedded=window.parent!==window&&window.frameElement?.hasAttribute('data-nova-panel');
 const touch=matchMedia('(any-pointer:coarse), (max-width:760px), (max-width:1180px) and (orientation:portrait)').matches;
 if(!embedded&&!touch)return;
 const root=new URL('.',document.currentScript.src);
 const path=/\/(?:index|experience|portfolio|books|contact|interests)(?:\.html)?\/?$/;
 const internal=url=>url.origin===location.origin&&(url.pathname===root.pathname||path.test(url.pathname));
 const key=url=>url.pathname.replace(/index\.html$/, '').replace(/\.html$/, '').replace(/\/$/,'')||'/';
 let active=true;
 const cleanups=[];
 window.NovaPage={get active(){return active;},onCleanup(fn){cleanups.push(fn);},register(_name,initialize){initialize();}};
 function setActive(value,url){
  active=value;
  document.documentElement.dataset.panelActive=String(value);
  document.querySelector('main')?.closest('.page-frame,main')?.setAttribute('aria-hidden',String(!value));
  dispatchEvent(new CustomEvent(value?'nova:resume':'nova:suspend',{detail:{url}}));
 }
 window.NovaSetPanelActive=setActive;
 if(embedded){
  active=false;
  document.documentElement.classList.add('nova-embedded');
  document.documentElement.dataset.panelActive='false';
  window.NovaNavigate=(value,options)=>parent.NovaNavigate(new URL(value,location.href).href,options);
  window.NovaPrefetch=value=>parent.NovaPrefetch(new URL(value,location.href).href);
  // A gesture inside a panel can unlock the one persistent audio player in the host.
  document.addEventListener('pointerdown',()=>parent.dispatchEvent(new Event('nova:audio-gesture')),{passive:true});
 }else{
  document.documentElement.classList.add('persistent-sky','nova-panel-host');
  const sky=document.createElement('div');sky.className='site-sky';sky.setAttribute('data-site-persistent','');sky.setAttribute('aria-hidden','true');document.body.prepend(sky);
  const baseUrl=new URL(location.href),baseKey=key(baseUrl),baseTitle=document.title;
  const panels=new Map();
  let current=baseKey,currentUrl=location.href,sequence=0,pending='',baseNodes=[],keyboard=false;
  const reduced=matchMedia('(prefers-reduced-motion:reduce)');
  const painted=()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
  function collectBase(){
   baseNodes=[...document.body.children].filter(node=>!['SCRIPT','AUDIO'].includes(node.tagName)&&!node.hasAttribute('data-site-persistent')&&!node.hasAttribute('data-nova-panel'));
   baseNodes.forEach(node=>node.classList.add('nova-base'));
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',collectBase,{once:true});else collectBase();
  document.addEventListener('keydown',()=>keyboard=true,{capture:true});
  document.addEventListener('pointerdown',()=>keyboard=false,{capture:true,passive:true});
  function notice(){
   document.querySelector('.nova-route-notice')?.remove();
   const node=document.createElement('div');node.className='nova-route-notice';node.role='status';node.textContent='Couldn’t open this page. Please tap again.';node.setAttribute('data-site-persistent','');document.body.append(node);setTimeout(()=>node.remove(),5000);
  }
  function prepare(url){
   const id=key(url);
   if(id===baseKey)return Promise.resolve(null);
   if(panels.has(id))return panels.get(id).ready;
   const frame=document.createElement('iframe');frame.className='nova-panel';frame.title='Loading page';frame.setAttribute('data-nova-panel','');frame.setAttribute('aria-hidden','true');frame.inert=true;
   const entry={frame,ready:null,title:''};panels.set(id,entry);
   entry.ready=new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>fail(new Error('Page timed out')),18000);
    function fail(error){clearTimeout(timer);frame.remove();if(panels.get(id)===entry)panels.delete(id);reject(error);}
    frame.addEventListener('error',()=>fail(new Error('Page unavailable')),{once:true});
    frame.addEventListener('load',async()=>{
     try{
      const doc=frame.contentDocument;
      if(!doc?.documentElement.classList.contains('nova-embedded')||!doc.querySelector('main'))throw new Error('Page unavailable');
      const sources=[...doc.querySelectorAll('img[src],svg image[href],link[rel="preload"][as="image"]')].map(node=>node.getAttribute('src')||node.getAttribute('href'));
      const images=[...new Set(sources)].map(src=>{const image=new Image();image.src=new URL(src,url).href;return image.decode().catch(()=>{});});
      await Promise.all(images);
      await Promise.race([doc.fonts.ready,new Promise(resolve=>setTimeout(resolve,1200))]);
      await painted();
      if(!frame.isConnected)return;
      entry.title=doc.title;frame.title=doc.title;frame.dataset.ready='true';clearTimeout(timer);resolve(entry);
     }catch(error){fail(error);}
    },{once:true});
    const frameUrl=new URL(url);frameUrl.searchParams.set('_panel','stable-panels-1');
    frame.src=frameUrl.href;document.body.append(frame);
   });
   return entry.ready;
  }
  window.NovaPrefetch=value=>{if(!value)return;const url=new URL(value,location.href);if(internal(url))prepare(url).catch(()=>{});};
  window.NovaNavigate=async(value,{historyMode='push'}={})=>{
   const url=new URL(value,location.href);
   if(!internal(url)){location.assign(url.href);return;}
   if(pending===url.href)return;
   const ticket=++sequence;pending=url.href;document.body.setAttribute('aria-busy','true');
   try{
    const next=await prepare(url);if(ticket!==sequence)return;
    const id=key(url),previous=current;
    // Documents and their styles stay attached. Only these two opaque surfaces transition.
    if(id===baseKey){setActive(true,url.href);baseNodes.forEach(node=>{node.inert=false;node.classList.remove('nova-base-away');});}
    else{
     next.frame.contentWindow.NovaSetPanelActive(true,url.href);
     next.frame.inert=false;next.frame.setAttribute('aria-hidden','false');
     next.frame.classList.add('nova-panel-current');
     if(previous===baseKey){setActive(false,currentUrl);baseNodes.forEach(node=>{node.inert=true;node.classList.add('nova-base-away');});}
    }
    for(const [panelId,entry] of panels){
     if(panelId!==id){entry.frame.classList.remove('nova-panel-current');entry.frame.inert=true;entry.frame.setAttribute('aria-hidden','true');entry.frame.contentWindow?.NovaSetPanelActive?.(false,currentUrl);}
    }
    current=id;currentUrl=url.href;
    document.title=next?next.title:baseTitle;
    if(historyMode==='push')history.pushState({nova:true},'',url.href);
    else if(historyMode==='replace')history.replaceState({nova:true},'',url.href);
    if(keyboard){const doc=next?next.frame.contentDocument:document;const heading=doc.querySelector('h1,main');heading?.setAttribute('tabindex','-1');heading?.focus({preventScroll:true});}
    dispatchEvent(new Event('nova:page-ready'));
    if(!reduced.matches)await new Promise(resolve=>setTimeout(resolve,180));
   }catch(error){if(ticket===sequence){if(historyMode==='pop')history.replaceState({nova:true},'',currentUrl);notice();}}
   finally{if(ticket===sequence){pending='';document.body.removeAttribute('aria-busy');}}
  };
  history.replaceState({nova:true},'',location.href);
  addEventListener('popstate',()=>window.NovaNavigate(location.href,{historyMode:'pop'}));
 }
 document.addEventListener('pointerdown',event=>{const link=event.target.closest('a[href]');if(link&&internal(new URL(link.href)))window.NovaPrefetch(link.href);},{passive:true});
 document.addEventListener('click',event=>{
  if(event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
  const link=event.target.closest('a[href]');if(!link||link.hasAttribute('download')||(link.target&&link.target!=='_self'))return;
  const url=new URL(link.href);if(!internal(url))return;
  event.preventDefault();window.NovaNavigate(url.href);
 });
})();
