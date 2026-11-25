(() => {
  'use strict';
  const d=document,w=window;
  const current=d.querySelector('meta[name="mobile-route"]')?.content || location.pathname.replace(/\/$/,'') || '/';
  const links=[
    ['/', 'Today', '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 11 12 3l9 8v9H5v-9M9 20v-6h6v6"/></svg>'],
    ['/explore', 'Explore', '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 5 5"/></svg>'],
    ['/focus', 'Focus', '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l3 2M9 2h6"/></svg>'],
    ['/habits', 'Habits', '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L19 6M20 12v7H4V5h10"/></svg>'],
    ['/guides', 'Guides', '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h14v16H5zM8 8h8M8 12h8M8 16h5"/></svg>'],
  ];
  const nav=d.createElement('nav');nav.className='mobile-bottom-nav';nav.setAttribute('aria-label','Main navigation');
  nav.innerHTML=links.map(([path,label,icon])=>`<a href="${path}"${current===path || (path==='/guides'&&current.startsWith('/guide/')) || (path==='/explore'&&(current.startsWith('/resource/')||current==='/find'))?' aria-current="page"':''}><span class="mobile-nav-icon">${icon}</span>${label}</a>`).join('');d.body.append(nav);
  // Reuse the existing theme control so its persisted-choice event handler survives.
  const oldHeader=d.querySelector('.dash-header,.site-header'),theme=d.querySelector('.theme-toggle');
  const header=d.createElement('header');header.className='app-header';
  header.innerHTML='<div class="app-header-inner"><a class="app-wordmark" href="/" aria-label="Good Signal, Today"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 18v-5m8 5V8m8 10V3"/></svg><span>Good Signal</span></a><div class="app-header-actions"><details class="app-more"><summary aria-label="More options"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></svg><span>More</span></summary><nav aria-label="More options"><a href="/find">Find your tool</a><a href="/safety">Digital safety</a><a href="/about">Sources &amp; privacy</a></nav></details></div></div>';
  if(theme)header.querySelector('.app-header-actions').prepend(theme);
  else {const button=d.createElement('button');button.className='theme-toggle';button.type='button';header.querySelector('.app-header-actions').prepend(button);}
  if(oldHeader)oldHeader.replaceWith(header);else d.body.prepend(header);
  const more=header.querySelector('.app-more');
  d.addEventListener('click',event=>{if(more.open&&!more.contains(event.target))more.open=false;});
  d.addEventListener('keydown',event=>{if(event.key==='Escape'&&more.open){more.open=false;more.querySelector('summary').focus();}});
  const headings={'/focus':'Focus','/explore':'Explore','/guides':'Setup guides'};
  const heading=d.querySelector('.page-hero h1');if(heading&&headings[current])heading.textContent=headings[current];
  // Search and categories stay visible. Device, price and saved-only are progressive.
  if(current==='/explore') {
    d.body.classList.add('app-directory');
    const toolbar=d.querySelector('.toolbar'),category=d.querySelector('#resource-category'),platform=d.querySelector('#resource-platform'),price=d.querySelector('#resource-pricing'),saved=d.querySelector('#resource-saved'),count=d.querySelector('[data-resource-count]'),extra=d.querySelector('.filters-extra');
    if(toolbar&&category&&platform&&price) {
      const details=d.createElement('details');details.className='app-filters';details.innerHTML='<summary>Filters <span data-filter-summary>All devices · Any price</span></summary><div class="app-filter-fields"></div>';
      const fields=details.querySelector('.app-filter-fields');
      for(const control of [category,platform,price])fields.append(control.parentElement);
      const note=toolbar.nextElementSibling;if(note?.matches('p.muted')){note.classList.add('filter-explanation');fields.append(note);}
      if(extra){if(count)extra.before(count);fields.append(extra);}
      toolbar.after(details);
      const categories=d.createElement('div');categories.className='app-category-tabs';categories.setAttribute('role','group');categories.setAttribute('aria-label','Resource categories');
      const names=[['','All'],['screen-time','Screen time'],['focus','Focus'],['notifications-sleep','Sleep'],['privacy','Privacy']];
      categories.innerHTML=names.map(([value,label])=>`<button type="button" data-mobile-category="${value}" aria-pressed="${category.value===value}">${label}</button>`).join('');toolbar.after(categories);
      function syncFilters(){
        categories.querySelectorAll('button').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.mobileCategory===category.value)));
        details.querySelector('[data-filter-summary]').textContent=[platform.value||'All devices',price.options[price.selectedIndex]?.textContent||'Any price',saved?.checked?'Saved only':''].filter(Boolean).join(' · ');
      }
      categories.querySelectorAll('button').forEach(button=>button.addEventListener('click',()=>{category.value=button.dataset.mobileCategory;category.dispatchEvent(new Event('change',{bubbles:true}));syncFilters();}));
      for(const control of [category,platform,price,saved].filter(Boolean))control.addEventListener('change',syncFilters);
      d.querySelector('[data-reset-filters]')?.addEventListener('click',()=>w.setTimeout(syncFilters,0));
      syncFilters();
      const search=d.querySelector('#resource-search');if(search)search.placeholder='Search tools, devices or goals';
    }
  }
  if(current==='/focus') {
    // A real task and duration are available before Start; secondary setup stays tucked away.
    const setup=d.querySelector('.focus-setup-card'),timer=d.querySelector('.focus-timer-card'),ring=d.querySelector('.timer-ring');
    if(setup&&timer&&ring){
      const inline=d.createElement('div');inline.className='app-focus-setup';inline.setAttribute('aria-label','Focus session setup');
      const task=d.querySelector('#focus-task'),options=d.querySelector('.duration-options'),duration=d.querySelector('.duration-label');
      if(task){const label=d.querySelector('label[for="focus-task"]');if(label)inline.append(label);inline.append(task);}
      if(duration)inline.append(duration);if(options)inline.append(options);ring.before(inline);
      const details=d.createElement('details');details.className='app-focus-options';details.innerHTML='<summary>Break &amp; session preferences</summary>';
      for(const child of [...setup.children])if(!child.matches('h2,.eyebrow'))details.append(child);
      timer.append(details);setup.remove();
      const pause=d.querySelector('[data-timer-pause]'),start=d.querySelector('[data-timer-start]'),title=d.querySelector('#timer-title'),mode=d.querySelector('[data-focus-mode]');
      function syncFocusPresentation(){
        const paused=pause&&!pause.hidden&&pause.textContent.trim()==='Resume',running=pause&&!pause.hidden&&!paused,isBreak=mode?.textContent.trim()==='Break';
        pause?.classList.toggle('is-resume',!!paused);
        if(title)title.textContent=paused?(isBreak?'Break paused':'Session paused'):running?(isBreak?'Take a real break':'Focus in progress'):(isBreak?'Time for a break':'Your focus block');
        timer.classList.toggle('is-session-running',!!running);
      }
      syncFocusPresentation();
      const focusObserver=new MutationObserver(syncFocusPresentation);
      if(pause)focusObserver.observe(pause,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden']});
      if(start)focusObserver.observe(start,{attributes:true,attributeFilter:['hidden']});
      if(mode)focusObserver.observe(mode,{childList:true,subtree:true});

    }
  }
  function syncSystemTheme(){
    const dark=d.documentElement.dataset.theme==='dark';try{w.GoodSignalAndroid?.setSystemTheme?.(dark);}catch{}
    const meta=d.querySelector('meta[name="theme-color"]');if(meta)meta.content=dark?'#111318':'#f7f8fa';
  }
  syncSystemTheme();new MutationObserver(syncSystemTheme).observe(d.documentElement,{attributes:true,attributeFilter:['data-theme']});
  w.addEventListener('pageshow',syncSystemTheme);w.addEventListener('goodsignal-native-update',syncSystemTheme);
  if(w.visualViewport){const viewport=w.visualViewport;let fullHeight=Math.max(w.innerHeight,viewport.height);function adaptKeyboard(){fullHeight=Math.max(fullHeight,w.innerHeight,viewport.height);const editing=d.activeElement?.matches('input:not([type="checkbox"]),textarea,select');d.body.classList.toggle('is-keyboard-open',!!editing&&fullHeight-viewport.height>150);}viewport.addEventListener('resize',adaptKeyboard);d.addEventListener('focusout',()=>w.setTimeout(adaptKeyboard,100));}
})();
