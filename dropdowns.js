/* EstateDock select controls — progressively enhanced native forms.
   Real <select> elements remain in the form for validation, FormData,
   and the existing change handlers. If JS is unavailable, native selects show. */
(() => {
  'use strict';
  let nextId = 0;
  let active = null;
  const chevron = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>';
  const check = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12 4 4L19 6"/></svg>';
  const searchSvg = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m16 16 4 4"/></svg>';
  function textFor(s) { return s.selectedOptions[0]?.textContent?.trim() || 'Choose an option'; }
  function currentPlaceholder(s) { return !s.value && (!!s.options[0] && s.options[0].value === ''); }
  function buttonFor(s) { return s.closest('.ed-choice')?.querySelector('.ed-choice-button'); }
  function sync(s) {
    const b = buttonFor(s); if(!b)return;
    const label = b.querySelector('.ed-choice-label');
    label.textContent = textFor(s);
    b.classList.toggle('is-placeholder', currentPlaceholder(s));
    b.disabled = s.disabled;
  }
  function enhance(root=document) {
    root.querySelectorAll('select:not([data-enhanced])').forEach(s => {
      // Custom styling applies to ordinary, single-choice dropdowns only.
      if(s.multiple || s.size > 1) return;
      s.dataset.enhanced = 'true';
      const wrapper = document.createElement('div'); wrapper.className='ed-choice';
      s.parentElement.insertBefore(wrapper, s);
      wrapper.appendChild(s);
      const b = document.createElement('button');b.type='button';b.className='ed-choice-button';
      const key = `ed-choice-${++nextId}`; b.id = key;
      b.dataset.edTrigger = '1'; b.setAttribute('aria-haspopup','listbox');
      b.setAttribute('aria-expanded','false');
      const display = document.createElement('span');display.className='ed-choice-label';display.id=`${key}-value`;
      const symbol = document.createElement('span');symbol.className='ed-choice-chevron';symbol.innerHTML=chevron;
      b.append(display,symbol);wrapper.appendChild(b);
      const label = s.id ? [...document.querySelectorAll('label')].find(l => l.htmlFor===s.id) : null;
      if(label){label.htmlFor=key;if(!label.id)label.id=`${key}-label`;b.setAttribute('aria-labelledby',`${label.id} ${display.id}`);}
      else b.setAttribute('aria-label',s.getAttribute('aria-label') || s.name || 'Choose an option');
      if(s.required)b.setAttribute('aria-required','true');
      // Both controls use the same value; the native select remains a real form input.
      s.classList.add('ed-choice-native');s.tabIndex=-1;s.setAttribute('aria-hidden','true');
      s.addEventListener('change',()=>{sync(s);b.classList.remove('is-invalid');b.removeAttribute('aria-invalid');});
      s.addEventListener('invalid',e=>{e.preventDefault();b.classList.add('is-invalid');b.setAttribute('aria-invalid','true');b.focus();open(b);});
      sync(s);
    });
  }
  function close({focus=false}={}) {
    if(!active)return;
    const {button,menu} = active;
    menu.remove();button.setAttribute('aria-expanded','false');button.classList.remove('is-open');
    active=null;if(focus && button.isConnected)button.focus({preventScroll:true});
  }
  function position() {
    if(!active)return;
    const {button,menu} = active;
    if(!button.isConnected){close();return;}
    const r=button.getBoundingClientRect();
    const margin=12;
    const availableBelow=window.innerHeight-r.bottom-margin;
    const availableAbove=r.top-margin;
    const height=Math.min(menu.scrollHeight, 338, Math.max(150,Math.max(availableBelow,availableAbove)));
    const above=availableBelow<Math.min(height,230) && availableAbove>availableBelow;
    const top=above?Math.max(margin,r.top-height-7):Math.min(r.bottom+7,window.innerHeight-margin-height);
    const minWidth=Math.min(window.innerWidth-2*margin,Math.max(r.width,230));
    const left=Math.max(margin,Math.min(r.left,window.innerWidth-margin-minWidth));
    Object.assign(menu.style,{left:`${left}px`,top:`${top}px`,width:`${minWidth}px`,maxHeight:`${Math.max(115,Math.min(height,window.innerHeight-2*margin))}px`});
    menu.classList.toggle('above',above);
  }
  function items() {return active?[...active.list.querySelectorAll('.ed-option:not([hidden]):not([disabled])')]:[];}
  function move(step) {
    const list=items();if(!list.length)return;
    let n=list.indexOf(document.activeElement);
    if(n<0)n=step>0?-1:0;
    n=(n+step+list.length)%list.length;
    list[n].focus({preventScroll:true});list[n].scrollIntoView({block:'nearest'});
  }
  function choose(value) {
    if(!active)return;
    const {select:s}=active;
    s.value=value;
    sync(s);
    close({focus:true});
    // Preserve all existing filtering, deal analysis, and form logic.
    s.dispatchEvent(new Event('change',{bubbles:true}));
  }
  function populate(query='') {
    if(!active)return;
    const {select:s,list,queryInput}=active;
    list.replaceChildren();
    let hits=0;
    [...s.options].forEach((o,i) => {
      if(o.hidden)return;
      if(query && !o.textContent.toLowerCase().includes(query.toLowerCase()))return;
      hits++;
      const item=document.createElement('button');item.type='button';item.className='ed-option';
      item.setAttribute('role','option');item.setAttribute('aria-selected',String(o.value===s.value));
      item.dataset.value=o.value;item.dataset.index=String(i);
      item.disabled=o.disabled;
      if(o.value===s.value)item.classList.add('is-selected');
      if(!o.value && i===0)item.classList.add('is-empty-option');
      const name=document.createElement('span');name.className='ed-option-label';name.textContent=o.textContent.trim();
      const tick=document.createElement('span');tick.className='ed-option-tick';tick.innerHTML=check;
      item.append(name,tick);
      item.addEventListener('click',()=>choose(o.value));
      list.append(item);
    });
    if(!hits){const blank=document.createElement('div');blank.className='ed-no-options';blank.textContent='No matching options';list.append(blank);}
    if(queryInput)queryInput.setAttribute('aria-label',`Search ${s.getAttribute('aria-label') || s.name || 'options'}`);
    position();
  }
  function open(button,{focusOptions=false,first=false,last=false}={}) {
    if(active?.button===button)return;
    close();
    const s=button.closest('.ed-choice')?.querySelector('select');if(!s || s.disabled)return;
    const menu=document.createElement('div');menu.className='ed-dropdown';
    const list=document.createElement('div');list.className='ed-options';list.setAttribute('role','listbox');
    list.id=`${button.id}-list`;button.setAttribute('aria-controls',list.id);
    let queryInput=null;
    const heading=document.createElement('div');heading.className='ed-dropdown-heading';
    heading.textContent = [...document.querySelectorAll('label')].find(l=>l.htmlFor===button.id)?.textContent?.trim() || s.getAttribute('aria-label') || 'Choose an option';
    menu.append(heading);
    if(s.options.length>8){
      const search=document.createElement('div');search.className='ed-dropdown-search';
      search.innerHTML=searchSvg;
      queryInput=document.createElement('input');queryInput.type='search';queryInput.placeholder='Search options';queryInput.autocomplete='off';
      search.append(queryInput);menu.append(search);
      queryInput.addEventListener('input',()=>populate(queryInput.value.trim()));
      queryInput.addEventListener('keydown',e=>{if(e.key==='ArrowDown'){e.preventDefault();items()[0]?.focus();}});
    }
    menu.append(list);document.body.append(menu);
    active={button,select:s,menu,list,queryInput};
    button.setAttribute('aria-expanded','true');button.classList.add('is-open');
    populate();
    if(focusOptions){
      const avail=items();const selected=avail.find(x=>x.classList.contains('is-selected'));
      const item=first?avail[0]:last?avail.at(-1):(selected||avail[0]);
      if(queryInput && !first && !last)queryInput.focus({preventScroll:true});
      else item?.focus({preventScroll:true});
    }
  }
  document.addEventListener('click',e=>{
    const btn=e.target.closest('[data-ed-trigger]');
    if(btn){e.preventDefault();if(active?.button===btn)close({focus:true});else open(btn);return;}
    if(active && !active.menu.contains(e.target))close();
  });
  document.addEventListener('keydown',e=>{
    const trigger=e.target.closest?.('[data-ed-trigger]');
    if(trigger){
      if(['Enter',' ','ArrowDown','ArrowUp','Home','End'].includes(e.key)){
        e.preventDefault();
        if(!active || active.button!==trigger)open(trigger,{focusOptions:true,first:e.key==='Home'||e.key==='ArrowDown',last:e.key==='End'||e.key==='ArrowUp'});
        else if(e.key==='ArrowDown')move(1);else if(e.key==='ArrowUp')move(-1);
      }
      if(e.key==='Escape'&&active){e.preventDefault();e.stopPropagation();close({focus:true});}
      return;
    }
    if(!active || !active.menu.contains(e.target))return;
    if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close({focus:true});}
    else if(e.key==='ArrowDown'){e.preventDefault();move(1);}
    else if(e.key==='ArrowUp'){e.preventDefault();move(-1);}
    else if(e.key==='Home' && !e.target.matches('input')){e.preventDefault();items()[0]?.focus();}
    else if(e.key==='End' && !e.target.matches('input')){e.preventDefault();items().at(-1)?.focus();}
    else if(e.key==='Tab')close();
  },true);
  window.addEventListener('resize',position);
  document.addEventListener('scroll',e=>{if(active && !active.menu.contains(e.target))position();},true);
  window.EstateSelects={enhance,close,sync};
})();
