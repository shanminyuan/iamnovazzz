(window.NovaPage.register||((_name,initialize)=>initialize()))('app',()=>{
const pageEvents=new AbortController();
const scene=document.getElementById('scene');
const lid=document.getElementById('lid');
const closedCover=document.getElementById('closed-cover');
const topPanel=document.getElementById('tin-top');
const toggle=document.getElementById('toggle');
const hotspots=document.getElementById('hotspots');
const hint=document.getElementById('hint');
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
let opened=false;
let request=0;
let settleTimer;
let revealPending=false;
let revealRun=0;
const glintOrder=['reading','interests','contact','experience','portfolio'].map(key=>document.querySelector(`.item-link[data-destination="${key}"]`));
const svgNS='http://www.w3.org/2000/svg';
function clearTreasureGlow(){
 ++revealRun;
 glintOrder.forEach(button=>button.classList.remove('reveal-glint'));
}
function revealTreasures(){
 const ticket=++revealRun;
 assetsReady.then(()=>{
  if(ticket!==revealRun||!opened||reducedMotion.matches)return;
  glintOrder.forEach((button,index)=>{
   button.style.setProperty('--glint-delay',`${index*140}ms`);
   button.classList.add('reveal-glint');
  });
 });
}
// Reuse each object's exact contour for the brief reflected-light sweep.
for(const button of glintOrder){
 const svg=button.querySelector('svg');
 const gradient=document.createElementNS(svgNS,'linearGradient');
 gradient.id=`treasure-sheen-${button.dataset.destination}`;
 gradient.setAttribute('x1','0');gradient.setAttribute('y1','0');gradient.setAttribute('x2','1');gradient.setAttribute('y2','0');
 for(const [offset,opacity] of [['0','0'],['.35','0'],['.5','.38'],['.65','0'],['1','0']]){
  const stop=document.createElementNS(svgNS,'stop');stop.setAttribute('offset',offset);stop.setAttribute('stop-color','#fff');stop.setAttribute('stop-opacity',opacity);gradient.append(stop);
 }
 svg.querySelector('defs').append(gradient);
 const clipped=document.createElementNS(svgNS,'g');clipped.setAttribute('clip-path',svg.querySelector('image').getAttribute('clip-path'));
 const sheen=document.createElementNS(svgNS,'rect');sheen.classList.add('glint-sheen');sheen.setAttribute('width',svg.viewBox.baseVal.width);sheen.setAttribute('height',svg.viewBox.baseVal.height);sheen.setAttribute('fill',`url(#${gradient.id})`);clipped.append(sheen);svg.append(clipped);
 svg.addEventListener('animationend',event=>{if(event.target===svg&&event.animationName==='treasure-glint')button.classList.remove('reveal-glint');});
 button.addEventListener('pointerenter',()=>button.classList.remove('reveal-glint'));
 button.addEventListener('focus',()=>button.classList.remove('reveal-glint'));
}
// Keep a permanent original cutout above a clean patch, so lifting never reveals a duplicate.
for(const key of ['experience','reading']){
 const button=document.querySelector(`.item-link[data-destination="${key}"]`);
 const highlight=button.querySelector('svg');
 const original=highlight.querySelector('image');
 const base=highlight.cloneNode(false);
 base.classList.add('object-base');base.append(original.cloneNode(true));
 button.append(base);button.classList.add('layered-object');
 const patch=highlight.cloneNode(false);patch.classList.add('object-underlay');
 patch.style.cssText=button.style.cssText;
 const background=original.cloneNode(true);
 background.setAttribute('href','assets/tin-clean-underlay.png');
 background.setAttribute('preserveAspectRatio','none');patch.append(background);
 document.querySelector(key==='reading'?'.half.upper':'.half.lower').append(patch);
}
const cleanPlateReady=new Promise(resolve=>{
 const image=new Image();image.src='assets/tin-clean-underlay.png';
 image.decode().then(()=>{scene.classList.add('cutouts-ready');resolve();}).catch(resolve);
});
const assetsReady=Promise.all([cleanPlateReady,...['assets/tin-open-v2.png','assets/tin-closed-lse.png'].map(src=>{
 const image=new Image();image.src=src;return image.decode().catch(()=>{});
})]);
function resize(){
 const width=document.documentElement.clientWidth||innerWidth;
 const height=document.querySelector('main').clientHeight||innerHeight;
 if(width>0&&height>0)document.documentElement.style.setProperty('--scale',Math.min(width/816,height/974));
}
function finishMotion(){
 clearTimeout(settleTimer);scene.classList.remove('is-animating');scene.classList.add('is-settled');
 hotspots.inert=!opened;hint.textContent=opened?'The tin is open':'The tin is closed';
 if(opened&&revealPending){revealPending=false;revealTreasures();}
}
async function setOpen(value,{immediate=false}={}){
 const ticket=++request;
 revealPending=value&&!immediate&&!scene.classList.contains('open');
 clearTreasureGlow();opened=value;clearTimeout(settleTimer);
 hotspots.inert=true;scene.classList.remove('is-settled');
 lid.setAttribute('aria-expanded',String(opened));lid.tabIndex=opened?-1:0;
 closedCover.setAttribute('aria-expanded',String(opened));closedCover.tabIndex=opened?-1:0;
 toggle.setAttribute('aria-expanded',String(opened));
 toggle.innerHTML=opened?'Close the tin <span>↙</span>':'Tap to open my little world <span>↗</span>';
 hint.textContent=opened?'The tin is opening':'The tin is closing';
 immediate=immediate||reducedMotion.matches;
 if(opened&&!immediate){await assetsReady;if(ticket!==request)return;}
 const changed=scene.classList.contains('open')!==opened;
 if(immediate)scene.classList.add('no-motion');
 if(changed&&!immediate)scene.classList.add('is-animating');
 scene.classList.toggle('open',opened);
 if(immediate||(!changed&&!scene.classList.contains('is-animating'))){
  finishMotion();requestAnimationFrame(()=>requestAnimationFrame(()=>scene.classList.remove('no-motion')));
 }else{
  // Safety net for a transition cancelled before its first rendered frame.
  settleTimer=setTimeout(finishMotion,1400);
 }
}
topPanel.addEventListener('transitionend',event=>{if(event.target===topPanel&&event.propertyName==='transform')finishMotion();});
lid.addEventListener('click',()=>setOpen(true));
closedCover.addEventListener('click',()=>setOpen(true));
toggle.addEventListener('click',()=>setOpen(!opened));
addEventListener('keydown',event=>{if(event.key==='Escape'){setOpen(false);toggle.focus();}},{signal:pageEvents.signal});
reducedMotion.addEventListener('change',()=>setOpen(opened,{immediate:true}),{signal:pageEvents.signal});
addEventListener('resize',resize,{signal:pageEvents.signal});
addEventListener('pageshow',resize,{signal:pageEvents.signal});
window.visualViewport?.addEventListener('resize',resize,{signal:pageEvents.signal});
const sceneSizeObserver=new ResizeObserver(resize);sceneSizeObserver.observe(document.querySelector('main'));resize();
setOpen(new URLSearchParams(location.search).get('open')==='1',{immediate:true});
const destinationUrls={experience:'experience.html',portfolio:'portfolio.html',reading:'books.html',contact:'contact.html',interests:'interests.html'};
document.querySelectorAll('.item-link').forEach(button=>{
 button.addEventListener('click',()=>{const url=destinationUrls[button.dataset.destination];if(url)(window.NovaNavigate?window.NovaNavigate(url):location.assign(url));});
});

window.NovaPage.onCleanup(()=>{sceneSizeObserver.disconnect();pageEvents.abort();++request;clearTimeout(settleTimer);clearTreasureGlow();});

});
