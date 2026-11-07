(() => {
 'use strict';
 if(document.documentElement.classList.contains('nova-embedded')||document.getElementById('site-background-music'))return;
 const progressKey='nova-background-music-v1';
 const read=(storage,key,fallback)=>{try{return storage.getItem(key)??fallback;}catch{return fallback;}};
 const write=(storage,key,value)=>{try{storage.setItem(key,value);}catch{}};
 let saved={};try{saved=JSON.parse(read(sessionStorage,progressKey,'{}'));}catch{}
 // A fresh visit always starts enabled; manual mute lasts throughout in-place navigation.
 let optedOut=false;
 let started=Boolean(saved.started),pending=false,attempt=0,restored=false;
 const audio=document.createElement('audio');
 audio.id='site-background-music';audio.src='assets/audio/background.m4a';audio.hidden=true;
 audio.setAttribute('data-site-persistent','');audio.setAttribute('aria-hidden','true');
 audio.loop=true;audio.autoplay=true;audio.preload='auto';audio.volume=.25;
 const button=document.createElement('button');button.type='button';button.className='site-music';button.setAttribute('data-site-persistent','');
 button.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4Z"/><g class="music-waves"><path d="M15 8a6 6 0 0 1 0 8M18 5a10 10 0 0 1 0 14"/></g><path class="music-slash" d="m16 9 5 6m0-6-5 6"/></svg><span class="site-music-label"></span>';
 const label=button.querySelector('.site-music-label');document.body.append(audio,button);
 function render(){
  // Show the visitor's choice, rather than treating loading/browser pauses as a manual mute.
  const enabled=!optedOut;
  button.classList.toggle('is-playing',enabled);button.setAttribute('aria-pressed',String(enabled));
  button.setAttribute('aria-label',enabled?'Mute background music':'Play background music');
  button.title=enabled?'Mute background music':'Play background music';label.textContent=enabled?'Music on':'Music off';
 }
 function save(){
  const position=restored&&Number.isFinite(audio.currentTime)?audio.currentTime:Number(saved.position)||0;
  write(sessionStorage,progressKey,JSON.stringify({started,position}));
 }
 function restore(){
  if(restored||!Number.isFinite(audio.duration)||!audio.duration)return;
  restored=true;const position=Number(saved.position);
  if(Number.isFinite(position)&&position>0)audio.currentTime=position%audio.duration;
 }
 async function play(fromGesture=false){
  if(optedOut||(pending&&!fromGesture)||!audio.paused)return;
  const ticket=++attempt;pending=true;
  try{await audio.play();if(ticket!==attempt||optedOut)return;started=true;save();}
  catch{/* The first visit may need a click before the browser permits sound. */}
  finally{if(ticket===attempt)pending=false;render();}
 }
 function stop(){++attempt;pending=false;save();audio.pause();render();}
 button.addEventListener('click',()=>{
  optedOut=!optedOut;audio.autoplay=!optedOut;
  if(optedOut)stop();else{render();play(true);}
 });
 function unlock(event){if(button.contains(event.target)||optedOut||document.hidden)return;play(true);}
 document.addEventListener('pointerdown',unlock,{capture:true,passive:true});
 document.addEventListener('click',unlock,{capture:true});
 document.addEventListener('keydown',event=>{if(!event.repeat&&(event.key==='Enter'||event.key===' '))unlock(event);},{capture:true});
 audio.addEventListener('loadedmetadata',restore);
 audio.addEventListener('playing',render);audio.addEventListener('pause',render);
 audio.addEventListener('error',()=>{pending=false;render();});audio.addEventListener('timeupdate',save);
 addEventListener('nova:audio-gesture',()=>play(true));
 addEventListener('pagehide',save);
 addEventListener('pageshow',event=>{if(event.persisted&&!optedOut)play();});
 render();if(!document.hidden)play();
})();
