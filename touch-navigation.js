/* Touch labels use the existing item routes and leave the tin mounted. */
(window.NovaPage.register||((_name,initialize)=>initialize()))('touch-entry-labels',()=>{
 const scene=document.getElementById('scene');
 if(!scene?.classList.contains('touch-layout'))return;
 const events=new AbortController();
 const overlay=document.createElement('div');overlay.className='touch-entry-labels';overlay.setAttribute('role','group');overlay.setAttribute('aria-label','Explore Nova’s world');overlay.inert=true;
 const entries=[['reading','Books',98,100],['contact','Contact',622,72],['interests','Interests',348,381],['experience','Experience',409,510],['portfolio','Portfolio',408,914]];
 for(const [key,label,x,y] of entries){
  const target=scene.querySelector('[data-destination="'+key+'"]');
  const tag=document.createElement('button');tag.type='button';tag.className='touch-entry-tag';tag.dataset.entry=key;tag.setAttribute('aria-label','Open '+label);
  tag.style.setProperty('--entry-x',x+'px');tag.style.setProperty('--entry-y',y+'px');
  const text=document.createElement('span');text.textContent=label;
  const arrow=document.createElement('span');arrow.className='touch-entry-arrow';arrow.textContent='↗';arrow.setAttribute('aria-hidden','true');tag.append(text,arrow);
  tag.addEventListener('pointerdown',()=>target.dispatchEvent(new Event('pointerdown')),{passive:true});
  tag.addEventListener('click',()=>{if(scene.classList.contains('open')&&scene.classList.contains('is-settled'))target.click();});overlay.append(tag);
 }
 scene.append(overlay);
 function update(){
  const scale=scene.getBoundingClientRect().width/816;if(!(scale>0))return;
  overlay.style.setProperty('--entry-inverse',String(1/scale));
  for(const [key,_label,x,y] of entries){
   const tag=overlay.querySelector('[data-entry="'+key+'"]');let center=x;
   // Keep the two upper labels clear of the clip and safety pin on narrow phones.
   if(key==='reading')center=Math.min(x,143-tag.offsetWidth/scale/2);
   if(key==='contact')center=Math.min(x,665-tag.offsetWidth/scale/2);
   tag.style.setProperty('--entry-x',center+'px');tag.style.setProperty('--entry-y',y+'px');
  }
  overlay.inert=!(scene.classList.contains('open')&&scene.classList.contains('is-settled'));
 }
 const size=new ResizeObserver(update);size.observe(document.querySelector('main'));
 const state=new MutationObserver(update);state.observe(scene,{attributes:true,attributeFilter:['class']});
 addEventListener('resize',update,{signal:events.signal});addEventListener('nova:resume',update,{signal:events.signal});update();
 window.NovaPage.onCleanup(()=>{events.abort();size.disconnect();state.disconnect();overlay.remove();});
});
