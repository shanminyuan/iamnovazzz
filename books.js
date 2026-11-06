(window.NovaPage.register||((_name,initialize)=>initialize()))('books',()=>{
const pageEvents=new AbortController();
const insights={
 randomness:'separate decision quality from outcome quality',
 skin:"don't mess with complex systems",
 goose:'Nothing is more inexplicable than friendship in childhood',
 dick:'We are never more creative than when we are over-intellectualizing and romanticizing our lives'
};
const states=[...document.querySelectorAll('.book-entry')].map(entry=>{
 const button=entry.querySelector('button');
 const quote=entry.querySelector('.insight');
 quote.textContent=insights[entry.dataset.book];
 quote.hidden=false;
 quote.setAttribute('aria-hidden','true');
 button.setAttribute('aria-describedby',quote.id);
 button.setAttribute('aria-expanded','false');
 button.setAttribute('aria-controls',quote.id);
 return {entry,button,quote,hovered:false,focused:false,selected:false};
});
function render(){
 const activeState=states.find(state=>state.focused)||states.find(state=>state.hovered)||states.find(state=>state.selected);
 states.forEach(state=>{
  const active=state===activeState;
  state.entry.classList.toggle('is-active',active);
  state.button.setAttribute('aria-expanded',String(active));
  state.quote.setAttribute('aria-hidden',String(!active));
 });
}
states.forEach(state=>{
 state.entry.addEventListener('pointerenter',event=>{if(event.pointerType==='mouse'||event.pointerType==='pen'){states.forEach(other=>other.focused=false);state.hovered=true;render();}});
 state.entry.addEventListener('pointerleave',()=>{state.hovered=false;render(state);});
 state.button.addEventListener('focus',()=>{state.focused=state.button.matches(':focus-visible');render(state);});
 state.button.addEventListener('blur',()=>{state.focused=false;render(state);});
 state.button.addEventListener('click',()=>{
  const selected=!state.selected;
  states.forEach(other=>{other.selected=false;render(other);});
  state.selected=selected;
  render(state);
 });
});
addEventListener('keydown',event=>{
 if(event.key==='Escape')states.forEach(state=>{state.hovered=false;state.focused=false;state.selected=false;render(state);});
},{signal:pageEvents.signal});

window.NovaPage.onCleanup(()=>pageEvents.abort());

});
