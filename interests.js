(window.NovaPage.register||((_name,initialize)=>initialize()))('interests',()=>{
const pageEvents=new AbortController();
const grid=document.getElementById('interest-grid');
const ns='http://www.w3.org/2000/svg';
function diamond(outline=false){
 const svg=document.createElementNS(ns,'svg');svg.setAttribute('viewBox','0 0 24 20');svg.setAttribute('aria-hidden','true');svg.classList.add('diamond');
 const shape=document.createElementNS(ns,'path');shape.setAttribute('d','M5 1.5h14L23 7 12 19 1 7Z');shape.setAttribute('fill',outline?'none':'#9dd9f3');shape.setAttribute('stroke','currentColor');shape.setAttribute('stroke-width','1.4');svg.append(shape);
 if(!outline){const facets=document.createElementNS(ns,'path');facets.setAttribute('d','M1 7h22M8 1.5 6 7l6 12 6-12-2-5.5M6 7l6-5.5L18 7');facets.setAttribute('fill','none');facets.setAttribute('stroke','currentColor');facets.setAttribute('stroke-width','.8');svg.append(facets);}
 return svg;
}
function renderInterest(item){
 const li=document.createElement('li');li.className='interest-item'+(item?'':' is-pending');
 const image=document.createElement('button');image.className='interest-image';image.type='button';image.setAttribute('aria-label',`Read my thoughts on ${item?.name||'this interest'}`);image.setAttribute('aria-expanded','false');
 if(item?.image){const img=document.createElement('img');img.src=item.image;img.alt=item.name;img.loading='lazy';image.append(img);}
 else{const placeholder=document.createElement('div');placeholder.className='pending-object';placeholder.setAttribute('aria-hidden','true');placeholder.append(diamond(true));image.append(placeholder);}
 const title=document.createElement('h2');title.textContent=item?.name||'Coming soon';
 const rating=document.createElement('div');rating.className='difficulty';
 const value=Number(item?.difficulty);const rated=Number.isInteger(value)&&value>=0&&value<=500;
 rating.setAttribute('role','img');rating.setAttribute('aria-label',rated?`Difficulty: ${value} out of 500`:'Difficulty to be added');
 rating.append(diamond(!rated));
 const score=document.createElement('span');score.className='difficulty-score';score.textContent=rated?String(value):'—';rating.append(score);
 if(item?.reflection){
  const bubble=document.createElement('span');bubble.className='reflection-bubble';bubble.id='reflection-'+item.name.toLowerCase().replace(/[^a-z0-9]+/g,'-');bubble.setAttribute('aria-hidden','true');
  const heart=document.createElement('span');heart.className='reflection-heart';heart.textContent='♥';heart.setAttribute('aria-hidden','true');
  const copy=document.createElement('span');copy.className='reflection-copy';copy.textContent=item.reflection;bubble.append(heart,copy);image.append(bubble);image.setAttribute('aria-controls',bubble.id);
  image.addEventListener('pointerenter',event=>{if(event.pointerType==='mouse')activate(li)});
  image.addEventListener('pointerleave',()=>{if(image.dataset.pinned!=='true'&&document.activeElement!==image)activate(null)});
  image.addEventListener('focus',()=>activate(li));
  image.addEventListener('blur',()=>{if(image.dataset.pinned!=='true')activate(null)});
  image.addEventListener('click',()=>{const pinned=image.dataset.pinned==='true';activate(pinned?null:li);image.dataset.pinned=String(!pinned)});
 }
 li.append(image,title,rating);
 if(item?.description){const text=document.createElement('p');text.textContent=item.description;li.append(text);}
 return li;
}
function activate(selected){
 grid.querySelectorAll('.interest-item').forEach(li=>{
  const active=li===selected;li.classList.toggle('is-active',active);
  const button=li.querySelector('button'),bubble=li.querySelector('.reflection-bubble');
  button?.setAttribute('aria-expanded',String(active));
  if(bubble)bubble.setAttribute('aria-hidden',String(!active));
  if(!active&&button)button.dataset.pinned='false';
 });
}
addEventListener('keydown',event=>{if(event.key==='Escape')activate(null)},{signal:pageEvents.signal});
const interests=Array.isArray(window.NOVA_INTERESTS)?window.NOVA_INTERESTS:[];
grid.replaceChildren(...(interests.length?interests:Array(6).fill(null)).map(renderInterest));

window.NovaPage.onCleanup(()=>pageEvents.abort());

},()=>Array.isArray(window.NOVA_INTERESTS)?window.NOVA_INTERESTS.map(item=>item.image).filter(Boolean):[]);
