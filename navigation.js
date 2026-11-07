(() => {
 'use strict';
 if(window.NovaNavigate)return;
 let cleanups=[],sequence=0;
 const stages=new Map(),imageCache=new Map(),pageCache=new Map(),scriptCache=new Map();
 const siteRoot=new URL('.',document.currentScript.src).pathname;
 let currentUrl=location.href,pendingUrl='',keyboardNavigation=false;
 document.addEventListener('keydown',()=>keyboardNavigation=true,{capture:true});
 document.addEventListener('pointerdown',()=>keyboardNavigation=false,{capture:true,passive:true});
 const cacheKey=url=>url.origin+url.pathname;
 function pageText(url){
  const key=cacheKey(url);
  if(!pageCache.has(key)){
   const controller=new AbortController();
   const timer=setTimeout(()=>controller.abort(),12000);
   const request=fetch(url.href,{signal:controller.signal}).then(response=>{if(!response.ok)throw new Error('Page unavailable');return response.text();}).then(text=>{if(!text.includes('<html'))throw new Error('Invalid page');return text;}).finally(()=>clearTimeout(timer));
   pageCache.set(key,request);request.catch(()=>pageCache.delete(key));
  }
  return pageCache.get(key);
 }
 window.NovaPrefetch=value=>{if(!value)return;const url=new URL(value,location.href);if(isPage(url))pageText(url).catch(()=>{});};
 function showFailure(){
  document.querySelector('.nova-route-notice')?.remove();
  const notice=document.createElement('div');notice.className='nova-route-notice';notice.role='status';notice.textContent='Couldn’t open this page. Please tap again.';notice.setAttribute('data-site-persistent','');document.body.append(notice);setTimeout(()=>notice.remove(),5000);
 }
 window.NovaPage={
  onCleanup(callback){cleanups.push(callback);},
  register(name,initialize,assets){
   const stage=document.currentScript?.dataset.novaStage;
   if(stage){stages.get(stage)?.initializers.push({name,initialize,assets});return;}
   initialize();
  }
 };
 // One sky stays in place across every page, preserving its animation phase.
 const sky=document.createElement('div');sky.className='site-sky';sky.setAttribute('aria-hidden','true');sky.setAttribute('data-site-persistent','');
 document.documentElement.classList.add('persistent-sky');document.body.prepend(sky);
 const pagePath=/\/(?:index|experience|portfolio|books|contact|interests)(?:\.html)?\/?$/;
 function isPage(url){return url.origin===location.origin&&(url.pathname===siteRoot||pagePath.test(url.pathname));}
 async function stylesFor(page,url){
  const old=[...document.head.querySelectorAll('link[rel="stylesheet"]')].filter(link=>!link.href.includes('/music.css')&&!link.hasAttribute('data-nova-prepared'));
  const desired=[...page.head.querySelectorAll('link[rel="stylesheet"]')].map(source=>({href:new URL(source.getAttribute('href'),url).href,media:source.media||'all'})).filter(item=>!new URL(item.href).pathname.endsWith('/music.css'));
  const entries=[],added=[],ready=[];
  try{
   desired.forEach((item,index)=>{
    let link=old.find(node=>node.href===item.href);
    if(!link){
     link=document.createElement('link');link.rel='stylesheet';link.href=item.href;
     // Download and parse without letting the next page's CSS restyle the old page.
     link.media='not all';link.setAttribute('data-nova-prepared','');
     ready.push(new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('Stylesheet timed out')),12000);link.onload=()=>{clearTimeout(timer);resolve();};link.onerror=()=>{clearTimeout(timer);reject(new Error('Stylesheet unavailable'));};}));
     const anchor=desired.slice(index+1).map(next=>old.find(node=>node.href===next.href)).find(Boolean)||document.head.querySelector('link[href*="music.css"]');
     document.head.insertBefore(link,anchor);added.push(link);
    }
    entries.push({link,media:item.media});
   });
   await Promise.all(ready);
   return {
    commit(){
     old.filter(link=>!entries.some(entry=>entry.link===link)).forEach(link=>link.remove());
     // Shared links stay attached and in order, so their animations never restart.
     entries.forEach(({link,media})=>{if(link.hasAttribute('data-nova-prepared')){link.media=media;link.removeAttribute('data-nova-prepared');}});
    },
    discard(){added.forEach(link=>link.remove());}
   };
  }catch(error){added.forEach(link=>link.remove());throw error;}
 }
 async function stageScript(source,url,stage){
  const src=new URL(source.getAttribute('src'),url).href;
  if(scriptCache.has(src)){stage.initializers.push(...scriptCache.get(src));return;}
  const before=stage.initializers.length;
  await new Promise((resolve,reject)=>{
   const script=document.createElement('script');script.src=src;script.async=false;script.dataset.novaStage=stage.id;
   const timeout=setTimeout(()=>reject(new Error('Page script timed out')),12000);
   script.onload=()=>{clearTimeout(timeout);resolve();};script.onerror=()=>{clearTimeout(timeout);reject(new Error('Page script unavailable'));};stage.scripts.push(script);document.head.append(script);
  });
  scriptCache.set(src,stage.initializers.slice(before));
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
 async function navigate(value,{historyMode='push'}={}){
  const url=new URL(value,location.href);
  if(!isPage(url)){location.assign(url.href);return;}
  if(pendingUrl===url.href)return;
  pendingUrl=url.href;
  const ticket=++sequence;
  const stage={id:String(ticket),initializers:[],scripts:[]};stages.set(stage.id,stage);
  let styles,committed=false;
  document.body.setAttribute('aria-busy','true');
  try{
   const page=new DOMParser().parseFromString(await pageText(url),'text/html');
   const scripts=[...page.body.querySelectorAll('script[src]')].filter(script=>!/(?:music|navigation)\.js$/.test(new URL(script.getAttribute('src'),url).pathname));
   const images=[...page.querySelectorAll('img[src],svg image[href],link[rel="preload"][as="image"]')].map(node=>node.getAttribute('src')||node.getAttribute('href'));
   const staticImages=warmImages(images,url);
   styles=await stylesFor(page,url);if(ticket!==sequence){styles.discard();return;}
   for(const script of scripts){await stageScript(script,url,stage);if(ticket!==sequence){styles.discard();return;}}
   await Promise.all([staticImages,warmImages(stage.initializers.flatMap(item=>item.assets?.()||[]),url)]);
   if(ticket!==sequence){styles.discard();return;}
   page.body.querySelectorAll('script').forEach(script=>script.remove());
   // The first painted frame on Return is already the open tin, including its full artwork.
   if(url.searchParams.get('open')==='1')page.querySelector('#scene')?.classList.add('open','no-motion');
   const fragment=document.createDocumentFragment();for(const node of [...page.body.childNodes])fragment.append(document.importNode(node,true));
   // Commit styles, markup and all page initialization in one task, with no partially painted frame.
   cleanups.splice(0).forEach(callback=>callback());
   for(const node of [...document.body.childNodes])if(!(node instanceof Element&&node.hasAttribute('data-site-persistent')))node.remove();
   document.body.className=page.body.className;document.documentElement.lang=page.documentElement.lang;
   document.documentElement.style.removeProperty('--scale');styles.commit();committed=true;
   document.body.insertBefore(fragment,document.querySelector('[data-site-persistent]'));
   document.title=page.title;
   const description=page.head.querySelector('meta[name="description"]');
   if(description)document.querySelector('meta[name="description"]')?.setAttribute('content',description.content);
   if(historyMode==='push')history.pushState({nova:true},'',url.href);
   else if(historyMode==='replace')history.replaceState({nova:true},'',url.href);
   stage.initializers.forEach(item=>item.initialize());
   window.scrollTo(0,0);
   currentUrl=url.href;
   const heading=keyboardNavigation?document.querySelector('h1, main'):null;if(heading){heading.setAttribute('tabindex','-1');heading.focus({preventScroll:true});}
   dispatchEvent(new Event('nova:page-ready'));
  }catch(error){
   if(!committed)styles?.discard();
   if(ticket!==sequence)return;
   if(historyMode==='pop')history.replaceState({nova:true},'',currentUrl);
   showFailure();
  }finally{
   stage.scripts.forEach(script=>script.remove());stages.delete(stage.id);
   if(ticket===sequence){pendingUrl='';document.body.removeAttribute('aria-busy');}
  }
 }
 document.addEventListener('pointerdown',event=>{const link=event.target.closest('a[href]');if(link)window.NovaPrefetch(link.href);},{passive:true});
 window.NovaNavigate=navigate;history.replaceState({nova:true},'',location.href);
 document.addEventListener('click',event=>{
  if(event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
  const link=event.target.closest('a[href]');if(!link||link.hasAttribute('download')||(link.target&&link.target!=='_self'))return;
  const url=new URL(link.href,location.href);if(!isPage(url)||url.href===location.href)return;
  event.preventDefault();navigate(url.href);
 });
 addEventListener('popstate',()=>navigate(location.href,{historyMode:'pop'}));
})();
