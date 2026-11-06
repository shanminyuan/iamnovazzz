(window.NovaPage.register||((_name,initialize)=>initialize()))('experience',()=>{
const pageEvents=new AbortController();
const entries=window.experienceEntries||[];
const preview=entries.length===0;
const items=preview?Array.from({length:4},(_,index)=>({organisation:`Experience ${String(index+1).padStart(2,'0')}`,role:'Organisation · Role',dates:'Dates',previewNumber:String(index+1).padStart(2,'0')})):entries;
const viewport=document.getElementById('viewport');
const track=document.getElementById('track');
const group=document.getElementById('originalGroup');
const pauseButton=document.getElementById('pause');
const motionStatus=document.getElementById('motionStatus');
document.getElementById('previewLabel').hidden=!preview;
items.forEach(item=>{
 const card=document.createElement('article');card.className='experience-card';card.setAttribute('role','listitem');
 const photo=document.createElement('div');photo.className='photo';if(item.imageBackground)photo.style.backgroundColor=item.imageBackground;
 if(item.image){const img=document.createElement('img');img.src=item.image;img.alt=item.imageAlt||item.organisation;img.draggable=false;img.decoding='async';img.style.objectFit=item.imageFit||'cover';img.style.objectPosition=item.imagePosition||'center';if(item.imageFit==='contain')photo.classList.add('photo--contain');photo.append(img);}
 else if(item.visualLabel){const mark=document.createElement('div');mark.className='institution-mark';mark.setAttribute('aria-hidden','true');const label=document.createElement('span');label.className='institution-initials';label.textContent=item.visualLabel;const caption=document.createElement('span');caption.className='institution-caption';caption.textContent=item.visualCaption||item.organisation;mark.append(label,caption);photo.append(mark);}
 else{const placeholder=document.createElement('div');placeholder.className='image-placeholder';placeholder.textContent=item.previewNumber||'✧';placeholder.setAttribute('aria-hidden','true');photo.append(placeholder);}
 const body=document.createElement('div');body.className='card-body';
 const heading=document.createElement('h2');heading.textContent=item.organisation;
 const role=document.createElement('p');role.className='role';role.textContent=item.role;
 const dates=document.createElement('span');dates.className='dates';dates.textContent=[item.dates,item.location].filter(Boolean).join(' · ');
 body.append(heading,role);if(item.dates||item.location)body.append(dates);
 if(item.description){const description=document.createElement('p');description.className='description';description.textContent=item.description;body.append(description);}
 const rule=document.createElement('div');rule.className='card-rule';rule.setAttribute('aria-hidden','true');body.append(rule);card.append(photo,body);group.append(card);
});
let period=0;
function measure(){
 period=group.offsetWidth;autoScrolling=false;
 const copies=Math.max(1,Math.ceil(viewport.clientWidth/period)+1);
 if(track.children.length!==copies+1){
  Array.from(track.children).slice(1).forEach(clone=>clone.remove());
  for(let i=0;i<copies;i++){const clone=group.cloneNode(true);clone.removeAttribute('id');clone.setAttribute('aria-hidden','true');clone.inert=true;track.append(clone);}
 }
 if(period&&viewport.scrollLeft>=period)viewport.scrollLeft%=period;
}
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
let userPaused=reducedMotion.matches,dragging=false,manualUntil=0,lastFrame=0;
let autoPosition=0,autoScrolling=false;
function updateButton(){pauseButton.setAttribute('aria-pressed',String(userPaused));pauseButton.setAttribute('aria-label',userPaused?'Start automatic scrolling':'Pause automatic scrolling');pauseButton.firstElementChild.textContent=userPaused?'▶':'Ⅱ';}
updateButton();
pauseButton.addEventListener('click',()=>{userPaused=!userPaused;updateButton();motionStatus.textContent=userPaused?'Automatic scrolling paused':'Automatic scrolling started';});
viewport.addEventListener('wheel',()=>manualUntil=performance.now()+1800,{passive:true});
viewport.addEventListener('touchstart',()=>manualUntil=performance.now()+2500,{passive:true});
function step(direction){
 if(period&&viewport.scrollLeft>=period)viewport.scrollLeft%=period;
 const card=group.firstElementChild;
 const gap=parseFloat(getComputedStyle(group).gap)||0;
 const distance=card.offsetWidth+gap;
 if(direction<0&&viewport.scrollLeft<distance)viewport.scrollLeft+=period;
 viewport.scrollBy({left:direction*distance,behavior:reducedMotion.matches?'instant':'smooth'});
 manualUntil=performance.now()+2000;
}
document.getElementById('previous').addEventListener('click',()=>step(-1));document.getElementById('next').addEventListener('click',()=>step(1));
viewport.addEventListener('keydown',event=>{if(event.key==='ArrowRight'||event.key==='ArrowLeft'){event.preventDefault();step(event.key==='ArrowRight'?1:-1);}});
let dragOrigin=0,scrollOrigin=0;
viewport.addEventListener('pointerdown',event=>{
 if(event.pointerType!=='mouse'||event.button!==0)return;
 dragging=true;dragOrigin=event.clientX;scrollOrigin=viewport.scrollLeft;viewport.classList.add('dragging');viewport.setPointerCapture(event.pointerId);event.preventDefault();
});
viewport.addEventListener('pointermove',event=>{if(dragging){const scale=viewport.getBoundingClientRect().width/viewport.offsetWidth||1;viewport.scrollLeft=scrollOrigin-(event.clientX-dragOrigin)/scale;}});
function finishDrag(){dragging=false;viewport.classList.remove('dragging');manualUntil=performance.now()+1500;}
viewport.addEventListener('pointerup',finishDrag);viewport.addEventListener('pointercancel',finishDrag);viewport.addEventListener('lostpointercapture',finishDrag);
reducedMotion.addEventListener('change',event=>{if(event.matches){userPaused=true;updateButton();}},{signal:pageEvents.signal});
const resizeObserver=new ResizeObserver(measure);resizeObserver.observe(viewport);measure();
let animationFrame=0;
function animate(now){
 const delta=Math.min(now-(lastFrame||now),64);lastFrame=now;
 const canScroll=!userPaused&&!dragging&&!document.hidden&&now>manualUntil&&period;
 if(canScroll){
  // Keep subpixel progress outside scrollLeft so zoom and fast displays cannot round each step away.
  if(!autoScrolling)autoPosition=viewport.scrollLeft;
  autoPosition=(autoPosition+delta*.045)%period;
  viewport.scrollLeft=autoPosition;
 }
 autoScrolling=Boolean(canScroll);
 animationFrame=requestAnimationFrame(animate);
}
animationFrame=requestAnimationFrame(animate);

window.NovaPage.onCleanup(()=>{pageEvents.abort();cancelAnimationFrame(animationFrame);resizeObserver.disconnect();});

},()=>Array.isArray(window.experienceEntries)?window.experienceEntries.map(item=>item.image).filter(Boolean):[]);
