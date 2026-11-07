(() => {
 'use strict';
 if(window.NovaNavigate)return;
 const siteRoot=new URL('.',document.currentScript.src).pathname;
 const pagePath=/\/(?:index|experience|portfolio|books|contact|interests)(?:\.html)?\/?$/;
 const stages=new Map(),pageCache=new Map(),scriptCache=new Map(),imageCache=new Map();
 let cleanups=[],suspenders=[],resumers=[],sequence=0,scriptSequence=0,cachedHome=null;
 let activeUrl=location.href;
 window.NovaPage={
  onCleanup(callback){cleanups.push(callback);},
  onSuspend(callback){suspenders.push(callback);},
  onResume(callback){resumers.push(callback);},
  register(name,initialize,assets){
   const script=document.currentScript;
   const entry={name,initialize,assets};
   if(script?.dataset.novaStage){stages.get(script.dataset.novaStage)?.push(entry);return;}
   if(script?.src)scriptCache.set(script.src,Promise.resolve([entry]));
   initialize();
  }
 };
 const sky=document.createElement('div');sky.className='site-sky';sky.setAttribute('aria-hidden','true');sky.setAttribute('data-site-persistent','');
 document.documentElement.classList.add('persistent-sky');document.body.prepend(sky);
 function isPage(url){return url.origin===location.origin&&(url.pathname===siteRoot||pagePath.test(url.pathname));}
 function isHome(url){return url.pathname===siteRoot||/\/index(?:\.html)?\/?$/.test(url.pathname);}
 function pageNodes(){return [...document.body.childNodes].filter(node=>!(node instanceof Element&&node.hasAttribute('data-site-persistent')));}
 function historyFor(url,mode){
  if(mode==='push')history.pushState({nova:true},'',url.href);
  else if(mode==='replace')history.replaceState({nova:true},'',url.href);
  activeUrl=url.href;
 }
 async function readPage(url){
  const key=url.origin+url.pathname;
  if(!pageCache.has(key)){
   const ready=fetch(url.href).then(response=>{if(!response.ok)throw new Error('Page unavailable');return response.text();}).catch(error=>{pageCache.delete(key);throw error;});
   pageCache.set(key,ready);
  }
  return new DOMParser().parseFromString(await pageCache.get(key),'text/html');
 }
 async function stylesFor(page,url){
  const old=[...document.head.querySelectorAll('link[rel="stylesheet"]')].filter(link=>!new URL(link.href).pathname.endsWith('/music.css')&&!link.hasAttribute('data-nova-prepared'));
  const desired=[...page.head.querySelectorAll('link[rel="stylesheet"]')].map(source=>({href:new URL(source.getAttribute('href'),url).href,media:source.media||'all'})).filter(item=>!new URL(item.href).pathname.endsWith('/music.css'));
  const entries=[],added=[],ready=[];
  try{
   desired.forEach((item,index)=>{
    let link=old.find(node=>node.href===item.href);
    if(!link){
     link=document.createElement('link');link.rel='stylesheet';link.href=item.href;link.media='not all';link.setAttribute('data-nova-prepared','');
     ready.push(new Promise((resolve,reject)=>{link.onload=resolve;link.onerror=()=>reject(new Error('Stylesheet unavailable'));}));
     const anchor=desired.slice(index+1).map(next=>old.find(node=>node.href===next.href)).find(Boolean)||document.head.querySelector('link[href*="music.css"]');
     document.head.insertBefore(link,anchor);added.push(link);
    }
    entries.push({link,media:item.media});
   });
   await Promise.all(ready);
   return {
    commit(){
     // Keep parsed stylesheets attached; returning never downloads or recreates them.
     old.filter(link=>!entries.some(entry=>entry.link===link)).forEach(link=>{link.media='not all';});
     entries.forEach(({link,media})=>{link.media=media;link.removeAttribute('data-nova-prepared');});
    },
    discard(){added.forEach(link=>link.remove());}
   };
  }catch(error){added.forEach(link=>link.remove());throw error;}
 }
 function loadScript(source,url){
  const href=new URL(source.getAttribute('src'),url).href;
  if(!scriptCache.has(href)){
   const ready=new Promise((resolve,reject)=>{
    const id='script-'+(++scriptSequence),initializers=[];
    const script=document.createElement('script');script.src=href;script.async=false;script.dataset.novaStage=id;stages.set(id,initializers);
    script.onload=()=>{stages.delete(id);script.remove();resolve(initializers);};
    script.onerror=()=>{stages.delete(id);script.remove();scriptCache.delete(href);reject(new Error('Page script unavailable'));};
    document.head.append(script);
   });
   scriptCache.set(href,ready);
  }
  return scriptCache.get(href);
 }
 function warmImages(sources,url){
  return Promise.all([...new Set(sources.filter(Boolean).map(src=>new URL(src,url).href))].map(src=>{
   if(!imageCache.has(src)){
    const image=new Image();image.src=src;
    const ready=image.decode?image.decode():new Promise(resolve=>{image.onload=resolve;image.onerror=resolve;});
    imageCache.set(src,{image,ready:ready.catch(()=>{})});
   }
   return imageCache.get(src).ready;
  }));
 }
 function leavePage(){
  if(document.getElementById('scene')){
   suspenders.forEach(callback=>callback());
   const page=document.implementation.createHTMLDocument(document.title);page.documentElement.lang=document.documentElement.lang;page.body.className=document.body.className;
   const description=document.head.querySelector('meta[name="description"]');if(description)page.head.append(description.cloneNode(true));
   document.head.querySelectorAll('link[rel="stylesheet"]').forEach(link=>{if(link.media!=='not all')page.head.append(link.cloneNode(true));});
   const fragment=document.createDocumentFragment();pageNodes().forEach(node=>fragment.append(node));
   cachedHome={page,fragment,cleanups,suspenders,resumers};
  }else{
   cleanups.forEach(callback=>callback());pageNodes().forEach(node=>node.remove());
  }
  cleanups=[];suspenders=[];resumers=[];
 }
 function prepareHome(page,url){
  if(!isHome(url)||url.searchParams.get('open')!=='1')return;
  // The first attached frame is already open, even before its initializer runs.
  page.getElementById('scene')?.classList.add('open','is-settled','no-motion');
  const cover=page.getElementById('closed-cover');if(cover){cover.hidden=true;cover.tabIndex=-1;}
 }
 function reportFailure(){
  let status=document.getElementById('site-navigation-status');
  if(!status){
   status=document.createElement('div');status.id='site-navigation-status';status.setAttribute('role','status');status.setAttribute('data-site-persistent','');
   status.style.cssText='position:fixed;z-index:101;bottom:70px;left:50%;transform:translateX(-50%);max-width:90vw;padding:12px 18px;border:1px solid white;border-radius:18px;background:#f4f8ff;color:#164a8b;font:14px Arial,sans-serif;text-align:center';document.body.append(status);
  }
  status.textContent='This page could not load. Please tap again.';
 }
 async function navigate(value,{historyMode='push',focus=false}={}){
  const url=new URL(value,location.href);
  if(!isPage(url)){location.assign(url.href);return;}
  const ticket=++sequence;let styles,committed=false;
  document.getElementById('site-navigation-status')?.remove();document.body.setAttribute('aria-busy','true');
  try{
   if(isHome(url)&&document.getElementById('scene')){
    historyFor(url,historyMode);resumers.forEach(callback=>callback(url));return;
   }
   const home=isHome(url)?cachedHome:null;
   const page=home?home.page:await readPage(url);
   if(ticket!==sequence)return;
   styles=await stylesFor(page,url);if(ticket!==sequence){styles.discard();return;}
   const initializers=[];
   if(!home){
    const scripts=[...page.body.querySelectorAll('script[src]')].filter(script=>!/(?:music|navigation)\.js$/.test(new URL(script.getAttribute('src'),url).pathname));
    const images=[...page.querySelectorAll('img[src],svg image[href],link[rel="preload"][as="image"]')].map(node=>node.getAttribute('src')||node.getAttribute('href'));
    const staticImages=warmImages(images,url);
    for(const script of scripts){initializers.push(...await loadScript(script,url));if(ticket!==sequence){styles.discard();return;}}
    await Promise.all([staticImages,warmImages(initializers.flatMap(item=>item.assets?.()||[]),url)]);
    if(ticket!==sequence){styles.discard();return;}
    prepareHome(page,url);page.body.querySelectorAll('script').forEach(script=>script.remove());
   }
   const fragment=home?home.fragment:document.createDocumentFragment();
   if(!home)for(const node of [...page.body.childNodes])fragment.append(document.importNode(node,true));
   // Preserve the existing tin and its event handlers instead of rebuilding SVG layers.
   leavePage();
   document.body.className=page.body.className;document.documentElement.lang=page.documentElement.lang;
   document.documentElement.style.removeProperty('--scale');styles.commit();committed=true;
   document.body.insertBefore(fragment,document.querySelector('[data-site-persistent]'));
   document.title=page.title;
   const description=page.head.querySelector('meta[name="description"]');if(description)document.querySelector('meta[name="description"]')?.setAttribute('content',description.content);
   historyFor(url,historyMode);
   if(home){
    cleanups=home.cleanups;suspenders=home.suspenders;resumers=home.resumers;cachedHome=null;resumers.forEach(callback=>callback(url));
   }else initializers.forEach(item=>item.initialize());
   window.scrollTo(0,0);
   // Pointer navigation must not focus the entire 3D scene on iOS.
   if(focus){const heading=document.querySelector('h1,main');if(heading){heading.setAttribute('tabindex','-1');heading.focus({preventScroll:true});}}
   dispatchEvent(new Event('nova:page-ready'));
  }catch(error){
   if(!committed)styles?.discard();
   if(ticket!==sequence)return;
   if(historyMode==='pop')history.replaceState({nova:true},'',activeUrl);
   // Keep the current screen and music on a failed request; never flash a full reload.
   reportFailure();
  }finally{if(ticket===sequence)document.body.removeAttribute('aria-busy');}
 }
 window.NovaNavigate=navigate;history.replaceState({nova:true},'',location.href);
 document.addEventListener('click',event=>{
  if(event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
  const link=event.target.closest('a[href]');if(!link||link.hasAttribute('download')||(link.target&&link.target!=='_self'))return;
  const url=new URL(link.href,location.href);if(!isPage(url)||url.href===location.href)return;
  event.preventDefault();navigate(url.href,{focus:event.detail===0});
 });
 addEventListener('popstate',()=>navigate(location.href,{historyMode:'pop'}));
})();
